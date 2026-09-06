"use client";
import { Button } from "@/components/ui/button";
import { useOnboardingReadiness, ONBOARDING_READINESS_QUERY_KEY } from "@/lib/queries/onboarding";
import { getOnboardingQuality } from "@/lib/onboarding/quality";
import { enableOnboardingCampaigns } from "@/lib/mutations/onboarding";
import { getErrorMessage } from "@/lib/errors";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImportProgress } from "@/app/onboarding/_components/shared/ImportProgress";
import { DependencyList } from "@/app/onboarding/_components/shared/DependencyList";
import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { captureClientEvent } from "@/lib/analytics/posthog-client";
import { updateOnboardingProgress } from "@/lib/mutations/onboarding";

export function ActivationPanel({ organizationId }: { organizationId: string }) {
 const { data: readiness } = useOnboardingReadiness();
 const [dismissed, setDismissed] = useState(false);
 const key = `onboarding-activation-v1:${organizationId}`;
 useEffect(() => { try { setDismissed(localStorage.getItem(key) === "true"); } catch {} }, [key]);
 const queryClient = useQueryClient();
 const enable = useMutation({ mutationFn: enableOnboardingCampaigns, onSuccess: async (result) => { toast.success(result.message); await queryClient.invalidateQueries({ queryKey: ONBOARDING_READINESS_QUERY_KEY }); }, onError: (error) => toast.error(getErrorMessage(error)) });
 const saveDismissal = useMutation({ mutationFn: updateOnboardingProgress, onSuccess: () => queryClient.invalidateQueries({ queryKey: ONBOARDING_READINESS_QUERY_KEY }), onError: (error) => toast.error(getErrorMessage(error)) });
 if (!readiness || readiness.organizacao.id !== organizationId) return null;
 const quality = getOnboardingQuality(readiness);
 const secondProduct = readiness.jornadas.some((journey) => journey.produto === "ERP") && !readiness.jornadas.some((journey) => journey.produto === "CRM") ? "CRM" : (readiness.erp.acesso || readiness.erp.testeDisponivel) && !readiness.jornadas.some((journey) => journey.produto === "ERP") ? "ERP" : null;
 if (quality.allCompleted && !readiness.proximaAcao) return secondProduct ? <Button asChild variant="ghost" className="self-start"><Link href={`/onboarding?produto=${secondProduct}`}>Preparar também o {secondProduct}</Link></Button> : null;
 function dismiss(value: boolean) {
  setDismissed(value);
  try { localStorage.setItem(key, String(value)); } catch {}
  const journey = readiness?.jornadas.find((item) => !!item.dataConclusao);
  if (journey) saveDismissal.mutate({ produto: journey.produto, respostas: { painelAtivacaoOcultadoEm: value ? new Date().toISOString() : null } });
 }
 const hiddenByJourney = readiness.jornadas.some((journey) => journey.respostas.painelAtivacaoOcultadoEm);
 if (dismissed || hiddenByJourney) return <div className="fixed bottom-6 right-6"><Button onClick={() => dismiss(false)}>Continuar ativação</Button></div>;
 const next = readiness.proximaAcao;
 return <section aria-labelledby="activation-title" className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
  <div className="flex items-start justify-between gap-3"><div><h2 id="activation-title" className="text-lg font-bold">Continue a preparar sua operação</h2><p className="text-sm text-muted-foreground">{quality.completedCount} de {quality.totalApplicable} configurações prontas. Você pode continuar usando o painel.</p></div><Button variant="ghost" size="sm" onClick={() => dismiss(true)}>Ocultar</Button></div>
  {next ? <div className="flex flex-wrap items-center justify-between gap-3"><p className="max-w-prose text-sm">{next.descricao}</p><Button asChild><Link href={next.href} onClick={() => captureClientEvent({ event: "onboarding_next_action_clicked", properties: { chave: next.chave } })}>{next.rotulo}</Link></Button></div> : null}
  <ImportProgress integrations={readiness.fonteDados.integracoes} />
  {secondProduct ? <Button asChild variant="ghost" className="self-start"><Link href={`/onboarding?produto=${secondProduct}`}>Preparar também o {secondProduct}</Link></Button> : null}
  {readiness.campanhas.filter((campaign) => campaign.estado !== "ATIVA").map((campaign) => <details key={campaign.id}><summary className="cursor-pointer text-sm font-semibold">{campaign.titulo} · {campaign.estado === "HABILITADA" ? "Aguardando dependências" : campaign.estado === "PRONTA" ? "Pronta para liberar" : "Preparada"}</summary><DependencyList dependencias={campaign.dependencias} />{campaign.estado === "PRONTA" || campaign.estado === "PREPARADA" ? <Button size="sm" disabled={enable.isPending} onClick={() => enable.mutate({ chaves: [campaign.chave], habilitar: true })}>Liberar envios quando estiver pronta</Button> : null}</details>)}
 </section>;
}
