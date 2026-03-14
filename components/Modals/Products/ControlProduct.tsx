import type { TAuthUserSession } from "@/lib/authentication/types";
import { getErrorMessage } from "@/lib/errors";
import { uploadFile } from "@/lib/files-storage";
import { updateProduct } from "@/lib/mutations/products";
import { useProductById } from "@/lib/queries/products";
import type { TUpdateProductInput } from "@/pages/api/products";
import { type TProductState, useProductState } from "@/state-hooks/use-product-state";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import ProductAddOnsBlock from "./Blocks/AddOns";
import ProductGeneralBlock from "./Blocks/General";
import ProductStockBlock from "./Blocks/Stock";
import ProductVariantsBlock from "./Blocks/Variants";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";

type ControlProductProps = {
	productId: string;
	user: TAuthUserSession["user"];
	closeModal: () => void;
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: () => void;
		onSettled?: () => void;
	};
};
export default function ControlProduct({ productId, user: _user, closeModal, callbacks }: ControlProductProps) {
	const queryClient = useQueryClient();

	const { data: product, queryKey, isLoading, error } = useProductById({ id: productId });
	const {
		state,
		updateProduct: updateProductState,
		updateProductImageHolder,
		addProductVariant,
		updateProductVariant,
		updateProductVariantImageHolder,
		removeProductVariant,
		addProductAddOn,
		updateProductAddOn,
		removeProductAddOn,
		addProductAddOnOption,
		updateProductAddOnOption,
		removeProductAddOnOption,
		resetState,
	} = useProductState({});

	useEffect(() => {
		if (product) {
			resetState(product);
		}
	}, [product, resetState]);

	async function handleUpdateProduct(state: TProductState) {
		let productImageUrl = state.product.imagemCapaUrl;
		if (state.product.imagemCapaHolder.file) {
			const { url } = await uploadFile({
				file: state.product.imagemCapaHolder.file,
				fileName: state.product.descricao || "produto",
				prefix: "syncrono",
			});
			productImageUrl = url;
		}

		const processedVariants: TUpdateProductInput["productVariants"] = [];
		for (const variant of state.productVariants) {
			if (variant.deletar && !variant.id) continue;

			let variantImageUrl = variant.imagemCapaUrl;
			if (variant.imagemCapaHolder.file) {
				const { url } = await uploadFile({
					file: variant.imagemCapaHolder.file,
					fileName: variant.nome || "variante",
					prefix: "syncrono",
				});
				variantImageUrl = url;
			}

			processedVariants.push({
				id: variant.id,
				deletar: variant.deletar,
				nome: variant.nome,
				codigo: variant.codigo,
				imagemCapaUrl: variantImageUrl,
				precoVenda: variant.precoVenda,
				precoCusto: variant.precoCusto,
				quantidade: variant.quantidade,
				rastreamentoEstoqueAtivo: variant.rastreamentoEstoqueAtivo,
				ativo: variant.ativo,
				addOns: variant.addOns
					.filter((addOn) => !(addOn.deletar && !addOn.id))
					.map((addOn) => ({
						id: addOn.id,
						deletar: addOn.deletar,
						nome: addOn.nome,
						internoNome: addOn.internoNome,
						minOpcoes: addOn.minOpcoes,
						maxOpcoes: addOn.maxOpcoes,
						ativo: addOn.ativo,
						opcoes: addOn.opcoes.filter((option) => !(option.deletar && !option.id)),
					})),
			});
		}

		const processedAddOns: TUpdateProductInput["productAddOns"] = state.productAddOns
			.filter((addOn) => !(addOn.deletar && !addOn.id))
			.map((addOn) => ({
				id: addOn.id,
				deletar: addOn.deletar,
				nome: addOn.nome,
				internoNome: addOn.internoNome,
				minOpcoes: addOn.minOpcoes,
				maxOpcoes: addOn.maxOpcoes,
				ativo: addOn.ativo,
				opcoes: addOn.opcoes.filter((option) => !(option.deletar && !option.id)),
			}));

		const input: TUpdateProductInput = {
			productId,
			product: {
				descricao: state.product.descricao,
				codigo: state.product.codigo,
				unidade: state.product.unidade,
				ncm: state.product.ncm,
				tipo: state.product.tipo,
				grupo: state.product.grupo,
				imagemCapaUrl: productImageUrl,
				precoVenda: state.product.precoVenda,
				precoCusto: state.product.precoCusto,
				quantidade: state.product.quantidade,
				rastreamentoEstoqueAtivo: state.product.rastreamentoEstoqueAtivo,
			},
			productVariants: processedVariants,
			productAddOns: processedAddOns,
		};

		return await updateProduct(input);
	}

	const { mutate, isPending } = useMutation({
		mutationKey: ["update-product"],
		mutationFn: handleUpdateProduct,
		onMutate: async () => {
			await queryClient.cancelQueries({ queryKey });
			if (callbacks?.onMutate) callbacks.onMutate();
			return;
		},
		onSuccess: async (data) => {
			if (callbacks?.onSuccess) callbacks.onSuccess();
			closeModal();
			return toast.success(data.message);
		},
		onError: async (error) => {
			if (callbacks?.onError) callbacks.onError();
			return toast.error(getErrorMessage(error));
		},
		onSettled: async () => {
			if (callbacks?.onSettled) callbacks.onSettled();
			await queryClient.invalidateQueries({ queryKey });
			await queryClient.invalidateQueries({ queryKey: ["products"] });
			return;
		},
	});

	return (
		<ResponsiveMenu
			menuTitle="EDITAR PRODUTO"
			menuDescription="Preencha os campos abaixo para atualizar o produto"
			menuActionButtonText="ATUALIZAR PRODUTO"
			menuCancelButtonText="CANCELAR"
			actionFunction={() => mutate(state)}
			actionIsLoading={isPending || isLoading}
			stateIsLoading={isLoading}
			stateError={error ? getErrorMessage(error) : null}
			closeMenu={closeModal}
			dialogVariant="md"
		>
			<ProductGeneralBlock
				product={state.product}
				updateProduct={updateProductState}
				updateProductImageHolder={updateProductImageHolder}
			/>
			<ProductStockBlock product={state.product} updateProduct={updateProductState} />
			<ProductVariantsBlock
				variants={state.productVariants}
				addVariant={addProductVariant}
				updateVariant={updateProductVariant}
				removeVariant={removeProductVariant}
				updateVariantImageHolder={updateProductVariantImageHolder}
			/>
			<ProductAddOnsBlock
				addOns={state.productAddOns}
				addProductAddOn={addProductAddOn}
				updateProductAddOn={updateProductAddOn}
				removeProductAddOn={removeProductAddOn}
				addProductAddOnOption={addProductAddOnOption}
				updateProductAddOnOption={updateProductAddOnOption}
				removeProductAddOnOption={removeProductAddOnOption}
			/>
		</ResponsiveMenu>
	);
}
