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

	if (suggestionType === "campaign-creation-suggestion") {
		const validatedPayload = CampaignCreationSuggestionSchema.parse(parsedPayload);
		const normalizedPayload = await normalizeCampaignCreationSuggestion({
			organizacaoId,
			suggestion: validatedPayload,
		});

		return {
			tipo: suggestionType,
			payload: normalizedPayload,
		};
	}

	const validatedPayload = CampaignUpdateSuggestionSchema.parse(parsedPayload);
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
	await ensureOrganizationExists(input.organizacaoId);

	const context = await getCampaignsPerformanceContext(input.organizacaoId);
	const tools = createMarketingAgentTools({
		organizacaoId: input.organizacaoId,
	});
	const agent = createMarketingAgent({
		tools,
		instructions: MARKETING_AGENT_SYSTEM_PROMPT,
	});
	const toolsUsed = new Set<string>();
	let stepCount = 0;

	const result = await agent.generate({
		prompt: buildMarketingAgentPrompt({
			brief: input.brief,
			campaignId: input.campaignId,
			context,
		}),
		onStepFinish: ({ toolCalls }) => {
			stepCount += 1;
			for (const toolCall of toolCalls) {
				toolsUsed.add(toolCall.toolName);
			}
			if (input.debug) {
				console.log("[MARKETING_AGENT][STEP]", {
					stepCount,
					toolCalls: toolCalls.map((toolCall) => toolCall.toolName),
				});
			}
		},
	});

	if (!result.output) {
		throw new Error("O agente de marketing não retornou uma resposta estruturada.");
	}

	let normalizedSuggestion = await parseGeneratedSuggestion({
		organizacaoId: input.organizacaoId,
		suggestionType: result.output.suggestionType,
		suggestionJson: result.output.suggestionJson,
	});

	if (result.output.status === "analysis-only" || result.output.status === "needs-user-input") {
		normalizedSuggestion = null;
	}

	const metadata = MarketingAgentMetadataSchema.parse({
		model: "openai/gpt-5",
		steps: stepCount,
		tokensUsed: result.usage.totalTokens ?? 0,
		toolsUsed: Array.from(toolsUsed),
	});

	let hint: TAIHint | null = null;
	if (
		input.persistSuggestion &&
		normalizedSuggestion &&
		(result.output.status === "campaign-creation-suggestion" || result.output.status === "campaign-updates-suggestion")
	) {
		const createdHint = await buildHintPayload({
			organizacaoId: input.organizacaoId,
			suggestion: normalizedSuggestion,
			message: result.output.message,
			insights: result.output.insights,
			metadata,
		});
		hint = AIHintSchema.parse(createdHint);
	}

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
}

export * from "./context";
export * from "./schemas";
export * from "./tools";
