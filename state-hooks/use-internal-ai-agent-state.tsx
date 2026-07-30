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

	const updatePrices = useCallback((precos: Partial<TAiAgentCapacidades["comercial"]["precos"]>) => {
		setState((prev) => {
			const nextVisible = precos.visiveis ?? prev.agente.capacidades.comercial.precos.visiveis;
			return {
				...prev,
				agente: {
					...prev.agente,
					capacidades: {
						...prev.agente.capacidades,
						comercial: {
							...prev.agente.capacidades.comercial,
							precos: { ...prev.agente.capacidades.comercial.precos, ...precos },
						},
						ferramentas: nextVisible
							? prev.agente.capacidades.ferramentas
							: {
									...prev.agente.capacidades.ferramentas,
									"orcamentos.criar": { habilitada: false },
								},
					},
				},
			};
		});
	}, []);

	const updateQuotes = useCallback((orcamentos: Partial<TAiAgentCapacidades["comercial"]["orcamentos"]>) => {
		setState((prev) => ({
			...prev,
			agente: {
				...prev.agente,
				capacidades: {
					...prev.agente.capacidades,
					comercial: {
						...prev.agente.capacidades.comercial,
						orcamentos: { ...prev.agente.capacidades.comercial.orcamentos, ...orcamentos },
					},
					ferramentas:
						orcamentos.bloqueio === "TRANSFERIR"
							? {
									...prev.agente.capacidades.ferramentas,
									"atendimento.transferir_para_humano": { habilitada: true },
								}
							: prev.agente.capacidades.ferramentas,
				},
			},
		}));
	}, []);

	const toggleTool = useCallback((name: TAiAgentToolNameEnum, enabled: boolean) => {
		setState((prev) => {
			const ferramentas = { ...prev.agente.capacidades.ferramentas, [name]: { habilitada: enabled } };
			const isQuoteBeingEnabled = name === "orcamentos.criar" && enabled;
			const isHandoffBeingDisabled = name === "atendimento.transferir_para_humano" && !enabled;
			return {
				...prev,
				agente: {
					...prev.agente,
					capacidades: {
						...prev.agente.capacidades,
						ferramentas,
						comercial: {
							...prev.agente.capacidades.comercial,
							precos: isQuoteBeingEnabled
								? { ...prev.agente.capacidades.comercial.precos, visiveis: true }
								: prev.agente.capacidades.comercial.precos,
							orcamentos:
								isHandoffBeingDisabled && prev.agente.capacidades.comercial.orcamentos.bloqueio === "TRANSFERIR"
									? { ...prev.agente.capacidades.comercial.orcamentos, bloqueio: "INFORMAR" }
									: prev.agente.capacidades.comercial.orcamentos,
						},
					},
				},
			};
		});
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
		updatePrices,
		updateQuotes,
		toggleTool,
		addKnowledgeBlock,
		updateKnowledgeBlock,
		removeKnowledgeBlock,
		redefineState,
		resetState,
	};
}

export type TUseInternalAiAgentState = ReturnType<typeof useInternalAiAgentState>;
