import { appApiHandler } from "@/lib/app-api";
import { assertCronAuthorized } from "@/lib/cron/assert-cron-authorized";
import { db } from "@/services/drizzle";
import { accessEnrollmentChallenges, accessEvents } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { lt } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// Higiene da fundação de acesso externo (roda semanalmente via vercel.json):
// - desafios de enrollment expirados há mais de 24h (janela recente preservada para diagnóstico
//   de ativações falhas; o TTL máximo de um desafio é 60 minutos);
// - access_events com mais de 90 dias. O rate limiting só olha os últimos 15 minutos; a retenção
//   longa existe para a telemetria CHAMADA_POI_LEGADO que guia o enforcement da Fase 7.
const CHALLENGE_RETENTION_HOURS = 24;
const EVENT_RETENTION_DAYS = 90;

async function accessCleanupRoute(request: NextRequest) {
	assertCronAuthorized(request);

	const challengeCutoff = dayjs().subtract(CHALLENGE_RETENTION_HOURS, "hours").toDate();
	const deletedChallenges = await db
		.delete(accessEnrollmentChallenges)
		.where(lt(accessEnrollmentChallenges.expiraEm, challengeCutoff))
		.returning({ id: accessEnrollmentChallenges.id });

	const eventCutoff = dayjs().subtract(EVENT_RETENTION_DAYS, "days").toDate();
	const deletedEvents = await db.delete(accessEvents).where(lt(accessEvents.dataInsercao, eventCutoff)).returning({ id: accessEvents.id });

	console.log(`[ACCESS_CLEANUP] Removidos ${deletedChallenges.length} desafios expirados e ${deletedEvents.length} eventos com mais de ${EVENT_RETENTION_DAYS} dias.`);

	return NextResponse.json({
		data: {
			desafiosRemovidos: deletedChallenges.length,
			eventosRemovidos: deletedEvents.length,
		},
		message: "Limpeza de acesso externo concluída com sucesso.",
	});
}

export const GET = appApiHandler({ GET: accessCleanupRoute });
