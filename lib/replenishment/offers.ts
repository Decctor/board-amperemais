import type { TReplenishmentItem } from "./types";

// Margem que a oferta preserva sobre o custo. Liquidar no custo devolve o dinheiro mas não paga o
// custo de vender; 10% é o piso conservador que a tela deixa a loja ajustar.
export const DEFAULT_OFFER_FLOOR_MARGIN = 0.1;

// Um item sem giro nenhum precisa de um desconto maior que um item apenas folgado: no primeiro o
// problema é convencer alguém a levar, no segundo é só antecipar a venda que já aconteceria.
const DISCOUNT_AGGRESSIVENESS: Record<"EXCESSO" | "SEM_GIRO", number> = { EXCESSO: 0.5, SEM_GIRO: 0.8 };

const MIN_DISCOUNT_PERCENTAGE = 5;
const MAX_DISCOUNT_PERCENTAGE = 60;

export type TOfferSuggestion = {
	elegivel: boolean;
	motivo: string;
	excedenteUnidades: number;
	capitalParado: number;
	descontoMaximoPercentual: number | null;
	descontoSugeridoPercentual: number | null;
	precoSugerido: number | null;
	margemNoPrecoSugerido: number | null;
};

// Quanto do saldo sobra além da cobertura que a loja considera saudável. É o que se pode ofertar
// sem criar uma ruptura logo depois da promoção — o erro clássico de liquidar o estoque inteiro.
export function calculateExcessUnits({ item, diasExcessoLimite }: { item: TReplenishmentItem; diasExcessoLimite: number }): number {
	if (item.demanda.demandaDiaria <= 0) return Math.max(item.estoqueAtual, 0);
	const saldoSaudavel = item.demanda.demandaDiaria * diasExcessoLimite;
	return Math.max(item.estoqueAtual - saldoSaudavel, 0);
}

export function buildOfferSuggestion({
	item,
	diasExcessoLimite,
	margemMinima = DEFAULT_OFFER_FLOOR_MARGIN,
}: {
	item: TReplenishmentItem;
	diasExcessoLimite: number;
	margemMinima?: number;
}): TOfferSuggestion {
	const custo = item.valores.custoMedio ?? item.valores.precoMedioCompra ?? item.valores.precoUltimaCompra ?? null;
	const excedenteUnidades = calculateExcessUnits({ item, diasExcessoLimite });
	const capitalParado = excedenteUnidades * (custo ?? 0);
	const base: TOfferSuggestion = {
		elegivel: false,
		motivo: "",
		excedenteUnidades,
		capitalParado,
		descontoMaximoPercentual: null,
		descontoSugeridoPercentual: null,
		precoSugerido: null,
		margemNoPrecoSugerido: null,
	};

	if (item.sobressalente) return { ...base, motivo: "Item sobressalente: mantido em estoque de propósito." };
	if (item.naoPromover) return { ...base, motivo: "Item marcado como não promocionável." };
	if (item.status !== "EXCESSO" && item.status !== "SEM_GIRO") return { ...base, motivo: "Cobertura dentro do limite definido." };
	if (item.estoqueAtual <= 0) return { ...base, motivo: "Sem saldo em estoque." };
	if (item.valores.precoVenda == null || custo == null || custo <= 0) {
		return { ...base, elegivel: true, motivo: "Cadastre preço de venda e custo para calcular o desconto seguro." };
	}

	const precoPiso = custo * (1 + margemMinima);
	const precoVenda = item.valores.precoVenda;
	if (precoVenda <= precoPiso) {
		return { ...base, elegivel: false, motivo: "Preço de venda já está no piso de margem — desconto venderia abaixo do custo aceitável." };
	}

	const descontoMaximoPercentual = ((precoVenda - precoPiso) / precoVenda) * 100;
	const descontoSugeridoPercentual = Math.min(
		Math.max(descontoMaximoPercentual * DISCOUNT_AGGRESSIVENESS[item.status], MIN_DISCOUNT_PERCENTAGE),
		Math.min(descontoMaximoPercentual, MAX_DISCOUNT_PERCENTAGE),
	);
	const precoSugerido = precoVenda * (1 - descontoSugeridoPercentual / 100);

	return {
		elegivel: true,
		motivo:
			item.status === "SEM_GIRO"
				? `Sem saída nos últimos ${item.demanda.buckets.length * 30} dias.`
				: `Cobertura de ${item.coberturaDias?.toFixed(0) ?? "—"} dias, acima do limite de ${diasExcessoLimite}.`,
		excedenteUnidades,
		capitalParado,
		descontoMaximoPercentual,
		descontoSugeridoPercentual,
		precoSugerido,
		margemNoPrecoSugerido: ((precoSugerido - custo) / precoSugerido) * 100,
	};
}
