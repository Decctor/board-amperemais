import { ProductSchema, ProductVariantSchema } from "@/schemas/products";
import { PurchaseItemSchema, PurchaseSchema } from "@/schemas/purchases";
import { useCallback, useMemo, useState } from "react";
import z from "zod";

export const PurchaseStateSchema = z.object({
	purchase: PurchaseSchema.omit({
		organizacaoId: true,
		idExterno: true,
		autorId: true,
		dataInsercao: true,
		dataUltimaAtualizacao: true,
	}),
	purchaseItems: z.array(
		PurchaseItemSchema.omit({
			organizacaoId: true,
			compraId: true,
			dataInsercao: true,
		}).extend({
			produto: ProductSchema.pick({
				nome: true,
				imagemCapaUrl: true,
				codigo: true,
				unidade: true,
			}),
			produtoVariante: ProductVariantSchema.pick({
				nome: true,
				codigo: true,
				imagemCapaUrl: true,
			}).optional(),
			// Derived lots spawned by receiving this item (read-only, for the edit UI). Stripped by the
			// server schema on submit; never sent back as input.
			lotes: z
				.array(
					z.object({
						id: z.string(),
						codigoLote: z.string().nullable(),
						quantidadeInicial: z.number(),
						quantidadeAtual: z.number(),
						dataValidade: z.date().nullable(),
						status: z.string(),
					}),
				)
				.optional(),
			id: z
				.string({
					invalid_type_error: "Tipo não válido para ID do item da compra.",
				})
				.optional(),
			deletar: z
				.boolean({
					invalid_type_error: "Tipo não válido para deletar item da compra.",
				})
				.optional(),
		}),
	),
});
export type TPurchaseState = z.infer<typeof PurchaseStateSchema>;

type UsePurchaseStateProps = {
	initialState?: Partial<TPurchaseState>;
};
export const usePurchaseState = ({ initialState }: UsePurchaseStateProps = {}) => {
	const initialStateHolder = useMemo(
		() => ({
			purchase: {
				titulo: initialState?.purchase?.titulo ?? "",
				status: initialState?.purchase?.status ?? "RASCUNHO",
				pedidoData: initialState?.purchase?.pedidoData ?? null,
				entregaDataEnvio: initialState?.purchase?.entregaDataEnvio ?? null,
				entregaDataRecebimentoPrevisao: initialState?.purchase?.entregaDataRecebimentoPrevisao ?? null,
				entregaDataRecebimentoEfetivacao: initialState?.purchase?.entregaDataRecebimentoEfetivacao ?? null,
				dataEfetivacao: initialState?.purchase?.dataEfetivacao ?? null,
				lancamentoContabilId: initialState?.purchase?.lancamentoContabilId ?? null,
				fornecedorId: initialState?.purchase?.fornecedorId ?? null,
				pedidoFornecedorNome: initialState?.purchase?.pedidoFornecedorNome ?? null,
				pedidoFornecedorCnpj: initialState?.purchase?.pedidoFornecedorCnpj ?? null,
				pedidoFornecedorTelefone: initialState?.purchase?.pedidoFornecedorTelefone ?? null,
				pedidoFornecedorEmail: initialState?.purchase?.pedidoFornecedorEmail ?? null,
				transporteTransportadoraNome: initialState?.purchase?.transporteTransportadoraNome ?? null,
				transporteTransportadoraCnpj: initialState?.purchase?.transporteTransportadoraCnpj ?? null,
				transporteTransportadoraTelefone: initialState?.purchase?.transporteTransportadoraTelefone ?? null,
				transporteTransportadoraEmail: initialState?.purchase?.transporteTransportadoraEmail ?? null,
				transporteLinkRastreio: initialState?.purchase?.transporteLinkRastreio ?? null,
			},
			purchaseItems: initialState?.purchaseItems ?? [],
		}),
		[initialState],
	);
	const [state, setState] = useState<TPurchaseState>(initialStateHolder);

	const updatePurchase = useCallback((updates: Partial<TPurchaseState["purchase"]>) => {
		setState((prev) => ({
			...prev,
			purchase: {
				...prev.purchase,
				...updates,
			},
		}));
	}, []);

	const addPurchaseItem = useCallback((item: TPurchaseState["purchaseItems"][number]) => {
		setState((prev) => ({
			...prev,
			purchaseItems: [...prev.purchaseItems, item],
		}));
	}, []);

	const updatePurchaseItem = useCallback(({ index, item }: { index: number; item: Partial<TPurchaseState["purchaseItems"][number]> }) => {
		setState((prev) => ({
			...prev,
			purchaseItems: prev.purchaseItems.map((i, iIndex) => (iIndex === index ? { ...i, ...item } : i)),
		}));
	}, []);

	const removePurchaseItem = useCallback(({ index }: { index: number }) => {
		setState((prev) => {
			const itemInArray = prev.purchaseItems[index];
			if (!itemInArray) return prev;

			// If is an existing item (has id), mark as deletar
			if (itemInArray.id) {
				return { ...prev, purchaseItems: prev.purchaseItems.map((i, iIndex) => (iIndex === index ? { ...i, deletar: true } : i)) };
			}

			return { ...prev, purchaseItems: prev.purchaseItems.filter((_, iIndex) => iIndex !== index) };
		});
	}, []);

	const resetState = useCallback(() => {
		setState(initialStateHolder);
	}, [initialStateHolder]);

	const redefineState = useCallback((state: TPurchaseState) => {
		setState(state);
	}, []);

	return {
		state,
		updatePurchase,
		addPurchaseItem,
		updatePurchaseItem,
		removePurchaseItem,
		resetState,
		redefineState,
	};
};
export type TUsePurchaseState = ReturnType<typeof usePurchaseState>;
