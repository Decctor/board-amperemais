import { apiHandler } from "@/lib/api";
import { getCurrentSessionUncached } from "@/lib/authentication/pages-session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { SellerSchema } from "@/schemas/sellers";
import { db } from "@/services/drizzle";
import { sales, sellers } from "@/services/drizzle/schema";
import { and, asc, count, desc, eq, gte, inArray, lte, max, min, notInArray, sql, sum } from "drizzle-orm";
import createHttpError from "http-errors";
import type { NextApiHandler } from "next";
import { z } from "zod";

const GetSellersDefaultInputSchema = z.object({
	page: z
		.string({
			required_error: "Página não informada.",
			invalid_type_error: "Tipo inválido para página.",
		})
		.default("1")
		.transform((val) => Number(val)),
	search: z
		.string({
			required_error: "Busca não informada.",
			invalid_type_error: "Tipo inválido para busca.",
		})
		.optional()
		.nullable(),
	sellersIds: z
		.string({
			required_error: "IDs dos vendedores não informados.",
			invalid_type_error: "Tipo inválido para IDs dos vendedores.",
		})
		.optional()
		.nullable()
		.transform((val) => (val ? val.split(",") : [])),
	orderByField: z.enum(["nome", "dataInsercao", "vendasValorTotal", "vendasQtdeTotal"]).optional().nullable(),
	orderByDirection: z.enum(["asc", "desc"]).optional().nullable(),
	statsPeriodAfter: z
		.string({
			required_error: "Data de inserção do vendedor não informada.",
			invalid_type_error: "Tipo inválido para data de inserção do vendedor.",
		})
		.datetime({ message: "Tipo inválido para data de inserção do vendedor." })
		.optional()
		.nullable()
		.transform((val) => (val ? new Date(val) : null)),
	statsPeriodBefore: z
		.string({
			required_error: "Data de inserção do vendedor não informada.",
			invalid_type_error: "Tipo inválido para data de inserção do vendedor.",
		})
		.datetime({ message: "Tipo inválido para data de inserção do vendedor." })
		.optional()
		.nullable()
		.transform((val) => (val ? new Date(val) : null)),
	statsSaleNatures: z
		.string({
			required_error: "Naturezas de venda não informadas.",
			invalid_type_error: "Tipo inválido para naturezas de venda.",
		})
		.optional()
		.nullable()
		.transform((val) => (val ? val.split(",") : [])),

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
	activeOnly: z
		.string({
			invalid_type_error: "Tipo não válido para ativo apenas.",
		})
		.optional()
		.nullable()
		.transform((val) => (val ? val === "true" : null)),
});
export type TGetSellersDefaultInput = z.infer<typeof GetSellersDefaultInputSchema>;
const GetSellersByIdInputSchema = z.object({
	id: z
		.string({
			required_error: "ID do vendedor não informado.",
			invalid_type_error: "Tipo inválido para ID do vendedor.",
		})
		.uuid({ message: "ID do vendedor inválido." }),
});
export type TGetSellersByIdInput = z.infer<typeof GetSellersByIdInputSchema>;

const GetSellersInputSchema = z.union([GetSellersByIdInputSchema, GetSellersDefaultInputSchema]);
export type TGetSellersInput = z.infer<typeof GetSellersInputSchema>;
type GetSellersParams = {
	input: TGetSellersInput;
	user: TAuthUserSession["user"];
};
async function getSellers({ input, user }: GetSellersParams) {
	const userOrgId = user.organizacaoId;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	console.log("[INFO] [GET SELLERS] Input:", input);
	if ("id" in input) {
		console.log("[INFO] [GET SELLERS] Getting seller by id:", input.id);
		const seller = await db.query.sellers.findFirst({
			where: (fields, { and, eq }) => and(eq(fields.id, input.id), eq(fields.organizacaoId, userOrgId)),
		});
		if (!seller) throw new createHttpError.NotFound("Vendedor não encontrado.");

		return {
			data: {
				byId: seller,
				default: undefined,
			},
		};
	}

	const sellerQueryConditions = [eq(sellers.organizacaoId, userOrgId)];
	let applyRestrictiveSalesFilters = false;
	if (input.search)
		sellerQueryConditions.push(
			sql`(to_tsvector('portuguese', ${sellers.nome}) @@ plainto_tsquery('portuguese', ${input.search}) OR ${sellers.nome} ILIKE '%' || ${input.search} || '%')`,
		);
	if (input.sellersIds && input.sellersIds.length > 0) sellerQueryConditions.push(inArray(sellers.id, input.sellersIds));
	if (input.activeOnly) sellerQueryConditions.push(eq(sellers.ativo, input.activeOnly));

	const statsConditions = [eq(sales.organizacaoId, userOrgId)];
	if (input.statsPeriodAfter) statsConditions.push(gte(sales.dataVenda, input.statsPeriodAfter));
	if (input.statsPeriodBefore) statsConditions.push(lte(sales.dataVenda, input.statsPeriodBefore));
	if (input.statsSaleNatures && input.statsSaleNatures.length > 0) statsConditions.push(inArray(sales.natureza, input.statsSaleNatures));
	if (input.statsExcludedSalesIds && input.statsExcludedSalesIds.length > 0) statsConditions.push(notInArray(sales.id, input.statsExcludedSalesIds));

	const havingConditions = [];
	if (input.statsTotalMin) {
		havingConditions.push(gte(sql<number>`sum(${sales.valorTotal})`, input.statsTotalMin));
		applyRestrictiveSalesFilters = true;
	}
	if (input.statsTotalMax) {
		havingConditions.push(lte(sql<number>`sum(${sales.valorTotal})`, input.statsTotalMax));
		applyRestrictiveSalesFilters = true;
	}

	let orderByClause = asc(sellers.nome);
	const direction = input.orderByDirection === "desc" ? desc : asc;
	switch (input.orderByField) {
		case "nome":
			orderByClause = direction(sellers.nome);
			break;
		case "dataInsercao":
			orderByClause = direction(sellers.dataInsercao);
			break;
		case "vendasValorTotal":
			orderByClause = direction(sql<number>`sum(${sales.valorTotal})`);
			break;
		case "vendasQtdeTotal":
			orderByClause = direction(count(sales.id));
			break;
		default:
			orderByClause = asc(sellers.nome);
			break;
	}

	const PAGE_SIZE = 25;
	const skip = PAGE_SIZE * (input.page - 1);

	const matchedSubquery = db
		.select({
			sellerId: sellers.id,
		})
		.from(sellers)
		.leftJoin(sales, eq(sellers.id, sales.vendedorId))
		.where(and(...sellerQueryConditions, ...statsConditions))
		.groupBy(sellers.id);

	if (havingConditions.length > 0) {
		matchedSubquery.having(and(...havingConditions));
	}
	const statsBySellerMatchedCountResult = await db.select({ count: count() }).from(matchedSubquery.as("sq"));
	const statsBySellerMatchedCount = statsBySellerMatchedCountResult[0]?.count ?? 0;

	const statsBySeller = await db
		.select({
			sellerId: sellers.id,
			totalSalesValue: sum(sales.valorTotal),
			totalSalesQty: count(sales.id),
			firstSaleDate: min(sales.dataVenda),
			lastSaleDate: max(sales.dataVenda),
		})
		.from(sellers)
		.leftJoin(sales, eq(sellers.id, sales.vendedorId))
		.where(and(...sellerQueryConditions, ...statsConditions))
		.having(and(...havingConditions))
		.groupBy(sellers.id)
		.orderBy(orderByClause)
		.offset(skip)
		.limit(PAGE_SIZE);

	const sellerIds = statsBySeller.map((seller) => seller.sellerId);
	const sellersResult = await db.query.sellers.findMany({
		where: and(eq(sellers.organizacaoId, userOrgId), applyRestrictiveSalesFilters ? inArray(sellers.id, sellerIds) : undefined),
	});

	const sellersWithStats = sellersResult.map((seller) => {
		const stats = statsBySeller.find((s) => s.sellerId === seller.id);
		return {
			...seller,
			estatisticas: {
				vendasValorTotal: stats?.totalSalesValue ? Number(stats.totalSalesValue) : 0,
				vendasQtdeTotal: stats?.totalSalesQty ? Number(stats.totalSalesQty) : 0,
				dataPrimeiraVenda: stats?.firstSaleDate ? stats.firstSaleDate : null,
				dataUltimaVenda: stats?.lastSaleDate ? stats.lastSaleDate : null,
			},
		};
	});
	return {
		data: {
			default: {
				sellers: sellersWithStats,
				sellersMatched: statsBySellerMatchedCount,
				totalPages: Math.ceil(statsBySellerMatchedCount / PAGE_SIZE),
			},
			byId: undefined,
		},
	};
}
export type TGetSellersOutput = Awaited<ReturnType<typeof getSellers>>;
export type TGetSellersOutputDefault = Exclude<TGetSellersOutput["data"]["default"], undefined>;
export type TGetSellersOutputById = Exclude<TGetSellersOutput["data"]["byId"], undefined>;
const getSellersHandler: NextApiHandler<TGetSellersOutput> = async (req, res) => {
	const sessionUser = await getCurrentSessionUncached(req.cookies);
	if (!sessionUser) throw new createHttpError.Unauthorized("Você não está autenticado.");

	console.log("[INFO] [GET SELLERS] Query params:", req.query);
	const input = GetSellersInputSchema.parse({
		id: req.query.id as string | undefined,
		search: req.query.search as string | undefined,
		statsPeriodAfter: req.query.statsPeriodAfter as string | undefined,
		statsPeriodBefore: req.query.statsPeriodBefore as string | undefined,
		orderByField: req.query.orderByField as string | undefined,
		orderByDirection: req.query.orderByDirection as string | undefined,
	});
	const data = await getSellers({ input, user: sessionUser.user });
	return res.status(200).json(data);
};

const UpdateSellerInputSchema = z.object({
	sellerId: z.string({
		required_error: "ID do vendedor não informado.",
		invalid_type_error: "Tipo inválido para ID do vendedor.",
	}),
	seller: SellerSchema.partial(),
});

export type TUpdateSellerInput = z.infer<typeof UpdateSellerInputSchema>;

type UpdateSellerParams = {
	input: TUpdateSellerInput;
	user: TAuthUserSession["user"];
};
async function updateSeller({ input, user }: UpdateSellerParams) {
	const userOrgId = user.organizacaoId;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const updatedSeller = await db
		.update(sellers)
		.set({ ...input.seller, organizacaoId: userOrgId })
		.where(and(eq(sellers.id, input.sellerId), eq(sellers.organizacaoId, userOrgId)))
		.returning({ id: sellers.id });
	const updatedSellerId = updatedSeller[0]?.id;
	if (!updatedSellerId) throw new createHttpError.NotFound("Vendedor não encontrado.");
	return {
		data: {
			updatedId: updatedSellerId,
		},
		message: "Vendedor atualizado com sucesso.",
	};
}
export type TUpdateSellerOutput = Awaited<ReturnType<typeof updateSeller>>;

const updateSellerHandler: NextApiHandler<TUpdateSellerOutput> = async (req, res) => {
	const sessionUser = await getCurrentSessionUncached(req.cookies);
	if (!sessionUser) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const input = UpdateSellerInputSchema.parse(req.body);
	const data = await updateSeller({ input, user: sessionUser.user });
	return res.status(200).json(data);
};

const CreateSellerInputSchema = SellerSchema.omit({ dataInsercao: true });
export type TCreateSellerInput = z.infer<typeof CreateSellerInputSchema>;

type CreateSellerParams = {
	input: TCreateSellerInput;
	user: TAuthUserSession["user"];
};

async function createSeller({ input, user }: CreateSellerParams) {
	const userOrgId = user.organizacaoId;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const existingSeller = await db.query.sellers.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.identificador, input.identificador), eq(fields.organizacaoId, userOrgId)),
	});

	if (existingSeller) throw new createHttpError.Conflict("Já existe um vendedor com este identificador nesta organização.");

	const createdSeller = await db
		.insert(sellers)
		.values({ ...input, organizacaoId: userOrgId })
		.returning({ id: sellers.id });

	const createdSellerId = createdSeller[0]?.id;
	if (!createdSellerId) throw new createHttpError.InternalServerError("Erro ao criar vendedor.");

	return {
		data: {
			createdId: createdSellerId,
		},
		message: "Vendedor criado com sucesso.",
	};
}

export type TCreateSellerOutput = Awaited<ReturnType<typeof createSeller>>;

const createSellerHandler: NextApiHandler<TCreateSellerOutput> = async (req, res) => {
	const sessionUser = await getCurrentSessionUncached(req.cookies);
	if (!sessionUser) throw new createHttpError.Unauthorized("Você não está autenticado.");

	const input = CreateSellerInputSchema.parse(req.body);
	const data = await createSeller({ input, user: sessionUser.user });
	return res.status(200).json(data);
};

export default apiHandler({ GET: getSellersHandler, PUT: updateSellerHandler, POST: createSellerHandler });
