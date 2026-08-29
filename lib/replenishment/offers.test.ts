import assert from "node:assert/strict";
import test from "node:test";
import { buildOfferSuggestion, calculateExcessUnits } from "./offers";
import type { TReplenishmentItem } from "./types";

function makeItem(overrides: Partial<TReplenishmentItem> = {}): TReplenishmentItem {
	const base: TReplenishmentItem = {
		produtoId: "produto-1",
		codigo: "57115038",
		nome: "MODULO TOMADA 20A",
		unidade: "UN",
		grupo: "ELÉTRICA",
		imagemCapaUrl: null,
		estoqueAtual: 600,
		estoqueEmTransito: 0,
		estoqueReservado: 0,
		posicaoEstoque: 600,
		origemEstoque: "SISTEMA",
		dataPosicaoEstoque: null,
		coberturaDias: 120,
		dataRupturaPrevista: null,
		status: "EXCESSO",
		classeAbc: "B",
		sobressalente: false,
		naoPromover: false,
		descontinuado: false,
		demanda: {
			demandaDiaria: 5,
			demandaMensal: 150,
			desvioPadraoDiario: 2,
			coeficienteVariacao: 0.3,
			regularidade: "X",
			tendencia: "ESTAVEL",
			quantidadeTotalJanela: 450,
			diasEfetivos: 90,
			diasSemEstoque: 0,
			buckets: [
				{ indice: 0, dias: 30, quantidade: 150, diasSemEstoque: 0 },
				{ indice: 1, dias: 30, quantidade: 150, diasSemEstoque: 0 },
				{ indice: 2, dias: 30, quantidade: 150, diasSemEstoque: 0 },
			],
		},
		politica: {
			leadTimeDias: 15,
			cicloRevisaoDias: 15,
			diasCoberturaAlvo: 30,
			nivelServico: 0.95,
			multiploCompra: null,
			quantidadeMinimaCompra: null,
			origemParametros: "CALCULADO",
		},
		plano: { estoqueSeguranca: 0, pontoPedido: 150, nivelAlvo: 225, quantidadeSugeridaBruta: 0, quantidadeSugerida: 0 },
		valores: {
			precoVenda: 10,
			custoMedio: 5,
			precoUltimaCompra: 5,
			precoMedioCompra: 5,
			dataUltimaCompra: null,
			margemUnitaria: 5,
			margemPercentual: 50,
			markupPercentual: 100,
			valorImobilizado: 3000,
			valorSugestao: null,
		},
		fornecedor: { id: null, nome: null, leadTimeMedioDias: null, origem: "DESCONHECIDO" },
		perdaPotencial: 0,
		indicePrioridade: 0,
	};
	return { ...base, ...overrides };
}

test("oferta ignora o estoque que ainda é saudável", () => {
	// 600 unidades, 5/dia, limite de 30 dias: 150 são cobertura saudável, 450 sobram.
	assert.equal(calculateExcessUnits({ item: makeItem(), diasExcessoLimite: 30 }), 450);
	// Sem giro nenhum, o saldo inteiro é excedente.
	assert.equal(calculateExcessUnits({ item: makeItem({ demanda: { ...makeItem().demanda, demandaDiaria: 0 } }), diasExcessoLimite: 30 }), 600);
});

test("nunca sugere desconto que fura o piso de margem", () => {
	const oferta = buildOfferSuggestion({ item: makeItem(), diasExcessoLimite: 30 });
	assert.equal(oferta.elegivel, true);
	// Custo 5, piso de 10% => R$ 5,50. O desconto máximo sobre R$ 10 é 45%.
	assert.ok(Math.abs((oferta.descontoMaximoPercentual ?? 0) - 45) < 1e-9);
	assert.ok((oferta.descontoSugeridoPercentual ?? 0) <= (oferta.descontoMaximoPercentual ?? 0));
	assert.ok((oferta.precoSugerido ?? 0) >= 5.5 - 1e-9);
	assert.ok((oferta.margemNoPrecoSugerido ?? 0) > 0);
});

test("item parado recebe desconto mais agressivo que item apenas folgado", () => {
	const folgado = buildOfferSuggestion({ item: makeItem({ status: "EXCESSO" }), diasExcessoLimite: 30 });
	const parado = buildOfferSuggestion({ item: makeItem({ status: "SEM_GIRO" }), diasExcessoLimite: 30 });
	assert.ok((parado.descontoSugeridoPercentual ?? 0) > (folgado.descontoSugeridoPercentual ?? 0));
});

test("sobressalente fica fora da oferta mesmo com cobertura alta", () => {
	const oferta = buildOfferSuggestion({ item: makeItem({ sobressalente: true }), diasExcessoLimite: 30 });
	assert.equal(oferta.elegivel, false);
	assert.match(oferta.motivo, /sobressalente/i);
});

test("não promover bloqueia a sugestão", () => {
	const oferta = buildOfferSuggestion({ item: makeItem({ naoPromover: true }), diasExcessoLimite: 30 });
	assert.equal(oferta.elegivel, false);
});

test("item com preço já no piso não vira oferta", () => {
	const item = makeItem({ valores: { ...makeItem().valores, precoVenda: 5.2, custoMedio: 5 } });
	const oferta = buildOfferSuggestion({ item, diasExcessoLimite: 30 });
	assert.equal(oferta.elegivel, false);
	assert.match(oferta.motivo, /piso de margem/i);
});

test("item saudável não entra na lista de ofertas", () => {
	const oferta = buildOfferSuggestion({ item: makeItem({ status: "SAUDAVEL" }), diasExcessoLimite: 30 });
	assert.equal(oferta.elegivel, false);
});
