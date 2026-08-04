import dayjs from "dayjs";

export const CREDIT_CARD_INVOICE_TOLERANCE = 0.02;

export type TCreditCardInvoiceTransaction = {
	id: string;
	contaFinanceiraId: string | null;
	titulo: string;
	tipo: "ENTRADA" | "SAIDA";
	valor: number;
	valorBase: number;
	valorJuros: number;
	valorMulta: number;
	valorTaxas: number;
	valorDesconto: number;
	metodo: string;
	dataPrevisao: Date;
	dataEfetivacao: Date | null;
	parcela: number | null;
	totalParcelas: number | null;
	provedorStatus: string | null;
	lancamentoContabilId: string;
	origemTipo: string;
};

export type TDerivedCreditCardInvoice = {
	contaFinanceiraId: string;
	dataVencimento: string;
	valorBase: number;
	valorJuros: number;
	valorMulta: number;
	valorTaxas: number;
	valorDesconto: number;
	valorFaturado: number;
	valorPago: number;
	valorCreditos: number;
	saldoAberto: number;
	status: "ABERTA" | "PARCIALMENTE_PAGA" | "PAGA" | "VENCIDA" | "CREDORA";
	transacoes: TCreditCardInvoiceTransaction[];
};

function roundCurrency(value: number) {
	return Math.round((value + Number.EPSILON) * 100) / 100;
}

function isCanceled(status: string | null) {
	return !!status && ["CANCELADO", "CANCELADA", "ESTORNADO", "ESTORNADA", "REFUNDED", "VOIDED"].includes(status.toUpperCase());
}

export function getCreditCardInvoiceDateKey(date: Date | string) {
	return dayjs(date).format("YYYY-MM-DD");
}

export function deriveCreditCardInvoice({
	contaFinanceiraId,
	dataVencimento,
	transactions,
	now = new Date(),
}: {
	contaFinanceiraId: string;
	dataVencimento: Date | string;
	transactions: TCreditCardInvoiceTransaction[];
	now?: Date;
}): TDerivedCreditCardInvoice {
	const dueDateKey = getCreditCardInvoiceDateKey(dataVencimento);
	const activeTransactions = transactions.filter((transaction) => !isCanceled(transaction.provedorStatus));
	const charges = activeTransactions.filter((transaction) => transaction.tipo === "SAIDA");
	const payments = activeTransactions.filter((transaction) => transaction.tipo === "ENTRADA" && transaction.origemTipo === "PAGAMENTO_CARTAO");
	const credits = activeTransactions.filter((transaction) => transaction.tipo === "ENTRADA" && transaction.origemTipo !== "PAGAMENTO_CARTAO");
	const valorFaturado = roundCurrency(charges.reduce((total, transaction) => total + transaction.valor, 0));
	const valorBase = roundCurrency(charges.reduce((total, transaction) => total + transaction.valorBase, 0));
	const valorJuros = roundCurrency(charges.reduce((total, transaction) => total + transaction.valorJuros, 0));
	const valorMulta = roundCurrency(charges.reduce((total, transaction) => total + transaction.valorMulta, 0));
	const valorTaxas = roundCurrency(charges.reduce((total, transaction) => total + transaction.valorTaxas, 0));
	const valorDesconto = roundCurrency(charges.reduce((total, transaction) => total + transaction.valorDesconto, 0));
	const valorPago = roundCurrency(payments.reduce((total, transaction) => total + transaction.valor, 0));
	const valorCreditos = roundCurrency(credits.reduce((total, transaction) => total + transaction.valor, 0));
	const saldoAberto = roundCurrency(valorFaturado - valorPago - valorCreditos);
	const isPastDue = dayjs(dataVencimento).isBefore(dayjs(now), "day");

	let status: TDerivedCreditCardInvoice["status"] = "ABERTA";
	if (saldoAberto < -CREDIT_CARD_INVOICE_TOLERANCE) status = "CREDORA";
	else if (saldoAberto <= CREDIT_CARD_INVOICE_TOLERANCE) status = "PAGA";
	else if (valorPago > CREDIT_CARD_INVOICE_TOLERANCE || valorCreditos > CREDIT_CARD_INVOICE_TOLERANCE) status = "PARCIALMENTE_PAGA";
	else if (isPastDue) status = "VENCIDA";

	return {
		contaFinanceiraId,
		dataVencimento: dueDateKey,
		valorBase,
		valorJuros,
		valorMulta,
		valorTaxas,
		valorDesconto,
		valorFaturado,
		valorPago,
		valorCreditos,
		saldoAberto,
		status,
		transacoes: activeTransactions,
	};
}

export function groupCreditCardInvoiceTransactions(transactions: TCreditCardInvoiceTransaction[]) {
	const grouped = new Map<string, TCreditCardInvoiceTransaction[]>();
	for (const transaction of transactions) {
		if (isCanceled(transaction.provedorStatus) || !transaction.contaFinanceiraId) continue;
		const key = `${transaction.contaFinanceiraId}:${getCreditCardInvoiceDateKey(transaction.dataPrevisao)}`;
		const current = grouped.get(key) ?? [];
		current.push(transaction);
		grouped.set(key, current);
	}
	return grouped;
}
