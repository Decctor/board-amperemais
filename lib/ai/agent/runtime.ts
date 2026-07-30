import { AiAgentCapacidadesSchema, AiAgentModeloConfigSchema, type TAiAgentTurnOutput } from "@/schemas/ai-agents";
import type { TAiAgentRunGatilhoEnum } from "@/schemas/enums";
import { db } from "@/services/drizzle";
import type { DB, DBTransaction } from "@/services/drizzle";
import { aiAgents } from "@/services/drizzle/schema";
import { NoObjectGeneratedError, Output, ToolLoopAgent, stepCountIs, type LanguageModelUsage } from "ai";
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
import { mergeRunSummary } from "./run-memory";
import { completeAgentRun, countAgentRunsToday, createAgentRun, failAgentRun, markAgentRunRunning } from "./runs";
import { shouldRetryDeferredAction } from "./turn-validation";

type TDb = DB | DBTransaction;
const STRUCTURED_OUTPUT_FALLBACK_MODEL = "openai/gpt-5-mini";

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
	previousSummary: string | null;
};

function combineUsage(usages: Array<Partial<LanguageModelUsage> | undefined>): Partial<LanguageModelUsage> | undefined {
	const defined = usages.filter((usage): usage is Partial<LanguageModelUsage> => usage !== undefined);
	if (defined.length === 0) return undefined;
	const sum = (key: "inputTokens" | "outputTokens" | "totalTokens") => {
		const values = defined.map((usage) => usage[key]).filter((value): value is number => typeof value === "number");
		return values.length > 0 ? values.reduce((total, value) => total + value, 0) : undefined;
	};
	return { inputTokens: sum("inputTokens"), outputTokens: sum("outputTokens"), totalTokens: sum("totalTokens") };
}

function formatRunError(error: unknown): string {
	if (!NoObjectGeneratedError.isInstance(error)) return error instanceof Error ? error.message : String(error);
	const cause = error.cause instanceof Error ? error.cause.message : error.cause ? String(error.cause) : null;
	return [error.message, error.finishReason ? `finishReason=${error.finishReason}` : null, cause ? `causa=${cause}` : null]
		.filter(Boolean)
		.join(" | ");
}

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
	const latestClientMessage =
		chatContext.conversa
			.slice()
			.reverse()
			.find((message) => message.autor === "Cliente")?.texto ?? "";

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
			turn: { ultimaMensagemCliente: latestClientMessage },
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
		// A saída estruturada ocupa uma etapa adicional depois do último resultado de ferramenta.
		// O limite real de chamadas é aplicado no adapter das ferramentas.
		maxSteps: capacidades.limites.maxChamadasFerramentasPorRun + 1,
		previousSummary: chatContext.atendimento?.resumo ?? null,
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
		const tools = toAISdkTools(toolContext);
		const results: Array<{ steps: Array<{ toolCalls: unknown[]; toolResults: Array<{ toolName: string; output: unknown }> }> }> = [];
		const usages: Array<Partial<LanguageModelUsage> | undefined> = [];
		const usedModels: string[] = [];

		const generate = async ({
			modelConfig,
			prompt,
		}: {
			modelConfig: ReturnType<typeof AiAgentModeloConfigSchema.parse>;
			prompt: string;
		}) => {
			usedModels.push(modelConfig.modelo);
			const loopAgent = new ToolLoopAgent({
				model: resolveLanguageModel(modelConfig),
				instructions: prepared.systemPrompt,
				tools,
				temperature: modelConfig.temperatura,
				maxOutputTokens: modelConfig.maxTokensSaida,
				topP: modelConfig.topP,
				stopWhen: stepCountIs(prepared.maxSteps),
				output: Output.object({ schema: TurnOutputSchema }),
			});
			const result = await loopAgent.generate({ prompt });
			usages.push(result.totalUsage);
			results.push(result);
			return result;
		};

		const generateWithFallback = async (
			prompt: string,
			preferredConfig: ReturnType<typeof AiAgentModeloConfigSchema.parse> = modeloConfig,
		) => {
			try {
				return await generate({ modelConfig: preferredConfig, prompt });
			} catch (error) {
				if (!NoObjectGeneratedError.isInstance(error) || preferredConfig.modelo === STRUCTURED_OUTPUT_FALLBACK_MODEL) throw error;
				usages.push(error.usage);
				console.warn(
					`[AI_AGENT] Saída estruturada inválida no modelo ${preferredConfig.modelo}; repetindo com ${STRUCTURED_OUTPUT_FALLBACK_MODEL}.`,
				);
				return generate({
					modelConfig: { ...preferredConfig, modelo: STRUCTURED_OUTPUT_FALLBACK_MODEL },
					prompt: `${prompt}\n\nA tentativa anterior não respeitou o formato estruturado exigido. Responda exatamente no schema solicitado.`,
				});
			}
		};

		let result = await generateWithFallback(prepared.turnPrompt);
		let output = result.output;
		if (!output) throw new Error("O agente não produziu uma resposta estruturada.");

		if (shouldRetryDeferredAction(output.mensagem, result.steps.flatMap((step) => step.toolCalls.map((toolCall) => toolCall.toolName)))) {
			const rejectedMessage = output.mensagem;
			result = await generateWithFallback(
				`${prepared.turnPrompt}

## Correção obrigatória
A resposta anterior foi rejeitada porque prometeu uma ação sem executar ferramenta:
${JSON.stringify(rejectedMessage)}

Execute a ferramenta nesta execução ou pergunte objetivamente o único dado que ainda falta. Não prometa executar depois.`,
				{ ...modeloConfig, modelo: STRUCTURED_OUTPUT_FALLBACK_MODEL },
			);
			output = result.output;
			if (!output) throw new Error("O agente não produziu uma resposta estruturada após a correção.");
			if (shouldRetryDeferredAction(output.mensagem, result.steps.flatMap((step) => step.toolCalls.map((toolCall) => toolCall.toolName)))) {
				throw new Error("O agente tentou encerrar novamente com uma promessa de ação sem executar ferramenta.");
			}
		}

		const toolResults = results.flatMap((generation) => generation.steps.flatMap((step) => step.toolResults));
		const finalOutput: TAiAgentTurnOutput = {
			...output,
			resumoAtendimento: mergeRunSummary({
				modelSummary: output.resumoAtendimento,
				previousSummary: prepared.previousSummary,
				toolResults,
			}),
		};

		await completeAgentRun(toolContext.db, {
			runId: run.id,
			outputResumo: finalOutput.resumoAtendimento,
			uso: normalizeAiUsage(combineUsage(usages), [...new Set(usedModels)].join(" -> ")),
		});

		return finalOutput;
	} catch (error) {
		await failAgentRun(toolContext.db, { runId: run.id, erro: formatRunError(error) });
		throw error;
	}
}
