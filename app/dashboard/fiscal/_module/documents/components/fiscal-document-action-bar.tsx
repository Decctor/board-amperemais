"use client";

import { useFiscalDeadline } from "@/components/Modals/FiscalDocument/use-fiscal-deadline";
import { BlockedActions } from "@/components/ui/blocked-actions";
import { Button, type ButtonProps } from "@/components/ui/button";
import type { TFiscalDocumentActionKey } from "@/lib/fiscal/document-actions";
import { cn } from "@/lib/utils";
import { ArrowLeftRight, CircleX, FileIcon, FileText, PencilIcon, RefreshCcw, Send, Zap, type LucideIcon } from "lucide-react";
import {
	FISCAL_ACTION_ORDER,
	FISCAL_OPERATIONAL_ACTIONS,
	isFiscalDocumentClosed,
	type TFiscalDocumentListItem,
	type TResolvedFiscalAction,
} from "../helpers/fiscal-document-action-state";
import type { TFiscalDocumentActionRunner } from "../helpers/use-fiscal-document-action-runner";

const ACTION_ICONS: Record<TFiscalDocumentActionKey, LucideIcon> = {
	CANCELAR: CircleX,
	CARTA_CORRECAO: PencilIcon,
	INUTILIZAR: CircleX,
	DEVOLUCAO: ArrowLeftRight,
	REENVIAR: Send,
	SINCRONIZAR: RefreshCcw,
	BAIXAR_XML: FileIcon,
	BAIXAR_PDF: FileText,
};

type FiscalDocumentActionBarProps = {
	document: TFiscalDocumentListItem;
	runner: TFiscalDocumentActionRunner;
};

/**
 * Barra de acoes do modal de detalhes. Acao disponivel vira botao; indisponivel vira botao
 * desabilitado com o motivo escrito ao lado (nao so em tooltip). Cancelar com prazo mostra o
 * contador e, abaixo de 5 min, vira destaque. Sem cancelamento, a devolucao sobe para primaria.
 */
export function FiscalDocumentActionBar({ document, runner }: FiscalDocumentActionBarProps) {
	const { actions } = runner;
	const cancelDeadline = useFiscalDeadline(actions.CANCELAR?.deadline ?? null);
	const inutilizeDeadline = useFiscalDeadline(actions.INUTILIZAR?.deadline ?? null, 60_000);
	const isClosed = isFiscalDocumentClosed(document.statusInterno);
	const returnIsPrimary =
		!!actions.CANCELAR && !actions.CANCELAR.available && actions.CANCELAR.alternatives.includes("DEVOLUCAO") && !!actions.DEVOLUCAO?.available;

	const ordered = FISCAL_ACTION_ORDER.map((key) => actions[key]).filter((action): action is TResolvedFiscalAction => !!action);
	const available = ordered.filter((action) => action.available);
	// So explicamos o bloqueio das acoes operacionais; download indisponivel nao e decisao do operador.
	const unavailable = ordered.filter((action) => !action.available && FISCAL_OPERATIONAL_ACTIONS.includes(action.key));

	const variantFor = (action: TResolvedFiscalAction): ButtonProps["variant"] => {
		if (action.key === "CANCELAR") return cancelDeadline.urgent ? "destructive" : "outline";
		if (action.key === "INUTILIZAR") return "outline";
		if (action.key === "DEVOLUCAO" && returnIsPrimary) return "default";
		if (action.key === "REENVIAR") return "default";
		return "outline";
	};

	const labelFor = (action: TResolvedFiscalAction) => (action.key === "REENVIAR" && isClosed ? "Emitir novamente" : action.label);

	const countdownFor = (action: TResolvedFiscalAction) => {
		if (action.key === "CANCELAR") return cancelDeadline;
		if (action.key === "INUTILIZAR") return inutilizeDeadline;
		return null;
	};

	// Devolucao primaria vem primeiro; cancelar urgente tambem.
	const sortedAvailable = [...available].sort((a, b) => weight(a) - weight(b));
	function weight(action: TResolvedFiscalAction) {
		if (action.key === "DEVOLUCAO" && returnIsPrimary) return 0;
		if (action.key === "CANCELAR" && cancelDeadline.urgent) return 0;
		if (action.key === "REENVIAR") return 1;
		if (action.key === "BAIXAR_XML" || action.key === "BAIXAR_PDF") return 9;
		return 5;
	}

	return (
		<div className="flex w-full flex-col gap-2">
			<div className="flex flex-wrap items-center gap-2">
				{sortedAvailable.map((action) => {
					const Icon = action.key === "REENVIAR" && isClosed ? Zap : ACTION_ICONS[action.key];
					const deadline = countdownFor(action);
					const isRunning = runner.pendingAction === action.key;
					const destructiveText = (action.key === "CANCELAR" && !cancelDeadline.urgent) || action.key === "INUTILIZAR";
					return (
						<Button
							key={action.key}
							type="button"
							size="sm"
							variant={variantFor(action)}
							disabled={runner.isPending}
							onClick={() => runner.run(action.key)}
							className={cn("gap-1.5", destructiveText && "border-destructive/40 text-destructive hover:text-destructive")}
						>
							<Icon className={cn("h-4 w-4", isRunning && "animate-spin")} />
							{labelFor(action)}
							{deadline?.label ? (
								<span
									className={cn(
										"ml-0.5 rounded px-1 py-px text-micro tabular-nums",
										deadline.urgent ? "bg-destructive-foreground/20 text-destructive-foreground" : "bg-muted text-muted-foreground",
									)}
								>
									{deadline.label}
								</span>
							) : null}
						</Button>
					);
				})}
			</div>
			{unavailable.length > 0 ? (
				<BlockedActions.Root>
					{unavailable.map((action) => (
						<BlockedActions.Item key={action.key} reason={action.reason} blockedBy={action.permissionBlocked ? "permission" : "state"}>
							{labelFor(action)}
						</BlockedActions.Item>
					))}
				</BlockedActions.Root>
			) : null}
		</div>
	);
}
