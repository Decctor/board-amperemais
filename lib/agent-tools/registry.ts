import type { TAgentActorContext, TAgentToolDefinitionErased } from "./types";
import { commercialResultsTool } from "./tools/commercial-results";
import { searchClientsTool } from "./tools/clients";
import { searchProductsTool } from "./tools/products";
import { listCampaignsTool } from "./tools/campaigns";

/**
 * Registro único das ferramentas expostas via MCP.
 *
 * Poucas e largas, de propósito — a mesma lição que `lib/ai/tools/products.ts` já tinha
 * aprendido ao substituir quatro ferramentas de catálogo por uma consulta unificada. Espelhar as
 * ~300 rotas da API aqui faria o modelo escolher mal e gastar o contexto só com o manifesto.
 *
 * Este registro NÃO se confunde com `lib/ai/tools/`, que serve o agente de WhatsApp falando com
 * o **cliente final**. Aqui o interlocutor é o lojista ou o time da plataforma: outro público,
 * outro envelope de segurança. O que os dois compartilham são os primitivos de baixo nível
 * (`lib/search`, `lib/products/*`, `lib/sales/*`), não a definição das ferramentas.
 */
const AGENT_TOOLS = [commercialResultsTool, searchClientsTool, searchProductsTool, listCampaignsTool] as unknown as TAgentToolDefinitionErased[];

function isToolAvailableToActor(tool: TAgentToolDefinitionErased, actor: TAgentActorContext) {
	if (!tool.modes.includes(actor.mode)) return false;
	// Igualdade exata, sem wildcards — mesma regra dos grants de dispositivo (§9.4 do plano de acesso).
	return tool.scopes.every((scope) => actor.scopes.has(scope));
}

/**
 * A lista que o ator enxerga.
 *
 * Filtrar em `tools/list` — em vez de expor tudo e recusar na chamada — é uma decisão de
 * comportamento, não só de segurança: modelos lidam bem com uma ferramenta ausente e mal com uma
 * proibida, repetindo a chamada e reformulando até gastar o turno. O 403 continua existindo em
 * `findToolForActor` como segunda barreira, para o cliente que tenha cacheado uma lista antiga.
 */
export function listToolsForActor(actor: TAgentActorContext): TAgentToolDefinitionErased[] {
	return AGENT_TOOLS.filter((tool) => isToolAvailableToActor(tool, actor));
}

export function findToolForActor(actor: TAgentActorContext, name: string): TAgentToolDefinitionErased | null {
	const tool = AGENT_TOOLS.find((candidate) => candidate.name === name);
	if (!tool) return null;
	return isToolAvailableToActor(tool, actor) ? tool : null;
}

/** Todas as ferramentas, sem filtro — para testes e para a tela de permissões. */
export function listAllAgentTools(): TAgentToolDefinitionErased[] {
	return [...AGENT_TOOLS];
}
