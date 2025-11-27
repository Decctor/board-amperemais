import { apiHandler } from "@/lib/api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { formatPhoneAsBase } from "@/lib/formatting";
import { ClientSchema } from "@/schemas/clients";
import { db } from "@/services/drizzle";
import { clients, sales } from "@/services/drizzle/schema";
import { and, count, eq, gte, inArray, lte, max, min, notInArray, or, sql, sum } from "drizzle-orm";
import createHttpError from "http-errors";
import type { NextApiHandler } from "next";
import z from "zod";

const GetClientsInputSchema = z.object({
	// By ID params
	id: z
		.string({
			invalid_type_error: "Tipo não válido para ID do cliente.",
		})
		.optional()
		.nullable(),
	// General params
	page: z
		.string({
			invalid_type_error: "Tipo não válido para páginação.",
			required_error: "Páginação não informada.",
		})
		.transform((val) => Number(val)),
	search: z
		.string({
			invalid_type_error: "Tipo não válido para busca.",
		})
		.optional()
		.nullable(),
	acquisitionChannels: z
		.string({
			invalid_type_error: "Tipo não válido para canal de aquisição.",
		})
		.optional()
		.nullable()
		.transform((v) => (v ? v.split(",") : [])),
	segmentationTitles: z
		.string({
			invalid_type_error: "Tipo não válido para título de segmentação.",
		})
		.optional()
		.nullable()
		.transform((v) => (v ? v.split(",") : [])),
	statsPeriodAfter: z
		.string({
			invalid_type_error: "Tipo não válido para data de inserção do cliente.",
		})
		.optional()
		.nullable()
		.transform((val) => (val ? new Date(val) : null)),
	statsPeriodBefore: z
		.string({
			invalid_type_error: "Tipo não válido para data de inserção do cliente.",
		})
		.optional()
		.nullable()
		.transform((val) => (val ? new Date(val) : null)),
	statsSaleNatures: z
		.string({
			invalid_type_error: "Tipo não válido para natureza de venda.",
		})
		.optional()
		.nullable()
		.transform((v) => (v ? v.split(",") : [])),
	statsExcludedSalesIds: z
		.string({
			invalid_type_error: "Tipo não válido para ID da venda.",
		})
		.optional()
		.nullable()
		.transform((v) => (v ? v.split(",") : [])),
	statsTotalMin: z
		.string({
			invalid_type_error: "Tipo não válido para valor mínimo da venda.",
		})
		.optional()
		.nullable()
		.transform((val) => (val ? Number(val) : null)),
	statsTotalMax: z
		.string({
			invalid_type_error: "Tipo não válido para valor máximo da venda.",
		})
		.optional()
		.nullable()
		.transform((val) => (val ? Number(val) : null)),
});
export type TGetClientsInput = z.infer<typeof GetClientsInputSchema>;

async function getClients({ input, session }: { input: TGetClientsInput; session: TAuthUserSession["user"] }) {
	if ("id" in input) {
		const clientId = input.id;
		if (!clientId) throw new createHttpError.BadRequest("ID do cliente não informado.");

		const client = await db.query.clients.findFirst({
			where: (fields, { eq }) => eq(fields.id, clientId),
		});
		if (!client) throw new createHttpError.NotFound("Cliente não encontrado.");
		return {
			data: {
				byId: client,
				default: null,
			},
			message: "Cliente encontrado com sucesso.",
		};
	}

	// First, we start fetching clients with their purchases...
	const clientConditions = [];

	if (input.search && input.search.trim().length > 0) {
		clientConditions.push(
			or(
				sql`(to_tsvector('portuguese', ${clients.nome}) @@ plainto_tsquery('portuguese', ${input.search}) OR ${clients.nome} ILIKE '%' || ${input.search} || '%')`,
				sql`(to_tsvector('portuguese', ${clients.email}) @@ plainto_tsquery('portuguese', ${input.search}) OR ${clients.email} ILIKE '%' || ${input.search} || '%')`,
				sql`(to_tsvector('portuguese', ${clients.telefone}) @@ plainto_tsquery('portuguese', ${input.search}) OR ${clients.telefone} ILIKE '%' || ${input.search} || '%')`,
				sql`(to_tsvector('portuguese', ${clients.telefoneBase}) @@ plainto_tsquery('portuguese', ${input.search}) OR ${clients.telefoneBase} ILIKE '%' || ${input.search} || '%')`,
			),
		);
	}
	if (input.acquisitionChannels && input.acquisitionChannels.length > 0) {
		clientConditions.push(inArray(clients.canalAquisicao, input.acquisitionChannels));
	}
	if (input.segmentationTitles && input.segmentationTitles.length > 0) {
		clientConditions.push(inArray(clients.analiseRFMTitulo, input.segmentationTitles));
	}
	const statsConditions = [];
	if (input.statsPeriodAfter) statsConditions.push(gte(clients.dataInsercao, input.statsPeriodAfter));
	if (input.statsPeriodBefore) statsConditions.push(lte(clients.dataInsercao, input.statsPeriodBefore));
	if (input.statsSaleNatures && input.statsSaleNatures.length > 0) statsConditions.push(inArray(sales.natureza, input.statsSaleNatures));
	if (input.statsExcludedSalesIds && input.statsExcludedSalesIds.length > 0) statsConditions.push(notInArray(sales.id, input.statsExcludedSalesIds));

	const havingConditions = [];
	if (input.statsTotalMin) havingConditions.push(gte(sql<number>`sum(${sales.valorTotal})`, input.statsTotalMin));
	if (input.statsTotalMax) havingConditions.push(lte(sql<number>`sum(${sales.valorTotal})`, input.statsTotalMax));

	const PAGE_SIZE = 25;
	const skip = PAGE_SIZE * (input.page - 1);

	const matchedSubquery = db
		.select({
			clientId: clients.id,
		})
		.from(clients)
		.leftJoin(sales, eq(clients.id, sales.clienteId))
		.where(and(...clientConditions, ...statsConditions))
		.groupBy(clients.id);

	if (havingConditions.length > 0) {
		matchedSubquery.having(and(...havingConditions));
	}

	const statsByClientMatchedCountResult = await db.select({ count: count() }).from(matchedSubquery.as("sq"));
	const statsByClientMatchedCount = statsByClientMatchedCountResult[0]?.count ?? 0;

	const statsByClientResult = await db
		.select({
			clientId: clients.id,
			totaPurchasesValue: sum(sales.valorTotal),
			totalPurchasesQty: count(sales.id),
			firstPurchaseDate: min(sales.dataVenda),
			lastPurchaseDate: max(sales.dataVenda),
		})
		.from(clients)
		.leftJoin(sales, eq(clients.id, sales.clienteId))
		.where(and(...clientConditions, ...statsConditions))
		.having(and(...havingConditions))
		.groupBy(clients.id)
		.orderBy(sql`${clients.nome} asc`)
		.offset(skip)
		.limit(PAGE_SIZE);

	const clientIds = statsByClientResult.map((client) => client.clientId);
	const clientsResult = await db.query.clients.findMany({
		where: inArray(clients.id, clientIds),
	});

	const clientsWithStats = clientsResult.map((client) => {
		const stats = statsByClientResult.find((s) => s.clientId === client.id);
		return {
			...client,
			estatisticas: {
				comprasValorTotal: stats?.totaPurchasesValue ? Number(stats.totaPurchasesValue) : 0,
				comprasQtdeTotal: stats?.totalPurchasesQty ? Number(stats.totalPurchasesQty) : 0,
				primeiraCompraData: stats?.firstPurchaseDate ? stats.firstPurchaseDate : null,
				ultimaCompraData: stats?.lastPurchaseDate ? stats.lastPurchaseDate : null,
			},
		};
	});
	return {
		data: {
			clients: clientsWithStats,
			clientsMatched: statsByClientMatchedCount,
			totalPages: Math.ceil(statsByClientMatchedCount / PAGE_SIZE),
		},
	};
}

const getClientsRoute: NextApiHandler<any> = async (req, res) => {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	// if (!session.user.permissoes.parceiros.criar) throw new createHttpError.BadRequest("Você não possui permissão para acessar esse recurso.");
	const input = GetClientsInputSchema.parse(req.query);
	const result = await getClients({ input, session: session.user });
	return res.status(200).json(result);
};

type PostResponse = {
	data: { insertedId: string };
	message: string;
};

const createClientRoute: NextApiHandler<PostResponse> = async (req, res) => {
	const client = ClientSchema.parse(req.body);

	const insertResponse = await db
		.insert(clients)
		.values({ ...client, telefone: client.telefone ?? "", telefoneBase: formatPhoneAsBase(client.telefone ?? "") })
		.returning({ id: clients.id });
	const insertedId = insertResponse[0]?.id;
	if (!insertedId) throw new createHttpError.InternalServerError("Oops, houve um erro desconhecido ao criar cliente.");

	return res.status(201).json({ data: { insertedId }, message: "Cliente criado com sucesso." });
};
export default apiHandler({ POST: createClientRoute, GET: getClientsRoute });
