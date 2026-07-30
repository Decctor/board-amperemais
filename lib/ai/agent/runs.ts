import type { TAiAgentConfigSnapshot, TAiAgentUso } from "@/schemas/ai-agents";
import type { TAiAgentRunGatilhoEnum } from "@/schemas/enums";
import type { DB, DBTransaction } from "@/services/drizzle";
import { aiAgentRuns } from "@/services/drizzle/schema";
import { and, count, eq, gte } from "drizzle-orm";

type TDb = DB | DBTransaction;

/** Ciclo de vida de uma execução do agente. Toda transição de status passa por aqui. */

export async function createAgentRun(
	db: TDb,
	input: {
		organizacaoId: string;
		agenteId: string;
		gatilho: TAiAgentRunGatilhoEnum;
		chatId: string;
		clienteId: string;
		mensagemGatilhoId?: string | null;
		configSnapshot: TAiAgentConfigSnapshot;
		contextoEntradaSnapshot?: unknown;
	},
) {
	const [run] = await db
		.insert(aiAgentRuns)
		.values({
			organizacaoId: input.organizacaoId,
			agenteId: input.agenteId,
			status: "PENDENTE",
			gatilho: input.gatilho,
			chatId: input.chatId,
			clienteId: input.clienteId,
			mensagemGatilhoId: input.mensagemGatilhoId ?? null,
			configSnapshot: input.configSnapshot,
			contextoEntradaSnapshot: input.contextoEntradaSnapshot ?? null,
		})
		.returning({ id: aiAgentRuns.id });

	if (!run) throw new Error("Erro ao registrar a execução do agente.");
	return run;
}

export async function markAgentRunRunning(db: TDb, runId: string) {
	await db.update(aiAgentRuns).set({ status: "RODANDO", dataInicio: new Date() }).where(eq(aiAgentRuns.id, runId));
}

export async function completeAgentRun(db: TDb, input: { runId: string; outputResumo?: string | null; uso?: TAiAgentUso | null }) {
	await db
		.update(aiAgentRuns)
		.set({ status: "CONCLUIDO", outputResumo: input.outputResumo ?? null, uso: input.uso ?? null, dataFim: new Date() })
		.where(eq(aiAgentRuns.id, input.runId));
}

export async function failAgentRun(db: TDb, input: { runId: string; erro: string }) {
	await db.update(aiAgentRuns).set({ status: "FALHA", erro: input.erro, dataFim: new Date() }).where(eq(aiAgentRuns.id, input.runId));
}

/** Vínculo canônico execução → mensagem entregue ao cliente. */
export async function linkAgentRunMessage(db: TDb, input: { runId: string; mensagemId: string }) {
	await db.update(aiAgentRuns).set({ mensagemEnviadaId: input.mensagemId }).where(eq(aiAgentRuns.id, input.runId));
}

/** Freio de custo por organização (`capacidades.limites.maxRunsDiarios`). */
export async function countAgentRunsToday(db: TDb, organizacaoId: string): Promise<number> {
	const inicioDoDia = new Date();
	inicioDoDia.setHours(0, 0, 0, 0);

	const [row] = await db
		.select({ total: count() })
		.from(aiAgentRuns)
		.where(and(eq(aiAgentRuns.organizacaoId, organizacaoId), gte(aiAgentRuns.dataInsercao, inicioDoDia)));

	return Number(row?.total ?? 0);
}
