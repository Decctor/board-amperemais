import type { TSaleFinancialDerivedStatusEnum, TSaleFiscalDerivedStatusEnum } from "@/schemas/enums";

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
	// Considera apenas entradas (recebimentos) quando o tipo estiver disponivel.
	const relevant = transactions.filter((t) => (t.tipo ? t.tipo === "ENTRADA" : true));
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
