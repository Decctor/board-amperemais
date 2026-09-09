import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getCurrentWeekWindow } from "@/lib/interactions/weekly-send-counters";
import { db } from "@/services/drizzle";
import { interactions, weeklySendCounters } from "@/services/drizzle/schema";
import { and, eq, gte, isNotNull, isNull, lte, sql } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

/**
 * Saúde operacional das campanhas para o dashboard: envios do dia por desfecho (falhas e bloqueios
 * por limite, separados de propósito) e a quota semanal consumida contra o limite da organização.
 * O cliente manda o início do "hoje" no seu fuso; a semana segue a chave do contador (fuso do cron).
 */
const GetCampaignsHealthInputSchema = z.object({
	dayStart: z
		.string({ required_error: "Início do dia não informado.", invalid_type_error: "Tipo inválido para o início do dia." })
		.datetime({ message: "Tipo inválido para o início do dia." })
		.transform((v) => new Date(v)),
});
export type TGetCampaignsHealthInput = z.infer<typeof GetCampaignsHealthInputSchema>;

async function getCampaignsHealth({ input, session }: { input: TGetCampaignsHealthInput; session: TAuthUserSession }) {
	const membership = session.membership;
	if (!membership) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");
	if (!membership.organizacao.configuracao.recursos.campanhas.acesso)
		throw new createHttpError.Forbidden("Sua organização não possui acesso a campanhas.");
	const organizacaoId = membership.organizacao.id;

	const dayEnd = new Date(input.dayStart.getTime() + 24 * 60 * 60 * 1000);
	const { weekKey } = getCurrentWeekWindow();

	const [porStatus, counter] = await Promise.all([
		db
			.select({ statusEnvio: interactions.statusEnvio, qtde: sql<number>`count(*)` })
			.from(interactions)
			.where(
				and(
					eq(interactions.organizacaoId, organizacaoId),
					isNotNull(interactions.campanhaId),
					gte(interactions.dataExecucao, input.dayStart),
					lte(interactions.dataExecucao, dayEnd),
				),
			)
			.groupBy(interactions.statusEnvio),
		db.query.weeklySendCounters.findFirst({
			where: and(
				eq(weeklySendCounters.organizacaoId, organizacaoId),
				isNull(weeklySendCounters.campanhaId),
				eq(weeklySendCounters.semanaChave, weekKey),
			),
			columns: { usados: true },
		}),
	]);

	const countOf = (status: string) => Number(porStatus.find((row) => row.statusEnvio === status)?.qtde ?? 0);
	const hoje = {
		total: porStatus.reduce((acc, row) => acc + Number(row.qtde), 0),
		falhas: countOf("FALHOU"),
		bloqueadas: countOf("BLOQUEADA"),
		pendentes: countOf("PENDENTE"),
	};

	return {
		data: {
			hoje,
			quotaSemanal: {
				semanaChave: weekKey,
				usados: counter?.usados ?? 0,
				limite: membership.organizacao.configuracao.preferencias.limiteMensagensSemanaisViaCampanhas ?? null,
			},
		},
		message: "Saúde das campanhas recuperada com sucesso.",
	};
}
export type TGetCampaignsHealthOutput = Awaited<ReturnType<typeof getCampaignsHealth>>;

async function getCampaignsHealthRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const input = GetCampaignsHealthInputSchema.parse({ dayStart: request.nextUrl.searchParams.get("dayStart") });
	const result = await getCampaignsHealth({ input, session });
	return NextResponse.json(result);
}

export const GET = appApiHandler({ GET: getCampaignsHealthRoute });
