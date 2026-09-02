import assert from "node:assert/strict";
import test from "node:test";
import type { TSaleIntegrationMetadata } from "@/schemas/sales";
import { buildFiscalPaymentsForManagedSale } from "./managed-sale-payments";

function metadataWithSponsorship(patrocinados: { patrocinador: string; valor: number }[]): TSaleIntegrationMetadata {
	return {
		versao: 1,
		canal: "IFOOD",
		entrega: { realizadaPor: "CANAL", valorFrete: 0 },
		descontos: { loja: 0, patrocinados },
		contatoTemporario: null,
		cancelamentoSolicitado: null,
		disputaAberta: null,
		taxasCanal: [],
	};
}

function sumPayments(payments: { valor: number }[]) {
	return Math.round(payments.reduce((sum, payment) => sum + payment.valor, 0) * 100) / 100;
}

test("o patrocinio sai do rateio pelo VALOR, preservando o vale-refeicao do cliente", () => {
	// `loadSalePayments` agrega por metodo, e vale-refeicao/gift card do cliente tambem sao VALE:
	// os 30 de VALE aqui sao 10 de patrocinio + 20 pagos pelo consumidor.
	const result = buildFiscalPaymentsForManagedSale({
		payments: [
			{ metodo: "VALE", valor: 30 },
			{ metodo: "CARTAO_CREDITO", valor: 70 },
		],
		integracaoMetadados: metadataWithSponsorship([{ patrocinador: "IFOOD", valor: 10 }]),
		fiscalTotal: 90,
	});

	assert.deepEqual(result, [
		{ metodo: "VALE", valor: 17.78 },
		{ metodo: "CARTAO_CREDITO", valor: 62.22 },
		{ metodo: "VALE", valor: 10 },
	]);
	assert.equal(sumPayments(result), 90);
});

test("pagamento so em VALE do cliente nao vira OUTRO quando ha patrocinio", () => {
	const result = buildFiscalPaymentsForManagedSale({
		payments: [{ metodo: "VALE", valor: 50 }],
		integracaoMetadados: metadataWithSponsorship([{ patrocinador: "IFOOD", valor: 10 }]),
		fiscalTotal: 50,
	});

	assert.deepEqual(result, [
		{ metodo: "VALE", valor: 40 },
		{ metodo: "VALE", valor: 10 },
	]);
	assert.equal(sumPayments(result), 50);
});

test("sem patrocinio os metodos do cliente passam intactos", () => {
	const result = buildFiscalPaymentsForManagedSale({
		payments: [
			{ metodo: "VALE", valor: 20 },
			{ metodo: "PIX", valor: 80 },
		],
		integracaoMetadados: metadataWithSponsorship([]),
		fiscalTotal: 100,
	});

	assert.deepEqual(result, [
		{ metodo: "VALE", valor: 20 },
		{ metodo: "PIX", valor: 80 },
	]);
	assert.equal(sumPayments(result), 100);
});

test("os pagamentos fiscais somam exatamente o vNF mesmo com o total abaixo das transacoes", () => {
	// Transacoes somam o pedido cheio (inclui taxa do canal); a NF sai so pela operacao da loja.
	const result = buildFiscalPaymentsForManagedSale({
		payments: [
			{ metodo: "VALE", valor: 30 },
			{ metodo: "CARTAO_CREDITO", valor: 73 },
		],
		integracaoMetadados: metadataWithSponsorship([{ patrocinador: "IFOOD", valor: 10 }]),
		fiscalTotal: 100,
	});

	assert.equal(sumPayments(result), 100);
});
