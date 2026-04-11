import { Output, ToolLoopAgent, gateway, stepCountIs } from "ai";
import { MarketingAgentProviderOutputSchema } from "./schemas";
import type { createMarketingAgentTools } from "./tools";

export function createMarketingAgent({ tools, instructions }: { tools: ReturnType<typeof createMarketingAgentTools>; instructions: string }) {
	return new ToolLoopAgent({
		model: gateway("openai/gpt-5.4-mini"),
		instructions,
		tools,
		output: Output.object({
			schema: MarketingAgentProviderOutputSchema,
		}),
		stopWhen: stepCountIs(10),
	});
}
