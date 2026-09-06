import { db } from "@/services/drizzle";
import { integrations, integrationImportJobs } from "@/services/drizzle/schema";
import { and, desc, eq, inArray, isNull, lte, or } from "drizzle-orm";
import createHttpError from "http-errors";
import { ACTIVE_IMPORT_STATES } from "@/schemas/import-jobs";
import { enqueueImportJobBatch } from "./enqueue";
import { captureOnboardingEvent } from "@/lib/onboarding/analytics";

export async function startHistoricalImport({ integrationId, organizationId, autorId, janelaDias = 90 }: { integrationId: string; organizationId: string; autorId: string | null; janelaDias?: number }) {
 let createdNew = false;
 const job = await db.transaction(async (tx) => {
  const [integration] = await tx.select().from(integrations).where(and(eq(integrations.id, integrationId), eq(integrations.organizacaoId, organizationId))).for("update");
  if (!integration?.ativo) throw new createHttpError.NotFound("Integração ativa não encontrada.");
  if (integration.tipo !== "BLING") throw new createHttpError.BadRequest("Esta integração ainda não oferece carga histórica.");
  const active = await tx.query.integrationImportJobs.findFirst({ where: and(eq(integrationImportJobs.integracaoId, integrationId), inArray(integrationImportJobs.estado, [...ACTIVE_IMPORT_STATES])) });
  if (active) return active;
  const previous = await tx.query.integrationImportJobs.findFirst({ where: and(eq(integrationImportJobs.integracaoId, integrationId), eq(integrationImportJobs.estado, "CONCLUIDO")), orderBy: desc(integrationImportJobs.dataInicio) });
  const end = previous?.coberturaInicio ?? new Date();
  const start = new Date(Date.now() - Math.min(365, Math.max(1, janelaDias)) * 86400000);
  if (start >= end && previous) return previous;
  const [created] = await tx.insert(integrationImportJobs).values({ organizacaoId: organizationId, integracaoId: integrationId, autorId, janelaAlvoInicio: start, janelaAlvoFim: end }).returning();
  createdNew = true;
  return created;
 });
 if (createdNew) await captureOnboardingEvent(organizationId, "import_job_started", { job_id: job.id, integration_id: integrationId, janela_dias: janelaDias, provedor: "BLING" });
 // Persist first: the sweeper recovers a failed publish.
 if (ACTIVE_IMPORT_STATES.some((state) => state === job.estado)) {
  try { await enqueueImportJobBatch({ jobId: job.id }); } catch (error) { console.error("[IMPORT_JOB] Falha ao publicar; varredor retomará.", error); }
 }
 return job;
}

export async function changeImportJob({ id, organizationId, action }: { id: string; organizationId: string; action: "retry" | "cancel" }) {
 const job = await db.transaction(async (tx) => {
  const [current] = await tx.select().from(integrationImportJobs).where(and(eq(integrationImportJobs.id, id), eq(integrationImportJobs.organizacaoId, organizationId))).for("update");
  if (!current) throw new createHttpError.NotFound("Importação não encontrada.");
  if (current.lockAte && current.lockAte > new Date()) throw new createHttpError.Conflict("Um lote está em execução. Tente novamente em instantes.");
  if (action === "retry" && !["FALHOU", "AGUARDANDO_RECONEXAO", "PAUSADO_LIMITE", "CONCLUIDO_COM_LACUNAS"].includes(current.estado)) throw new createHttpError.BadRequest("Esta importação não pode ser retomada.");
  if (action === "cancel" && !ACTIVE_IMPORT_STATES.some((state) => state === current.estado)) throw new createHttpError.BadRequest("Esta importação já terminou.");
  const [updated] = await tx.update(integrationImportJobs).set({ estado: action === "cancel" ? "CANCELADO" : "AGUARDANDO", proximaExecucao: new Date(), lockAte: null, ultimoErro: null, tentativasConsecutivas: 0, dataConclusao: action === "cancel" ? new Date() : null, ...(action === "retry" && current.estado === "CONCLUIDO_COM_LACUNAS" ? { cursorJanelaInicio: null, cursorJanelaFim: null, cursorPagina: 1, cursorPendentes: [], listagemConcluida: false, janelasComFalha: [] } : {}) }).where(eq(integrationImportJobs.id, id)).returning();
  return updated;
 });
 if (action === "retry") await enqueueImportJobBatch({ jobId: id });
 return job;
}

export async function sweepImportJobs() {
 const now = new Date();
 const jobs = await db.select({ id: integrationImportJobs.id }).from(integrationImportJobs).where(and(inArray(integrationImportJobs.estado, ["AGUARDANDO", "EM_ANDAMENTO", "PAUSADO_LIMITE"]), or(isNull(integrationImportJobs.proximaExecucao), lte(integrationImportJobs.proximaExecucao, now)), or(isNull(integrationImportJobs.lockAte), lte(integrationImportJobs.lockAte, now)))).limit(100);
 const results = await Promise.allSettled(jobs.map((job) => enqueueImportJobBatch({ jobId: job.id })));
 return { enfileirados: results.filter((result) => result.status === "fulfilled").length };
}
