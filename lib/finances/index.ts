/**
 * Método que marca transações de transferência entre contas. Transferências zeram no líquido,
 * mas inflariam qualquer métrica de fluxo (entradas/saídas, atrasos) — exclua-as com
 * `ne(financialTransactions.metodo, FINANCIAL_TRANSFER_METHOD)` sempre que medir fluxo.
 */
export const FINANCIAL_TRANSFER_METHOD = "TRANSFERENCIA" as const;

type TAccountChartWithNature = {
	id: string;
	natureza: "ATIVO" | "PASSIVO" | "PATRIMONIO_LIQUIDO" | "RECEITA" | "CUSTO" | "DESPESA";
};

export function getAccountChartIdsByNatureza(accounts: TAccountChartWithNature[], natureza: TAccountChartWithNature["natureza"]) {
	return accounts.filter((account) => account.natureza === natureza).map((account) => account.id);
}
