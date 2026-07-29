import { AiAgentCapacidadesSchema, AiAgentModeloConfigSchema, type TAiAgentTurnOutput } from "@/schemas/ai-agents";
import type { TAiAgentRunGatilhoEnum } from "@/schemas/enums";
import { db } from "@/services/drizzle";
import type { DB, DBTransaction } from "@/services/drizzle";
import { aiAgents } from "@/services/drizzle/schema";
import { Output, ToolLoopAgent, stepCountIs } from "ai";
import { eq } from "drizzle-orm";
import z from "zod";
import { resolveLanguageModel } from "../providers/language";
import { normalizeAiUsage } from "../providers/usage";
import { AgentDailyRunLimitError, AgentInactiveError } from "../shared/errors";
import { parseJsonbWithFallback } from "../shared/json";
import { toAISdkTools } from "../tools/registry";
import type { TAgentToolContext } from "../tools/types";
import { buildChatRunContext, formatChatRunContext } from "./context";
import { formatKnowledgeContext, getActiveKnowledgeBlocks } from "./knowledge";
import { buildAgentSystemPrompt } from "./prompts";
import { completeAgentRun, countAgentRunsToday, createAgentRun, failAgentRun, markAgentRunRunning } from "./runs";

type TDb = DB | DBTransaction;

const TurnOutputSchema = z.object({
	mensagem: z
		.string()
		.nullable()
		.describe("Mensagem a enviar ao cliente no WhatsApp: 3 a 5 frases curtas, no máximo 1 emoji. null quando não houver nada a enviar agora."),
	resumoAtendimento: z.string().describe("Resumo interno do estado do atendimento, para a equipe. Não é visto pelo cliente."),
});

export type TPreparedAgentExecution = {
	run: { id: string };
	toolContext: TAgentToolContext;
	systemPrompt: string;
	turnPrompt: string;
	modeloConfig: ReturnType<typeof AiAgentModeloConfigSchema.parse>;
	maxSteps: number;
};

/**
 * Fase 1 do runtime: carrega e valida o agente, checa limites, monta contexto e abre o run.
 *
 * As validações aqui são defesa em profundidade — o webhook já checou status e capacidade
 * antes de chegar até aqui, mas a configuração pode mudar no intervalo, e o playground entra
 * por outro caminho.
 */
export async function prepareAgentExecution({
	organizacaoId,
	chatId,
	gatilho,
	mensagemGatilhoId,
	database = db,
}: {
	organizacaoId: string;
	chatId: string;
	gatilho: TAiAgentRunGatilhoEnum;
	mensagemGatilhoId?: string | null;
	database?: TDb;
}): Promise<TPreparedAgentExecution> {
	const agente = await database.query.aiAgents.findFirst({ where: eq(aiAgents.organizacaoId, organizacaoId) });
	if (!agente) throw new AgentInactiveError("A organização não possui um agente de IA configurado.");
	if (agente.status !== "ATIVO") throw new AgentInactiveError("O agente de IA da organização está pausado.");

	const modeloConfig = parseJsonbWithFallback(AiAgentModeloConfigSchema, agente.modeloConfig);
	const capacidades = parseJsonbWithFallback(AiAgentCapacidadesSchema, agente.capacidades);

	const runsHoje = await countAgentRunsToday(database, organizacaoId);
	if (runsHoje >= capacidades.limites.maxRunsDiarios) {
		throw new AgentDailyRunLimitError(`Limite diário de ${capacidades.limites.maxRunsDiarios} execuções do agente atingido.`);
	}

	const [{ contexto, clienteId }, conhecimento] = await Promise.all([
		buildChatRunContext(database, { organizacaoId, chatId }),
		getActiveKnowledgeBlocks(database, agente.id),
	]);

	const run = await createAgentRun(database, {
		organizacaoId,
		agenteId: agente.id,
		gatilho,
		chatId,
		clienteId,
		mensagemGatilhoId,
		// Substitui o versionamento: o run carrega a configuração que o produziu.
		configSnapshot: {
			instrucoes: agente.instrucoes,
			modeloConfig,
			capacidades,
			conhecimento: conhecimento.map((bloco) => ({ id: bloco.id, titulo: bloco.titulo })),
		},
		contextoEntradaSnapshot: contexto,
	});

	return {
		run,
		toolContext: {
			db: database,
			organizacaoId,
			agent: { id: agente.id, nome: agente.nome },
			run: { id: run.id, gatilho },
			chat: { id: chatId, clienteId },
			capacidades,
		},
		systemPrompt: buildAgentSystemPrompt({
			instrucoes: agente.instrucoes,
			capacidades,
			knowledgeContext: formatKnowledgeContext(conhecimento),
		}),
		turnPrompt: formatChatRunContext(contexto),
		modeloConfig,
		maxSteps: capacidades.limites.maxChamadasFerramentasPorRun,
	};
}

/**
 * Fase 2 do runtime: executa o turno e fecha o run.
 *
 * Não há fallback de texto: uma falha marca o run como FALHA e sobe o erro. O caminho antigo
 * respondia "estou com dificuldades técnicas" ao cliente, o que escondia o problema e gastava
 * a janela de conversa com uma mensagem inútil.
 */
export async function executeAgentTurn(prepared: TPreparedAgentExecution): Promise<TAiAgentTurnOutput> {
	const { toolContext, run, modeloConfig } = prepared;

	await markAgentRunRunning(toolContext.db, run.id);

	try {
		const agent = new ToolLoopAgent({
			model: resolveLanguageModel(modeloConfig),
			instructions: prepared.systemPrompt,
			tools: toAISdkTools(toolContext),
			temperature: modeloConfig.temperatura,
			maxOutputTokens: modeloConfig.maxTokensSaida,
			topP: modeloConfig.topP,
			stopWhen: stepCountIs(prepared.maxSteps),
			output: Output.object({ schema: TurnOutputSchema }),
		});

		const result = await agent.generate({ prompt: prepared.turnPrompt });
		const output = result.output;
		if (!output) throw new Error("O agente não produziu uma resposta estruturada.");

		await completeAgentRun(toolContext.db, {
			runId: run.id,
			outputResumo: output.resumoAtendimento,
			uso: normalizeAiUsage(result.usage, modeloConfig.modelo),
		});

		return output;
	} catch (error) {
		await failAgentRun(toolContext.db, { runId: run.id, erro: error instanceof Error ? error.message : String(error) });
		throw error;
	}
}
