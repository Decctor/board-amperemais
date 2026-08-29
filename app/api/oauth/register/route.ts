import { getRequestClientInfo } from "@/lib/access/events";
import { isValidOauthRedirectUri, registerOauthClient } from "@/lib/access/oauth";
import { OAUTH_CORS_HEADERS } from "@/lib/access/oauth-metadata";
import { assertOauthRegistrationAllowed } from "@/lib/access/rate-limit";
import { appApiHandler } from "@/lib/app-api";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

/**
 * Registro dinâmico de cliente OAuth (RFC 7591) — é o que os conectores do Claude.ai e do
 * ChatGPT chamam ao adicionar o servidor MCP. Endpoint público de propósito: clientes são
 * PÚBLICOS (sem segredo, PKCE obrigatório), então registrar não concede nada — todo acesso
 * ainda passa pelo consentimento de um usuário logado em /oauth/authorize.
 *
 * Erros seguem o formato da RFC 7591 (`error`/`error_description`), não o envelope padrão da
 * aplicação: quem lê a resposta é uma biblioteca OAuth, não o nosso frontend.
 */

export const dynamic = "force-dynamic";

const RegisterOauthClientInputSchema = z.object({
	redirect_uris: z
		.array(z.string(), { required_error: "redirect_uris é obrigatório.", invalid_type_error: "Tipo inválido para redirect_uris." })
		.min(1),
	client_name: z.string({ invalid_type_error: "Tipo inválido para client_name." }).optional().nullable(),
	token_endpoint_auth_method: z.string({ invalid_type_error: "Tipo inválido para token_endpoint_auth_method." }).optional().nullable(),
	grant_types: z.array(z.string()).optional().nullable(),
	response_types: z.array(z.string()).optional().nullable(),
	scope: z.string({ invalid_type_error: "Tipo inválido para scope." }).optional().nullable(),
});

function registrationError(error: "invalid_client_metadata" | "invalid_redirect_uri", description: string) {
	return NextResponse.json({ error, error_description: description }, { status: 400, headers: OAUTH_CORS_HEADERS });
}

async function registerOauthClientRoute(request: NextRequest) {
	const { enderecoIp, userAgent } = getRequestClientInfo(request);
	await assertOauthRegistrationAllowed({ enderecoIp });

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return registrationError("invalid_client_metadata", "O corpo da requisição precisa ser JSON.");
	}

	const parsed = RegisterOauthClientInputSchema.safeParse(body);
	if (!parsed.success) return registrationError("invalid_client_metadata", parsed.error.errors[0]?.message ?? "Metadados de cliente inválidos.");

	const invalidUri = parsed.data.redirect_uris.find((uri) => !isValidOauthRedirectUri(uri));
	if (invalidUri) return registrationError("invalid_redirect_uri", `redirect_uri inválida: ${invalidUri}`);

	// O que o cliente PEDIU fica em metadados para diagnóstico; o que ele RECEBE é sempre o
	// perfil público + PKCE. Clientes bem-comportados adotam o que a resposta declarar.
	const oauthClient = await registerOauthClient({
		clientName: parsed.data.client_name,
		redirectUris: parsed.data.redirect_uris,
		registrationMetadata: {
			client_name: parsed.data.client_name ?? null,
			token_endpoint_auth_method: parsed.data.token_endpoint_auth_method ?? null,
			grant_types: parsed.data.grant_types ?? null,
			response_types: parsed.data.response_types ?? null,
			scope: parsed.data.scope ?? null,
			userAgent,
		},
		enderecoIp,
		userAgent,
	});

	return NextResponse.json(
		{
			client_id: oauthClient.id,
			client_id_issued_at: Math.floor(oauthClient.dataInsercao.getTime() / 1000),
			client_name: oauthClient.nome,
			redirect_uris: oauthClient.redirectUris,
			token_endpoint_auth_method: "none",
			grant_types: ["authorization_code"],
			response_types: ["code"],
		},
		{ status: 201, headers: OAUTH_CORS_HEADERS },
	);
}

async function corsPreflightRoute() {
	return new NextResponse(null, { status: 204, headers: OAUTH_CORS_HEADERS });
}

export const POST = appApiHandler({ POST: registerOauthClientRoute });
export const OPTIONS = corsPreflightRoute;
