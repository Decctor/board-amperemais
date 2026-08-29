import { getRequestClientInfo, recordAccessEvent } from "@/lib/access/events";
import { verifyAccessCredentialFromRequest } from "@/lib/access/authentication";
import { db } from "@/services/drizzle";
import { accessEvents } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { and, count, eq, gt } from "drizzle-orm";
import createHttpError from "http-errors";
import type { NextRequest } from "next/server";
import type { TAgentActorContext } from "./types";

/**
 * Rate limiting por **principal**, não por IP.
 *
 * Um agente em loop erra centenas de vezes por minuto a partir do mesmo processo, e cada
 * `get_commercial_results` é uma agregação sobre `sales`. O IP aqui é o do provedor de LLM,
 * compartilhado por todos os clientes — limitar por ele puniria organizações inocentes.
 * Apoiado nos próprios `access_events`, como o rate limiting de enrollment (§9.8).
 */
const CALL_WINDOW_MINUTES = 1;
const MAX_CALLS_PER_WINDOW = 120;

export async function assertAgentCallAllowed({ principalId }: { principalId: string }) {
	const windowStart = dayjs().subtract(CALL_WINDOW_MINUTES, "minutes").toDate();
	const [calls] = await db
		.select({ total: count() })
		.from(accessEvents)
		.where(and(eq(accessEvents.principalId, principalId), eq(accessEvents.tipo, "CHAMADA_AGENTE"), gt(accessEvents.dataInsercao, windowStart)));

	if ((calls?.total ?? 0) >= MAX_CALLS_PER_WINDOW) {
		throw new createHttpError.TooManyRequests("Muitas chamadas em sequência. Aguarde alguns instantes e tente novamente.");
	}
}

/**
 * Autentica a conexão MCP e **deriva o modo do tipo do principal**.
 *
 * Este é o ponto em que a discriminação org × plataforma acontece, e o único. O modo nunca chega
 * como argumento de ferramenta nem é inferido do prompt: um agente em modo ORG não tem como
 * afirmar que é plataforma, porque a afirmação não existe em lugar nenhum do protocolo.
 */
export async function authenticateAgentRequest(request: NextRequest): Promise<TAgentActorContext> {
	const credential = await verifyAccessCredentialFromRequest(request);

	if (credential.principalType === "CONTA_PLATAFORMA") {
		return {
			mode: "PLATAFORMA",
			principalId: credential.principalId,
			credentialId: credential.credentialId,
			clientId: credential.clientId,
			clientCode: credential.clientCode,
			organizationId: null,
			responsibleUserId: credential.responsibleUserId,
			scopes: credential.scopes,
		};
	}

	if (!credential.organizationId) {
		// A CHECK constraint do banco garante que só CONTA_PLATAFORMA tem organização nula.
		// Chegar aqui significa que a constraint foi contornada — falha fechada, não aberta.
		throw new createHttpError.Forbidden("Credencial sem organização vinculada.");
	}

	return {
		mode: "ORG",
		principalId: credential.principalId,
		credentialId: credential.credentialId,
		clientId: credential.clientId,
		clientCode: credential.clientCode,
		organizationId: credential.organizationId,
		responsibleUserId: credential.responsibleUserId,
		scopes: credential.scopes,
	};
}

/**
 * Trilha de auditoria por chamada de ferramenta. Alimenta o rate limiting acima e responde à
 * pergunta que o lojista vai fazer quando vir um dado estranho: "o que esse agente consultou?".
 * Nunca registra o resultado — apenas quem chamou, o quê e sobre qual organização.
 */
export async function recordAgentToolCall({
	actor,
	request,
	toolName,
	organizacaoId,
	erro,
	resultReferences,
}: {
	actor: TAgentActorContext;
	request: NextRequest;
	toolName: string;
	organizacaoId?: string | null;
	erro?: string | null;
	resultReferences?: Record<string, string> | null;
}) {
	const { enderecoIp, userAgent } = getRequestClientInfo(request);
	await recordAccessEvent({
		tipo: "CHAMADA_AGENTE",
		organizacaoId: organizacaoId ?? actor.organizationId,
		principalId: actor.principalId,
		credencialId: actor.credentialId,
		enderecoIp,
		userAgent,
		metadados: { ferramenta: toolName, modo: actor.mode, ...(resultReferences ? { recursos: resultReferences } : {}), ...(erro ? { erro } : {}) },
	});
}
