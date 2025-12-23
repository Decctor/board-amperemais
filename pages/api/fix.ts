import { db } from "@/services/drizzle";
import { cashbackProgramBalances, cashbackProgramTransactions, clients, sales } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { and, eq, gte, lte, min, sum } from "drizzle-orm";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handleFix(req: NextApiRequest, res: NextApiResponse) {
	// const periodStart = dayjs().startOf("month").toDate();

	// const cashbackProgramResult = await db.query.cashbackPrograms.findFirst({});
	// if (!cashbackProgramResult) {
	// 	return res.status(404).json({
	// 		message: "Cashback program not found",
	// 	});
	// }

	// const cashbackProgramBalancesResult = await db.query.cashbackProgramBalances.findMany({
	// 	where: and(gte(cashbackProgramBalances.dataInsercao, periodStart)),
	// 	orderBy: (fields, { asc }) => asc(fields.dataInsercao),
	// });
	// const salesResult = await db.query.sales.findMany({
	// 	where: and(gte(sales.dataVenda, periodStart), eq(sales.natureza, "SN01")),
	// 	orderBy: (fields, { asc }) => asc(fields.dataVenda),
	// 	columns: {
	// 		id: true,
	// 		clienteId: true,
	// 		dataVenda: true,
	// 		valorTotal: true,
	// 	},
	// });

	// const cashbackProgramBalancesMap = new Map(
	// 	cashbackProgramBalancesResult.map((balance) => [
	// 		balance.clienteId,
	// 		{
	// 			overallAvailableBalance: balance.saldoValorDisponivel,
	// 			overallAccumulatedBalance: balance.saldoValorAcumuladoTotal,
	// 		},
	// 	]),
	// );

	// await db.transaction(async (tx) => {
	// 	for (const [index, sale] of salesResult.entries()) {
	// 		console.log(`Processing sale ${index + 1} of ${salesResult.length}`, {
	// 			saleId: sale.id,
	// 			saleDate: sale.dataVenda,
	// 			clientId: sale.clienteId,
	// 		});
	// 		const balance = cashbackProgramBalancesMap.get(sale.clienteId);
	// 		if (!balance) {
	// 			continue;
	// 		}
	// 		const previousOverallAvailableBalance = balance?.overallAvailableBalance ?? 0;
	// 		const previousOverallAccumulatedBalance = balance?.overallAccumulatedBalance ?? 0;

	// 		// calculating accumulated balance
	// 		let accumulatedBalance = 0;
	// 		if (cashbackProgramResult.acumuloTipo === "FIXO") {
	// 			if (sale.valorTotal >= cashbackProgramResult.acumuloRegraValorMinimo) {
	// 				accumulatedBalance = cashbackProgramResult.acumuloValor;
	// 			}
	// 		} else if (cashbackProgramResult.acumuloTipo === "PERCENTUAL") {
	// 			if (sale.valorTotal >= cashbackProgramResult.acumuloRegraValorMinimo) {
	// 				accumulatedBalance = (sale.valorTotal * cashbackProgramResult.acumuloValor) / 100;
	// 			}
	// 		}

	// 		const newOverallAvailableBalance = previousOverallAvailableBalance + accumulatedBalance;
	// 		const newOverallAccumulatedBalance = previousOverallAccumulatedBalance + accumulatedBalance;

	// 		await tx
	// 			.update(cashbackProgramBalances)
	// 			.set({
	// 				saldoValorDisponivel: newOverallAvailableBalance,
	// 				saldoValorAcumuladoTotal: newOverallAccumulatedBalance,
	// 			})
	// 			.where(eq(cashbackProgramBalances.clienteId, sale.clienteId));

	// 		await tx.insert(cashbackProgramTransactions).values({
	// 			clienteId: sale.clienteId,
	// 			vendaId: sale.id,
	// 			programaId: cashbackProgramResult.id,
	// 			tipo: "ACÚMULO",
	// 			valor: accumulatedBalance,
	// 			valorRestante: accumulatedBalance,
	// 			saldoValorAnterior: previousOverallAvailableBalance,
	// 			saldoValorPosterior: newOverallAvailableBalance,
	// 			dataInsercao: sale.dataVenda ?? new Date(),
	// 			status: "ATIVO",
	// 			expiracaoData: dayjs().add(cashbackProgramResult.expiracaoRegraValidadeValor, "day").toDate(),
	// 		});
	// 	}
	// });

	return res.status(200).json({
		message: "Fix completed",
	});
}
