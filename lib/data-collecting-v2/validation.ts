import type { TDataCollectingV2RunSummary } from "./types";

export type TDataCollectingV2ValidationSnapshot = {
	source: string;
	organizationId: string;
	salesCount: number;
	createdSalesCount: number;
	updatedSalesCount: number;
	createdInteractionsCount: number;
	immediateInteractionsCount: number;
	cashbackTransactionsCount: number;
	cashbackAccumulatedValue: number;
	firstPurchaseInteractionsCount: number;
	cashbackAccumulationInteractionsCount: number;
};

export type TDataCollectingV2ValidationDiff = {
	organizationId: string;
	source: string;
	matches: boolean;
	differences: Partial<Record<keyof Omit<TDataCollectingV2ValidationSnapshot, "organizationId" | "source">, { legacy: number; v2: number }>>;
};

export function createDataCollectingV2ValidationSnapshot(summary: TDataCollectingV2RunSummary): TDataCollectingV2ValidationSnapshot {
	return {
		source: summary.source,
		organizationId: summary.organizationId,
		salesCount: summary.importedSalesCount,
		createdSalesCount: summary.createdSalesCount,
		updatedSalesCount: summary.updatedSalesCount,
		createdInteractionsCount: summary.createdInteractionsCount,
		immediateInteractionsCount: summary.immediateInteractionsCount,
		cashbackTransactionsCount: summary.cashbackTransactionsCount,
		cashbackAccumulatedValue: summary.cashbackAccumulatedValue,
		firstPurchaseInteractionsCount: summary.firstPurchaseInteractionsCount,
		cashbackAccumulationInteractionsCount: summary.cashbackAccumulationInteractionsCount,
	};
}

export function compareDataCollectingSnapshots({
	legacy,
	v2,
}: {
	legacy: TDataCollectingV2ValidationSnapshot;
	v2: TDataCollectingV2ValidationSnapshot;
}): TDataCollectingV2ValidationDiff {
	const differences: TDataCollectingV2ValidationDiff["differences"] = {};
	const numericKeys = [
		"salesCount",
		"createdSalesCount",
		"updatedSalesCount",
		"createdInteractionsCount",
		"immediateInteractionsCount",
		"cashbackTransactionsCount",
		"cashbackAccumulatedValue",
		"firstPurchaseInteractionsCount",
		"cashbackAccumulationInteractionsCount",
	] as const;

	for (const key of numericKeys) {
		if (legacy[key] !== v2[key]) {
			differences[key] = { legacy: legacy[key], v2: v2[key] };
		}
	}

	return {
		organizationId: v2.organizationId,
		source: v2.source,
		matches: Object.keys(differences).length === 0,
		differences,
	};
}
