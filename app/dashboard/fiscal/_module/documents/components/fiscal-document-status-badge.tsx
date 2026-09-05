"use client";

import { StatBadge } from "@/components/ui/stat-badge";
import { cn } from "@/lib/utils";
import type { TFiscalDocumentLifecycleStatusEnum } from "@/schemas/enums";
import { AlertTriangle, CircleCheck, CircleX, Clock } from "lucide-react";
import { FISCAL_DOCUMENT_STATUS_LABELS, FISCAL_LIFECYCLE_STATUS_LABELS, FISCAL_LIFECYCLE_STATUS_STYLES } from "../../shared/fiscal-labels";
import type { TFiscalDocumentListItem } from "../helpers/fiscal-document-action-state";

export function FiscalDocumentStatusIcon({ statusInterno }: { statusInterno: TFiscalDocumentLifecycleStatusEnum }) {
	switch (statusInterno) {
		case "AUTORIZADO":
			return <CircleCheck className="h-4 w-4 min-h-4 min-w-4" />;
		case "REJEITADO":
		case "ERRO":
			return <AlertTriangle className="h-4 w-4 min-h-4 min-w-4" />;
		case "CANCELADO":
		case "INUTILIZADO":
			return <CircleX className="h-4 w-4 min-h-4 min-w-4" />;
		default:
			return <Clock className="h-4 w-4 min-h-4 min-w-4" />;
	}
}

function buildFiscalDocumentStatusTooltip(document: TFiscalDocumentListItem) {
	const internal = FISCAL_LIFECYCLE_STATUS_LABELS[document.statusInterno];
	const sefaz = FISCAL_DOCUMENT_STATUS_LABELS[document.status];
	if (internal === sefaz || (document.statusInterno === "AUTORIZADO" && document.status === "AUTORIZADA")) {
		return "Documento autorizado pela SEFAZ.";
	}
	return `Status interno: ${internal} · SEFAZ: ${sefaz}`;
}

/** O mesmo selo de status no card da lista e no cabecalho do detalhe. Precisa de um `TooltipProvider` acima. */
export function FiscalDocumentStatusBadge({ document }: { document: TFiscalDocumentListItem }) {
	return (
		<StatBadge
			icon={<FiscalDocumentStatusIcon statusInterno={document.statusInterno} />}
			value={FISCAL_LIFECYCLE_STATUS_LABELS[document.statusInterno]}
			tooltipContent={buildFiscalDocumentStatusTooltip(document)}
			className={cn(FISCAL_LIFECYCLE_STATUS_STYLES[document.statusInterno])}
			valueClassName="normal-case tracking-normal"
		/>
	);
}
