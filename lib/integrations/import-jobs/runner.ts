import { db } from "@/services/drizzle";
import { integrationImportJobs, integrations } from "@/services/drizzle/schema";
import { and, eq, inArray, isNull, lte, or } from "drizzle-orm";
import { isAxiosError } from "axios";
import { isUsableDataSourceIntegration } from "@/lib/integrations/data-sources";
import { BlingConfigSchema } from "@/lib/data-connectors/bling/types";
import { getValidBlingConfig } from "@/lib/data-connectors/bling/client";
import { createBlingHistoryConnector, ImportBudgetExhausted } from "@/lib/data-connectors/bling/history";
import { persistCanonicalBatch } from "@/lib/data-collecting-v2";
import { recomputeClientMetricsForOrganization } from "@/lib/clients/recompute-metrics";
import { enqueueImportJobBatch } from "./enqueue";
import { captureOnboardingEvent } from "@/lib/onboarding/analytics";
import { reconcileOnboardingCampaigns } from "@/lib/onboarding/reconcile";
import { applyListedSalesPage, closeImportWindow, setImportWindow } from "./checkpoint";

export async function runImportJobBatch({ jobId, budget = { maxRequests: 120, maxMillis: 240000 } }: { jobId: string; budget?: { maxRequests: number; maxMillis: number } }) {
 const now = new Date();
 const lease = new Date(now.getTime() + 360000);
 const [job] = await db.update(integrationImportJobs).set({ estado: "EM_ANDAMENTO", lockAte: lease, ultimaExecucao: now })
  .where(and(eq(integrationImportJobs.id, jobId), inArray(integrationImportJobs.estado, ["AGUARDANDO", "EM_ANDAMENTO", "PAUSADO_LIMITE"]), or(isNull(integrationImportJobs.lockAte), lte(integrationImportJobs.lockAte, now)), or(isNull(integrationImportJobs.proximaExecucao), lte(integrationImportJobs.proximaExecucao, now)))).returning();
 if (!job) return;
 let requests = 0;
 const importedBefore = job.contadores.importados;
	const save = async (release = false, executor: typeof db | import("@/services/drizzle").DBTransaction = db) => {
  const { id, ...values } = job;
  const updated = await executor.update(integrationImportJobs).set({ ...values, lockAte: release ? null : lease }).where(and(eq(integrationImportJobs.id, id), eq(integrationImportJobs.lockAte, lease))).returning({ id: integrationImportJobs.id });
  if (!updated.length) throw new Error("A execução perdeu a reserva deste lote.");
 };
 try {
  const integration = await db.query.integrations.findFirst({ where: and(eq(integrations.id, job.integracaoId), eq(integrations.organizacaoId, job.organizacaoId)) });
  if (!integration?.ativo) { job.estado = "CANCELADO"; job.dataConclusao = new Date(); return; }
  if (integration.status === "EXPIRADO") { job.estado = "AGUARDANDO_RECONEXAO"; return; }
  if (!isUsableDataSourceIntegration(integration) || integration.tipo !== "BLING") throw new Error("Conector histórico indisponível.");
  const config = await getValidBlingConfig({ integrationId: integration.id, config: BlingConfigSchema.parse(integration.configuracao) });
  const connector = createBlingHistoryConnector({ config, cache: job.cache, beforeRequest: () => {
   if (requests >= budget.maxRequests || Date.now() - now.getTime() >= budget.maxMillis) throw new ImportBudgetExhausted();
   requests++; job.contadores.requisicoes++;
  } });
  if (!job.cursorJanelaInicio || !job.cursorJanelaFim) setImportWindow(job, job.janelaAlvoFim);
  while (Date.now() - now.getTime() < budget.maxMillis && requests < budget.maxRequests) {
   const window = { startDate: job.cursorJanelaInicio!, endDate: job.cursorJanelaFim! };
   if (!job.cursorPendentes.length && !job.listagemConcluida) {
    const page = await connector.listSales({ config, window, page: job.cursorPagina });
    applyListedSalesPage(job, page, connector.classifyListedSale);
    await save();
   }
   if (job.cursorPendentes.length) {
    const id = job.cursorPendentes[0];
    const batch = await connector.buildBatchForSales({ organizationId: job.organizacaoId, integrationId: job.integracaoId, config, window, sourceSaleIds: [id] });
    const previousCounters = { ...job.contadores };
    try {
    await persistCanonicalBatch({ integration, organizationConfiguration: null, batch: { ...batch, integrationId: integration.id }, effects: { processCashback: false, processCampaigns: false, processConversionAttribution: false }, mode: "HISTORICO", onPersist: async (tx, summary) => {
    job.contadores.importados += summary.createdSalesCount;
    job.contadores.atualizados += summary.updatedSalesCount;
    job.contadores.clientesCriados += summary.createdClientsCount;
    job.cursorPendentes.shift();
    job.tentativasConsecutivas = 0;
    job.ultimoErro = null;
    await save(false, tx);
    } });
    } catch (error) {
     job.contadores = previousCounters;
     if (job.cursorPendentes[0] !== id) job.cursorPendentes.unshift(id);
     throw error;
    }
    delete job.cache[`/pedidos/vendas/${id}`];
   }
   const closure = closeImportWindow(job);
   if (closure !== "PENDENTE") {
    if (closure === "CONCLUIDA") {
     await recomputeClientMetricsForOrganization({ organizationId: job.organizacaoId });
     job.estado = job.janelasComFalha.length ? "CONCLUIDO_COM_LACUNAS" : "CONCLUIDO"; job.dataConclusao = new Date(); job.cache = {}; job.proximaExecucao = null;
     return;
    }
    await save();
   }
  }
  job.proximaExecucao = new Date();
 } catch (error) {
  if (error instanceof ImportBudgetExhausted) { job.proximaExecucao = new Date(); }
  else {
   job.ultimoErro = error instanceof Error ? error.message : "Falha ao importar histórico.";
   const status = isAxiosError(error) ? error.response?.status : null;
   if (status === 401 || status === 403) job.estado = "AGUARDANDO_RECONEXAO";
   else if (status === 429) {
    job.estado = "PAUSADO_LIMITE"; job.contadores.rateLimits++;
    const header = isAxiosError(error) ? error.response?.headers["retry-after"] : null;
    const numeric = Number(header);
    const delay = header && Number.isFinite(numeric) ? numeric * 1000 : header ? Date.parse(String(header)) - Date.now() : 60000;
    job.proximaExecucao = new Date(Date.now() + Math.max(1000, Number.isFinite(delay) ? delay : 60000));
   } else {
    job.tentativasConsecutivas++;
    job.estado = job.tentativasConsecutivas >= 3 ? "FALHOU" : "EM_ANDAMENTO";
    job.proximaExecucao = new Date(Date.now() + 60000);
    if (job.tentativasConsecutivas >= 3 && status && [400, 404, 422].includes(status) && job.cursorJanelaInicio && job.cursorJanelaFim) {
     job.janelasComFalha.push({ inicio: job.cursorJanelaInicio.toISOString(), fim: job.cursorJanelaFim.toISOString(), motivo: job.ultimoErro });
     if (job.cursorJanelaInicio <= job.janelaAlvoInicio) {
      await recomputeClientMetricsForOrganization({ organizationId: job.organizacaoId });
      job.estado = "CONCLUIDO_COM_LACUNAS"; job.dataConclusao = new Date();
     } else { setImportWindow(job, job.cursorJanelaInicio); job.estado = "EM_ANDAMENTO"; job.tentativasConsecutivas = 0; }
    }
   }
  }
 } finally {
  await save(true);
  await captureOnboardingEvent(job.organizacaoId, "import_job_batch", { job_id: job.id, requests, importados: job.contadores.importados - importedBefore });
  if (job.estado === "PAUSADO_LIMITE") await captureOnboardingEvent(job.organizacaoId, "import_job_paused_rate_limit", { job_id: job.id });
  if (job.estado === "CONCLUIDO" || job.estado === "CONCLUIDO_COM_LACUNAS") {
   await captureOnboardingEvent(job.organizacaoId, "import_job_completed", { job_id: job.id, coberturaDias: job.coberturaInicio ? (job.janelaAlvoFim.getTime() - job.coberturaInicio.getTime()) / 86400000 : 0, lacunas: job.janelasComFalha.length });
   await reconcileOnboardingCampaigns({ executor: db, organizationId: job.organizacaoId });
  }
  if (["EM_ANDAMENTO", "PAUSADO_LIMITE"].includes(job.estado)) {
   await enqueueImportJobBatch({ jobId, delaySeconds: Math.min(86400, Math.max(1, Math.ceil(((job.proximaExecucao?.getTime() ?? Date.now()) - Date.now()) / 1000))) });
  }
 }
}
