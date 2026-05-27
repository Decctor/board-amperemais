import { Output, ToolLoopAgent, gateway, stepCountIs } from "ai";
import { MarketingAnalystOutputSchema, MarketingExecutorOutputSchema } from "./schemas";
import type { createMarketingAnalystTools, createMarketingExecutorTools } from "./tools";

export function createMarketingAnalystAgent({
	tools,
	instructions,
}: {
	tools: ReturnType<typeof createMarketingAnalystTools>;
	instructions: string;
}) {
	return new ToolLoopAgent({
		model: gateway("openai/gpt-5.4-mini"),
		instructions,
		tools,
		output: Output.object({
			name: "MarketingAnalystOutput",
			schema: MarketingAnalystOutputSchema,
		}),
		stopWhen: stepCountIs(8),
	});
}

export function createMarketingExecutorAgent({
	tools,
	instructions,
}: {
	tools: ReturnType<typeof createMarketingExecutorTools>;
	instructions: string;
}) {
	return new ToolLoopAgent({
		model: gateway("openai/gpt-5.4-mini"),
		instructions,
		tools,
		output: Output.object({
			name: "MarketingExecutorOutput",
			schema: MarketingExecutorOutputSchema,
		}),
		stopWhen: stepCountIs(6),
	});
}
