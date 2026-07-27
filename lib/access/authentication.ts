import type { TAccessPrincipalTypeEnum } from "@/schemas/enums";
import { db } from "@/services/drizzle";
import { accessCredentials, accessPrincipals } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { eq } from "drizzle-orm";
import createHttpError from "http-errors";
import type { NextRequest } from "next/server";
import { getRequestClientInfo, recordAccessEvent } from "./events";
import { constantTimeEqual, hashAccessSecret, parseAccessCredentialToken } from "./tokens";

// Contexto de um principal externo autenticado. Handlers e regras de negócio não conhecem
// formato de token, algoritmo de hash nem mecânica de rotação — apenas este contexto (§9.5).
export type TExternalActorContext = {
	principalId: string;
	credentialId: string;
	clientId: string;
	clientCode: string;
	organizationId: string;
	principalType: TAccessPrincipalTypeEnum;
	scopes: ReadonlySet<string>;
};

// Sessões humanas e principals externos resolvem para um contexto comum de auditoria/atribuição.
export type TActorContext =
	| {
			kind: "USER";
			userId: string;
			organizationId: string;
	  }
	| {
			kind: "EXTERNAL_PRINCIPAL";
			principalId: string;
			clientId: string;
			organizationId: string;
			scopes: ReadonlySet<string>;
	  };

// Atualização amostrada do último uso/acesso: evita uma escrita síncrona por requisição
// sem perder a utilidade operacional do dado (§9.8).
const LAST_USE_SAMPLING_MINUTES = 5;

export async function authenticateExternalRequest(request: NextRequest): Promise<TExternalActorContext> {
	const { enderecoIp, userAgent } = getRequestClientInfo(request);

	const authorizationHeader = request.headers.get("authorization");
	if (!authorizationHeader?.startsWith("Bearer ")) throw new createHttpError.Unauthorized("Credencial de acesso não informada.");

	const parsedToken = parseAccessCredentialToken(authorizationHeader.slice("Bearer ".length).trim());
	if (!parsedToken) throw new createHttpError.Unauthorized("Credencial de acesso inválida.");

	const credential = await db.query.accessCredentials.findFirst({
		where: eq(accessCredentials.idPublico, parsedToken.idPublico),
		with: {
			principal: {
				with: {
					cliente: true,
					grants: true,
				},
			},
		},
	});
	if (!credential) {
		await recordAccessEvent({ tipo: "AUTENTICACAO_FALHA", enderecoIp, userAgent, metadados: { motivo: "CREDENCIAL_NAO_ENCONTRADA" } });
		throw new createHttpError.Unauthorized("Credencial de acesso inválida.");
	}

	const failAuthentication = async (motivo: string, message: string) => {
		await recordAccessEvent({
			tipo: "AUTENTICACAO_FALHA",
			organizacaoId: credential.principal.organizacaoId,
			principalId: credential.principalId,
			credencialId: credential.id,
			enderecoIp,
			userAgent,
			metadados: { motivo },
		});
		throw new createHttpError.Unauthorized(message);
	};

	if (!constantTimeEqual(hashAccessSecret(parsedToken.segredo), credential.hashSegredo)) {
		await failAuthentication("SEGREDO_INCORRETO", "Credencial de acesso inválida.");
	}
	if (credential.dataRevogacao) await failAuthentication("CREDENCIAL_REVOGADA", "Credencial de acesso revogada.");
	if (credential.expiraEm && dayjs(credential.expiraEm).isBefore(dayjs())) {
		await failAuthentication("CREDENCIAL_EXPIRADA", "Credencial de acesso expirada.");
	}
	if (credential.principal.status !== "ATIVO" || credential.principal.dataRevogacao) {
		await failAuthentication("PRINCIPAL_INATIVO", "Dispositivo revogado ou inativo.");
	}
	if (credential.principal.cliente.status !== "ATIVO") {
		await failAuthentication("CLIENTE_INATIVO", "Aplicação cliente desativada.");
	}

	const scopes = new Set(credential.principal.grants.filter((grant) => !grant.dataRevogacao).map((grant) => grant.scope));

	const samplingCutoff = dayjs().subtract(LAST_USE_SAMPLING_MINUTES, "minutes");
	if (!credential.ultimoUso || dayjs(credential.ultimoUso).isBefore(samplingCutoff)) {
		const now = new Date();
		await Promise.all([
			db.update(accessCredentials).set({ ultimoUso: now }).where(eq(accessCredentials.id, credential.id)),
			db.update(accessPrincipals).set({ ultimoAcesso: now }).where(eq(accessPrincipals.id, credential.principalId)),
		]);
	}

	return {
		principalId: credential.principalId,
		credentialId: credential.id,
		clientId: credential.principal.accessClientId,
		clientCode: credential.principal.cliente.codigo,
		organizationId: credential.principal.organizacaoId,
		principalType: credential.principal.tipo,
		scopes,
	};
}

// Igualdade exata, sem wildcards (§9.4 do plano).
export function requireExternalScope(actor: TExternalActorContext, scope: string) {
	if (!actor.scopes.has(scope)) throw new createHttpError.Forbidden(`Permissão necessária não concedida a este dispositivo: ${scope}.`);
}
