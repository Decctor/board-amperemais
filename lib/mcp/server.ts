import { recordAgentToolCall } from "@/lib/agent-tools/authentication";
import { findPromptForActor, listPromptsForActor } from "@/lib/agent-tools/prompts";
import { findToolForActor, listToolsForActor } from "@/lib/agent-tools/registry";
import { CURRENT_ORGANIZATION_RESOURCE_URI, listResourcesForActor, readResourceForActor } from "@/lib/agent-tools/resources";
import { sanitizeForModel } from "@/lib/agent-tools/serialization";
import type { TAgentActorContext } from "@/lib/agent-tools/types";
import { resolveOrganizationScope } from "@/lib/agent-tools/organization-scope";
import { describeErrorForLogging } from "@/lib/errors";
import createHttpError from "http-errors";
import type { NextRequest } from "next/server";
import { ZodError } from "zod";
import { toolInputJsonSchema } from "./json-schema";
import {
	JSON_RPC_ERROR_CODES,
	type TJsonRpcMessage,
	type TJsonRpcResponse,
	isNotification,
	jsonRpcError,
	jsonRpcResult,
	negotiateProtocolVersion,
} from "./protocol";

const SERVER_INFO = { name: "recompracrm", title: "RecompraCRM", version: "0.1.0" };

/**
 * Instruções que o cliente entrega ao modelo junto da lista de ferramentas. É o lugar barato de
 * resolver os erros que se repetiriam em toda conversa — sobretudo o significado de campo
 * ausente, que decide se o agente inventa um zero ou pergunta.
 */
function buildInstructions(actor: TAgentActorContext) {
	const base = [
		"RecompraCRM é uma plataforma de CRM e retenção para varejo brasileiro. Valores monetários estão em reais (BRL) e as datas voltam em ISO 8601.",
		"Campo ausente significa 'não disponível', nunca zero: não conclua que um produto está sem estoque, sem preço ou que o faturamento foi zero por causa de um campo que não veio.",
		"Toda listagem traz `total` e `truncado` — quando `truncado` for verdadeiro, refine os filtros em vez de tratar o que veio como o conjunto completo.",
	];
	if (actor.mode === "PLATAFORMA") {
		base.push(
			"Esta é uma conexão de plataforma, com acesso a todas as organizações. Toda ferramenta de organização exige `organizacaoId` (id ou slug) — não existe organização padrão. Comece por `platform_search_organizations` para descobrir o slug.",
		);
	} else {
		base.push(
			`Esta conexão responde por uma única organização; não há como consultar dados de outra. Leia o recurso ${CURRENT_ORGANIZATION_RESOURCE_URI} para saber quais módulos estão habilitados antes de sugerir ações que dependam deles.`,
		);
	}
	return base.join(" ");
}

function handleInitialize(message: TJsonRpcMessage, actor: TAgentActorContext): TJsonRpcResponse {
	const protocolVersion = negotiateProtocolVersion(message.params?.protocolVersion);
	return jsonRpcResult(message.id ?? null, {
		protocolVersion,
		// Sem `listChanged`: o conjunto de ferramentas de uma conexão é fixo enquanto ela viver —
		// muda só com um grant novo, que exige reconectar de qualquer forma.
		capabilities: { tools: {}, resources: {}, prompts: {} },
		serverInfo: SERVER_INFO,
		instructions: buildInstructions(actor),
	});
}

function handleToolsList(message: TJsonRpcMessage, actor: TAgentActorContext): TJsonRpcResponse {
	const tools = listToolsForActor(actor).map((tool) => ({
		name: tool.name,
		title: tool.title,
		description: tool.describe(actor),
		inputSchema: toolInputJsonSchema(tool.inputSchema),
	}));
	return jsonRpcResult(message.id ?? null, { tools });
}

/**
 * Falha de execução vira `isError: true` **dentro do resultado**, não erro de protocolo.
 *
 * A distinção é a da especificação e importa para o comportamento: um erro JSON-RPC é uma falha
 * do transporte que o cliente trata sozinho, enquanto `isError` volta para o modelo, que lê a
 * mensagem e se corrige — pede o `organizacaoId` que faltou, ajusta o período, avisa o usuário
 * que não tem permissão. Erros de protocolo (método inexistente, JSON inválido) seguem sendo
 * erro de protocolo.
 */
function toolErrorResult(id: TJsonRpcMessage["id"], message: string): TJsonRpcResponse {
	return jsonRpcResult(id ?? null, { content: [{ type: "text", text: message }], isError: true });
}

function describeToolFailure(error: unknown): string {
	if (error instanceof ZodError) {
		const issues = error.errors.map((issue) => `${issue.path.join(".") || "argumento"}: ${issue.message}`).join("; ");
		return `Argumentos inválidos — ${issues}`;
	}
	// `expose` marca os erros cujo texto foi escrito para ser lido; o resto vira mensagem genérica
	// para não vazar detalhe de integração ou de banco para o modelo.
	if (createHttpError.isHttpError(error) && error.expose) return error.message;
	return "Não foi possível concluir a consulta.";
}

async function handleToolsCall(message: TJsonRpcMessage, actor: TAgentActorContext, request: NextRequest): Promise<TJsonRpcResponse> {
	const name = typeof message.params?.name === "string" ? message.params.name : null;
	if (!name) return jsonRpcError(message.id ?? null, JSON_RPC_ERROR_CODES.INVALID_PARAMS, "Nome da ferramenta não informado.");

	const tool = findToolForActor(actor, name);
	if (!tool) {
		// Indistinguível de propósito entre "não existe" e "não autorizada": um cliente com lista
		// em cache não deve conseguir enumerar as ferramentas que não pode usar.
		return jsonRpcError(message.id ?? null, JSON_RPC_ERROR_CODES.METHOD_NOT_FOUND, `Ferramenta não disponível nesta conexão: ${name}.`);
	}

	const rawArguments = (message.params?.arguments as Record<string, unknown> | undefined) ?? {};

	try {
		const input = tool.inputSchema.parse(rawArguments);
		const requestedOrganizationId = (input as Record<string, unknown>).organizacaoId;
		const auditOrganizationId =
			actor.mode === "ORG"
				? actor.organizationId
				: typeof requestedOrganizationId === "string"
					? await resolveOrganizationScope(actor, requestedOrganizationId)
					: null;
		const result = await tool.execute(input as never, actor);
		const payload = sanitizeForModel(result);

		await recordAgentToolCall({
			actor,
			request,
			toolName: name,
			organizacaoId: auditOrganizationId,
		});

		const text = JSON.stringify(payload, null, 0);
		return jsonRpcResult(message.id ?? null, {
			content: [{ type: "text", text }],
			// `structuredContent` sem `outputSchema` declarado: clientes que sabem ler usam, os
			// demais caem no texto acima. Declarar o outputSchema obrigaria a manter um segundo
			// contrato por ferramenta sem ganho para o modelo.
			structuredContent: payload,
		});
	} catch (error) {
		console.error("[MCP] Falha ao executar ferramenta", name, describeErrorForLogging(error));
		await recordAgentToolCall({ actor, request, toolName: name, erro: describeToolFailure(error) });
		return toolErrorResult(message.id, describeToolFailure(error));
	}
}

async function handleResourcesRead(message: TJsonRpcMessage, actor: TAgentActorContext): Promise<TJsonRpcResponse> {
	const uri = typeof message.params?.uri === "string" ? message.params.uri : null;
	if (!uri) return jsonRpcError(message.id ?? null, JSON_RPC_ERROR_CODES.INVALID_PARAMS, "URI do recurso não informada.");

	try {
		const payload = await readResourceForActor(actor, uri);
		return jsonRpcResult(message.id ?? null, {
			contents: [{ uri, mimeType: "application/json", text: JSON.stringify(sanitizeForModel(payload)) }],
		});
	} catch (error) {
		console.error("[MCP] Falha ao ler recurso", uri, describeErrorForLogging(error));
		return jsonRpcError(message.id ?? null, JSON_RPC_ERROR_CODES.INVALID_PARAMS, describeToolFailure(error));
	}
}

function handlePromptsGet(message: TJsonRpcMessage, actor: TAgentActorContext): TJsonRpcResponse {
	const name = typeof message.params?.name === "string" ? message.params.name : null;
	if (!name) return jsonRpcError(message.id ?? null, JSON_RPC_ERROR_CODES.INVALID_PARAMS, "Nome do prompt não informado.");

	const prompt = findPromptForActor(actor, name);
	if (!prompt) return jsonRpcError(message.id ?? null, JSON_RPC_ERROR_CODES.INVALID_PARAMS, `Prompt não disponível nesta conexão: ${name}.`);

	const args = (message.params?.arguments as Record<string, string | undefined> | undefined) ?? {};
	return jsonRpcResult(message.id ?? null, {
		description: prompt.description,
		messages: [{ role: "user", content: { type: "text", text: prompt.build(args) } }],
	});
}

/**
 * Ponto único de despacho. Devolve `null` para notificações — o handler HTTP traduz isso em
 * 202 Accepted sem corpo, como a especificação exige.
 */
export async function handleMcpMessage({
	message,
	actor,
	request,
}: {
	message: TJsonRpcMessage;
	actor: TAgentActorContext;
	request: NextRequest;
}): Promise<TJsonRpcResponse | null> {
	if (isNotification(message)) return null;

	switch (message.method) {
		case "initialize":
			return handleInitialize(message, actor);
		case "ping":
			return jsonRpcResult(message.id ?? null, {});
		case "tools/list":
			return handleToolsList(message, actor);
		case "tools/call":
			return handleToolsCall(message, actor, request);
		case "resources/list":
			return jsonRpcResult(message.id ?? null, { resources: listResourcesForActor(actor) });
		case "resources/read":
			return handleResourcesRead(message, actor);
		case "prompts/list":
			return jsonRpcResult(message.id ?? null, { prompts: listPromptsForActor(actor) });
		case "prompts/get":
			return handlePromptsGet(message, actor);
		// Um método fora do conjunto anunciado em `capabilities` é erro de protocolo, não falha de
		// ferramenta: o cliente é quem trata, o modelo não tem o que corrigir.
		default:
			return jsonRpcError(message.id ?? null, JSON_RPC_ERROR_CODES.METHOD_NOT_FOUND, `Método não suportado: ${message.method ?? "(vazio)"}.`);
	}
}
