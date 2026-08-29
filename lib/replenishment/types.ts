import type { TDemandRegularityEnum, TDemandTrendEnum, TReplenishmentStatusEnum, TStockPositionSourceEnum } from "@/schemas/enums";
import type { TProductAbcClass } from "@/lib/products/portfolio-analysis";

// Uma fatia de 30 dias do histórico de saída. `diasSemEstoque` é o que permite separar "vendeu
// pouco" de "não teve o que vender" — sem ele a loja compra menos justamente do que mais faltou.
export type TDemandBucket = {
	indice: number;
	dias: number;
	quantidade: number;
	diasSemEstoque: number;
};

export type TDemandProfile = {
	demandaDiaria: number;
	demandaMensal: number;
	desvioPadraoDiario: number;
	coeficienteVariacao: number;
	regularidade: TDemandRegularityEnum;
	tendencia: TDemandTrendEnum;
	quantidadeTotalJanela: number;
	diasEfetivos: number;
	diasSemEstoque: number;
	buckets: TDemandBucket[];
};

// Parâmetros efetivamente aplicados ao item, já resolvidos entre a política da loja e o override
// do produto. `origemParametros` existe para a tela conseguir explicar por que o número é aquele.
export type TReplenishmentPolicy = {
	leadTimeDias: number;
	cicloRevisaoDias: number;
	diasCoberturaAlvo: number;
	nivelServico: number;
	multiploCompra: number | null;
	quantidadeMinimaCompra: number | null;
	origemParametros: "CALCULADO" | "MANUAL" | "MISTO";
};

export type TReplenishmentPlan = {
	estoqueSeguranca: number;
	pontoPedido: number;
	nivelAlvo: number;
	quantidadeSugeridaBruta: number;
	quantidadeSugerida: number;
};

export type TReplenishmentValuation = {
	precoVenda: number | null;
	custoMedio: number | null;
	precoUltimaCompra: number | null;
	precoMedioCompra: number | null;
	dataUltimaCompra: Date | null;
	margemUnitaria: number | null;
	margemPercentual: number | null;
	markupPercentual: number | null;
	valorImobilizado: number;
	valorSugestao: number | null;
};

export type TReplenishmentSupplier = {
	id: string | null;
	nome: string | null;
	leadTimeMedioDias: number | null;
	origem: "PREFERENCIAL" | "HISTORICO" | "IMPORTACAO" | "DESCONHECIDO";
};

export type TReplenishmentItem = {
	produtoId: string;
	codigo: string;
	nome: string;
	unidade: string;
	grupo: string;
	imagemCapaUrl: string | null;
	estoqueAtual: number;
	estoqueEmTransito: number;
	estoqueReservado: number;
	posicaoEstoque: number;
	origemEstoque: TStockPositionSourceEnum;
	dataPosicaoEstoque: Date | null;
	coberturaDias: number | null;
	dataRupturaPrevista: Date | null;
	status: TReplenishmentStatusEnum;
	classeAbc: TProductAbcClass;
	sobressalente: boolean;
	naoPromover: boolean;
	descontinuado: boolean;
	demanda: TDemandProfile;
	politica: TReplenishmentPolicy;
	plano: TReplenishmentPlan;
	valores: TReplenishmentValuation;
	fornecedor: TReplenishmentSupplier;
	// Venda que se perde se nada for comprado: demanda × dias descobertos × margem unitária.
	perdaPotencial: number;
	indicePrioridade: number;
};

export type TReplenishmentSummary = {
	produtosAnalisados: number;
	produtosParaComprar: number;
	produtosEmRuptura: number;
	produtosCriticos: number;
	produtosEmExcesso: number;
	produtosSemGiro: number;
	valorSugestaoTotal: number;
	valorImobilizadoTotal: number;
	valorImobilizadoExcesso: number;
	perdaPotencialTotal: number;
	coberturaMediaDias: number | null;
};
