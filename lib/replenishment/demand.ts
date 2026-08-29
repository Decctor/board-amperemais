import type { TDemandRegularityEnum, TDemandTrendEnum } from "@/schemas/enums";
import type { TDemandBucket, TDemandProfile } from "./types";

// Pesos da média móvel ponderada: os 30 dias mais recentes valem 3× os 30 dias mais antigos da
// janela. Uma média simples de três meses trata a queda de dezembro e a alta de março como a mesma
// informação — a ponderação é o que faz a sugestão acompanhar a virada de sazonalidade.
export const DEMAND_BUCKET_WEIGHTS = [3, 2, 1] as const;

// Limiares da classificação XYZ, aplicados sobre o coeficiente de variação entre os meses.
const REGULARITY_X_MAX_CV = 0.5;
const REGULARITY_Y_MAX_CV = 1;

// Variação mínima entre o mês corrente e a média dos anteriores para chamar de alta ou queda.
const TREND_THRESHOLD = 0.15;

function classifyRegularity(coeficienteVariacao: number): TDemandRegularityEnum {
	if (coeficienteVariacao <= REGULARITY_X_MAX_CV) return "X";
	if (coeficienteVariacao <= REGULARITY_Y_MAX_CV) return "Y";
	return "Z";
}

function classifyTrend(rates: number[]): TDemandTrendEnum {
	if (rates.length < 2) return "ESTAVEL";
	const [recent, ...previous] = rates;
	const previousAverage = previous.reduce((acc, rate) => acc + rate, 0) / previous.length;
	if (previousAverage <= 0) return recent > 0 ? "ALTA" : "ESTAVEL";
	const variation = (recent - previousAverage) / previousAverage;
	if (variation > TREND_THRESHOLD) return "ALTA";
	if (variation < -TREND_THRESHOLD) return "QUEDA";
	return "ESTAVEL";
}

// Um item que ficou zerado 25 dos 30 dias do mês não teve demanda baixa: teve demanda represada.
// Dividir a saída pelos dias em que havia o que vender é o único jeito de a média não punir
// exatamente os produtos que mais faltaram. O teto de 80% da janela evita que um produto zerado
// quase o período inteiro projete uma demanda diária absurda a partir de duas ou três unidades.
const MAX_STOCKOUT_SHARE = 0.8;

export function resolveEffectiveDays(bucket: TDemandBucket, adjustForStockouts: boolean): number {
	if (bucket.dias <= 0) return 0;
	if (!adjustForStockouts) return bucket.dias;
	const cappedStockoutDays = Math.min(Math.max(bucket.diasSemEstoque, 0), bucket.dias * MAX_STOCKOUT_SHARE);
	return Math.max(bucket.dias - cappedStockoutDays, 1);
}

export function buildDemandProfile({
	buckets,
	adjustForStockouts = true,
	weights = DEMAND_BUCKET_WEIGHTS,
}: {
	buckets: TDemandBucket[];
	adjustForStockouts?: boolean;
	weights?: readonly number[];
}): TDemandProfile {
	const orderedBuckets = [...buckets].sort((a, b) => a.indice - b.indice);
	const populatedBuckets = orderedBuckets.filter((bucket) => bucket.dias > 0);

	const rates = populatedBuckets.map((bucket) => {
		const effectiveDays = resolveEffectiveDays(bucket, adjustForStockouts);
		return effectiveDays > 0 ? bucket.quantidade / effectiveDays : 0;
	});

	let weightSum = 0;
	let weightedRateSum = 0;
	populatedBuckets.forEach((bucket, index) => {
		const weight = weights[Math.min(index, weights.length - 1)] ?? 1;
		weightSum += weight;
		weightedRateSum += weight * rates[index];
	});
	const demandaDiaria = weightSum > 0 ? weightedRateSum / weightSum : 0;

	// Desvio entre os meses: mede o quanto a demanda oscila de um período para o outro. É o número
	// que classifica o item em XYZ — não o que dimensiona o estoque de segurança.
	const rateAverage = rates.length > 0 ? rates.reduce((acc, rate) => acc + rate, 0) / rates.length : 0;
	const rateVariance = rates.length > 1 ? rates.reduce((acc, rate) => acc + (rate - rateAverage) ** 2, 0) / (rates.length - 1) : 0;
	const rateDeviation = Math.sqrt(rateVariance);
	const coeficienteVariacao = rateAverage > 0 ? rateDeviation / rateAverage : 0;

	// Desvio diário para o estoque de segurança. Três observações mensais não descrevem a oscilação
	// de um dia para o outro, e com meses parecidos o desvio amostral cai a zero — o que zeraria o
	// estoque de segurança de um item que falta toda semana. O piso de Poisson (variância ≥ média,
	// válido para demanda em contagem) mantém o dimensionamento honesto nesse caso.
	const desvioPadraoDiario = Math.max(rateDeviation, Math.sqrt(demandaDiaria));

	const quantidadeTotalJanela = orderedBuckets.reduce((acc, bucket) => acc + bucket.quantidade, 0);
	const diasEfetivos = populatedBuckets.reduce((acc, bucket) => acc + resolveEffectiveDays(bucket, adjustForStockouts), 0);
	const diasSemEstoque = orderedBuckets.reduce((acc, bucket) => acc + Math.max(bucket.diasSemEstoque, 0), 0);

	return {
		demandaDiaria,
		demandaMensal: demandaDiaria * 30,
		desvioPadraoDiario,
		coeficienteVariacao,
		regularidade: classifyRegularity(coeficienteVariacao),
		tendencia: classifyTrend(rates),
		quantidadeTotalJanela,
		diasEfetivos,
		diasSemEstoque,
		buckets: orderedBuckets,
	};
}

// Cobertura: quantos dias o saldo físico atual aguenta no ritmo estimado. Sem demanda a cobertura
// é infinita e o número correto é "não há cobertura a calcular", não um zero que vira urgência.
export function calculateCoverageDays({ estoqueAtual, demandaDiaria }: { estoqueAtual: number; demandaDiaria: number }): number | null {
	if (demandaDiaria <= 0) return null;
	return Math.max(estoqueAtual, 0) / demandaDiaria;
}
