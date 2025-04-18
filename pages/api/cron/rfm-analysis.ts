import type { NextApiRequest, NextApiResponse } from "next";
import type { TSale } from "@/schemas/sales";
import connectToDatabase from "@/services/mongodb/main-db-connection";
import dayjs from "dayjs";
import { type Collection, type Filter, ObjectId } from "mongodb";

import type { TClient } from "@/schemas/clients";
import { getRFMLabel, type TRFMConfig } from "@/utils/rfm";
import { db } from "@/services/drizzle";
import { clients, type TSaleEntity } from "@/services/drizzle/schema";
import { eq } from "drizzle-orm";

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
		for (const client of allClients) {
			console.log(`Processando o cliente ${currentClientIndex + 1}/${clientListLength}`);
			const { recency: calculatedRecency, lastSale } = calculateRecency(client.compras);
			const calculatedFrequency = calculateFrequency(client.compras) || 0;

			const recency = calculatedRecency === Number.POSITIVE_INFINITY ? null : calculatedRecency;
			const frequency = calculatedFrequency || 0;

			const configRecency = Object.entries(rfmConfig.recencia).find(([key, value]) => recency && recency >= value.min && recency <= value.max);
			const recencyScore = configRecency ? Number(configRecency[0]) : 1;

			const configFrequency = Object.entries(rfmConfig.frequencia).find(([key, value]) => frequency >= value.min && frequency <= value.max);
			const frequencyScore = configFrequency ? Number(configFrequency[0]) : 1;

			const monetary = calculateMonetaryValue(client.compras);

			const label = getRFMLabel(frequencyScore, recencyScore);

			await tx
				.update(clients)
				.set({
					analiseRFMTitulo: label,
					analiseRFMNotasFrequencia: frequencyScore.toString(),
					analiseRFMNotasRecencia: recencyScore.toString(),
					analiseRFMNotasMonetario: "0",
					analiseRFMUltimaAtualizacao: new Date(),
				})
				.where(eq(clients.id, client.id));
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
