import { db } from "@/services/drizzle";
import {
	campaignSegmentations,
	campaigns,
	cashbackProgramBalances,
	cashbackProgramTransactions,
	cashbackPrograms,
	clients,
	goals,
	goalsSellers,
	interactions,
	products,
	saleItems,
	sales,
	sellers,
	users,
} from "@/services/drizzle/schema";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handleFix(req: NextApiRequest, res: NextApiResponse) {
	// Now, we will be defining a default organization for all entities

	const DEFAULT_ORGANIZATION_ID = "4a4e8578-63f0-4119-9695-a2cc068de8d6";

	// // Starting with sales and sales items
	// console.log("Updating sales and sales items with default organization ID...");
	// await db.update(sales).set({
	// 	organizacaoId: DEFAULT_ORGANIZATION_ID,
	// });
	// await db.update(saleItems).set({
	// 	organizacaoId: DEFAULT_ORGANIZATION_ID,
	// });

	// // Proceeding to clients
	// console.log("Updating clients with default organization ID...");
	// await db.update(clients).set({
	// 	organizacaoId: DEFAULT_ORGANIZATION_ID,
	// });

	// // Proceeding to sellers
	// console.log("Updating sellers with default organization ID...");
	// await db.update(sellers).set({
	// 	organizacaoId: DEFAULT_ORGANIZATION_ID,
	// });

	// // Proceeding to products
	// console.log("Updating products with default organization ID...");
	// await db.update(products).set({
	// 	organizacaoId: DEFAULT_ORGANIZATION_ID,
	// });

	// // Proceeding to cashback programs, balances and transactions
	// console.log("Updating cashback programs with default organization ID...");
	// await db.update(cashbackPrograms).set({
	// 	organizacaoId: DEFAULT_ORGANIZATION_ID,
	// });

	// console.log("Updating cashback program balances with default organization ID...");
	// await db.update(cashbackProgramBalances).set({
	// 	organizacaoId: DEFAULT_ORGANIZATION_ID,
	// });

	// console.log("Updating cashback program transactions with default organization ID...");
	// await db.update(cashbackProgramTransactions).set({
	// 	organizacaoId: DEFAULT_ORGANIZATION_ID,
	// });

	// // Proceeding to interactions
	// console.log("Updating interactions with default organization ID...");
	// await db.update(interactions).set({
	// 	organizacaoId: DEFAULT_ORGANIZATION_ID,
	// });

	// // Proceeding to goals
	// console.log("Updating goals with default organization ID...");
	// await db.update(goals).set({
	// 	organizacaoId: DEFAULT_ORGANIZATION_ID,
	// });

	// // Proceeding to goals sellers
	// console.log("Updating goals sellers with default organization ID...");
	// await db.update(goalsSellers).set({
	// 	organizacaoId: DEFAULT_ORGANIZATION_ID,
	// });

	// // Proceeding to campaigns
	// console.log("Updating campaigns with default organization ID...");
	// await db.update(campaigns).set({
	// 	organizacaoId: DEFAULT_ORGANIZATION_ID,
	// });

	// // Proceeding to campaign segmentations
	// console.log("Updating campaign segmentations with default organization ID...");
	// await db.update(campaignSegmentations).set({
	// 	organizacaoId: DEFAULT_ORGANIZATION_ID,
	// });

	await db.update(users).set({
		organizacaoId: DEFAULT_ORGANIZATION_ID,
	});
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
