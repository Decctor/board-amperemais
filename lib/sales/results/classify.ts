import type { TFiscalDocumentLifecycleStatusEnum } from "@/schemas/enums";

export type TFiscalHealthBucket = "AUTORIZADA" | "PENDENTE" | "REJEITADA" | "CANCELADA";

/**
 * Reduz o ciclo de vida interno do documento (`statusInterno`) aos quatro estados que importam
 * para a saúde de emissão de um período. Usa o ciclo interno, nunca o `status` externo, pela
 * mesma razão do fechamento de caixa (docs/sales-sessions-design.md §0.5).
 */
export function classifyFiscalLifecycleStatus(statusInterno: TFiscalDocumentLifecycleStatusEnum): TFiscalHealthBucket {
	switch (statusInterno) {
		case "AUTORIZADO":
			return "AUTORIZADA";
		case "REJEITADO":
		case "ERRO":
			return "REJEITADA";
		case "CANCELADO":
		case "INUTILIZADO":
			return "CANCELADA";
		case "RASCUNHO":
		case "PRONTO_PARA_ENVIO":
		case "EM_PROCESSAMENTO":
		case "CANCELAMENTO_PENDENTE":
			return "PENDENTE";
	}
}

/** Participação percentual de `part` em `total`; sem total não há participação. */
export function computeShare(part: number, total: number): number {
	if (!Number.isFinite(total) || total === 0) return 0;
	return (part / total) * 100;
}

/** Média segura: `null` quando não há base, para que "sem venda" não vire "ticket zero". */
export function computeAverage(total: number, count: number): number | null {
	if (count === 0) return null;
	return total / count;
}

/** Percentual atingido de uma meta; `null` quando não há meta. */
export function computeGoalAttainment(achieved: number, goal: number): number | null {
	if (!Number.isFinite(goal) || goal <= 0) return null;
	return (achieved / goal) * 100;
}
