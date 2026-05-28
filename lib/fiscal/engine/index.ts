export { resolveCfop } from "./cfop";
export { aliquotaInterestadual } from "./data/aliquotas-interestaduais";
export { isOrigemImportada, mapOrigemToCodigo, UF_TO_IBGE_CODE } from "./data/uf";
export { resolveEffectiveTaxConfig, resolveRuleCfopOverride, selectMatchingRule } from "./rules";
export { computeDocumentTotals, computeItemTaxation, type TComputeItemTaxationInput } from "./taxation";
export type {
	TDocumentTaxTotals,
	TEffectiveTaxConfig,
	TFiscalItemInput,
	TFiscalTaxGroupWithRules,
	TFiscalTaxScenario,
	TFiscalValidationError,
	TFiscalValidationSeverity,
	TIcmsTaxResult,
	TItemTaxResult,
} from "./types";
export { aggregateItemErrors, formatValidationMessages, hasBlockingErrors } from "./validation";
