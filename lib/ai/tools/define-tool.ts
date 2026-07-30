import type z from "zod";
import type { TAgentToolDefinition } from "./types";

/**
 * Identity helper: existe só para o TypeScript inferir `z.infer<TInputSchema>` no parâmetro
 * do `execute` a partir do `inputSchema` declarado ao lado.
 */
export function defineAgentTool<TInputSchema extends z.ZodTypeAny>(
	definition: TAgentToolDefinition<TInputSchema>,
): TAgentToolDefinition<TInputSchema> {
	return definition;
}
