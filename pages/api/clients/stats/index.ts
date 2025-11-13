import { apiHandler } from "@/lib/api";
import { getCurrentSessionUncached } from "@/lib/authentication/pages-session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import type { TUserSession } from "@/schemas/users";
import { db } from "@/services/drizzle";
import { clients, products, saleItems, sales, sellers } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { and, count, countDistinct, desc, eq, gte, isNotNull, lte, sql, sum } from "drizzle-orm";
import createHttpError from "http-errors";
import type { NextApiHandler } from "next";
import { z } from "zod";

const GetClientStatsInputSchema = z.object({
	clientId: z.string({
		required_error: "ID do cliente não informado.",
		invalid_type_error: "Tipo inválido para ID do cliente.",
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
export type TGetClientStatsInput = z.infer<typeof GetClientStatsInputSchema>;

type GetClientStatsParams = {
	user: TAuthUserSession["user"];
	input: TGetClientStatsInput;
};

async function getClientStats({ user, input }: GetClientStatsParams) {
	const client = await db.query.clients.findFirst({
		where: eq(clients.id, input.clientId),
	});
	if (!client) throw new createHttpError.NotFound("Cliente não encontrado.");

	const periodAfterDate = input.periodAfter ? new Date(input.periodAfter) : undefined;
	const periodBeforeDate = input.periodBefore ? new Date(input.periodBefore) : undefined;

	const saleWhereConditions = [eq(sales.clienteId, input.clientId), isNotNull(sales.dataVenda)] as const;
	const saleWhere = and(
		...saleWhereConditions,
		periodAfterDate ? gte(sales.dataVenda, periodAfterDate) : undefined,
		periodBeforeDate ? lte(sales.dataVenda, periodBeforeDate) : undefined,
	);

	const totalPuchasesResult = await db
		.select({ qtde: count(sales.id), total: sum(sales.valorTotal) })
		.from(sales)
		.where(saleWhere);
	const totalPurchaseResultStats = totalPuchasesResult[0];

	const totalPurchasesCount = totalPurchaseResultStats?.qtde ?? 0;
	const totalPurchasesValue = totalPurchaseResultStats?.total ? Number(totalPurchaseResultStats.total) : 0;
	const avgPurchaseValue = totalPurchasesCount > 0 ? totalPurchasesValue / totalPurchasesCount : 0;

	const firstPurchaseResult = await db.select({ data: sales.dataVenda }).from(sales).where(saleWhere).orderBy(sql`${sales.dataVenda} asc`).limit(1);
	const lastPurchaseResult = await db.select({ data: sales.dataVenda }).from(sales).where(saleWhere).orderBy(sql`${sales.dataVenda} desc`).limit(1);

	const firstPurchaseDate = firstPurchaseResult[0]?.data ?? null;
	const lastPurchaseDate = lastPurchaseResult[0]?.data ?? null;

	const periodDiffMap = {
		days: dayjs(lastPurchaseDate).diff(dayjs(firstPurchaseDate), "days"),
		weeks: dayjs(lastPurchaseDate).diff(dayjs(firstPurchaseDate), "weeks"),
		months: dayjs(lastPurchaseDate).diff(dayjs(firstPurchaseDate), "months"),
		years: dayjs(lastPurchaseDate).diff(dayjs(firstPurchaseDate), "years"),
	};

	const totalPurchasesValuePeriodGroupMap = {
		dia: periodDiffMap.days > 1 ? totalPurchasesValue / periodDiffMap.days : undefined,
		semana: periodDiffMap.weeks > 1 ? totalPurchasesValue / periodDiffMap.weeks : undefined,
		mes: periodDiffMap.months > 1 ? totalPurchasesValue / periodDiffMap.months : undefined,
		ano: periodDiffMap.years > 1 ? totalPurchasesValue / periodDiffMap.years : undefined,
	};

	const byProductGroupRaw = await db
		.select({ grupo: products.grupo, total: sum(saleItems.valorVendaTotalLiquido), sales: countDistinct(saleItems.vendaId) })
		.from(saleItems)
		.innerJoin(sales, eq(saleItems.vendaId, sales.id))
		.leftJoin(products, eq(saleItems.produtoId, products.id))
		.where(saleWhere)
		.groupBy(products.grupo)
		.orderBy(desc(sql`sum(${saleItems.valorVendaTotalLiquido})`))
		.limit(10);

	const bySellerTop10Raw = await db
		.select({
			vendedorId: sales.vendedorId,
			vendedorNome: sellers.nome,
			qtde: count(sales.id),
			total: sum(sales.valorTotal),
		})
		.from(sales)
		.leftJoin(sellers, eq(sales.vendedorId, sellers.id))
		.where(saleWhere)
		.groupBy(sales.vendedorId, sellers.nome)
		.orderBy(desc(sql`sum(${sales.valorTotal})`))
		.limit(10);

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

	const dayExpr = sql<number>`extract(day from ${sales.dataVenda})`;
	const byDayOfMonthRaw = await db
		.select({ dia: dayExpr, qtde: count(sales.id), total: sum(sales.valorTotal) })
		.from(sales)
		.where(saleWhere)
		.groupBy(dayExpr)
		.orderBy(dayExpr);

	const monthExpr = sql<number>`extract(month from ${sales.dataVenda})`;
	const byMonthRaw = await db
		.select({ mes: monthExpr, qtde: count(sales.id), total: sum(sales.valorTotal) })
		.from(sales)
		.where(saleWhere)
		.groupBy(monthExpr)
		.orderBy(monthExpr);

	const weekDayExpr = sql<number>`extract(dow from ${sales.dataVenda})`;
	const byWeekDayRaw = await db
		.select({ semana: weekDayExpr, qtde: count(sales.id), total: sum(sales.valorTotal) })
		.from(sales)
		.where(saleWhere)
		.groupBy(weekDayExpr)
		.orderBy(weekDayExpr);

	return {
		data: {
			cliente: {
				nome: client.nome,
				telefone: client.telefone,
				email: client.email,
			},
			dataPrimeiraCompra: firstPurchaseDate,
			dataUltimaCompra: lastPurchaseDate,

			valorComproTotal: totalPurchasesValue,
			valorComproGrupoPeriodo: totalPurchasesValuePeriodGroupMap,
			qtdeCompras: totalPurchasesCount,
			ticketMedio: avgPurchaseValue,
			resultadosAgrupados: {
				grupo: byProductGroupRaw.map((row) => ({
					grupo: row.grupo ?? null,
					quantidade: row.sales ? Number(row.sales) : 0,
					total: row.total ? Number(row.total) : 0,
				})),
				vendedor: bySellerTop10Raw.map((row) => ({
					vendedorId: row.vendedorId,
					vendedorNome: row.vendedorNome ?? null,
					quantidade: Number(row.qtde ?? 0),
					total: row.total ? Number(row.total) : 0,
				})),
				produto: byProductTop10Raw.map((row) => ({
					produtoId: row.produtoId,
					produtoDescricao: row.produtoDescricao ?? "",
					produtoGrupo: row.produtoGrupo ?? null,
					quantidade: row.qtde ? Number(row.qtde) : 0,
					total: row.total ? Number(row.total) : 0,
				})),
				dia: byDayOfMonthRaw.map((row) => ({
					dia: Number(row.dia),
					quantidade: Number(row.qtde ?? 0),
					total: row.total ? Number(row.total) : 0,
				})),
				mes: byMonthRaw.map((row) => ({
					mes: Number(row.mes),
					quantidade: Number(row.qtde ?? 0),
					total: row.total ? Number(row.total) : 0,
				})),
				diaSemana: byWeekDayRaw.map((row) => ({
					diaSemana: Number(row.semana),
					quantidade: Number(row.qtde ?? 0),
					total: row.total ? Number(row.total) : 0,
				})),
			},
		},
	};
}
export type TGetClientStatsOutput = Awaited<ReturnType<typeof getClientStats>>;

const getClientStatsHandler: NextApiHandler<TGetClientStatsOutput> = async (req, res) => {
	const sessionUser = await getCurrentSessionUncached(req.cookies);
	if (!sessionUser) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const input = GetClientStatsInputSchema.parse({
		clientId: req.query.clientId as string,
		periodAfter: (req.query.periodAfter as string | undefined) ?? null,
		periodBefore: (req.query.periodBefore as string | undefined) ?? null,
	});
	const data = await getClientStats({ user: sessionUser.user, input });
	return res.status(200).json(data);
};

export default apiHandler({ GET: getClientStatsHandler });
