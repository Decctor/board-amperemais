import type { TInteractionsStatusEnum } from "@/schemas/interactions";
import { and, eq, gte, sql, sum } from "drizzle-orm";

import { DBTransaction } from "@/services/drizzle";
import { sales } from "@/services/drizzle/schema";

import dayjs from "dayjs";

/** Statuses that count as a campaign message send in analytics (envios / interações). */
export const CAMPAIGN_SENT_INTERACTION_STATUSES = ["ENVIADO", "ENTREGUE", "LIDO"] as const satisfies readonly TInteractionsStatusEnum[];

const LOOKBACK_WEEKS = 8;
/**
 * Compute the worst (lowest revenue) day-of-week for an organization
 * based on the last LOOKBACK_WEEKS of sales data.
 * Days with zero sales are excluded (e.g., closed days).
 * Returns the day-of-week number (0=Sunday, 6=Saturday) or null if insufficient data.
 */
export async function computeWorstSalesDayOfWeek(tx: DBTransaction, organizationId: string): Promise<number | null> {
	const lookbackDate = dayjs().subtract(LOOKBACK_WEEKS, "week").toDate();

	const salesByDayOfWeek = await tx
		.select({
			dayOfWeek: sql<number>`EXTRACT(DOW FROM ${sales.dataVenda})::int`,
			totalValue: sum(sales.valorTotal),
		})
		.from(sales)
		.where(and(eq(sales.organizacaoId, organizationId), gte(sales.dataVenda, lookbackDate)))
		.groupBy(sql`EXTRACT(DOW FROM ${sales.dataVenda})::int`);

	// Need at least 2 distinct sale days to have a meaningful "worst"
	if (salesByDayOfWeek.length < 2) return null;

	// Sort by total value ascending, then by day-of-week ascending for tie-breaking
	const sorted = salesByDayOfWeek.sort((a, b) => Number(a.totalValue ?? 0) - Number(b.totalValue ?? 0) || a.dayOfWeek - b.dayOfWeek);

	return sorted[0].dayOfWeek;
}
