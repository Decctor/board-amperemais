import type { TGetProductsOutputById, TUpdateProductInput } from "@/app/api/products/route";
import ProductStateOptionsBlock from "@/components/Modals/Products/Blocks/Options";
import ProductStateVariantsBlock from "@/components/Modals/Products/Blocks/Variants";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { getErrorMessage } from "@/lib/errors";
import { updateProduct } from "@/lib/mutations/products";
import { type TProductState, useProductState } from "@/state-hooks/use-product-state";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

type ManageVariationsProps = {
	product: TGetProductsOutputById;
	closeMenu: () => void;
	callbacks: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: (error: Error) => void;
		onSettled?: () => void;
	};
};

// Reaproveita o estado/UX de cadastro: hidrata o produto persistido (eixos + variantes com suas
// combinações) usando os ids reais como referenciaId, para que a geração de matriz reconcilie as
// variantes existentes por assinatura e preserve preço/estoque já ajustados.
function hydrateProductState(product: TGetProductsOutputById): Partial<TProductState> {
	return {
		productOptions: product.opcoes.map((opcao) => ({
			referenciaId: opcao.id,
			id: opcao.id,
			nome: opcao.nome,
			tipo: opcao.tipo,
			ordem: opcao.ordem,
			valores: opcao.valores.map((valor) => ({
				referenciaId: valor.id,
				id: valor.id,
				nome: valor.nome,
				valorAuxiliar: valor.valorAuxiliar,
				imagemCapaUrl: valor.imagemCapaUrl,
				ordem: valor.ordem,
			})),
		})),
		productVariants: product.variantes.map((variant) => ({
			id: variant.id,
			nome: variant.nome,
			codigo: variant.codigo ?? "",
			precoCusto: variant.precoCusto ?? 0,
			precoVenda: variant.precoVenda,
			quantidade: variant.quantidade ?? 0,
			ativo: variant.ativo ?? true,
			rastreamentoEstoqueAtivo: variant.rastreamentoEstoqueAtivo ?? false,
			imagemCapaUrl: variant.imagemCapaUrl,
			imagemCapaHolder: { file: null, previewUrl: variant.imagemCapaUrl },
			perfisFiscais: [],
			addOns: [],
			opcoesValores: variant.valoresOpcoes.map((assignment) => ({
				id: assignment.id,
				opcaoReferenciaId: assignment.opcaoId,
				valorReferenciaId: assignment.opcaoValorId,
				opcaoId: assignment.opcaoId,
				opcaoValorId: assignment.opcaoValorId,
			})),
		})),
	} as Partial<TProductState>;
}

export default function ManageVariations({ product, closeMenu, callbacks }: ManageVariationsProps) {
	const {
		state,
		addProductVariant,
		updateProductVariant,
		updateProductVariantImageHolder,
		removeProductVariant,
		addProductOption,
		updateProductOption,
		removeProductOption,
		addProductOptionValue,
		updateProductOptionValue,
		removeProductOptionValue,
		generateVariantMatrix,
	} = useProductState({ initialState: hydrateProductState(product) });

	function buildUpdateInput(): TUpdateProductInput {
		return {
			productId: product.id,
			product: {
				nome: product.nome,
				descricao: product.descricao,
				imagemCapaUrl: product.imagemCapaUrl,
				codigo: product.codigo,
				unidade: product.unidade,
				ncm: product.ncm,
				tipo: product.tipo,
				grupo: product.grupo,
				rastreamentoEstoqueAtivo: product.rastreamentoEstoqueAtivo ?? false,
				quantidade: product.quantidade,
				precoVenda: product.precoVenda,
				precoCusto: product.precoCusto,
			},
			productOptions: state.productOptions.map((option) => ({
				referenciaId: option.referenciaId,
				id: option.id,
				nome: option.nome,
				tipo: option.tipo,
				ordem: option.ordem,
				deletar: option.deletar,
				valores: option.valores.map((value) => ({
					referenciaId: value.referenciaId,
					id: value.id,
					nome: value.nome,
					valorAuxiliar: value.valorAuxiliar ?? null,
					imagemCapaUrl: value.imagemCapaUrl ?? null,
					ordem: value.ordem,
					deletar: value.deletar,
				})),
			})),
			productVariants: state.productVariants.map((variant) => ({
				id: variant.id,
				nome: variant.nome,
				codigo: variant.codigo,
				imagemCapaUrl: variant.imagemCapaUrl ?? null,
				precoVenda: variant.precoVenda,
				precoCusto: variant.precoCusto,
				quantidade: variant.quantidade,
				ativo: variant.ativo,
				rastreamentoEstoqueAtivo: variant.rastreamentoEstoqueAtivo,
				deletar: variant.deletar,
				addOns: [],
				perfisFiscais: [],
				opcoesValores: (variant.opcoesValores ?? []).map((ref) => ({
					opcaoReferenciaId: ref.opcaoReferenciaId,
					valorReferenciaId: ref.valorReferenciaId,
					id: ref.id,
					opcaoId: ref.opcaoId,
					opcaoValorId: ref.opcaoValorId,
					deletar: ref.deletar,
				})),
			})),
			productAddOns: [],
			productFiscalProfiles: [],
		};
	}

	const { mutate, isPending } = useMutation({
		mutationKey: ["manage-product-variations", product.id],
		mutationFn: () => updateProduct(buildUpdateInput()),
		onMutate: () => callbacks.onMutate?.(),
		onSuccess: (data) => {
			callbacks.onSuccess?.();
			toast.success(data.message);
			closeMenu();
		},
		onError: (error) => {
			callbacks.onError?.(error as Error);
			toast.error(getErrorMessage(error));
		},
		onSettled: () => callbacks.onSettled?.(),
	});

	return (
		<ResponsiveMenu
			menuTitle="GERENCIAR VARIAÇÕES"
			menuDescription="Defina eixos como tamanho e cor, gere a matriz de variantes e salve tudo de uma vez."
			menuActionButtonText="SALVAR VARIAÇÕES"
			menuCancelButtonText="CANCELAR"
			closeMenu={closeMenu}
			actionFunction={() => mutate()}
			actionIsLoading={isPending}
			stateIsLoading={false}
			stateError={null}
			dialogVariant="md"
		>
			<ProductStateOptionsBlock
				options={state.productOptions}
				variants={state.productVariants}
				addProductOption={addProductOption}
				updateProductOption={updateProductOption}
				removeProductOption={removeProductOption}
				addProductOptionValue={addProductOptionValue}
				updateProductOptionValue={updateProductOptionValue}
				removeProductOptionValue={removeProductOptionValue}
				generateVariantMatrix={generateVariantMatrix}
				baseDefaults={{ precoVenda: product.precoVenda, precoCusto: product.precoCusto }}
			/>
			<ProductStateVariantsBlock
				variants={state.productVariants}
				options={state.productOptions}
				addVariant={addProductVariant}
				updateVariant={updateProductVariant}
				updateVariantImageHolder={updateProductVariantImageHolder}
				removeVariant={removeProductVariant}
			/>
		</ResponsiveMenu>
	);
}
