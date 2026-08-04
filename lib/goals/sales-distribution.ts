import { inOperationTimezone, localDayKey } from "@/lib/operation-timezone";
import { db } from "@/services/drizzle";
import { clients, sales } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { and, count, eq, gte, isNotNull, lte, sql, sum } from "drizzle-orm";
import type { TGoalDailyAchievement } from "./pacing";

/**
 * Leituras de banco que alimentam a curva de ritmo das metas.
 *
 * Todas as agregações por dia passam pelo fuso da operação. Uma venda das 21h em São Paulo é 00h
 * do dia seguinte em UTC, e é assim que a coluna está gravada — agregar cru joga o movimento do
 * fim da tarde para o dia errado. Num fechamento mensal isso se dilui; numa meta **diária** é erro
 * direto no número da tela, e contamina os pesos por dia da semana que derivam daqui.
 */

/** Janela de histórico que alimenta os pesos por dia da semana. */
export const GOALS_WEEKDAY_LOOKBACK_DAYS = 90;

/** Natureza de venda que conta para meta. Espelha o filtro já usado nas rotas de meta. */
const SALE_NATURE_FOR_GOALS = "SN01";

export type TGoalWeekdayWeights = {
	/** Participação de cada dia da semana no faturamento, índice 0 = domingo. Soma 1. */
	pesosPorDiaSemana: number[] | null;
	/** Tamanho da amostra. Governa o quanto a curva confia no histórico. */
	totalVendas: number;
};

/**
 * Participação de cada dia da semana no faturamento recente da organização.
 *
 * Pondera por **valor**, não por quantidade de vendas: a meta principal é de valor, e um sábado
 * com poucas vendas grandes pesa mais na meta do que um sábado com muitas vendas pequenas.
 */
export async function getWeekdayRevenueWeights({ organizacaoId, referencia }: { organizacaoId: string; referencia: Date }): Promise<TGoalWeekdayWeights> {
	const lookbackStart = dayjs(referencia).subtract(GOALS_WEEKDAY_LOOKBACK_DAYS, "day").startOf("day").toDate();

	const rows = await db
		.select({
			diaSemana: sql<number>`EXTRACT(DOW FROM ${inOperationTimezone(sales.dataVenda)})`,
			total: sum(sales.valorTotal),
			qtde: count(sales.id),
		})
		.from(sales)
		.where(
			and(
				eq(sales.organizacaoId, organizacaoId),
				isNotNull(sales.dataVenda),
				eq(sales.natureza, SALE_NATURE_FOR_GOALS),
				gte(sales.dataVenda, lookbackStart),
				lte(sales.dataVenda, referencia),
			),
		)
		.groupBy(sql`EXTRACT(DOW FROM ${inOperationTimezone(sales.dataVenda)})`);

	if (rows.length === 0) return { pesosPorDiaSemana: null, totalVendas: 0 };

	const pesos = Array.from({ length: 7 }, () => 0);
	let totalVendas = 0;
	for (const row of rows) {
		const index = Number(row.diaSemana);
		if (!Number.isInteger(index) || index < 0 || index > 6) continue;
		pesos[index] = Number(row.total ?? 0);
		totalVendas += Number(row.qtde ?? 0);
	}

	const soma = pesos.reduce((acc, peso) => acc + peso, 0);
	if (soma <= 0) return { pesosPorDiaSemana: null, totalVendas };

	return { pesosPorDiaSemana: pesos.map((peso) => peso / soma), totalVendas };
}

export type TGoalDailyAchievementRow = { dia: string } & TGoalDailyAchievement;

/**
 * Realizado dia a dia dentro do período da meta.
 *
 * Vendas e novos clientes são duas coortes diferentes — a segunda vem de `primeiraCompraData` —
 * então são duas queries costuradas por chave de dia, e não um join que multiplicaria linhas.
 */
export async function getGoalDailyAchievement({
	organizacaoId,
	dataInicio,
	dataFim,
	vendedorId,
}: {
	organizacaoId: string;
	dataInicio: Date;
	dataFim: Date;
	vendedorId?: string;
}): Promise<TGoalDailyAchievementRow[]> {
	const saleConditions = [
		eq(sales.organizacaoId, organizacaoId),
		isNotNull(sales.dataVenda),
		eq(sales.natureza, SALE_NATURE_FOR_GOALS),
		gte(sales.dataVenda, dataInicio),
		lte(sales.dataVenda, dataFim),
	];
	if (vendedorId) saleConditions.push(eq(sales.vendedorId, vendedorId));

	const [salesRows, clientsRows] = await Promise.all([
		db
			.select({ dia: localDayKey(sales.dataVenda), valor: sum(sales.valorTotal), qtde: count(sales.id) })
			.from(sales)
			.where(and(...saleConditions))
			.groupBy(localDayKey(sales.dataVenda)),
		// Novos clientes são da organização, não de um vendedor: a primeira compra não carrega
		// vendedor, então filtrar por vendedor aqui devolveria sempre zero.
		vendedorId
			? Promise.resolve([])
			: db
					.select({ dia: localDayKey(clients.primeiraCompraData), qtde: count(clients.id) })
					.from(clients)
					.where(
						and(
							eq(clients.organizacaoId, organizacaoId),
							isNotNull(clients.primeiraCompraData),
							gte(clients.primeiraCompraData, dataInicio),
							lte(clients.primeiraCompraData, dataFim),
						),
					)
					.groupBy(localDayKey(clients.primeiraCompraData)),
	]);

	const byDay = new Map<string, TGoalDailyAchievementRow>();
	for (const row of salesRows) {
		byDay.set(row.dia, { dia: row.dia, valor: Number(row.valor ?? 0), qtdeVendas: Number(row.qtde ?? 0), novosClientes: 0 });
	}
	for (const row of clientsRows) {
		const current = byDay.get(row.dia) ?? { dia: row.dia, valor: 0, qtdeVendas: 0, novosClientes: 0 };
		byDay.set(row.dia, { ...current, novosClientes: Number(row.qtde ?? 0) });
	}

	return [...byDay.values()];
}

/** Realizado diário de cada vendedor da meta, numa query só. */
export async function getGoalDailyAchievementBySeller({
	organizacaoId,
	dataInicio,
	dataFim,
}: {
	organizacaoId: string;
	dataInicio: Date;
	dataFim: Date;
}): Promise<Map<string, TGoalDailyAchievementRow[]>> {
	const rows = await db
		.select({
			vendedorId: sales.vendedorId,
			dia: localDayKey(sales.dataVenda),
			valor: sum(sales.valorTotal),
			qtde: count(sales.id),
		})
		.from(sales)
		.where(
			and(
				eq(sales.organizacaoId, organizacaoId),
				isNotNull(sales.dataVenda),
				isNotNull(sales.vendedorId),
				eq(sales.natureza, SALE_NATURE_FOR_GOALS),
				gte(sales.dataVenda, dataInicio),
				lte(sales.dataVenda, dataFim),
			),
		)
		.groupBy(sales.vendedorId, localDayKey(sales.dataVenda));

	const bySeller = new Map<string, TGoalDailyAchievementRow[]>();
	for (const row of rows) {
		if (!row.vendedorId) continue;
		const current = bySeller.get(row.vendedorId) ?? [];
		current.push({ dia: row.dia, valor: Number(row.valor ?? 0), qtdeVendas: Number(row.qtde ?? 0), novosClientes: 0 });
		bySeller.set(row.vendedorId, current);
	}

	return bySeller;
}
