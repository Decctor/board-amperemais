"use client";

import { FiscalProblemCta } from "@/components/Fiscal/FiscalProblemCta";
import { FISCAL_PROBLEM_CATEGORY_LABELS, FISCAL_PROBLEM_ORIGIN_LABELS } from "@/components/Fiscal/fiscal-problem-presentation";
import { useFiscalDeadline } from "@/components/Modals/FiscalDocument/use-fiscal-deadline";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Chip } from "@/components/ui/chip";
import { FISCAL_DEADLINES } from "@/lib/fiscal/constants";
import { appRoutes } from "@/lib/navigation/routes";
import { cn } from "@/lib/utils";
import { AlertTriangle, ArrowLeftRight, CircleX, Clock, Copy, FileIcon, Lightbulb, PencilIcon, RefreshCcw, Send, Zap } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
	formatFiscalDocumentTypeLabel,
	isFiscalDocumentFailed,
	type TFiscalDocumentListItem,
	type TFiscalPermissions,
} from "../helpers/fiscal-document-action-state";
import type { TFiscalDocumentActionRunner } from "../helpers/use-fiscal-document-action-runner";

type FiscalDocumentNextStepsProps = {
	document: TFiscalDocumentListItem;
	runner: TFiscalDocumentActionRunner;
	permissions: TFiscalPermissions;
	onChanged?: () => void;
};

/**
 * "O QUE FAZER AGORA": a primeira coisa que o operador ve no documento. Decide o painel pelo
 * estado + matriz de acoes: problemas com CTA, decisao quando o cancelamento fechou, espera
 * quando o provedor ainda nao respondeu.
 */
export function FiscalDocumentNextSteps({ document, runner, permissions, onChanged }: FiscalDocumentNextStepsProps) {
	const { actions } = runner;
	const cancelDeadline = useFiscalDeadline(actions.CANCELAR?.deadline ?? null);
	const status = document.statusInterno;
	const problems = document.problemas ?? [];
	const typeLabel = formatFiscalDocumentTypeLabel(document.tipo);

	if (isFiscalDocumentFailed(status)) {
		const canRetry = !!actions.REENVIAR?.available;
		return (
			<Callout.Root tone="danger">
				<Callout.Title>O que fazer agora</Callout.Title>
				{document.codigoRejeicao ? <Callout.Note>Rejeição SEFAZ {document.codigoRejeicao}</Callout.Note> : null}
				<div className="flex flex-col divide-y divide-destructive/20">
					{problems.length === 0 ? (
						<p className="py-1.5 text-sm">A emissão falhou sem detalhe registrado. Reenvie o documento ou veja o retorno completo abaixo.</p>
					) : null}
					{problems.map((problem, index) => (
						<div key={`${problem.codigo}-${index}`} className="flex flex-wrap items-start justify-between gap-2 py-2 first:pt-0 last:pb-0">
							<div className="flex min-w-0 flex-1 flex-col gap-1">
								<div className="flex flex-wrap items-center gap-1.5">
									<Chip.Root variant={problem.resolvidoAutomaticamente ? "muted" : "destructive"} size="xs">
										<Chip.Label>{FISCAL_PROBLEM_CATEGORY_LABELS[problem.categoria]}</Chip.Label>
									</Chip.Root>
									<span className="text-label text-muted-foreground">{FISCAL_PROBLEM_ORIGIN_LABELS[problem.origem]}</span>
								</div>
								<p className="text-sm font-medium">{problem.mensagem}</p>
								<p className="flex items-start gap-1 text-xs text-muted-foreground">
									<Lightbulb className="mt-0.5 h-3 w-3 shrink-0" />
									{problem.resolvidoAutomaticamente ? "Retentativa automática em andamento. Nenhuma ação necessária." : problem.acaoSugerida}
								</p>
							</div>
							{!problem.resolvidoAutomaticamente ? (
								<FiscalProblemCta problem={problem} vendaId={document.vendaId} canConfigureFiscal={permissions.configurar} onResolved={onChanged} />
							) : null}
						</div>
					))}
				</div>
				<Callout.Actions>
					<Button type="button" size="sm" disabled={!canRetry || runner.isPending} onClick={() => runner.run("REENVIAR")} className="gap-1.5">
						<Send className={cn("h-4 w-4", runner.pendingAction === "REENVIAR" && "animate-spin")} />
						Reenviar
					</Button>
					{actions.INUTILIZAR?.available ? (
						<Button
							type="button"
							size="sm"
							variant="outline"
							disabled={runner.isPending}
							onClick={() => runner.run("INUTILIZAR")}
							className="gap-1.5 text-destructive"
						>
							<CircleX className="h-4 w-4" />
							Inutilizar numeração
						</Button>
					) : null}
					{!canRetry && actions.REENVIAR?.reason ? <span className="text-xs text-muted-foreground">{actions.REENVIAR.reason}</span> : null}
				</Callout.Actions>
				{runner.retryFailureMessage ? (
					<Callout.Note className="rounded-md bg-destructive/10 px-2 py-1.5">
						<AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
						{runner.retryFailureMessage}
					</Callout.Note>
				) : null}
			</Callout.Root>
		);
	}

	if (status === "AUTORIZADO") {
		const cancelar = actions.CANCELAR;
		if (cancelar?.available) {
			return (
				<Callout.Root tone="neutral">
					<Callout.Title>Documento autorizado</Callout.Title>
					<div className="flex flex-wrap items-center justify-between gap-2">
						<p className="flex items-center gap-1.5 text-sm">
							<Clock className="h-4 w-4 text-muted-foreground" />
							{cancelDeadline.label ? `Cancelamento disponível por mais ${cancelDeadline.label}.` : "Cancelamento disponível."}
						</p>
						<Button
							type="button"
							size="sm"
							variant={cancelDeadline.urgent ? "destructive" : "outline"}
							disabled={runner.isPending}
							onClick={() => runner.run("CANCELAR")}
							className={cn("gap-1.5", !cancelDeadline.urgent && "text-destructive")}
						>
							<CircleX className="h-4 w-4" />
							Cancelar
						</Button>
					</div>
				</Callout.Root>
			);
		}
		if (cancelar && !cancelar.available && !cancelar.permissionBlocked) {
			const devolucao = actions.DEVOLUCAO;
			const carta = actions.CARTA_CORRECAO;
			const copyKey = async () => {
				if (!document.chaveAcesso) return;
				await navigator.clipboard.writeText(document.chaveAcesso);
				toast.success("Chave de acesso copiada.");
			};
			return (
				<Callout.Root tone="warning">
					<Callout.Title>Cancelamento indisponível</Callout.Title>
					<p className="text-sm">{cancelar.reason}</p>
					<p className="text-xs text-muted-foreground">A nota continua válida na SEFAZ. Escolha o que corresponde ao que aconteceu:</p>
					<div className="flex flex-col gap-2">
						<div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-background/60 px-2.5 py-2">
							<div className="flex min-w-0 flex-col">
								<span className="text-sm font-semibold">A venda foi desfeita ou o cliente devolveu</span>
								<span className="text-xs text-muted-foreground">
									Gere a NF-e de devolução referenciando esta nota. Ela estorna o efeito fiscal e, quando autorizada, libera o cancelamento da venda.
								</span>
								{devolucao && !devolucao.available ? (
									<span className="mt-1 text-xs text-[color:var(--tone-accent)]">
										{devolucao.reason}{" "}
										{devolucao.reason?.includes("perfil") ? (
											<Link href={appRoutes.fiscal.configuration("operation-profiles")} className="underline">
												Configurar perfil de devolução
											</Link>
										) : null}
									</span>
								) : null}
							</div>
							<Button
								type="button"
								size="sm"
								disabled={!devolucao?.available || runner.isPending}
								onClick={() => runner.run("DEVOLUCAO")}
								className="gap-1.5"
							>
								<ArrowLeftRight className="h-4 w-4" />
								Gerar devolução
							</Button>
						</div>
						{document.tipo === "NFE" ? (
							<div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-background/60 px-2.5 py-2">
								<div className="flex min-w-0 flex-col">
									<span className="text-sm font-semibold">Só um dado descritivo está errado</span>
									<span className="text-xs text-muted-foreground">Carta de correção. Não altera valores, quantidades, datas nem partes.</span>
									{carta && !carta.available ? <span className="mt-1 text-xs text-[color:var(--tone-accent)]">{carta.reason}</span> : null}
								</div>
								<Button
									type="button"
									size="sm"
									variant="outline"
									disabled={!carta?.available || runner.isPending}
									onClick={() => runner.run("CARTA_CORRECAO")}
									className="gap-1.5"
								>
									<PencilIcon className="h-4 w-4" />
									Carta de correção
								</Button>
							</div>
						) : null}
						<div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-background/60 px-2.5 py-2">
							<div className="flex min-w-0 flex-col">
								<span className="text-sm font-semibold">A nota não deveria existir</span>
								<span className="text-xs text-muted-foreground">
									O cancelamento fora do prazo só é possível pelo portal da SEFAZ do seu estado, geralmente com multa. Leve a chave de acesso e o XML ao seu
									contador.
								</span>
							</div>
							<div className="flex items-center gap-1.5">
								<Button type="button" size="sm" variant="outline" disabled={!document.chaveAcesso} onClick={copyKey} className="gap-1.5">
									<Copy className="h-4 w-4" />
									Copiar chave
								</Button>
								<Button
									type="button"
									size="sm"
									variant="outline"
									disabled={!actions.BAIXAR_XML?.available}
									onClick={() => runner.run("BAIXAR_XML")}
									className="gap-1.5"
								>
									<FileIcon className="h-4 w-4" />
									Baixar XML
								</Button>
							</div>
						</div>
					</div>
				</Callout.Root>
			);
		}
		return null;
	}

	if (status === "EM_PROCESSAMENTO" || status === "PRONTO_PARA_ENVIO" || status === "RASCUNHO") {
		const waitingMinutes = Math.floor((Date.now() - new Date(document.dataInsercao).getTime()) / 60_000);
		const stuck = status === "EM_PROCESSAMENTO" && waitingMinutes >= FISCAL_DEADLINES.processingAlertMinutes;
		return (
			<Callout.Root tone={stuck ? "warning" : "info"}>
				<Callout.Title>{status === "EM_PROCESSAMENTO" ? "Aguardando retorno do provedor" : "Na fila de envio"}</Callout.Title>
				<div className="flex flex-wrap items-center justify-between gap-2">
					<p className="text-sm">
						{status === "EM_PROCESSAMENTO"
							? `${typeLabel} enviada ao provedor há ${waitingMinutes} min.`
							: "O envio acontece automaticamente em até 2 minutos."}
						{stuck ? " Está demorando mais que o normal — atualize o status e, se persistir, veja o histórico abaixo." : ""}
					</p>
					{actions.SINCRONIZAR?.available ? (
						<Button type="button" size="sm" variant="outline" disabled={runner.isPending} onClick={() => runner.run("SINCRONIZAR")} className="gap-1.5">
							<RefreshCcw className={cn("h-4 w-4", runner.pendingAction === "SINCRONIZAR" && "animate-spin")} />
							Atualizar status
						</Button>
					) : null}
				</div>
			</Callout.Root>
		);
	}

	if (status === "CANCELAMENTO_PENDENTE") {
		return (
			<Callout.Root tone="info">
				<Callout.Title>Cancelamento solicitado</Callout.Title>
				<div className="flex flex-wrap items-center justify-between gap-2">
					<p className="text-sm">Aguardando confirmação da SEFAZ.</p>
					<Button type="button" size="sm" variant="outline" disabled={runner.isPending} onClick={() => runner.run("SINCRONIZAR")} className="gap-1.5">
						<RefreshCcw className={cn("h-4 w-4", runner.pendingAction === "SINCRONIZAR" && "animate-spin")} />
						Atualizar status
					</Button>
				</div>
			</Callout.Root>
		);
	}

	if ((status === "CANCELADO" || status === "INUTILIZADO") && actions.REENVIAR?.available) {
		return (
			<Callout.Root tone="neutral">
				<Callout.Title>{status === "CANCELADO" ? "Documento cancelado" : "Numeração inutilizada"}</Callout.Title>
				<div className="flex flex-wrap items-center justify-between gap-2">
					<p className="text-sm">A venda continua sem nota válida. Se ela segue de pé, emita um novo documento.</p>
					<Button type="button" size="sm" variant="outline" disabled={runner.isPending} onClick={() => runner.run("REENVIAR")} className="gap-1.5">
						<Zap className="h-4 w-4" />
						Emitir novamente
					</Button>
				</div>
			</Callout.Root>
		);
	}

	return null;
}
