import { db } from "@/services/drizzle";
import { sales } from "@/services/drizzle/schema";
import { and, eq, isNotNull } from "drizzle-orm";
import { getSalesResultsByDeliveryMode } from "./by-delivery-mode";
import { getSalesResultsByPaymentMethod } from "./by-payment-method";
import { getSalesResultsBySeller } from "./by-seller";
import { getSalesResultsFiscalHealth } from "./fiscal-health";
import { getSalesResultsSummary } from "./summary";
import type { TSalesResultsFilters } from "./universe";

export type { TSalesResultsFilters } from "./universe";

async function getChannelOptions(organizacaoId: string) {
	const rows = await db
		.selectDistinct({ canal: sales.canal })
		.from(sales)
		.where(and(eq(sales.organizacaoId, organizacaoId), isNotNull(sales.canal)));
	return rows.map((row) => row.canal).filter((canal): canal is string => Boolean(canal)).sort();
}

/**
 * Relatório de resultados de vendas de um período. Cada seção lê o mesmo universo
 * (`buildSalesUniverseConditions`); a computação vive aqui, fora da rota, para que agente de IA e
 * relatório recorrente possam devolver os mesmos números.
 */
export async function getSalesResults({ filters, includeSensitive }: { filters: TSalesResultsFilters; includeSensitive: boolean }) {
	const [resumo, porMetodo, porVendedor, porModalidade, fiscal, canais] = await Promise.all([
		getSalesResultsSummary({ filters, includeSensitive }),
		getSalesResultsByPaymentMethod({ filters }),
		getSalesResultsBySeller({ filters, includeSensitive }),
		getSalesResultsByDeliveryMode({ filters, includeSensitive }),
		getSalesResultsFiscalHealth({ filters }),
		getChannelOptions(filters.organizacaoId),
	]);

	return {
		periodo: resumo.periodo,
		resumo,
		porMetodo,
		porVendedor,
		porModalidade,
		fiscal,
		filterOptions: { canais },
	};
}
export type TSalesResults = Awaited<ReturnType<typeof getSalesResults>>;
