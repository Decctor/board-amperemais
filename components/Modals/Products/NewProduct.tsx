import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getErrorMessage } from "@/lib/errors";
import { uploadFile } from "@/lib/files-storage";
import { createProduct } from "@/lib/mutations/products";
import type { TCreateProductInput } from "@/pages/api/products";
import { type TProductState, useProductState } from "@/state-hooks/use-product-state";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import ProductAddOnsBlock from "./Blocks/AddOns";
import ProductGeneralBlock from "./Blocks/General";
import ProductVariantsBlock from "./Blocks/Variants";

type NewProductProps = {
	user: TAuthUserSession["user"];
	closeModal: () => void;
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: () => void;
		onSettled?: () => void;
	};
};
export default function NewProduct({ user, closeModal, callbacks }: NewProductProps) {
	const {
		state,
		updateProduct,
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

	async function handleCreateProduct(state: TProductState) {
		// 1. Upload product cover image if exists
		let productImageUrl = state.product.imagemCapaUrl;
		if (state.product.imagemCapaHolder.file) {
			const { url } = await uploadFile({
				file: state.product.imagemCapaHolder.file,
				fileName: state.product.descricao || "produto",
				prefix: "syncrono",
			});
			productImageUrl = url;
		}

		// 2. Process variants and upload their images
		const processedVariants: TCreateProductInput["productVariants"] = [];
		for (const variant of state.productVariants) {
			// Skip variants marked for deletion
			if (variant.deletar) continue;

			let variantImageUrl = variant.imagemCapaUrl;
			if (variant.imagemCapaHolder.file) {
				const { url } = await uploadFile({
					file: variant.imagemCapaHolder.file,
					fileName: variant.nome || "variante",
					prefix: "syncrono",
				});
				variantImageUrl = url;
			}

			// Process variant addOns (filter out deleted ones)
			const processedVariantAddOns = variant.addOns
				.filter((addOn) => !addOn.deletar)
				.map((addOn) => ({
					...addOn,
					opcoes: addOn.opcoes.filter((opt) => !opt.deletar),
				}));

			processedVariants.push({
				nome: variant.nome,
				codigo: variant.codigo,
				imagemCapaUrl: variantImageUrl,
				precoVenda: variant.precoVenda,
				precoCusto: variant.precoCusto,
				quantidade: variant.quantidade,
				ativo: variant.ativo,
				addOns: processedVariantAddOns,
			});
		}

		// 3. Process product addOns (filter out deleted ones)
		const processedAddOns: TCreateProductInput["productAddOns"] = state.productAddOns
			.filter((addOn) => !addOn.deletar)
			.map((addOn) => ({
				...addOn,
				opcoes: addOn.opcoes.filter((opt) => !opt.deletar),
			}));

		// 4. Build the input for the API
		const input: TCreateProductInput = {
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
			},
			productVariants: processedVariants,
			productAddOns: processedAddOns,
		};

		return await createProduct(input);
	}

	const { mutate, isPending } = useMutation({
		mutationKey: ["create-product"],
		mutationFn: handleCreateProduct,
		onMutate: async () => {
			if (callbacks?.onMutate) callbacks.onMutate();
		},
		onSuccess: async (data) => {
			if (callbacks?.onSuccess) callbacks.onSuccess();
			resetState({
				product: {
					codigo: "",
					descricao: "",
					unidade: "",
					ncm: "",
					tipo: "",
					grupo: "",
					imagemCapaHolder: { file: null, previewUrl: null },
				},
				productVariants: [],
				productAddOns: [],
			});
			toast.success(data.message);
			return closeModal();
		},
		onError: async (error) => {
			if (callbacks?.onError) callbacks.onError();
			toast.error(getErrorMessage(error));
		},
		onSettled: async () => {
			if (callbacks?.onSettled) callbacks.onSettled();
		},
	});

	return (
		<ResponsiveMenu
			menuTitle="NOVO PRODUTO"
			menuDescription="Preencha os campos abaixo para criar um novo produto"
			menuActionButtonText="CRIAR PRODUTO"
			menuCancelButtonText="CANCELAR"
			actionFunction={() => mutate(state)}
			actionIsLoading={isPending}
			stateIsLoading={false}
			stateError={null}
			closeMenu={closeModal}
			dialogVariant="md"
		>
			<ProductGeneralBlock product={state.product} updateProduct={updateProduct} updateProductImageHolder={updateProductImageHolder} />
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
