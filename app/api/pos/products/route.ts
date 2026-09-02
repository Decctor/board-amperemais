import { appApiHandler } from "@/lib/app-api";
import { runPagesRouteHandler, type PagesRouteHandler, type PagesRouteRequest, type PagesRouteResponse } from "@/lib/pages-route-compat";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { resolveAddOnReferencesRules } from "@/lib/products/add-on-rules";
import { channelAddOnReferences } from "@/lib/products/sales-channels";
import { channelNodePrice, channelProductFilter, loadChannelState } from "@/lib/products/sales-channels-store";
import { db } from "@/services/drizzle";
import { productAddOnOptions, productAddOnReferences, productAddOns, productVariants, products } from "@/services/drizzle/schema";
import { and, eq, inArray, isNull, notInArray, sql } from "drizzle-orm";
import { count } from "drizzle-orm";
import createHttpError from "http-errors";
import z from "zod";

const GetPOSProductsInputSchema = z.object({
	search: z
		.string({
			invalid_type_error: "Tipo inválido para busca.",
		})
		.optional()
		.nullable(),
	group: z
		.string({
			invalid_type_error: "Tipo inválido para grupo.",
		})
		.optional()
		.nullable(),
	page: z
		.string({
			required_error: "Página não informada.",
			invalid_type_error: "Tipo inválido para página.",
		})
		.transform((val) => Number(val))
		.default("1"),
	// Canal cuja disponibilidade/preço a grade resolve: o PDV usa POS; o composer de pedidos de
	// comanda usa COMANDA — o pedido da mesa custa o mesmo venha do QR ou do operador.
	channel: z
		.string({
			invalid_type_error: "Tipo inválido para canal.",
		})
		.optional()
		.nullable()
		.transform((value) => (value === "COMANDA" ? ("COMANDA" as const) : ("POS" as const))),
});
export type TGetPOSProductsInput = z.infer<typeof GetPOSProductsInputSchema>;

async function getPOSProducts({ input, session }: { input: TGetPOSProductsInput; session: TAuthUserSession }) {
	const userOrgId = session.membership?.organizacao.id;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const PAGE_SIZE = 24; // Grid-friendly number (4x6 or 3x8)

	const skip = PAGE_SIZE * (input.page - 1);
	const limit = PAGE_SIZE;

	const conditions = [eq(products.organizacaoId, userOrgId), eq(products.ativo, true), eq(products.vendavel, true)];

	// Disponibilidade e preço no canal pedido (linhas esparsas da matriz de canais). Canal
	// ausente = org não materializada ainda — comporta-se como TODOS sem overrides.
	const channelState = await loadChannelState({ orgId: userOrgId, canal: input.channel });
	if (channelState) {
		const filter = channelProductFilter(channelState);
		if (filter.includeIds) {
			if (filter.includeIds.length === 0) {
				return { data: { products: [], productsMatched: 0, totalPages: 0, currentPage: input.page } };
			}
			conditions.push(inArray(products.id, filter.includeIds));
		}
		if (filter.excludeIds) conditions.push(notInArray(products.id, filter.excludeIds));
	}

	// Search filter — insensível a acentos: unaccent() em ambos os lados normaliza os diacríticos
	// (ex.: "acai" encontra "Açaí"). Requer a extensão `unaccent` (migration 0033_unaccent_extension).
	if (input.search && input.search.length > 0) {
		conditions.push(
			sql`(unaccent(${products.nome}) ILIKE unaccent('%' || ${input.search} || '%') OR unaccent(${products.codigo}) ILIKE unaccent('%' || ${input.search} || '%'))`,
		);
	}

	// Group filter
	if (input.group && input.group.length > 0) {
		conditions.push(eq(products.grupo, input.group));
	}

	// Count total matching products
	const productsMatched = await db
		.select({ count: count(products.id) })
		.from(products)
		.where(and(...conditions));

	const productsMatchedCount = productsMatched[0]?.count || 0;
	const totalPages = Math.ceil(productsMatchedCount / PAGE_SIZE);

	// Fetch products with their variants and add-ons
	const productsResult = await db.query.products.findMany({
		where: and(...conditions),
		with: {
			variantes: {
				where: (fields, { eq }) => eq(fields.ativo, true),
				orderBy: (fields, { asc }) => asc(fields.precoVenda),
				with: {
					addOnsReferencias: {
						with: {
							grupo: {
								with: {
									opcoes: {
										where: (fields, { eq }) => eq(fields.ativo, true),
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
								where: (fields, { eq }) => eq(fields.ativo, true),
								orderBy: (fields, { asc }) => asc(fields.nome),
							},
						},
					},
				},
				orderBy: (fields, { asc }) => asc(fields.ordem),
			},
		},
		offset: skip,
		limit: limit,
		orderBy: (fields, { asc }) => asc(fields.nome),
	});

	const normalizedProducts = productsResult.map((product) => ({
		...product,
		// Preço resolvido do canal — a grade exibe e o carrinho envia o mesmo valor que a
		// validação (validateSaleItemsPricing com canal) vai recalcular.
		precoVenda: channelNodePrice(channelState, { produtoId: product.id, precoVenda: product.precoVenda }),
		// Grupos já sob as regras do canal: os mínimos do cadastro só continuam obrigatórios
		// onde o canal os exige (o balcão pode dispensar; ver channelAddOnReferences).
		addOnsReferencias: channelAddOnReferences(
			channelState?.channel,
			resolveAddOnReferencesRules(product.addOnsReferencias.filter((reference) => reference.grupo.ativo && reference.grupo.opcoes.length > 0)),
		),
		variantes: product.variantes
			// Linha de variante só restringe dentro de um produto visível (mesma regra do resolver).
			.filter((variant) => channelState?.variantOverrides.get(variant.id)?.disponivel !== false)
			.map((variant) => ({
				...variant,
				precoVenda: channelNodePrice(channelState, { produtoId: product.id, produtoVarianteId: variant.id, precoVenda: variant.precoVenda }) ?? 0,
				addOnsReferencias: channelAddOnReferences(
					channelState?.channel,
					resolveAddOnReferencesRules(variant.addOnsReferencias.filter((reference) => reference.grupo.ativo && reference.grupo.opcoes.length > 0)),
				),
			})),
	}));

	return {
		data: {
			products: normalizedProducts,
			productsMatched: productsMatchedCount,
			totalPages: totalPages,
			currentPage: input.page,
		},
	};
}

export type TGetPOSProductsOutput = Awaited<ReturnType<typeof getPOSProducts>>;

const getPOSProductsHandler: PagesRouteHandler<TGetPOSProductsOutput> = async (req, res) => {
	const sessionUser = await getCurrentSessionUncached();
	if (!sessionUser) throw new createHttpError.Unauthorized("Você não está autenticado.");

	const userOrgId = sessionUser.membership?.organizacao.id;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const input = GetPOSProductsInputSchema.parse(req.query);
	const data = await getPOSProducts({ input, session: sessionUser });
	return res.status(200).json(data);
};

const routeHandlers = {
	GET: getPOSProductsHandler,
} satisfies Partial<Record<"GET" | "POST" | "PUT" | "PATCH" | "DELETE", PagesRouteHandler<any>>>;

export const GET = appApiHandler({
	GET: (request) => runPagesRouteHandler({ request, handler: routeHandlers.GET! }),
});
