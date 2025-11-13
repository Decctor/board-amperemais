import { apiHandler } from "@/lib/api";
import { getCurrentSessionUncached } from "@/lib/authentication/pages-session";
import type { TClient } from "@/schemas/clients";
import { SalesRFMFiltersSchema, type TSalesGraphFilters } from "@/schemas/query-params-utils";
import type { TSale } from "@/schemas/sales";
import connectToDatabase from "@/services/mongodb/main-db-connection";
import type { TRFMConfig } from "@/utils/rfm";
import dayjs from "dayjs";
import createHttpError from "http-errors";
import { type Collection, Filter, type WithId } from "mongodb";
import type { NextApiHandler } from "next";

export type TRFMResult = {
	clientName: string;
	clientId: string;
	recency: number;
	frequency: number;
	monetary: number;
	rfmScore: {
		recency: number;
		frequency: number;
	};
	rfmLabel: string;
}[];
const intervalStart = dayjs().subtract(12, "month").startOf("day").toISOString();
const intervalEnd = dayjs().endOf("day").toISOString();

const getSalesRFM: NextApiHandler<{ data: TRFMResult }> = async (req, res) => {
	const sessionUser = await getCurrentSessionUncached(req.cookies);
	if (!sessionUser) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const { period, total, saleNatures, sellers } = SalesRFMFiltersSchema.parse(req.body);

	// Validating view permission

	const db = await connectToDatabase();
	const clientsCollection: Collection<TClient> = db.collection("clients");

	const allClients = await clientsCollection.find({}).toArray();

	const rfmResult: TRFMResult = allClients.map((client) => {
		return {
			clientName: client.nome,
			clientId: client._id.toString(),
			recency: client.analisePeriodo.recencia,
			frequency: client.analisePeriodo.frequencia,
			monetary: client.analisePeriodo.valor,
			rfmScore: { recency: client.analiseRFM.notas.recencia, frequency: client.analiseRFM.notas.frequencia },
			rfmLabel: client.analiseRFM.titulo,
		};
	});
	return res.status(200).json({ data: rfmResult });
};

export default apiHandler({ POST: getSalesRFM });
type GetSalesParams = {
	collection: Collection<TSale>;
	after: string;
	before: string;
	total: TSalesGraphFilters["total"];
	saleNatures: TSalesGraphFilters["saleNatures"];
	sellers: TSalesGraphFilters["sellers"];
};

type TSaleResult = {
	valor: TSale["valor"];
	dataVenda: TSale["dataVenda"];
	idCliente: TSale["idCliente"];
};

const calculateRecency = (clientId: string, sales: TSaleResult[]) => {
	const clientSales = sales.filter((sale) => sale.idCliente === clientId);
	const lastSale = clientSales.sort((a, b) => {
		return new Date(b.dataVenda).getTime() - new Date(a.dataVenda).getTime();
	})[0];
	if (!lastSale) return 999999;
	const lastSaleDate = new Date(lastSale.dataVenda);

	const recency = dayjs().diff(dayjs(lastSaleDate), "days");
	return recency;
};
const calculateFrequency = (clientId: string, sales: TSaleResult[]) => {
	return sales.filter((sale) => sale.idCliente === clientId).length;
};
const calculateMonetaryValue = (clientId: string, sales: TSaleResult[]) => {
	return sales.filter((sale) => sale.idCliente === clientId).reduce((total, sale) => total + sale.valor, 0);
};

// Função para normalizar os scores de Recência, Frequência e Monetário em uma escala de 1 a 5
const normalizeRFM = (value: number, min: number, max: number, isRecency = false) => {
	// Para recência, queremos que o menor valor tenha o maior score, por isso invertemos a escala
	if (isRecency) {
		return Math.ceil(((max - value) / (max - min)) * 4 + 1);
	}
	// Para frequência e monetário, queremos que o maior valor tenha o maior score
	return Math.ceil(((value - min) / (max - min)) * 4 + 1);
};

const calculateRFMScore = (
	clientsRFM: {
		clientName: string;
		clientId: string;
		recency: number;
		frequency: number;
		monetary: number;
		rfmScore: { recency: number; frequency: number; monetary: number };
	}[],
) => {
	// Obter o valor mínimo e máximo de recência, frequência e monetário
	const recencyValues = clientsRFM.map((client) => client.recency);
	const frequencyValues = clientsRFM.map((client) => client.frequency);
	const monetaryValues = clientsRFM.map((client) => client.monetary);

	const minRecency = Math.min(...recencyValues);
	const maxRecency = Math.max(...recencyValues);
	console.log("RECENCIA", maxRecency, minRecency);
	const minFrequency = Math.min(...frequencyValues);
	const maxFrequency = Math.max(...frequencyValues);
	console.log("FREQUENCIA", maxFrequency, minFrequency);
	const minMonetary = Math.min(...monetaryValues);
	const maxMonetary = Math.max(...monetaryValues);
	console.log("MONETARIO", maxMonetary, minMonetary);
	// Calcular os scores normalizados para cada cliente
	return clientsRFM.map((client) => {
		const recencyScore = normalizeRFM(client.recency, minRecency, maxRecency, true);
		const frequencyScore = normalizeRFM(client.frequency, minFrequency, maxFrequency);
		const monetaryScore = normalizeRFM(client.monetary, minMonetary, maxMonetary);

		return {
			clientId: client.clientId,
			clientName: client.clientName,
			recencyScore,
			frequencyScore,
			monetaryScore,
			RFMLabel: getRFMLabel(frequencyScore, recencyScore),
		};
	});
};

const RFMLabels = [
	{
		text: "NÃO PODE PERDÊ-LOS",
		combinations: [
			[5, 1],
			[5, 2],
		],
	},
	{
		text: "CLIENTES LEAIS",
		combinations: [
			[5, 3],
			[5, 4],
			[4, 3],
			[4, 4],
			[4, 5],
		],
	},
	{
		text: "CAMPEÕES",
		combinations: [[5, 5]],
	},
	{
		text: "EM RISCO",
		combinations: [
			[4, 1],
			[4, 2],
			[3, 1],
			[3, 2],
		],
	},
	{
		text: "PRECISAM DE ATENÇÃO",
		combinations: [[3, 3]],
	},
	{
		text: "POTENCIAIS CLIENTES LEAIS",
		combinations: [
			[3, 4],
			[3, 5],
			[2, 4],
			[2, 5],
		],
	},
	{
		text: "HIBERNANDO",
		combinations: [[2, 2]],
	},
	{
		text: "PRESTES A DORMIR",
		combinations: [
			[2, 3],
			[1, 3],
		],
	},
	{
		text: "PERDIDOS",
		combinations: [
			[2, 1],
			[1, 1],
			[1, 2],
		],
	},
	{
		text: "PROMISSORES",
		combinations: [[1, 4]],
	},
	{ text: "CLIENTES RECENTES", combinations: [[1, 5]] },
];
const getRFMLabel = (frequency: number, recency: number) => {
	const label = RFMLabels.find((l) => l.combinations.some((c) => c[0] == frequency && c[1] == recency));

	return label?.text || "PERDIDOS";
};
