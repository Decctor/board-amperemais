import type { TGetProductsOutputById, TUpdateProductInput } from "@/app/api/products/route";
import { uploadFile } from "@/lib/files-storage";
import type { TProductState } from "@/state-hooks/use-product-state";

export function mergeProductStateFromHydration(partial: Partial<TProductState>): TProductState {
	return {
		product: {
			vendavel: partial.product?.vendavel ?? true,
			codigo: partial.product?.codigo ?? "",
			nome: partial.product?.nome ?? "",
			descricao: partial.product?.descricao ?? null,
			unidade: partial.product?.unidade ?? "",
			ncm: partial.product?.ncm ?? "",
			tipo: partial.product?.tipo ?? "",
			grupo: partial.product?.grupo ?? "",
			rastreamentoEstoqueAtivo: partial.product?.rastreamentoEstoqueAtivo ?? false,
			imagemCapaUrl: partial.product?.imagemCapaUrl ?? null,
			precoVenda: partial.product?.precoVenda ?? 0,
			precoCusto: partial.product?.precoCusto ?? 0,
			quantidade: partial.product?.quantidade ?? 0,
			imagemCapaHolder: {
				file: partial.product?.imagemCapaHolder?.file ?? null,
				previewUrl: partial.product?.imagemCapaHolder?.previewUrl ?? null,
			},
		},
		productFiscalProfiles: partial.productFiscalProfiles ?? [],
		productVariants: partial.productVariants ?? [],
		productOptions: partial.productOptions ?? [],
		productAddOns: partial.productAddOns ?? [],
	};
}

export function hydrateVariationsState(product: TGetProductsOutputById): Partial<TProductState> {
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
	};
}

export function hydrateAddOnsState(product: TGetProductsOutputById): Partial<TProductState> {
	return {
		productAddOns: product.addOnsReferencias.map((ref) => ({
			id: ref.grupo.id,
			nome: ref.grupo.nome,
			internoNome: ref.grupo.internoNome ?? "",
			minOpcoes: ref.grupo.minOpcoes ?? 0,
			maxOpcoes: ref.grupo.maxOpcoes ?? 1,
			ativo: ref.grupo.ativo ?? true,
			opcoes: ref.grupo.opcoes.map((opcao) => ({
				id: opcao.id,
				nome: opcao.nome,
				codigo: opcao.codigo ?? "",
				ativo: opcao.ativo ?? true,
				produtoId: opcao.produtoId ?? null,
				produtoVarianteId: opcao.produtoVarianteId ?? null,
				produtoConsumo: opcao.produtoVariante?.nome ?? opcao.produto?.nome ?? null,
				quantidadeConsumo: opcao.quantidadeConsumo ?? 1,
				precoDelta: opcao.precoDelta ?? 0,
				maxQtdePorItem: opcao.maxQtdePorItem ?? 1,
			})),
		})),
	};
}

export function buildProductMetadata(product: TGetProductsOutputById): TUpdateProductInput["product"] {
	return {
		vendavel: product.vendavel,
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
	};
}

export async function processVariantImages(variants: TProductState["productVariants"]): Promise<TProductState["productVariants"]> {
	const processed: TProductState["productVariants"] = [];

	for (const variant of variants) {
		let imagemCapaUrl = variant.imagemCapaUrl;
		if (variant.imagemCapaHolder.file) {
			const { url } = await uploadFile({
				file: variant.imagemCapaHolder.file,
				fileName: variant.nome || "variante",
				prefix: "syncrono",
			});
			imagemCapaUrl = url;
		}

		processed.push({
			...variant,
			imagemCapaUrl,
			imagemCapaHolder: { file: null, previewUrl: imagemCapaUrl },
		});
	}

	return processed;
}

export function buildVariationsUpdateInput(
	product: TGetProductsOutputById,
	state: Pick<TProductState, "productOptions" | "productVariants">,
): TUpdateProductInput {
	return {
		productId: product.id,
		product: buildProductMetadata(product),
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

export function buildAddOnsUpdateInput(product: TGetProductsOutputById, state: Pick<TProductState, "productAddOns">): TUpdateProductInput {
	return {
		productId: product.id,
		product: buildProductMetadata(product),
		productOptions: [],
		productVariants: [],
		productAddOns: state.productAddOns.map((addOn) => ({
			id: addOn.id,
			nome: addOn.nome,
			internoNome: addOn.internoNome,
			minOpcoes: addOn.minOpcoes,
			maxOpcoes: addOn.maxOpcoes,
			ativo: addOn.ativo,
			deletar: addOn.deletar,
			opcoes: addOn.opcoes.map((option) => ({
				id: option.id,
				nome: option.nome,
				codigo: option.codigo,
				precoDelta: option.precoDelta,
				maxQtdePorItem: option.maxQtdePorItem,
				ativo: option.ativo,
				produtoId: option.produtoId ?? null,
				produtoVarianteId: option.produtoVarianteId ?? null,
				produtoConsumo: option.produtoConsumo ?? null,
				quantidadeConsumo: option.quantidadeConsumo ?? 1,
				deletar: option.deletar,
			})),
		})),
		productFiscalProfiles: [],
	};
}

export function validateVariationsState(state: Pick<TProductState, "productOptions" | "productVariants">): string | null {
	for (const option of state.productOptions) {
		if (option.deletar) continue;
		if (!option.nome.trim()) return "Informe o nome de todos os eixos de variação.";
		for (const value of option.valores) {
			if (value.deletar) continue;
			if (!value.nome.trim()) return "Informe o nome de todos os valores de variação.";
		}
	}

	for (const variant of state.productVariants) {
		if (variant.deletar) continue;
		if (!variant.nome.trim()) return "Informe o nome de todas as variantes.";
	}

	return null;
}

export function validateAddOnsState(state: Pick<TProductState, "productAddOns">): string | null {
	for (const addOn of state.productAddOns) {
		if (addOn.deletar) continue;
		if (!addOn.nome.trim()) return "Informe o nome de todos os grupos de adicionais.";
		if ((addOn.maxOpcoes ?? 1) < (addOn.minOpcoes ?? 0)) {
			return `Grupo "${addOn.nome}": o máximo de opções deve ser maior ou igual ao mínimo.`;
		}
		for (const option of addOn.opcoes) {
			if (option.deletar) continue;
			if (!option.nome.trim()) return "Informe o nome de todas as opções de adicionais.";
		}
	}

	return null;
}
