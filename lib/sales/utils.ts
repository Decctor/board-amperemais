import type { TSaleFinancialDerivedStatusEnum, TSaleFiscalDerivedStatusEnum, TPaymentMethodEnum } from "@/schemas/enums";

/**
 * Status financeiro e fiscal DERIVADOS de uma venda.
 *
 * Estes status NAO sao persistidos em `sales`. O financeiro e calculado a partir das
 * `financialTransactions` ligadas aos `accountingEntries` da venda; o fiscal e calculado a
 * partir dos `fiscalOutboundDocuments` da venda. Sao apenas apresentacionais/derivados.
 */

type FinancialTransactionLike = {
	valor: number;
	tipo?: "ENTRADA" | "SAIDA" | string | null;
	dataEfetivacao: Date | string | null;
	dataPrevisao: Date | string | null;
	provedorStatus?: string | null;
};

/**
 * Calcula o status financeiro derivado de uma venda a partir de suas transacoes financeiras.
 *
 * Regras:
 * - sem transacoes: NAO_GERADO (a venda nao gerou movimentacao financeira na plataforma);
 * - soma efetivada >= total da venda: RECEBIDA;
 * - alguma efetivacao porem abaixo do total: PARCIALMENTE_RECEBIDA;
 * - nada efetivado e existe transacao vencida (dataPrevisao < agora): EM_ATRASO;
 * - caso contrario: PENDENTE.
 */
export function computeSaleFinancialStatus({
	transactions,
	saleTotal,
	now = new Date(),
}: {
	transactions: FinancialTransactionLike[];
	saleTotal: number;
	now?: Date;
}): TSaleFinancialDerivedStatusEnum {
	if (saleTotal <= 0) return "RECEBIDA";

	// Considera apenas entradas (recebimentos) quando o tipo estiver disponivel.
	const relevant = transactions.filter((t) => (t.tipo ? t.tipo === "ENTRADA" : true) && !["CANCELADO", "ESTORNADO"].includes(t.provedorStatus ?? ""));
	if (relevant.length === 0) return "NAO_GERADO";

	const settledTotal = relevant.filter((t) => t.dataEfetivacao != null).reduce((acc, t) => acc + (t.valor ?? 0), 0);

	if (settledTotal >= saleTotal && saleTotal > 0) return "RECEBIDA";
	if (settledTotal > 0) return "PARCIALMENTE_RECEBIDA";

	const hasOverdue = relevant.some((t) => {
		if (t.dataEfetivacao != null) return false;
		if (!t.dataPrevisao) return false;
		const previsao = t.dataPrevisao instanceof Date ? t.dataPrevisao : new Date(t.dataPrevisao);
		return previsao.getTime() < now.getTime();
	});
	if (hasOverdue) return "EM_ATRASO";

	return "PENDENTE";
}

type FiscalDocumentLike = {
	statusInterno: string | null;
	dataInsercao?: Date | string | null;
};

// Prioridade de exibicao: um documento autorizado domina, depois processamento, depois erros, etc.
const FISCAL_STATUS_PRIORITY: TSaleFiscalDerivedStatusEnum[] = [
	"AUTORIZADO",
	"EM_PROCESSAMENTO",
	"PENDENTE",
	"REJEITADO",
	"ERRO",
	"CANCELADO",
	"INUTILIZADO",
];

function mapInternalFiscalStatus(statusInterno: string | null): TSaleFiscalDerivedStatusEnum | null {
	switch (statusInterno) {
		case "AUTORIZADO":
			return "AUTORIZADO";
		case "EM_PROCESSAMENTO":
		case "CANCELAMENTO_PENDENTE":
			return "EM_PROCESSAMENTO";
		case "RASCUNHO":
		case "PRONTO_PARA_ENVIO":
			return "PENDENTE";
		case "REJEITADO":
			return "REJEITADO";
		case "ERRO":
			return "ERRO";
		case "CANCELADO":
			return "CANCELADO";
		case "INUTILIZADO":
			return "INUTILIZADO";
		default:
			return null;
	}
}

/**
 * Calcula o badge fiscal derivado de uma venda a partir dos seus documentos fiscais.
 *
 * - sem documentos: NAO_EMITIDO;
 * - caso contrario, escolhe o status de maior prioridade entre os documentos.
 */
export function computeSaleFiscalStatus({ documents }: { documents: FiscalDocumentLike[] }): TSaleFiscalDerivedStatusEnum {
	if (documents.length === 0) return "NAO_EMITIDO";

	const mapped = documents.map((d) => mapInternalFiscalStatus(d.statusInterno)).filter((s): s is TSaleFiscalDerivedStatusEnum => s !== null);
	if (mapped.length === 0) return "PENDENTE";

	for (const status of FISCAL_STATUS_PRIORITY) {
		if (mapped.includes(status)) return status;
	}
	return "PENDENTE";
}

const NON_EDITABLE_PAYMENT_STATUSES = new Set(["CANCELADO", "ESTORNADO"]);

export type SalePaymentTransactionInput = {
	id: string;
	lancamentoContabilId: string;
	titulo?: string | null;
	valor: number;
	tipo?: string | null;
	metodo: TPaymentMethodEnum;
	parcela?: number | null;
	totalParcelas?: number | null;
	dataEfetivacao?: Date | string | null;
	dataPrevisao?: Date | string | null;
	provedorStatus?: string | null;
	contaFinanceiraId?: string | null;
};

export type ClassifiedPayment = {
	id: string;
	metodo: TPaymentMethodEnum;
	valor: number;
	parcela: number | null;
	totalParcelas: number | null;
	dataEfetivacao: Date | string | null;
	dataPrevisao: Date | string | null;
	provedorStatus: string | null;
	editavel: boolean;
	motivoNaoEditavel: string | null;
	grupoParcelasId: string | null;
	contaFinanceiraId: string | null;
};

export type PaymentClassification = {
	todas: ClassifiedPayment[];
	editaveis: ClassifiedPayment[];
	efetivadas: ClassifiedPayment[];
	gruposParcelas: Record<string, ClassifiedPayment[]>;
	resumo: {
		totalEditaveis: number;
		totalPendentes: number;
		totalEfetivadas: number;
	};
};

export function toDateOrNull(value: Date | string | null | undefined): Date | null {
	if (value == null) return null;
	const parsed = value instanceof Date ? value : new Date(value);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getPaymentNonEditableReason(transaction: SalePaymentTransactionInput): string | null {
	if (transaction.tipo && transaction.tipo !== "ENTRADA") {
		return "Somente recebimentos podem ser alterados aqui.";
	}
	if (toDateOrNull(transaction.dataEfetivacao) != null) {
		return "Pagamento já recebido.";
	}
	if (NON_EDITABLE_PAYMENT_STATUSES.has(transaction.provedorStatus ?? "")) {
		return "Transação cancelada ou estornada.";
	}
	if (transaction.metodo === "CASHBACK") {
		return "Resgate de cashback não pode ser alterado aqui.";
	}
	return null;
}

export function isPaymentTransactionEditable(transaction: SalePaymentTransactionInput): boolean {
	return getPaymentNonEditableReason(transaction) == null;
}

export function isPaymentOverdue(payment: Pick<ClassifiedPayment, "dataEfetivacao" | "dataPrevisao" | "provedorStatus">, now = new Date()): boolean {
	if (toDateOrNull(payment.dataEfetivacao) != null) return false;
	if (NON_EDITABLE_PAYMENT_STATUSES.has(payment.provedorStatus ?? "")) return false;
	const previsao = toDateOrNull(payment.dataPrevisao);
	if (!previsao) return false;
	return previsao.getTime() < now.getTime();
}

function resolveInstallmentGroupId(transaction: SalePaymentTransactionInput): string | null {
	if (!transaction.totalParcelas || transaction.totalParcelas <= 1) return null;
	return `${transaction.lancamentoContabilId}:${transaction.metodo}:${transaction.totalParcelas}`;
}

export function classifySalePaymentTransactions(transactions: SalePaymentTransactionInput[]): PaymentClassification {
	const todas: ClassifiedPayment[] = transactions.map((transaction) => {
		const motivoNaoEditavel = getPaymentNonEditableReason(transaction);
		return {
			id: transaction.id,
			metodo: transaction.metodo,
			valor: transaction.valor,
			parcela: transaction.parcela ?? null,
			totalParcelas: transaction.totalParcelas ?? null,
			dataEfetivacao: toDateOrNull(transaction.dataEfetivacao),
			dataPrevisao: toDateOrNull(transaction.dataPrevisao),
			provedorStatus: transaction.provedorStatus ?? null,
			editavel: motivoNaoEditavel == null,
			motivoNaoEditavel,
			grupoParcelasId: resolveInstallmentGroupId(transaction),
			contaFinanceiraId: transaction.contaFinanceiraId ?? null,
		};
	});

	const editaveis = todas.filter((payment) => payment.editavel);
	const efetivadas = todas.filter((payment) => payment.dataEfetivacao != null);
	const pendentes = todas.filter((payment) => payment.dataEfetivacao == null && !NON_EDITABLE_PAYMENT_STATUSES.has(payment.provedorStatus ?? ""));

	const gruposParcelas: Record<string, ClassifiedPayment[]> = {};
	for (const payment of todas) {
		if (!payment.grupoParcelasId) continue;
		if (!gruposParcelas[payment.grupoParcelasId]) gruposParcelas[payment.grupoParcelasId] = [];
		gruposParcelas[payment.grupoParcelasId].push(payment);
	}

	return {
		todas,
		editaveis,
		efetivadas,
		gruposParcelas,
		resumo: {
			totalEditaveis: editaveis.length,
			totalPendentes: pendentes.length,
			totalEfetivadas: efetivadas.length,
		},
	};
}

export function buildPaymentTransactionTitle(method: TPaymentMethodEnum, observacoes?: string | null) {
	const base = `Pagamento via ${method}`;
	if (!observacoes?.trim()) return `${base} - Venda`;
	return `${base} - ${observacoes.trim()}`;
}

export function extractPaymentObservacoesFromTitle(titulo: string | null | undefined): string | null {
	if (!titulo?.includes(" - ")) return null;
	const parts = titulo.split(" - ").slice(1);
	const joined = parts.join(" - ").trim();
	if (!joined || joined === "Venda") return null;
	return joined;
}
