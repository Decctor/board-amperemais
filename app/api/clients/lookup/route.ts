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
	if (input.clientId) {
		const client = await db.query.clients.findFirst({
			where: and(eq(clients.id, input.clientId), eq(clients.organizacaoId, input.orgId)),
			columns: {
				id: true,
				nome: true,
				telefone: true,
			},
			with: {
				saldos: {
					columns: {
						id: true,
						saldoValorDisponivel: true,
						saldoValorAcumuladoTotal: true,
						saldoValorResgatadoTotal: true,
					},
					with: {
						programa: {
							columns: {
								id: true,
								resgateLimiteTipo: true,
								resgateLimiteValor: true,
								terminologia: true,
								acumuloPermitirViaPontoIntegracao: true,
								acumuloPermitirViaIntegracao: true,
							},
						},
					},
				},
			},
		});
		if (!client) {
			throw new createHttpError.NotFound("Cliente não encontrado.");
		}
		return {
			data: client,
			message: "Cliente encontrado com sucesso.",
		};
	}
	// Format phone to base for comparison
	const phoneBase = formatPhoneAsBase(input.phone);

	if (!phoneBase) {
		throw new createHttpError.BadRequest("Telefone inválido.");
	}

	// Find client by phone and organization
	const client = await db.query.clients.findFirst({
		where: and(eq(clients.telefoneBase, phoneBase), eq(clients.organizacaoId, input.orgId)),
		columns: {
			id: true,
			nome: true,
			telefone: true,
		},
		with: {
			saldos: {
				columns: {
					id: true,
					saldoValorDisponivel: true,
					saldoValorAcumuladoTotal: true,
					saldoValorResgatadoTotal: true,
				},
				with: {
					programa: {
						columns: {
							id: true,
							resgateLimiteTipo: true,
							resgateLimiteValor: true,
							terminologia: true,
							acumuloPermitirViaPontoIntegracao: true,
							acumuloPermitirViaIntegracao: true,
						},
					},
				},
			},
		},
	});

	if (!client) {
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
