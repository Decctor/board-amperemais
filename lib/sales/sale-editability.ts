import { ACCOUNTING_ENTRY_BALANCE_TOLERANCE } from "@/lib/finances/accounting-entry-balance";
import { getSaleChangeTotal } from "@/lib/sales/sale-change";
import type { TSaleAttendanceStatusEnum } from "@/schemas/enums";

/**
 * Política de editabilidade de uma venda, derivada do seu estado (nunca persistida).
 *
 * A regra de negócio: edição completa só é possível ANTES do estágio final da venda
 * (entrega efetiva + recebimento integral + documento fiscal emitido). Depois disso,
 * a única saída é o cancelamento com estorno. Documento fiscal vivo trava qualquer
 * edição de valor mesmo antes da entrega, porque a nota emitida é um snapshot dos valores.
 */

const DEAD_FISCAL_STATUSES = new Set(["CANCELADO", "INUTILIZADO"]);
const REVERSED_TRANSACTION_STATUSES = new Set(["CANCELADO", "ESTORNADO"]);
const DELIVERED_ATTENDANCE_STATUSES = new Set<TSaleAttendanceStatusEnum>(["ENTREGUE", "PARCIALMENTE_ENTREGUE"]);

export type TSaleEditabilityRow = {
	statusVenda: string | null;
	statusAtendimento: TSaleAttendanceStatusEnum;
	processamentoOrigem: string | null;
	tabId?: string | null;
	valorTotal: number;
	documentosFiscais: { statusInterno: string | null }[];
	transacoes: {
		valor: number;
		tipo?: string | null;
		dataEfetivacao?: Date | string | null;
		provedorStatus?: string | null;
		modificadoresMetadata?: { origem?: string | null } | null;
	}[];
};

// Viaja como dado para a UI (campos em português): habilita/desabilita ações com as razões.
export type TSaleEditability = {
	nivel: "TOTAL" | "CABECALHO" | "CANCELAMENTO" | "NENHUMA";
	rascunho: boolean;
	motivos: string[];
	valorMinimoEdicao: number;
	fiscalBloqueia: boolean;
	cancelamentoDisponivel: boolean;
	cancelamentoExigeFiscal: boolean;
	/**
	 * Exclusão é mais restrita que edição: qualquer documento fiscal a trava, inclusive os mortos
	 * (cancelado/inutilizado), porque a numeração emitida precisa continuar rastreável à venda.
	 * Espelha a guarda do DELETE em `/api/sales`.
	 */
	exclusaoBloqueadaPorFiscal: boolean;
};

/**
 * Soma dos recebimentos já efetivados (ENTRADA, não cancelados/estornados), líquida do troco já
 * entregue ao cliente (SAÍDA de troco do mesmo lançamento). É o piso do novo valorTotal em uma
 * edição: reduzir abaixo do já recebido exigiria perna de reembolso, que é exatamente o que o
 * cancelamento com estorno resolve.
 */
export function getSaleSettledTotal(transacoes: TSaleEditabilityRow["transacoes"]) {
	const recebido = transacoes
		.filter(
			(transaction) =>
				(transaction.tipo ? transaction.tipo === "ENTRADA" : true) &&
				!REVERSED_TRANSACTION_STATUSES.has(transaction.provedorStatus ?? "") &&
				transaction.dataEfetivacao != null,
		)
		.reduce((acc, transaction) => acc + (transaction.valor ?? 0), 0);
	return Math.max(0, recebido - getSaleChangeTotal(transacoes));
}

export function saleHasLiveFiscalDocument(documentosFiscais: TSaleEditabilityRow["documentosFiscais"]) {
	return documentosFiscais.some((document) => !DEAD_FISCAL_STATUSES.has(document.statusInterno ?? ""));
}

export function resolveSaleEditability(sale: TSaleEditabilityRow): TSaleEditability {
	const fiscalBloqueia = saleHasLiveFiscalDocument(sale.documentosFiscais);
	const valorMinimoEdicao = getSaleSettledTotal(sale.transacoes);
	const cancelamentoDisponivel = sale.statusVenda === "CONFIRMADA";

	const base = {
		rascunho: false,
		valorMinimoEdicao,
		fiscalBloqueia,
		cancelamentoDisponivel,
		cancelamentoExigeFiscal: cancelamentoDisponivel && fiscalBloqueia,
		exclusaoBloqueadaPorFiscal: sale.documentosFiscais.length > 0,
	};

	if (sale.processamentoOrigem !== "INTERNO") {
		return { ...base, nivel: "NENHUMA", cancelamentoDisponivel: false, cancelamentoExigeFiscal: false, motivos: ["Vendas de canais externos não são editáveis."] };
	}
	if (sale.statusVenda === "CANCELADA" || sale.statusAtendimento === "CANCELADO") {
		return { ...base, nivel: "NENHUMA", cancelamentoDisponivel: false, cancelamentoExigeFiscal: false, motivos: ["Venda cancelada."] };
	}
	if (sale.statusVenda === "ORCAMENTO") {
		return { ...base, nivel: "NENHUMA", rascunho: true, motivos: ["Rascunhos são editados pelo checkout."] };
	}
	if (sale.statusVenda !== "CONFIRMADA") {
		return { ...base, nivel: "NENHUMA", motivos: ["A venda não possui trilha contábil para edição."] };
	}
	if (sale.tabId) {
		return { ...base, nivel: "NENHUMA", motivos: ["Venda de conta de atendimento: edite pela conta."] };
	}

	if (fiscalBloqueia) {
		const entregueERecebida = DELIVERED_ATTENDANCE_STATUSES.has(sale.statusAtendimento) && valorMinimoEdicao >= sale.valorTotal - ACCOUNTING_ENTRY_BALANCE_TOLERANCE;
		if (entregueERecebida) {
			return { ...base, nivel: "CANCELAMENTO", motivos: ["Venda entregue, recebida e com nota emitida: somente cancelamento com estorno."] };
		}
		return { ...base, nivel: "CABECALHO", motivos: ["Nota fiscal emitida: cancele a nota para editar valores."] };
	}

	return { ...base, nivel: "TOTAL", motivos: [] };
}
