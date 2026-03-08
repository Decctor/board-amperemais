import { startCampaignFlowRun, triggerBatchFlow } from "@/lib/campaign-flows";
import { db } from "@/services/drizzle";
import { campaignFlows } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { and, eq } from "drizzle-orm";
import type { NextApiRequest, NextApiResponse } from "next";

const TIME_BLOCKS = ["00:00", "03:00", "06:00", "09:00", "12:00", "15:00", "18:00", "21:00"] as const;

function getCurrentTimeBlock(currentTime = dayjs()): (typeof TIME_BLOCKS)[number] {
	const currentHour = currentTime.hour();
	const currentMinute = currentTime.minute();
	const currentTotalMinutes = currentHour * 60 + currentMinute;

	const timeBlocksInMinutes = TIME_BLOCKS.map((block) => {
		const [hour, minute] = block.split(":").map(Number);
		return hour * 60 + minute;
	});

	let closestBlock = TIME_BLOCKS[0];
	for (let i = 0; i < timeBlocksInMinutes.length; i++) {
		if (timeBlocksInMinutes[i] <= currentTotalMinutes) {
			closestBlock = TIME_BLOCKS[i];
		} else {
			break;
		}
	}

	return closestBlock;
}

function shouldCampaignFlowRunToday(campaign: {
	recorrenciaTipo: string | null;
	recorrenciaIntervalo: number | null;
	recorrenciaDiasSemana: unknown;
	recorrenciaDiasMes: unknown;
	dataInsercao: Date;
}): boolean {
	const today = dayjs();
	const campaignStart = dayjs(campaign.dataInsercao);
	const interval = campaign.recorrenciaIntervalo || 1;

	switch (campaign.recorrenciaTipo) {
		case "DIARIO": {
			const daysDiff = today.startOf("day").diff(campaignStart.startOf("day"), "day");
			return daysDiff >= 0 && daysDiff % interval === 0;
		}
		case "SEMANAL": {
			const diasSemana = parseRecurrenceDays(campaign.recorrenciaDiasSemana);
			if (!diasSemana.includes(today.day())) return false;
			const weeksDiff = today.startOf("week").diff(campaignStart.startOf("week"), "week");
			return weeksDiff >= 0 && weeksDiff % interval === 0;
		}
		case "MENSAL": {
			const diasMes = parseRecurrenceDays(campaign.recorrenciaDiasMes);
			if (!diasMes.includes(today.date())) return false;
			const monthsDiff = today.startOf("month").diff(campaignStart.startOf("month"), "month");
			return monthsDiff >= 0 && monthsDiff % interval === 0;
		}
		default:
			return false;
	}
}

function parseRecurrenceDays(value: unknown): number[] {
	if (Array.isArray(value)) {
		return value.filter((item): item is number => typeof item === "number");
	}

	if (typeof value === "string") {
		try {
			const parsed = JSON.parse(value);
			if (Array.isArray(parsed)) {
				return parsed.filter((item): item is number => typeof item === "number");
			}
		} catch {
			return [];
		}
	}

	return [];
}

async function handleProcessRecurrentCampaignFlows(_req: NextApiRequest, res: NextApiResponse) {
	console.log("[INFO] [RECURRENT_CAMPAIGN_FLOWS] Iniciando processamento de campaign flows recorrentes.");

	try {
		const currentTimeBlock = getCurrentTimeBlock();
		const dedupWindowStart = dayjs().startOf("day").toDate();

		const recurrentFlows = await db.query.campaignFlows.findMany({
			where: and(eq(campaignFlows.status, "ATIVO"), eq(campaignFlows.tipo, "RECORRENTE"), eq(campaignFlows.recorrenciaBlocoHorario, currentTimeBlock)),
			columns: {
				id: true,
				organizacaoId: true,
				titulo: true,
				recorrenciaTipo: true,
				recorrenciaIntervalo: true,
				recorrenciaDiasSemana: true,
				recorrenciaDiasMes: true,
				dataInsercao: true,
			},
		});

		if (recurrentFlows.length === 0) {
			console.log(`[INFO] [RECURRENT_CAMPAIGN_FLOWS] Nenhum flow recorrente para o bloco ${currentTimeBlock}.`);
			return res.status(200).json({ message: "Nenhum flow recorrente para processar." });
		}

		const flowsToRun = recurrentFlows.filter((flow) => shouldCampaignFlowRunToday(flow));

		console.log(
			`[INFO] [RECURRENT_CAMPAIGN_FLOWS] Encontrados ${recurrentFlows.length} flows no bloco ${currentTimeBlock}; ${flowsToRun.length} elegíveis para hoje.`,
		);

		for (const flow of flowsToRun) {
			if (!flow.organizacaoId) {
				console.warn(`[WARN] [RECURRENT_CAMPAIGN_FLOWS] Flow ${flow.id} sem organizacaoId. Pulando.`);
				continue;
			}

			const batch = await triggerBatchFlow({
				campanhaId: flow.id,
				organizacaoId: flow.organizacaoId,
				dedupWindowStart,
			});

			if (batch.clientIds.length === 0) {
				console.log(`[INFO] [RECURRENT_CAMPAIGN_FLOWS] Flow ${flow.id} sem clientes elegíveis após deduplicação.`);
				continue;
			}

			console.log(
				`[INFO] [RECURRENT_CAMPAIGN_FLOWS] Disparando ${batch.clientIds.length} run(s) para flow ${flow.id} (${flow.titulo}). Execução ${batch.executionId}.`,
			);

			const chunkSize = 50;
			for (let i = 0; i < batch.clientIds.length; i += chunkSize) {
				const chunk = batch.clientIds.slice(i, i + chunkSize);
				const chunkResult = await Promise.allSettled(
					chunk.map((clienteId) =>
						startCampaignFlowRun({
							executionId: batch.executionId,
							campanhaId: flow.id,
							organizacaoId: flow.organizacaoId as string,
							clienteId,
							eventoMetadados: null,
						}),
					),
				);

				const rejected = chunkResult.filter((r) => r.status === "rejected").length;
				if (rejected > 0) {
					console.error(
						`[ERROR] [RECURRENT_CAMPAIGN_FLOWS] ${rejected}/${chunk.length} falhas ao iniciar runs no flow ${flow.id}, chunk ${i / chunkSize + 1}.`,
					);
				}
			}
		}

		return res.status(200).json({ message: "Campaign flows recorrentes processados com sucesso." });
	} catch (error) {
		console.error("[ERROR] [RECURRENT_CAMPAIGN_FLOWS] Erro fatal:", error);
		return res.status(500).json({
			error: "Falha ao processar campaign flows recorrentes.",
			message: error instanceof Error ? error.message : "Erro desconhecido.",
		});
	}
}

export default handleProcessRecurrentCampaignFlows;
