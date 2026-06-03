import { appApiHandler } from "@/lib/app-api";
import { runPagesRouteHandler, type PagesRouteHandler } from "@/lib/pages-route-compat";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { ProductFiscalProfileSchema } from "@/schemas/fiscal";
import { ProductAddOnOptionSchema, ProductAddOnSchema, ProductSchema, ProductVariantSchema } from "@/schemas/products";
import { db, type DBTransaction } from "@/services/drizzle";
import {
	productAddOnOptions,
	productAddOnReferences,
	productAddOns,
	productFiscalProfiles,
	productStockTransactions,
	productVariants,
	products,
	saleItems,
	sales,
} from "@/services/drizzle/schema";
import { and, asc, count, desc, eq, gte, inArray, isNull, lte, max, min, notInArray, sql } from "drizzle-orm";
import createHttpError from "http-errors";
import { z } from "zod";

const GetProductsDefaultInputSchema = z.object({
	page: z
		.string({
			required_error: "Página não informada.",
			invalid_type_error: "Tipo inválido para página.",
		})
		.transform((val) => Number(val)),

	search: z
		.string({
			required_error: "Busca não informada.",
			invalid_type_error: "Tipo inválido para busca.",
		})
		.optional()
		.nullable(),
	groups: z
		.string({
			required_error: "Grupos não informados.",
			invalid_type_error: "Tipo inválido para grupo.",
		})
		.optional()
		.nullable()
		.transform((val) => (val ? val.split(",") : [])),
	statsPeriodBefore: z
		.string({ invalid_type_error: "Tipo não válido para data de venda antes da data." })
		.optional()
		.nullable()
		.transform((val) => (val ? new Date(val) : null)),
	statsPeriodAfter: z
		.string({ invalid_type_error: "Tipo não válido para data de venda após a data." })
		.optional()
		.nullable()
		.transform((val) => (val ? new Date(val) : null)),
	statsSellerIds: z
		.string({
			required_error: "IDs dos vendedores não informados.",
			invalid_type_error: "Tipo inválido para IDs dos vendedores.",
		})
		.optional()
		.nullable()
		.transform((val) => (val ? val.split(",") : [])),
	statsSaleNatures: z
		.string({
			invalid_type_error: "Tipo não válido para natureza de venda.",
		})
		.optional()
		.nullable()
		.transform((v) => (v ? v.split(",") : [])),
	statsExcludedSalesIds: z
		.string({
			invalid_type_error: "Tipo não válido para ID da venda.",
		})
		.optional()
		.nullable()
		.transform((v) => (v ? v.split(",") : [])),
	statsTotalMin: z
		.string({
			invalid_type_error: "Tipo não válido para valor mínimo da venda.",
		})
		.optional()
		.nullable()
		.transform((val) => (val ? Number(val) : null)),
	statsTotalMax: z
		.string({
			invalid_type_error: "Tipo não válido para valor máximo da venda.",
		})
		.optional()
		.nullable()
		.transform((val) => (val ? Number(val) : null)),
	stockStatus: z
		.string({
			invalid_type_error: "Tipo não válido para status de estoque.",
		})
		.optional()
		.nullable()
		.transform((val) => (val ? val.split(",") : [])),
	abcClasses: z
		.string({
			invalid_type_error: "Tipo nao valido para curva ABC.",
		})
		.optional()
		.nullable()
		.transform((val) => (val ? val.split(",").filter((abcClass) => ["A", "B", "C"].includes(abcClass)) : [])),
	priceMin: z
		.string({
			invalid_type_error: "Tipo não válido para preço mínimo.",
		})
		.optional()
		.nullable()
		.transform((val) => (val ? Number(val) : null)),
	priceMax: z
		.string({
			invalid_type_error: "Tipo não válido para preço máximo.",
		})
		.optional()
		.nullable()
		.transform((val) => (val ? Number(val) : null)),
	orderByField: z.enum(["nome", "codigo", "grupo", "vendasValorTotal", "vendasQtdeTotal", "quantidade"]).optional().nullable(),
	orderByDirection: z.enum(["asc", "desc"]).optional().nullable(),
	resultLimit: z
		.string({
			invalid_type_error: "Tipo não válido para limite de resultados.",
		})
		.optional()
		.nullable()
		.transform((val) => (val ? Number(val) : null)),
});
export type TGetProductsDefaultInput = z.infer<typeof GetProductsDefaultInputSchema>;

const GetProductsByIdInputSchema = z.object({
	id: z
		.string({
			required_error: "ID do produto não informado.",
			invalid_type_error: "Tipo inválido para ID do produto.",
		})
		.uuid({ message: "ID do produto inválido." }),
});
export type TGetProductsByIdInput = z.infer<typeof GetProductsByIdInputSchema>;

const GetProductsInputSchema = z.union([GetProductsByIdInputSchema, GetProductsDefaultInputSchema]);
export type TGetProductsInput = z.infer<typeof GetProductsInputSchema>;

type GetProductsParams = {
	input: TGetProductsInput;
	session: TAuthUserSession;
};

function normalizeAddOnOptionLink<
	T extends {
		produtoConsumo?: string | null;
		produtoId?: string | null;
		produtoVarianteId?: string | null;
		quantidadeConsumo?: number | null;
	},
>(option: T) {
	if (!option.produtoConsumo) {
		return {
			...option,
			produtoId: null,
			produtoVarianteId: null,
			quantidadeConsumo: 1,
		};
	}

	if (option.produtoVarianteId) {
		return {
			...option,
			produtoId: option.produtoId ?? null,
			produtoVarianteId: option.produtoVarianteId,
			quantidadeConsumo: option.quantidadeConsumo ?? 1,
		};
	}

	return {
		...option,
		produtoId: option.produtoId ?? null,
		produtoVarianteId: null,
		quantidadeConsumo: option.quantidadeConsumo ?? 1,
	};
}

async function validateAndResolveAddOnOptionLink({
	tx,
	userOrgId,
	option,
}: {
	tx: DBTransaction;
	userOrgId: string;
	option: TUpdateProductAddOnOptionInput;
}) {
	const normalizedOption = normalizeAddOnOptionLink(option);

	if (!normalizedOption.produtoConsumo) {
		return normalizedOption;
	}

	if (normalizedOption.produtoVarianteId) {
		const variant = await tx.query.productVariants.findFirst({
			where: and(eq(productVariants.id, normalizedOption.produtoVarianteId), eq(productVariants.organizacaoId, userOrgId)),
			columns: {
				id: true,
				produtoId: true,
			},
		});

		if (!variant) {
			throw new createHttpError.BadRequest("A variante vinculada ao item de consumo não foi encontrada.");
		}

		if (normalizedOption.produtoId && normalizedOption.produtoId !== variant.produtoId) {
			throw new createHttpError.BadRequest("A variante vinculada ao item de consumo não pertence ao produto informado.");
		}

		return {
			...normalizedOption,
			produtoId: variant.produtoId,
			produtoVarianteId: variant.id,
		};
	}

	if (normalizedOption.produtoId) {
		const product = await tx.query.products.findFirst({
			where: and(eq(products.id, normalizedOption.produtoId), eq(products.organizacaoId, userOrgId)),
			columns: {
				id: true,
			},
		});

		if (!product) {
			throw new createHttpError.BadRequest("O produto vinculado ao item de consumo não foi encontrado.");
		}
	}

	return normalizedOption;
}

async function getProducts({ input, session }: GetProductsParams) {
	const userOrgId = session.membership?.organizacao.id;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	console.log("[INFO] [GET PRODUCTS] Input:", input);

	if ("id" in input) {
		console.log("[INFO] [GET PRODUCTS] Getting product by id:", input.id);
		const product = await db.query.products.findFirst({
			where: (fields, { and, eq }) => and(eq(fields.id, input.id), eq(fields.organizacaoId, userOrgId)),
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
											with: {
												produto: true,
												produtoVariante: true,
											},
										},
									},
								},
							},
							orderBy: (fields, { asc }) => asc(fields.ordem),
						},
						perfisFiscais: {
							where: (fields, { eq }) => eq(fields.ativo, true),
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
									with: {
										produto: true,
										produtoVariante: true,
									},
								},
							},
						},
					},
					orderBy: (fields, { asc }) => asc(fields.ordem),
				},
				perfisFiscais: {
					where: (fields, { eq }) => eq(fields.ativo, true),
				},
			},
		});
		if (!product) throw new createHttpError.NotFound("Produto não encontrado.");

		return {
			data: {
				byId: product,
				default: undefined,
			},
		};
	}

	const productQueryConditions = [eq(products.organizacaoId, userOrgId)];

	if (input.search) {
		productQueryConditions.push(
			sql`(${products.nome} ILIKE '%' || ${input.search} || '%' OR ${products.codigo} ILIKE '%' || ${input.search} || '%')`,
		);
	}
	if (input.groups.length > 0) {
		productQueryConditions.push(inArray(products.grupo, input.groups));
	}

	// Stock status filters
	if (input.stockStatus && input.stockStatus.length > 0) {
		const stockConditions = [];
		for (const status of input.stockStatus) {
			if (status === "out") {
				stockConditions.push(sql`(${products.quantidade} IS NULL OR ${products.quantidade} = 0)`);
			} else if (status === "low") {
				stockConditions.push(sql`(${products.quantidade} > 0 AND ${products.quantidade} <= 10)`);
			} else if (status === "healthy") {
				stockConditions.push(sql`(${products.quantidade} > 10 AND ${products.quantidade} <= 50)`);
			} else if (status === "overstocked") {
				stockConditions.push(sql`${products.quantidade} > 50`);
			}
		}
		if (stockConditions.length > 0) {
			productQueryConditions.push(sql`(${sql.join(stockConditions, sql` OR `)})`);
		}
	}

	// Price range filters
	if (input.priceMin) {
		productQueryConditions.push(gte(products.precoVenda, input.priceMin));
	}
	if (input.priceMax) {
		productQueryConditions.push(lte(products.precoVenda, input.priceMax));
	}

	const statsConditions = [eq(sales.organizacaoId, userOrgId), eq(sales.natureza, "SN01")];
	if (input.statsPeriodBefore) statsConditions.push(lte(sales.dataVenda, input.statsPeriodBefore));
	if (input.statsPeriodAfter) statsConditions.push(gte(sales.dataVenda, input.statsPeriodAfter));
	if (input.statsSaleNatures && input.statsSaleNatures.length > 0) statsConditions.push(inArray(sales.natureza, input.statsSaleNatures));
	if (input.statsExcludedSalesIds && input.statsExcludedSalesIds.length > 0) statsConditions.push(notInArray(sales.id, input.statsExcludedSalesIds));
	if (input.statsSellerIds && input.statsSellerIds.length > 0) statsConditions.push(inArray(sales.vendedorId, input.statsSellerIds));
	const havingConditions = [];
	if (input.statsTotalMin) {
		havingConditions.push(gte(sql<number>`sum(${sales.valorTotal})`, input.statsTotalMin));
	}
	if (input.statsTotalMax) {
		havingConditions.push(lte(sql<number>`sum(${sales.valorTotal})`, input.statsTotalMax));
	}

	const PAGE_SIZE = 25;
	const skip = PAGE_SIZE * (input.page - 1);

	// Fragmento SQL reutilizável para o valor total (só considera quando a venda passa nos filtros)
	const totalSalesSql = sql`COALESCE(sum(CASE WHEN ${sales.id} IS NOT NULL THEN ${saleItems.valorVendaTotalLiquido} ELSE 0 END), 0)`;

	// Query única que retorna produtos + stats já ordenados e paginados
	// Usa LEFT JOINs condicionais para aplicar filtros de stats apenas quando necessário
	const baseQuery = db
		.select({
			// Campos do produto
			productId: products.id,
			codigo: products.codigo,
			nome: products.nome,
			descricao: products.descricao,
			unidade: products.unidade,
			ncm: products.ncm,
			tipo: products.tipo,
			grupo: products.grupo,
			imagemCapaUrl: products.imagemCapaUrl,
			precoVenda: products.precoVenda,
			precoCusto: products.precoCusto,
			quantidade: products.quantidade,
			organizacaoId: products.organizacaoId,
			dataUltimaSincronizacao: products.dataUltimaSincronizacao,
			// Campos de stats - só considera valores quando a venda passa nos filtros
			totalSalesValue: sql<number>`sum(CASE WHEN ${sales.id} IS NOT NULL THEN ${saleItems.valorVendaTotalLiquido} ELSE 0 END)`.as(
				"total_sales_value",
			),
			totalSalesQty: sql<number>`sum(CASE WHEN ${sales.id} IS NOT NULL THEN ${saleItems.quantidade} ELSE 0 END)`.as("total_sales_qty"),
			firstSaleDate: min(sales.dataVenda).as("first_sale_date"),
			lastSaleDate: max(sales.dataVenda).as("last_sale_date"),
			// Curva ABC - calculamos via window functions
			accumulatedSales: sql<number>`sum(${totalSalesSql}) OVER (ORDER BY ${totalSalesSql} DESC, ${products.id} ASC)`.as("accumulated_sales"),
			totalSalesGlobal: sql<number>`sum(${totalSalesSql}) OVER ()`.as("total_sales_global"),
		})
		.from(products)
		.leftJoin(saleItems, eq(products.id, saleItems.produtoId))
		.leftJoin(sales, and(eq(saleItems.vendaId, sales.id), ...statsConditions))
		.where(and(...productQueryConditions))
		.groupBy(products.id);

	if (havingConditions.length > 0) {
		baseQuery.having(and(...havingConditions));
	}

	// Conta total de produtos que correspondem aos filtros
	const productStatsSubquery = baseQuery.as("product_stats");
	const curvaABCSql = sql<string>`
		CASE
			WHEN COALESCE(${productStatsSubquery.totalSalesGlobal}, 0) <= 0 THEN 'C'
			WHEN ((COALESCE(${productStatsSubquery.accumulatedSales}, 0) - COALESCE(${productStatsSubquery.totalSalesValue}, 0)) / NULLIF(${productStatsSubquery.totalSalesGlobal}, 0)) < 0.8 THEN 'A'
			WHEN ((COALESCE(${productStatsSubquery.accumulatedSales}, 0) - COALESCE(${productStatsSubquery.totalSalesValue}, 0)) / NULLIF(${productStatsSubquery.totalSalesGlobal}, 0)) < 0.95 THEN 'B'
			ELSE 'C'
		END
	`;

	// Aplica ordenação e paginação
	const productsWithABCQuery = db
		.select({
			productId: productStatsSubquery.productId,
			codigo: productStatsSubquery.codigo,
			nome: productStatsSubquery.nome,
			descricao: productStatsSubquery.descricao,
			unidade: productStatsSubquery.unidade,
			ncm: productStatsSubquery.ncm,
			tipo: productStatsSubquery.tipo,
			grupo: productStatsSubquery.grupo,
			imagemCapaUrl: productStatsSubquery.imagemCapaUrl,
			precoVenda: productStatsSubquery.precoVenda,
			precoCusto: productStatsSubquery.precoCusto,
			quantidade: productStatsSubquery.quantidade,
			organizacaoId: productStatsSubquery.organizacaoId,
			dataUltimaSincronizacao: productStatsSubquery.dataUltimaSincronizacao,
			totalSalesValue: productStatsSubquery.totalSalesValue,
			totalSalesQty: productStatsSubquery.totalSalesQty,
			firstSaleDate: productStatsSubquery.firstSaleDate,
			lastSaleDate: productStatsSubquery.lastSaleDate,
			curvaABC: curvaABCSql.as("curva_abc"),
		})
		.from(productStatsSubquery);

	if (input.abcClasses && input.abcClasses.length > 0) {
		productsWithABCQuery.where(sql`${curvaABCSql} IN (${sql.join(input.abcClasses.map((abcClass) => sql`${abcClass}`), sql`, `)})`);
	}

	const productsWithABCSubquery = productsWithABCQuery.as("products_with_abc");
	const direction = input.orderByDirection === "desc" ? desc : asc;
	const orderByField = input.orderByField;

	function buildOrderByClause<T extends Record<string, any>>(source: T) {
		switch (orderByField) {
			case "nome":
				return direction(source.nome);
			case "codigo":
				return direction(source.codigo);
			case "grupo":
				return direction(source.grupo);
			case "vendasValorTotal":
				return direction(sql`COALESCE(${source.totalSalesValue}, 0)`);
			case "vendasQtdeTotal":
				return direction(sql`COALESCE(${source.totalSalesQty}, 0)`);
			case "quantidade":
				return direction(sql`COALESCE(${source.quantidade}, 0)`);
			default:
				return asc(source.nome);
		}
	}

	// resultLimit: corta os top N após ordenação e filtro de curva ABC, antes da paginação
	const paginationSource = input.resultLimit
		? db
				.select()
				.from(productsWithABCSubquery)
				.orderBy(buildOrderByClause(productsWithABCSubquery))
				.limit(input.resultLimit)
				.as("products_capped")
		: productsWithABCSubquery;

	const matchedCountResult = await db.select({ count: count() }).from(paginationSource);
	const statsByProductMatchedCount = matchedCountResult[0]?.count ?? 0;

	const productsWithStatsResult = await db
		.select()
		.from(paginationSource)
		.orderBy(buildOrderByClause(paginationSource))
		.offset(skip)
		.limit(PAGE_SIZE);

	// Mapeia os resultados para o formato final
	const productsWithStats = productsWithStatsResult.map((row) => {
		const totalSales = row.totalSalesValue ? Number(row.totalSalesValue) : 0;

		return {
			id: row.productId,
			codigo: row.codigo,
			nome: row.nome,
			descricao: row.descricao,
			unidade: row.unidade,
			ncm: row.ncm,
			tipo: row.tipo,
			grupo: row.grupo,
			imagemCapaUrl: row.imagemCapaUrl,
			precoVenda: row.precoVenda,
			precoCusto: row.precoCusto,
			quantidade: row.quantidade,
			organizacaoId: row.organizacaoId,
			dataUltimaSincronizacao: row.dataUltimaSincronizacao,
			estatisticas: {
				vendasValorTotal: totalSales,
				vendasQtdeTotal: row.totalSalesQty ? Number(row.totalSalesQty) : 0,
				dataPrimeiraVenda: row.firstSaleDate ?? null,
				dataUltimaVenda: row.lastSaleDate ?? null,
				curvaABC: row.curvaABC,
			},
		};
	});
	return {
		data: {
			default: {
				products: productsWithStats,
				productsMatched: statsByProductMatchedCount,
				totalPages: Math.ceil(statsByProductMatchedCount / PAGE_SIZE),
			},
			byId: undefined,
		},
	};
}

export type TGetProductsOutput = Awaited<ReturnType<typeof getProducts>>;
export type TGetProductsOutputDefault = Exclude<TGetProductsOutput["data"]["default"], undefined>;
export type TGetProductsOutputById = Exclude<TGetProductsOutput["data"]["byId"], undefined>;

const getProductsHandler: PagesRouteHandler<TGetProductsOutput> = async (req, res) => {
	const sessionUser = await getCurrentSessionUncached();
	if (!sessionUser) throw new createHttpError.Unauthorized("Você não está autenticado.");

	console.log("[INFO] [GET PRODUCTS] Query params:", req.query);
	const input = GetProductsInputSchema.parse({
		page: req.query.page as string | undefined,
		id: req.query.id as string | undefined,
		search: req.query.search as string | undefined,
		groups: req.query.groups as string | undefined,
		statsPeriodAfter: req.query.statsPeriodAfter as string | undefined,
		statsPeriodBefore: req.query.statsPeriodBefore as string | undefined,
		statsSellerIds: req.query.statsSellerIds as string | undefined,
		statsSaleNatures: req.query.statsSaleNatures as string | undefined,
		statsExcludedSalesIds: req.query.statsExcludedSalesIds as string | undefined,
		statsTotalMin: req.query.statsTotalMin as string | undefined,
		statsTotalMax: req.query.statsTotalMax as string | undefined,
		stockStatus: req.query.stockStatus as string | undefined,
		abcClasses: req.query.abcClasses as string | undefined,
		priceMin: req.query.priceMin as string | undefined,
		priceMax: req.query.priceMax as string | undefined,
		orderByField: req.query.orderByField as string | undefined,
		orderByDirection: req.query.orderByDirection as string | undefined,
		resultLimit: req.query.resultLimit as string | undefined,
	});
	const data = await getProducts({ input, session: sessionUser });
	return res.status(200).json(data);
};

const UpdateProductAddOnOptionInputSchema = ProductAddOnOptionSchema.omit({
	organizacaoId: true,
	produtoAddOnId: true,
}).extend({
	produtoConsumo: z.string().optional().nullable(),
	id: z
		.string({
			invalid_type_error: "Tipo não válido para ID da opção.",
		})
		.optional()
		.nullable(),
	deletar: z
		.boolean({
			invalid_type_error: "Tipo não válido para deletar opção.",
		})
		.optional()
		.nullable(),
});

const UpdateProductAddOnInputSchema = ProductAddOnSchema.omit({ organizacaoId: true })
	.extend({
		opcoes: z.array(UpdateProductAddOnOptionInputSchema),
	})
	.extend({
		id: z
			.string({
				invalid_type_error: "Tipo não válido para ID do adicional.",
			})
			.optional()
			.nullable(),
		deletar: z
			.boolean({
				invalid_type_error: "Tipo não válido para deletar adicional.",
			})
			.optional()
			.nullable(),
	});

const UpdateProductFiscalProfileInputSchema = ProductFiscalProfileSchema.omit({
	organizacaoId: true,
	produtoId: true,
	produtoVarianteId: true,
}).extend({
	id: z
		.string({
			invalid_type_error: "Tipo não válido para ID do perfil fiscal.",
		})
		.optional()
		.nullable(),
	deletar: z
		.boolean({
			invalid_type_error: "Tipo não válido para deletar perfil fiscal.",
		})
		.optional()
		.nullable(),
});

const UpdateProductVariantInputSchema = ProductVariantSchema.omit({
	organizacaoId: true,
	produtoId: true,
}).extend({
	imagemCapaUrl: z.string().optional().nullable(),
	addOns: z.array(UpdateProductAddOnInputSchema),
	perfisFiscais: z.array(UpdateProductFiscalProfileInputSchema),
	id: z
		.string({
			invalid_type_error: "Tipo não válido para ID da variante.",
		})
		.optional()
		.nullable(),
	deletar: z
		.boolean({
			invalid_type_error: "Tipo não válido para deletar variante.",
		})
		.optional()
		.nullable(),
});

const UpdateProductInputSchema = z.object({
	productId: z.string({
		required_error: "ID do produto não informado.",
		invalid_type_error: "Tipo inválido para ID do produto.",
	}),
	product: ProductSchema.omit({ organizacaoId: true }),
	productVariants: z.array(UpdateProductVariantInputSchema),
	productAddOns: z.array(UpdateProductAddOnInputSchema),
	productFiscalProfiles: z.array(UpdateProductFiscalProfileInputSchema),
});
export type TUpdateProductInput = z.infer<typeof UpdateProductInputSchema>;

type TUpdateProductAddOnInput = z.infer<typeof UpdateProductAddOnInputSchema>;
type TUpdateProductAddOnOptionInput = z.infer<typeof UpdateProductAddOnOptionInputSchema>;
type TUpdateProductFiscalProfileInput = z.infer<typeof UpdateProductFiscalProfileInputSchema>;

async function upsertProductAddOnOptions({
	tx,
	userOrgId,
	addOnId,
	options,
}: {
	tx: DBTransaction;
	userOrgId: string;
	addOnId: string;
	options: TUpdateProductAddOnOptionInput[];
}) {
	for (const option of options) {
		if (option.id && option.deletar) {
			await tx
				.update(productAddOnOptions)
				.set({ ativo: false })
				.where(
					and(eq(productAddOnOptions.id, option.id), eq(productAddOnOptions.produtoAddOnId, addOnId), eq(productAddOnOptions.organizacaoId, userOrgId)),
				);
			continue;
		}

		const normalizedOption = await validateAndResolveAddOnOptionLink({
			tx,
			userOrgId,
			option,
		});

		const optionValues = {
			nome: normalizedOption.nome,
			codigo: normalizedOption.codigo,
			precoDelta: normalizedOption.precoDelta,
			maxQtdePorItem: normalizedOption.maxQtdePorItem,
			ativo: normalizedOption.ativo,
			produtoId: normalizedOption.produtoId ?? null,
			produtoVarianteId: normalizedOption.produtoVarianteId ?? null,
			quantidadeConsumo: normalizedOption.quantidadeConsumo ?? 1,
		};

		if (normalizedOption.id) {
			await tx
				.update(productAddOnOptions)
				.set(optionValues)
				.where(
					and(
						eq(productAddOnOptions.id, normalizedOption.id),
						eq(productAddOnOptions.produtoAddOnId, addOnId),
						eq(productAddOnOptions.organizacaoId, userOrgId),
					),
				);
			continue;
		}

		await tx.insert(productAddOnOptions).values({
			organizacaoId: userOrgId,
			produtoAddOnId: addOnId,
			...optionValues,
		});
	}
}

async function upsertScopedProductAddOn({
	tx,
	userOrgId,
	productId,
	variantId,
	order,
	addOn,
}: {
	tx: DBTransaction;
	userOrgId: string;
	productId: string;
	variantId?: string | null;
	order: number;
	addOn: TUpdateProductAddOnInput;
}) {
	if (addOn.id && addOn.deletar) {
		await tx
			.update(productAddOns)
			.set({ ativo: false })
			.where(and(eq(productAddOns.id, addOn.id), eq(productAddOns.organizacaoId, userOrgId)));
		await tx
			.update(productAddOnOptions)
			.set({ ativo: false })
			.where(and(eq(productAddOnOptions.produtoAddOnId, addOn.id), eq(productAddOnOptions.organizacaoId, userOrgId)));
		return addOn.id;
	}

	if (addOn.id) {
		await tx
			.update(productAddOns)
			.set({
				nome: addOn.nome,
				internoNome: addOn.internoNome,
				minOpcoes: addOn.minOpcoes,
				maxOpcoes: addOn.maxOpcoes,
				ativo: addOn.ativo,
			})
			.where(and(eq(productAddOns.id, addOn.id), eq(productAddOns.organizacaoId, userOrgId)));

		await tx
			.update(productAddOnReferences)
			.set({ ordem: order })
			.where(
				and(
					eq(productAddOnReferences.produtoId, productId),
					eq(productAddOnReferences.produtoAddOnId, addOn.id),
					variantId ? eq(productAddOnReferences.produtoVarianteId, variantId) : isNull(productAddOnReferences.produtoVarianteId),
				),
			);

		await upsertProductAddOnOptions({
			tx,
			userOrgId,
			addOnId: addOn.id,
			options: addOn.opcoes,
		});

		return addOn.id;
	}

	const [createdAddOn] = await tx
		.insert(productAddOns)
		.values({
			organizacaoId: userOrgId,
			nome: addOn.nome,
			internoNome: addOn.internoNome,
			minOpcoes: addOn.minOpcoes,
			maxOpcoes: addOn.maxOpcoes,
			ativo: addOn.ativo,
		})
		.returning({ id: productAddOns.id });

	if (!createdAddOn?.id) {
		throw new createHttpError.InternalServerError("Erro ao criar grupo de adicionais do produto.");
	}

	await upsertProductAddOnOptions({
		tx,
		userOrgId,
		addOnId: createdAddOn.id,
		options: addOn.opcoes,
	});

	await tx.insert(productAddOnReferences).values({
		produtoId: productId,
		produtoVarianteId: variantId ?? null,
		produtoAddOnId: createdAddOn.id,
		ordem: order,
	});

	return createdAddOn.id;
}

async function upsertScopedProductFiscalProfiles({
	tx,
	userOrgId,
	userHasFiscalConfigurePermission,
	productId,
	variantId,
	profiles,
}: {
	tx: DBTransaction;
	userOrgId: string;
	userHasFiscalConfigurePermission: boolean;
	productId: string;
	variantId?: string | null;
	profiles: TUpdateProductFiscalProfileInput[];
}) {
	for (const profile of profiles) {
		const scopedWhereClause = and(
			eq(productFiscalProfiles.organizacaoId, userOrgId),
			eq(productFiscalProfiles.produtoId, productId),
			variantId ? eq(productFiscalProfiles.produtoVarianteId, variantId) : isNull(productFiscalProfiles.produtoVarianteId),
			profile.id ? eq(productFiscalProfiles.id, profile.id) : undefined,
		);

		if (profile.id && profile.deletar) {
			if (!userHasFiscalConfigurePermission) {
				console.warn("[WARN] [UPSERT SCOPED PRODUCT FISCAL PROFILES] User does not have permission to configure fiscal profiles.");
				continue;
			}
			await tx.update(productFiscalProfiles).set({ ativo: false }).where(scopedWhereClause);
			continue;
		}

		const profileValues = {
			origemMercadoria: profile.origemMercadoria,
			ncm: profile.ncm,
			cest: profile.cest,
			cfopPadrao: profile.cfopPadrao,
			unidadeComercial: profile.unidadeComercial,
			codigoBeneficioFiscal: profile.codigoBeneficioFiscal,
			ativo: profile.ativo,
		};

		if (profile.id) {
			if (!userHasFiscalConfigurePermission) {
				console.warn("[WARN] [UPSERT SCOPED PRODUCT FISCAL PROFILES] User does not have permission to configure fiscal profiles.");
				continue;
			}
			await tx.update(productFiscalProfiles).set(profileValues).where(scopedWhereClause);
			continue;
		}

		if (!userHasFiscalConfigurePermission) {
			console.warn("[WARN] [UPSERT SCOPED PRODUCT FISCAL PROFILES] User does not have permission to configure fiscal profiles.");
			continue;
		}
		await tx.insert(productFiscalProfiles).values({
			organizacaoId: userOrgId,
			produtoId: productId,
			produtoVarianteId: variantId ?? null,
			...profileValues,
		});
	}
}

async function updateProduct({ session, input }: { session: TAuthUserSession; input: TUpdateProductInput }) {
	const userMembership = session.membership;
	if (!userMembership) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");
	const userOrgId = userMembership.organizacao.id;
	const userHasFiscalConfigurePermission = userMembership.permissoes.fiscal.configurar;

	const product = await db.query.products.findFirst({
		where: and(eq(products.id, input.productId), eq(products.organizacaoId, userOrgId)),
	});
	if (!product) throw new createHttpError.NotFound("Produto não encontrado.");

	const transactionReturn = await db.transaction(async (tx) => {
		const [updatedProduct] = await tx
			.update(products)
			.set({
				nome: input.product.nome,
				descricao: input.product.descricao,
				codigo: input.product.codigo,
				unidade: input.product.unidade,
				ncm: input.product.ncm,
				tipo: input.product.tipo,
				grupo: input.product.grupo,
				imagemCapaUrl: input.product.imagemCapaUrl,
				precoVenda: input.product.precoVenda,
				precoCusto: input.product.precoCusto,
				quantidade: input.product.quantidade,
				rastreamentoEstoqueAtivo: input.product.rastreamentoEstoqueAtivo,
			})
			.where(and(eq(products.id, input.productId), eq(products.organizacaoId, userOrgId)))
			.returning({ updatedId: products.id });

		if (!updatedProduct?.updatedId) {
			throw new createHttpError.InternalServerError("Oops, houve um erro desconhecido ao atualizar produto.");
		}

		await upsertScopedProductFiscalProfiles({
			tx,
			userOrgId,
			userHasFiscalConfigurePermission,
			productId: input.productId,
			variantId: null,
			profiles: input.productFiscalProfiles,
		});

		for (const variant of input.productVariants) {
			if (variant.id && variant.deletar) {
				await tx
					.update(productVariants)
					.set({ ativo: false })
					.where(and(eq(productVariants.id, variant.id), eq(productVariants.produtoId, input.productId), eq(productVariants.organizacaoId, userOrgId)));
				await tx
					.update(productFiscalProfiles)
					.set({ ativo: false })
					.where(
						and(
							eq(productFiscalProfiles.organizacaoId, userOrgId),
							eq(productFiscalProfiles.produtoId, input.productId),
							eq(productFiscalProfiles.produtoVarianteId, variant.id),
						),
					);
				continue;
			}

			let variantId = variant.id ?? null;

			if (variantId) {
				await tx
					.update(productVariants)
					.set({
						nome: variant.nome,
						codigo: variant.codigo,
						imagemCapaUrl: variant.imagemCapaUrl,
						precoVenda: variant.precoVenda,
						precoCusto: variant.precoCusto,
						quantidade: variant.quantidade,
						rastreamentoEstoqueAtivo: variant.rastreamentoEstoqueAtivo,
						ativo: variant.ativo,
					})
					.where(and(eq(productVariants.id, variantId), eq(productVariants.produtoId, input.productId), eq(productVariants.organizacaoId, userOrgId)));
			} else {
				const [createdVariant] = await tx
					.insert(productVariants)
					.values({
						organizacaoId: userOrgId,
						produtoId: input.productId,
						nome: variant.nome,
						codigo: variant.codigo,
						imagemCapaUrl: variant.imagemCapaUrl,
						precoVenda: variant.precoVenda,
						precoCusto: variant.precoCusto,
						quantidade: variant.quantidade,
						rastreamentoEstoqueAtivo: variant.rastreamentoEstoqueAtivo,
						ativo: variant.ativo,
					})
					.returning({ id: productVariants.id });

				if (!createdVariant?.id) {
					throw new createHttpError.InternalServerError("Erro ao criar variante do produto.");
				}

				variantId = createdVariant.id;
			}

			for (const [addOnIndex, addOn] of variant.addOns.entries()) {
				await upsertScopedProductAddOn({
					tx,
					userOrgId,
					productId: input.productId,
					variantId,
					order: addOnIndex,
					addOn,
				});
			}

			// Variants inherit the product-level fiscal profile.
		}

		for (const [addOnIndex, addOn] of input.productAddOns.entries()) {
			await upsertScopedProductAddOn({
				tx,
				userOrgId,
				productId: input.productId,
				variantId: null,
				order: addOnIndex,
				addOn,
			});
		}

		return updatedProduct.updatedId;
	});

	const updatedProductId = transactionReturn;
	if (!updatedProductId) throw new createHttpError.InternalServerError("Oops, houve um erro desconhecido ao atualizar produto.");
	return {
		data: {
			updatedId: updatedProductId,
		},
		message: "Produto atualizado com sucesso.",
	};
}
export type TUpdateProductOutput = Awaited<ReturnType<typeof updateProduct>>;
const updateProductHandler: PagesRouteHandler<TUpdateProductOutput> = async (req, res) => {
	const sessionUser = await getCurrentSessionUncached();
	if (!sessionUser) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const input = UpdateProductInputSchema.parse(req.body);
	const data = await updateProduct({ session: sessionUser, input });
	return res.status(200).json(data);
};

// ========== CREATE PRODUCT ==========

const CreateProductAddOnInputSchema = ProductAddOnSchema.omit({ organizacaoId: true }).extend({
	opcoes: z.array(
		ProductAddOnOptionSchema.omit({
			organizacaoId: true,
			produtoAddOnId: true,
		}).extend({
			produtoConsumo: z.string().optional().nullable(),
		}),
	),
});

const CreateProductVariantInputSchema = ProductVariantSchema.omit({
	organizacaoId: true,
	produtoId: true,
}).extend({
	imagemCapaUrl: z.string().optional().nullable(),
	addOns: z.array(CreateProductAddOnInputSchema),
	perfisFiscais: z.array(ProductFiscalProfileSchema.omit({ organizacaoId: true, produtoId: true, produtoVarianteId: true })),
});

const CreateProductInputSchema = z.object({
	product: ProductSchema.omit({ organizacaoId: true }),
	productVariants: z.array(CreateProductVariantInputSchema),
	productAddOns: z.array(CreateProductAddOnInputSchema),
	productFiscalProfiles: z.array(ProductFiscalProfileSchema.omit({ organizacaoId: true, produtoId: true, produtoVarianteId: true })),
});

export type TCreateProductInput = z.infer<typeof CreateProductInputSchema>;

async function createProduct({ session, input }: { session: TAuthUserSession; input: TCreateProductInput }) {
	const userMembership = session.membership;
	if (!userMembership) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");
	const userOrgId = userMembership.organizacao.id;
	const userHasFiscalConfigurePermission = userMembership.permissoes.fiscal.configurar;

	console.log("[INFO] [CREATE PRODUCT] Input:", JSON.stringify(input, null, 2));

	const transactionReturn = await db.transaction(async (tx) => {
		// 1. Create the main product
		const [createdProduct] = await tx
			.insert(products)
			.values({
				organizacaoId: userOrgId,
				nome: input.product.nome,
				descricao: input.product.descricao,
				codigo: input.product.codigo,
				unidade: input.product.unidade,
				ncm: input.product.ncm,
				tipo: input.product.tipo,
				grupo: input.product.grupo,
				imagemCapaUrl: input.product.imagemCapaUrl,
				precoVenda: input.product.precoVenda,
				precoCusto: input.product.precoCusto,
				quantidade: input.product.quantidade,
				rastreamentoEstoqueAtivo: input.product.rastreamentoEstoqueAtivo,
			})
			.returning({ id: products.id });

		if (!createdProduct?.id) throw new createHttpError.InternalServerError("Erro ao criar o produto.");

		const productId = createdProduct.id;

		// 1.1 Checking if product allows stock tracking and if quantity is greater than 0
		if (input.product.rastreamentoEstoqueAtivo && input.product.quantidade && input.product.quantidade > 0) {
			// If that is the case, we gotta create the initial manual stock transaction for the product
			await tx.insert(productStockTransactions).values({
				organizacaoId: userOrgId,
				produtoId: productId,
				produtoVarianteId: null,
				quantidade: input.product.quantidade,
				saldoAnterior: 0,
				saldoPosterior: input.product.quantidade,
				motivo: "Inicialização do estoque",
				tipo: "AJUSTE",
				operadorId: session.user.id,
			});
		}

		const willCreateAnyFiscalProfiles = input.productFiscalProfiles.length > 0;
		if (willCreateAnyFiscalProfiles && !userHasFiscalConfigurePermission) {
			console.warn("[WARN] [CREATE PRODUCT] User does not have permission to configure fiscal profiles.");
			throw new createHttpError.Forbidden("Você não possui permissão para configurar perfis fiscais.");
		}
		for (const profile of input.productFiscalProfiles) {
			await tx.insert(productFiscalProfiles).values({
				organizacaoId: userOrgId,
				produtoId: productId,
				produtoVarianteId: null,
				...profile,
			});
		}

		const insertedProductVariantIds = [];
		const insertedProductAddOnIds = [];
		// 2. Create product variants (if any)
		for (const variant of input.productVariants) {
			const [createdVariant] = await tx
				.insert(productVariants)
				.values({
					organizacaoId: userOrgId,
					produtoId: productId,
					nome: variant.nome,
					codigo: variant.codigo,
					imagemCapaUrl: variant.imagemCapaUrl,
					precoVenda: variant.precoVenda,
					precoCusto: variant.precoCusto,
					quantidade: variant.quantidade,
					rastreamentoEstoqueAtivo: variant.rastreamentoEstoqueAtivo,
					ativo: variant.ativo,
				})
				.returning({ id: productVariants.id });

			if (!createdVariant?.id) throw new createHttpError.InternalServerError("Erro ao criar variante do produto.");

			insertedProductVariantIds.push(createdVariant.id);

			// 2.1 Checking if variant allows stock tracking and if quantity is greater than 0
			if (variant.rastreamentoEstoqueAtivo && variant.quantidade && variant.quantidade > 0) {
				// If that is the case, we gotta create the initial manual stock transaction for the variant
				await tx.insert(productStockTransactions).values({
					organizacaoId: userOrgId,
					produtoId: productId,
					produtoVarianteId: createdVariant.id,
					quantidade: variant.quantidade,
					saldoAnterior: 0,
					saldoPosterior: variant.quantidade,
					motivo: "Inicialização do estoque",
					tipo: "AJUSTE",
					operadorId: session.user.id,
				});
			}
			// 2.2 Create variant add-ons (if any)
			for (const [addOnIndex, addOn] of variant.addOns.entries()) {
				const [createdAddOn] = await tx
					.insert(productAddOns)
					.values({
						organizacaoId: userOrgId,
						nome: addOn.nome,
						internoNome: addOn.internoNome,
						minOpcoes: addOn.minOpcoes,
						maxOpcoes: addOn.maxOpcoes,
						ativo: addOn.ativo,
					})
					.returning({ id: productAddOns.id });

				if (!createdAddOn?.id) throw new createHttpError.InternalServerError("Erro ao criar grupo de adicionais da variante.");

				insertedProductAddOnIds.push(createdAddOn.id);

				// Create options for this add-on
				for (const option of addOn.opcoes) {
					await tx.insert(productAddOnOptions).values({
						organizacaoId: userOrgId,
						produtoAddOnId: createdAddOn.id,
						nome: option.nome,
						codigo: option.codigo,
						precoDelta: option.precoDelta,
						maxQtdePorItem: option.maxQtdePorItem,
						ativo: option.ativo,
						produtoId: option.produtoId,
						produtoVarianteId: option.produtoVarianteId,
						quantidadeConsumo: option.quantidadeConsumo,
					});
				}

				// 2.2 Create the reference linking product and the variant to the add-on
				await tx.insert(productAddOnReferences).values({
					produtoId: productId,
					ordem: addOnIndex,
					produtoAddOnId: createdAddOn.id,
					produtoVarianteId: createdVariant.id,
				});
			}

			// Variants inherit the product-level fiscal profile.
		}

		// 3. Create product add-ons (at product level) and link them
		for (const [addOnIndex, addOn] of input.productAddOns.entries()) {
			const [createdAddOn] = await tx
				.insert(productAddOns)
				.values({
					organizacaoId: userOrgId,
					nome: addOn.nome,
					internoNome: addOn.internoNome,
					minOpcoes: addOn.minOpcoes,
					maxOpcoes: addOn.maxOpcoes,
					ativo: addOn.ativo,
				})
				.returning({ id: productAddOns.id });

			if (!createdAddOn?.id) throw new createHttpError.InternalServerError("Erro ao criar grupo de adicionais do produto.");

			insertedProductAddOnIds.push(createdAddOn.id);
			// 3.1 Create options for this add-on
			for (const option of addOn.opcoes) {
				await tx.insert(productAddOnOptions).values({
					organizacaoId: userOrgId,
					produtoAddOnId: createdAddOn.id,
					nome: option.nome,
					codigo: option.codigo,
					precoDelta: option.precoDelta,
					maxQtdePorItem: option.maxQtdePorItem,
					ativo: option.ativo,
					produtoId: option.produtoId,
					produtoVarianteId: option.produtoVarianteId,
					quantidadeConsumo: option.quantidadeConsumo,
				});
			}

			// 3.2 Create the reference linking product to add-on
			await tx.insert(productAddOnReferences).values({
				produtoId: productId,
				produtoAddOnId: createdAddOn.id,
				ordem: addOnIndex,
			});
		}

		return {
			insertedProductId: productId,
			insertedProductVariantIds: insertedProductVariantIds,
			insertedProductAddOnIds: insertedProductAddOnIds,
		};
	});

	return {
		data: {
			productId: transactionReturn.insertedProductId,
			productVariantIds: transactionReturn.insertedProductVariantIds,
			productAddOnIds: transactionReturn.insertedProductAddOnIds,
		},
		message: "Produto criado com sucesso.",
	};
}

export type TCreateProductOutput = Awaited<ReturnType<typeof createProduct>>;

const createProductHandler: PagesRouteHandler<TCreateProductOutput> = async (req, res) => {
	const sessionUser = await getCurrentSessionUncached();
	if (!sessionUser) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const input = CreateProductInputSchema.parse(req.body);
	const data = await createProduct({ session: sessionUser, input });
	return res.status(201).json(data);
};

const routeHandlers = {
	GET: getProductsHandler,
	PUT: updateProductHandler,
	POST: createProductHandler,
} satisfies Partial<Record<"GET" | "POST" | "PUT" | "PATCH" | "DELETE", PagesRouteHandler<any>>>;

export const GET = appApiHandler({
	GET: (request) => runPagesRouteHandler({ request, handler: routeHandlers.GET! }),
});
export const PUT = appApiHandler({
	PUT: (request) => runPagesRouteHandler({ request, handler: routeHandlers.PUT! }),
});
export const POST = appApiHandler({
	POST: (request) => runPagesRouteHandler({ request, handler: routeHandlers.POST! }),
});
