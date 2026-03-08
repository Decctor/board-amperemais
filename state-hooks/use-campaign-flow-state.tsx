import type { TCampaignFlowState } from "@/schemas/campaign-flows";
import { useCallback, useState } from "react";

type TUseCampaignFlowStateProps = {
	initialState: Partial<TCampaignFlowState>;
};

type TCampaignFlowNodeState = TCampaignFlowState["nos"][number];
type TCampaignFlowNodeSubtype = TCampaignFlowNodeState["subtipo"];
type TCampaignFlowNodeBySubtype<TSubtipo extends TCampaignFlowNodeSubtype> = Extract<TCampaignFlowNodeState, { subtipo: TSubtipo }>;
type TCampaignFlowNodeConfigBySubtype<TSubtipo extends TCampaignFlowNodeSubtype> = TCampaignFlowNodeBySubtype<TSubtipo>["configuracao"];

export function useCampaignFlowState({ initialState }: TUseCampaignFlowStateProps) {
	const buildInitialState = useCallback(
		(): TCampaignFlowState => ({
			campaignFlow: {
				titulo: initialState.campaignFlow?.titulo ?? "",
				descricao: initialState.campaignFlow?.descricao ?? null,
				status: initialState.campaignFlow?.status ?? "RASCUNHO",
				tipo: initialState.campaignFlow?.tipo ?? "EVENTO",
				recorrenciaTipo: initialState.campaignFlow?.recorrenciaTipo ?? null,
				recorrenciaIntervalo: initialState.campaignFlow?.recorrenciaIntervalo ?? 1,
				recorrenciaDiasSemana: initialState.campaignFlow?.recorrenciaDiasSemana ?? null,
				recorrenciaDiasMes: initialState.campaignFlow?.recorrenciaDiasMes ?? null,
				recorrenciaBlocoHorario: initialState.campaignFlow?.recorrenciaBlocoHorario ?? null,
				unicaDataExecucao: initialState.campaignFlow?.unicaDataExecucao ?? null,
				unicaExecutada: initialState.campaignFlow?.unicaExecutada ?? false,
				atribuicaoModelo: initialState.campaignFlow?.atribuicaoModelo ?? "LAST_TOUCH",
				atribuicaoJanelaDias: initialState.campaignFlow?.atribuicaoJanelaDias ?? 14,
				publicoId: initialState.campaignFlow?.publicoId ?? null,
			},
			nos: initialState.nos ?? [],
			arestas: initialState.arestas ?? [],
		}),
		[initialState],
	);

	const [state, setState] = useState<TCampaignFlowState>(() => buildInitialState());

	// ── Campaign flow root ─────────────────────────────────────────────────────

	const updateCampaignFlow = useCallback((changes: Partial<TCampaignFlowState["campaignFlow"]>) => {
		setState((prev) => ({
			...prev,
			campaignFlow: { ...prev.campaignFlow, ...changes },
		}));
	}, []);

	// ── Nodes ──────────────────────────────────────────────────────────────────

	const addNode = useCallback((node: TCampaignFlowState["nos"][number]) => {
		setState((prev) => ({
			...prev,
			nos: [...prev.nos, node],
		}));
	}, []);

	const updateNode = useCallback(({ index, changes }: { index: number; changes: Partial<TCampaignFlowState["nos"][number]> }) => {
		setState((prev) => {
			if (!prev.nos[index]) return prev;
			const nextNodes = [...prev.nos] as TCampaignFlowState["nos"];
			nextNodes[index] = {
				...nextNodes[index],
				...changes,
			} as TCampaignFlowState["nos"][number];
			return {
				...prev,
				nos: nextNodes,
			};
		});
	}, []);

	const updateNodeConfigBySubtype = useCallback(
		<TSubtipo extends TCampaignFlowNodeSubtype>({
			index,
			subtipo,
			tipo,
			changes,
		}: {
			index: number;
			subtipo: TSubtipo;
			tipo?: TCampaignFlowNodeBySubtype<TSubtipo>["tipo"];
			changes: Partial<TCampaignFlowNodeConfigBySubtype<TSubtipo>>;
		}) => {
			setState((prev) => {
				const currentNode = prev.nos[index];
				if (!currentNode) return prev;
				if (currentNode.subtipo !== subtipo) return prev;
				if (tipo && currentNode.tipo !== tipo) return prev;

				const narrowedNode = currentNode as TCampaignFlowNodeBySubtype<TSubtipo>;
				const nextNodes = [...prev.nos] as TCampaignFlowState["nos"];

				nextNodes[index] = {
					...narrowedNode,
					configuracao: {
						...narrowedNode.configuracao,
						...changes,
					},
				} as TCampaignFlowState["nos"][number];

				return {
					...prev,
					nos: nextNodes,
				};
			});
		},
		[],
	);

	const removeNode = useCallback((index: number) => {
		setState((prev) => {
			const isExisting = prev.nos.find((n, i) => i === index && !!n.id);
			if (!isExisting) return { ...prev, nos: prev.nos.filter((_, i) => i !== index) };
			return {
				...prev,
				nos: prev.nos.map((n, i) => (i === index ? { ...n, deletar: true } : n)),
			};
		});
	}, []);

	// ── Edges ──────────────────────────────────────────────────────────────────

	const addEdge = useCallback((edge: TCampaignFlowState["arestas"][number]) => {
		setState((prev) => ({
			...prev,
			arestas: [...prev.arestas, edge],
		}));
	}, []);

	const updateEdge = useCallback(({ index, changes }: { index: number; changes: Partial<TCampaignFlowState["arestas"][number]> }) => {
		setState((prev) => ({
			...prev,
			arestas: prev.arestas.map((a, i) => (i === index ? { ...a, ...changes } : a)),
		}));
	}, []);

	const removeEdge = useCallback((index: number) => {
		setState((prev) => {
			const isExisting = prev.arestas.find((a, i) => i === index && !!a.id);
			if (!isExisting) return { ...prev, arestas: prev.arestas.filter((_, i) => i !== index) };
			return {
				...prev,
				arestas: prev.arestas.map((a, i) => (i === index ? { ...a, deletar: true } : a)),
			};
		});
	}, []);

	// ── Full graph replace (for React Flow onChange) ───────────────────────────

	const replaceGraph = useCallback(
		({ nos, arestas }: { nos: TCampaignFlowState["nos"]; arestas: TCampaignFlowState["arestas"] }) => {
			setState((prev) => ({ ...prev, nos, arestas }));
		},
		[],
	);

	// ── Reset / redefine ───────────────────────────────────────────────────────

	const redefineState = useCallback((newState: TCampaignFlowState) => {
		setState(newState);
	}, []);

	const resetState = useCallback(() => {
		setState(buildInitialState());
	}, [buildInitialState]);

	return {
		state,
		updateCampaignFlow,
		addNode,
		updateNode,
		updateNodeConfigBySubtype,
		removeNode,
		addEdge,
		updateEdge,
		removeEdge,
		replaceGraph,
		redefineState,
		resetState,
	};
}
export type TUseCampaignFlowState = ReturnType<typeof useCampaignFlowState>;
