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

	const updateModeloConfig = useCallback((modeloConfig: Partial<TAiAgentModeloConfig>) => {
		setState((prev) => ({
			...prev,
			agente: { ...prev.agente, modeloConfig: { ...prev.agente.modeloConfig, ...modeloConfig } },
		}));
	}, []);

	const updateLimites = useCallback((limites: Partial<TAiAgentCapacidades["limites"]>) => {
		setState((prev) => ({
			...prev,
			agente: {
				...prev.agente,
				capacidades: { ...prev.agente.capacidades, limites: { ...prev.agente.capacidades.limites, ...limites } },
			},
		}));
	}, []);

	const updateAtendimento = useCallback((atendimento: Partial<TAiAgentCapacidades["atendimento"]>) => {
		setState((prev) => ({
			...prev,
			agente: {
				...prev.agente,
				capacidades: { ...prev.agente.capacidades, atendimento: { ...prev.agente.capacidades.atendimento, ...atendimento } },
			},
		}));
	}, []);

	const toggleFerramenta = useCallback((nome: TAiAgentToolNameEnum, habilitada: boolean) => {
		setState((prev) => ({
			...prev,
			agente: {
				...prev.agente,
				capacidades: {
					...prev.agente.capacidades,
					ferramentas: { ...prev.agente.capacidades.ferramentas, [nome]: { habilitada } },
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

	const redefineState = useCallback((novoEstado: TInternalAiAgentState) => setState(novoEstado), []);
	const resetState = useCallback(() => setState(buildInitialState()), []);

	return {
		state,
		updateAgent,
		updateModeloConfig,
		updateLimites,
		updateAtendimento,
		toggleFerramenta,
		addKnowledgeBlock,
		updateKnowledgeBlock,
		removeKnowledgeBlock,
		redefineState,
		resetState,
	};
}

export type TUseInternalAiAgentState = ReturnType<typeof useInternalAiAgentState>;
