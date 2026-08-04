import assert from "node:assert/strict";
import { test } from "node:test";
import { deriveCreditCardInvoice } from "./credit-card-invoice";

const baseTransaction = {
	contaFinanceiraId: "card-1",
	valorBase: 100,
	valorJuros: 0,
	valorMulta: 0,
	valorTaxas: 0,
	valorDesconto: 0,
	metodo: "CARTAO_CREDITO",
	dataPrevisao: new Date("2026-08-10T12:00:00Z"),
	dataEfetivacao: null,
	parcela: null,
	totalParcelas: null,
	provedorStatus: null,
	lancamentoContabilId: "entry-1",
};

test("deriva fatura parcialmente paga a partir de saídas e pagamento de cartão", () => {
	const invoice = deriveCreditCardInvoice({
		contaFinanceiraId: "card-1",
		dataVencimento: new Date("2026-08-10T12:00:00Z"),
		now: new Date("2026-08-01T12:00:00Z"),
		transactions: [
			{ ...baseTransaction, id: "charge", titulo: "Compra", tipo: "SAIDA", valor: 100, origemTipo: "VENDA" },
			{ ...baseTransaction, id: "payment", titulo: "Pagamento", tipo: "ENTRADA", valor: 40, origemTipo: "PAGAMENTO_CARTAO" },
		],
	});
	assert.equal(invoice.saldoAberto, 60);
	assert.equal(invoice.status, "PARCIALMENTE_PAGA");
});

test("classifica fatura vencida sem liquidação", () => {
	const invoice = deriveCreditCardInvoice({
		contaFinanceiraId: "card-1",
		dataVencimento: new Date("2026-07-10T12:00:00Z"),
		now: new Date("2026-08-01T12:00:00Z"),
		transactions: [{ ...baseTransaction, id: "charge", titulo: "Compra", tipo: "SAIDA", valor: 100, origemTipo: "VENDA" }],
	});
	assert.equal(invoice.status, "VENCIDA");
});
