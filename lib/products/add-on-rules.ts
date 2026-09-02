/**
 * Regras de adicionais por vínculo produto↔grupo.
 *
 * A lista de opções vive no grupo (compartilhado entre produtos); quantas escolhas o produto
 * permite pode ser sobrescrita no vínculo (`productAddOnReferences.minOpcoes/maxOpcoes`, null =
 * herda do grupo). A resolução reescreve o `grupo` visto pelo consumidor — mesmo padrão de
 * `channelAddOnReferences` em ./sales-channels.ts — para que POS, loja e validação de pedidos
 * continuem lendo `grupo.minOpcoes/maxOpcoes` sem conhecer o override.
 *
 * Ordem de aplicação: resolver o override do vínculo PRIMEIRO, política de canal depois (ela só
 * zera `minOpcoes`, então o máximo do vínculo sobrevive).
 */

type TRuleOverridableReference = {
	minOpcoes?: number | null;
	maxOpcoes?: number | null;
	grupo: { minOpcoes: number; maxOpcoes: number };
};

export function resolveAddOnReferenceRules<TReference extends TRuleOverridableReference>(reference: TReference): TReference {
	if (reference.minOpcoes == null && reference.maxOpcoes == null) return reference;
	return {
		...reference,
		grupo: {
			...reference.grupo,
			minOpcoes: reference.minOpcoes ?? reference.grupo.minOpcoes,
			maxOpcoes: reference.maxOpcoes ?? reference.grupo.maxOpcoes,
		},
	};
}

export function resolveAddOnReferencesRules<TReference extends TRuleOverridableReference>(references: TReference[]): TReference[] {
	return references.map(resolveAddOnReferenceRules);
}
