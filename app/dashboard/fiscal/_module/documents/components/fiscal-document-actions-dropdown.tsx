"use client";

import { useFiscalDeadline } from "@/components/Modals/FiscalDocument/use-fiscal-deadline";
import { Button } from "@/components/ui/button";
import {
	DropdownMenuGroup,
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
	const cancelDeadline = useFiscalDeadline(runner.actions.CANCELAR?.deadline ?? null);
	const inutilizeDeadline = useFiscalDeadline(runner.actions.INUTILIZAR?.deadline ?? null, 60_000);
	const isClosed = isFiscalDocumentClosed(document.statusInterno);

	const renderItem = (action: TResolvedFiscalAction) => {
		const Icon = action.key === "REENVIAR" && isClosed ? Zap : ACTION_ICONS[action.key];
		const label = action.key === "REENVIAR" && isClosed ? "Emitir novamente" : action.label;
		const deadline = action.key === "CANCELAR" ? cancelDeadline : action.key === "INUTILIZAR" ? inutilizeDeadline : null;
		const countdown = action.available && deadline?.label ? deadline.label : null;
		const isDestructive = DESTRUCTIVE_ACTIONS.includes(action.key);
		const isRunning = runner.pendingAction === action.key;
		return (
			<DropdownMenuItem
				key={action.key}
				disabled={!action.available || runner.isPending}
				onClick={() => runner.run(action.key)}
				variant={isDestructive ? "destructive" : "default"}
				className={cn("items-start", !action.available && "opacity-100")}
			>
				<Icon className={cn("mt-0.5", isRunning && "animate-spin")} />
				<span className="flex min-w-0 flex-col gap-0.5">
					<span className={cn("flex items-center gap-1.5", !action.available && "text-muted-foreground")}>
						{label}
						{countdown ? (
							<span
								className={cn(
									"rounded px-1 py-px text-micro tabular-nums",
									deadline?.urgent ? "bg-destructive text-destructive-foreground" : "bg-muted text-muted-foreground",
								)}
							>
								{countdown}
							</span>
						) : null}
					</span>
					{!action.available && action.reason ? (
						<span className="text-micro whitespace-normal leading-snug text-muted-foreground">{action.reason}</span>
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
			<DropdownMenuTrigger
				render={
					<Button variant="ghost" size="icon" disabled={runner.isPending} className="h-8 w-8 rounded-full" onClick={(event) => event.stopPropagation()}>
						<MoreHorizontal className="h-4 w-4" />
					</Button>
				}
			/>
			<DropdownMenuContent align="end" className="w-72">
				<DropdownMenuGroup>
					<DropdownMenuLabel>Ações</DropdownMenuLabel>
					<DropdownMenuItem onClick={openDetails}>
						<FileText className="h-4 w-4" />
						Ver detalhes
					</DropdownMenuItem>
					{document.vendaId ? (
						<DropdownMenuItem
							render={
								<Link href={appRoutes.sales.details(document.vendaId)}>
									<Receipt className="h-4 w-4" />
									Acessar venda
								</Link>
							}
						/>
					) : null}
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>{operational.map(renderItem)}</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>{downloads.map(renderItem)}</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
