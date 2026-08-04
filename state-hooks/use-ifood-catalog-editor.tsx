"use client";

import { getErrorMessage } from "@/lib/errors";
import { describeIfoodUpdatePlan, planIfoodItemUpdates, type TIfoodItemChange } from "@/lib/integrations/ifood/catalog-batch";
import type { TIfoodBatchResultDTO, TIfoodCategoryDTO } from "@/lib/integrations/ifood/catalog-types";
import { batchUpdateIfoodProducts, patchIfoodItem, updateIfoodCategory } from "@/lib/mutations/ifood";
import { fetchIfoodBatchStatus } from "@/lib/queries/ifood";
import type { TIfoodCatalogStatusEnum } from "@/schemas/enums";
import { useMutation } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

/** Quantas vezes consultamos o lote antes de desistir, e o intervalo entre consultas. */
const BATCH_POLL_ATTEMPTS = 15;
const BATCH_POLL_INTERVAL_MS = 2000;

export type TIfoodBatchWatch = {
	total: number;
	concluidos: number;
	falhas: TIfoodBatchResultDTO[];
	/** `true` enquanto ainda há lote sem estado terminal. */
	emAndamento: boolean;
	/** `true` quando o tempo de espera acabou antes do iFood concluir. */
	expirou: boolean;
};

export type TIfoodItemDraft = { preco?: number; status?: TIfoodCatalogStatusEnum };
export type TIfoodCategoryDraft = { nome?: string; codigoExterno?: string; status?: TIfoodCatalogStatusEnum };

/**
 * Rascunho das edições feitas na tabela do catálogo, aplicado de uma vez.
 *
 * O ganho de acumular em vez de salvar campo a campo não é só de UX: com o rascunho, N edições de
 * preço viram UMA chamada ao endpoint de lote do iFood. Salvando a cada tecla, virariam N.
 */
export function useIfoodCatalogEditor({
	merchantId,
	catalogId,
	categorias,
	onApplied,
}: {
	merchantId: string;
	catalogId: string | null;
	categorias: TIfoodCategoryDTO[];
	onApplied?: () => void;
}) {
	const [itemDrafts, setItemDrafts] = useState<Record<string, TIfoodItemDraft>>({});
	const [categoryDrafts, setCategoryDrafts] = useState<Record<string, TIfoodCategoryDraft>>({});
	const [isPending, setIsPending] = useState(false);
	const [batchWatch, setBatchWatch] = useState<TIfoodBatchWatch | null>(null);

	const isDirty = Object.keys(itemDrafts).length > 0 || Object.keys(categoryDrafts).length > 0;

	const updateItemDraft = useCallback((itemId: string, draft: TIfoodItemDraft) => {
		setItemDrafts((prev) => ({ ...prev, [itemId]: { ...prev[itemId], ...draft } }));
	}, []);

	const updateCategoryDraft = useCallback((categoryId: string, draft: TIfoodCategoryDraft) => {
		setCategoryDrafts((prev) => ({ ...prev, [categoryId]: { ...prev[categoryId], ...draft } }));
	}, []);

	const discard = useCallback(() => {
		setItemDrafts({});
		setCategoryDrafts({});
	}, []);

	// O código externo mora na categoria que contém o item — é o que decide lote vs. chamada avulsa.
	const plan = useMemo(() => {
		const changes: TIfoodItemChange[] = [];
		for (const categoria of categorias) {
			for (const item of categoria.itens) {
				if (!item.id) continue;
				const draft = itemDrafts[item.id];
				if (!draft) continue;
				changes.push({ itemId: item.id, codigoExterno: item.codigoExterno, preco: draft.preco, status: draft.status });
			}
		}
		return planIfoodItemUpdates(changes);
	}, [categorias, itemDrafts]);

	const resumo = useMemo(() => describeIfoodUpdatePlan(plan), [plan]);

	const { mutateAsync: mutateBatch } = useMutation({ mutationKey: ["batch-ifood-products", merchantId], mutationFn: batchUpdateIfoodProducts });
	const { mutateAsync: mutateItem } = useMutation({ mutationKey: ["patch-ifood-item", merchantId], mutationFn: patchIfoodItem });
	const { mutateAsync: mutateCategory } = useMutation({ mutationKey: ["update-ifood-category", merchantId], mutationFn: updateIfoodCategory });

	/**
	 * Acompanha os lotes até o estado terminal. Sem isso a UI diria "enviado" e pararia ali — mas
	 * `COMPLETED` no lote não garante sucesso por linha, e é em `results[]` que a falha individual
	 * aparece. Só o iFood sabe quando terminou, então consultamos até concluir ou estourar o tempo.
	 */
	const watchBatches = useCallback(
		async (batchIds: string[]) => {
			if (!batchIds.length) return;

			const pendentes = new Set(batchIds);
			const falhas: TIfoodBatchResultDTO[] = [];
			setBatchWatch({ total: batchIds.length, concluidos: 0, falhas: [], emAndamento: true, expirou: false });

			for (let tentativa = 0; tentativa < BATCH_POLL_ATTEMPTS && pendentes.size > 0; tentativa++) {
				await new Promise((resolve) => setTimeout(resolve, BATCH_POLL_INTERVAL_MS));

				for (const batchId of Array.from(pendentes)) {
					try {
						const estado = await fetchIfoodBatchStatus({ merchantId, batchId });
						if (!estado.concluido) continue;
						pendentes.delete(batchId);
						falhas.push(...estado.falhas);
					} catch {
						// Falha ao consultar não é falha do lote: seguimos tentando até o teto.
					}
				}

				setBatchWatch({
					total: batchIds.length,
					concluidos: batchIds.length - pendentes.size,
					falhas: [...falhas],
					emAndamento: pendentes.size > 0,
					expirou: false,
				});
			}

			setBatchWatch({
				total: batchIds.length,
				concluidos: batchIds.length - pendentes.size,
				falhas,
				emAndamento: false,
				expirou: pendentes.size > 0,
			});
		},
		[merchantId],
	);

	const dismissBatchWatch = useCallback(() => setBatchWatch(null), []);

	const apply = useCallback(async () => {
		setIsPending(true);
		setBatchWatch(null);
		const batchIds: string[] = [];
		try {
			for (const [categoryId, draft] of Object.entries(categoryDrafts)) {
				const categoria = categorias.find((candidata) => candidata.id === categoryId);
				if (!categoria || !catalogId) continue;
				await mutateCategory({
					merchantId,
					catalogId,
					categoryId,
					categoria: {
						nome: draft.nome ?? categoria.nome ?? "",
						codigoExterno: draft.codigoExterno ?? categoria.codigoExterno,
						status: draft.status ?? null,
						template: categoria.template,
					},
				});
			}

			if (plan.lotePreco.length) {
				const resposta = await mutateBatch({
					merchantId,
					tipo: "PRECO",
					itens: plan.lotePreco.map((entrada) => ({ codigoExterno: entrada.codigoExterno, preco: entrada.preco, status: null })),
				});
				if (resposta.data.id) batchIds.push(resposta.data.id);
			}
			if (plan.loteStatus.length) {
				const resposta = await mutateBatch({
					merchantId,
					tipo: "STATUS",
					itens: plan.loteStatus.map((entrada) => ({ codigoExterno: entrada.codigoExterno, preco: null, status: entrada.status })),
				});
				if (resposta.data.id) batchIds.push(resposta.data.id);
			}
			for (const individual of plan.individuais) {
				await mutateItem({
					merchantId,
					itemId: individual.itemId,
					patch: {
						preco: individual.preco ?? null,
						precoOriginal: null,
						status: individual.status ?? null,
						codigoExterno: null,
					},
				});
			}

			discard();
			toast.success("Alterações enviadas ao iFood.");
			onApplied?.();
		} catch (error) {
			toast.error(getErrorMessage(error));
			return;
		} finally {
			setIsPending(false);
		}

		// Fora do try: o acompanhamento não deve segurar o botão nem transformar timeout de lote em
		// erro de envio — o envio já deu certo.
		await watchBatches(batchIds);
		onApplied?.();
	}, [catalogId, categorias, categoryDrafts, discard, merchantId, mutateBatch, mutateCategory, mutateItem, onApplied, plan, watchBatches]);

	/** Valor a exibir numa célula: o rascunho quando existe, senão o que veio do iFood. */
	const resolveItemValue = useCallback(
		<TKey extends keyof TIfoodItemDraft>(itemId: string | null, campo: TKey, valorServidor: TIfoodItemDraft[TKey]) => {
			if (!itemId) return valorServidor;
			const draft = itemDrafts[itemId];
			return draft?.[campo] ?? valorServidor;
		},
		[itemDrafts],
	);

	const resolveCategoryValue = useCallback(
		<TKey extends keyof TIfoodCategoryDraft>(categoryId: string, campo: TKey, valorServidor: TIfoodCategoryDraft[TKey]) => {
			return categoryDrafts[categoryId]?.[campo] ?? valorServidor;
		},
		[categoryDrafts],
	);

	return {
		isDirty,
		isPending,
		resumo,
		plan,
		batchWatch,
		dismissBatchWatch,
		apply,
		discard,
		updateItemDraft,
		updateCategoryDraft,
		resolveItemValue,
		resolveCategoryValue,
	};
}
