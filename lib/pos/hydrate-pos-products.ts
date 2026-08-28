import { db } from "@/services/drizzle";
import { products } from "@/services/drizzle/schema";
import { and, eq, inArray } from "drizzle-orm";

/**
 * Hidrata produtos no shape exato que a grade do PDV consome (variantes ativas + grupos de
 * adicionais ativos), para que qualquer lista de sugestão (mais pedidos, cross-sell) possa
 * fluir direto para os handlers de carrinho — produtos complexos abrem o builder modal.
 */
export async function hydratePOSProducts({ orgId, productIds }: { orgId: string; productIds: string[] }) {
	if (productIds.length === 0) return [];

	const hydrated = await db.query.products.findMany({
		where: and(eq(products.organizacaoId, orgId), eq(products.ativo, true), eq(products.vendavel, true), inArray(products.id, productIds)),
		with: {
			variantes: {
				where: (fields, { eq: eqOp }) => eqOp(fields.ativo, true),
				orderBy: (fields, { asc }) => asc(fields.precoVenda),
				with: {
					addOnsReferencias: {
						with: {
							grupo: {
								with: {
									opcoes: {
										where: (fields, { eq: eqOp }) => eqOp(fields.ativo, true),
										orderBy: (fields, { asc }) => asc(fields.nome),
									},
								},
							},
						},
						orderBy: (fields, { asc }) => asc(fields.ordem),
					},
				},
			},
			addOnsReferencias: {
				where: (fields, { isNull }) => isNull(fields.produtoVarianteId),
				with: {
					grupo: {
						with: {
							opcoes: {
								where: (fields, { eq: eqOp }) => eqOp(fields.ativo, true),
								orderBy: (fields, { asc }) => asc(fields.nome),
							},
						},
					},
				},
				orderBy: (fields, { asc }) => asc(fields.ordem),
			},
		},
	});

	return hydrated.map((product) => ({
		...product,
		addOnsReferencias: product.addOnsReferencias.filter((reference) => reference.grupo.ativo && reference.grupo.opcoes.length > 0),
		variantes: product.variantes.map((variant) => ({
			...variant,
			addOnsReferencias: variant.addOnsReferencias.filter((reference) => reference.grupo.ativo && reference.grupo.opcoes.length > 0),
		})),
	}));
}

export type THydratedPOSProduct = Awaited<ReturnType<typeof hydratePOSProducts>>[number];
