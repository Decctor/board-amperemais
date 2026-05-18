import { getErrorMessage } from "@/lib/errors";
import { uploadFile } from "@/lib/files-storage";
import { updateProduct } from "@/lib/mutations/products";
import type { TUpdateProductInput } from "@/app/api/products/route";
import type { TProductState } from "@/state-hooks/use-product-state";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export async function buildUpdateProductInput({
	productId,
	state,
}: {
	productId: string;
	state: TProductState;
}): Promise<TUpdateProductInput> {
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

	return {
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
}

type UseProductUpdateParams = {
	productId: string;
	queryKey: readonly unknown[];
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: () => void;
		onSettled?: () => void;
	};
};

export function useProductUpdate({ productId, queryKey, callbacks }: UseProductUpdateParams) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: ["update-product", productId],
		mutationFn: async (state: TProductState) => {
			const input = await buildUpdateProductInput({ productId, state });
			return await updateProduct(input);
		},
		onMutate: async () => {
			await queryClient.cancelQueries({ queryKey });
			callbacks?.onMutate?.();
		},
		onSuccess: async (data) => {
			callbacks?.onSuccess?.();
			toast.success(data.message);
		},
		onError: (error) => {
			callbacks?.onError?.();
			toast.error(getErrorMessage(error));
		},
		onSettled: async () => {
			callbacks?.onSettled?.();
			await queryClient.invalidateQueries({ queryKey });
			await queryClient.invalidateQueries({ queryKey: ["product-by-id", productId] });
			await queryClient.invalidateQueries({ queryKey: ["products"] });
			await queryClient.invalidateQueries({ queryKey: ["product-stats", productId] });
		},
	});
}
