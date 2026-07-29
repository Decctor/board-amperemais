import type { TAiAgentCapacidades } from "@/schemas/ai-agents";
import type { TAiAgentToolNameEnum } from "@/schemas/enums";
import { AgentToolNotEnabledError } from "../shared/errors";

export function isToolEnabled(capacidades: TAiAgentCapacidades, name: TAiAgentToolNameEnum): boolean {
	return capacidades.ferramentas[name]?.habilitada === true;
}

/**
 * Revalida a capacidade **no momento da execução**, mesmo o toolset já tendo sido filtrado
 * na montagem do agente. A checagem dupla é deliberada: a configuração pode mudar no meio de
 * uma execução, e uma ferramenta desabilitada nunca deve rodar por caminho indireto.
 */
export function assertToolEnabled(capacidades: TAiAgentCapacidades, name: TAiAgentToolNameEnum): void {
	if (!isToolEnabled(capacidades, name)) {
		throw new AgentToolNotEnabledError(`A ferramenta "${name}" não está habilitada para este agente.`);
	}
}
