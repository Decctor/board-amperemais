import { db } from "@/services/drizzle";
import { clients, sales } from "@/services/drizzle/schema";
import { getValidSaleConditions } from "@/lib/sales/valid-sale";
import { and, eq, sql } from "drizzle-orm";

/** Order-independent consolidation; historical imports arrive newest first. */
export async function recomputeClientMetricsForOrganization({ organizationId }: { organizationId: string }) {
 const totals = db.select({
  clienteId: sales.clienteId,
  quantidade: sql<number>`count(*)::integer`.as("quantidade"),
  valor: sql<number>`sum(${sales.valorTotal})`.as("valor"),
  primeira: sql<Date>`min(${sales.dataVenda})`.as("primeira"),
  ultima: sql<Date>`max(${sales.dataVenda})`.as("ultima"),
  primeiraId: sql<string>`(array_agg(${sales.id} order by ${sales.dataVenda}, ${sales.id}))[1]`.as("primeira_id"),
  ultimaId: sql<string>`(array_agg(${sales.id} order by ${sales.dataVenda} desc, ${sales.id} desc))[1]`.as("ultima_id"),
 }).from(sales).where(and(...getValidSaleConditions({ orgId: organizationId }))).groupBy(sales.clienteId).as("totals");
 await db.update(clients).set({
  metadataTotalCompras: sql`coalesce((select ${totals.quantidade} from ${totals} where ${totals.clienteId} = ${clients.id}), 0)`,
  metadataValorTotalCompras: sql`coalesce((select ${totals.valor} from ${totals} where ${totals.clienteId} = ${clients.id}), 0)`,
  primeiraCompraData: sql`(select ${totals.primeira} from ${totals} where ${totals.clienteId} = ${clients.id})`,
  ultimaCompraData: sql`(select ${totals.ultima} from ${totals} where ${totals.clienteId} = ${clients.id})`,
  primeiraCompraId: sql`(select ${totals.primeiraId} from ${totals} where ${totals.clienteId} = ${clients.id})`,
  ultimaCompraId: sql`(select ${totals.ultimaId} from ${totals} where ${totals.clienteId} = ${clients.id})`,
  metadataUltimaAtualizacao: new Date(),
 }).where(eq(clients.organizacaoId, organizationId));
}
