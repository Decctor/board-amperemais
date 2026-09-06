import { db } from "@/services/drizzle";
import { organizationOnboardings, integrationImportJobs, campaigns, organizations, integrations } from "@/services/drizzle/schema";
import { count, eq, isNotNull, sql } from "drizzle-orm";
export async function getActivationMetrics() {
 const [journeys, imports, campaignCounts, channels, stages] = await Promise.all([
  db.select({ produto: organizationOnboardings.produto, total: count(), concluidas: sql<number>`count(${organizationOnboardings.dataConclusao})::integer`, tempoMedioMinutos: sql<number | null>`avg(extract(epoch from (${organizationOnboardings.dataConclusao} - ${organizationOnboardings.dataInicio})) / 60)` }).from(organizationOnboardings).groupBy(organizationOnboardings.produto),
  db.select({ provedor: integrations.tipo, estado: integrationImportJobs.estado, total: count(), vendasImportadas: sql<number>`coalesce(sum((${integrationImportJobs.contadores}->>'importados')::integer),0)`, requisicoes: sql<number>`coalesce(sum((${integrationImportJobs.contadores}->>'requisicoes')::integer),0)`, limites: sql<number>`coalesce(sum((${integrationImportJobs.contadores}->>'rateLimits')::integer),0)`, tempoMedioMinutos: sql<number | null>`avg(extract(epoch from (${integrationImportJobs.dataConclusao} - ${integrationImportJobs.dataInicio})) / 60)` }).from(integrationImportJobs).innerJoin(integrations, eq(integrations.id, integrationImportJobs.integracaoId)).groupBy(integrations.tipo, integrationImportJobs.estado),
  db.select({ ativo: campaigns.ativo, total: count() }).from(campaigns).where(isNotNull(campaigns.chavePreset)).groupBy(campaigns.ativo),
  db.select({ canal: sql<string | null>`${organizationOnboardings.respostas}->>'erpCanalInicial'`, total: count(), simulacoes: sql<number>`count(*) filter (where ${organizationOnboardings.respostas}->>'erpSimulacaoConcluidaEm' is not null)::integer` }).from(organizationOnboardings).where(eq(organizationOnboardings.produto, "ERP")).groupBy(sql`${organizationOnboardings.respostas}->>'erpCanalInicial'`),
  db.select({ produto: organizationOnboardings.produto, etapa: organizationOnboardings.etapaAtual, segmento: organizations.atuacaoNicho, total: count(), adiamentos: sql<number>`coalesce(sum(jsonb_array_length(${organizationOnboardings.etapasAdiadas})),0)` }).from(organizationOnboardings).innerJoin(organizations, eq(organizations.id, organizationOnboardings.organizacaoId)).groupBy(organizationOnboardings.produto, organizationOnboardings.etapaAtual, organizations.atuacaoNicho),
 ]);
 return { journeys, imports, campaigns: campaignCounts, channels, stages };
}
export type TActivationMetrics = Awaited<ReturnType<typeof getActivationMetrics>>;
