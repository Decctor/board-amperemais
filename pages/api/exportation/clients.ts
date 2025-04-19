import { apiHandler } from "@/lib/api";
import { getUserSession } from "@/lib/auth/session";
import { formatDateAsLocale, formatToMoney } from "@/lib/formatting";
import { ClientSearchQueryParams, type TClient } from "@/schemas/clients";
import { db } from "@/services/drizzle";
import { clients, sales } from "@/services/drizzle/schema";
import connectToDatabase from "@/services/mongodb/main-db-connection";
import { getRFMLabel, type TRFMConfig } from "@/utils/rfm";
import dayjs from "dayjs";
import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";
import type { Collection } from "mongodb";
import type { NextApiHandler, NextApiRequest } from "next";
import type { z } from "zod";

export type TGetClientsExportationInput = z.infer<typeof ClientSearchQueryParams>;
async function fetchClientExportation(req: NextApiRequest) {
	const filters = ClientSearchQueryParams.parse(req.body);
	const ajustedAfter = filters.period.after ? dayjs(filters.period.after).toDate() : null;
	const ajustedBefore = filters.period.before ? dayjs(filters.period.before).endOf("day").toDate() : null;

	const mongoDb = await connectToDatabase();
	const utilsCollection: Collection<TRFMConfig> = mongoDb.collection("utils");
	const rfmConfig = (await utilsCollection.findOne({
		identificador: "CONFIG_RFM",
	})) as TRFMConfig;

	// Build dynamic WHERE conditions based on filters
	const conditions = [];
	if (filters.name.trim().length > 0) {
		conditions.push(
			sql`(to_tsvector('portuguese', ${clients.nome}) @@ plainto_tsquery('portuguese', ${filters.name}) OR ${clients.nome} ILIKE '%' || ${filters.name} || '%')`,
		);
	}
	if (filters.phone.trim().length > 0) {
		conditions.push(
			sql`(to_tsvector('portuguese', ${clients.telefone}) @@ plainto_tsquery('portuguese', ${filters.phone}) OR ${clients.telefone} ILIKE '%' || ${filters.phone} || '%')`,
		);
	}
	if (filters.acquisitionChannels.length > 0) {
		conditions.push(inArray(clients.canalAquisicao, filters.acquisitionChannels));
	}
	if (filters.rfmTitles.length > 0) {
		conditions.push(inArray(clients.analiseRFMTitulo, filters.rfmTitles));
	}

	// Getting the all time accumulted results grouped by client
	const allTimeAccumulatedResults = await db
		.select({
			clientId: clients.id,
			totalPurchases: sql<number>`sum(${sales.valorTotal})`,
			purchaseCount: sql<number>`count(${sales.id})`,
			lastPurchaseDate: sql<Date>`max(${sales.dataVenda})`,
		})
		.from(clients)
		.leftJoin(sales, eq(sales.clienteId, clients.id))
		.groupBy(clients.id);

	// Getting the accumulated results grouped by client for the period (if estabilished)
	const inPeriodAccumulatedResults =
		ajustedAfter && ajustedBefore
			? await db
					.select({
						clientId: clients.id,
						totalPurchases: sql<number>`sum(${sales.valorTotal})`,
						purchaseCount: sql<number>`count(${sales.id})`,
						lastPurchaseDate: sql<Date>`max(${sales.dataVenda})`,
					})
					.from(clients)
					.leftJoin(sales, and(eq(sales.clienteId, clients.id), gte(sales.dataVenda, ajustedAfter), lte(sales.dataVenda, ajustedBefore)))
					.groupBy(clients.id)
			: [];

	const allTimeAccumulatedResultsMap = new Map(
		allTimeAccumulatedResults.map((results) => [
			results.clientId,
			{
				totalPurchases: results.totalPurchases,
				purchaseCount: results.purchaseCount,
				lastPurchaseDate: results.lastPurchaseDate,
			},
		]),
	);

	const inPeriodAccumulatedResultsMap = new Map(
		inPeriodAccumulatedResults.map((results) => [
			results.clientId,
			{
				totalPurchases: results.totalPurchases,
				purchaseCount: results.purchaseCount,
				lastPurchaseDate: results.lastPurchaseDate,
			},
		]),
	);

	const clientsResult = await db.query.clients.findMany({
		where: and(...conditions),
	});

	return clientsResult.map((client) => {
		const isPeriodDefined = filters.period.after && filters.period.before;
		const allTimeAccumulatedClientResults = allTimeAccumulatedResultsMap.get(client.id);
		const inPeriodAccumulatedClientResults = isPeriodDefined ? inPeriodAccumulatedResultsMap.get(client.id) : allTimeAccumulatedClientResults;

		// Getting RFM analysis for the defined period
		let rfmTitle = client.analiseRFMTitulo;
		let rfmRecencyScore = client.analiseRFMNotasRecencia;
		let rfmFrequencyScore = client.analiseRFMNotasFrequencia;
		let rfmMonetaryScore = client.analiseRFMNotasMonetario;
		if (isPeriodDefined) {
			const calculatedRecency = inPeriodAccumulatedClientResults?.lastPurchaseDate
				? dayjs().diff(dayjs(inPeriodAccumulatedClientResults.lastPurchaseDate), "days")
				: Number.POSITIVE_INFINITY;
			const calculatedFrequency = inPeriodAccumulatedClientResults?.purchaseCount || 0;
			const calculatedMonetary = inPeriodAccumulatedClientResults?.totalPurchases || 0;

			const configRecency = Object.entries(rfmConfig.recencia).find(
				([key, value]) => calculatedRecency && calculatedRecency >= value.min && calculatedRecency <= value.max,
			);
			rfmRecencyScore = configRecency ? configRecency[0] : "1";

			const configFrequency = Object.entries(rfmConfig.frequencia).find(
				([key, value]) => calculatedFrequency >= value.min && calculatedFrequency <= value.max,
			);
			rfmFrequencyScore = configFrequency ? configFrequency[0] : "1";

			const configMonetary = Object.entries(rfmConfig.monetario || {}).find(
				([key, value]) => calculatedMonetary >= value.min && calculatedMonetary <= value.max,
			);
			rfmMonetaryScore = configMonetary ? configMonetary[0] : "1";

			rfmTitle = getRFMLabel(Number(rfmFrequencyScore), Number(rfmRecencyScore));
		}
		return {
			NOME: client.nome,
			TELEFONE: client.telefone,
			EMAIL: client.email,
			"CANAL DE AQUISIÇÃO": client.canalAquisicao,
			"DATA DA PRIMEIRA COMPRA": formatDateAsLocale(client.primeiraCompraData),
			"DATA DA ÚLTIMA COMPRA": formatDateAsLocale(client.ultimaCompraData),
			"RFM ATUAL - ÚLTIMA ATUALIZAÇÃO": formatDateAsLocale(client.analiseRFMUltimaAtualizacao),
			"RFM ATUAL - TÍTULO": client.analiseRFMTitulo,
			"RFM ATUAL - NOTA EM RECÊNCIA": client.analiseRFMNotasRecencia,
			"RFM ATUAL - NOTA EM FREQUÊNCIA": client.analiseRFMNotasFrequencia,
			"RFM ATUAL - NOTA EM MONETÁRIO": client.analiseRFMNotasMonetario,
			PERÍODO:
				filters.period.after && filters.period.before
					? `${formatDateAsLocale(filters.period.after)} - ${formatDateAsLocale(filters.period.before)}`
					: "TODO O PERÍODO",
			"NO PERÍODO - Nº DE COMPRAS": inPeriodAccumulatedClientResults?.purchaseCount || 0,
			"NO PERÍODO - TOTAL COMPRO NO PERÍODO": formatToMoney(inPeriodAccumulatedClientResults?.totalPurchases || 0),
			"NO PERÍODO - RFM - TÍTULO": rfmTitle,
			"NO PERÍODO - RFM - NOTA EM RECÊNCIA": rfmRecencyScore,
			"NO PERÍODO - RFM - NOTA EM FREQUÊNCIA": rfmFrequencyScore,
			"NO PERÍODO - RFM - NOTA EM MONETÁRIO": rfmMonetaryScore,
			"TODO O PERÍODO - Nº DE COMPRAS": allTimeAccumulatedClientResults?.purchaseCount || 0,
			"TODO O PERÍODO - TOTAL COMPRO": formatToMoney(allTimeAccumulatedClientResults?.totalPurchases || 0),
		};
	});
}

export type TGetClientsExportationOutput = Awaited<ReturnType<typeof fetchClientExportation>>;

const handleClientsExportation: NextApiHandler<{
	data: TGetClientsExportationOutput;
}> = async (req, res) => {
	const session = await getUserSession({ request: req });
	const data = await fetchClientExportation(req);

	return res.status(200).json({ data });
};
export default apiHandler({ POST: handleClientsExportation });
