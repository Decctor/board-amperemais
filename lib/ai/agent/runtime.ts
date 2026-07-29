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
import { listActiveProductGroups } from "../shared/product-groups";
import { isToolEnabled } from "../tools/guards";
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
	const agent = await database.query.aiAgents.findFirst({ where: eq(aiAgents.organizacaoId, organizacaoId) });
	if (!agent) throw new AgentInactiveError("A organização não possui um agente de IA configurado.");
	if (agent.status !== "ATIVO") throw new AgentInactiveError("O agente de IA da organização está pausado.");

	const modeloConfig = parseJsonbWithFallback(AiAgentModeloConfigSchema, agent.modeloConfig);
	const capacidades = parseJsonbWithFallback(AiAgentCapacidadesSchema, agent.capacidades);

	const runsToday = await countAgentRunsToday(database, organizacaoId);
	if (runsToday >= capacidades.limites.maxRunsDiarios) {
		throw new AgentDailyRunLimitError(`Limite diário de ${capacidades.limites.maxRunsDiarios} execuções do agente atingido.`);
	}

	const [{ contexto: chatContext, clienteId }, knowledge, productGroups] = await Promise.all([
		buildChatRunContext(database, { organizacaoId, chatId }),
		getActiveKnowledgeBlocks(database, agent.id),
		// A grafia dos grupos entra no system prompt para o agente não filtrar por categoria
		// inexistente nem gastar uma tool call para descobrir o que a empresa vende.
		isToolEnabled(capacidades, "produtos.consultar") ? listActiveProductGroups(database, organizacaoId) : Promise.resolve([]),
	]);

	const run = await createAgentRun(database, {
		organizacaoId,
		agenteId: agent.id,
		gatilho,
		chatId,
		clienteId,
		mensagemGatilhoId,
		// Substitui o versionamento: o run carrega a configuração que o produziu.
		configSnapshot: {
			instrucoes: agent.instrucoes,
			modeloConfig,
			capacidades,
			conhecimento: knowledge.map((block) => ({ id: block.id, titulo: block.titulo })),
		},
		contextoEntradaSnapshot: chatContext,
	});

	return {
		run,
		toolContext: {
			db: database,
			organizacaoId,
			agent: { id: agent.id, nome: agent.nome },
			// A mensagem é a chave estável entre retries do mesmo evento; no playground não há
			// mensagem gatilho e o próprio run assume esse papel.
			run: { id: run.id, gatilho, mensagemGatilhoId: mensagemGatilhoId ?? null },
			chat: { id: chatId, clienteId },
			capacidades,
		},
		systemPrompt: buildAgentSystemPrompt({
			instrucoes: agent.instrucoes,
			capacidades,
			knowledgeContext: formatKnowledgeContext(knowledge),
			productGroups,
		}),
		turnPrompt: formatChatRunContext(chatContext),
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
		const loopAgent = new ToolLoopAgent({
			model: resolveLanguageModel(modeloConfig),
			instructions: prepared.systemPrompt,
			tools: toAISdkTools(toolContext),
			temperature: modeloConfig.temperatura,
			maxOutputTokens: modeloConfig.maxTokensSaida,
			topP: modeloConfig.topP,
			stopWhen: stepCountIs(prepared.maxSteps),
			output: Output.object({ schema: TurnOutputSchema }),
		});

		const result = await loopAgent.generate({ prompt: prepared.turnPrompt });
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
