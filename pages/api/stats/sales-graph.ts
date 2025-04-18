import { apiHandler } from "@/lib/api";
import { getDayStringsBetweenDates, getYearStringsBetweenDates } from "@/lib/dates";
import { SalesGraphFilterSchema, type TSalesGraphFilters } from "@/schemas/query-params-utils";

import { db } from "@/services/drizzle";
import { clients, sales } from "@/services/drizzle/schema";
import type { TIntervalGrouping } from "@/utils/graphs";
import dayjs from "dayjs";
import { and, gte, inArray, lte, notInArray } from "drizzle-orm";
import type { NextApiHandler } from "next";

export type TSaleGraph = {
	chave: string;
	qtde: number;
	total: number;
}[];

const getSalesGraphStatsRoute: NextApiHandler<{ data: TSaleGraph }> = async (req, res) => {
	const filters = SalesGraphFilterSchema.parse(req.body);

	const sales = await getSales({ filters });
	const stats = sales.reduce(
		(acc: { [key: string]: { qtde: number; total: number } }, current) => {
			const total = current.itens
				.filter((item) => (filters.productGroups.length > 0 ? filters.productGroups.includes(item.produto.grupo) : true))
				.reduce((acc, item) => acc + item.valorVendaTotalLiquido, 0);

			if (filters.group === "DIA") {
				const saleDay = dayjs(current.dataVenda).format("DD/MM");
				acc[saleDay].qtde += 1;
				acc[saleDay].total += total;
			}
			if (filters.group === "MÊS") {
				const saleMonth = dayjs(current.dataVenda).month() + 1;
				acc[`${saleMonth}`].qtde += 1;
				acc[`${saleMonth}`].total += total;
			}
			if (filters.group === "BIMESTRE") {
				const saleBimester = `${Math.ceil((dayjs(current.dataVenda).month() + 1) / 2)}º`;
				acc[saleBimester].qtde += 1;
				acc[saleBimester].total += total;
			}
			if (filters.group === "TRIMESTRE") {
				const saleTrimester = `${Math.ceil((dayjs(current.dataVenda).month() + 1) / 3)}º`;
				acc[saleTrimester].qtde += 1;
				acc[saleTrimester].total += total;
			}
			if (filters.group === "SEMESTRE") {
				const saleTrimester = `${Math.ceil((dayjs(current.dataVenda).month() + 1) / 6)}º`;
				acc[saleTrimester].qtde += 1;
				acc[saleTrimester].total += total;
			}
			if (filters.group === "ANO") {
				const saleYear = dayjs(current.dataVenda).year();
				acc[saleYear].qtde += 1;
				acc[saleYear].total += total;
			}
			return acc;
		},
		getInitialGroupReduce({
			initialDate: filters.period.after,
			endDate: filters.period.before,
			group: filters.group,
		}),
	);

	return res.status(200).json({
		data: Object.entries(stats).map(([key, value]) => ({
			chave: key,
			...value,
		})),
	});
};

export default apiHandler({ POST: getSalesGraphStatsRoute });

function getInitialGroupReduce({ initialDate, endDate, group }: { initialDate: string; endDate: string; group: TIntervalGrouping }): {
	[key: string]: { qtde: number; total: number };
} {
	if (group === "DIA") {
		const datesStrs = getDayStringsBetweenDates({ initialDate, endDate });
		return datesStrs.reduce((acc: { [key: string]: { qtde: number; total: number } }, current) => {
			acc[current] = { qtde: 0, total: 0 };
			return acc;
		}, {});
	}
	if (group === "MÊS") {
		return ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"].reduce(
			(acc: { [key: string]: { qtde: number; total: number } }, current) => {
				acc[current] = { qtde: 0, total: 0 };
				return acc;
			},
			{},
		);
	}
	if (group === "BIMESTRE") {
		return ["1º", "2º", "3º", "4º", "5º", "6º"].reduce((acc: { [key: string]: { qtde: number; total: number } }, current) => {
			acc[current] = { qtde: 0, total: 0 };
			return acc;
		}, {});
	}
	if (group === "TRIMESTRE") {
		return ["1º", "2º", "3º", "4º"].reduce((acc: { [key: string]: { qtde: number; total: number } }, current) => {
			acc[current] = { qtde: 0, total: 0 };
			return acc;
		}, {});
	}
	if (group === "SEMESTRE") {
		return ["1º", "2º"].reduce((acc: { [key: string]: { qtde: number; total: number } }, current) => {
			acc[current] = { qtde: 0, total: 0 };
			return acc;
		}, {});
	}
	if (group === "ANO") {
		const datesStrs = getYearStringsBetweenDates({ initialDate, endDate });

		return datesStrs.reduce((acc: { [key: string]: { qtde: number; total: number } }, current) => {
			acc[current] = { qtde: 0, total: 0 };
			return acc;
		}, {});
	}
	return {};
}

type GetSalesParams = {
	filters: TSalesGraphFilters;
};
async function getSales({ filters }: GetSalesParams) {
	const ajustedAfter = filters.period.after ? dayjs(filters.period.after).toDate() : null;
	const ajustedBefore = filters.period.before ? dayjs(filters.period.before).endOf("day").toDate() : null;
	try {
		const conditions = [];
		if (ajustedAfter) conditions.push(gte(sales.dataVenda, ajustedAfter));
		if (ajustedBefore) conditions.push(lte(sales.dataVenda, ajustedBefore));
		if (filters.total.min) conditions.push(gte(sales.valorTotal, filters.total.min));
		if (filters.total.max) conditions.push(gte(sales.valorTotal, filters.total.max));

		if (filters.saleNatures.length > 0) conditions.push(inArray(sales.natureza, filters.saleNatures));

		if (filters.sellers.length > 0) conditions.push(inArray(sales.vendedor, filters.sellers));

		if (filters.clientRFMTitles.length > 0)
			inArray(sales.clienteId, db.select({ id: clients.id }).from(clients).where(inArray(clients.analiseRFMTitulo, filters.clientRFMTitles)));

		// How to apply filter for product groups present in sale ???

		if (filters.excludedSalesIds) conditions.push(notInArray(sales.id, filters.excludedSalesIds));

		const salesResult = await db.query.sales.findMany({
			where: and(...conditions),
			columns: {
				dataVenda: true,
			},
			with: {
				cliente: {
					columns: {
						nome: true,
					},
				},
				itens: {
					columns: {
						quantidade: true,
						valorVendaTotalLiquido: true,
						valorCustoTotal: true,
					},
					with: {
						produto: {
							columns: {
								descricao: true,
								grupo: true,
							},
						},
					},
				},
			},
		});

		return salesResult;
	} catch (error) {
		console.log("Error getting sales", error);
		throw error;
	}
}
