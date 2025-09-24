import { apiHandler } from "@/lib/api";
import { getUserSession } from "@/lib/auth/session";
import { SellerSchema } from "@/schemas/sellers";
import type { TUserSession } from "@/schemas/users";
import { db } from "@/services/drizzle";
import { sales, sellers } from "@/services/drizzle/schema";
import { and, count, eq, gte, lte, sql, sum } from "drizzle-orm";
import createHttpError from "http-errors";
import type { NextApiHandler } from "next";
import { z } from "zod";

const GetSellersDefaultInputSchema = z.object({
	search: z
		.string({
			required_error: "Busca não informada.",
			invalid_type_error: "Tipo inválido para busca.",
		})
		.optional()
		.nullable(),
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
	session: TUserSession;
};
async function getSellers({ input, session }: GetSellersParams) {
	console.log("[INFO] [GET SELLERS] Input:", input);
	if ("id" in input) {
		console.log("[INFO] [GET SELLERS] Getting seller by id:", input.id);
		const seller = await db.query.sellers.findFirst({
			where: (fields, { eq }) => eq(fields.id, input.id),
		});
		if (!seller) throw new createHttpError.NotFound("Vendedor não encontrado.");

		return {
			data: {
				byId: seller,
				default: undefined,
			},
		};
	}

	const sellerQueryConditions = [];
	if (input.search)
		sellerQueryConditions.push(
			sql`(to_tsvector('portuguese', ${sellers.nome}) @@ plainto_tsquery('portuguese', ${input.search}) OR ${sellers.nome} ILIKE '%' || ${input.search} || '%')`,
		);

	const statsBySeller = await db
		.select({
			sellerId: sellers.id,
			sellerName: sellers.nome,
			totalSalesValue: sum(sales.valorTotal),
			totalSalesQty: count(sales.id),
		})
		.from(sellers)
		.leftJoin(sales, eq(sellers.id, sales.vendedorId))
		.where(
			and(
				input.statsPeriodAfter ? gte(sales.dataVenda, input.statsPeriodAfter) : undefined,
				input.statsPeriodBefore ? lte(sales.dataVenda, input.statsPeriodBefore) : undefined,
			),
		)
		.groupBy(sellers.id);

	const sellersResult = await db.query.sellers.findMany({
		where: and(...sellerQueryConditions),
	});

	const sellersWithStats = sellersResult
		.map((seller) => {
			const stats = statsBySeller.find((s) => s.sellerId === seller.id);
			return {
				...seller,
				estatisticas: {
					vendasValorTotal: stats?.totalSalesValue ? Number(stats.totalSalesValue) : 0,
					vendasQtdeTotal: stats?.totalSalesQty ? Number(stats.totalSalesQty) : 0,
				},
			};
		})
		.sort((a, b) => {
			if (input.orderByField === "nome") {
				if (input.orderByDirection === "asc") {
					return a.nome.localeCompare(b.nome);
				}
				return b.nome.localeCompare(a.nome);
			}
			if (input.orderByField === "dataInsercao") {
				if (input.orderByDirection === "asc") {
					return a.dataInsercao.getTime() - b.dataInsercao.getTime();
				}
				return b.dataInsercao.getTime() - a.dataInsercao.getTime();
			}
			if (input.orderByField === "vendasValorTotal") {
				if (input.orderByDirection === "asc") {
					return a.estatisticas.vendasValorTotal - b.estatisticas.vendasValorTotal;
				}
				return b.estatisticas.vendasValorTotal - a.estatisticas.vendasValorTotal;
			}
			if (input.orderByField === "vendasQtdeTotal") {
				if (input.orderByDirection === "asc") {
					return a.estatisticas.vendasQtdeTotal - b.estatisticas.vendasQtdeTotal;
				}
				return b.estatisticas.vendasQtdeTotal - a.estatisticas.vendasQtdeTotal;
			}
			return 0;
		});

	return {
		data: {
			default: sellersWithStats,
			byId: undefined,
		},
	};
}
export type TGetSellersOutput = Awaited<ReturnType<typeof getSellers>>;
export type TGetSellersOutputDefault = Exclude<TGetSellersOutput["data"]["default"], undefined>;
export type TGetSellersOutputById = Exclude<TGetSellersOutput["data"]["byId"], undefined>;
const getSellersHandler: NextApiHandler<TGetSellersOutput> = async (req, res) => {
	const session = await getUserSession({ request: req });

	console.log("[INFO] [GET SELLERS] Query params:", req.query);
	const input = GetSellersInputSchema.parse({
		id: req.query.id as string | undefined,
		search: req.query.search as string | undefined,
		statsPeriodAfter: req.query.statsPeriodAfter as string | undefined,
		statsPeriodBefore: req.query.statsPeriodBefore as string | undefined,
		orderByField: req.query.orderByField as string | undefined,
		orderByDirection: req.query.orderByDirection as string | undefined,
	});
	const data = await getSellers({ input, session });
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
	session: TUserSession;
};
async function updateSeller({ input, session }: UpdateSellerParams) {
	const seller = await db.update(sellers).set(input.seller).where(eq(sellers.id, input.sellerId));
	return {
		data: {
			updatedId: input.sellerId,
		},
		message: "Vendedor atualizado com sucesso.",
	};
}
export type TUpdateSellerOutput = Awaited<ReturnType<typeof updateSeller>>;

const updateSellerHandler: NextApiHandler<TUpdateSellerOutput> = async (req, res) => {
	const session = await getUserSession({ request: req });
	const input = UpdateSellerInputSchema.parse(req.body);
	const data = await updateSeller({ input, session });
	return res.status(200).json(data);
};

export default apiHandler({ GET: getSellersHandler, PUT: updateSellerHandler });
