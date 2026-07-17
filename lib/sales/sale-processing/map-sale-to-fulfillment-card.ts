import { isManagedFulfillmentSaleModel } from "@/lib/sales/fulfillment-channels/policy";
import { classifySalePaymentTransactions, extractPaymentObservacoesFromTitle, type SalePaymentTransactionInput } from "@/lib/sales/utils";
import { computeSaleFinancialStatus, computeSaleFiscalStatus } from "@/lib/sales/utils";
import type { TSaleAttendanceStatusEnum } from "@/schemas/enums";

type SaleFulfillmentRow = {
	id: string;
	idExterno: string;
	valorTotal: number;
	statusVenda: string | null;
	statusAtendimento: TSaleAttendanceStatusEnum;
	entregaModalidade: string | null;
	comandaNumero: string | null;
	clienteId: string | null;
	observacoes: string | null;
	dataVenda: Date | null;
	modelo?: string | null;
	processamentoOrigem?: string | null;
	cliente: { id: string; nome: string; telefone: string | null } | null;
	documentosFiscais: { statusInterno: string | null; dataInsercao: Date }[];
	lancamentosContabeis: {
		id: string;
		transacoesFinanceiras: {
			id: string;
			lancamentoContabilId?: string;
			titulo: string;
			valor: number;
			tipo: string;
			metodo: SalePaymentTransactionInput["metodo"];
			contaFinanceiraId: string | null;
			parcela: number | null;
			totalParcelas: number | null;
			dataEfetivacao: Date | null;
			dataPrevisao: Date;
			provedorStatus: string | null;
		}[];
	}[];
};

export function mapSaleRowToFulfillmentCard(sale: SaleFulfillmentRow) {
	const now = new Date();
	const rawTransactions: SalePaymentTransactionInput[] = sale.lancamentosContabeis.flatMap((entry) =>
		entry.transacoesFinanceiras.map((transaction) => ({
			...transaction,
			lancamentoContabilId: transaction.lancamentoContabilId ?? entry.id,
		})),
	);
	const classification = classifySalePaymentTransactions(rawTransactions);
	const paymentNotes =
		rawTransactions.map((transaction) => extractPaymentObservacoesFromTitle(transaction.titulo)).find((note) => note != null) ?? null;

	return {
		id: sale.id,
		idExterno: sale.idExterno,
		valorTotal: sale.valorTotal,
		statusVenda: sale.statusVenda,
		statusAtendimento: sale.statusAtendimento,
		// Canal de fulfillment gerenciado (ex.: iFood). Null = venda interna/fluxo local puro.
		integracaoCanal: sale.processamentoOrigem === "EXTERNO" && isManagedFulfillmentSaleModel(sale.modelo) ? ("IFOOD" as const) : null,
		entregaModalidade: sale.entregaModalidade,
		comandaNumero: sale.comandaNumero,
		clienteId: sale.clienteId,
		observacoes: sale.observacoes,
		dataVenda: sale.dataVenda,
		cliente: sale.cliente,
		financeiro: computeSaleFinancialStatus({
			transactions: rawTransactions.map((transaction) => ({
				valor: transaction.valor,
				tipo: transaction.tipo,
				dataEfetivacao: transaction.dataEfetivacao ?? null,
				dataPrevisao: transaction.dataPrevisao ?? null,
				provedorStatus: transaction.provedorStatus,
			})),
			saleTotal: sale.valorTotal,
			now,
		}),
		pagamentos: classification.todas,
		resumoPagamentos: classification.resumo,
		pagamentoObservacoes: paymentNotes === sale.observacoes ? null : paymentNotes,
		fiscal: computeSaleFiscalStatus({ documents: sale.documentosFiscais }),
	};
}

export type TSaleFulfillmentCardMapped = ReturnType<typeof mapSaleRowToFulfillmentCard>;
