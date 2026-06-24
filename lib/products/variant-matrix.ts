type VariantMatrixOptionInput = {
	referenciaId: string;
	nome: string;
	ordem: number;
	deletar?: boolean;
	valores: Array<{
		referenciaId: string;
		nome: string;
		deletar?: boolean;
	}>;
};

type VariantMatrixVariantInput = {
	deletar?: boolean;
	opcoesValores?: Array<{ valorReferenciaId: string }>;
};

export type VariantMatrixComboRef = {
	opcaoReferenciaId: string;
	valorReferenciaId: string;
	valorNome: string;
};

export type VariantMatrixAxisSummary = {
	nome: string;
	count: number;
};

export type VariantMatrixCoverage = {
	matrixAxes: VariantMatrixAxisSummary[];
	matrixCount: number;
	existingCount: number;
	missingCount: number;
	isComplete: boolean;
};

export function getActiveMatrixAxes(options: VariantMatrixOptionInput[]) {
	return options
		.filter((option) => !option.deletar)
		.map((option) => ({ ...option, valores: option.valores.filter((value) => !value.deletar) }))
		.filter((option) => option.valores.length > 0)
		.sort((a, b) => a.ordem - b.ordem);
}

export function buildVariantMatrixCombos(options: VariantMatrixOptionInput[]): VariantMatrixComboRef[][] {
	const activeOptions = getActiveMatrixAxes(options);
	if (activeOptions.length === 0) return [];

	let combos: VariantMatrixComboRef[][] = [[]];
	for (const option of activeOptions) {
		const next: VariantMatrixComboRef[][] = [];
		for (const combo of combos) {
			for (const value of option.valores) {
				next.push([
					...combo,
					{
						opcaoReferenciaId: option.referenciaId,
						valorReferenciaId: value.referenciaId,
						valorNome: value.nome,
					},
				]);
			}
		}
		combos = next;
	}
	return combos;
}

export function variantComboSignature(refs: { valorReferenciaId: string }[]) {
	return refs
		.map((ref) => ref.valorReferenciaId)
		.sort()
		.join("|");
}

export function computeVariantMatrixCoverage({
	options,
	variants,
}: {
	options: VariantMatrixOptionInput[];
	variants: VariantMatrixVariantInput[];
}): VariantMatrixCoverage {
	const activeOptions = getActiveMatrixAxes(options);
	const matrixAxes = activeOptions.map((option) => ({
		nome: option.nome.trim() || "Eixo",
		count: option.valores.length,
	}));
	const combos = buildVariantMatrixCombos(options);
	const matrixCount = combos.length;

	const possibleSignatures = new Set(combos.map((combo) => variantComboSignature(combo)));
	const coveredSignatures = new Set<string>();

	for (const variant of variants) {
		if (variant.deletar) continue;
		const refs = variant.opcoesValores ?? [];
		if (refs.length === 0) continue;

		const signature = variantComboSignature(refs);
		if (possibleSignatures.has(signature)) {
			coveredSignatures.add(signature);
		}
	}

	const existingCount = coveredSignatures.size;
	const missingCount = matrixCount - existingCount;

	return {
		matrixAxes,
		matrixCount,
		existingCount,
		missingCount,
		isComplete: matrixCount > 0 && missingCount === 0,
	};
}
