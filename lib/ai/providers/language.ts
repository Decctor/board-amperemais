import type { TAiAgentModelConfig } from "@/schemas/ai-agents";
import { gateway } from "ai";
import { resolveLanguageModelId } from "./models";

/**
 * Único ponto do módulo que fala com o provider. Todo o resto do engine trabalha com a
 * configuração do agente e recebe um `LanguageModel` já resolvido.
 */
export function resolveLanguageModel(modeloConfig: TAiAgentModelConfig) {
	return gateway(resolveLanguageModelId(modeloConfig.modelo));
}
