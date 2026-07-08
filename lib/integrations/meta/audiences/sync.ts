import { resolveCampaignAudienceClientIds } from "@/lib/campaigns/filters";
import { hashEmail, hashPhone } from "@/lib/integrations/meta/capi/hashing";
import type { TMetaAdsIntegrationConfig } from "@/schemas/integrations";
import { db } from "@/services/drizzle";
import { audienceDestinationMembers, audienceDestinations, audiences, clients } from "@/services/drizzle/schema";
import { and, eq, inArray } from "drizzle-orm";

import { type TCustomAudienceUserRow, addUsersToCustomAudience, createCustomAudience, removeUsersFromCustomAudience } from "./client";

const PII_FETCH_CHUNK = 1000;

type MemberHashes = { emailHash: string | null; telefoneHash: string | null };

/** Só entra na Custom Audience quem tem ao menos um identificador forte (e-mail ou telefone). */
function hasIdentifier(hashes: MemberHashes) {
	return Boolean(hashes.emailHash || hashes.telefoneHash);
}

function toUserRow(hashes: MemberHashes): TCustomAudienceUserRow {
	return [hashes.emailHash ?? "", hashes.telefoneHash ?? ""];
}

/** Busca e-mail/telefone dos clientes (em lotes) e devolve seus hashes por clienteId. */
async function buildCurrentMemberHashes(organizacaoId: string, clientIds: string[]): Promise<Map<string, MemberHashes>> {
	const result = new Map<string, MemberHashes>();
	for (let index = 0; index < clientIds.length; index += PII_FETCH_CHUNK) {
		const chunk = clientIds.slice(index, index + PII_FETCH_CHUNK);
		const rows = await db
			.select({ id: clients.id, email: clients.email, telefone: clients.telefone })
			.from(clients)
			.where(and(eq(clients.organizacaoId, organizacaoId), inArray(clients.id, chunk)));

		for (const row of rows) {
			const [emailHash, telefoneHash] = await Promise.all([hashEmail(row.email), hashPhone(row.telefone)]);
			const hashes = { emailHash, telefoneHash };
			if (hasIdentifier(hashes)) result.set(row.id, hashes);
		}
	}
	return result;
}

export type TAudienceSyncResult = { added: number; removed: number; total: number };

type ResolvedDestination = {
	destino: typeof audienceDestinations.$inferSelect;
	audiencia: typeof audiences.$inferSelect;
	config: TMetaAdsIntegrationConfig;
};

/** Carrega destino + público + config da integração (validando tenancy e tipo META_ADS). */
async function loadDestination(destinationId: string, organizacaoId?: string): Promise<ResolvedDestination | null> {
	const destino = await db.query.audienceDestinations.findFirst({ where: (fields, { eq }) => eq(fields.id, destinationId) });
	if (!destino) return null;

	const audiencia = await db.query.audiences.findFirst({ where: (fields, { eq }) => eq(fields.id, destino.audienciaId) });
	if (!audiencia) return null;
	if (organizacaoId && audiencia.organizacaoId !== organizacaoId) return null;

	const integracao = await db.query.integrations.findFirst({ where: (fields, { eq }) => eq(fields.id, destino.integracaoId) });
	if (!integracao || integracao.configuracao?.tipo !== "META_ADS") return null;

	return { destino, audiencia, config: integracao.configuracao };
}

/**
 * Sincroniza um destino: resolve a membership atual do público, calcula o delta contra os membros já
 * enviados e aplica add/remove na Custom Audience. Cria a Custom Audience se ainda não existir.
 * A remoção usa os HASHES armazenados, então propaga exclusão de clientes que saíram do segmento —
 * inclusive os já apagados do banco (LGPD).
 */
export async function syncAudienceDestination({
	destinationId,
	organizacaoId,
}: {
	destinationId: string;
	organizacaoId?: string;
}): Promise<TAudienceSyncResult> {
	const resolved = await loadDestination(destinationId, organizacaoId);
	if (!resolved) throw new Error("Destino de público não encontrado.");
	const { destino, audiencia, config } = resolved;

	try {
		// 1. Membership atual do público (reusa o motor de filtros das campanhas).
		const currentClientIds = await resolveCampaignAudienceClientIds({
			organizationId: audiencia.organizacaoId,
			segmentations: audiencia.segmentacoes ?? [],
			filters: audiencia.filtros ?? undefined,
		});
		const currentHashes = await buildCurrentMemberHashes(audiencia.organizacaoId, currentClientIds);

		// 2. Membros já enviados.
		const storedMembers = await db.select().from(audienceDestinationMembers).where(eq(audienceDestinationMembers.destinoId, destino.id));
		const storedById = new Map(storedMembers.map((member) => [member.clienteId, member]));

		// 3. Delta.
		const toAdd: { clienteId: string; hashes: MemberHashes }[] = [];
		for (const [clienteId, hashes] of currentHashes) {
			if (!storedById.has(clienteId)) toAdd.push({ clienteId, hashes });
		}
		const toRemove = storedMembers.filter((member) => !currentHashes.has(member.clienteId));

		// 4. Garante a Custom Audience na Meta.
		let externalId = destino.externalId;
		if (!externalId) {
			externalId = await createCustomAudience({ config, name: audiencia.nome, description: audiencia.descricao ?? undefined });
		}

		// 5. Aplica add/remove na Meta.
		if (toAdd.length > 0) {
			await addUsersToCustomAudience({ config, customAudienceId: externalId, rows: toAdd.map((entry) => toUserRow(entry.hashes)) });
		}
		if (toRemove.length > 0) {
			await removeUsersFromCustomAudience({
				config,
				customAudienceId: externalId,
				rows: toRemove.map((member) => [member.emailHash ?? "", member.telefoneHash ?? ""] as TCustomAudienceUserRow),
			});
		}

		// 6. Reconcilia a tabela de membros.
		if (toRemove.length > 0) {
			await db.delete(audienceDestinationMembers).where(
				inArray(
					audienceDestinationMembers.id,
					toRemove.map((member) => member.id),
				),
			);
		}
		if (toAdd.length > 0) {
			await db.insert(audienceDestinationMembers).values(
				toAdd.map((entry) => ({
					destinoId: destino.id,
					clienteId: entry.clienteId,
					emailHash: entry.hashes.emailHash,
					telefoneHash: entry.hashes.telefoneHash,
				})),
			);
		}

		// 7. Atualiza estatísticas do destino.
		await db
			.update(audienceDestinations)
			.set({
				externalId,
				status: "SINCRONIZADO",
				qtdeEnviada: currentHashes.size,
				ultimaSincronizacao: new Date(),
				ultimoErro: null,
			})
			.where(eq(audienceDestinations.id, destino.id));

		return { added: toAdd.length, removed: toRemove.length, total: currentHashes.size };
	} catch (error) {
		const message = error instanceof Error ? error.message : "Erro desconhecido ao sincronizar público.";
		await db.update(audienceDestinations).set({ status: "ERRO", ultimoErro: message }).where(eq(audienceDestinations.id, destino.id));
		throw error;
	}
}

/** IDs de todos os destinos (para o cron de refresh). */
export async function getAllAudienceDestinationIds(): Promise<string[]> {
	const rows = await db.select({ id: audienceDestinations.id }).from(audienceDestinations);
	return rows.map((row) => row.id);
}
