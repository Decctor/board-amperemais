import { db } from "@/services/drizzle";
import { financialTransactions } from "@/services/drizzle/schema";
import type { TPaymentMethodEnum } from "@/schemas/enums";
import { and, eq } from "drizzle-orm";

export type TSessionExpectedByMethod = {
	metodo: TPaymentMethodEnum;
	valorEsperado: number;
};

/**
 * Calcula o valor esperado por método de pagamento de uma sessão, lendo EXCLUSIVAMENTE de
 * `financialTransactions.sessaoVendaId` — a única fonte que cobre também sangria/suprimento/estorno
 * (movimentos sem venda).
 *
 * Por método: net = Σ(ENTRADA) − Σ(SAIDA). Ao DINHEIRO somamos o `saldoInicial` (fundo de troco),
 * pois o esperado de gaveta = saldoInicial + entradas − saídas de dinheiro.
 */
export async function computeSessionExpectedByMethod({
	orgId,
	sessaoVendaId,
	saldoInicial,
}: {
	orgId: string;
	sessaoVendaId: string;
	saldoInicial: number;
}): Promise<TSessionExpectedByMethod[]> {
	const rows = await db
		.select({
			metodo: financialTransactions.metodo,
			tipo: financialTransactions.tipo,
			valor: financialTransactions.valor,
		})
		.from(financialTransactions)
		.where(and(eq(financialTransactions.organizacaoId, orgId), eq(financialTransactions.sessaoVendaId, sessaoVendaId)));

	const byMethod = new Map<TPaymentMethodEnum, number>();
	for (const row of rows) {
		const signed = row.tipo === "ENTRADA" ? row.valor : -row.valor;
		byMethod.set(row.metodo, (byMethod.get(row.metodo) ?? 0) + signed);
	}

	// Fundo de troco entra apenas no esperado de dinheiro.
	if (saldoInicial !== 0 || byMethod.has("DINHEIRO")) {
		byMethod.set("DINHEIRO", (byMethod.get("DINHEIRO") ?? 0) + saldoInicial);
	}

	return Array.from(byMethod.entries()).map(([metodo, valorEsperado]) => ({ metodo, valorEsperado }));
}
