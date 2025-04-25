import { apiHandler } from "@/lib/api";
import { getUserSession } from "@/lib/auth/session";
import { ClientSearchQueryParams, type TClientSearchQueryParams } from "@/schemas/clients";
import { db } from "@/services/drizzle";
import { clients, sales } from "@/services/drizzle/schema";
import connectToDatabase from "@/services/mongodb/main-db-connection";
import { getRFMLabel, type TRFMConfig } from "@/utils/rfm";
import dayjs from "dayjs";
import { and, count, eq, gte, inArray, lte, notInArray, sql } from "drizzle-orm";
import type { Collection } from "mongodb";
import type { NextApiHandler, NextApiRequest } from "next";

// This function encapsulates the core logic for fetching clients with pagination and applying filters.
// It's a "service-like" function that prepares the data structure for the API response.
const fetchClientsWithPagination = async (req: NextApiRequest) => {
	const PAGE_SIZE = 100;

	// Parse and validate the request body using Zod schema
	const filters = ClientSearchQueryParams.parse(req.body);

	const skip = PAGE_SIZE * (Number(filters.page) - 1);
	const limit = PAGE_SIZE;

	// Call the data access function to get the raw client data from the database
	const { clients, clientsMatched } = await fetchClientsWithPurchases({ filters, skip, limit });

	const totalPages = Math.ceil(clientsMatched / PAGE_SIZE);

	// Return the prepared data structure that will be sent in the API response body
	return { clients: clients, clientsMatched: clientsMatched, totalPages };
};
// Infer the return type of the data preparation function. This type will be used for
// the API response body, excluding the top-level 'data' wrapper.
export type TGetClientsBySearchOutput = Awaited<ReturnType<typeof fetchClientsWithPagination>>;

// This is the Next.js API route handler. It acts as the "procedure" or entry point
// for the API endpoint. It handles the request/response lifecycle.
const handleClientSearchRoute: NextApiHandler<{
	data: TGetClientsBySearchOutput;
}> = async (req, res) => {
	const session = await getUserSession({ request: req });
	// Call the data preparation function to get the response data
	const data = await fetchClientsWithPagination(req);

	// Wrap the data in the desired structure and send the JSON response
	return res.status(200).json({ data });
};

// Define the parameters for the database query function
type GetClientsParams = {
	filters: TClientSearchQueryParams;
	skip: number;
	limit: number;
};

// This function is a data access layer function that specifically queries the database
// for clients, including their purchases, based on the provided filters and pagination.
async function fetchClientsWithPurchases({ filters, skip, limit }: GetClientsParams) {
	const mongoDb = await connectToDatabase();
	const utilsCollection: Collection<TRFMConfig> = mongoDb.collection("utils");
	const rfmConfig = (await utilsCollection.findOne({
		identificador: "CONFIG_RFM",
	})) as TRFMConfig;

	// Adjust date filters for database query
	const ajustedAfter = filters.period.after ? dayjs(filters.period.after).toDate() : null;
	const ajustedBefore = filters.period.before ? dayjs(filters.period.before).endOf("day").toDate() : null;

	// Build dynamic WHERE conditions based on filters
	const clientQueryConditions = [];
	if (filters.name.trim().length > 0) {
		clientQueryConditions.push(
			sql`(to_tsvector('portuguese', ${clients.nome}) @@ plainto_tsquery('portuguese', ${filters.name}) OR ${clients.nome} ILIKE '%' || ${filters.name} || '%')`,
		);
	}
	if (filters.phone.trim().length > 0) {
		clientQueryConditions.push(
			sql`(to_tsvector('portuguese', ${clients.telefone}) @@ plainto_tsquery('portuguese', ${filters.phone}) OR ${clients.telefone} ILIKE '%' || ${filters.phone} || '%')`,
		);
	}
	if (filters.acquisitionChannels.length > 0) {
		clientQueryConditions.push(inArray(clients.canalAquisicao, filters.acquisitionChannels));
	}
	if (filters.rfmTitles.length > 0) {
		clientQueryConditions.push(inArray(clients.analiseRFMTitulo, filters.rfmTitles));
	}

	const purchasesQueryConditions = [];
	if (filters.total.min) purchasesQueryConditions.push(gte(sales.valorTotal, filters.total.min));
	if (filters.total.max) purchasesQueryConditions.push(lte(sales.valorTotal, filters.total.max));
	if (filters.saleNatures.length > 0) purchasesQueryConditions.push(inArray(sales.natureza, filters.saleNatures));
	if (filters.excludedSalesIds.length > 0) purchasesQueryConditions.push(notInArray(sales.id, filters.excludedSalesIds));

	// Query the database to get the total count of matched clients (for pagination)
	const clientsResultMatched = await db
		.select({ count: count(clients.id) })
		.from(clients)
		.where(and(...clientQueryConditions));
	const clientsResultMatchedCount = clientsResultMatched[0]?.count || 0;

	// Query the database to fetch the paginated list of clients with their purchases
	const clientsResult = await db.query.clients.findMany({
		where: and(...clientQueryConditions),
		orderBy: (fields, { asc }) => asc(fields.nome),
		offset: skip,
		limit: limit,
	});

	// Defining the client ids to each we gotta query accumulated results
	const clientIds = clientsResult.map((client) => client.id);

	const allTimeAccumulatedResults = await db
		.select({
			clientId: clients.id,
			totalPurchases: sql<number>`sum(${sales.valorTotal})`,
			purchaseCount: sql<number>`count(${sales.id})`,
			lastPurchaseDate: sql<Date>`max(${sales.dataVenda})`,
		})
		.from(clients)
		.leftJoin(sales, eq(sales.clienteId, clients.id))
		.where(and(inArray(clients.id, clientIds), ...purchasesQueryConditions))
		.groupBy(clients.id);
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
					.leftJoin(
						sales,
						and(eq(sales.clienteId, clients.id), gte(sales.dataVenda, ajustedAfter), lte(sales.dataVenda, ajustedBefore), ...purchasesQueryConditions),
					)
					.where(inArray(clients.id, clientIds))
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

	// Return the fetched clients and the total matched count
	return {
		clients: clientsResult.map((client) => {
			const isPeriodDefined = filters.period.after && filters.period.before;
			const allTimeAccumulatedClientResults = allTimeAccumulatedResultsMap.get(client.id);
			const inPeriodAccumulatedClientResults = isPeriodDefined ? inPeriodAccumulatedResultsMap.get(client.id) : allTimeAccumulatedClientResults;

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

				rfmTitle = getRFMLabel({
					monetary: Number(rfmMonetaryScore),
					frequency: Number(rfmFrequencyScore),
					recency: Number(rfmRecencyScore),
				});
			}

			return {
				...client,
				metadados: {
					periodoNumeroCompras: inPeriodAccumulatedClientResults?.purchaseCount || 0,
					periodoValorCompro: inPeriodAccumulatedClientResults?.totalPurchases || 0,
					periodoAnaliseRFMTitulo: rfmTitle,
					periodoAnaliseRFMNotasRecencia: rfmRecencyScore,
					periodoAnaliseRFMNotasFrequencia: rfmFrequencyScore,
					periodoAnaliseRFMNotasMonetario: rfmMonetaryScore,
					todoPeriodoNumeroCompras: allTimeAccumulatedClientResults?.purchaseCount || 0,
					todoPeriodoValorCompro: allTimeAccumulatedClientResults?.totalPurchases || 0,
				},
			};
		}),
		clientsMatched: clientsResultMatchedCount,
	};
}

// Export the API handler using your custom apiHandler utility
export default apiHandler({ POST: handleClientSearchRoute });
