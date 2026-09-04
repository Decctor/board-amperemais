import { resolvePoiActorContext } from "@/lib/access/poi-actor";
import { appApiHandler } from "@/lib/app-api";
import { formatPhoneAsBase } from "@/lib/formatting";
import { db } from "@/services/drizzle";
import { clients } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const ClientByLookupInputSchema = z.object({
	// Opcional para dispositivos autenticados (a organização deriva do principal); obrigatório no modo legado.
	orgId: z
		.string({ invalid_type_error: "Tipo não válido para ID da organização." })
		.optional()
		.nullable(),
	phone: z.string({
		required_error: "Telefone não informado.",
		invalid_type_error: "Tipo não válido para telefone.",
	}),
	clientId: z
		.string({
			required_error: "ID do cliente não informado.",
			invalid_type_error: "Tipo não válido para ID do cliente.",
		})
		.optional()
		.nullable(),
});
export type TClientByLookupInput = z.infer<typeof ClientByLookupInputSchema>;

async function getClientByLookup(input: Omit<TClientByLookupInput, "orgId"> & { orgId: string }) {
	// Uma consulta só para os dois modos (por ID e por telefone): a carteirinha do clube e a matriz
	// de ações do POI dependem dos mesmos campos, e shapes divergentes por ramo virariam união no tipo.
	let whereClause: ReturnType<typeof and>;
	if (input.clientId) {
		whereClause = and(eq(clients.id, input.clientId), eq(clients.organizacaoId, input.orgId));
	} else {
		const phoneBase = formatPhoneAsBase(input.phone);
		if (!phoneBase) {
			throw new createHttpError.BadRequest("Telefone inválido.");
		}
		whereClause = and(eq(clients.telefoneBase, phoneBase), eq(clients.organizacaoId, input.orgId));
	}

	const client = await db.query.clients.findFirst({
		where: whereClause,
		columns: {
			id: true,
			nome: true,
			telefone: true,
			// Deliberadamente sem `cpfCnpj`: dado sensível não trafega para o ponto de interação.
			metadataTotalCompras: true,
		},
		with: {
			saldos: {
				columns: {
					id: true,
					saldoValorDisponivel: true,
					saldoValorAcumuladoTotal: true,
					saldoValorResgatadoTotal: true,
					dataAdesao: true,
				},
				with: {
					programa: {
						columns: {
							id: true,
							ativo: true,
							titulo: true,
							resgateLimiteTipo: true,
							resgateLimiteValor: true,
							terminologia: true,
							modalidadeDescontosPermitida: true,
							modalidadeRecompensasPermitida: true,
							acumuloPermitirViaPontoIntegracao: true,
							acumuloPermitirViaIntegracao: true,
							resgatePermitirViaPos: true,
							resgatePermitirViaPontoIntegracao: true,
							resgatePermitirViaLojaDigital: true,
						},
					},
				},
			},
		},
	});

	if (!client) {
		// Busca por ID vem de um contexto já validado (rota do wizard): ausência é erro.
		// Busca por telefone é uma consulta aberta: ausência é o caso "novo cliente".
		if (input.clientId) {
			throw new createHttpError.NotFound("Cliente não encontrado.");
		}
		return {
			data: null,
			message: "Cliente não encontrado.",
		};
	}

	return {
		data: client,
		message: "Cliente encontrado com sucesso.",
	};
}

export type TClientByLookupOutput = Awaited<ReturnType<typeof getClientByLookup>>;

async function clientByLookupRoute(request: NextRequest) {
	const input = ClientByLookupInputSchema.parse({
		orgId: request.nextUrl.searchParams.get("orgId") ?? undefined,
		phone: request.nextUrl.searchParams.get("phone") ?? undefined,
		clientId: request.nextUrl.searchParams.get("clientId") ?? undefined,
	});
	// Dual-mode (plano §9.10): dispositivo autenticado com scope poi:clients:read, ou modo legado com orgId.
	const resolution = await resolvePoiActorContext({ request, requiredScope: "poi:clients:read", payloadOrgId: input.orgId });
	const result = await getClientByLookup({ ...input, orgId: resolution.organizationId });
	return NextResponse.json(result, { status: 200 });
}

export const GET = appApiHandler({ GET: clientByLookupRoute });
