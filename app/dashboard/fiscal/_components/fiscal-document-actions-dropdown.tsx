"use client";

import { useFiscalDeadline } from "@/components/Modals/FiscalDocument/use-fiscal-deadline";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TFiscalDocumentActionKey } from "@/lib/fiscal/document-actions";
import { appRoutes } from "@/lib/navigation/routes";
import { cn } from "@/lib/utils";
import {
	ArrowLeftRight,
	CircleX,
	FileIcon,
	FileText,
	MoreHorizontal,
	PencilIcon,
	Receipt,
	RefreshCcw,
	Send,
	Zap,
	type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import {
	FISCAL_ACTION_ORDER,
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

const DESTRUCTIVE_ACTIONS: TFiscalDocumentActionKey[] = ["CANCELAR", "INUTILIZAR"];

type FiscalDocumentActionsDropdownProps = {
	document: TFiscalDocumentListItem;
	runner: TFiscalDocumentActionRunner;
	openDetails: () => void;
};

/**
 * Menu de acoes do card, alimentado por `acoes`. Item indisponivel fica desabilitado com o motivo
 * em uma linha apagada logo abaixo do rotulo — o operador entende sem abrir o documento.
 */
export function FiscalDocumentActionsDropdown({ document, runner, openDetails }: FiscalDocumentActionsDropdownProps) {
	const cancelDeadline = useFiscalDeadline(runner.actions.CANCELAR?.prazoLimite ?? null);
	const inutilizeDeadline = useFiscalDeadline(runner.actions.INUTILIZAR?.prazoLimite ?? null, 60_000);
	const isClosed = isFiscalDocumentClosed(document.statusInterno);

	const renderItem = (action: TResolvedFiscalAction) => {
		const Icon = action.acao === "REENVIAR" && isClosed ? Zap : ACTION_ICONS[action.acao];
		const label = action.acao === "REENVIAR" && isClosed ? "Emitir novamente" : action.label;
		const deadline = action.acao === "CANCELAR" ? cancelDeadline : action.acao === "INUTILIZAR" ? inutilizeDeadline : null;
		const countdown = action.disponivel && deadline?.label ? deadline.label : null;
		const isDestructive = DESTRUCTIVE_ACTIONS.includes(action.acao);
		const isRunning = runner.pendingAction === action.acao;
		return (
			<DropdownMenuItem
				key={action.acao}
				disabled={!action.disponivel || runner.isPending}
				onClick={() => runner.run(action.acao)}
				variant={isDestructive ? "destructive" : "default"}
				className={cn("items-start", !action.disponivel && "opacity-100")}
			>
				<Icon className={cn("mt-0.5", isRunning && "animate-spin")} />
				<span className="flex min-w-0 flex-col gap-0.5">
					<span className={cn("flex items-center gap-1.5", !action.disponivel && "text-muted-foreground")}>
						{label}
						{countdown ? (
							<span
								className={cn(
									"rounded px-1 py-px text-[10px] font-semibold tabular-nums",
									deadline?.urgent ? "bg-destructive text-destructive-foreground" : "bg-muted text-muted-foreground",
								)}
							>
								{countdown}
							</span>
						) : null}
					</span>
					{!action.disponivel && action.motivo ? (
						<span className="whitespace-normal text-[11px] leading-snug text-muted-foreground">{action.motivo}</span>
					) : null}
				</span>
			</DropdownMenuItem>
		);
	};

	const operational = FISCAL_ACTION_ORDER.filter((key) => key !== "BAIXAR_XML" && key !== "BAIXAR_PDF")
		.map((key) => runner.actions[key])
		.filter((action): action is TResolvedFiscalAction => !!action);
	const downloads = (["BAIXAR_XML", "BAIXAR_PDF"] as const)
		.map((key) => runner.actions[key])
		.filter((action): action is TResolvedFiscalAction => !!action);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon" disabled={runner.isPending} className="h-8 w-8 rounded-full" onClick={(event) => event.stopPropagation()}>
					<MoreHorizontal className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-72">
				<DropdownMenuLabel>Ações</DropdownMenuLabel>
				<DropdownMenuItem onClick={openDetails}>
					<FileText className="h-4 w-4" />
					Ver detalhes
				</DropdownMenuItem>
				{document.vendaId ? (
					<DropdownMenuItem asChild>
						<Link href={appRoutes.sales.details(document.vendaId)}>
							<Receipt className="h-4 w-4" />
							Acessar venda
						</Link>
					</DropdownMenuItem>
				) : null}
				<DropdownMenuSeparator />
				{operational.map(renderItem)}
				<DropdownMenuSeparator />
				{downloads.map(renderItem)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
