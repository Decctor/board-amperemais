"use client";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getErrorMessage } from "@/lib/errors";
import { PRIORITY_META, STATUS_META } from "./attendance-meta";
import { cn } from "@/lib/utils";
import { updateChatAssignment } from "@/lib/mutations/chats";
import { useChatTransferTargets, type TChatAttendance } from "@/lib/queries/chats";
import type { TChatAssignmentPriority, TChatAssignmentStatus } from "@/schemas/enums";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, LogOut, Smartphone, Sparkles, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type ChatAssignmentActionsProps = {
	chatId: string;
	atendimento: TChatAttendance;
	currentUserId: string;
	/**
	 * Header da thread: só posse e roteamento (assumir/liberar/transferir). Status e
	 * prioridade vivem no painel de contexto — são decisões, não reflexos, e no header
	 * competiriam com o nome do cliente por atenção.
	 */
	compact?: boolean;
};

export function ChatAssignmentActions({ chatId, atendimento, currentUserId, compact = false }: ChatAssignmentActionsProps) {
	const queryClient = useQueryClient();
	const [transferMenuOpen, setTransferMenuOpen] = useState(false);
	const { data: transferTargets } = useChatTransferTargets({ enabled: transferMenuOpen });

	const isOwner = atendimento?.responsavelTipo === "USUARIO" && atendimento.responsavelUsuarioId === currentUserId;
	const isFree = !atendimento || atendimento.responsavelTipo === "NAO_ATRIBUIDO";

	const { mutate, isPending } = useMutation({
		mutationFn: updateChatAssignment,
		onSuccess: (data) => {
			toast.success(data.message);
			void queryClient.invalidateQueries({ queryKey: ["chat-messages", chatId] });
			void queryClient.invalidateQueries({ queryKey: ["chats"] });
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	// O rótulo diz de quem se está assumindo: "assumir" de uma fila vazia e "tomar da IA"
	// são ações com consequências diferentes para quem clica.
	const assumeLabel = isFree
		? "ASSUMIR"
		: atendimento?.responsavelTipo === "AGENTE"
			? "ASSUMIR DA IA"
			: atendimento?.responsavelTipo === "EXTERNO"
				? "ASSUMIR DO TELEFONE"
				: "ASSUMIR";

	return (
		<div className={cn(compact ? "flex flex-wrap items-center gap-1.5" : "flex flex-col gap-2")}>
			{!isOwner && (
				<Button
					size="sm"
					className={cn("gap-1 text-[11px] font-extrabold uppercase tracking-[0.08em]", !compact && "col-span-2 w-full")}
					disabled={isPending}
					onClick={() => mutate({ acao: "assumir", chatId })}
				>
					<UserPlus className="h-3 w-3" />
					{assumeLabel}
				</Button>
			)}

			{isOwner && (
				<Button
					size="sm"
					variant="outline"
					className={cn("gap-1 text-[11px]", !compact && "col-span-2 w-full")}
					disabled={isPending}
					onClick={() => mutate({ acao: "liberar", chatId })}
				>
					<LogOut className="h-3 w-3" />
					LIBERAR
				</Button>
			)}

			<DropdownMenu open={transferMenuOpen} onOpenChange={setTransferMenuOpen}>
				<DropdownMenuTrigger asChild>
					<Button
						size="sm"
						variant="outline"
						className={cn("gap-1 text-[11px] font-extrabold uppercase tracking-[0.08em]", !compact && "col-span-2 w-full")}
						disabled={isPending}
					>
						TRANSFERIR
						<ChevronDown className="h-3 w-3 opacity-60" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="max-h-64 overflow-y-auto">
					{(transferTargets ?? []).length === 0 && <DropdownMenuItem disabled>Nenhum usuário disponível</DropdownMenuItem>}
					{(transferTargets ?? []).map((target) => (
						<DropdownMenuItem key={target.id} onClick={() => mutate({ acao: "transferir", chatId, usuarioDestinoId: target.id })}>
							{target.nome}
						</DropdownMenuItem>
					))}
				</DropdownMenuContent>
			</DropdownMenu>

			{!compact && (
				<div className="col-span-2 mt-1 border-t border-border pt-3">
					<span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground">Detalhes do atendimento</span>
				</div>
			)}

			{!compact && (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button size="sm" variant="outline" className="w-full justify-between gap-2 px-2.5 text-xs" disabled={isPending}>
							<span className="text-muted-foreground">Status</span>
							<span className="flex min-w-0 items-center gap-1.5">
								{atendimento && <span className={cn("h-2 w-2 shrink-0 rounded-full", STATUS_META[atendimento.status].dot)} />}
								<span className="truncate">{atendimento ? STATUS_META[atendimento.status].label : "Definir"}</span>
								<ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
							</span>
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						{(Object.keys(STATUS_META) as TChatAssignmentStatus[]).map((status) => {
							const StatusIcon = STATUS_META[status].icon;
							return (
								<DropdownMenuItem key={status} className="gap-2" onClick={() => mutate({ acao: "alterar_status", chatId, status })}>
									<StatusIcon className={cn("h-3.5 w-3.5", STATUS_META[status].dot.replace("bg-", "text-"))} />
									{STATUS_META[status].label}
								</DropdownMenuItem>
							);
						})}
					</DropdownMenuContent>
				</DropdownMenu>
			)}

			{!compact && (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button size="sm" variant="outline" className="w-full justify-between gap-2 px-2.5 text-xs" disabled={isPending}>
							<span className="text-muted-foreground">Prioridade</span>
							<span className="flex min-w-0 items-center gap-1">
								<span className="truncate">{atendimento?.prioridade ? PRIORITY_META[atendimento.prioridade].label : "Nenhuma"}</span>
								<ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
							</span>
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onClick={() => mutate({ acao: "alterar_prioridade", chatId, prioridade: null })}>Sem prioridade</DropdownMenuItem>
						{(Object.keys(PRIORITY_META) as TChatAssignmentPriority[]).map((prioridade) => (
							<DropdownMenuItem key={prioridade} onClick={() => mutate({ acao: "alterar_prioridade", chatId, prioridade })}>
								{PRIORITY_META[prioridade].label}
							</DropdownMenuItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>
			)}

			{atendimento?.responsavelTipo === "AGENTE" && (
				<span
					className={cn("flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground", !compact && "col-span-2 w-fit")}
				>
					<Sparkles className="h-3 w-3" /> Automação
				</span>
			)}
			{atendimento?.responsavelTipo === "EXTERNO" && (
				<span
					className={cn("flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground", !compact && "col-span-2 w-fit")}
				>
					<Smartphone className="h-3 w-3" /> Atendido pelo telefone
				</span>
			)}
		</div>
	);
}
