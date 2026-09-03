"use client";

import type { TGetSalesChannelShowcaseInput } from "@/app/api/sales-channels/showcase/route";
import { getErrorMessage } from "@/lib/errors";
import { updateSalesChannelShowcase } from "@/lib/mutations/sales-channels";
import { UNGROUPED_PRODUCTS_LABEL, sortGroupsByChannelOrder } from "@/lib/products/sales-channels";
import type { TSalesChannelShowcase, TSalesChannelShowcaseProduct } from "@/lib/queries/sales-channels";
import type { TSalesChannelCatalogModeEnum } from "@/schemas/enums";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useDirtyFlag, wrapWithDirty } from "./use-product-section-editor";

export type TSalesChannelShowcaseState = {
	catalogoModo: TSalesChannelCatalogModeEnum;
	ordemGrupos: string[];
	produtos: TSalesChannelShowcaseProduct[];
};

export type TShowcaseGroup = {
	/** Nome do grupo no cadastro; string vazia para os produtos sem grupo. */
	key: string;
	label: string;
	ungrouped: boolean;
	produtos: TSalesChannelShowcaseProduct[];
};

function hydrateShowcaseState(showcase: TSalesChannelShowcase): TSalesChannelShowcaseState {
	return {
		catalogoModo: showcase.channel.catalogoModo,
		ordemGrupos: showcase.channel.ordemGrupos,
		produtos: showcase.products,
	};
}

/** Grupos não vazios presentes nos produtos, na ordem em que a vitrine os exibe. */
function displayedGroups(produtos: TSalesChannelShowcaseProduct[], ordemGrupos: string[]) {
	const present = [...new Set(produtos.map((produto) => produto.grupo).filter((grupo) => grupo.trim().length > 0))];
	return sortGroupsByChannelOrder(present, ordemGrupos);
}

/**
 * Monta os painéis da vitrine: um por grupo, na ordem curada, com os produtos em ordem alfabética
 * dentro de cada um (a ordenação fina de produto fica para depois). O balde dos sem grupo vai por
 * último e só existe quando tem linha — é o mesmo "Outros" que a loja pública mostra no fim.
 */
export function groupShowcaseProducts(produtos: TSalesChannelShowcaseProduct[], ordemGrupos: string[]): TShowcaseGroup[] {
	const byGroup = new Map<string, TSalesChannelShowcaseProduct[]>();
	for (const produto of produtos) {
		const key = produto.grupo.trim().length > 0 ? produto.grupo : "";
		const bucket = byGroup.get(key);
		if (bucket) bucket.push(produto);
		else byGroup.set(key, [produto]);
	}

	const sortByName = (items: TSalesChannelShowcaseProduct[]) => items.toSorted((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
	const groups: TShowcaseGroup[] = displayedGroups(produtos, ordemGrupos).map((key) => ({
		key,
		label: key,
		ungrouped: false,
		produtos: sortByName(byGroup.get(key) ?? []),
	}));

	const ungrouped = byGroup.get("");
	if (ungrouped?.length) groups.push({ key: "", label: UNGROUPED_PRODUCTS_LABEL, ungrouped: true, produtos: sortByName(ungrouped) });

	return groups;
}

export function useInternalSalesChannelShowcaseState({ initialState }: { initialState: TSalesChannelShowcaseState }) {
	const [state, setState] = useState<TSalesChannelShowcaseState>(initialState);

	const setCatalogMode = useCallback((catalogoModo: TSalesChannelCatalogModeEnum) => {
		setState((prev) => ({ ...prev, catalogoModo }));
	}, []);

	const addProduct = useCallback((produto: TSalesChannelShowcaseProduct) => {
		setState((prev) => {
			if (prev.produtos.some((item) => item.id === produto.id)) return prev;
			const produtos = [...prev.produtos, produto];
			const grupo = produto.grupo.trim();
			if (!grupo) return { ...prev, produtos };

			// Grupo inédito entra no fim da vitrine. A ordem exibida ANTES da inclusão é materializada
			// junto: sem isso, gravar só o grupo novo faria ele saltar para a frente dos grupos que
			// ainda estavam na cauda alfabética — a tela mudaria sozinha embaixo do usuário.
			const current = displayedGroups(prev.produtos, prev.ordemGrupos);
			if (current.includes(grupo)) return { ...prev, produtos };
			return { ...prev, produtos, ordemGrupos: [...current, grupo] };
		});
	}, []);

	const removeProduct = useCallback((produtoId: string) => {
		// A entrada do grupo continua na ordem mesmo que ele fique vazio: se o produto voltar, volta
		// para a mesma posição. O GET poda o que não existe mais.
		setState((prev) => ({ ...prev, produtos: prev.produtos.filter((produto) => produto.id !== produtoId) }));
	}, []);

	const updateProductPrice = useCallback((produtoId: string, precoVendaCanal: number | null) => {
		setState((prev) => ({
			...prev,
			produtos: prev.produtos.map((produto) => (produto.id === produtoId ? { ...produto, precoVendaCanal } : produto)),
		}));
	}, []);

	const moveGroup = useCallback((grupo: string, direction: "up" | "down") => {
		setState((prev) => {
			// A troca acontece sobre a ordem EXIBIDA e o resultado inteiro é gravado: a cauda
			// alfabética vira ordem explícita no momento em que alguém decide mexer nela.
			const current = displayedGroups(prev.produtos, prev.ordemGrupos);
			const index = current.indexOf(grupo);
			const target = direction === "up" ? index - 1 : index + 1;
			if (index < 0 || target < 0 || target >= current.length) return prev;

			const ordemGrupos = [...current];
			ordemGrupos[index] = current[target];
			ordemGrupos[target] = grupo;
			return { ...prev, ordemGrupos };
		});
	}, []);

	/**
	 * Espelha no rascunho um grupo que JÁ foi renomeado no banco. Não é uma edição da vitrine — é
	 * a correção do nome que o rascunho carrega, para que uma renomeação feita com alterações
	 * pendentes não deixe a tela mostrando um grupo que não existe mais.
	 */
	const syncRenamedGroup = useCallback((grupoAtual: string, grupoNovo: string) => {
		setState((prev) => ({
			...prev,
			produtos: prev.produtos.map((produto) => (produto.grupo === grupoAtual ? { ...produto, grupo: grupoNovo } : produto)),
			// Renomear para um grupo existente funde os dois: a posição que vale é a primeira.
			ordemGrupos: prev.ordemGrupos
				.map((grupo) => (grupo === grupoAtual ? grupoNovo : grupo))
				.filter((grupo, index, list) => list.indexOf(grupo) === index),
		}));
	}, []);

	const redefineState = useCallback((next: TSalesChannelShowcaseState) => setState(next), []);
	const resetState = useCallback(() => setState(initialState), [initialState]);

	return { state, setCatalogMode, addProduct, removeProduct, updateProductPrice, moveGroup, syncRenamedGroup, redefineState, resetState };
}
export type TUseInternalSalesChannelShowcaseState = ReturnType<typeof useInternalSalesChannelShowcaseState>;

type ShowcaseSectionEditorCallbacks = {
	onSuccess?: () => void;
	onError?: (error: Error) => void;
};

/**
 * Rascunho da seção da vitrine: mesmo desenho das seções do cadastro de produto — estado local,
 * barra de aplicar própria e re-hidratação que só acontece enquanto não há edição pendente, para
 * que um refetch em voo não apague o que o usuário acabou de montar.
 */
export function useSalesChannelShowcaseSectionEditor({
	showcase,
	channel,
	callbacks,
}: {
	showcase: TSalesChannelShowcase;
	channel: TGetSalesChannelShowcaseInput["channel"];
	callbacks?: ShowcaseSectionEditorCallbacks;
}) {
	const queryClient = useQueryClient();
	const { isDirty, isDirtyRef, markDirty, clearDirty } = useDirtyFlag();
	const showcaseState = useInternalSalesChannelShowcaseState({ initialState: hydrateShowcaseState(showcase) });
	const { state, redefineState } = showcaseState;

	useEffect(() => {
		if (!isDirtyRef.current) redefineState(hydrateShowcaseState(showcase));
	}, [isDirtyRef, redefineState, showcase]);

	const discard = useCallback(() => {
		redefineState(hydrateShowcaseState(showcase));
		clearDirty();
	}, [clearDirty, redefineState, showcase]);

	const { mutate: applyMutation, isPending } = useMutation({
		mutationKey: ["apply-sales-channel-showcase", channel],
		mutationFn: () =>
			updateSalesChannelShowcase({
				channel,
				catalogoModo: state.catalogoModo,
				ordemGrupos: state.ordemGrupos.filter((grupo) => grupo.trim().length > 0),
				produtos: state.produtos.map((produto) => ({
					produtoId: produto.id,
					// Produto com variantes precifica por variante: mandar preço nível-produto aqui seria
					// um 400 garantido, e o resolver ignoraria o valor de qualquer forma.
					precoVenda: produto.temVariantes ? null : produto.precoVendaCanal,
				})),
			}),
		onSuccess: (data) => {
			clearDirty();
			callbacks?.onSuccess?.();
			toast.success(data.message);
		},
		onError: (error) => {
			callbacks?.onError?.(error as Error);
			toast.error(getErrorMessage(error));
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: ["sales-channel-showcase", channel] });
			queryClient.invalidateQueries({ queryKey: ["sales-channels"] });
			// A matriz de canais do cadastro de produto lê as mesmas linhas.
			queryClient.invalidateQueries({ queryKey: ["product-channel-settings"] });
		},
	});

	const apply = useCallback(() => applyMutation(), [applyMutation]);

	/**
	 * O grupo foi renomeado no cadastro (rota própria, já persistida). O rascunho é corrigido sem
	 * `markDirty` — nada ficou pendente por causa disso — e a consulta é invalidada para trazer os
	 * produtos com o nome novo. Sem o espelho, um rascunho sujo bloquearia a re-hidratação e a
	 * tela continuaria mostrando o nome antigo até alguém aplicar ou descartar.
	 */
	const renameGroup = useCallback(
		(grupoAtual: string, grupoNovo: string) => {
			showcaseState.syncRenamedGroup(grupoAtual, grupoNovo);
			queryClient.invalidateQueries({ queryKey: ["sales-channel-showcase", channel] });
			queryClient.invalidateQueries({ queryKey: ["products"] });
			// A lista de grupos alimenta o seletor do cadastro de produto — o nome antigo não pode
			// continuar sendo oferecido depois da renomeação.
			queryClient.invalidateQueries({ queryKey: ["product-groups"] });
		},
		[channel, queryClient, showcaseState],
	);

	const groups = useMemo(() => groupShowcaseProducts(state.produtos, state.ordemGrupos), [state.ordemGrupos, state.produtos]);
	const productIds = useMemo(() => new Set(state.produtos.map((produto) => produto.id)), [state.produtos]);
	const hasProduct = useCallback((produtoId: string) => productIds.has(produtoId), [productIds]);

	const updaters = useMemo(
		() => ({
			setCatalogMode: wrapWithDirty(showcaseState.setCatalogMode, markDirty),
			addProduct: wrapWithDirty(showcaseState.addProduct, markDirty),
			removeProduct: wrapWithDirty(showcaseState.removeProduct, markDirty),
			updateProductPrice: wrapWithDirty(showcaseState.updateProductPrice, markDirty),
			moveGroup: wrapWithDirty(showcaseState.moveGroup, markDirty),
		}),
		[markDirty, showcaseState],
	);

	return { state, groups, hasProduct, isDirty, isPending, apply, discard, renameGroup, ...updaters };
}
export type TUseSalesChannelShowcaseSectionEditor = ReturnType<typeof useSalesChannelShowcaseSectionEditor>;
