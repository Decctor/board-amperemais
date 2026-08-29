import assert from "node:assert/strict";
import test from "node:test";
import { buildDemandProfile, calculateCoverageDays } from "./demand";
import { buildReplenishmentPlan, calculateSafetyStock, normalInverseCdf, roundToPurchaseMultiple, serviceLevelFactor } from "./policy";
import { calculatePotentialLoss, calculatePriorityIndex, classifyReplenishmentStatus } from "./classify";
import type { TReplenishmentPolicy } from "./types";

function bucket(indice: number, quantidade: number, diasSemEstoque = 0) {
	return { indice, dias: 30, quantidade, diasSemEstoque };
}

const basePolicy: TReplenishmentPolicy = {
	leadTimeDias: 15,
	cicloRevisaoDias: 15,
	diasCoberturaAlvo: 30,
	nivelServico: 0.95,
	multiploCompra: null,
	quantidadeMinimaCompra: null,
	origemParametros: "CALCULADO",
};

test("pondera os meses recentes acima dos antigos", () => {
	// 300 no mês corrente, 150 nos dois anteriores. A média simples daria 200/mês; a ponderada
	// 3-2-1 precisa ficar acima disso porque a alta é recente.
	const perfil = buildDemandProfile({ buckets: [bucket(0, 300), bucket(1, 150), bucket(2, 150)], adjustForStockouts: false });
	const mediaSimples = 600 / 90;
	assert.ok(perfil.demandaDiaria > mediaSimples, `esperava demanda ponderada acima de ${mediaSimples}, veio ${perfil.demandaDiaria}`);
	assert.equal(perfil.tendencia, "ALTA");
});

test("desconta os dias de ruptura da base da média", () => {
	// O mesmo volume vendido em 10 dias úteis de estoque vale três vezes mais por dia do que
	// vendido em 30 — é a correção que impede a loja de comprar menos de quem mais faltou.
	const comRuptura = buildDemandProfile({ buckets: [bucket(0, 60, 20), bucket(1, 60, 20), bucket(2, 60, 20)], adjustForStockouts: true });
	const semAjuste = buildDemandProfile({ buckets: [bucket(0, 60, 20), bucket(1, 60, 20), bucket(2, 60, 20)], adjustForStockouts: false });
	assert.ok(comRuptura.demandaDiaria > semAjuste.demandaDiaria);
	assert.ok(Math.abs(comRuptura.demandaDiaria - 6) < 1e-9, `esperava 6/dia, veio ${comRuptura.demandaDiaria}`);
});

test("limita o desconto de ruptura a 80% da janela", () => {
	// 29 dos 30 dias zerados: sem o teto, duas unidades vendidas projetariam 2/dia = 60/mês.
	const perfil = buildDemandProfile({ buckets: [bucket(0, 2, 29)], adjustForStockouts: true });
	assert.ok(perfil.demandaDiaria <= 2 / 6 + 1e-9, `esperava no máximo 0,333/dia, veio ${perfil.demandaDiaria}`);
});

test("mantém desvio mínimo de Poisson quando os meses são idênticos", () => {
	// Três meses iguais zeram o desvio amostral. Sem o piso, o estoque de segurança de um item que
	// falta toda semana seria zero.
	const perfil = buildDemandProfile({ buckets: [bucket(0, 90), bucket(1, 90), bucket(2, 90)], adjustForStockouts: false });
	assert.equal(perfil.coeficienteVariacao, 0);
	assert.ok(perfil.desvioPadraoDiario > 0);
	assert.ok(Math.abs(perfil.desvioPadraoDiario - Math.sqrt(3)) < 1e-9);
});

test("classifica a regularidade da demanda em XYZ", () => {
	const regular = buildDemandProfile({ buckets: [bucket(0, 100), bucket(1, 98), bucket(2, 102)], adjustForStockouts: false });
	const erratico = buildDemandProfile({ buckets: [bucket(0, 200), bucket(1, 0), bucket(2, 10)], adjustForStockouts: false });
	assert.equal(regular.regularidade, "X");
	assert.equal(erratico.regularidade, "Z");
});

test("converte nível de serviço no fator Z correspondente", () => {
	assert.ok(Math.abs(normalInverseCdf(0.95) - 1.6449) < 0.001);
	assert.ok(Math.abs(serviceLevelFactor(0.99) - 2.3263) < 0.001);
	// Um nível de serviço abaixo de 50% não pode virar estoque de segurança negativo.
	assert.equal(serviceLevelFactor(0.5), 0);
});

test("dimensiona o estoque de segurança pela raiz da exposição", () => {
	const curto = calculateSafetyStock({ desvioPadraoDiario: 2, leadTimeDias: 5, cicloRevisaoDias: 5, nivelServico: 0.95 });
	const longo = calculateSafetyStock({ desvioPadraoDiario: 2, leadTimeDias: 20, cicloRevisaoDias: 20, nivelServico: 0.95 });
	// Quadruplicar a exposição dobra o estoque de segurança, não quadruplica.
	assert.ok(Math.abs(longo / curto - 2) < 1e-9);
});

test("arredonda a sugestão para o múltiplo da embalagem", () => {
	assert.equal(roundToPurchaseMultiple(97, 12), 108);
	assert.equal(roundToPurchaseMultiple(24, 12), 24);
	assert.equal(roundToPurchaseMultiple(0.4, null), 1);
});

test("desconta o que já está a caminho da quantidade sugerida", () => {
	// A posição de estoque é saldo + em trânsito. Duas leituras do mesmo item, uma com 200 unidades
	// já pedidas ao fornecedor: a sugestão tem de cair exatamente essas 200, e não repetir o pedido.
	const semTransito = buildReplenishmentPlan({ demandaDiaria: 10, desvioPadraoDiario: 3, posicaoEstoque: 50, politica: basePolicy });
	const comTransito = buildReplenishmentPlan({ demandaDiaria: 10, desvioPadraoDiario: 3, posicaoEstoque: 250, politica: basePolicy });
	assert.ok(semTransito.quantidadeSugerida > 0);
	assert.equal(semTransito.quantidadeSugerida - comTransito.quantidadeSugerida, 200);

	// Posição acima do nível alvo não gera compra nenhuma.
	const acimaDoAlvo = buildReplenishmentPlan({
		demandaDiaria: 10,
		desvioPadraoDiario: 3,
		posicaoEstoque: semTransito.nivelAlvo + 1,
		politica: basePolicy,
	});
	assert.equal(acimaDoAlvo.quantidadeSugerida, 0);
});

test("mínimo e máximo informados à mão vencem o cálculo", () => {
	const plano = buildReplenishmentPlan({
		demandaDiaria: 10,
		desvioPadraoDiario: 3,
		posicaoEstoque: 40,
		politica: basePolicy,
		estoqueMinimo: 500,
		estoqueMaximo: 800,
	});
	assert.equal(plano.pontoPedido, 500);
	assert.equal(plano.nivelAlvo, 800);
	assert.equal(plano.quantidadeSugerida, 760);
});

test("nível alvo nunca fica abaixo do ponto de pedido", () => {
	// Máximo digitado menor que o mínimo: a sugestão precisa continuar coerente em vez de virar zero.
	const plano = buildReplenishmentPlan({
		demandaDiaria: 5,
		desvioPadraoDiario: 1,
		posicaoEstoque: 0,
		politica: basePolicy,
		estoqueMinimo: 300,
		estoqueMaximo: 100,
	});
	assert.equal(plano.nivelAlvo, 300);
});

test("classifica ruptura, crítico e excesso pela cobertura", () => {
	const comum = { demandaDiaria: 10, pontoPedido: 300, diasExcessoLimite: 30, leadTimeDias: 15 };
	assert.equal(classifyReplenishmentStatus({ ...comum, estoqueAtual: 0, posicaoEstoque: 0, coberturaDias: 0 }), "RUPTURA");
	assert.equal(classifyReplenishmentStatus({ ...comum, estoqueAtual: 100, posicaoEstoque: 100, coberturaDias: 10 }), "CRITICO");
	assert.equal(classifyReplenishmentStatus({ ...comum, estoqueAtual: 250, posicaoEstoque: 250, coberturaDias: 25 }), "ATENCAO");
	assert.equal(classifyReplenishmentStatus({ ...comum, estoqueAtual: 500, posicaoEstoque: 500, coberturaDias: 50 }), "EXCESSO");
	assert.equal(
		classifyReplenishmentStatus({ ...comum, estoqueAtual: 320, posicaoEstoque: 320, coberturaDias: 32, diasExcessoLimite: 60 }),
		"SAUDAVEL",
	);
});

test("separa parado com saldo de parado sem saldo", () => {
	const comum = { demandaDiaria: 0, pontoPedido: 0, diasExcessoLimite: 30, leadTimeDias: 15 };
	assert.equal(classifyReplenishmentStatus({ ...comum, estoqueAtual: 40, posicaoEstoque: 40, coberturaDias: null }), "SEM_GIRO");
	assert.equal(classifyReplenishmentStatus({ ...comum, estoqueAtual: 0, posicaoEstoque: 0, coberturaDias: null }), "SAUDAVEL");
});

test("mede a perda potencial só nos dias descobertos dentro do prazo de entrega", () => {
	// 20 dias de prazo, 5 de cobertura: 15 dias × 10 un/dia × R$ 4 de margem.
	assert.equal(calculatePotentialLoss({ demandaDiaria: 10, coberturaDias: 5, leadTimeDias: 20, margemUnitaria: 4 }), 600);
	// Cobertura maior que o prazo: a mercadoria chega antes de faltar, não há perda.
	assert.equal(calculatePotentialLoss({ demandaDiaria: 10, coberturaDias: 40, leadTimeDias: 20, margemUnitaria: 4 }), 0);
});

test("prioriza item A sobre item C na mesma urgência", () => {
	const comum = { coberturaDias: 5, leadTimeDias: 15, cicloRevisaoDias: 15, demandaDiaria: 10 };
	assert.ok(calculatePriorityIndex({ ...comum, classeAbc: "A" }) > calculatePriorityIndex({ ...comum, classeAbc: "C" }));
	assert.equal(calculatePriorityIndex({ ...comum, classeAbc: "A", demandaDiaria: 0 }), 0);
});

test("cobertura sem demanda é nula, não zero", () => {
	assert.equal(calculateCoverageDays({ estoqueAtual: 100, demandaDiaria: 0 }), null);
	assert.equal(calculateCoverageDays({ estoqueAtual: 100, demandaDiaria: 5 }), 20);
});
