"use client";

import { useFiscalDeadline } from "@/components/Modals/FiscalDocument/use-fiscal-deadline";
import { Button, type ButtonProps } from "@/components/ui/button";
import type { TFiscalDocumentActionKey } from "@/lib/fiscal/document-actions";
import { appRoutes } from "@/lib/navigation/routes";
import { cn } from "@/lib/utils";
import { ArrowLeftRight, Ban, CircleX, FileIcon, FileText, Lock, PencilIcon, Receipt, RefreshCcw, Send, Zap, type LucideIcon } from "lucide-react";
import Link from "next/link";
import {
	FISCAL_ACTION_ORDER,
	FISCAL_OPERATIONAL_ACTIONS,
	isFiscalDocumentClosed,
	type TFiscalDocumentListItem,
	type TResolvedFiscalAction,
} from "./fiscal-document-action-state";
import type { TFiscalDocumentActionRunner } from "./use-fiscal-document-action-runner";

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
	const cancelDeadline = useFiscalDeadline(actions.CANCELAR?.prazoLimite ?? null);
	const inutilizeDeadline = useFiscalDeadline(actions.INUTILIZAR?.prazoLimite ?? null, 60_000);
	const isClosed = isFiscalDocumentClosed(document.statusInterno);
	const returnIsPrimary =
		!!actions.CANCELAR && !actions.CANCELAR.disponivel && actions.CANCELAR.alternativas.includes("DEVOLUCAO") && !!actions.DEVOLUCAO?.disponivel;

	const ordered = FISCAL_ACTION_ORDER.map((key) => actions[key]).filter((action): action is TResolvedFiscalAction => !!action);
	const available = ordered.filter((action) => action.disponivel);
	// So explicamos o bloqueio das acoes operacionais; download indisponivel nao e decisao do operador.
	const unavailable = ordered.filter((action) => !action.disponivel && FISCAL_OPERATIONAL_ACTIONS.includes(action.acao));

	const variantFor = (action: TResolvedFiscalAction): ButtonProps["variant"] => {
		if (action.acao === "CANCELAR") return cancelDeadline.urgent ? "destructive" : "outline";
		if (action.acao === "INUTILIZAR") return "outline";
		if (action.acao === "DEVOLUCAO" && returnIsPrimary) return "default";
		if (action.acao === "REENVIAR") return "default";
		return "outline";
	};

	const labelFor = (action: TResolvedFiscalAction) => (action.acao === "REENVIAR" && isClosed ? "Emitir novamente" : action.label);

	const countdownFor = (action: TResolvedFiscalAction) => {
		if (action.acao === "CANCELAR") return cancelDeadline;
		if (action.acao === "INUTILIZAR") return inutilizeDeadline;
		return null;
	};

	// Devolucao primaria vem primeiro; cancelar urgente tambem.
	const sortedAvailable = [...available].sort((a, b) => weight(a) - weight(b));
	function weight(action: TResolvedFiscalAction) {
		if (action.acao === "DEVOLUCAO" && returnIsPrimary) return 0;
		if (action.acao === "CANCELAR" && cancelDeadline.urgent) return 0;
		if (action.acao === "REENVIAR") return 1;
		if (action.acao === "BAIXAR_XML" || action.acao === "BAIXAR_PDF") return 9;
		return 5;
	}

	return (
		<div className="flex w-full flex-col gap-2">
			<div className="flex flex-wrap items-center gap-2">
				{sortedAvailable.map((action) => {
					const Icon = action.acao === "REENVIAR" && isClosed ? Zap : ACTION_ICONS[action.acao];
					const deadline = countdownFor(action);
					const isRunning = runner.pendingAction === action.acao;
					const destructiveText = (action.acao === "CANCELAR" && !cancelDeadline.urgent) || action.acao === "INUTILIZAR";
					return (
						<Button
							key={action.acao}
							type="button"
							size="sm"
							variant={variantFor(action)}
							disabled={runner.isPending}
							onClick={() => runner.run(action.acao)}
							className={cn("gap-1.5", destructiveText && "border-destructive/40 text-destructive hover:text-destructive")}
						>
							<Icon className={cn("h-4 w-4", isRunning && "animate-spin")} />
							{labelFor(action)}
							{deadline?.label ? (
								<span
									className={cn(
										"ml-0.5 rounded px-1 py-px text-[10px] font-semibold tabular-nums",
										deadline.urgent ? "bg-destructive-foreground/20 text-destructive-foreground" : "bg-muted text-muted-foreground",
									)}
								>
									{deadline.label}
								</span>
							) : null}
						</Button>
					);
				})}
				{document.vendaId ? (
					<Button type="button" size="sm" variant="ghost" asChild>
						<Link href={appRoutes.sales.details(document.vendaId)}>
							<Receipt className="h-4 w-4" />
							Acessar venda
						</Link>
					</Button>
				) : null}
			</div>
			{unavailable.length > 0 ? (
				<div className="flex flex-col gap-1 rounded-lg border border-dashed bg-muted/10 px-2.5 py-2">
					{unavailable.map((action) => (
						<div key={action.acao} className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
							<Button type="button" size="xs" variant="outline" disabled className="h-6 gap-1 px-2 text-[11px] opacity-60">
								{action.permissionBlocked ? <Lock className="h-3 w-3" /> : <Ban className="h-3 w-3" />}
								{labelFor(action)}
							</Button>
							<span className="text-[11px] leading-snug text-muted-foreground">{action.motivo}</span>
						</div>
					))}
				</div>
			) : null}
		</div>
	);
}
