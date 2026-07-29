import {
	AiAgentCapacidadesSchema,
	AiAgentModeloConfigSchema,
	type TAiAgentCapacidades,
	type TAiAgentModeloConfig,
	type TUpdateAiAgent,
	type TUpdateAiAgentKnowledge,
} from "@/schemas/ai-agents";
import type { TAiAgentToolNameEnum } from "@/schemas/enums";
import { useCallback, useState } from "react";

type TInternalAiAgentState = {
	agente: TUpdateAiAgent;
	conhecimento: TUpdateAiAgentKnowledge[];
};

function buildInitialState(): TInternalAiAgentState {
	return {
		agente: {
			nome: "Agente de Atendimento",
			status: "ATIVO",
			instrucoes: "",
			modeloConfig: AiAgentModeloConfigSchema.parse({}),
			capacidades: AiAgentCapacidadesSchema.parse({}),
		},
		conhecimento: [],
	};
}

/**
 * Estado do formulário do agente (registro singleton por organização).
 *
 * Os blocos de conhecimento usam o soft-delete padrão do projeto: bloco com `id` é marcado
 * com `deletar: true` e vai para o backend; bloco novo (sem `id`) some do array.
 */
export function useInternalAiAgentState() {
	const [state, setState] = useState<TInternalAiAgentState>(buildInitialState);

	const updateAgent = useCallback((agente: Partial<TUpdateAiAgent>) => {
		setState((prev) => ({ ...prev, agente: { ...prev.agente, ...agente } }));
	}, []);

	const updateModelConfig = useCallback((modeloConfig: Partial<TAiAgentModeloConfig>) => {
		setState((prev) => ({
			...prev,
			agente: { ...prev.agente, modeloConfig: { ...prev.agente.modeloConfig, ...modeloConfig } },
		}));
	}, []);

	const updateLimits = useCallback((limites: Partial<TAiAgentCapacidades["limites"]>) => {
		setState((prev) => ({
			...prev,
			agente: {
				...prev.agente,
				capacidades: { ...prev.agente.capacidades, limites: { ...prev.agente.capacidades.limites, ...limites } },
			},
		}));
	}, []);

	const updateAttendanceSettings = useCallback((atendimento: Partial<TAiAgentCapacidades["atendimento"]>) => {
		setState((prev) => ({
			...prev,
			agente: {
				...prev.agente,
				capacidades: { ...prev.agente.capacidades, atendimento: { ...prev.agente.capacidades.atendimento, ...atendimento } },
			},
		}));
	}, []);

	const toggleTool = useCallback((name: TAiAgentToolNameEnum, enabled: boolean) => {
		setState((prev) => ({
			...prev,
			agente: {
				...prev.agente,
				capacidades: {
					...prev.agente.capacidades,
					ferramentas: { ...prev.agente.capacidades.ferramentas, [name]: { habilitada: enabled } },
				},
			},
		}));
	}, []);

	const addKnowledgeBlock = useCallback(() => {
		setState((prev) => ({
			...prev,
			conhecimento: [...prev.conhecimento, { titulo: "", conteudo: "", ativo: true, ordem: prev.conhecimento.length }],
		}));
	}, []);

	const updateKnowledgeBlock = useCallback((index: number, bloco: Partial<TUpdateAiAgentKnowledge>) => {
		setState((prev) => ({
			...prev,
			conhecimento: prev.conhecimento.map((item, i) => (i === index ? { ...item, ...bloco } : item)),
		}));
	}, []);

	const removeKnowledgeBlock = useCallback((index: number) => {
		setState((prev) => ({
			...prev,
			conhecimento: prev.conhecimento
				.map((item, i) => (i === index && item.id ? { ...item, deletar: true } : item))
				.filter((item, i) => !(i === index && !item.id)),
		}));
	}, []);

	const redefineState = useCallback((newState: TInternalAiAgentState) => setState(newState), []);
	const resetState = useCallback(() => setState(buildInitialState()), []);

	return {
		state,
		updateAgent,
		updateModelConfig,
		updateLimits,
		updateAttendanceSettings,
		toggleTool,
		addKnowledgeBlock,
		updateKnowledgeBlock,
		removeKnowledgeBlock,
		redefineState,
		resetState,
	};
}

export type TUseInternalAiAgentState = ReturnType<typeof useInternalAiAgentState>;
