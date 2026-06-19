import type { TGetCampaignsOutputById, TUpdateCampaignInput } from "@/app/api/campaigns/route";
import type { TCampaignFilters, TCampaignFiltersTree, TCampaignState } from "@/schemas/campaigns";
import type { TUseCampaignState } from "@/state-hooks/use-campaign-state";

function createEmptyFiltersTree(): TCampaignFiltersTree {
	return { tipo: "GRUPO", operador: "AND", itens: [] };
}

/**
 * Map a persisted campaign (with its relations) into the editable campaign-state
 * shape. Relations (`segmentacoes`, `whatsappTemplate`, `whatsappConexaoTelefone`)
 * are pulled out so only campaign columns end up in `state.campaign`; segmentações
 * become editable child rows and the filter tree falls back to an empty group.
 */
export function buildCampaignStateFromEntity(campaign: TGetCampaignsOutputById): TCampaignState {
	const { filtros, segmentacoes, whatsappTemplate, whatsappConexaoTelefone, ...campaignColumns } = campaign;
	void whatsappTemplate;
	void whatsappConexaoTelefone;

	const filtrosTree = filtros && (filtros as TCampaignFiltersTree).tipo === "GRUPO" ? (filtros as TCampaignFiltersTree) : createEmptyFiltersTree();

	return {
		campaign: campaignColumns as unknown as TCampaignState["campaign"],
		segmentations: segmentacoes ?? [],
		filtros: filtrosTree,
	};
}

/**
 * Build the whole-entity update payload. Every section modal edits its own slice
 * but submits the full campaign, so unrelated fields are preserved untouched.
 */
export function buildCampaignUpdatePayload(campaignId: string, state: TUseCampaignState["state"]): TUpdateCampaignInput {
	return {
		campaignId,
		campaign: { ...state.campaign, filtros: normalizeFiltersForSubmit(state.filtros) },
		segmentations: state.segmentations,
	};
}

/**
 * In state we always keep a root GRUPO (even empty) for builder ergonomics.
 * Before submitting to the API, collapse empty trees to `null` so persistence
 * is clean and the "no filtros" case is unambiguous.
 */
export function normalizeFiltersForSubmit(filtros: TCampaignFiltersTree): TCampaignFilters | null {
	if (!filtros || filtros.itens.length === 0) return null;
	return filtros as unknown as TCampaignFilters;
}
