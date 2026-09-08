import type { TSalesSession } from "@/services/drizzle/schema";
import createHttpError from "http-errors";

export function validateSalesSessionSeller({
	session,
	vendedorId,
}: {
	session: Pick<TSalesSession, "politica" | "vendedorPadraoId">;
	vendedorId: string | null | undefined;
}) {
	if (session.politica !== "VENDEDOR_UNICO") return;
	if (!session.vendedorPadraoId || !vendedorId || vendedorId !== session.vendedorPadraoId) {
		throw new createHttpError.BadRequest("Esta sessao aceita vendas apenas do vendedor definido na abertura.");
	}
}
