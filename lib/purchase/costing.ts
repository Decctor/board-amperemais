import {
	EMPTY_PURCHASE_COST_MODIFIERS,
	PurchaseCostModifierSchema,
	PurchaseCostModifiersSnapshotSchema,
	type TPurchaseCostModifier,
	type TPurchaseCostModifiersSnapshot,
} from "@/schemas/purchases";

const MONEY_SCALE = 100;
const UNIT_COST_SCALE = 1_000_000;

export type TPurchaseCostingItemInput = {
	quantidade: number;
	valorTotalBruto: number;
	descontosTotal?: number | null;
	acrescimosTotal?: number | null;
	modificadoresCusto?: TPurchaseCostModifiersSnapshot | null;
};

export type TPurchaseCostingResult = {
	modificadoresCusto: TPurchaseCostModifiersSnapshot;
	descontosTotal: number;
	acrescimosTotal: number;
	valorTotalLiquido: number;
	valorUnitarioLiquido: number;
	valorTotalCusto: number;
	valorUnitarioCusto: number;
	valorTotalCreditoTributario: number;
	valorTotalDespesaPeriodo: number;
};

export function moneyToCents(value: number): number {
	if (!Number.isFinite(value)) throw new Error("Valor monetário inválido.");
	return Math.round((value + Number.EPSILON) * MONEY_SCALE);
}

export function centsToMoney(valueCentavos: number): number {
	if (!Number.isSafeInteger(valueCentavos)) throw new Error("Valor em centavos inválido.");
	return valueCentavos / MONEY_SCALE;
}

function roundUnitCost(value: number): number {
	return Math.round((value + Number.EPSILON) * UNIT_COST_SCALE) / UNIT_COST_SCALE;
}

function getSignedCents(modifier: TPurchaseCostModifier): number {
	return modifier.efeito === "REDUCAO" ? -modifier.valorCentavos : modifier.valorCentavos;
}

function buildLegacyModifierSnapshot({
	descontosTotal,
	acrescimosTotal,
}: Pick<TPurchaseCostingItemInput, "descontosTotal" | "acrescimosTotal">): TPurchaseCostModifiersSnapshot {
	const modifiers: TPurchaseCostModifier[] = [];
	const discountCents = moneyToCents(Number(descontosTotal) || 0);
	const additionCents = moneyToCents(Number(acrescimosTotal) || 0);

	if (discountCents > 0) {
		modifiers.push({
			chave: "DESCONTO",
			valorCentavos: discountCents,
			efeito: "REDUCAO",
			tratamento: "CUSTO_ESTOQUE",
			origem: "MANUAL",
			descricao: "Desconto legado da compra",
		});
	}

	if (additionCents > 0) {
		modifiers.push({
			chave: "OUTRO",
			valorCentavos: additionCents,
			efeito: "ACRESCIMO",
			tratamento: "CUSTO_ESTOQUE",
			origem: "MANUAL",
			descricao: "Acréscimo legado da compra",
		});
	}

	return { versao: 1, modificadores: modifiers };
}

export function resolvePurchaseCostModifierSnapshot(input: TPurchaseCostingItemInput): TPurchaseCostModifiersSnapshot {
	if (input.modificadoresCusto != null) return PurchaseCostModifiersSnapshotSchema.parse(input.modificadoresCusto);
	return buildLegacyModifierSnapshot(input);
}

/**
 * Calcula os quatro destinos monetários do item atrás de uma única interface. A chave explica a
 * origem; somente `tratamento` decide se o valor altera estoque, crédito tributário ou resultado.
 * Consulte docs/domain/purchase-costing.md antes de alterar esta fórmula.
 */
export function calculatePurchaseItemCost(input: TPurchaseCostingItemInput): TPurchaseCostingResult {
	if (!Number.isFinite(input.quantidade) || input.quantidade <= 0) throw new Error("A quantidade do item deve ser maior que zero.");
	if (!Number.isFinite(input.valorTotalBruto) || input.valorTotalBruto < 0) throw new Error("O valor bruto do item não pode ser negativo.");

	const snapshot = resolvePurchaseCostModifierSnapshot(input);
	const grossCents = moneyToCents(input.valorTotalBruto);
	let additionsCents = 0;
	let reductionsCents = 0;
	let financialModifiersCents = 0;
	let inventoryModifiersCents = 0;
	let taxCreditCents = 0;
	let periodExpenseCents = 0;

	for (const modifier of snapshot.modificadores) {
		if (modifier.efeito === "REDUCAO" && modifier.tratamento !== "CUSTO_ESTOQUE")
			throw new Error("Reduções de crédito tributário ou despesa do período ainda não são suportadas.");
		const signedCents = getSignedCents(modifier);
		financialModifiersCents += signedCents;
		if (modifier.efeito === "REDUCAO") reductionsCents += modifier.valorCentavos;
		else additionsCents += modifier.valorCentavos;

		switch (modifier.tratamento) {
			case "CUSTO_ESTOQUE":
				inventoryModifiersCents += signedCents;
				break;
			case "CREDITO_TRIBUTARIO":
				taxCreditCents += signedCents;
				break;
			case "DESPESA_PERIODO":
				periodExpenseCents += signedCents;
				break;
		}
	}

	const financialCents = grossCents + financialModifiersCents;
	const inventoryCents = grossCents + inventoryModifiersCents;
	if (financialCents < 0) throw new Error("Os modificadores não podem tornar o valor financeiro do item negativo.");
	if (inventoryCents < 0) throw new Error("Os modificadores não podem tornar o custo de estoque do item negativo.");

	return {
		modificadoresCusto: snapshot,
		descontosTotal: centsToMoney(reductionsCents),
		acrescimosTotal: centsToMoney(additionsCents),
		valorTotalLiquido: centsToMoney(financialCents),
		valorUnitarioLiquido: roundUnitCost(centsToMoney(financialCents) / input.quantidade),
		valorTotalCusto: centsToMoney(inventoryCents),
		valorUnitarioCusto: roundUnitCost(centsToMoney(inventoryCents) / input.quantidade),
		valorTotalCreditoTributario: centsToMoney(taxCreditCents),
		valorTotalDespesaPeriodo: centsToMoney(periodExpenseCents),
	};
}

export type TPurchaseCostAllocationItem = {
	referencia: string;
	valorBaseCentavos: number;
	quantidade: number;
};

export type TAllocatedPurchaseCostModifier = {
	referenciaItem: string;
	modificador: TPurchaseCostModifier;
};

/** Distribui um modificador documental em centavos pelo método de maior resto e ordem estável. */
export function allocatePurchaseCostModifier({
	modifier,
	items,
	method,
}: {
	modifier: TPurchaseCostModifier;
	items: TPurchaseCostAllocationItem[];
	method: "PROPORCIONAL_VALOR" | "PROPORCIONAL_QUANTIDADE";
}): TAllocatedPurchaseCostModifier[] {
	const parsedModifier = PurchaseCostModifierSchema.parse(modifier);
	if (items.length === 0) throw new Error("Não há itens para ratear o modificador de custo.");
	const references = new Set<string>();
	const weightedItems = items.map((item, index) => {
		if (!item.referencia || references.has(item.referencia)) throw new Error("Cada item do rateio precisa de uma referência única.");
		references.add(item.referencia);
		const weight = method === "PROPORCIONAL_VALOR" ? item.valorBaseCentavos : item.quantidade;
		if (!Number.isFinite(weight) || weight < 0) throw new Error("Peso de rateio inválido.");
		return { ...item, index, weight };
	});
	const totalWeight = weightedItems.reduce((total, item) => total + item.weight, 0);
	if (totalWeight <= 0) throw new Error("O total dos pesos de rateio deve ser maior que zero.");

	const shares = weightedItems.map((item) => {
		const exactShare = (parsedModifier.valorCentavos * item.weight) / totalWeight;
		const floorShare = Math.floor(exactShare);
		return { ...item, allocatedCents: floorShare, remainder: exactShare - floorShare };
	});
	let remainingCents = parsedModifier.valorCentavos - shares.reduce((total, item) => total + item.allocatedCents, 0);
	const remainderOrder = [...shares].sort((left, right) => right.remainder - left.remainder || left.index - right.index);
	for (let index = 0; index < remainingCents; index += 1) remainderOrder[index % remainderOrder.length].allocatedCents += 1;

	return shares.map((item) => ({
		referenciaItem: item.referencia,
		modificador: {
			...parsedModifier,
			valorCentavos: item.allocatedCents,
			rateio: { metodo: method },
		},
	}));
}

export function appendPurchaseCostModifiers(
	snapshot: TPurchaseCostModifiersSnapshot | null | undefined,
	modifiers: TPurchaseCostModifier[],
): TPurchaseCostModifiersSnapshot {
	const current = snapshot == null ? EMPTY_PURCHASE_COST_MODIFIERS : PurchaseCostModifiersSnapshotSchema.parse(snapshot);
	return PurchaseCostModifiersSnapshotSchema.parse({ versao: 1, modificadores: [...current.modificadores, ...modifiers] });
}
