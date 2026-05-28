import type { TFiscalTaxGroupRuleEntity } from "@/services/drizzle/schema";
import type { TEffectiveTaxConfig, TFiscalTaxGroupWithRules, TFiscalTaxScenario } from "./types";

// Verifica se a regra se aplica ao cenario. Colunas anulaveis na regra significam "qualquer".
function ruleMatchesScenario(rule: TFiscalTaxGroupRuleEntity, scenario: TFiscalTaxScenario): boolean {
	if (!rule.ativo) return false;
	if (rule.escopo !== scenario.escopo) return false;
	if (rule.ufDestino && rule.ufDestino.toUpperCase() !== scenario.ufDestino.toUpperCase()) return false;
	if (rule.indicadorDestinatario && rule.indicadorDestinatario !== scenario.indicadorDestinatario) return false;
	if (rule.finalidade && rule.finalidade !== scenario.finalidade) return false;
	return true;
}

// Quanto mais dimensoes especificas a regra fixa, maior a prioridade.
function ruleSpecificityScore(rule: TFiscalTaxGroupRuleEntity): number {
	let score = 0;
	if (rule.ufDestino) score += 4;
	if (rule.indicadorDestinatario) score += 2;
	if (rule.finalidade) score += 1;
	return score;
}

// Seleciona a regra mais especifica que casa com o cenario, se houver.
export function selectMatchingRule(group: TFiscalTaxGroupWithRules, scenario: TFiscalTaxScenario): TFiscalTaxGroupRuleEntity | null {
	const matching = (group.regras ?? []).filter((rule) => ruleMatchesScenario(rule, scenario));
	if (matching.length === 0) return null;
	return matching.reduce((best, current) => (ruleSpecificityScore(current) > ruleSpecificityScore(best) ? current : best));
}

function coalesce<T>(override: T | null | undefined, fallback: T): T {
	return override === null || override === undefined ? fallback : override;
}

// Aplica os defaults do grupo e sobrepoe a regra mais especifica para obter a config efetiva.
export function resolveEffectiveTaxConfig(group: TFiscalTaxGroupWithRules, scenario: TFiscalTaxScenario): TEffectiveTaxConfig {
	const rule = selectMatchingRule(group, scenario);

	return {
		csosn: coalesce(rule?.csosn, group.csosn),
		aliquotaIcms: coalesce(rule?.aliquotaIcms, group.aliquotaIcms),
		percentualReducaoBc: coalesce(rule?.percentualReducaoBc, group.percentualReducaoBc),
		modalidadeBc: group.modalidadeBc,
		percentualCreditoSn: coalesce(rule?.percentualCreditoSn, group.percentualCreditoSn),
		temSubstituicaoTributaria: coalesce(rule?.temSubstituicaoTributaria, group.temSubstituicaoTributaria),
		mvaSt: coalesce(rule?.mvaSt, group.mvaSt),
		aliquotaIcmsSt: coalesce(rule?.aliquotaIcmsSt, group.aliquotaIcmsSt),
		aliquotaInternaDestino: coalesce(rule?.aliquotaInternaDestino, group.aliquotaInternaDestino),
		percentualReducaoBcSt: coalesce(rule?.percentualReducaoBcSt, group.percentualReducaoBcSt),
		cstPis: group.cstPis,
		aliquotaPis: group.aliquotaPis,
		cstCofins: group.cstCofins,
		aliquotaCofins: group.aliquotaCofins,
	};
}

// Sobrescrita de CFOP definida pela regra mais especifica (se houver).
export function resolveRuleCfopOverride(group: TFiscalTaxGroupWithRules, scenario: TFiscalTaxScenario): string | null {
	const rule = selectMatchingRule(group, scenario);
	return rule?.cfop ?? null;
}
