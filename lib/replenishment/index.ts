// Barrel isomórfico: só módulos puros. As leituras de banco (`get-replenishment-analysis` e
// `settings`) ficam de fora de propósito — a tela importa tipos e o cálculo de oferta daqui, e um
// reexport delas arrastaria o cliente Postgres para o bundle do navegador. As rotas de API importam
// esses dois módulos pelo caminho direto.
export { buildDemandProfile, calculateCoverageDays, DEMAND_BUCKET_WEIGHTS, resolveEffectiveDays } from "./demand";
export { buildReplenishmentPlan, calculateSafetyStock, normalInverseCdf, roundToPurchaseMultiple, serviceLevelFactor } from "./policy";
export {
	calculatePotentialLoss,
	calculatePriorityIndex,
	classifyReplenishmentStatus,
	isReplenishmentStatusActionable,
	projectStockoutDate,
} from "./classify";
export { buildOfferSuggestion, calculateExcessUnits, DEFAULT_OFFER_FLOOR_MARGIN, type TOfferSuggestion } from "./offers";
export type {
	TDemandBucket,
	TDemandProfile,
	TReplenishmentItem,
	TReplenishmentPlan,
	TReplenishmentPolicy,
	TReplenishmentSummary,
	TReplenishmentSupplier,
	TReplenishmentValuation,
} from "./types";
