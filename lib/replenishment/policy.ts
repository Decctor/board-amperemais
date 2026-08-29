import type { TReplenishmentPlan, TReplenishmentPolicy } from "./types";

// Inversa da normal padrão (Acklam). Converte o nível de serviço escolhido pela loja no fator Z do
// estoque de segurança: 95% → 1,645. Uma tabela fixa obrigaria a arredondar 97% para 95% ou 99%,
// e é justamente entre esses pontos que a compradora costuma querer ajustar o risco.
const ACKLAM_A = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
const ACKLAM_B = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
const ACKLAM_C = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
const ACKLAM_D = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
const ACKLAM_LOW = 0.02425;

export function normalInverseCdf(probability: number): number {
	if (probability <= 0) return Number.NEGATIVE_INFINITY;
	if (probability >= 1) return Number.POSITIVE_INFINITY;

	if (probability < ACKLAM_LOW) {
		const q = Math.sqrt(-2 * Math.log(probability));
		return (
			(((((ACKLAM_C[0] * q + ACKLAM_C[1]) * q + ACKLAM_C[2]) * q + ACKLAM_C[3]) * q + ACKLAM_C[4]) * q + ACKLAM_C[5]) /
			((((ACKLAM_D[0] * q + ACKLAM_D[1]) * q + ACKLAM_D[2]) * q + ACKLAM_D[3]) * q + 1)
		);
	}
	if (probability > 1 - ACKLAM_LOW) {
		const q = Math.sqrt(-2 * Math.log(1 - probability));
		return (
			-(((((ACKLAM_C[0] * q + ACKLAM_C[1]) * q + ACKLAM_C[2]) * q + ACKLAM_C[3]) * q + ACKLAM_C[4]) * q + ACKLAM_C[5]) /
			((((ACKLAM_D[0] * q + ACKLAM_D[1]) * q + ACKLAM_D[2]) * q + ACKLAM_D[3]) * q + 1)
		);
	}

	const q = probability - 0.5;
	const r = q * q;
	return (
		((((((ACKLAM_A[0] * r + ACKLAM_A[1]) * r + ACKLAM_A[2]) * r + ACKLAM_A[3]) * r + ACKLAM_A[4]) * r + ACKLAM_A[5]) * q) /
		(((((ACKLAM_B[0] * r + ACKLAM_B[1]) * r + ACKLAM_B[2]) * r + ACKLAM_B[3]) * r + ACKLAM_B[4]) * r + 1)
	);
}

export function serviceLevelFactor(nivelServico: number): number {
	const bounded = Math.min(Math.max(nivelServico, 0.5), 0.999);
	return Math.max(normalInverseCdf(bounded), 0);
}

// A loja compra em ciclos: o pedido de hoje tem de cobrir o prazo de entrega E o intervalo até a
// próxima rodada de compra. Por isso a exposição ao risco é (lead time + ciclo de revisão), e o
// desvio acumulado nesse intervalo cresce com a raiz dele, não linearmente.
export function calculateSafetyStock({
	desvioPadraoDiario,
	leadTimeDias,
	cicloRevisaoDias,
	nivelServico,
}: {
	desvioPadraoDiario: number;
	leadTimeDias: number;
	cicloRevisaoDias: number;
	nivelServico: number;
}): number {
	const exposicaoDias = Math.max(leadTimeDias + cicloRevisaoDias, 0);
	if (exposicaoDias <= 0 || desvioPadraoDiario <= 0) return 0;
	return serviceLevelFactor(nivelServico) * desvioPadraoDiario * Math.sqrt(exposicaoDias);
}

// Arredonda para cima no múltiplo da embalagem de compra. Comprar 97 unidades de um item vendido em
// caixas de 12 não é uma opção que o fornecedor aceite — a planilha precisa sair já no múltiplo.
export function roundToPurchaseMultiple(quantidade: number, multiplo: number | null | undefined): number {
	if (!multiplo || multiplo <= 0) return Math.ceil(quantidade);
	return Math.ceil(quantidade / multiplo) * multiplo;
}

// Ponto de pedido responde "é hora de comprar?"; nível alvo responde "comprar quanto?". Separar os
// dois evita o erro clássico de disparar a compra e encher só até o próprio gatilho, o que faz o
// item voltar para a fila na semana seguinte.
export function buildReplenishmentPlan({
	demandaDiaria,
	desvioPadraoDiario,
	posicaoEstoque,
	politica,
	estoqueMinimo,
	estoqueMaximo,
}: {
	demandaDiaria: number;
	desvioPadraoDiario: number;
	posicaoEstoque: number;
	politica: TReplenishmentPolicy;
	estoqueMinimo?: number | null;
	estoqueMaximo?: number | null;
}): TReplenishmentPlan {
	const estoqueSeguranca = calculateSafetyStock({
		desvioPadraoDiario,
		leadTimeDias: politica.leadTimeDias,
		cicloRevisaoDias: politica.cicloRevisaoDias,
		nivelServico: politica.nivelServico,
	});

	const pontoPedidoCalculado = demandaDiaria * (politica.leadTimeDias + politica.cicloRevisaoDias) + estoqueSeguranca;
	const nivelAlvoCalculado = demandaDiaria * (politica.leadTimeDias + politica.diasCoberturaAlvo) + estoqueSeguranca;

	// Mínimo e máximo informados à mão vencem o cálculo: quem digitou o número conhece uma restrição
	// que o histórico não mostra (contrato, espaço na prateleira, exigência do fabricante).
	const pontoPedido = estoqueMinimo != null && estoqueMinimo > 0 ? estoqueMinimo : pontoPedidoCalculado;
	const nivelAlvo = Math.max(estoqueMaximo != null && estoqueMaximo > 0 ? estoqueMaximo : nivelAlvoCalculado, pontoPedido);

	const quantidadeSugeridaBruta = Math.max(nivelAlvo - posicaoEstoque, 0);
	const arredondada = quantidadeSugeridaBruta > 0 ? roundToPurchaseMultiple(quantidadeSugeridaBruta, politica.multiploCompra) : 0;
	const quantidadeSugerida =
		arredondada > 0 && politica.quantidadeMinimaCompra != null
			? Math.max(arredondada, roundToPurchaseMultiple(politica.quantidadeMinimaCompra, politica.multiploCompra))
			: arredondada;

	return { estoqueSeguranca, pontoPedido, nivelAlvo, quantidadeSugeridaBruta, quantidadeSugerida };
}
