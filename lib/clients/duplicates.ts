import type { TClientDuplicateReason } from "@/schemas/clients";
import { type DB, type DBTransaction, db as defaultDb } from "@/services/drizzle";
import { clientDuplicateCandidates, clients } from "@/services/drizzle/schema";
import { and, eq, ne, sql } from "drizzle-orm";

type TDetectionDb = DB | DBTransaction;

/** Normaliza @handle do Instagram para comparação (minúsculo, sem @, sem espaços). */
function normalizeInstagramHandle(handle: string | null | undefined): string | null {
	const normalized = handle?.trim().replace(/^@/, "").toLowerCase() ?? "";
	return normalized || null;
}

function normalizePair(clienteXId: string, clienteYId: string) {
	return clienteXId < clienteYId ? ([clienteXId, clienteYId] as const) : ([clienteYId, clienteXId] as const);
}

/**
 * Recalcula os candidatos a duplicidade envolvendo um cliente. Sinais
 * determinísticos apenas (telefone base, e-mail, cpf/cnpj, @ do Instagram);
 * pares já DESCARTADO/MESCLADO nunca são reabertos — o upsert só atualiza
 * motivos de pares PENDENTE.
 *
 * `whatsappUserId` fica de fora de propósito (único parcial por organização,
 * não pode gerar par) e `idExterno` também (não é escopado por integração;
 * dois ERPs podem emitir o mesmo id). Ver o plano, §4.
 *
 * Best-effort por contrato: chamadores nunca devem falhar a operação principal
 * por causa da detecção — use `recomputeClientDuplicatesSafely` nos ganchos.
 */
export async function recomputeClientDuplicatesForClient(input: { db?: TDetectionDb; organizacaoId: string; clienteId: string }): Promise<number> {
	const db = input.db ?? defaultDb;

	const client = await db.query.clients.findFirst({
		columns: { id: true, telefoneBase: true, email: true, cpfCnpj: true, instagram: true },
		where: and(eq(clients.id, input.clienteId), eq(clients.organizacaoId, input.organizacaoId)),
	});
	if (!client) return 0;

	const reasonsByOtherClient = new Map<string, TClientDuplicateReason[]>();
	function addReason(otherClientId: string, reason: TClientDuplicateReason) {
		const reasons = reasonsByOtherClient.get(otherClientId) ?? [];
		if (!reasons.some((existing) => existing.tipo === reason.tipo)) reasons.push(reason);
		reasonsByOtherClient.set(otherClientId, reasons);
	}

	const phoneBase = client.telefoneBase?.trim() ?? "";
	if (phoneBase) {
		const matches = await db.query.clients.findMany({
			columns: { id: true },
			where: and(eq(clients.organizacaoId, input.organizacaoId), eq(clients.telefoneBase, phoneBase), ne(clients.id, client.id)),
		});
		for (const match of matches) addReason(match.id, { tipo: "TELEFONE", valor: phoneBase });
	}

	const email = client.email?.trim().toLowerCase() ?? "";
	if (email) {
		const matches = await db.query.clients.findMany({
			columns: { id: true },
			where: and(eq(clients.organizacaoId, input.organizacaoId), sql`lower(${clients.email}) = ${email}`, ne(clients.id, client.id)),
		});
		for (const match of matches) addReason(match.id, { tipo: "EMAIL", valor: email });
	}

	const cpfCnpj = client.cpfCnpj?.trim() ?? "";
	if (cpfCnpj) {
		const matches = await db.query.clients.findMany({
			columns: { id: true },
			where: and(eq(clients.organizacaoId, input.organizacaoId), eq(clients.cpfCnpj, cpfCnpj), ne(clients.id, client.id)),
		});
		for (const match of matches) addReason(match.id, { tipo: "CPF_CNPJ", valor: cpfCnpj });
	}

	const instagramHandle = normalizeInstagramHandle(client.instagram);
	if (instagramHandle) {
		const matches = await db.query.clients.findMany({
			columns: { id: true },
			where: and(
				eq(clients.organizacaoId, input.organizacaoId),
				ne(clients.id, client.id),
				sql`lower(trim(leading '@' from coalesce(${clients.instagram}, ''))) = ${instagramHandle}`,
			),
		});
		for (const match of matches) addReason(match.id, { tipo: "INSTAGRAM_USERNAME", valor: instagramHandle });
	}

	let upserted = 0;
	for (const [otherClientId, motivos] of reasonsByOtherClient) {
		const [clienteAId, clienteBId] = normalizePair(client.id, otherClientId);
		await db
			.insert(clientDuplicateCandidates)
			.values({ organizacaoId: input.organizacaoId, clienteAId, clienteBId, motivos })
			.onConflictDoUpdate({
				target: [clientDuplicateCandidates.organizacaoId, clientDuplicateCandidates.clienteAId, clientDuplicateCandidates.clienteBId],
				set: { motivos, dataAtualizacao: new Date() },
				// Descartes e merges são permanentes — só pares pendentes recebem motivos novos.
				setWhere: sql`${clientDuplicateCandidates.status} = 'PENDENTE'`,
			});
		upserted += 1;
	}
	return upserted;
}

/** Variante que nunca propaga erro — para os ganchos (save de cliente, webhooks, syncs). */
export async function recomputeClientDuplicatesSafely(input: { db?: TDetectionDb; organizacaoId: string; clienteId: string }): Promise<void> {
	await recomputeClientDuplicatesForClient(input).catch((error) => {
		console.error("[CLIENT_DUPLICATES] Recompute failed:", { clienteId: input.clienteId, error });
	});
}

/**
 * Varredura set-based (cron + backfill do primeiro deploy): gera pares por
 * sinal via INSERT..SELECT com ON CONFLICT DO NOTHING. Pares que coincidem em
 * mais de um sinal ficam com o motivo do primeiro insert; o recheck ao vivo de
 * `getForEntity` completa os motivos quando a página é aberta.
 */
export async function sweepClientDuplicates(input?: { db?: DB }): Promise<void> {
	const db = input?.db ?? defaultDb;

	// Telefone base
	await db.execute(sql`
		INSERT INTO ampmais_client_duplicate_candidates (id, organizacao_id, cliente_a_id, cliente_b_id, motivos, status)
		SELECT gen_random_uuid(), a.organizacao_id, least(a.id, b.id), greatest(a.id, b.id),
			jsonb_build_array(jsonb_build_object('tipo', 'TELEFONE', 'valor', a.telefone_base)), 'PENDENTE'
		FROM ampmais_clients a
		JOIN ampmais_clients b
			ON b.organizacao_id = a.organizacao_id
			AND b.telefone_base = a.telefone_base
			AND a.id < b.id
		WHERE coalesce(a.telefone_base, '') <> ''
		ON CONFLICT (organizacao_id, cliente_a_id, cliente_b_id) DO NOTHING
	`);

	// E-mail (case-insensitive)
	await db.execute(sql`
		INSERT INTO ampmais_client_duplicate_candidates (id, organizacao_id, cliente_a_id, cliente_b_id, motivos, status)
		SELECT gen_random_uuid(), a.organizacao_id, least(a.id, b.id), greatest(a.id, b.id),
			jsonb_build_array(jsonb_build_object('tipo', 'EMAIL', 'valor', lower(a.email))), 'PENDENTE'
		FROM ampmais_clients a
		JOIN ampmais_clients b
			ON b.organizacao_id = a.organizacao_id
			AND lower(b.email) = lower(a.email)
			AND a.id < b.id
		WHERE coalesce(a.email, '') <> ''
		ON CONFLICT (organizacao_id, cliente_a_id, cliente_b_id) DO NOTHING
	`);

	// CPF/CNPJ
	await db.execute(sql`
		INSERT INTO ampmais_client_duplicate_candidates (id, organizacao_id, cliente_a_id, cliente_b_id, motivos, status)
		SELECT gen_random_uuid(), a.organizacao_id, least(a.id, b.id), greatest(a.id, b.id),
			jsonb_build_array(jsonb_build_object('tipo', 'CPF_CNPJ', 'valor', a.cpf_cnpj)), 'PENDENTE'
		FROM ampmais_clients a
		JOIN ampmais_clients b
			ON b.organizacao_id = a.organizacao_id
			AND b.cpf_cnpj = a.cpf_cnpj
			AND a.id < b.id
		WHERE coalesce(a.cpf_cnpj, '') <> ''
		ON CONFLICT (organizacao_id, cliente_a_id, cliente_b_id) DO NOTHING
	`);

	// Instagram (@handle normalizado)
	await db.execute(sql`
		INSERT INTO ampmais_client_duplicate_candidates (id, organizacao_id, cliente_a_id, cliente_b_id, motivos, status)
		SELECT gen_random_uuid(), a.organizacao_id, least(a.id, b.id), greatest(a.id, b.id),
			jsonb_build_array(jsonb_build_object('tipo', 'INSTAGRAM_USERNAME', 'valor', lower(trim(leading '@' from a.instagram)))), 'PENDENTE'
		FROM ampmais_clients a
		JOIN ampmais_clients b
			ON b.organizacao_id = a.organizacao_id
			AND lower(trim(leading '@' from coalesce(b.instagram, ''))) = lower(trim(leading '@' from coalesce(a.instagram, '')))
			AND a.id < b.id
		WHERE coalesce(trim(leading '@' from coalesce(a.instagram, '')), '') <> ''
		ON CONFLICT (organizacao_id, cliente_a_id, cliente_b_id) DO NOTHING
	`);
}
