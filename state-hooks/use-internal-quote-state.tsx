import { useCallback, useMemo, useState } from "react";
import z from "zod";

/**
 * Estado do construtor de orçamento do hub de atendimentos.
 *
 * Deliberadamente mais pobre que `use-sale-state`: um orçamento não tem desconto, cupom, cashback,
 * recompensa, entrega, pagamento nem vendedor. Todos exigem autorização, caixa aberto ou endereço, e
 * são resolvidos no checkout — que é a única porta de efetivação.
 *
 * `preco` vive aqui apenas para o total exibido enquanto se monta a lista. A verdade é sempre do
 * servidor: `resolveSaleItems` reconsulta o catálogo e recalcula tudo na criação.
 */

export const QuoteStateItemSchema = z.object({
	tempId: z.string(),
	produtoId: z.string(),
	produtoVarianteId: z.string().optional().nullable(),
	nome: z.string(),
	variacao: z.string().optional().nullable(),
	codigo: z.string(),
	imagemUrl: z.string().optional().nullable(),
	preco: z.number(),
	quantidade: z.number().positive(),
});
export type TQuoteStateItem = z.infer<typeof QuoteStateItemSchema>;

export const QuoteStateSchema = z.object({
	itens: z.array(QuoteStateItemSchema).default([]),
	observacoes: z.string().default(""),
});
export type TQuoteState = z.infer<typeof QuoteStateSchema>;

const MAX_QUOTE_ITEMS = 50;

function getDefaultQuoteState(): TQuoteState {
	return { itens: [], observacoes: "" };
}

/** Mesma referência de catálogo = mesma linha. Somar quantidade é o que o operador espera. */
function isSameCatalogReference(item: TQuoteStateItem, produtoId: string, produtoVarianteId: string | null) {
	return item.produtoId === produtoId && (item.produtoVarianteId ?? null) === produtoVarianteId;
}

export function useInternalQuoteState({ initialState }: { initialState?: Partial<TQuoteState> } = {}) {
	const [state, setState] = useState<TQuoteState>({
		itens: initialState?.itens ?? [],
		observacoes: initialState?.observacoes ?? "",
	});

	const addItem = useCallback((item: Omit<TQuoteStateItem, "tempId" | "quantidade"> & { quantidade?: number }) => {
		const quantidade = item.quantidade ?? 1;
		const produtoVarianteId = item.produtoVarianteId ?? null;

		setState((prev) => {
			const existing = prev.itens.find((current) => isSameCatalogReference(current, item.produtoId, produtoVarianteId));
			if (existing) {
				return {
					...prev,
					itens: prev.itens.map((current) =>
						current.tempId === existing.tempId ? { ...current, quantidade: current.quantidade + quantidade } : current,
					),
				};
			}
			if (prev.itens.length >= MAX_QUOTE_ITEMS) return prev;
			return {
				...prev,
				itens: [...prev.itens, { ...item, produtoVarianteId, quantidade, tempId: crypto.randomUUID() }],
			};
		});
	}, []);

	const updateItemQuantity = useCallback((tempId: string, quantidade: number) => {
		setState((prev) => ({
			...prev,
			// Quantidade zero remove: um stepper que trava em 1 obriga o operador a caçar o botão de lixeira.
			itens:
				quantidade <= 0
					? prev.itens.filter((item) => item.tempId !== tempId)
					: prev.itens.map((item) => (item.tempId === tempId ? { ...item, quantidade } : item)),
		}));
	}, []);

	const removeItem = useCallback((tempId: string) => {
		setState((prev) => ({ ...prev, itens: prev.itens.filter((item) => item.tempId !== tempId) }));
	}, []);

	const updateObservacoes = useCallback((observacoes: string) => {
		setState((prev) => ({ ...prev, observacoes }));
	}, []);

	const resetState = useCallback(() => setState(getDefaultQuoteState()), []);

	const valorTotal = useMemo(() => state.itens.reduce((total, item) => total + item.preco * item.quantidade, 0), [state.itens]);
	const itemCount = useMemo(() => state.itens.reduce((total, item) => total + item.quantidade, 0), [state.itens]);

	/** Projeção mínima aceita pela rota: referência de catálogo e quantidade, sem valores. */
	const catalogReferences = useMemo(
		() =>
			state.itens.map((item) => ({
				produtoId: item.produtoId,
				produtoVarianteId: item.produtoVarianteId ?? null,
				quantidade: item.quantidade,
			})),
		[state.itens],
	);

	return {
		state,
		addItem,
		updateItemQuantity,
		removeItem,
		updateObservacoes,
		resetState,
		valorTotal,
		itemCount,
		catalogReferences,
		isReadyForQuote: state.itens.length > 0,
		isAtItemLimit: state.itens.length >= MAX_QUOTE_ITEMS,
	};
}

export type TUseInternalQuoteState = ReturnType<typeof useInternalQuoteState>;
