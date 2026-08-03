import { appApiHandler } from "@/lib/app-api";
import { assertCronAuthorized } from "@/lib/cron/assert-cron-authorized";
import { db } from "@/services/drizzle";
import { accessEnrollmentChallenges, accessEvents, externalEvents } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { inArray, lt } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// Retenção de dados da plataforma (roda semanalmente via vercel.json). Novas políticas de
// retenção entram aqui, não em crons próprios. Hoje:
// - desafios de enrollment expirados há mais de 24h (janela recente preservada para diagnóstico
//   de ativações falhas; o TTL máximo de um desafio é 60 minutos);
// - access_events com mais de 90 dias. O rate limiting só olha os últimos 15 minutos; a retenção
//   longa existe para a telemetria CHAMADA_POI_LEGADO que guia o enforcement da Fase 7.
// - external_events (inbox de webhooks) com mais de 30 dias — payloads contêm dados pessoais
//   (telefone, nome, conteúdo de mensagem); a retenção é o teto de permanência para linhas sem
//   organização carimbada (docs/dev-planning/sync-skip-and-webhook-inbox-plan.md §4.4).
const CHALLENGE_RETENTION_HOURS = 24;
const EVENT_RETENTION_DAYS = 90;
const EXTERNAL_EVENT_RETENTION_DAYS = 30;
// Postgres não tem DELETE ... LIMIT: keyset em lote via subselect, com teto de iterações para
// o cron não estourar o tempo em um backlog anômalo (o restante sai na próxima execução).
const EXTERNAL_EVENT_DELETE_BATCH_SIZE = 500;
const EXTERNAL_EVENT_DELETE_MAX_BATCHES = 40;

async function retentionCleanupRoute(request: NextRequest) {
	assertCronAuthorized(request);

	const challengeCutoff = dayjs().subtract(CHALLENGE_RETENTION_HOURS, "hours").toDate();
	const deletedChallenges = await db
		.delete(accessEnrollmentChallenges)
		.where(lt(accessEnrollmentChallenges.expiraEm, challengeCutoff))
		.returning({ id: accessEnrollmentChallenges.id });

	const eventCutoff = dayjs().subtract(EVENT_RETENTION_DAYS, "days").toDate();
	const deletedEvents = await db.delete(accessEvents).where(lt(accessEvents.dataInsercao, eventCutoff)).returning({ id: accessEvents.id });

	const externalEventCutoff = dayjs().subtract(EXTERNAL_EVENT_RETENTION_DAYS, "days").toDate();
	let deletedExternalEventsCount = 0;
	for (let batch = 0; batch < EXTERNAL_EVENT_DELETE_MAX_BATCHES; batch++) {
		const deletedBatch = await db
			.delete(externalEvents)
			.where(
				inArray(
					externalEvents.id,
					db
						.select({ id: externalEvents.id })
						.from(externalEvents)
						.where(lt(externalEvents.dataInsercao, externalEventCutoff))
						.orderBy(externalEvents.dataInsercao)
						.limit(EXTERNAL_EVENT_DELETE_BATCH_SIZE),
				),
			)
			.returning({ id: externalEvents.id });
		deletedExternalEventsCount += deletedBatch.length;
		if (deletedBatch.length < EXTERNAL_EVENT_DELETE_BATCH_SIZE) break;
	}

	console.log(
		`[RETENTION_CLEANUP] Removidos ${deletedChallenges.length} desafios expirados, ${deletedEvents.length} eventos de acesso com mais de ${EVENT_RETENTION_DAYS} dias e ${deletedExternalEventsCount} eventos externos com mais de ${EXTERNAL_EVENT_RETENTION_DAYS} dias.`,
	);

	return NextResponse.json({
		data: {
			desafiosRemovidos: deletedChallenges.length,
			eventosRemovidos: deletedEvents.length,
			eventosExternosRemovidos: deletedExternalEventsCount,
		},
		message: "Limpeza de retenção de dados concluída com sucesso.",
	});
}

export const GET = appApiHandler({ GET: retentionCleanupRoute });
