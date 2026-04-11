import { createCampaignSuggestionHint, createCampaignUpdateSuggestionHint } from "@/lib/ai-hints/service";
import { AIHintSchema, type TAIHint } from "@/schemas/ai-hints";
import { createMarketingAgent } from "./agent";
import { getCampaignsPerformanceContext } from "./context";
import { buildMarketingAgentPrompt, MARKETING_AGENT_SYSTEM_PROMPT } from "./prompts";
import {
	CampaignCreationSuggestionSchema,
	CampaignUpdateSuggestionSchema,
	MarketingAgentInputSchema,
	MarketingAgentMetadataSchema,
	MarketingSuggestionSchema,
	type TMarketingAgentInput,
	type TMarketingAgentMetadata,
	type TMarketingSuggestion,
} from "./schemas";
import { ensureOrganizationExists, normalizeCampaignCreationSuggestion, normalizeCampaignUpdateSuggestion } from "./suggestions";
import { createMarketingAgentTools } from "./tools";

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

function isActionableSuggestionStatus(status: TMarketingAgentOutput["status"]) {
	return status === "campaign-creation-suggestion" || status === "campaign-updates-suggestion";
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

async function parseGeneratedSuggestion({
	organizacaoId,
	suggestionType,
	suggestionJson,
}: {
	organizacaoId: string;
	suggestionType: "campaign-creation-suggestion" | "campaign-updates-suggestion" | null;
	suggestionJson: string | null;
}): Promise<TMarketingSuggestion | null> {
	if (!suggestionType || !suggestionJson) {
		return null;
	}

	const parsedPayload = JSON.parse(suggestionJson) as unknown;
	const parsedWrappedSuggestion = MarketingSuggestionSchema.safeParse(parsedPayload);
	const suggestionPayload =
		parsedWrappedSuggestion.success && parsedWrappedSuggestion.data.tipo === suggestionType
			? parsedWrappedSuggestion.data.payload
			: parsedPayload;

	if (suggestionType === "campaign-creation-suggestion") {
		const validatedPayload = CampaignCreationSuggestionSchema.parse(suggestionPayload);
		const normalizedPayload = await normalizeCampaignCreationSuggestion({
			organizacaoId,
			suggestion: validatedPayload,
		});

		return {
			tipo: suggestionType,
			payload: normalizedPayload,
		};
	}

	const validatedPayload = CampaignUpdateSuggestionSchema.parse(suggestionPayload);
	const normalizedPayload = await normalizeCampaignUpdateSuggestion({
		organizacaoId,
		suggestion: validatedPayload,
	});

	return {
		tipo: suggestionType,
		payload: normalizedPayload,
	};
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

		const tools = createMarketingAgentTools({
			organizacaoId: input.organizacaoId,
		});
		const agent = createMarketingAgent({
			tools,
			instructions: MARKETING_AGENT_SYSTEM_PROMPT,
		});
		const toolsUsed = new Set<string>();
		const stepTimings: Array<{
			step: number;
			durationMs: number;
			elapsedMs: number;
			toolCalls: string[];
		}> = [];
		let stepCount = 0;
		const agentExecutionStartedAt = Date.now();
		let lastStepFinishedAt = agentExecutionStartedAt;

		const result = await agent.generate({
			prompt: buildMarketingAgentPrompt({
				brief: input.brief,
				campaignId: input.campaignId,
				context,
				requireActionableSuggestion: input.requireActionableSuggestion,
			}),
			onStepFinish: ({ toolCalls }) => {
				stepCount += 1;
				for (const toolCall of toolCalls) {
					toolsUsed.add(toolCall.toolName);
				}

				const now = Date.now();
				const durationMs = now - lastStepFinishedAt;
				const elapsedMs = now - agentExecutionStartedAt;
				const toolCallNames = toolCalls.map((toolCall) => toolCall.toolName);

				lastStepFinishedAt = now;
				stepTimings.push({
					step: stepCount,
					durationMs,
					elapsedMs,
					toolCalls: toolCallNames,
				});

				logMarketingAgent("STEP_FINISHED", {
					traceId,
					step: stepCount,
					durationMs,
					elapsedMs,
					toolCalls: toolCallNames,
				});
			},
		});
		console.log("RESULT", result.output);
		const agentExecutionDurationMs = getElapsedMs(agentExecutionStartedAt);

		if (!result.output) {
			throw new Error("O agente de marketing não retornou uma resposta estruturada.");
		}

		if (input.requireActionableSuggestion && !isActionableSuggestionStatus(result.output.status)) {
			throw new Error("O agente de marketing não conseguiu gerar uma sugestão acionável para este contexto.");
		}

		logMarketingAgent("AGENT_GENERATION_COMPLETED", {
			traceId,
			durationMs: agentExecutionDurationMs,
			steps: stepCount,
			tokensUsed: result.usage.totalTokens ?? 0,
			toolsUsed: Array.from(toolsUsed),
		});

		const suggestionParsingStartedAt = Date.now();
		let normalizedSuggestion = await parseGeneratedSuggestion({
			organizacaoId: input.organizacaoId,
			suggestionType: result.output.suggestionType,
			suggestionJson: result.output.suggestionJson,
		});
		const suggestionParsingDurationMs = getElapsedMs(suggestionParsingStartedAt);

		if (!isActionableSuggestionStatus(result.output.status)) {
			normalizedSuggestion = null;
		}

		logMarketingAgent("SUGGESTION_PARSED", {
			traceId,
			durationMs: suggestionParsingDurationMs,
			suggestionType: result.output.suggestionType,
			hasSuggestion: Boolean(normalizedSuggestion),
		});

		const metadata = MarketingAgentMetadataSchema.parse({
			model: "openai/gpt-5.4-mini",
			steps: stepCount,
			tokensUsed: result.usage.totalTokens ?? 0,
			toolsUsed: Array.from(toolsUsed),
		});

		let hint: TAIHint | null = null;
		let hintPersistenceDurationMs = 0;
		if (input.persistSuggestion && normalizedSuggestion && isActionableSuggestionStatus(result.output.status)) {
			const hintPersistenceStartedAt = Date.now();
			const createdHint = await buildHintPayload({
				organizacaoId: input.organizacaoId,
				suggestion: normalizedSuggestion,
				message: result.output.message,
				insights: result.output.insights,
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
			status: result.output.status,
			inferredIntent: result.output.inferredIntent,
			hasSuggestion: Boolean(normalizedSuggestion),
			hintPersisted: Boolean(hint),
			durations: {
				totalDurationMs,
				organizationValidationDurationMs,
				contextDurationMs,
				agentExecutionDurationMs,
				suggestionParsingDurationMs,
				hintPersistenceDurationMs,
			},
			stepTimings,
			tokensUsed: metadata.tokensUsed,
			toolsUsed: metadata.toolsUsed,
		});

		return {
			status: result.output.status,
			message: result.output.message,
			inferredIntent: result.output.inferredIntent,
			insights: result.output.insights,
			missingInformation: result.output.missingInformation,
			suggestion: normalizedSuggestion,
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
