import { db } from "@/services/drizzle";
import createHttpError from "http-errors";

/**
 * `permissoes.resultados.escopo` guarda ids de USUÁRIOS. As vendas conhecem apenas o vendedor
 * (`sales.vendedorId`), então o escopo é traduzido pela ponte `organizationMembers.usuarioVendedorId`.
 *
 * Retorna `null` quando o membro não tem escopo (enxerga a organização inteira).
 */
export async function resolveResultsScopeSellerIds({
	organizacaoId,
	resultsScope,
}: {
	organizacaoId: string;
	resultsScope: string[] | null | undefined;
}): Promise<string[] | null> {
	if (!resultsScope) return null;

	const scopeUsers = await db.query.organizationMembers.findMany({
		where: (fields, { and, eq, inArray }) => and(eq(fields.organizacaoId, organizacaoId), inArray(fields.usuarioId, resultsScope)),
		columns: { usuarioVendedorId: true },
	});

	return scopeUsers.map((user) => user.usuarioVendedorId).filter((sellerId): sellerId is string => Boolean(sellerId));
}

/**
 * Garante que um filtro de vendedores (por `sellers.id`) não sai do escopo de resultados do membro.
 * Sem escopo, qualquer filtro (inclusive vazio = todos) é permitido. Com escopo, o filtro precisa
 * ser não vazio e conter apenas vendedores do escopo — um filtro vazio significaria "todos".
 */
export async function assertSellersIdsWithinResultsScope({
	organizacaoId,
	resultsScope,
	sellersIds,
}: {
	organizacaoId: string;
	resultsScope: string[] | null | undefined;
	sellersIds: string[];
}): Promise<void> {
	const scopeSellerIds = await resolveResultsScopeSellerIds({ organizacaoId, resultsScope });
	if (!scopeSellerIds) return;

	const isOutsideScope = sellersIds.length === 0 || sellersIds.some((sellerId) => !scopeSellerIds.includes(sellerId));
	if (isOutsideScope) throw new createHttpError.Unauthorized("Você não tem permissão para acessar esse recurso.");
}
