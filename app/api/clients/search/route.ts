import { appApiHandler } from "@/lib/app-api";
import { runPagesRouteHandler, type PagesRouteHandler, type PagesRouteRequest, type PagesRouteResponse } from "@/lib/pages-route-compat";
import { getCurrentSessionTenant } from "@/lib/authentication/session";
import { createDigitsOnlyPhoneSearchCondition, createSimplifiedDigitsSearchCondition, createSimplifiedSearchCondition } from "@/lib/search";
import { db } from "@/services/drizzle";
import { clients } from "@/services/drizzle/schema";
import { and, asc, eq, or } from "drizzle-orm";
import createHttpError from "http-errors";
import z from "zod";

const SearchClientsInputSchema = z.object({
	search: z.string({
		required_error: "Termo de busca não informado.",
		invalid_type_error: "Tipo não válido para termo de busca.",
	}),
});
export type TSearchClientsInput = z.infer<typeof SearchClientsInputSchema>;

/**
 * Um termo de busca é ou texto ou número — nunca os dois. Casar o termo contra as três colunas de
 * uma vez gastava dois terços do trabalho em ramos que não tinham como casar (nome nunca é só
 * dígito; CPF e telefone nunca têm letra) e, pior, forçava o planner a combinar ramos de
 * seletividade muito diferente num único BitmapOr.
 *
 * Com a rota decidida antes da consulta, cada busca toca um conjunto pequeno de índices trigram
 * (migration 0064): letras → só `nome`; dígitos → `telefone_base` e `cpf_cnpj`, que continuam
 * ambíguos entre si durante a digitação e por isso seguem juntos.
 */
function createClientSearchCondition(normalizedSearch: string) {
	const hasLetters = /\p{L}/u.test(normalizedSearch);
	if (hasLetters) return createSimplifiedSearchCondition(clients.nome, normalizedSearch);

	return or(
		createDigitsOnlyPhoneSearchCondition(clients.telefoneBase, normalizedSearch),
		createSimplifiedDigitsSearchCondition(clients.cpfCnpj, normalizedSearch),
	);
}

async function searchClients({ input, userOrgId }: { input: TSearchClientsInput; userOrgId: string }) {
	const normalizedSearch = input.search.trim();
	if (normalizedSearch.length < 2) {
		return {
			data: {
				clients: [],
			},
			message: "Busca de clientes realizada com sucesso.",
		};
	}

	const result = await db.query.clients.findMany({
		where: and(eq(clients.organizacaoId, userOrgId), createClientSearchCondition(normalizedSearch)),
		orderBy: asc(clients.nome),
		limit: 10,
		columns: {
			id: true,
			nome: true,
			telefone: true,
			cpfCnpj: true,
			email: true,
			localizacaoCidade: true,
			localizacaoEstado: true,
		},
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
	// Rota de digitação: resolve só o tenant, sem montar a sessão inteira. Ver
	// `getCurrentSessionTenant`.
	const sessionTenant = await getCurrentSessionTenant();
	if (!sessionTenant) throw new createHttpError.Unauthorized("Você não está autenticado.");

	const userOrgId = sessionTenant.organizacaoId;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const input = SearchClientsInputSchema.parse({
		search: req.query.search,
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
