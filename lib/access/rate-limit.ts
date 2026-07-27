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
