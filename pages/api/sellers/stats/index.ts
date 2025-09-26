import { apiHandler } from "@/lib/api";
import { getUserSession } from "@/lib/auth/session";
import type { TUserSession } from "@/schemas/users";
import { db } from "@/services/drizzle";
import { clients, products, saleItems, sales, sellers } from "@/services/drizzle/schema";
import { and, count, desc, eq, gte, isNotNull, lte, sql, sum } from "drizzle-orm";
import createHttpError from "http-errors";
import type { NextApiHandler } from "next";
import { z } from "zod";

const GetSellerStatsInputSchema = z.object({
	sellerId: z.string({
		required_error: "ID do vendedor não informado.",
		invalid_type_error: "Tipo inválido para ID do vendedor.",
	}),
	periodAfter: z
		.string({
			required_error: "Período não informado.",
			invalid_type_error: "Tipo inválido para período.",
		})
		.optional()
		.nullable(),
	periodBefore: z
		.string({
			required_error: "Período não informado.",
			invalid_type_error: "Tipo inválido para período.",
		})
		.optional()
		.nullable(),
});
export type TGetSellerStatsInput = z.infer<typeof GetSellerStatsInputSchema>;
// Avaliação de Performance

// - Quantitativa
// 1. Valor total vendido
// 2. Quantidade de vendas
// 3. Ticket médio
// 4. Valor vendido por categoria de produto

// - Qualitativa
// 1. Quantidade e valor de vendas agrupado por cliente (top 10)
// 2. Quantidade e valor de vendas agrupado por produto (top 10)
// 3. Quantidade e valor de vendas agrupado por dia (1,2,3,4 etc)
// 4. Quantidade e valor de vendas agrupado por mês

type GetSellerStatsParams = {
	session: TUserSession;
	input: TGetSellerStatsInput;
};

async function getSellerStats({ session, input }: GetSellerStatsParams) {
	const seller = await db.query.sellers.findFirst({
		where: eq(sellers.id, input.sellerId),
	});
	if (!seller) throw new createHttpError.NotFound("Vendedor não encontrado.");

	const periodAfterDate = input.periodAfter ? new Date(input.periodAfter) : undefined;
	const periodBeforeDate = input.periodBefore ? new Date(input.periodBefore) : undefined;

	const saleWhereConditions = [eq(sales.vendedorId, input.sellerId), isNotNull(sales.dataVenda)] as const;
	const saleWhere = and(
		...saleWhereConditions,
		periodAfterDate ? gte(sales.dataVenda, periodAfterDate) : undefined,
		periodBeforeDate ? lte(sales.dataVenda, periodBeforeDate) : undefined,
	);

	// Quantitative: total sold, sales count
	const totalStatsResult = await db
		.select({ qtde: count(sales.id), total: sum(sales.valorTotal) })
		.from(sales)
		.where(saleWhere);
	const totalStats = totalStatsResult[0];
	const salesCount = Number(totalStats?.qtde ?? 0);
	const totalSalesValue = totalStats?.total ? Number(totalStats.total) : 0;
	const avgTicket = salesCount > 0 ? totalSalesValue / salesCount : 0;

	// First and last sale dates
	const firstSaleResult = await db.select({ data: sales.dataVenda }).from(sales).where(saleWhere).orderBy(sql`${sales.dataVenda} asc`).limit(1);
	const lastSaleResult = await db.select({ data: sales.dataVenda }).from(sales).where(saleWhere).orderBy(sql`${sales.dataVenda} desc`).limit(1);

	const firstSaleDate = firstSaleResult[0]?.data ?? null;
	const lastSaleDate = lastSaleResult[0]?.data ?? null;

	// Quantitative: value sold by product category
	const valueByProductCategory = await db
		.select({ categoria: products.grupo, total: sum(saleItems.valorVendaTotalLiquido) })
		.from(saleItems)
		.innerJoin(sales, eq(saleItems.vendaId, sales.id))
		.leftJoin(products, eq(saleItems.produtoId, products.id))
		.where(saleWhere)
		.groupBy(products.grupo)
		.orderBy(desc(sql`sum(${saleItems.valorVendaTotalLiquido})`));

	// Qualitative: top clients (top 10)
	const byClientTop10Raw = await db
		.select({
			clienteId: sales.clienteId,
			clienteNome: clients.nome,
			qtde: count(sales.id),
			total: sum(sales.valorTotal),
		})
		.from(sales)
		.leftJoin(clients, eq(sales.clienteId, clients.id))
		.where(saleWhere)
		.groupBy(sales.clienteId, clients.nome)
		.orderBy(desc(sql`sum(${sales.valorTotal})`))
		.limit(10);

	// Qualitative: top products (top 10)
	const byProductTop10Raw = await db
		.select({
			produtoId: saleItems.produtoId,
			produtoDescricao: products.descricao,
			produtoGrupo: products.grupo,
			qtde: sum(saleItems.quantidade),
			total: sum(saleItems.valorVendaTotalLiquido),
		})
		.from(saleItems)
		.innerJoin(sales, eq(saleItems.vendaId, sales.id))
		.leftJoin(products, eq(saleItems.produtoId, products.id))
		.where(saleWhere)
		.groupBy(saleItems.produtoId, products.descricao, products.grupo)
		.orderBy(desc(sql`sum(${saleItems.valorVendaTotalLiquido})`))
		.limit(10);

	// Qualitative: grouped by day of month
	const dayExpr = sql<number>`extract(day from ${sales.dataVenda})`;
	const byDayOfMonthRaw = await db
		.select({ dia: dayExpr, qtde: count(sales.id), total: sum(sales.valorTotal) })
		.from(sales)
		.where(saleWhere)
		.groupBy(dayExpr)
		.orderBy(dayExpr);

	// Qualitative: grouped by month
	const monthExpr = sql<number>`extract(month from ${sales.dataVenda})`;
	const byMonthRaw = await db
		.select({ mes: monthExpr, qtde: count(sales.id), total: sum(sales.valorTotal) })
		.from(sales)
		.where(saleWhere)
		.groupBy(monthExpr)
		.orderBy(monthExpr);

	return {
		data: {
			seller: {
				name: seller.nome,
				phone: seller.telefone,
				email: seller.email,
				identifier: seller.identificador,
				avatarUrl: seller.avatarUrl,
			},
			firstSaleDate,
			lastSaleDate,
			quantitative: {
				totalSalesValue,
				salesCount,
				avgTicket,
				valueByProductCategory: valueByProductCategory.map((row) => ({
					category: row.categoria ?? null,
					total: row.total ? Number(row.total) : 0,
				})),
				firstSaleDate,
				lastSaleDate,
			},
			qualitative: {
				byClientTop10: byClientTop10Raw.map((row) => ({
					clientId: row.clienteId,
					clientName: row.clienteNome ?? null,
					quantity: Number(row.qtde ?? 0),
					total: row.total ? Number(row.total) : 0,
				})),
				byProductTop10: byProductTop10Raw.map((row) => ({
					productId: row.produtoId,
					productDescription: row.produtoDescricao ?? "",
					productGroup: row.produtoGrupo ?? null,
					quantity: row.qtde ? Number(row.qtde) : 0,
					total: row.total ? Number(row.total) : 0,
				})),
				byDayOfMonth: byDayOfMonthRaw.map((row) => ({
					day: Number(row.dia),
					quantity: Number(row.qtde ?? 0),
					total: row.total ? Number(row.total) : 0,
				})),
				byMonth: byMonthRaw.map((row) => ({
					month: Number(row.mes),
					quantity: Number(row.qtde ?? 0),
					total: row.total ? Number(row.total) : 0,
				})),
			},
		},
	};
}
export type TGetSellerStatsOutput = Awaited<ReturnType<typeof getSellerStats>>;
const getSellerStatsHandler: NextApiHandler<TGetSellerStatsOutput> = async (req, res) => {
	const session = await getUserSession({ request: req });
	const input = GetSellerStatsInputSchema.parse({
		sellerId: req.query.sellerId as string,
		periodAfter: (req.query.periodAfter as string | undefined) ?? null,
		periodBefore: (req.query.periodBefore as string | undefined) ?? null,
	});
	const data = await getSellerStats({ session, input });
	return res.status(200).json(data);
};

export default apiHandler({ GET: getSellerStatsHandler });
