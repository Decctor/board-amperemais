import type { TAiAgentUsage } from "@/schemas/ai-agents";
import type { LanguageModelUsage } from "ai";

/**
 * Converte o uso reportado pelo AI SDK para o formato persistido em `ai_agent_runs.uso`.
 * O total é recalculado quando o provider não o informa, para que a soma de tokens da
 * organização nunca dependa de um campo opcional.
 */
export function normalizeAiUsage(usage: Partial<LanguageModelUsage> | undefined, modelo?: string): TAiAgentUsage | null {
	if (!usage) return modelo ? { modelo } : null;

	const tokensEntrada = usage.inputTokens;
	const tokensSaida = usage.outputTokens;
	const tokensTotal =
		typeof usage.totalTokens === "number"
			? usage.totalTokens
			: typeof tokensEntrada === "number" || typeof tokensSaida === "number"
				? (tokensEntrada ?? 0) + (tokensSaida ?? 0)
				: undefined;

	return { tokensEntrada, tokensSaida, tokensTotal, modelo };
}
