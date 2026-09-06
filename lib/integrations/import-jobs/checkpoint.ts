import type { TIntegrationImportJob } from "@/services/drizzle/schema/integration-import-jobs";
import type { TListedSaleClassification } from "@/lib/data-connectors/types";
export function setImportWindow(job: TIntegrationImportJob, end: Date) {
 job.cursorJanelaFim = end;
 job.cursorJanelaInicio = new Date(Math.max(job.janelaAlvoInicio.getTime(), end.getTime() - 7 * 86400000));
 job.cursorPagina = 1;
 job.listagemConcluida = false;
 job.cursorPendentes = [];
}
export function applyListedSalesPage(job: TIntegrationImportJob, page: { items: Array<{ sourceSaleId: string; statusText: string }>; last: boolean }, classify: (item: { statusText: string }) => TListedSaleClassification) {
 for (const item of page.items) {
  job.contadores.listados++;
  const eligibility = classify(item);
  if (eligibility === "IGNORADO") { job.contadores.ignoradosPorSituacao++; continue; }
  if (eligibility === "ELEGIVEL") job.contadores.elegiveis++; else job.contadores.situacoesDesconhecidas++;
  job.cursorPendentes.push(item.sourceSaleId);
 }
 job.listagemConcluida = page.last;
 job.cursorPagina++;
}
/** Coverage can only pass a completely closed window, and can never cross a known gap. */
export function closeImportWindow(job: TIntegrationImportJob): "PENDENTE" | "PROXIMA" | "CONCLUIDA" {
 if (!job.listagemConcluida || job.cursorPendentes.length || !job.cursorJanelaInicio) return "PENDENTE";
 if (!job.janelasComFalha.length) job.coberturaInicio = job.cursorJanelaInicio;
 if (job.cursorJanelaInicio <= job.janelaAlvoInicio) return "CONCLUIDA";
 setImportWindow(job, job.cursorJanelaInicio);
 return "PROXIMA";
}
