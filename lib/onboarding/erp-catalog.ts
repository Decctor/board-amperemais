import { resolveChannelAvailability, resolveChannelPrice } from "@/lib/products/sales-channels";
import type { DB, DBTransaction } from "@/services/drizzle";
import { products, productChannelSettings, salesChannels } from "@/services/drizzle/schema";
import { and, eq, isNull } from "drizzle-orm";
import type { TErpChannel } from "./erp-channels";
export async function getUsableOnboardingProducts({ executor, organizationId, channel }: { executor: DB | DBTransaction; organizationId: string; channel: TErpChannel }) {
 const canal = channel === "BALCAO" ? "POS" : channel === "MESAS" ? "COMANDA" : "SHOP";
 const row = await executor.query.salesChannels.findFirst({ where: and(eq(salesChannels.organizacaoId, organizationId), eq(salesChannels.canal, canal), isNull(salesChannels.integracaoId), isNull(salesChannels.refExterno)) });
 const [catalog, overrides] = await Promise.all([
  executor.query.products.findMany({ where: and(eq(products.organizacaoId, organizationId), eq(products.ativo, true), eq(products.vendavel, true)), with: { variantes: true } }),
  row ? executor.query.productChannelSettings.findMany({ where: and(eq(productChannelSettings.organizacaoId, organizationId), eq(productChannelSettings.canalVendaId, row.id)) }) : [],
 ]);
 const usable = catalog.flatMap((product) => {
  const productOverride = overrides.find((item) => item.produtoId === product.id && !item.produtoVarianteId);
  const nodes = product.variantes.length ? product.variantes : [null];
  return nodes.flatMap((variant) => {
   const settings = { product: productOverride, variant: overrides.find((item) => item.produtoVarianteId === variant?.id) };
   const price = resolveChannelPrice(product, variant, settings);
   if (!resolveChannelAvailability({ product, variant, channel: row ?? { canal, catalogoModo: "TODOS" }, overrides: settings }) || !price || price <= 0 || !product.nome.trim() || (channel !== "BALCAO" && !product.grupo.trim())) return [];
   return [{ id: variant?.id ?? product.id, produtoId: product.id, nome: variant ? `${product.nome} · ${variant.nome}` : product.nome, precoVenda: price }];
  });
 });
 return { total: new Set(usable.map((item) => item.produtoId)).size, amostra: usable.slice(0, 5) };
}
