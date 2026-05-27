import type { TCampaignFilters, TCampaignFiltersTree } from "@/schemas/campaigns";

/**
 * In state we always keep a root GRUPO (even empty) for builder ergonomics.
 * Before submitting to the API, collapse empty trees to `null` so persistence
 * is clean and the "no filtros" case is unambiguous.
 */
export function normalizeFiltersForSubmit(filtros: TCampaignFiltersTree): TCampaignFilters | null {
	if (!filtros || filtros.itens.length === 0) return null;
	return filtros as unknown as TCampaignFilters;
}
