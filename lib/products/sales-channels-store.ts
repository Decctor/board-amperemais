import { db } from "@/services/drizzle";
import { salesChannels } from "@/services/drizzle/schema";
import { eq } from "drizzle-orm";
import { DEFAULT_SALES_CHANNELS } from "./sales-channels";

/**
 * Provisiona os canais internos na primeira leitura e devolve todos os canais da organização.
 *
 * A matriz por produto grava overrides contra o id do canal, então devolver linhas sintéticas
 * (id nulo) obrigaria a UI a materializar o canal num PUT prévio — uma dependência de ordem que
 * nada garante. Materializar aqui é idempotente: `unq_sales_channels_identity` é NULLS NOT
 * DISTINCT, e o conflito nas linhas internas (integracaoId/refExterno nulos) não faz nada.
 *
 * Devolve as linhas persistidas SEM filtrar por canal: um canal configurado (iFood por merchant,
 * ou um POS com refExterno) precisa aparecer na gestão, senão vira override invisível.
 */
export async function ensureSalesChannels({ orgId }: { orgId: string }) {
	await db
		.insert(salesChannels)
		.values(DEFAULT_SALES_CHANNELS.map((channel) => ({ organizacaoId: orgId, ...channel })))
		.onConflictDoNothing();

	return db.query.salesChannels.findMany({ where: eq(salesChannels.organizacaoId, orgId) });
}
