import { assertAgentCallAllowed, authenticateAgentRequest } from "@/lib/agent-tools/authentication";
import { appApiHandler } from "@/lib/app-api";
import { describeErrorForLogging } from "@/lib/errors";
import { JSON_RPC_ERROR_CODES, type TJsonRpcMessage, jsonRpcError } from "@/lib/mcp/protocol";
import { handleMcpMessage } from "@/lib/mcp/server";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Endpoint MCP (Streamable HTTP) do RecompraCRM.
 *
 * Stateless: cada POST carrega uma mensagem JSON-RPC e volta uma resposta JSON única. Sem SSE e
 * sem `Mcp-Session-Id` — a especificação trata os dois como opcionais, e a identidade da conexão
 * já vem do Bearer token a cada requisição, que é o que o modelo de acesso deste sistema usa.
 *
 * Autenticação hoje é chave de API (`CHAVE_API` sobre um principal de acesso). OAuth 2.1 como
 * resource server (RFC 9728 + PKCE + RFC 8707) é a fase seguinte; o `WWW-Authenticate` abaixo já
 * aponta para onde os metadados vão morar, então clientes que fazem discovery não quebram quando
 * ele existir.
 */

// Nunca cachear: a resposta depende do Bearer token e do estado do banco.
export const dynamic = "force-dynamic";

function buildUnauthorizedResponse(message: string) {
	const resourceMetadata = process.env.NEXT_PUBLIC_APP_URL
		? new URL("/.well-known/oauth-protected-resource", process.env.NEXT_PUBLIC_APP_URL).href
		: null;
	return NextResponse.json(
		{ error: { message } },
		{
			status: 401,
			headers: {
				"WWW-Authenticate": resourceMetadata ? `Bearer realm="recompracrm", resource_metadata="${resourceMetadata}"` : 'Bearer realm="recompracrm"',
			},
		},
	);
}

/**
 * Proteção contra DNS rebinding, exigida pela especificação do transporte.
 *
 * Clientes MCP reais (Claude, ChatGPT, o AI SDK do Control) chamam do servidor e não mandam
 * `Origin`. Quando o header aparece, a chamada veio de uma página no navegador — e a única
 * origem legítima nesse caso é a nossa própria.
 */
function assertAllowedOrigin(request: NextRequest) {
	const origin = request.headers.get("origin");
	if (!origin) return;

	const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin : null;
	if (allowedOrigin && origin === allowedOrigin) return;

	throw new createHttpError.Forbidden("Origem não permitida para este endpoint.");
}

async function mcpRoute(request: NextRequest) {
	assertAllowedOrigin(request);

	const contentType = request.headers.get("content-type") ?? "";
	if (!contentType.includes("application/json")) {
		throw new createHttpError.UnsupportedMediaType("O corpo da requisição precisa ser application/json.");
	}

	// DESVIO CONSCIENTE da especificação: ela manda responder 400 a um `MCP-Protocol-Version`
	// desconhecido. Recusar uma versão mais nova quebraria clientes que já falam a próxima
	// revisão, enquanto a superfície daqui (só `tools`) é estável entre as revisões. A versão que
	// vale é a negociada no `initialize`, que responde com a mais alta que sabemos falar.

	let actor: Awaited<ReturnType<typeof authenticateAgentRequest>>;
	try {
		actor = await authenticateAgentRequest(request);
	} catch (error) {
		console.error("[MCP] Autenticação recusada", describeErrorForLogging(error));
		const message = createHttpError.isHttpError(error) && error.expose ? error.message : "Credencial de acesso inválida.";
		return buildUnauthorizedResponse(message);
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json(jsonRpcError(null, JSON_RPC_ERROR_CODES.PARSE_ERROR, "Corpo JSON inválido."), { status: 400 });
	}

	// Lotes JSON-RPC foram removidos na revisão 2025-06-18; recusar explicitamente é melhor do
	// que processar o primeiro item em silêncio.
	if (Array.isArray(body)) {
		return NextResponse.json(jsonRpcError(null, JSON_RPC_ERROR_CODES.INVALID_REQUEST, "Lotes JSON-RPC não são suportados."), { status: 400 });
	}
	if (!body || typeof body !== "object") {
		return NextResponse.json(jsonRpcError(null, JSON_RPC_ERROR_CODES.INVALID_REQUEST, "Mensagem JSON-RPC inválida."), { status: 400 });
	}

	const message = body as TJsonRpcMessage;

	// O rate limiting fica depois do parse e antes da execução: `initialize` e notificações são
	// baratos e frequentes, mas quem estoura a janela é sempre um laço de `tools/call`.
	if (message.method === "tools/call") await assertAgentCallAllowed({ principalId: actor.principalId });

	const response = await handleMcpMessage({ message, actor, request });

	// Notificação aceita: 202 sem corpo, como a especificação exige.
	if (!response) return new NextResponse(null, { status: 202 });

	return NextResponse.json(response, { status: 200 });
}

/**
 * A especificação permite responder 405 ao GET quando o servidor não oferece stream SSE — é o
 * caso aqui. O mesmo vale para o DELETE de encerramento de sessão: não há sessão para encerrar.
 */
async function mcpUnsupportedMethodRoute() {
	return NextResponse.json({ error: { message: "Este endpoint MCP aceita apenas POST." } }, { status: 405, headers: { Allow: "POST" } });
}

export const POST = appApiHandler({ POST: mcpRoute });
export const GET = appApiHandler({ GET: mcpUnsupportedMethodRoute });
export const DELETE = appApiHandler({ DELETE: mcpUnsupportedMethodRoute });
