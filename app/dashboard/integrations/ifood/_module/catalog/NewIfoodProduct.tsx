"use client";

import NumberInput from "@/components/Inputs/NumberInput";
import SelectInput from "@/components/Inputs/SelectInput";
import TextInput from "@/components/Inputs/TextInput";
import TextareaInput from "@/components/Inputs/TextareaInput";
import ResponsiveMenuV2 from "@/components/Utils/ResponsiveMenuV2";
import { getErrorMessage } from "@/lib/errors";
import type { TIfoodCategoryDTO } from "@/lib/integrations/ifood/catalog-types";
import { upsertIfoodItem } from "@/lib/mutations/ifood";
import { useInternalIfoodProductState } from "@/state-hooks/use-internal-ifood-product-state";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ProductImageBlock } from "./Blocks/ProductImageBlock";

type NewIfoodProductProps = {
	merchantId: string;
	categories: TIfoodCategoryDTO[];
	initialCategoryId?: string | null;
	closeModal: () => void;
	callbacks?: {
		onSuccess?: () => void;
	};
};

/** Modal de criação de produto no catálogo do iFood (produto base + item vendável na categoria). */
export function NewIfoodProduct({ merchantId, categories, initialCategoryId, closeModal, callbacks }: NewIfoodProductProps) {
	const { state, updateProduto } = useInternalIfoodProductState({
		initialState: { produto: { categoriaId: initialCategoryId ?? null } },
	});

	const { mutate, isPending } = useMutation({
		mutationKey: ["upsert-ifood-item", merchantId],
		mutationFn: upsertIfoodItem,
		onSuccess: (data) => {
			callbacks?.onSuccess?.();
			toast.success(data.message);
			closeModal();
		},
		onError: (error) => {
			toast.error(getErrorMessage(error));
		},
	});

	function handleSubmit() {
		if (!state.produto.nome.trim()) return toast.error("Informe o nome do produto.");
		if (!state.produto.categoriaId) return toast.error("Selecione a categoria do produto.");
		if (state.produto.preco == null || state.produto.preco < 0) return toast.error("Informe o preço do produto.");

		mutate({
			merchantId,
			item: {
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
			},
		});
	}

	return (
		<ResponsiveMenuV2
			menuTitle="NOVO PRODUTO"
			menuDescription="Cria um produto no catálogo do iFood e o disponibiliza na categoria selecionada."
			menuActionButtonText="CRIAR PRODUTO"
			menuCancelButtonText="CANCELAR"
			closeMenu={closeModal}
			actionFunction={handleSubmit}
			actionIsLoading={isPending}
			stateIsLoading={false}
		>
			<div className="flex flex-col gap-4">
				<TextInput
					label="NOME DO PRODUTO"
					value={state.produto.nome}
					placeholder="Ex: X-Burguer Especial..."
					handleChange={(value) => updateProduto({ nome: value })}
				/>
				<TextareaInput
					label="DESCRIÇÃO"
					value={state.produto.descricao ?? ""}
					placeholder="Descreva o produto para os clientes..."
					handleChange={(value) => updateProduto({ descricao: value || null })}
				/>
				<SelectInput
					label="CATEGORIA"
					value={state.produto.categoriaId}
					resetOptionLabel="NÃO DEFINIDO"
					options={categories.map((category) => ({ id: category.id, value: category.id, label: category.nome ?? category.id }))}
					handleChange={(value) => updateProduto({ categoriaId: value })}
					onReset={() => updateProduto({ categoriaId: null })}
				/>
				<NumberInput
					label="PREÇO (R$)"
					value={state.produto.preco}
					placeholder="Ex: 29,90..."
					handleChange={(value) => updateProduto({ preco: value })}
				/>
				<TextInput
					label="CÓDIGO EXTERNO (PDV)"
					value={state.produto.codigoExterno ?? ""}
					placeholder="Código do produto no seu sistema..."
					handleChange={(value) => updateProduto({ codigoExterno: value || null })}
				/>
				<ProductImageBlock merchantId={merchantId} imagemPath={state.produto.imagemPath} onUploaded={(imagemPath) => updateProduto({ imagemPath })} />
			</div>
		</ResponsiveMenuV2>
	);
}
