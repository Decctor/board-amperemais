import { db } from "@/services/drizzle";
import { sellers } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";

// Autoria do cadastro de cliente (docs/dev-planning/client-authorship-plan.md).
// Threading opcional para os pontos que criam cliente "de passagem"
// (linkPartnerToClient, bulk sales, POI): cada call site passa o que tem.
export type TClientAuthorship = {
	autorId?: string | null;
	autorVendedorId?: string | null;
};

type TDbOrTransaction = Pick<typeof db, "select">;

/**
 * Valida um vendedor recebido do payload antes de gravá-lo como autor do cadastro:
 * precisa existir, pertencer à organização e estar ativo. Nunca confiar no id cru.
 */
export async function resolveValidatedAuthorSeller({
	trx = db,
	organizacaoId,
	vendedorId,
}: {
	trx?: TDbOrTransaction;
	organizacaoId: string;
	vendedorId: string;
}) {
	const [seller] = await trx
		.select({ id: sellers.id })
		.from(sellers)
		.where(and(eq(sellers.id, vendedorId), eq(sellers.organizacaoId, organizacaoId), eq(sellers.ativo, true)))
		.limit(1);
	if (!seller) throw new createHttpError.BadRequest("Vendedor informado não encontrado ou inativo.");
	return seller.id;
}
