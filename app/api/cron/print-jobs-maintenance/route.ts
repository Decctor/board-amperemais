import { appApiHandler } from "@/lib/app-api";
import { assertCronAuthorized } from "@/lib/cron/assert-cron-authorized";
import { PRINT_JOB_MAX_TENTATIVAS } from "@/lib/desktop-agent/print-jobs";
import { db } from "@/services/drizzle";
import { printJobs } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { and, eq, gte, inArray, lt, or } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// Manutenção diária da fila de impressão (plano: ciclo de vida do job):
// 1. PROCESSANDO com lease vencida e tentativas esgotadas → ERRO (reimpressão é decisão humana);
// 2. PENDENTE (ou PROCESSANDO retomável) além do TTL → EXPIRADO;
// 3. purga de jobs terminais com mais de 90 dias (mesma retenção do access-cleanup).
const PURGE_RETENTION_DAYS = 90;
const TERMINAL_STATUSES = ["IMPRESSO", "ERRO", "CANCELADO", "EXPIRADO"] as const;

async function printJobsMaintenanceRoute(request: NextRequest) {
	assertCronAuthorized(request);
	const now = new Date();

	// 1. Tentativas esgotadas sem confirmação: o modo de falha perigoso é "imprimiu mas não
	// reportou" — vira ERRO visível no dashboard em vez de voltar para a fila.
	const exhaustedJobs = await db
		.update(printJobs)
		.set({ status: "ERRO", erro: "Tentativas de impressão esgotadas sem confirmação do agente.", dataConclusao: now })
		.where(and(eq(printJobs.status, "PROCESSANDO"), lt(printJobs.leaseExpiraEm, now), gte(printJobs.numeroTentativas, PRINT_JOB_MAX_TENTATIVAS)))
		.returning({ id: printJobs.id });

	// 2. TTL vencido: cupom atrasado é pior que cupom nenhum.
	const expiredJobs = await db
		.update(printJobs)
		.set({ status: "EXPIRADO", dataConclusao: now })
		.where(
			and(
				or(eq(printJobs.status, "PENDENTE"), and(eq(printJobs.status, "PROCESSANDO"), lt(printJobs.leaseExpiraEm, now))),
				lt(printJobs.expiraEm, now),
			),
		)
		.returning({ id: printJobs.id });

	// 3. Purga de terminais antigos.
	const purgeCutoff = dayjs().subtract(PURGE_RETENTION_DAYS, "days").toDate();
	const purgedJobs = await db
		.delete(printJobs)
		.where(and(inArray(printJobs.status, [...TERMINAL_STATUSES]), lt(printJobs.dataInsercao, purgeCutoff)))
		.returning({ id: printJobs.id });

	console.log(
		`[PRINT_JOBS_MAINTENANCE] ${exhaustedJobs.length} com tentativas esgotadas, ${expiredJobs.length} expirados, ${purgedJobs.length} purgados.`,
	);

	return NextResponse.json({
		data: {
			tentativasEsgotadas: exhaustedJobs.length,
			expirados: expiredJobs.length,
			purgados: purgedJobs.length,
		},
		message: "Manutenção da fila de impressão concluída com sucesso.",
	});
}

export const GET = appApiHandler({ GET: printJobsMaintenanceRoute });
