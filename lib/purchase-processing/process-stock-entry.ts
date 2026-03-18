import { DBTransaction } from "@/services/drizzle";
import {
  productStockTransactions,
  productVariants,
  products,
} from "@/services/drizzle/schema";
import type { TPurchaseItemEntity } from "@/services/drizzle/schema/purchases";
import { and, eq, sql } from "drizzle-orm";
import createHttpError from "http-errors";

type ProcessStockEntryParams = {
  organizationId: string;
  purchaseId: string;
  purchaseItems: TPurchaseItemEntity[];
  operatorId: string;
};

/**
 * Creates ENTRADA_AQUISICAO stock transaction records for each purchase item.
 * Also updates weighted average cost (custo médio ponderado) on product/variant.
 * Links each transaction to the purchase and purchase item for traceability.
 */
export async function processStockEntry(
  tx: DBTransaction,
  params: ProcessStockEntryParams,
) {
  const productIds = [...new Set(params.purchaseItems.map((item) => item.produtoId))];
  const variantIds = [
    ...new Set(
      params.purchaseItems
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

  for (const item of params.purchaseItems) {
    // Cost per internal unit: prefer valorTotalLiquido / quantidade for accuracy
    // (handles any supplier unit conversion already baked into the quantities)
    const custoUnitarioMovimentado =
      item.valorTotalLiquido != null
        ? item.valorTotalLiquido / item.quantidade
        : item.valorTotalBruto / item.quantidade;

    // Two possible paths:
    // 1) Item is a variant
    // 2) Item is a base product

    if (item.produtoVarianteId) {
      // Path 1: variant
      const variant = variantsMap.get(item.produtoVarianteId);
      if (!variant) throw new createHttpError.NotFound("Variante de produto não encontrada.");

      if (!variant.rastreamentoEstoqueAtivo) continue;

      const quantidadeAnterior = variant.quantidade ?? 0;
      const custoAnterior = variant.precoCusto ?? 0;
      const quantidadeNova = quantidadeAnterior + item.quantidade;

      // Weighted average cost (custo médio ponderado)
      const novoCustoMedio =
        quantidadeAnterior === 0
          ? custoUnitarioMovimentado
          : (quantidadeAnterior * custoAnterior + item.quantidade * custoUnitarioMovimentado) /
            quantidadeNova;

      // 1) Insert stock transaction
      await tx.insert(productStockTransactions).values({
        organizacaoId: params.organizationId,
        produtoId: item.produtoId,
        produtoVarianteId: item.produtoVarianteId,
        tipo: "ENTRADA_AQUISICAO" as const,
        quantidade: item.quantidade,
        saldoAnterior: quantidadeAnterior,
        saldoPosterior: quantidadeNova,
        custoUnitarioMovimentado,
        custoUnitarioAnterior: custoAnterior,
        custoUnitarioPosterior: novoCustoMedio,
        motivo: "Recebimento de compra",
        compraId: params.purchaseId,
        compraItemId: item.id,
        operadorId: params.operatorId,
      });

      // 2) Increment variant quantity and update average cost
      await tx
        .update(productVariants)
        .set({
          quantidade: sql`${productVariants.quantidade} + ${item.quantidade}`,
          precoCusto: novoCustoMedio,
        })
        .where(
          and(
            eq(productVariants.id, item.produtoVarianteId),
            eq(productVariants.organizacaoId, params.organizationId),
          ),
        );

      variant.quantidade = quantidadeNova;
      variant.precoCusto = novoCustoMedio;
      variantsMap.set(variant.id, variant);
    } else {
      // Path 2: base product
      const baseProduct = productsMap.get(item.produtoId);
      if (!baseProduct) throw new createHttpError.NotFound("Produto não encontrado.");

      if (!baseProduct.rastreamentoEstoqueAtivo) continue;

      const quantidadeAnterior = baseProduct.quantidade ?? 0;
      const custoAnterior = baseProduct.precoCusto ?? 0;
      const quantidadeNova = quantidadeAnterior + item.quantidade;

      // Weighted average cost (custo médio ponderado)
      const novoCustoMedio =
        quantidadeAnterior === 0
          ? custoUnitarioMovimentado
          : (quantidadeAnterior * custoAnterior + item.quantidade * custoUnitarioMovimentado) /
            quantidadeNova;

      // 1) Insert stock transaction
      await tx.insert(productStockTransactions).values({
        organizacaoId: params.organizationId,
        produtoId: item.produtoId,
        produtoVarianteId: null,
        tipo: "ENTRADA_AQUISICAO" as const,
        quantidade: item.quantidade,
        saldoAnterior: quantidadeAnterior,
        saldoPosterior: quantidadeNova,
        custoUnitarioMovimentado,
        custoUnitarioAnterior: custoAnterior,
        custoUnitarioPosterior: novoCustoMedio,
        motivo: "Recebimento de compra",
        compraId: params.purchaseId,
        compraItemId: item.id,
        operadorId: params.operatorId,
      });

      // 2) Increment product quantity and update average cost
      await tx
        .update(products)
        .set({
          quantidade: sql`${products.quantidade} + ${item.quantidade}`,
          precoCusto: novoCustoMedio,
        })
        .where(
          and(
            eq(products.id, item.produtoId),
            eq(products.organizacaoId, params.organizationId),
          ),
        );

      baseProduct.quantidade = quantidadeNova;
      baseProduct.precoCusto = novoCustoMedio;
      productsMap.set(baseProduct.id, baseProduct);
    }
  }

  return { success: true };
}
