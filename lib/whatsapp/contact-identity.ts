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
 * 1. `(organizationId, whatsappUserId)` — a chave garantida. Telefone divergente no webhook
 *    significa troca de número (o BSUID regenera junto): o cadastro é atualizado.
 * 2. `(organizationId, telefoneBase)` — fallback; o acerto grava o BSUID (backfill orgânico).
 * 3. Cria o cliente com `canalAquisicao: "WHATSAPP"`.
 *
 * Concorrência: `pg_advisory_xact_lock` por chave de identidade — o padrão do
 * `smb-contacts-sync`. Webhooks concorrentes do mesmo contato serializam aqui em vez de criar
 * dois clientes; não há (nem pode haver, pela base atual) constraint única em `telefoneBase`.
 */
export type TResolvedWhatsappClient = { clientId: string; phoneNumber: string | null; isNew: boolean };

export async function resolveWhatsappClient(input: {
	organizationId: string;
	phoneNumber?: string | null;
	whatsappUserId?: string | null;
	profileName?: string | null;
}): Promise<TResolvedWhatsappClient | null> {
	const phoneNumber = input.phoneNumber?.trim() || null;
	const whatsappUserId = input.whatsappUserId?.trim() || null;
	// Sem telefone e sem BSUID não há identidade resolvível.
	if (!phoneNumber && !whatsappUserId) return null;

	const phoneBase = phoneNumber ? formatPhoneAsBase(phoneNumber) : null;

	return db.transaction(async (tx) => {
		const lockKey = `whatsapp-client:${input.organizationId}:${whatsappUserId ?? phoneBase}`;
		await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`);

		if (whatsappUserId) {
			const byUserId = await tx.query.clients.findFirst({
				where: and(eq(clients.organizacaoId, input.organizationId), eq(clients.whatsappUserId, whatsappUserId)),
				columns: { id: true, telefone: true, telefoneBase: true },
			});
			if (byUserId) {
				if (phoneNumber && phoneBase && byUserId.telefoneBase !== phoneBase) {
					await tx.update(clients).set({ telefone: phoneNumber, telefoneBase: phoneBase }).where(eq(clients.id, byUserId.id));
					return { clientId: byUserId.id, phoneNumber, isNew: false };
				}
				return { clientId: byUserId.id, phoneNumber: byUserId.telefone || phoneNumber, isNew: false };
			}
		}

		if (phoneBase) {
			const byPhone = await tx.query.clients.findFirst({
				where: and(eq(clients.organizacaoId, input.organizationId), eq(clients.telefoneBase, phoneBase)),
				columns: { id: true, telefone: true, whatsappUserId: true },
			});
			if (byPhone) {
				if (whatsappUserId && byPhone.whatsappUserId !== whatsappUserId) {
					await tx.update(clients).set({ whatsappUserId }).where(eq(clients.id, byPhone.id));
				}
				return { clientId: byPhone.id, phoneNumber: byPhone.telefone || phoneNumber, isNew: false };
			}
		}

		const [created] = await tx
			.insert(clients)
			.values({
				organizacaoId: input.organizationId,
				nome: input.profileName?.trim() || phoneNumber || "Contato de WhatsApp",
				telefone: phoneNumber ?? "",
				telefoneBase: phoneBase ?? "",
				whatsappUserId,
				canalAquisicao: "WHATSAPP",
			})
			.returning({ id: clients.id });

		return { clientId: created.id, phoneNumber, isNew: true };
	});
}
