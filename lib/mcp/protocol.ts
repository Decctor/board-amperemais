/**
 * Camada de fio do MCP: JSON-RPC 2.0 sobre Streamable HTTP.
 *
 * Escrito à mão em vez de trazer o `@modelcontextprotocol/sdk` por dois motivos. O transporte
 * do SDK espera `req`/`res` do Node e não encaixa direto num route handler do App Router; e o
 * servidor aqui é **stateless** — cada POST se resolve numa única resposta JSON, que é
 * exatamente o que a especificação permite ("If the input is a JSON-RPC request, the server MUST
 * either return Content-Type: text/event-stream (…) or application/json, to return one JSON
 * object"). Sem streaming e sem sessão, o SDK traria dependência e nenhuma capacidade.
 *
 * O dia em que este servidor precisar de notificações servidor→cliente, amostragem ou operações
 * longas com progresso, a conta inverte: adote o SDK em vez de crescer este arquivo.
 */

export const MCP_LATEST_PROTOCOL_VERSION = "2025-06-18";

/** Versões cuja semântica este servidor implementa de fato. */
export const MCP_SUPPORTED_PROTOCOL_VERSIONS = [MCP_LATEST_PROTOCOL_VERSION, "2025-03-26"] as const;

export const JSON_RPC_VERSION = "2.0";

// Códigos padrão do JSON-RPC 2.0.
export const JSON_RPC_ERROR_CODES = {
	PARSE_ERROR: -32700,
	INVALID_REQUEST: -32600,
	METHOD_NOT_FOUND: -32601,
	INVALID_PARAMS: -32602,
	INTERNAL_ERROR: -32603,
} as const;

export type TJsonRpcId = string | number | null;

export type TJsonRpcMessage = {
	jsonrpc?: string;
	id?: TJsonRpcId;
	method?: string;
	params?: Record<string, unknown>;
	result?: unknown;
	error?: unknown;
};

export type TJsonRpcResponse =
	| { jsonrpc: typeof JSON_RPC_VERSION; id: TJsonRpcId; result: unknown }
	| { jsonrpc: typeof JSON_RPC_VERSION; id: TJsonRpcId; error: { code: number; message: string; data?: unknown } };

export function jsonRpcResult(id: TJsonRpcId, result: unknown): TJsonRpcResponse {
	return { jsonrpc: JSON_RPC_VERSION, id, result };
}

export function jsonRpcError(id: TJsonRpcId, code: number, message: string, data?: unknown): TJsonRpcResponse {
	return { jsonrpc: JSON_RPC_VERSION, id, error: data === undefined ? { code, message } : { code, message, data } };
}

/**
 * Uma mensagem sem `id` é notificação: a especificação manda responder 202 sem corpo, e nunca
 * devolver um envelope JSON-RPC. `id: null` é id legítimo — por isso o teste é pela ausência
 * da chave, não pela falsidade do valor.
 */
export function isNotification(message: TJsonRpcMessage): boolean {
	return !("id" in message) || message.id === undefined;
}

export function negotiateProtocolVersion(requested: unknown): string {
	if (typeof requested === "string" && (MCP_SUPPORTED_PROTOCOL_VERSIONS as readonly string[]).includes(requested)) {
		return requested;
	}
	// Versão desconhecida (mais nova ou mais velha): responde com a que sabemos falar e deixa o
	// cliente decidir se segue ou desconecta — é o comportamento prescrito na negociação.
	return MCP_LATEST_PROTOCOL_VERSION;
}
