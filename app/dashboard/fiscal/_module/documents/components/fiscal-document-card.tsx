"use client";

import type { TGetFiscalDocumentsOutputDefault } from "@/app/api/fiscal/documents/route";
import { FiscalProblemCta } from "@/components/Fiscal/FiscalProblemCta";
import { pickPrimaryFiscalProblem } from "@/components/Fiscal/fiscal-problem-presentation";
import { StatBadge } from "@/components/ui/stat-badge";
import { TooltipProvider } from "@/components/ui/tooltip";
import { formatDateAsLocale, formatToMoney } from "@/lib/formatting";
import { appRoutes } from "@/lib/navigation/routes";
import { cn } from "@/lib/utils";
import { AlertTriangle, Globe } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { TFiscalDocumentListItem, TFiscalPermissions } from "../helpers/fiscal-document-action-state";
import { useFiscalDocumentActionRunner } from "../helpers/use-fiscal-document-action-runner";
import { FiscalDocumentActionsDropdown } from "./fiscal-document-actions-dropdown";
import { FiscalProblemChips } from "./fiscal-document-problem-chips";
import { FiscalDocumentStatusBadge } from "./fiscal-document-status-badge";

type TFiscalDocumentListRow = TGetFiscalDocumentsOutputDefault["documents"][number];

type FiscalDocumentCardProps = {
	document: TFiscalDocumentListRow;
	permissions: TFiscalPermissions;
	exceptionalPresenceEnabled: boolean;
};

function buildFiscalDocumentCardTitle(document: TFiscalDocumentListRow) {
	const parts: string[] = [document.tipo];
	if (document.serie) parts.push(`Série ${document.serie}`);
	if (document.numero) parts.push(`Nº ${document.numero}`);
	else parts.push("Sem número");
	return parts.join(" · ");
}

function buildFiscalDocumentCardSubtitle(document: TFiscalDocumentListRow) {
	const isCancelled = document.statusInterno === "CANCELADO" || document.status === "CANCELADA";
	const emissionDate = document.dataAutorizacao ?? document.dataEmissao ?? document.dataInsercao ?? document.venda?.dataVenda;
	const parts: string[] = [];

	if (document.venda?.valorTotal != null) parts.push(formatToMoney(document.venda.valorTotal));
	if (emissionDate) {
		const formattedEmissionDate = formatDateAsLocale(emissionDate.toString());
		if (formattedEmissionDate) parts.push(formattedEmissionDate);
	}
	if (document.venda?.cliente?.nome) parts.push(document.venda.cliente.nome);
	if (isCancelled && document.dataCancelamento) {
		const formattedCancelDate = formatDateAsLocale(document.dataCancelamento.toString());
		if (formattedCancelDate) parts.push(`Cancelado em ${formattedCancelDate}`);
	}

	return parts.join(" · ");
}

/** Card da lista. O titulo e um link real para a pagina do documento; a dropdown navega pelo router. */
export function FiscalDocumentCard({ document, permissions, exceptionalPresenceEnabled }: FiscalDocumentCardProps) {
	const router = useRouter();
	const detailsHref = appRoutes.fiscal.document(document.id);
	const openDetails = () => router.push(detailsHref);
	const isErrored = document.statusInterno === "ERRO" || document.statusInterno === "REJEITADO";
	const subtitle = buildFiscalDocumentCardSubtitle(document);

	return (
		<TooltipProvider>
			<div className={"bg-card flex w-full flex-col gap-2 rounded-xl border px-3 py-3 shadow-2xs transition-colors"}>
				{/* No celular os badges descem para a linha de baixo: lado a lado eles esmagavam o titulo. */}
				<div className="flex w-full flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
					<Link href={detailsHref} className="flex w-full min-w-0 flex-col gap-0.5 text-left sm:flex-1">
						<p className="text-sm font-bold tracking-tight">{buildFiscalDocumentCardTitle(document)}</p>
						{subtitle ? <p className="truncate text-xs text-muted-foreground tabular-nums">{subtitle}</p> : null}
					</Link>
					<div className="flex flex-wrap items-center gap-1.5 sm:shrink-0 sm:justify-end" onClick={(event) => event.stopPropagation()}>
						{document.ambiente === "HOMOLOGACAO" ? (
							<StatBadge
								icon={<Globe className="h-4 min-h-4 w-4 min-w-4" />}
								value="HOMOLOGAÇÃO"
								tooltipContent="Documento emitido em ambiente de testes, sem valor fiscal."
								className="bg-amber-500 text-white dark:bg-amber-600"
								valueClassName="normal-case tracking-normal"
							/>
						) : null}
						{document.presencaConsumidorDeclarada ? (
							<StatBadge
								icon={<AlertTriangle className="h-4 min-h-4 w-4 min-w-4" />}
								value="PRESENCIAL EXCEPCIONAL"
								tooltipContent="Venda com entrega declarada manualmente como operação presencial nesta tentativa."
								className="bg-amber-600 text-white dark:bg-amber-700"
								valueClassName="normal-case tracking-normal"
							/>
						) : null}
						<FiscalDocumentStatusBadge document={document} />
						<FiscalDocumentQuickActions
							document={document}
							permissions={permissions}
							exceptionalPresenceEnabled={exceptionalPresenceEnabled}
							openDetails={openDetails}
						/>
					</div>
				</div>

				{isErrored ? <FiscalDocumentCardProblems document={document} canConfigureFiscal={permissions.configurar} detailsHref={detailsHref} /> : null}
			</div>
		</TooltipProvider>
	);
}

// Problemas do card: chips + a CTA do problema principal. Sem problema estruturado, "Reenviar".
function FiscalDocumentCardProblems({
	document,
	canConfigureFiscal,
	detailsHref,
}: {
	document: TFiscalDocumentListRow;
	canConfigureFiscal: boolean;
	detailsHref: string;
}) {
	const problems = document.problemas ?? [];
	const primary = pickPrimaryFiscalProblem(problems);
	return (
		<div className="flex w-full flex-col gap-2 rounded-md bg-rose-50 px-2 py-1.5 dark:bg-rose-950/40 sm:flex-row sm:items-center sm:justify-between">
			<Link href={detailsHref} className="w-full min-w-0 text-left sm:flex-1">
				{problems.length > 0 ? (
					<FiscalProblemChips problems={problems} wrap />
				) : (
					<span className="text-[0.7rem] font-medium text-rose-700 dark:text-rose-300">Falha sem detalhe registrado. Abra o documento para reenviar.</span>
				)}
			</Link>
			{primary && !primary.resolvidoAutomaticamente ? (
				<FiscalProblemCta problem={primary} vendaId={document.vendaId} canConfigureFiscal={canConfigureFiscal} className="w-full sm:w-auto" />
			) : null}
		</div>
	);
}

function FiscalDocumentQuickActions({
	document,
	permissions,
	exceptionalPresenceEnabled,
	openDetails,
}: {
	document: TFiscalDocumentListItem;
	permissions: TFiscalPermissions;
	exceptionalPresenceEnabled: boolean;
	openDetails: () => void;
}) {
	const runner = useFiscalDocumentActionRunner({
		document,
		permissions,
		exceptionalPresenceEnabled,
	});
	return (
		<>
			<FiscalDocumentActionsDropdown document={document} runner={runner} openDetails={openDetails} />
			{runner.modals}
		</>
	);
}
