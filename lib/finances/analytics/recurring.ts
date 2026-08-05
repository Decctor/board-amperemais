import dayjs from "dayjs";
import type { TFinancialRecurringRuleConfig, TFinancialRecurringRuleTransactionTemplate } from "@/schemas/financial-recurring";

/** Média de ocorrências por mês de uma regra recorrente, para normalizar compromissos em base mensal. */
export function getMonthlyOccurrencesFactor(config: Pick<TFinancialRecurringRuleConfig, "frequencia" | "intervalo">) {
	const interval = config.intervalo || 1;
	if (config.frequencia === "DIARIA") return 30.44 / interval;
	if (config.frequencia === "SEMANAL") return 52.18 / 12 / interval;
	if (config.frequencia === "ANUAL") return 1 / (12 * interval);
	return 1 / interval;
}

type TRecurringRuleForCommitments = {
	config: Pick<TFinancialRecurringRuleConfig, "frequencia" | "intervalo" | "fim">;
	templateTransacoes: Array<Pick<TFinancialRecurringRuleTransactionTemplate, "tipo" | "valor">>;
};

/** Entradas/saídas mensais normalizadas das regras ativas e não expiradas. */
export function computeRecurringMonthlyCommitments(rules: TRecurringRuleForCommitments[], referenceDate = new Date()) {
	let entradas = 0;
	let saidas = 0;
	const today = dayjs(referenceDate);
	for (const rule of rules) {
		if (rule.config.fim && dayjs(rule.config.fim).isBefore(today, "day")) continue;
		const factor = getMonthlyOccurrencesFactor(rule.config);
		for (const template of rule.templateTransacoes) {
			const monthlyValue = template.valor * factor;
			if (template.tipo === "ENTRADA") entradas += monthlyValue;
			else saidas += monthlyValue;
		}
	}
	return { entradas, saidas };
}
