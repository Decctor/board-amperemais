import { AGENT_READ_ACCESS_SCOPES } from "@/lib/access/clients-catalog";
import { provisionAgentPrincipal } from "@/lib/access/credentials";
import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { db } from "@/services/drizzle";
import { AccessScopeEnum } from "@/schemas/enums";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

/**
 * Criação de uma conexão de agente de IA (MCP) pela própria organização.
 *
 * O enrollment por código (`/api/access/enrollments`) existe para aparelho físico, pareado por um
 * humano no balcão. Uma conexão de IA é configurada por quem administra a conta e colada num
 * cliente MCP — não há aparelho para digitar código.
 */

// Aplicações que uma organização pode conectar por conta própria. `AGENT_CONTROL` fica de fora:
// é principal de plataforma, emitido pelo nosso time por script, e não pertence a nenhuma
// organização.
const SELF_SERVICE_AGENT_CLIENT_CODES = ["AGENT_CLAUDE", "AGENT_CHATGPT"] as const;

const CreateAgentConnectionInputSchema = z.object({
	accessClientCodigo: z.enum(SELF_SERVICE_AGENT_CLIENT_CODES, {
		required_error: "Informe qual aplicação será conectada.",
		invalid_type_error: "Aplicação inválida para conexão de IA.",
	}),
	nome: z
		.string({ required_error: "Informe um nome para a conexão.", invalid_type_error: "Tipo não válido para o nome." })
		.trim()
		.min(2, "O nome precisa ter ao menos 2 caracteres."),
	scopes: z.array(AccessScopeEnum, { invalid_type_error: "Tipo não válido para as permissões." }).min(1, "Selecione ao menos uma permissão."),
});
export type TCreateAgentConnectionInput = z.infer<typeof CreateAgentConnectionInputSchema>;

async function createAgentConnection({
	input,
	organizacaoId,
	criadoPorId,
}: {
	input: TCreateAgentConnectionInput;
	organizacaoId: string;
	criadoPorId: string;
}) {
	const result = await provisionAgentPrincipal({
		accessClientCodigo: input.accessClientCodigo,
		organizacaoId,
		nome: input.nome,
		scopes: input.scopes,
		criadoPorId,
		descricao: "Conexão de IA criada pelo painel.",
	});

	return {
		data: {
			// O token viaja UMA única vez: só o SHA-256 do segredo fica no banco. A tela precisa
			// deixar isso explícito, porque não há tela de "ver token" depois.
			token: result.token,
			principal: result.principal,
			scopes: result.scopes,
		},
		message: "Conexão de IA criada com sucesso.",
	};
}
export type TCreateAgentConnectionOutput = Awaited<ReturnType<typeof createAgentConnection>>;

async function createAgentConnectionRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	if (!session.membership) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");
	if (!session.membership.permissoes.empresa.editar)
		throw new createHttpError.Forbidden("Você não possui permissão para criar conexões de IA na organização.");

	const input = CreateAgentConnectionInputSchema.parse(await request.json());
	const result = await createAgentConnection({
		input,
		organizacaoId: session.membership.organizacao.id,
		criadoPorId: session.user.id,
	});
	return NextResponse.json(result, { status: 201 });
}

async function getAgentConnectionOptions({ organizacaoId }: { organizacaoId: string }) {
	const clients = await db.query.accessClients.findMany({
		where: (fields, { inArray: whereInArray }) => whereInArray(fields.codigo, [...SELF_SERVICE_AGENT_CLIENT_CODES]),
		columns: { codigo: true, nome: true, categoria: true, status: true, escoposPermitidos: true },
	});

	return {
		data: {
			organizacaoId,
			aplicacoes: clients
				.filter((client) => client.status === "ATIVO")
				.map((client) => ({
					codigo: client.codigo,
					nome: client.nome,
					// Teto da aplicação: a tela nunca deve oferecer um scope que o provisionamento
					// vai recusar depois.
					escoposPermitidos: client.escoposPermitidos,
				})),
			escoposSugeridos: AGENT_READ_ACCESS_SCOPES,
		},
		message: "Opções de conexão de IA carregadas com sucesso.",
	};
}
export type TGetAgentConnectionOptionsOutput = Awaited<ReturnType<typeof getAgentConnectionOptions>>;

async function getAgentConnectionOptionsRoute(_request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	if (!session.membership) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");
	if (!session.membership.permissoes.empresa.visualizar)
		throw new createHttpError.Forbidden("Você não possui permissão para visualizar conexões de IA da organização.");

	const result = await getAgentConnectionOptions({ organizacaoId: session.membership.organizacao.id });
	return NextResponse.json(result);
}

export const GET = appApiHandler({ GET: getAgentConnectionOptionsRoute });
export const POST = appApiHandler({ POST: createAgentConnectionRoute });
