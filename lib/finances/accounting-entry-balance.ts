// Tolerancia em reais para diferencas de arredondamento entre o valor do lancamento contabil
// e a soma das transacoes financeiras que o quitam.
export const ACCOUNTING_ENTRY_BALANCE_TOLERANCE = 0.02;

type TBalanceableTransaction = { valor: number; deletar?: boolean | null };

export function getActiveTransactionsTotal(transactions: TBalanceableTransaction[]) {
	return transactions.filter((transaction) => !transaction.deletar).reduce((acc, transaction) => acc + (transaction.valor || 0), 0);
}

/**
 * Um lancamento pode nao ter nenhuma transacao (pagamento ainda nao programado), mas quando tem, a soma
 * delas precisa fechar com o valor do lancamento. Retorna a mensagem de erro ou `null` quando esta valido.
 */
export function getAccountingEntryBalanceError({
	entryValue,
	transactions,
}: {
	entryValue: number;
	transactions: TBalanceableTransaction[];
}): string | null {
	const activeTransactions = transactions.filter((transaction) => !transaction.deletar);
	if (activeTransactions.length === 0) return null;

	const total = getActiveTransactionsTotal(activeTransactions);
	if (Math.abs(total - (entryValue || 0)) > ACCOUNTING_ENTRY_BALANCE_TOLERANCE) {
		return "A soma das transações financeiras precisa bater o valor do lançamento.";
	}

	return null;
}
