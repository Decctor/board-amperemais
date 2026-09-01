import { db } from "@/services/drizzle";
import { sellers } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";

export async function validateActiveSeller({ orgId, sellerId }: { orgId: string; sellerId: string | null | undefined }) {
	if (!sellerId) return;

	const seller = await db.query.sellers.findFirst({
		where: and(eq(sellers.id, sellerId), eq(sellers.organizacaoId, orgId), eq(sellers.ativo, true)),
		columns: { id: true },
	});
	if (!seller) throw new createHttpError.BadRequest("Vendedor não encontrado ou inativo.");
}
