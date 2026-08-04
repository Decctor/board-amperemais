import type { QueryClient } from "@tanstack/react-query";

type InvalidateFinanceQueriesOptions = {
	accountingEntryId?: string;
	transactionId?: string;
};

const FINANCE_QUERY_PREFIXES = [
	["finances-accounting-entries"],
	["finances-financial-transactions"],
	["finances-financial-accounts"],
	["finances-financial-account-by-id"],
	["finances-overall-stats"],
	["finances-account-charts"],
	["financial-account-graph"],
	["finances-credit-card-invoices"],
] as const;

export function invalidateFinanceQueries(queryClient: QueryClient, options: InvalidateFinanceQueriesOptions = {}) {
	const queryKeys: readonly (readonly unknown[])[] = [
		...FINANCE_QUERY_PREFIXES,
		...(options.accountingEntryId ? [["finances-accounting-entry-by-id", options.accountingEntryId] as const] : []),
		...(options.transactionId ? [["finances-financial-transaction-by-id", options.transactionId] as const] : []),
	];

	return Promise.all(queryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}
