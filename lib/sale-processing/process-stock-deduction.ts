import { DBTransaction } from "@/services/drizzle";
import { productStockTransactions, productVariants, products } from "@/services/drizzle/schema";
import type { TSaleItemEntity } from "@/services/drizzle/schema/sales";
import { and, eq, sql } from "drizzle-orm";
import createHttpError from "http-errors";

type SaleItemForStock = TSaleItemEntity & {
	adicionais?: {
		id: string;
		opcaoId: string | null;
		quantidade: number;
	}[];
};

type ProcessStockDeductionParams = {
	organizationId: string;
	saleId: string;
	saleItems: SaleItemForStock[];
	saleAuthorId: string;
};

export async function processStockDeduction(tx: DBTransaction, params: ProcessStockDeductionParams) {
	const mainProductIds = [...new Set(params.saleItems.map((item) => item.produtoId))];
	const mainVariantIds = [...new Set(params.saleItems.filter((item) => !!item.produtoVarianteId).map((item) => item.produtoVarianteId as string))];
	const optionIds = [
		...new Set(
			params.saleItems
				.flatMap((item) => item.adicionais ?? [])
				.map((modifier) => modifier.opcaoId)
				.filter((id): id is string => !!id),
		),
	];

	const addOnOptions =
		optionIds.length > 0
			? await tx.query.productAddOnOptions.findMany({
					where: (fields, { and, eq, inArray }) =>
						and(inArray(fields.id, optionIds), eq(fields.organizacaoId, params.organizationId), eq(fields.ativo, true)),
					columns: {
						id: true,
						nome: true,
						produtoId: true,
						produtoVarianteId: true,
						quantidadeConsumo: true,
					},
					with: {
						produtoVariante: {
							columns: {
								id: true,
								produtoId: true,
							},
						},
					},
				})
			: [];

	const optionMap = new Map(addOnOptions.map((option) => [option.id, option]));
	const addOnProductIds = addOnOptions.map((option) => option.produtoId ?? option.produtoVariante?.produtoId).filter((id): id is string => !!id);
	const addOnVariantIds = addOnOptions.map((option) => option.produtoVarianteId).filter((id): id is string => !!id);

	const productIds = [...new Set([...mainProductIds, ...addOnProductIds])];
	const variantIds = [...new Set([...mainVariantIds, ...addOnVariantIds])];

	const [productsResult, variantsResult] = await Promise.all([
		productIds.length > 0
			? tx.query.products.findMany({
					where: (fields, { and, eq, inArray }) =>
						and(inArray(fields.id, productIds), eq(fields.organizacaoId, params.organizationId), eq(fields.ativo, true)),
					columns: {
						id: true,
						descricao: true,
						quantidade: true,
						precoCusto: true,
						rastreamentoEstoqueAtivo: true,
					},
				})
			: [],
		variantIds.length > 0
			? tx.query.productVariants.findMany({
					where: (fields, { and, eq, inArray }) =>
						and(inArray(fields.id, variantIds), eq(fields.organizacaoId, params.organizationId), eq(fields.ativo, true)),
					columns: {
						id: true,
						produtoId: true,
						nome: true,
						quantidade: true,
						precoCusto: true,
						rastreamentoEstoqueAtivo: true,
					},
				})
			: [],
	]);

	const productsMap = new Map(productsResult.map((product) => [product.id, product]));
	const variantsMap = new Map(variantsResult.map((variant) => [variant.id, variant]));

	async function deductProduct({
		productId,
		quantity,
		saleItemId,
		reason,
	}: {
		productId: string;
		quantity: number;
		saleItemId: string;
		reason: string;
	}) {
		const product = productsMap.get(productId);
		if (!product) throw new createHttpError.NotFound("Produto nao encontrado.");
		if (!product.rastreamentoEstoqueAtivo) return;

		const currentQuantity = product.quantidade ?? 0;
		if (currentQuantity <= 0) throw new createHttpError.BadRequest("Produto nao possui estoque.");
		if (currentQuantity - quantity < 0) {
			throw new createHttpError.BadRequest(`Quantidade de estoque insuficiente para o produto ${product.descricao}.`);
		}

		const nextQuantity = currentQuantity - quantity;
		await tx.insert(productStockTransactions).values({
			organizacaoId: params.organizationId,
			produtoId: productId,
			produtoVarianteId: null,
			tipo: "SAIDA",
			quantidade: quantity,
			saldoAnterior: currentQuantity,
			saldoPosterior: nextQuantity,
			motivo: reason,
			vendaId: params.saleId,
			vendaItemId: saleItemId,
			operadorId: params.saleAuthorId,
		});
		await tx
			.update(products)
			.set({ quantidade: sql`${products.quantidade} - ${quantity}` })
			.where(and(eq(products.id, productId), eq(products.organizacaoId, params.organizationId)));

		product.quantidade = nextQuantity;
		productsMap.set(product.id, product);
	}

	async function deductVariant({
		variantId,
		quantity,
		saleItemId,
		reason,
	}: {
		variantId: string;
		quantity: number;
		saleItemId: string;
		reason: string;
	}) {
		const variant = variantsMap.get(variantId);
		if (!variant) throw new createHttpError.NotFound("Variante de produto nao encontrada.");
		if (!variant.rastreamentoEstoqueAtivo) return;

		const currentQuantity = variant.quantidade ?? 0;
		if (currentQuantity <= 0) throw new createHttpError.BadRequest("Variante de produto nao possui estoque.");
		if (currentQuantity - quantity < 0) {
			throw new createHttpError.BadRequest(`Quantidade de estoque insuficiente para a venda do produto ${variant.nome}.`);
		}

		const nextQuantity = currentQuantity - quantity;
		await tx.insert(productStockTransactions).values({
			organizacaoId: params.organizationId,
			produtoId: variant.produtoId,
			produtoVarianteId: variantId,
			tipo: "SAIDA",
			quantidade: quantity,
			saldoAnterior: currentQuantity,
			saldoPosterior: nextQuantity,
			motivo: reason,
			vendaId: params.saleId,
			vendaItemId: saleItemId,
			operadorId: params.saleAuthorId,
		});
		await tx
			.update(productVariants)
			.set({ quantidade: sql`${productVariants.quantidade} - ${quantity}` })
			.where(and(eq(productVariants.id, variantId), eq(productVariants.organizacaoId, params.organizationId)));

		variant.quantidade = nextQuantity;
		variantsMap.set(variant.id, variant);
	}

	for (const item of params.saleItems) {
		if (item.produtoVarianteId) {
			await deductVariant({
				variantId: item.produtoVarianteId,
				quantity: item.quantidade,
				saleItemId: item.id,
				reason: "Venda confirmada",
			});
		} else {
			await deductProduct({
				productId: item.produtoId,
				quantity: item.quantidade,
				saleItemId: item.id,
				reason: "Venda confirmada",
			});
		}

		for (const modifier of item.adicionais ?? []) {
			if (!modifier.opcaoId) continue;
			const option = optionMap.get(modifier.opcaoId);
			if (!option) continue;

			const quantity = item.quantidade * modifier.quantidade * option.quantidadeConsumo;
			if (quantity <= 0) continue;

			if (option.produtoVarianteId) {
				await deductVariant({
					variantId: option.produtoVarianteId,
					quantity,
					saleItemId: item.id,
					reason: `Adicional vendido: ${option.nome}`,
				});
				continue;
			}

			if (option.produtoId) {
				await deductProduct({
					productId: option.produtoId,
					quantity,
					saleItemId: item.id,
					reason: `Adicional vendido: ${option.nome}`,
				});
			}
		}
	}

	return { success: true };
}
