import { INTERNAL_SALES_INTEGRATION_ID } from "@/lib/integrations/internal-sales";
import { sales } from "@/services/drizzle/schema";
import { inArray, isNull, or, type SQL } from "drizzle-orm";

/**
 * Condição de filtro por proveniência da venda. `integrationsIds` mistura ids reais de
 * `integrations` com o sentinela de vendas internas (`integracaoId IS NULL`); retorna
 * `undefined` quando o filtro está vazio, então funciona tanto em `conditions.push(...)`
 * (com guard) quanto direto em `and(...)`, que ignora `undefined`.
 */
export function getSalesIntegrationCondition(integrationsIds: string[] | null | undefined): SQL | undefined {
	if (!integrationsIds || integrationsIds.length === 0) return undefined;
	const realIds = integrationsIds.filter((id) => id !== INTERNAL_SALES_INTEGRATION_ID);
	const includeInternal = integrationsIds.includes(INTERNAL_SALES_INTEGRATION_ID);
	if (realIds.length > 0 && includeInternal) return or(inArray(sales.integracaoId, realIds), isNull(sales.integracaoId));
	if (includeInternal) return isNull(sales.integracaoId);
	return inArray(sales.integracaoId, realIds);
}
