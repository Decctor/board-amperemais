import { apiHandler } from "@/lib/api";
import { getUserSession } from "@/lib/auth/session";
import { ClientSearchQueryParams, type TClientSearchQueryParams } from "@/schemas/clients";
import { db } from "@/services/drizzle";
import { clients, sales } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { and, count, eq, gte, inArray, lte, sql } from "drizzle-orm";
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
	// Adjust date filters for database query
	const ajustedAfter = filters.period.after ? dayjs(filters.period.after).toDate() : null;
	const ajustedBefore = filters.period.before ? dayjs(filters.period.before).endOf("day").toDate() : null;

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

	// Query the database to get the total count of matched clients (for pagination)
	const clientsResultMatched = await db
		.select({ count: count(clients.id) })
		.from(clients)
		.where(and(...conditions));
	const clientsResultMatchedCount = clientsResultMatched[0]?.count || 0;

	// Query the database to fetch the paginated list of clients with their purchases
	const clientsResult = await db.query.clients.findMany({
		where: and(...conditions),
		with: {
			compras: {
				where: (field, { gte, lte, and, isNotNull }) =>
					ajustedAfter && ajustedBefore ? and(gte(field.dataVenda, ajustedAfter), lte(field.dataVenda, ajustedBefore)) : isNotNull(field.dataVenda),
				columns: {
					valorTotal: true,
					dataVenda: true,
				},
			},
		},
		orderBy: (fields, { asc }) => asc(fields.nome),
		offset: skip,
		limit: limit,
	});

	// Return the fetched clients and the total matched count
	return { clients: clientsResult, clientsMatched: clientsResultMatchedCount };
}

// Export the API handler using your custom apiHandler utility
export default apiHandler({ POST: handleClientSearchRoute });
