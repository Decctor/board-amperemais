import { db } from "@/services/drizzle";
import { accessEvents } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { and, count, eq, gt } from "drizzle-orm";
import createHttpError from "http-errors";

// Rate limiting do enrollment apoiado nos próprios access_events (contagem de falhas recentes
// por IP), sem infraestrutura dedicada — suficiente enquanto o volume for o de ativação de
// dispositivos. O índice (tipo, endereco_ip, data_insercao) sustenta esta consulta.
const ENROLLMENT_FAILURE_WINDOW_MINUTES = 15;
const ENROLLMENT_MAX_FAILURES_PER_IP = 10;

export async function assertEnrollmentAttemptAllowed({ enderecoIp }: { enderecoIp: string | null }) {
	if (!enderecoIp) return;

	const windowStart = dayjs().subtract(ENROLLMENT_FAILURE_WINDOW_MINUTES, "minutes").toDate();
	const [failures] = await db
		.select({ total: count() })
		.from(accessEvents)
		.where(and(eq(accessEvents.tipo, "ENROLLMENT_FALHA"), eq(accessEvents.enderecoIp, enderecoIp), gt(accessEvents.dataInsercao, windowStart)));

	if ((failures?.total ?? 0) >= ENROLLMENT_MAX_FAILURES_PER_IP) {
		throw new createHttpError.TooManyRequests("Muitas tentativas de ativação. Aguarde alguns minutos e tente novamente.");
	}
}

// O registro dinâmico OAuth (RFC 7591) é público por natureza — qualquer conector pode se
// registrar. O que impede abuso é a mesma contagem em access_events do enrollment; o limite é
// por registro CONCLUÍDO porque o objetivo é conter poluição de tabela, não adivinhação.
const OAUTH_REGISTRATION_WINDOW_MINUTES = 60;
const OAUTH_MAX_REGISTRATIONS_PER_IP = 20;

export async function assertOauthRegistrationAllowed({ enderecoIp }: { enderecoIp: string | null }) {
	if (!enderecoIp) return;

	const windowStart = dayjs().subtract(OAUTH_REGISTRATION_WINDOW_MINUTES, "minutes").toDate();
	const [registrations] = await db
		.select({ total: count() })
		.from(accessEvents)
		.where(and(eq(accessEvents.tipo, "OAUTH_CLIENTE_REGISTRADO"), eq(accessEvents.enderecoIp, enderecoIp), gt(accessEvents.dataInsercao, windowStart)));

	if ((registrations?.total ?? 0) >= OAUTH_MAX_REGISTRATIONS_PER_IP) {
		throw new createHttpError.TooManyRequests("Muitos registros de cliente OAuth. Aguarde alguns minutos e tente novamente.");
	}
}

// No endpoint de token o que se conta são FALHAS: um código válido troca uma vez só, mas um
// atacante iterando códigos/verifiers gera OAUTH_FALHA em sequência.
const OAUTH_TOKEN_FAILURE_WINDOW_MINUTES = 15;
const OAUTH_MAX_TOKEN_FAILURES_PER_IP = 10;

export async function assertOauthTokenAttemptAllowed({ enderecoIp }: { enderecoIp: string | null }) {
	if (!enderecoIp) return;

	const windowStart = dayjs().subtract(OAUTH_TOKEN_FAILURE_WINDOW_MINUTES, "minutes").toDate();
	const [failures] = await db
		.select({ total: count() })
		.from(accessEvents)
		.where(and(eq(accessEvents.tipo, "OAUTH_FALHA"), eq(accessEvents.enderecoIp, enderecoIp), gt(accessEvents.dataInsercao, windowStart)));

	if ((failures?.total ?? 0) >= OAUTH_MAX_TOKEN_FAILURES_PER_IP) {
		throw new createHttpError.TooManyRequests("Muitas tentativas de troca de token. Aguarde alguns minutos e tente novamente.");
	}
}
