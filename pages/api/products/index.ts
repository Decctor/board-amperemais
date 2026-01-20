import { apiHandler } from "@/lib/api";
import { getCurrentSessionUncached } from "@/lib/authentication/pages-session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { ProductAddOnOptionSchema, ProductAddOnSchema, ProductSchema, ProductVariantSchema } from "@/schemas/products";
import { db } from "@/services/drizzle";
import { productAddOnOptions, productAddOnReferences, productAddOns, productVariants, products, saleItems, sales } from "@/services/drizzle/schema";
import { and, asc, count, desc, eq, gte, inArray, lte, max, min, notInArray, sql, sum } from "drizzle-orm";
import createHttpError from "http-errors";
import type { NextApiHandler } from "next";
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
	orderByField: z.enum(["descricao", "codigo", "grupo", "vendasValorTotal", "vendasQtdeTotal", "quantidade"]).optional().nullable(),
	orderByDirection: z.enum(["asc", "desc"]).optional().nullable(),
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

async function getProducts({ input, session }: GetProductsParams) {
	const userOrgId = session.membership?.organizacao.id;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	console.log("[INFO] [GET PRODUCTS] Input:", input);

	if ("id" in input) {
		console.log("[INFO] [GET PRODUCTS] Getting product by id:", input.id);
		const product = await db.query.products.findFirst({
			where: (fields, { and, eq }) => and(eq(fields.id, input.id), eq(fields.organizacaoId, userOrgId)),
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
	let applyRestrictiveSalesFilters = false;

	if (input.search) {
		productQueryConditions.push(
			sql`(${products.descricao} ILIKE '%' || ${input.search} || '%' OR ${products.codigo} ILIKE '%' || ${input.search} || '%')`,
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

	const statsConditions = [eq(sales.organizacaoId, userOrgId)];
	if (input.statsPeriodBefore) statsConditions.push(lte(sales.dataVenda, input.statsPeriodBefore));
	if (input.statsPeriodAfter) statsConditions.push(gte(sales.dataVenda, input.statsPeriodAfter));
	if (input.statsSaleNatures && input.statsSaleNatures.length > 0) statsConditions.push(inArray(sales.natureza, input.statsSaleNatures));
	if (input.statsExcludedSalesIds && input.statsExcludedSalesIds.length > 0) statsConditions.push(notInArray(sales.id, input.statsExcludedSalesIds));
	if (input.statsSellerIds && input.statsSellerIds.length > 0) statsConditions.push(inArray(sales.vendedorId, input.statsSellerIds));
	const havingConditions = [];
	if (input.statsTotalMin) {
		havingConditions.push(gte(sql<number>`sum(${sales.valorTotal})`, input.statsTotalMin));
		applyRestrictiveSalesFilters = true;
	}
	if (input.statsTotalMax) {
		havingConditions.push(lte(sql<number>`sum(${sales.valorTotal})`, input.statsTotalMax));
		applyRestrictiveSalesFilters = true;
	}

	let orderByClause = asc(products.descricao);
	const direction = input.orderByDirection === "desc" ? desc : asc;
	switch (input.orderByField) {
		case "descricao":
			orderByClause = direction(products.descricao);
			break;
		case "codigo":
			orderByClause = direction(products.codigo);
			break;
		case "grupo":
			orderByClause = direction(products.grupo);
			break;
		case "vendasValorTotal":
			orderByClause = direction(sql`COALESCE(sum(${saleItems.valorVendaTotalLiquido}), 0)`);
			break;
		case "vendasQtdeTotal":
			orderByClause = direction(count(sales.id));
			break;
		case "quantidade":
			orderByClause = direction(sql`COALESCE(${products.quantidade}, 0)`);
			break;
		default:
			orderByClause = asc(products.descricao);
			break;
	}

	const PAGE_SIZE = 25;
	const skip = PAGE_SIZE * (input.page - 1);

	const matchedSubquery = db
		.select({
			productId: products.id,
		})
		.from(products)
		.leftJoin(saleItems, eq(products.id, saleItems.produtoId))
		.leftJoin(sales, eq(saleItems.vendaId, sales.id))
		.where(and(eq(saleItems.organizacaoId, userOrgId), ...productQueryConditions, ...statsConditions))
		.groupBy(products.id);

	if (havingConditions.length > 0) {
		matchedSubquery.having(and(...havingConditions));
	}
	const statsByProductMatchedCountResult = await db.select({ count: count() }).from(matchedSubquery.as("sq"));
	const statsByProductMatchedCount = statsByProductMatchedCountResult[0]?.count ?? 0;

	// Crie um fragmento SQL reutilizável para o valor total (trata NULL como 0)
	const totalSalesSql = sql`COALESCE(sum(${saleItems.valorVendaTotalLiquido}), 0)`;

	console.log("STATSCONDITIONS LENGTH:", statsConditions.length);
	const statsByProductResult = await db
		.select({
			productId: products.id,
			totalSalesValue: sum(saleItems.valorVendaTotalLiquido),
			totalSalesQty: count(sales.id),
			firstSaleDate: min(sales.dataVenda),
			lastSaleDate: max(sales.dataVenda),
			// Calcula o acumulado ordenado por valor decrescente
			accumulatedSales: sql<number>`sum(${totalSalesSql}) OVER (ORDER BY ${totalSalesSql} DESC)`,
			// Calcula o total geral do conjunto filtrado
			totalSalesGlobal: sql<number>`sum(${totalSalesSql}) OVER ()`,
		})
		.from(products)
		.leftJoin(saleItems, eq(products.id, saleItems.produtoId))
		.leftJoin(sales, eq(saleItems.vendaId, sales.id))
		.where(and(eq(saleItems.organizacaoId, userOrgId), ...productQueryConditions, ...statsConditions))
		.having(and(...havingConditions))
		.groupBy(products.id)
		.orderBy(orderByClause)
		.offset(skip)
		.limit(PAGE_SIZE);

	const productIds = statsByProductResult.map((product) => product.productId);
	const productsResult = await db.query.products.findMany({
		where: and(
			eq(products.organizacaoId, userOrgId),
			...productQueryConditions,
			applyRestrictiveSalesFilters ? inArray(products.id, productIds) : undefined,
		),
		limit: PAGE_SIZE,
		offset: skip,
	});

	const productsMap = new Map(productsResult.map((p) => [p.id, p]));
	const statsByProductMap = new Map(statsByProductResult.map((s) => [s.productId, s]));
	const productsWithStats = productsResult
		.map((product) => {
			const stats = statsByProductMap.get(product.id);

			// Lógica da Curva ABC
			const totalSales = stats?.totalSalesValue ? Number(stats.totalSalesValue) : 0;
			const accumulated = stats?.accumulatedSales ? Number(stats.accumulatedSales) : 0;
			const globalTotal = stats?.totalSalesGlobal ? Number(stats.totalSalesGlobal) : 0;

			let curvaABC = "C";
			if (globalTotal > 0) {
				// Descobre onde este item "começa" na curva acumulada
				// Se o item anterior terminou em 79%, e este vai até 82%, ele ainda entra como A (crossover)
				const prevAccumulated = accumulated - totalSales;
				const prevPercentage = prevAccumulated / globalTotal;

				if (prevPercentage < 0.8) curvaABC = "A";
				else if (prevPercentage < 0.95) curvaABC = "B";
			}

			return {
				...product,
				estatisticas: {
					vendasValorTotal: totalSales,
					vendasQtdeTotal: stats?.totalSalesQty ? Number(stats.totalSalesQty) : 0,
					dataPrimeiraVenda: stats?.firstSaleDate ? stats.firstSaleDate : null,
					dataUltimaVenda: stats?.lastSaleDate ? stats.lastSaleDate : null,
					curvaABC: curvaABC, // Novo campo
				},
			};
		})
		.filter((item): item is NonNullable<typeof item> => item !== null);
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

const getProductsHandler: NextApiHandler<TGetProductsOutput> = async (req, res) => {
	const sessionUser = await getCurrentSessionUncached(req.cookies);
	if (!sessionUser) throw new createHttpError.Unauthorized("Você não está autenticado.");

	console.log("[INFO] [GET PRODUCTS] Query params:", req.query);
	const input = GetProductsInputSchema.parse({
		page: req.query.page as string | undefined,
		id: req.query.id as string | undefined,
		search: req.query.search as string | undefined,
		groups: req.query.groups as string | undefined,
		statsPeriodAfter: req.query.statsPeriodAfter as string | undefined,
		statsPeriodBefore: req.query.statsPeriodBefore as string | undefined,
		statsSaleNatures: req.query.statsSaleNatures as string | undefined,
		statsExcludedSalesIds: req.query.statsExcludedSalesIds as string | undefined,
		statsTotalMin: req.query.statsTotalMin as string | undefined,
		statsTotalMax: req.query.statsTotalMax as string | undefined,
		stockStatus: req.query.stockStatus as string | undefined,
		priceMin: req.query.priceMin as string | undefined,
		priceMax: req.query.priceMax as string | undefined,
		orderByField: req.query.orderByField as string | undefined,
		orderByDirection: req.query.orderByDirection as string | undefined,
	});
	const data = await getProducts({ input, session: sessionUser });
	return res.status(200).json(data);
};

const UpdateProductInputSchema = z.object({
	productId: z.string({
		required_error: "ID do produto não informado.",
		invalid_type_error: "Tipo inválido para ID do produto.",
	}),
	product: ProductSchema.partial(),
});
export type TUpdateProductInput = z.infer<typeof UpdateProductInputSchema>;

async function updateProduct({ session, input }: { session: TAuthUserSession; input: TUpdateProductInput }) {
	const userOrgId = session.membership?.organizacao.id;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const product = await db.query.products.findFirst({
		where: and(eq(products.id, input.productId), eq(products.organizacaoId, userOrgId)),
	});
	if (!product) throw new createHttpError.NotFound("Produto não encontrado.");
	const updatedProduct = await db
		.update(products)
		.set({ ...input.product, organizacaoId: userOrgId })
		.where(and(eq(products.id, input.productId), eq(products.organizacaoId, userOrgId)))
		.returning({ updatedId: products.id });
	const updatedProductId = updatedProduct[0]?.updatedId;
	if (!updatedProductId) throw new createHttpError.InternalServerError("Oops, houve um erro desconhecido ao atualizar produto.");
	return {
		data: {
			updatedId: updatedProductId,
		},
		message: "Produto atualizado com sucesso.",
	};
}
export type TUpdateProductOutput = Awaited<ReturnType<typeof updateProduct>>;
const updateProductHandler: NextApiHandler<TUpdateProductOutput> = async (req, res) => {
	const sessionUser = await getCurrentSessionUncached(req.cookies);
	if (!sessionUser) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const input = UpdateProductInputSchema.parse(req.body);
	const data = await updateProduct({ session: sessionUser, input });
	return res.status(200).json(data);
};

// ========== CREATE PRODUCT ==========

const CreateProductAddOnOptionInputSchema = ProductAddOnOptionSchema.omit({ organizacaoId: true, produtoAddOnId: true }).extend({
	produtoConsumo: z.string().optional().nullable(),
});

const CreateProductAddOnInputSchema = ProductAddOnSchema.omit({ organizacaoId: true }).extend({
	opcoes: z.array(CreateProductAddOnOptionInputSchema),
});

const CreateProductVariantInputSchema = ProductVariantSchema.omit({ organizacaoId: true, produtoId: true }).extend({
	imagemCapaUrl: z.string().optional().nullable(),
	addOns: z.array(CreateProductAddOnInputSchema),
});

const CreateProductInputSchema = z.object({
	product: ProductSchema.omit({ organizacaoId: true }),
	productVariants: z.array(CreateProductVariantInputSchema),
	productAddOns: z.array(CreateProductAddOnInputSchema),
});

export type TCreateProductInput = z.infer<typeof CreateProductInputSchema>;

async function createProduct({ session, input }: { session: TAuthUserSession; input: TCreateProductInput }) {
	const userOrgId = session.membership?.organizacao.id;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	console.log("[INFO] [CREATE PRODUCT] Input:", JSON.stringify(input, null, 2));

	// 1. Create the main product
	const [createdProduct] = await db
		.insert(products)
		.values({
			organizacaoId: userOrgId,
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
		})
		.returning({ id: products.id });

	if (!createdProduct?.id) throw new createHttpError.InternalServerError("Erro ao criar o produto.");

	const productId = createdProduct.id;

	// 2. Create product variants (if any)
	for (const variant of input.productVariants) {
		const [createdVariant] = await db
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
				ativo: variant.ativo,
			})
			.returning({ id: productVariants.id });

		if (!createdVariant?.id) throw new createHttpError.InternalServerError("Erro ao criar variante do produto.");

		// 2.1 Create variant add-ons (if any)
		for (const [addOnIndex, addOn] of variant.addOns.entries()) {
			const [createdAddOn] = await db
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

			// Create options for this add-on
			for (const option of addOn.opcoes) {
				await db.insert(productAddOnOptions).values({
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
			await db.insert(productAddOnReferences).values({
				produtoId: productId,
				ordem: addOnIndex,
				produtoAddOnId: createdAddOn.id,
				produtoVarianteId: createdVariant.id,
			});
		}
	}

	// 3. Create product add-ons (at product level) and link them
	for (const [addOnIndex, addOn] of input.productAddOns.entries()) {
		const [createdAddOn] = await db
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

		// 3.1 Create options for this add-on
		for (const option of addOn.opcoes) {
			await db.insert(productAddOnOptions).values({
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
		await db.insert(productAddOnReferences).values({
			produtoId: productId,
			produtoAddOnId: createdAddOn.id,
			ordem: addOnIndex,
		});
	}

	return {
		data: {
			productId: productId,
		},
		message: "Produto criado com sucesso.",
	};
}

export type TCreateProductOutput = Awaited<ReturnType<typeof createProduct>>;

const createProductHandler: NextApiHandler<TCreateProductOutput> = async (req, res) => {
	const sessionUser = await getCurrentSessionUncached(req.cookies);
	if (!sessionUser) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const input = CreateProductInputSchema.parse(req.body);
	const data = await createProduct({ session: sessionUser, input });
	return res.status(201).json(data);
};

export default apiHandler({ GET: getProductsHandler, PUT: updateProductHandler, POST: createProductHandler });
