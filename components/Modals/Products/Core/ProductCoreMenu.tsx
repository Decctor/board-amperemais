"use client";

import type { TGetProductsOutputById } from "@/app/api/products/route";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import ProductStateGeneralBlock from "@/components/Modals/Products/Blocks/General";
import ProductStateStockBlock from "@/components/Modals/Products/Blocks/Stock";
import { getErrorMessage } from "@/lib/errors";
import { uploadFile } from "@/lib/files-storage";
import { updateProduct } from "@/lib/mutations/products";
import { type TProductCoreState, useProductCoreState } from "@/state-hooks/use-product-state";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

export function mapProductToCoreState(product: TGetProductsOutputById): TProductCoreState {
	return {
		nome: product.nome,
		descricao: product.descricao,
		codigo: product.codigo,
		unidade: product.unidade,
		ncm: product.ncm,
		tipo: product.tipo,
		grupo: product.grupo,
		imagemCapaUrl: product.imagemCapaUrl,
		precoCusto: product.precoCusto,
		precoVenda: product.precoVenda,
		quantidade: product.quantidade,
		rastreamentoEstoqueAtivo: !!product.rastreamentoEstoqueAtivo,
		imagemCapaHolder: {
			file: null,
			previewUrl: null,
		},
	};
}

type ProductCoreMenuProps = {
	product: TGetProductsOutputById;
	closeMenu: () => void;
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: (error: Error) => void;
		onSettled?: () => void;
	};
};

export default function ProductCoreMenu({ product, closeMenu, callbacks }: ProductCoreMenuProps) {
	const {
		state,
		updateProduct: updateProductState,
		updateProductImageHolder,
	} = useProductCoreState({
		initialState: mapProductToCoreState(product),
	});

	const { mutate, isPending } = useMutation({
		mutationKey: ["update-product-core", product.id],
		mutationFn: async () => {
			let productImageUrl = state.imagemCapaUrl;

			if (state.imagemCapaHolder.file) {
				const { url } = await uploadFile({
					file: state.imagemCapaHolder.file,
					fileName: state.nome || "produto",
					prefix: "syncrono",
				});
				productImageUrl = url;
			}

			return updateProduct({
				productId: product.id,
				product: {
					nome: state.nome,
					descricao: state.descricao,
					codigo: state.codigo,
					unidade: state.unidade,
					ncm: state.ncm,
					tipo: state.tipo,
					grupo: state.grupo,
					imagemCapaUrl: productImageUrl,
					precoCusto: state.precoCusto,
					precoVenda: state.precoVenda,
					quantidade: state.quantidade,
					rastreamentoEstoqueAtivo: state.rastreamentoEstoqueAtivo,
				},
				productVariants: [],
				productAddOns: [],
				productFiscalProfiles: [],
			});
		},
		onMutate: () => {
			callbacks?.onMutate?.();
		},
		onSuccess: (data) => {
			callbacks?.onSuccess?.();
			toast.success(data.message);
			closeMenu();
		},
		onError: (error) => {
			callbacks?.onError?.(error);
			toast.error(getErrorMessage(error));
		},
		onSettled: () => {
			callbacks?.onSettled?.();
		},
	});

	return (
		<ResponsiveMenu
			menuTitle="EDITAR PRODUTO"
			menuDescription="Atualize as informações gerais, preços e estoque do produto."
			menuActionButtonText="SALVAR"
			menuCancelButtonText="CANCELAR"
			actionFunction={() => mutate()}
			actionIsLoading={isPending}
			stateIsLoading={false}
			stateError={null}
			closeMenu={closeMenu}
		>
			<ProductStateGeneralBlock
				product={state}
				updateProduct={updateProductState}
				updateProductImageHolder={updateProductImageHolder}
				showPricing={false}
			/>
			<ProductStateStockBlock product={state} updateProduct={updateProductState} showPricing />
		</ResponsiveMenu>
	);
}
