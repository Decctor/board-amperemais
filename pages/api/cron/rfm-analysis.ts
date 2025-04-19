import type { NextApiRequest, NextApiResponse } from "next";
import type { TSale } from "@/schemas/sales";
import connectToDatabase from "@/services/mongodb/main-db-connection";
import dayjs from "dayjs";
import { type Collection, type Filter, ObjectId } from "mongodb";

import type { TClient } from "@/schemas/clients";
import { getRFMLabel, type TRFMConfig } from "@/utils/rfm";
import { db } from "@/services/drizzle";
import { clients, sales, type TSaleEntity } from "@/services/drizzle/schema";
import { and, eq, gte, lte, sql } from "drizzle-orm";

export const config = {
	maxDuration: 25,
};
const intervalStart = dayjs().subtract(12, "month").startOf("day").toDate();
const intervalEnd = dayjs().endOf("day").toDate();

export default async function handleRFMAnalysis(req: NextApiRequest, res: NextApiResponse) {
	const mongoDb = await connectToDatabase();
	// const clientsCollection: Collection<TClient> = db.collection("clients");
	// const salesCollection: Collection<TSale> = db.collection("sales");
	const utilsCollection: Collection<TRFMConfig> = mongoDb.collection("utils");

	const accumulatedResultsByClient = await db
		.select({
			clientId: clients.id,
			totalPurchases: sql<number>`sum(${sales.valorTotal})`,
			purchaseCount: sql<number>`count(${sales.id})`,
			lastPurchaseDate: sql<Date>`max(${sales.dataVenda})`,
		})
		.from(clients)
		.leftJoin(sales, and(eq(sales.clienteId, clients.id), gte(sales.dataVenda, intervalStart), lte(sales.dataVenda, intervalEnd)))
		.groupBy(clients.id);

	const allClients = await db.query.clients.findMany({
		with: {
			compras: {
				where: (field, { gte, lte, and, isNotNull }) => and(gte(field.dataVenda, intervalStart), lte(field.dataVenda, intervalEnd)),
				columns: {
					valorTotal: true,
					dataVenda: true,
				},
			},
		},
	});

	const rfmConfig = (await utilsCollection.findOne({
		identificador: "CONFIG_RFM",
	})) as TRFMConfig;

	return await db.transaction(async (tx) => {
		let currentClientIndex = 0;
		const clientListLength = allClients.length;
		for (const results of accumulatedResultsByClient) {
			console.log(`Processando o cliente ${currentClientIndex + 1}/${clientListLength}`);
			const calculatedRecency = dayjs().diff(dayjs(results.lastPurchaseDate), "days");
			const calculatedFrequency = results.purchaseCount;
			const calculatedMonetary = results.totalPurchases;

			const configRecency = Object.entries(rfmConfig.recencia).find(
				([key, value]) => calculatedRecency && calculatedRecency >= value.min && calculatedRecency <= value.max,
			);
			const configFrequency = Object.entries(rfmConfig.frequencia).find(
				([key, value]) => calculatedFrequency >= value.min && calculatedFrequency <= value.max,
			);
			const configMonetary = Object.entries(rfmConfig.monetario).find(
				([key, value]) => calculatedMonetary >= value.min && calculatedMonetary <= value.max,
			);

			const recencyScore = configRecency ? Number(configRecency[0]) : 1;
			const frequencyScore = configFrequency ? Number(configFrequency[0]) : 1;
			const monetaryScore = configMonetary ? Number(configMonetary[0]) : 1;

			// const calculatedFrequency = calculateFrequency(client.compras) || 0;

			// const recency = calculatedRecency === Number.POSITIVE_INFINITY ? null : calculatedRecency;
			// const frequency = calculatedFrequency || 0;
			// const monetary = calculateMonetaryValue(client.compras);

			// const configRecency = Object.entries(rfmConfig.recencia).find(([key, value]) => recency && recency >= value.min && recency <= value.max);
			// const recencyScore = configRecency ? Number(configRecency[0]) : 1;

			// const configFrequency = Object.entries(rfmConfig.frequencia).find(([key, value]) => frequency >= value.min && frequency <= value.max);
			// const frequencyScore = configFrequency ? Number(configFrequency[0]) : 1;

			const label = getRFMLabel(frequencyScore, recencyScore);

			await tx
				.update(clients)
				.set({
					analiseRFMTitulo: label,
					analiseRFMNotasFrequencia: frequencyScore.toString(),
					analiseRFMNotasRecencia: recencyScore.toString(),
					analiseRFMNotasMonetario: monetaryScore.toString(),
					analiseRFMUltimaAtualizacao: new Date(),
				})
				.where(eq(clients.id, results.clientId));
			currentClientIndex++;
		}
		return res.status(200).json("ANÁLISE RFM FEITA COM SUCESSO !");
	});
}

type TSimplifiedClientPurchase = {
	valorTotal: TSaleEntity["valorTotal"];
	dataVenda: TSaleEntity["dataVenda"];
};
const calculateRecency = (sales: TSimplifiedClientPurchase[]) => {
	const lastSale = sales
		.filter((s) => !!s.dataVenda)
		.sort((a, b) => {
			return new Date(b.dataVenda as Date).getTime() - new Date(a.dataVenda as Date).getTime();
		})[0];
	if (!lastSale) return { recency: null, lastSale: null };
	const lastSaleDate = new Date(lastSale.dataVenda as Date);

	const recency = dayjs().diff(dayjs(lastSaleDate), "days");
	return { recency, lastSale };
};
const calculateFrequency = (sales: TSimplifiedClientPurchase[]) => {
	return sales.length;
};
const calculateMonetaryValue = (sales: TSimplifiedClientPurchase[]) => {
	return sales.reduce((total, sale) => total + sale.valorTotal, 0);
};
