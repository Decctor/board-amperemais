import { createCampaignSuggestionHint, createCampaignUpdateSuggestionHint } from "@/lib/ai-hints/service";
import { AIHintSchema, type TAIHint } from "@/schemas/ai-hints";
import { createMarketingAnalystAgent, createMarketingExecutorAgent } from "./agent";
import { getCampaignsPerformanceContext } from "./context";
import {
	MARKETING_ANALYST_SYSTEM_PROMPT,
	MARKETING_EXECUTOR_SYSTEM_PROMPT,
	buildMarketingAnalysisPrompt,
	buildMarketingExecutorPrompt,
} from "./prompts";
import {
	MarketingAgentInputSchema,
	MarketingAgentMetadataSchema,
	MarketingSuggestionSchema,
	type TMarketingAgentInput,
	type TMarketingAgentMetadata,
	type TMarketingAnalystOutput,
	type TMarketingSuggestion,
} from "./schemas";
import { ensureOrganizationExists } from "./suggestions";
import { createMarketingAnalystTools, createMarketingExecutorTools } from "./tools";

export type TMarketingAgentOutput = {
	status: "analysis-only" | "campaign-creation-suggestion" | "campaign-updates-suggestion" | "needs-user-input";
	message: string;
	inferredIntent: "analyze-org" | "analyze-campaign" | "create-campaign" | "update-campaign" | "unknown";
	insights: string[];
	missingInformation: string[];
	suggestion: TMarketingSuggestion | null;
	hint: TAIHint | null;
	metadata: TMarketingAgentMetadata;
};

type TStepTiming = {
	phase: "analyst" | "executor";
	step: number;
	durationMs: number;
	elapsedMs: number;
	toolCalls: string[];
};

function isActionableSuggestionStatus(status: TMarketingAgentOutput["status"]) {
	return status === "campaign-creation-suggestion" || status === "campaign-updates-suggestion";
}

function shouldRunExecutor({
	analystOutput,
	requireActionableSuggestion,
}: {
	analystOutput: TMarketingAnalystOutput;
	requireActionableSuggestion: boolean;
}) {
	return (
		requireActionableSuggestion ||
		isActionableSuggestionStatus(analystOutput.status) ||
		analystOutput.recommendedAction.suggestionType !== null
	);
}

function getElapsedMs(startedAt: number) {
	return Date.now() - startedAt;
}

function logMarketingAgent(event: string, payload: Record<string, unknown>) {
	console.log(`[INFO] [MARKETING_AGENT] [${event}]`, payload);
}

function logMarketingAgentError(event: string, payload: Record<string, unknown>) {
	console.error(`[ERROR] [MARKETING_AGENT] [${event}]`, payload);
}

function dedupeStrings(values: string[]) {
	return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function getValidatedSuggestionFromExecutorSteps(toolResults: Array<{ output: unknown }>) {
	let suggestion: TMarketingSuggestion | null = null;

	for (const toolResult of toolResults) {
		const parsedSuggestion = MarketingSuggestionSchema.safeParse(toolResult.output);
		if (parsedSuggestion.success) {
			suggestion = parsedSuggestion.data;
		}
	}

	return suggestion;
}

function buildHintPayload({
	organizacaoId,
	suggestion,
	message,
	insights,
	metadata,
}: {
	organizacaoId: string;
	suggestion: TMarketingSuggestion;
	message: string;
	insights: string[];
	metadata: TMarketingAgentMetadata;
}) {
	if (suggestion.tipo === "campaign-creation-suggestion") {
		return createCampaignSuggestionHint({
			organizacaoId,
			suggestion: suggestion.payload,
			resumoExecutivo: message,
			criterios: insights,
			modeloUtilizado: metadata.model,
			tokensUtilizados: metadata.tokensUsed,
		});
	}

	return createCampaignUpdateSuggestionHint({
		organizacaoId,
		suggestion: suggestion.payload,
		resumoExecutivo: message,
		criterios: insights,
		modeloUtilizado: metadata.model,
		tokensUtilizados: metadata.tokensUsed,
	});
}

export async function runMarketingAgent(rawInput: TMarketingAgentInput): Promise<TMarketingAgentOutput> {
	const input = MarketingAgentInputSchema.parse(rawInput);
	const traceId = input.traceId ?? crypto.randomUUID();
	const startedAt = Date.now();

	logMarketingAgent("START", {
		traceId,
		organizacaoId: input.organizacaoId,
		campaignId: input.campaignId ?? null,
		persistSuggestion: input.persistSuggestion,
		requireActionableSuggestion: input.requireActionableSuggestion,
		debug: input.debug,
		briefLength: input.brief.length,
	});

	try {
		const organizationValidationStartedAt = Date.now();
		await ensureOrganizationExists(input.organizacaoId);
		const organizationValidationDurationMs = getElapsedMs(organizationValidationStartedAt);

		logMarketingAgent("ORGANIZATION_VALIDATED", {
			traceId,
			organizacaoId: input.organizacaoId,
			durationMs: organizationValidationDurationMs,
		});

		const contextStartedAt = Date.now();
		const context = await getCampaignsPerformanceContext(input.organizacaoId);
		const contextDurationMs = getElapsedMs(contextStartedAt);

		logMarketingAgent("CONTEXT_READY", {
			traceId,
			organizacaoId: input.organizacaoId,
			durationMs: contextDurationMs,
			campaignsCount: context.campanhas.length,
			whatsappPhonesCount: context.telefonesWhatsappDisponiveis.length,
		});

		const toolsUsed = new Set<string>();
		const stepTimings: TStepTiming[] = [];
		let totalStepCount = 0;

		const analystTools = createMarketingAnalystTools({
			organizacaoId: input.organizacaoId,
		});
		const analystAgent = createMarketingAnalystAgent({
			tools: analystTools,
			instructions: MARKETING_ANALYST_SYSTEM_PROMPT,
		});
		let analystStepCount = 0;
		const analystExecutionStartedAt = Date.now();
		let lastAnalystStepFinishedAt = analystExecutionStartedAt;

		logMarketingAgent("ANALYST_STARTED", {
			traceId,
			organizacaoId: input.organizacaoId,
		});

		const analystResult = await analystAgent.generate({
			prompt: buildMarketingAnalysisPrompt({
				brief: input.brief,
				campaignId: input.campaignId,
				context,
				requireActionableSuggestion: input.requireActionableSuggestion,
			}),
			onStepFinish: ({ toolCalls }) => {
				analystStepCount += 1;
				totalStepCount += 1;
				for (const toolCall of toolCalls) {
					toolsUsed.add(toolCall.toolName);
				}

				const now = Date.now();
				const durationMs = now - lastAnalystStepFinishedAt;
				const elapsedMs = now - analystExecutionStartedAt;
				const toolCallNames = toolCalls.map((toolCall) => toolCall.toolName);

				lastAnalystStepFinishedAt = now;
				stepTimings.push({
					phase: "analyst",
					step: analystStepCount,
					durationMs,
					elapsedMs,
					toolCalls: toolCallNames,
				});

				logMarketingAgent("ANALYST_STEP_FINISHED", {
					traceId,
					step: analystStepCount,
					durationMs,
					elapsedMs,
					toolCalls: toolCallNames,
				});
			},
		});
		const analystExecutionDurationMs = getElapsedMs(analystExecutionStartedAt);

		if (!analystResult.output) {
			throw new Error("O analista de marketing não retornou uma resposta estruturada.");
		}

		logMarketingAgent("ANALYST_COMPLETED", {
			traceId,
			durationMs: analystExecutionDurationMs,
			steps: analystStepCount,
			tokensUsed: analystResult.usage.totalTokens ?? 0,
			status: analystResult.output.status,
			inferredIntent: analystResult.output.inferredIntent,
			recommendedAction: analystResult.output.recommendedAction,
			toolsUsed: Array.from(toolsUsed),
		});

		let executorExecutionDurationMs = 0;
		let executorStepCount = 0;
		let executorTokensUsed = 0;
		let executorMessage: string | null = null;
		let executorSuggestionType: "campaign-creation-suggestion" | "campaign-updates-suggestion" | null = null;
		let validatedSuggestion: TMarketingSuggestion | null = null;

		if (shouldRunExecutor({ analystOutput: analystResult.output, requireActionableSuggestion: input.requireActionableSuggestion })) {
			const executorTools = createMarketingExecutorTools({
				organizacaoId: input.organizacaoId,
			});
			const executorAgent = createMarketingExecutorAgent({
				tools: executorTools,
				instructions: MARKETING_EXECUTOR_SYSTEM_PROMPT,
			});
			const executorToolResults: Array<{ output: unknown }> = [];
			const executorExecutionStartedAt = Date.now();
			let lastExecutorStepFinishedAt = executorExecutionStartedAt;

			logMarketingAgent("EXECUTOR_STARTED", {
				traceId,
				organizacaoId: input.organizacaoId,
				analystStatus: analystResult.output.status,
				recommendedAction: analystResult.output.recommendedAction,
			});

			const executorResult = await executorAgent.generate({
				prompt: buildMarketingExecutorPrompt({
					brief: input.brief,
					campaignId: input.campaignId,
					context,
					analystOutput: analystResult.output,
					requireActionableSuggestion: input.requireActionableSuggestion,
				}),
				onStepFinish: ({ toolCalls, toolResults }) => {
					executorStepCount += 1;
					totalStepCount += 1;
					for (const toolCall of toolCalls) {
						toolsUsed.add(toolCall.toolName);
					}
					for (const toolResult of toolResults) {
						executorToolResults.push({ output: toolResult.output });
					}

					const suggestionFromStep = getValidatedSuggestionFromExecutorSteps(toolResults);
					if (suggestionFromStep) {
						validatedSuggestion = suggestionFromStep;
						logMarketingAgent("SUGGESTION_VALIDATED_FROM_TOOL", {
							traceId,
							step: executorStepCount,
							suggestionType: suggestionFromStep.tipo,
						});
					}

					const now = Date.now();
					const durationMs = now - lastExecutorStepFinishedAt;
					const elapsedMs = now - executorExecutionStartedAt;
					const toolCallNames = toolCalls.map((toolCall) => toolCall.toolName);

					lastExecutorStepFinishedAt = now;
					stepTimings.push({
						phase: "executor",
						step: executorStepCount,
						durationMs,
						elapsedMs,
						toolCalls: toolCallNames,
					});

					logMarketingAgent("EXECUTOR_STEP_FINISHED", {
						traceId,
						step: executorStepCount,
						durationMs,
						elapsedMs,
						toolCalls: toolCallNames,
					});
				},
			});

			executorExecutionDurationMs = getElapsedMs(executorExecutionStartedAt);
			executorTokensUsed = executorResult.usage.totalTokens ?? 0;

			if (!executorResult.output) {
				throw new Error("O executor de marketing não retornou uma resposta estruturada.");
			}

			executorMessage = executorResult.output.message;
			executorSuggestionType = executorResult.output.suggestionType;
			validatedSuggestion = validatedSuggestion ?? getValidatedSuggestionFromExecutorSteps(executorToolResults);

			logMarketingAgent("EXECUTOR_COMPLETED", {
				traceId,
				durationMs: executorExecutionDurationMs,
				steps: executorStepCount,
				tokensUsed: executorTokensUsed,
				suggestionType: executorSuggestionType,
				hasSuggestion: Boolean(validatedSuggestion),
				toolsUsed: Array.from(toolsUsed),
			});

			if (executorSuggestionType && !validatedSuggestion) {
				throw new Error("O executor de marketing não retornou uma sugestão validada.");
			}
		} else {
			logMarketingAgent("EXECUTOR_SKIPPED", {
				traceId,
				status: analystResult.output.status,
				recommendedAction: analystResult.output.recommendedAction,
			});
		}

		if (input.requireActionableSuggestion && !validatedSuggestion) {
			throw new Error("O agente de marketing não conseguiu gerar uma sugestão acionável para este contexto.");
		}

		const finalStatus = validatedSuggestion?.tipo ?? analystResult.output.status;
		if (input.requireActionableSuggestion && !isActionableSuggestionStatus(finalStatus)) {
			throw new Error("O agente de marketing não conseguiu gerar uma sugestão acionável para este contexto.");
		}

		const metadata = MarketingAgentMetadataSchema.parse({
			model: "openai/gpt-5.4-mini",
			steps: totalStepCount,
			tokensUsed: (analystResult.usage.totalTokens ?? 0) + executorTokensUsed,
			toolsUsed: Array.from(toolsUsed),
		});

		const finalMessage = validatedSuggestion ? (executorMessage ?? analystResult.output.message) : analystResult.output.message;
		const finalInsights = dedupeStrings(analystResult.output.insights);
		const finalMissingInformation = dedupeStrings(analystResult.output.missingInformation);

		let hint: TAIHint | null = null;
		let hintPersistenceDurationMs = 0;
		if (input.persistSuggestion && validatedSuggestion && isActionableSuggestionStatus(finalStatus)) {
			const hintPersistenceStartedAt = Date.now();
			const createdHint = await buildHintPayload({
				organizacaoId: input.organizacaoId,
				suggestion: validatedSuggestion,
				message: finalMessage,
				insights: finalInsights,
				metadata,
			});
			hint = AIHintSchema.parse(createdHint);
			hintPersistenceDurationMs = getElapsedMs(hintPersistenceStartedAt);

			logMarketingAgent("HINT_PERSISTED", {
				traceId,
				durationMs: hintPersistenceDurationMs,
				hintId: hint.id,
				hintType: hint.tipo,
			});
		}

		const totalDurationMs = getElapsedMs(startedAt);

		logMarketingAgent("COMPLETED", {
			traceId,
			status: finalStatus,
			inferredIntent: analystResult.output.inferredIntent,
			hasSuggestion: Boolean(validatedSuggestion),
			hintPersisted: Boolean(hint),
			durations: {
				totalDurationMs,
				organizationValidationDurationMs,
				contextDurationMs,
				analystExecutionDurationMs,
				executorExecutionDurationMs,
				hintPersistenceDurationMs,
			},
			stepTimings,
			tokensUsed: metadata.tokensUsed,
			toolsUsed: metadata.toolsUsed,
		});

		return {
			status: finalStatus,
			message: finalMessage,
			inferredIntent: analystResult.output.inferredIntent,
			insights: finalInsights,
			missingInformation: finalMissingInformation,
			suggestion: validatedSuggestion,
			hint,
			metadata,
		};
	} catch (error) {
		logMarketingAgentError("FAILED", {
			traceId,
			organizacaoId: input.organizacaoId,
			campaignId: input.campaignId ?? null,
			durationMs: getElapsedMs(startedAt),
			error,
		});

		throw error;
	}
}

export * from "./context";
export * from "./schemas";
export * from "./tools";
