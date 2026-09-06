"use client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { createImportJob, retryImportJob, cancelImportJob } from "@/lib/mutations/import-jobs";
import { ONBOARDING_READINESS_QUERY_KEY } from "@/lib/queries/onboarding";
import type { TOnboardingReadiness } from "@/lib/onboarding/readiness";
import { getErrorMessage } from "@/lib/errors";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { toast } from "sonner";

const LABELS = { AGUARDANDO: "Aguardando importação", EM_ANDAMENTO: "Importando histórico", PAUSADO_LIMITE: "Aguardando limite do Bling", AGUARDANDO_RECONEXAO: "Reconecte o Bling", CONCLUIDO: "Histórico importado", CONCLUIDO_COM_LACUNAS: "Histórico com lacunas", FALHOU: "Importação interrompida", CANCELADO: "Importação cancelada" };
export function ImportProgress({ integrations, compact = false }: { integrations: TOnboardingReadiness["fonteDados"]["integracoes"]; compact?: boolean }) {
 const queryClient = useQueryClient();
 const mutation = useMutation({
  mutationFn: async (input: { action: "start" | "expand" | "retry" | "cancel"; id: string }) => input.action === "retry" ? retryImportJob(input.id) : input.action === "cancel" ? cancelImportJob(input.id) : createImportJob({ integrationId: input.id, janelaDias: input.action === "expand" ? 365 : 90 }),
  onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ONBOARDING_READINESS_QUERY_KEY }); },
  onError: (error) => toast.error(getErrorMessage(error)),
 });
 return <div className="flex flex-col gap-4">{integrations.filter((item) => item.tipo === "BLING").map((integration) => {
  const job = integration.cargaHistorica;
  const totalDays = job ? Math.max(1, Math.ceil((new Date(job.janelaAlvo.fim).getTime() - new Date(job.janelaAlvo.inicio).getTime()) / 86400000)) : 90;
  const coveredDays = job?.coberturaConcluida ? Math.max(0, Math.floor((new Date(job.coberturaConcluida.fim).getTime() - new Date(job.coberturaConcluida.inicio).getTime()) / 86400000)) : 0;
  const active = job && ["AGUARDANDO", "EM_ANDAMENTO", "PAUSADO_LIMITE", "AGUARDANDO_RECONEXAO"].includes(job.estado);
  return <section key={integration.id} className="flex flex-col gap-2" aria-label={`Histórico de ${integration.apelido ?? "Bling"}`}>
   <div className="text-sm font-semibold">{job ? LABELS[job.estado] : "Traga seu histórico do Bling"}</div>
   {job ? <>
    <Progress value={Math.min(100, coveredDays / totalDays * 100)} aria-label="Cobertura temporal do histórico" />
    <p className="text-xs text-muted-foreground" role="status">{coveredDays} de {totalDays} dias cobertos · {job.contadores.importados} vendas importadas</p>
    {job.proximaExecucao && job.estado === "PAUSADO_LIMITE" ? <p className="text-xs text-muted-foreground">Retomada prevista: {new Date(job.proximaExecucao).toLocaleString("pt-BR")}</p> : null}
   </> : <p className="text-sm text-muted-foreground">Importe os últimos 90 dias. A carga continua enquanto você configura sua conta.</p>}
   {!compact ? <div className="flex flex-wrap gap-2">
    {!job || job.estado === "CANCELADO" ? <Button size="sm" variant="outline" disabled={mutation.isPending} onClick={() => mutation.mutate({ action: "start", id: integration.id })}>Importar histórico</Button> : null}
    {job?.estado === "CONCLUIDO" && new Date(job.janelaAlvo.inicio).getTime() > Date.now() - 364 * 86400000 ? <Button size="sm" variant="outline" disabled={mutation.isPending} onClick={() => mutation.mutate({ action: "expand", id: integration.id })}>Buscar mais histórico</Button> : null}
    {job?.acao.tipo === "RECONECTAR" ? <Button asChild size="sm" variant="outline"><Link href="/dashboard/settings?view=integration">Reconectar</Link></Button> : null}
    {job?.acao.tipo === "TENTAR_NOVAMENTE" ? <Button size="sm" variant="outline" disabled={mutation.isPending} onClick={() => mutation.mutate({ action: "retry", id: job.jobId })}>Tentar novamente</Button> : null}
    {active ? <Button size="sm" variant="ghost" disabled={mutation.isPending} onClick={() => mutation.mutate({ action: "cancel", id: job.jobId })}>Cancelar importação</Button> : null}
   </div> : null}
  </section>;
 })}</div>;
}
