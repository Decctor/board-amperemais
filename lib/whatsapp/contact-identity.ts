import { formatPhoneAsBase } from "@/lib/formatting";
import { db } from "@/services/drizzle";
import { clients } from "@/services/drizzle/schema";
import { and, eq, sql } from "drizzle-orm";

/**
 * Resolver canônico da identidade de um contato de WhatsApp.
 *
 * É o Estágio 1 do pipeline de webhook — roda **sem gate de hub**: a base de contatos cresce
 * com o tráfego de WhatsApp mesmo para organizações que não usam o hub de atendimentos, e o
 * business-scoped user ID (BSUID) entra no cadastro enquanto `from`/`wa_id` ainda vêm nos
 * webhooks. Quando a Meta os omitir, a resolução por BSUID já estará populada.
 *
 * Ordem de resolução:
 * 1. `(organizacaoId, whatsappUserId)` — a chave garantida. Telefone divergente no webhook
 *    significa troca de número (o BSUID regenera junto): o cadastro é atualizado.
 * 2. `(organizacaoId, telefoneBase)` — fallback; o acerto grava o BSUID (backfill orgânico).
 * 3. Cria o cliente com `canalAquisicao: "WHATSAPP"`.
 *
 * Concorrência: `pg_advisory_xact_lock` por chave de identidade — o padrão do
 * `smb-contacts-sync`. Webhooks concorrentes do mesmo contato serializam aqui em vez de criar
 * dois clientes; não há (nem pode haver, pela base atual) constraint única em `telefoneBase`.
 */
export type TResolvedWhatsappClient = { clientId: string; telefone: string | null; isNew: boolean };

export async function resolveWhatsappClient(input: {
	organizacaoId: string;
	telefone?: string | null;
	whatsappUserId?: string | null;
	profileName?: string | null;
}): Promise<TResolvedWhatsappClient | null> {
	const telefone = input.telefone?.trim() || null;
	const whatsappUserId = input.whatsappUserId?.trim() || null;
	// Sem telefone e sem BSUID não há identidade resolvível.
	if (!telefone && !whatsappUserId) return null;

	const telefoneBase = telefone ? formatPhoneAsBase(telefone) : null;

	return db.transaction(async (tx) => {
		const lockKey = `whatsapp-client:${input.organizacaoId}:${whatsappUserId ?? telefoneBase}`;
		await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`);

		if (whatsappUserId) {
			const byUserId = await tx.query.clients.findFirst({
				where: and(eq(clients.organizacaoId, input.organizacaoId), eq(clients.whatsappUserId, whatsappUserId)),
				columns: { id: true, telefone: true, telefoneBase: true },
			});
			if (byUserId) {
				if (telefone && telefoneBase && byUserId.telefoneBase !== telefoneBase) {
					await tx.update(clients).set({ telefone, telefoneBase }).where(eq(clients.id, byUserId.id));
					return { clientId: byUserId.id, telefone, isNew: false };
				}
				return { clientId: byUserId.id, telefone: byUserId.telefone || telefone, isNew: false };
			}
		}

		if (telefoneBase) {
			const byPhone = await tx.query.clients.findFirst({
				where: and(eq(clients.organizacaoId, input.organizacaoId), eq(clients.telefoneBase, telefoneBase)),
				columns: { id: true, telefone: true, whatsappUserId: true },
			});
			if (byPhone) {
				if (whatsappUserId && byPhone.whatsappUserId !== whatsappUserId) {
					await tx.update(clients).set({ whatsappUserId }).where(eq(clients.id, byPhone.id));
				}
				return { clientId: byPhone.id, telefone: byPhone.telefone || telefone, isNew: false };
			}
		}

		const [created] = await tx
			.insert(clients)
			.values({
				organizacaoId: input.organizacaoId,
				nome: input.profileName?.trim() || telefone || "Contato de WhatsApp",
				telefone: telefone ?? "",
				telefoneBase: telefoneBase ?? "",
				whatsappUserId,
				canalAquisicao: "WHATSAPP",
			})
			.returning({ id: clients.id });

		return { clientId: created.id, telefone, isNew: true };
	});
}
