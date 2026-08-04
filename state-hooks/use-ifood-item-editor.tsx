"use client";

import type { TIfoodItemFlatDTO } from "@/lib/integrations/ifood/catalog-types";
import { getErrorMessage } from "@/lib/errors";
import { validateIfoodOptionGroups } from "@/lib/integrations/ifood/option-groups";
import { upsertIfoodItem } from "@/lib/mutations/ifood";
import { IfoodCatalogStatusEnum, IfoodOptionGroupTypeEnum, type TIfoodCatalogStatusEnum, type TIfoodOptionGroupTypeEnum } from "@/schemas/enums";
import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
	buildDefaultChannels,
	type TIfoodChannelState,
	type TIfoodOptionGroupState,
	useInternalIfoodProductState,
} from "./use-internal-ifood-product-state";

type IfoodItemEditorCallbacks = {
	onSuccess?: () => void;
	onError?: (error: Error) => void;
};

/** O status do iFood chega como string livre na leitura; qualquer coisa fora do par vira AVAILABLE. */
function coerceStatus(status: string | null): TIfoodCatalogStatusEnum {
	const parsed = IfoodCatalogStatusEnum.safeParse(status?.toUpperCase());
	return parsed.success ? parsed.data : "AVAILABLE";
}

/**
 * Tipos de grupo de pizza (SIZE/CRUST/...) ainda não são editáveis por aqui. Cair no seletor de
 * quatro tipos silenciosamente reescreveria a estrutura da pizza no próximo save, então mantemos o
 * valor lido e deixamos o suporte a pizza tratar disso.
 */
function coerceOptionGroupType(tipo: string | null): TIfoodOptionGroupTypeEnum {
	const parsed = IfoodOptionGroupTypeEnum.safeParse(tipo?.toUpperCase());
	return parsed.success ? parsed.data : "OFFER_UNIT";
}

/** Sempre devolve os três canais: os que o item não sobrescreve aparecem como "herda". */
function hydrateChannels(item: TIfoodItemFlatDTO): TIfoodChannelState[] {
	return buildDefaultChannels().map((padrao) => {
		const lido = item.canais.find((canal) => canal.contexto?.toUpperCase() === padrao.contexto);
		if (!lido) return padrao;
		const status = IfoodCatalogStatusEnum.safeParse(lido.status?.toUpperCase());
		return {
			contexto: padrao.contexto,
			preco: lido.preco,
			status: status.success ? status.data : null,
			codigoExterno: lido.codigoExterno,
		};
	});
}

function hydrateOptionGroups(item: TIfoodItemFlatDTO): TIfoodOptionGroupState[] {
	return item.gruposComplementos.map((grupo) => ({
		id: grupo.id,
		nome: grupo.nome ?? "",
		tipo: coerceOptionGroupType(grupo.tipo),
		min: grupo.min ?? 0,
		max: grupo.max ?? 1,
		opcoes: grupo.opcoes.map((opcao) => ({
			id: opcao.id,
			produtoId: opcao.produtoId,
			nome: opcao.nome ?? "",
			preco: opcao.preco,
			codigoExterno: opcao.codigoExterno,
			status: coerceStatus(opcao.status),
		})),
	}));
}

/**
 * Editor da página de detalhe de um item do iFood.
 *
 * Diferente das seções do cadastro interno, aqui a apply bar é uma só para a página inteira: o
 * `PUT /items` do iFood carrega item, produto, grupos e opções no mesmo payload, então separar em
 * "aplicar geral" e "aplicar complementos" prometeria uma granularidade que a API não tem.
 */
export function useIfoodItemEditor({
	merchantId,
	item,
	callbacks,
}: {
	merchantId: string;
	item: TIfoodItemFlatDTO;
	callbacks?: IfoodItemEditorCallbacks;
}) {
	const produtoState = useInternalIfoodProductState({
		initialState: {
			produto: {
				nome: item.nome ?? "",
				descricao: item.descricao,
				codigoExterno: item.codigoExterno,
				imagemPath: item.imagemPath,
				categoriaId: item.categoriaId,
				preco: item.preco,
				precoOriginal: item.precoOriginal,
				status: coerceStatus(item.status),
			},
			gruposComplementos: hydrateOptionGroups(item),
			canais: hydrateChannels(item),
		},
	});
	const { state, redefineState } = produtoState;
	const [isDirty, setIsDirty] = useState(false);

	const hydratedState = useMemo(
		() => ({
			produto: {
				nome: item.nome ?? "",
				descricao: item.descricao,
				codigoExterno: item.codigoExterno,
				imagemPath: item.imagemPath,
				categoriaId: item.categoriaId,
				preco: item.preco,
				precoOriginal: item.precoOriginal,
				status: coerceStatus(item.status),
			},
			gruposComplementos: hydrateOptionGroups(item),
			canais: hydrateChannels(item),
		}),
		[item],
	);

	// Item recarregado (refetch pós-save, troca de item): descarta rascunho e volta ao servidor.
	useEffect(() => {
		redefineState(hydratedState);
		setIsDirty(false);
	}, [hydratedState, redefineState]);

	const issues = useMemo(() => validateIfoodOptionGroups(state.gruposComplementos), [state.gruposComplementos]);

	const { mutate, isPending } = useMutation({
		mutationKey: ["upsert-ifood-item", merchantId, item.id],
		mutationFn: upsertIfoodItem,
		onSuccess: (data) => {
			setIsDirty(false);
			toast.success(data.message);
			callbacks?.onSuccess?.();
		},
		onError: (error) => {
			callbacks?.onError?.(error);
			toast.error(getErrorMessage(error));
		},
	});

	const markDirty = useCallback(() => setIsDirty(true), []);

	const discard = useCallback(() => {
		redefineState(hydratedState);
		setIsDirty(false);
	}, [hydratedState, redefineState]);

	const apply = useCallback(() => {
		if (!state.produto.nome.trim()) return toast.error("Informe o nome do produto.");
		if (!state.produto.categoriaId) return toast.error("Selecione a categoria do produto.");
		if (state.produto.preco == null || state.produto.preco < 0) return toast.error("Informe o preço do produto.");
		if (issues.length > 0) return toast.error(issues[0].mensagem);

		mutate({
			merchantId,
			item: {
				itemId: item.id,
				produtoId: item.produtoId,
				categoriaId: state.produto.categoriaId,
				status: state.produto.status,
				preco: state.produto.preco,
				precoOriginal: state.produto.precoOriginal,
				codigoExterno: state.produto.codigoExterno,
				produto: {
					nome: state.produto.nome.trim(),
					descricao: state.produto.descricao,
					imagemPath: state.produto.imagemPath,
				},
				contextModifiers: state.canais.map((canal) => ({
					contexto: canal.contexto,
					preco: canal.preco,
					status: canal.status,
					codigoExterno: canal.codigoExterno,
				})),
				gruposComplementos: state.gruposComplementos.map((grupo) => ({
					id: grupo.id,
					nome: grupo.nome.trim(),
					tipo: grupo.tipo,
					min: grupo.min,
					max: grupo.max,
					opcoes: grupo.opcoes.map((opcao) => ({
						id: opcao.id,
						produtoId: opcao.produtoId,
						nome: opcao.nome.trim(),
						preco: opcao.preco,
						codigoExterno: opcao.codigoExterno,
						status: opcao.status,
					})),
				})),
			},
		});
	}, [issues, item.id, item.produtoId, merchantId, mutate, state]);

	// Todo updater marca sujeira antes de delegar — evita esquecer um e a apply bar não aparecer.
	const wrap = useCallback(
		<TArgs extends unknown[]>(fn: (...args: TArgs) => void) =>
			(...args: TArgs) => {
				markDirty();
				fn(...args);
			},
		[markDirty],
	);

	return {
		state,
		issues,
		isDirty,
		isPending,
		apply,
		discard,
		updateProduto: wrap(produtoState.updateProduto),
		addGrupoComplemento: wrap(produtoState.addGrupoComplemento),
		updateGrupoComplemento: wrap(produtoState.updateGrupoComplemento),
		removeGrupoComplemento: wrap(produtoState.removeGrupoComplemento),
		addOpcao: wrap(produtoState.addOpcao),
		updateOpcao: wrap(produtoState.updateOpcao),
		removeOpcao: wrap(produtoState.removeOpcao),
		updateCanal: wrap(produtoState.updateCanal),
	};
}
export type TUseIfoodItemEditor = ReturnType<typeof useIfoodItemEditor>;
