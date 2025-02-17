import type { NextApiRequest, NextApiResponse } from "next";
import type { TSale } from "@/schemas/sales";
import connectToDatabase from "@/services/mongodb/main-db-connection";
import dayjs from "dayjs";
import { type Collection, type Filter, ObjectId } from "mongodb";

import type { TClient } from "@/schemas/clients";
import { getRFMLabel, type TRFMConfig } from "@/utils/rfm";

export const config = {
	maxDuration: 25,
};
const intervalStart = dayjs()
	.subtract(12, "month")
	.startOf("day")
	.toISOString();
const intervalEnd = dayjs().endOf("day").toISOString();

export default async function handleRFMAnalysis(
	req: NextApiRequest,
	res: NextApiResponse,
) {
	const db = await connectToDatabase();
	const clientsCollection: Collection<TClient> = db.collection("clients");
	const salesCollection: Collection<TSale> = db.collection("sales");
	const utilsCollection: Collection<TRFMConfig> = db.collection("utils");

	const allClients = await clientsCollection.find({}).toArray();

	const match: Filter<TSale> = {
		$and: [
			{ dataVenda: { $gte: intervalStart } },
			{ dataVenda: { $lte: intervalEnd } },
		],
	};

	const project = { _id: 1, idCliente: 1, valor: 1, dataVenda: 1 };
	const sales = (await salesCollection
		.aggregate([{ $match: match }, { $project: project }])
		.toArray()) as TSaleResult[];

	const rfmConfig = (await utilsCollection.findOne({
		identificador: "CONFIG_RFM",
	})) as TRFMConfig;

	const bulkWriteArr = allClients.map((client) => {
		const { recency: calculatedRecency, lastSale } = calculateRecency(
			client._id.toString(),
			sales,
		);
		const calculatedFrequency =
			calculateFrequency(client._id.toString(), sales) || 0;

		const recency =
			calculatedRecency === Number.POSITIVE_INFINITY ? null : calculatedRecency;
		const frequency = calculatedFrequency || 0;

		const configRecency = Object.entries(rfmConfig.recencia).find(
			([key, value]) => recency && recency >= value.min && recency <= value.max,
		);
		const recencyScore = configRecency ? Number(configRecency[0]) : 1;

		const configFrequency = Object.entries(rfmConfig.frequencia).find(
			([key, value]) => frequency >= value.min && frequency <= value.max,
		);
		const frequencyScore = configFrequency ? Number(configFrequency[0]) : 1;

		const monetary = calculateMonetaryValue(client._id.toString(), sales);

		const label = getRFMLabel(frequencyScore, recencyScore);

		return {
			updateOne: {
				filter: { _id: new ObjectId(client._id) },
				update: {
					$set: {
						idUltimaCompra: lastSale?._id.toString(),
						dataUltimaCompra: lastSale?.dataVenda,
						analiseRFM: {
							notas: { recencia: recencyScore, frequencia: frequencyScore },
							titulo: label,
							ultimaAtualizacao: new Date().toISOString(),
						},
						analisePeriodo: {
							recencia: recency || 0,
							frequencia: frequency,
							valor: monetary,
						},
					},
				},
			},
		};
	});
	const bulkWriteResponse = await clientsCollection.bulkWrite(bulkWriteArr);
	console.log(bulkWriteResponse);
	return res.status(200).json("EXECUTADO COM SUCESSO!");
}

type TSaleResult = {
	_id: ObjectId;
	valor: TSale["valor"];
	dataVenda: TSale["dataVenda"];
	idCliente: TSale["idCliente"];
};
const calculateRecency = (clientId: string, sales: TSaleResult[]) => {
	const clientSales = sales.filter((sale) => sale.idCliente === clientId);
	const lastSale = clientSales.sort((a, b) => {
		return new Date(b.dataVenda).getTime() - new Date(a.dataVenda).getTime();
	})[0];
	if (!lastSale) return { recency: null, lastSale: null };
	const lastSaleDate = new Date(lastSale.dataVenda);

	const recency = dayjs().diff(dayjs(lastSaleDate), "days");
	return { recency, lastSale };
};
const calculateFrequency = (clientId: string, sales: TSaleResult[]) => {
	return sales.filter((sale) => sale.idCliente === clientId).length;
};
const calculateMonetaryValue = (clientId: string, sales: TSaleResult[]) => {
	return sales
		.filter((sale) => sale.idCliente === clientId)
		.reduce((total, sale) => total + sale.valor, 0);
};
