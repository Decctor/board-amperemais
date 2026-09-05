"use client";

import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/errors";
import { appRoutes } from "@/lib/navigation/routes";
import { useFiscalDocumentById } from "@/lib/queries/fiscal";
import { AlertTriangle, ArrowLeftRight, Clock, ExternalLink, FileCode, FileText, Loader2 } from "lucide-react";
import Link from "next/link";
import { FiscalProblemCta } from "./FiscalProblemCta";
import { FISCAL_PROBLEM_CATEGORY_LABELS, findFiscalAction, formatRemainingTime, pickPrimaryFiscalProblem } from "./fiscal-problem-presentation";
import { useFiscalPermissions } from "./fiscal-permissions-context";

/**
 * Conteudo do popover de um documento fiscal fora do modulo fiscal (card de atendimento, chips).
 * Carrega o documento so quando aberto e mostra a mesma resposta do modulo: o problema com CTA,
 * ou a janela de cancelamento, ou "aguardando".
 */
export function FiscalDocumentPopoverContent({ documentId, onResolved }: { documentId: string; onResolved?: () => void }) {
	const permissions = useFiscalPermissions();
	const { data, isLoading, isError, error } = useFiscalDocumentById(documentId);
	const document = data?.document;

	if (isLoading) {
		return (
			<div className="flex items-center gap-2 p-1 text-xs text-muted-foreground">
				<Loader2 className="h-3.5 w-3.5 animate-spin" />
				Carregando documento...
			</div>
		);
	}
	if (isError || !document) return <p className="p-1 text-xs text-destructive">{isError ? getErrorMessage(error) : "Documento não encontrado."}</p>;

	const openAsset = (asset: "xml" | "pdf") =>
		window.open(`/api/fiscal/document-assets?documentId=${document.id}&asset=${asset}`, "_blank", "noopener,noreferrer");
	const typeLabel = document.tipo === "NFCE" ? "NFC-e" : document.tipo === "NFE" ? "NF-e" : document.tipo;
	const header = (
		<div className="flex items-center justify-between gap-2">
			<span className="text-xs font-bold">
				{typeLabel} {document.numero ? `nº ${document.numero}` : ""}
			</span>
			<Button type="button" variant="ghost" size="sm" className="h-6 gap-1 px-1.5 text-[0.65rem] font-bold uppercase" asChild>
				<Link href={appRoutes.fiscal.document(document.id)}>
					<ExternalLink className="h-3 w-3" />
					Abrir
				</Link>
			</Button>
		</div>
	);

	if (document.statusInterno === "ERRO" || document.statusInterno === "REJEITADO") {
		const primary = pickPrimaryFiscalProblem(document.problemas ?? []);
		return (
			<div className="flex w-72 flex-col gap-2">
				{header}
				{primary ? (
					<div className="flex flex-col gap-1 rounded-md bg-destructive/10 px-2 py-1.5">
						<span className="flex items-center gap-1 text-[10px] font-bold uppercase text-destructive">
							<AlertTriangle className="h-3 w-3" />
							{FISCAL_PROBLEM_CATEGORY_LABELS[primary.categoria]}
						</span>
						<span className="text-xs font-medium">{primary.mensagem}</span>
						<span className="text-[11px] text-muted-foreground">{primary.acaoSugerida}</span>
					</div>
				) : (
					<span className="text-xs text-muted-foreground">Falha sem detalhe registrado. Abra o documento para reenviar.</span>
				)}
				{primary ? (
					<FiscalProblemCta problem={primary} vendaId={document.vendaId} canConfigureFiscal={permissions.configurar} onResolved={onResolved} />
				) : null}
			</div>
		);
	}

	if (document.statusInterno === "AUTORIZADO") {
		const cancelar = findFiscalAction(document.acoes, "CANCELAR");
		const remaining = cancelar?.prazoLimite ? formatRemainingTime(cancelar.prazoLimite) : null;
		return (
			<div className="flex w-72 flex-col gap-2">
				{header}
				<div className="flex items-start gap-1.5 text-xs">
					{cancelar?.disponivel ? (
						<Clock className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
					) : (
						<ArrowLeftRight className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
					)}
					<span className="text-muted-foreground">
						{cancelar?.disponivel
							? `Cancelamento disponível por mais ${remaining ?? "alguns minutos"}.`
							: (cancelar?.motivoIndisponivel ?? "Documento autorizado.")}
						{cancelar && !cancelar.disponivel && cancelar.alternativas.includes("DEVOLUCAO") ? " Saída: NF-e de devolução." : ""}
					</span>
				</div>
				<div className="flex items-center gap-1.5">
					<Button type="button" variant="outline" size="sm" className="h-7 gap-1 px-2 text-[0.65rem] font-bold" onClick={() => openAsset("pdf")}>
						<FileText className="h-3.5 w-3.5" />
						DANFE
					</Button>
					<Button type="button" variant="outline" size="sm" className="h-7 gap-1 px-2 text-[0.65rem] font-bold" onClick={() => openAsset("xml")}>
						<FileCode className="h-3.5 w-3.5" />
						XML
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="flex w-72 flex-col gap-2">
			{header}
			<span className="flex items-center gap-1.5 text-xs text-muted-foreground">
				<Clock className="h-3.5 w-3.5" />
				{document.statusInterno === "CANCELAMENTO_PENDENTE" ? "Cancelamento solicitado, aguardando a SEFAZ." : "Aguardando retorno do provedor fiscal."}
			</span>
		</div>
	);
}
