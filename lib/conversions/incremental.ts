import { campaignConversions } from "@/services/drizzle/schema";
import { type SQL, sql } from "drizzle-orm";

/**
 * Camada 1 — Receita incremental contábil.
 *
 * A receita "atribuída" (last-touch) credita 100% do valor da venda à campanha,
 * mesmo quando o cliente compraria de qualquer forma. Para clientes recorrentes
 * (ex.: campeões com gatilho de NOVA-COMPRA), isso superestima o impacto real.
 *
 * A receita incremental só conta o que excede o comportamento basal do cliente,
 * usando os sinais já persistidos em cada conversão (tipoConversao + deltas):
 *
 *  - AQUISICAO / REATIVACAO: venda cheia. Cliente novo ou que provavelmente não
 *    voltaria sem o contato — receita genuinamente nova.
 *  - ACELERACAO: comprou antes do ciclo. O ticket basal seria gasto de qualquer
 *    forma (antecipação ≠ receita nova), então só o uplift de cesta é totalmente
 *    incremental, mais uma fração do ticket esperado pela antecipação.
 *  - REGULAR / ATRASADA: compra esperada/basal. Só o uplift de cesta conta;
 *    o ticket basal não é incremental.
 */

/**
 * Fração do ticket basal creditada como incremental numa conversão do tipo
 * ACELERACAO, pela antecipação da compra. Antecipar uma compra não cria receita
 * nova no longo prazo (apenas a desloca no tempo), então creditamos parcialmente.
 */
export const INCREMENTAL_ACCELERATION_FRACTION = 0.5;

/** Uplift de cesta incremental: quanto a venda superou o ticket médio do cliente (>= 0). */
const basketUpliftExpr = sql`GREATEST(COALESCE(${campaignConversions.deltaMonetarioAbsoluto}, 0), 0)`;

/** Ticket basal esperado do cliente (cai para o valor da venda se não houver snapshot). */
const baselineTicketExpr = sql`COALESCE(${campaignConversions.clienteTicketMedioSnapshot}, ${campaignConversions.vendaValor}, 0)`;

/** Valor cheio da venda (cai para a receita atribuída se vendaValor for nulo). */
const fullSaleExpr = sql`COALESCE(${campaignConversions.vendaValor}, ${campaignConversions.atribuicaoReceita}, 0)`;

/**
 * Expressão SQL (por linha) que calcula a receita incremental de uma conversão.
 * Use dentro de SUM()/agregações ou no SELECT por linha.
 */
export const incrementalRevenueExpr: SQL<number> = sql<number>`
	CASE
		WHEN ${campaignConversions.tipoConversao} IN ('AQUISICAO', 'REATIVACAO') THEN ${fullSaleExpr}
		WHEN ${campaignConversions.tipoConversao} = 'ACELERACAO' THEN ${basketUpliftExpr} + ${INCREMENTAL_ACCELERATION_FRACTION} * ${baselineTicketExpr}
		ELSE ${basketUpliftExpr}
	END
`;

/** Soma da receita incremental (0 quando não há conversões). */
export const sumIncrementalRevenueExpr: SQL<number> = sql<number>`COALESCE(SUM(${incrementalRevenueExpr}), 0)`;

/** Contagem de conversões com receita incremental > 0 (conversões com impacto real). */
export const countIncrementalConversionsExpr: SQL<number> = sql<number>`COUNT(*) FILTER (WHERE ${incrementalRevenueExpr} > 0)`;
