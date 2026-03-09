import { DBTransaction } from "@/services/drizzle";
import {
  productStockTransactions,
  productVariants,
  products,
} from "@/services/drizzle/schema";
import type { TSaleItemEntity } from "@/services/drizzle/schema/sales";
import { and, eq, sql } from "drizzle-orm";
import createHttpError from "http-errors";

type ProcessStockDeductionParams = {
  organizationId: string;
  saleId: string;
  saleItems: TSaleItemEntity[];

  saleAuthorId: string;
};

/**
 * Creates SAIDA stock transaction records for each sale item.
 * Links each transaction to the sale and sale item for traceability.
 */
export async function processStockDeduction(
  tx: DBTransaction,
  params: ProcessStockDeductionParams,
) {
  const productIds = [...new Set(params.saleItems.map((item) => item.produtoId))];
  const variantIds = [
    ...new Set(
      params.saleItems
        .filter((item) => !!item.produtoVarianteId)
        .map((item) => item.produtoVarianteId as string),
    ),
  ];

  const [productsResult, variantsResult] = await Promise.all([
    productIds.length > 0
      ? tx.query.products.findMany({
          where: (fields, { and, eq, inArray }) =>
            and(
              inArray(fields.id, productIds),
              eq(fields.organizacaoId, params.organizationId),
              eq(fields.ativo, true),
            ),
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
            and(
              inArray(fields.id, variantIds),
              eq(fields.organizacaoId, params.organizationId),
              eq(fields.ativo, true),
            ),
          columns: {
            id: true,
            nome: true,
            quantidade: true,
            precoCusto: true,
            rastreamentoEstoqueAtivo: true,
          },
        })
      : [],
  ]);

  const productsMap = new Map(productsResult.map((p) => [p.id, p]));
  const variantsMap = new Map(variantsResult.map((v) => [v.id, v]));
  for (const item of params.saleItems) {
    // Two possible paths:
    // 1) Item is a variant
    // 2) Item is a base product

    // Handling path 1)
    if (item.produtoVarianteId) {
      const variant = variantsMap.get(item.produtoVarianteId);
      if (!variant) throw new createHttpError.NotFound("Variante de produto não encontrada.");

      // Checking if variant allows stock tracking
      const allowsStockTracking = variant.rastreamentoEstoqueAtivo;
      if (!allowsStockTracking) continue;

      const variantQuantity = variant.quantidade;
      // Checking if operation is valid (wouldt result in negative stock)
      if (!variantQuantity)
        throw new createHttpError.BadRequest("Variante de produto não possui estoque.");

      if (variantQuantity - item.quantidade < 0)
        throw new createHttpError.BadRequest(
          `Quantidade de estoque insuficiente para a venda do produto ${variant.nome}.`,
        );
      const variantNewQuantity = variantQuantity - item.quantidade;

      // If variant allows stock tracking, we should:
      // 1) Insert the stock transaction for the variant
      // 2) Deduct the quantity from the variant stock

      // Handling 1)
      await tx.insert(productStockTransactions).values({
        organizacaoId: params.organizationId,
        produtoId: item.produtoId, // Even tought is a variant, the productId here is obligatory. We will know where is variant/base product by the existice of the variant id.
        produtoVarianteId: item.produtoVarianteId,
        tipo: "SAIDA" as const,
        quantidade: item.quantidade,
        saldoAnterior: variantQuantity,
        saldoPosterior: variantNewQuantity,
        motivo: "Venda confirmada",
        vendaId: params.saleId,
        vendaItemId: item.id,
        operadorId: params.saleAuthorId,
      });
      // Handling 2)
      await tx
        .update(productVariants)
        .set({
          quantidade: sql`${productVariants.quantidade} - ${item.quantidade}`,
        })
        .where(
          and(
            eq(productVariants.id, item.produtoVarianteId),
            eq(productVariants.organizacaoId, params.organizationId),
          ),
        );
      variant.quantidade = variantNewQuantity;
      variantsMap.set(variant.id, variant);
    } else {
      // Handling path 2)
      const baseProduct = productsMap.get(item.produtoId);
      if (!baseProduct) throw new createHttpError.NotFound("Produto não encontrado.");

      // Checking if base product allows stock tracking
      const allowsStockTracking = baseProduct.rastreamentoEstoqueAtivo;
      if (!allowsStockTracking) continue;

      const baseProductQuantity = baseProduct.quantidade;
      // Checking if operation is valid (wouldt result in negative stock)

      if (!baseProductQuantity) throw new createHttpError.BadRequest("Produto não possui estoque.");
      if (baseProductQuantity - item.quantidade < 0)
        throw new createHttpError.BadRequest(
          `Quantidade de estoque insuficiente para o produto ${baseProduct.descricao}.`,
        );
      const baseProductNewQuantity = baseProductQuantity - item.quantidade;

      // If base product allows stock tracking, we should:
      // 1) Insert the stock transaction for the variant
      // 2) Deduct the quantity from the variant stock

      // Handling 1)
      await tx.insert(productStockTransactions).values({
        organizacaoId: params.organizationId,
        produtoId: item.produtoId,
        produtoVarianteId: null,
        tipo: "SAIDA" as const,
        quantidade: item.quantidade,
        saldoAnterior: baseProductQuantity,
        saldoPosterior: baseProductNewQuantity,
        motivo: "Venda confirmada",
        vendaId: params.saleId,
        vendaItemId: item.id,
        operadorId: params.saleAuthorId,
      });
      // Handling 2)
      await tx
        .update(products)
        .set({
          quantidade: sql`${products.quantidade} - ${item.quantidade}`,
        })
        .where(
          and(eq(products.id, item.produtoId), eq(products.organizacaoId, params.organizationId)),
        );
      baseProduct.quantidade = baseProductNewQuantity;
      productsMap.set(baseProduct.id, baseProduct);
    }
  }

  return { success: true };
}
