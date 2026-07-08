import type {
	TCampaignFilterCondition,
	TCampaignFilterLogicOperatorEnum,
	TCampaignFilterTreeNode,
	TCampaignFilters,
	TCampaignFiltersTree,
} from "@/schemas/campaigns";
import type { TAudienceState } from "@/schemas/audiences";
import { useCallback, useState } from "react";

// Always keep a root GRUPO in state for ergonomics. Empty trees collapse to `null`
// at submit time (see `normalizeAudienceFiltersForSubmit`).
export function createEmptyFiltersTree(): TCampaignFiltersTree {
	return { tipo: "GRUPO", operador: "AND", itens: [] };
}

/** In state we keep a root GRUPO (even empty). Collapse empty trees to `null` before submit/preview. */
export function normalizeAudienceFiltersForSubmit(filtros: TCampaignFiltersTree): TCampaignFilters | null {
	if (!filtros || filtros.itens.length === 0) return null;
	return filtros as unknown as TCampaignFilters;
}

/**
 * A path is a list of item indices from the root. An empty path refers to the root itself.
 * - [] → root
 * - [0] → root.itens[0]
 * - [0, 2] → root.itens[0].itens[2] (only valid if root.itens[0] is a GRUPO)
 */
export type TFilterTreePath = number[];

// Replace the node at `path` by applying the updater. The updater receives the current node and
// returns a replacement (or null to remove it). Returns a cloned tree.
function mapAtPath(
	root: TCampaignFiltersTree,
	path: TFilterTreePath,
	updater: (node: TCampaignFiltersTree | TCampaignFilterTreeNode) => TCampaignFiltersTree | TCampaignFilterTreeNode | null,
): TCampaignFiltersTree {
	if (path.length === 0) {
		const updated = updater(root);
		if (!updated || updated.tipo !== "GRUPO") {
			// Root must stay a GRUPO — ignore invalid replacements and keep prior root.
			return root;
		}
		return updated as TCampaignFiltersTree;
	}

	const [head, ...rest] = path;
	if (root.itens[head] === undefined) return root;

	if (rest.length === 0) {
		const nextItens = [...root.itens];
		const replaced = updater(root.itens[head]);
		if (replaced === null) {
			nextItens.splice(head, 1);
		} else {
			nextItens[head] = replaced as TCampaignFilterTreeNode;
		}
		return { ...root, itens: nextItens };
	}

	const child = root.itens[head];
	if (child.tipo !== "GRUPO") return root;
	const newChild = mapAtPath(child as TCampaignFiltersTree, rest, updater);
	const nextItens = [...root.itens];
	nextItens[head] = newChild as TCampaignFilterTreeNode;
	return { ...root, itens: nextItens };
}

type UseInternalAudienceStateProps = {
	initialState: Partial<TAudienceState>;
};
export function useInternalAudienceState({ initialState }: UseInternalAudienceStateProps) {
	const [state, setState] = useState<TAudienceState>({
		audience: {
			nome: initialState.audience?.nome ?? "",
			descricao: initialState.audience?.descricao ?? null,
		},
		segmentacoes: initialState.segmentacoes ?? [],
		filtros: initialState.filtros ?? createEmptyFiltersTree(),
	});

	const updateAudience = useCallback((audience: Partial<TAudienceState["audience"]>) => {
		setState((prev) => ({ ...prev, audience: { ...prev.audience, ...audience } }));
	}, []);

	const toggleSegmentacao = useCallback((segmentacao: string) => {
		setState((prev) => ({
			...prev,
			segmentacoes: prev.segmentacoes.includes(segmentacao)
				? prev.segmentacoes.filter((item) => item !== segmentacao)
				: [...prev.segmentacoes, segmentacao],
		}));
	}, []);

	// ------- Filters tree helpers -------

	const addFilterCondition = useCallback((path: TFilterTreePath, condicao: TCampaignFilterCondition) => {
		setState((prev) => ({
			...prev,
			filtros: mapAtPath(prev.filtros, path, (node) => {
				if (!node || node.tipo !== "GRUPO") return node;
				return { ...node, itens: [...node.itens, { tipo: "CONDICAO", condicao }] };
			}),
		}));
	}, []);

	const updateFilterCondition = useCallback((path: TFilterTreePath, condicao: TCampaignFilterCondition) => {
		if (path.length === 0) return; // root is always a GRUPO
		setState((prev) => ({
			...prev,
			filtros: mapAtPath(prev.filtros, path, (node) => {
				if (!node || node.tipo !== "CONDICAO") return node;
				return { tipo: "CONDICAO", condicao };
			}),
		}));
	}, []);

	const addFilterGroup = useCallback((path: TFilterTreePath, operador: TCampaignFilterLogicOperatorEnum) => {
		setState((prev) => ({
			...prev,
			filtros: mapAtPath(prev.filtros, path, (node) => {
				if (!node || node.tipo !== "GRUPO") return node;
				const newGroup: TCampaignFilterTreeNode = { tipo: "GRUPO", operador, itens: [] };
				return { ...node, itens: [...node.itens, newGroup] };
			}),
		}));
	}, []);

	const updateFilterGroupOperator = useCallback((path: TFilterTreePath, operador: TCampaignFilterLogicOperatorEnum) => {
		setState((prev) => ({
			...prev,
			filtros: mapAtPath(prev.filtros, path, (node) => {
				if (!node || node.tipo !== "GRUPO") return node;
				return { ...node, operador };
			}),
		}));
	}, []);

	const removeFilterNode = useCallback((path: TFilterTreePath) => {
		if (path.length === 0) return; // never remove the root
		setState((prev) => ({ ...prev, filtros: mapAtPath(prev.filtros, path, () => null) }));
	}, []);

	const resetFilters = useCallback(() => {
		setState((prev) => ({ ...prev, filtros: createEmptyFiltersTree() }));
	}, []);

	const redefineState = useCallback((next: TAudienceState) => {
		setState({ ...next, filtros: next.filtros ?? createEmptyFiltersTree() });
	}, []);

	const resetState = useCallback(() => {
		setState({ audience: { nome: "", descricao: null }, segmentacoes: [], filtros: createEmptyFiltersTree() });
	}, []);

	return {
		state,
		updateAudience,
		toggleSegmentacao,
		addFilterCondition,
		updateFilterCondition,
		addFilterGroup,
		updateFilterGroupOperator,
		removeFilterNode,
		resetFilters,
		redefineState,
		resetState,
	};
}
export type TUseInternalAudienceState = ReturnType<typeof useInternalAudienceState>;
