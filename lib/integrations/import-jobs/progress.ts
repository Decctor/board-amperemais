import type { TIntegrationImportJob } from "@/services/drizzle/schema/integration-import-jobs";
export function getImportJobProgress(job: TIntegrationImportJob) {
 return {
  jobId: job.id, estado: job.estado,
  janelaAlvo: { inicio: job.janelaAlvoInicio, fim: job.janelaAlvoFim },
  coberturaConcluida: job.coberturaInicio ? { inicio: job.coberturaInicio, fim: job.janelaAlvoFim } : null,
  emProcessamento: job.cursorJanelaInicio && job.cursorJanelaFim ? { inicio: job.cursorJanelaInicio, fim: job.cursorJanelaFim } : null,
  contadores: job.contadores, proximaExecucao: job.proximaExecucao, lacunas: job.janelasComFalha.length,
  acao: { tipo: job.estado === "AGUARDANDO_RECONEXAO" ? "RECONECTAR" : job.estado === "FALHOU" || job.estado === "CONCLUIDO_COM_LACUNAS" ? "TENTAR_NOVAMENTE" : null, href: job.estado === "AGUARDANDO_RECONEXAO" ? "/dashboard/settings?view=integration" : null },
 };
}
export type TImportJobProgress = ReturnType<typeof getImportJobProgress>;
