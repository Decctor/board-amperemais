import type { TDataConnectorHistory } from "../types";
import { createBlingClient } from "./client";
import { isBlingCanceledSaleStatus, isBlingValidSaleStatus, toCanonicalBlingImportBatch } from "./mappers";
import { BlingListOutputSchema, BlingSaleSchema, BlingContactSchema, BlingProductSchema, BlingSingleOutputSchema, type TBlingConfig, type TBlingContact, type TBlingProduct } from "./types";

export class ImportBudgetExhausted extends Error {}

/** No in-request retries: the persistent worker owns Retry-After and checkpoints. */
export function createBlingHistoryConnector({ config, cache, beforeRequest }: {
 config: TBlingConfig; cache: Record<string, unknown>; beforeRequest: () => void;
}): TDataConnectorHistory<TBlingConfig> {
 const client = createBlingClient(config);
 client.interceptors.request.use((request) => { beforeRequest(); return request; });
 const single = async <T>(path: string, schema: Parameters<typeof BlingSingleOutputSchema>[0]): Promise<T> => {
  const cached = cache[path];
  if (cached) return cached as T;
  const response = await client.get(path);
  const value = BlingSingleOutputSchema(schema).parse(response.data).data as T;
  // Keep the in-flight sale and its enrichment across budget boundaries; capped per job.
  if (Object.keys(cache).length >= 5000) delete cache[Object.keys(cache)[0]];
  cache[path] = value;
  return value;
 };
 return {
  describe: () => ({ supportsHistory: true, listIncludesStatus: true, supportsStatusFilterOnList: false, maxWindowDays: null, defaultStepDays: 7, rateLimit: { perSecond: 3, perDay: null } }),
  listSales: async ({ window, page }) => {
   const format = (date: Date) => new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(date);
   const response = await client.get("/pedidos/vendas", { params: { dataInicial: format(window.startDate), dataFinal: format(window.endDate), pagina: page, limite: 100 } });
   const items = BlingListOutputSchema(BlingSaleSchema).parse(response.data).data;
   return { items: items.map((sale) => ({ sourceSaleId: String(sale.id), statusText: String(sale.situacao?.nome ?? sale.situacao?.valor ?? sale.situacao?.id ?? ""), occurredAt: null })), last: items.length < 100, requests: 1 };
  },
  classifyListedSale: ({ statusText }) => isBlingValidSaleStatus(statusText) ? "ELEGIVEL" : isBlingCanceledSaleStatus(statusText) || /rascunho|orçamento/i.test(statusText) ? "IGNORADO" : "DESCONHECIDO",
  buildBatchForSales: async ({ organizationId, window, sourceSaleIds }) => {
   const sales = [];
   const contacts: TBlingContact[] = [];
   const products: TBlingProduct[] = [];
   for (const id of sourceSaleIds) {
    const sale = await single<import("./types").TBlingSale>(`/pedidos/vendas/${id}`, BlingSaleSchema);
    sales.push(sale);
    if (sale.contato?.id) contacts.push(await single<TBlingContact>(`/contatos/${sale.contato.id}`, BlingContactSchema));
    for (const item of sale.itens) if (item.produto?.id) products.push(await single<TBlingProduct>(`/produtos/${item.produto.id}`, BlingProductSchema));
   }
   return { ...toCanonicalBlingImportBatch({ organizationId, window, sales, contacts, products }), requests: 0 };
  },
 };
}
