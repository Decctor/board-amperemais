"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getErrorMessage } from "@/lib/errors";
import { updateChatAssignment } from "@/lib/mutations/chats";
import { useChatTransferTargets, type TChatAttendance } from "@/lib/queries/chats";
import type { TChatAssignmentPriority, TChatAssignmentStatus } from "@/schemas/enums";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, LogOut, Smartphone, Sparkles, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const STATUS_LABELS: Record<TChatAssignmentStatus, string> = {
	ABERTO: "Aberto",
	EM_ATENDIMENTO: "Em atendimento",
	AGUARDANDO_CLIENTE: "Aguardando cliente",
	AGUARDANDO_INTERNO: "Aguardando interno",
	RESOLVIDO: "Resolvido",
	ENCERRADO: "Encerrado",
	CANCELADO: "Cancelado",
};

const PRIORITY_LABELS: Record<TChatAssignmentPriority, string> = {
	BAIXA: "Baixa",
	MEDIA: "Média",
	ALTA: "Alta",
	URGENTE: "Urgente",
};

type ChatAssignmentActionsProps = {
	chatId: string;
	atendimento: TChatAttendance;
	currentUserId: string;
};

export function ChatAssignmentActions({ chatId, atendimento, currentUserId }: ChatAssignmentActionsProps) {
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
		<div className="flex flex-wrap items-center gap-1.5">
			{!isOwner && (
				<Button size="sm" className="gap-1 text-[11px] font-extrabold uppercase tracking-[0.08em]" disabled={isPending} onClick={() => mutate({ acao: "assumir", chatId })}>
					<UserPlus className="h-3 w-3" />
					{assumeLabel}
				</Button>
			)}

			{isOwner && (
				<Button
					size="sm"
					variant="outline"
					className="gap-1 text-[11px]"
					disabled={isPending}
					onClick={() => mutate({ acao: "liberar", chatId })}
				>
					<LogOut className="h-3 w-3" />
					LIBERAR
				</Button>
			)}

			<DropdownMenu open={transferMenuOpen} onOpenChange={setTransferMenuOpen}>
				<DropdownMenuTrigger asChild>
					<Button size="sm" variant="outline" className="gap-1 text-[11px] font-extrabold uppercase tracking-[0.08em]" disabled={isPending}>
						TRANSFERIR
						<ChevronDown className="h-3 w-3 opacity-60" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="max-h-64 overflow-y-auto">
					{(transferTargets ?? []).length === 0 && <DropdownMenuItem disabled>Nenhum usuário disponível</DropdownMenuItem>}
					{(transferTargets ?? []).map((target) => (
						<DropdownMenuItem key={target.id} className="gap-2" onClick={() => mutate({ acao: "transferir", chatId, usuarioDestinoId: target.id })}>
							<Avatar className="h-5 w-5">
								{target.avatarUrl && <AvatarImage src={target.avatarUrl} />}
								<AvatarFallback className="text-[10px]">{target.nome.slice(0, 1)}</AvatarFallback>
							</Avatar>
							{target.nome}
						</DropdownMenuItem>
					))}
				</DropdownMenuContent>
			</DropdownMenu>

			<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button size="sm" variant="ghost" className="gap-1 text-xs" disabled={isPending}>
								{atendimento ? STATUS_LABELS[atendimento.status] : "Status"}
								<ChevronDown className="h-3 w-3 opacity-60" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							{(Object.keys(STATUS_LABELS) as TChatAssignmentStatus[]).map((status) => (
								<DropdownMenuItem key={status} onClick={() => mutate({ acao: "alterar_status", chatId, status })}>
									{STATUS_LABELS[status]}
								</DropdownMenuItem>
							))}
						</DropdownMenuContent>
			</DropdownMenu>

			<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button size="sm" variant="ghost" className="gap-1 text-xs" disabled={isPending}>
								{atendimento?.prioridade ? PRIORITY_LABELS[atendimento.prioridade] : "Prioridade"}
								<ChevronDown className="h-3 w-3 opacity-60" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onClick={() => mutate({ acao: "alterar_prioridade", chatId, prioridade: null })}>Sem prioridade</DropdownMenuItem>
							{(Object.keys(PRIORITY_LABELS) as TChatAssignmentPriority[]).map((prioridade) => (
								<DropdownMenuItem key={prioridade} onClick={() => mutate({ acao: "alterar_prioridade", chatId, prioridade })}>
									{PRIORITY_LABELS[prioridade]}
								</DropdownMenuItem>
							))}
						</DropdownMenuContent>
			</DropdownMenu>

			{atendimento?.responsavelTipo === "AGENTE" && (
				<span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
					<Sparkles className="h-3 w-3" /> Automação
				</span>
			)}
			{atendimento?.responsavelTipo === "EXTERNO" && (
				<span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
					<Smartphone className="h-3 w-3" /> Atendido pelo telefone
				</span>
			)}
		</div>
	);
}

export { STATUS_LABELS, PRIORITY_LABELS };
