import { appApiHandler } from "@/lib/app-api";
import { runPagesRouteHandler, type PagesRouteHandler } from "@/lib/pages-route-compat";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { formatStringAsOnlyDigits } from "@/lib/formatting";
import {
	createSimilarityExpression,
	createSimplifiedPhoneSearchCondition,
	createSimplifiedSearchCondition,
	createWordSimilarityExpression,
	extractSearchTokens,
} from "@/lib/search";
import { isValidCPF } from "@/lib/validation";
import { db } from "@/services/drizzle";
import { clients } from "@/services/drizzle/schema";
import { and, asc, desc, eq, inArray, or, sql } from "drizzle-orm";
import createHttpError from "http-errors";
import z from "zod";

const SearchClientsInputSchema = z.object({
	search: z
		.string({ invalid_type_error: "Tipo não válido para termo de busca." })
		.optional()
		.nullable()
		.transform((v) => v ?? ""),
	// Modo lookup: hidrata clientes já escolhidos (chips de uma seleção salva), que a busca por
	// texto não alcança — o consumidor tem os IDs, não o nome. Ignora `search` quando presente.
	clientIds: z
		.string({ invalid_type_error: "Tipo não válido para os IDs de clientes." })
		.optional()
		.nullable()
		.transform((v) => (v ? v.split(",").filter(Boolean) : [])),
});
export type TSearchClientsInput = z.infer<typeof SearchClientsInputSchema>;

const SEARCH_COLUMNS = {
	id: true,
	nome: true,
	telefone: true,
	cpfCnpj: true,
	email: true,
	localizacaoCidade: true,
	localizacaoEstado: true,
} as const;

/** Teto do modo lookup: a seleção de escopo do agente é de dezenas, não de milhares. */
const MAX_CLIENT_IDS_LOOKUP = 200;
const MIN_NAME_TOKEN_SIMILARITY = 0.45;

async function searchClients({ input, userOrgId }: { input: TSearchClientsInput; userOrgId: string }) {
	if (input.clientIds.length > 0) {
		const result = await db.query.clients.findMany({
			where: and(eq(clients.organizacaoId, userOrgId), inArray(clients.id, input.clientIds.slice(0, MAX_CLIENT_IDS_LOOKUP))),
			orderBy: asc(clients.nome),
			columns: SEARCH_COLUMNS,
		});
		return { data: { clients: result }, message: "Clientes carregados com sucesso." };
	}

	const normalizedSearch = input.search.trim();
	if (normalizedSearch.length < 2) {
		return {
			data: {
				clients: [],
			},
			message: "Busca de clientes realizada com sucesso.",
		};
	}

	const nameTokens = extractSearchTokens(normalizedSearch);
	const tokenizedNameCondition =
		nameTokens.length > 0
			? and(
					...nameTokens.map((token) =>
						or(
							createSimplifiedSearchCondition(clients.nome, token),
							sql`${createWordSimilarityExpression(clients.nome, token)} >= ${MIN_NAME_TOKEN_SIMILARITY}`,
						),
					),
				)
			: undefined;
	const searchDigits = formatStringAsOnlyDigits(normalizedSearch);
	const isPhoneSearch = searchDigits.length >= 4 && searchDigits.length <= 11 && !(searchDigits.length === 11 && isValidCPF(searchDigits));
	const phoneFinalFour = isPhoneSearch ? searchDigits.slice(-4) : null;
	const nameSimilarityRank = createSimilarityExpression(clients.nome, normalizedSearch);
	const orderBy = phoneFinalFour
		? [
				desc(sql<number>`CASE WHEN right(${clients.telefoneBase}, 4) = ${phoneFinalFour} THEN 1 ELSE 0 END`),
				desc(nameSimilarityRank),
				asc(clients.nome),
			]
		: [desc(nameSimilarityRank), asc(clients.nome)];

	const result = await db.query.clients.findMany({
		where: and(
			eq(clients.organizacaoId, userOrgId),
			or(
				createSimplifiedSearchCondition(clients.nome, normalizedSearch),
				tokenizedNameCondition,
				createSimplifiedPhoneSearchCondition(clients.telefoneBase, normalizedSearch),
				createSimplifiedSearchCondition(clients.cpfCnpj, normalizedSearch),
			),
		),
		orderBy,
		limit: 10,
		columns: SEARCH_COLUMNS,
	});

	return {
		data: {
			clients: result,
		},
		message: "Busca de clientes realizada com sucesso.",
	};
}

export type TSearchClientsOutput = Awaited<ReturnType<typeof searchClients>>;

const searchClientsRoute: PagesRouteHandler<TSearchClientsOutput> = async (req, res) => {
	const sessionUser = await getCurrentSessionUncached();
	if (!sessionUser) throw new createHttpError.Unauthorized("Você não está autenticado.");

	const userOrgId = sessionUser.membership?.organizacao.id;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const input = SearchClientsInputSchema.parse({
		search: req.query.search,
		clientIds: req.query.clientIds,
	});

	const result = await searchClients({ input, userOrgId });
	return res.status(200).json(result);
};

const routeHandlers = {
	GET: searchClientsRoute,
} satisfies Partial<Record<"GET" | "POST" | "PUT" | "PATCH" | "DELETE", PagesRouteHandler<any>>>;

export const GET = appApiHandler({
	GET: (request) => runPagesRouteHandler({ request, handler: routeHandlers.GET! }),
});
