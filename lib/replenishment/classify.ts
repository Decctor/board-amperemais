import type { TReplenishmentStatusEnum } from "@/schemas/enums";
import type { TProductAbcClass } from "@/lib/products/portfolio-analysis";

// Peso da classe ABC na fila de prioridade. Faltar um item A custa faturamento e cliente; faltar um
// item C custa uma desculpa no balcão. A fila precisa refletir isso, senão a compradora gasta a
// manhã inteira resolvendo a cauda longa.
const ABC_PRIORITY_WEIGHT: Record<TProductAbcClass, number> = { A: 1, B: 0.7, C: 0.4 };

export function classifyReplenishmentStatus({
	estoqueAtual,
	posicaoEstoque,
	demandaDiaria,
	coberturaDias,
	leadTimeDias,
	pontoPedido,
	diasExcessoLimite,
}: {
	estoqueAtual: number;
	posicaoEstoque: number;
	demandaDiaria: number;
	coberturaDias: number | null;
	leadTimeDias: number;
	pontoPedido: number;
	diasExcessoLimite: number;
}): TReplenishmentStatusEnum {
	// Sem demanda na janela não existe cobertura a projetar: o item ou está parado ocupando capital,
	// ou simplesmente não é um problema de compra.
	if (demandaDiaria <= 0) return estoqueAtual > 0 ? "SEM_GIRO" : "SAUDAVEL";
	if (estoqueAtual <= 0) return "RUPTURA";
	// Cobertura menor que o prazo de entrega significa que vai faltar antes de a mercadoria chegar,
	// mesmo comprando hoje. É a única situação em que atrasar a decisão já custa venda.
	if (coberturaDias != null && coberturaDias < leadTimeDias) return "CRITICO";
	if (posicaoEstoque <= pontoPedido) return "ATENCAO";
	if (coberturaDias != null && coberturaDias > diasExcessoLimite) return "EXCESSO";
	return "SAUDAVEL";
}

export function isReplenishmentStatusActionable(status: TReplenishmentStatusEnum): boolean {
	return status === "RUPTURA" || status === "CRITICO" || status === "ATENCAO";
}

// Venda que se perde se nada for comprado: a demanda dos dias que ficarão descobertos dentro do
// prazo de entrega, avaliada pela margem unitária. É o número que ordena a fila por dinheiro, e não
// por percentual de falta — 3% de falta num item A pesa mais que 90% num item C.
export function calculatePotentialLoss({
	demandaDiaria,
	coberturaDias,
	leadTimeDias,
	margemUnitaria,
}: {
	demandaDiaria: number;
	coberturaDias: number | null;
	leadTimeDias: number;
	margemUnitaria: number | null;
}): number {
	if (demandaDiaria <= 0 || !margemUnitaria || margemUnitaria <= 0) return 0;
	const diasDescobertos = Math.max(leadTimeDias - (coberturaDias ?? 0), 0);
	return diasDescobertos * demandaDiaria * margemUnitaria;
}

// Índice 0–100 para a ordenação padrão da tela: o quanto a cobertura está aquém do horizonte de
// risco, ponderado pela classe ABC.
export function calculatePriorityIndex({
	coberturaDias,
	leadTimeDias,
	cicloRevisaoDias,
	classeAbc,
	demandaDiaria,
}: {
	coberturaDias: number | null;
	leadTimeDias: number;
	cicloRevisaoDias: number;
	classeAbc: TProductAbcClass;
	demandaDiaria: number;
}): number {
	if (demandaDiaria <= 0) return 0;
	const horizonte = Math.max(leadTimeDias + cicloRevisaoDias, 1);
	const urgencia = Math.min(Math.max(1 - (coberturaDias ?? 0) / horizonte, 0), 1);
	return Math.round(urgencia * ABC_PRIORITY_WEIGHT[classeAbc] * 100);
}

// Data em que o saldo atual acaba no ritmo estimado — o "quando", que é a pergunta que a compradora
// realmente faz ao olhar a lista.
export function projectStockoutDate({ coberturaDias, referencia = new Date() }: { coberturaDias: number | null; referencia?: Date }): Date | null {
	if (coberturaDias == null || !Number.isFinite(coberturaDias)) return null;
	return new Date(referencia.getTime() + coberturaDias * 86_400_000);
}
