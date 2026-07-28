"use client";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { updateChatAssignment } from "@/lib/mutations/chats";
import { useChatTransferTargets, type TChatAttendance } from "@/lib/queries/chats";
import type { TChatAssignmentPriority, TChatAssignmentStatus } from "@/schemas/enums";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, CircleCheck, CircleCheckBig, CircleDot, CircleSlash, Clock, LogOut, MessageCircle, PauseCircle, Smartphone, Sparkles, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/**
 * Cada estado tem cor e forma. A cor dá a leitura periférica (verde = fim, ouro = pede
 * ação, cinza = em espera); o ícone garante que a distinção sobreviva a daltonismo e a
 * telas ruins — dois passos de verde lado a lado seriam indistinguíveis só por matiz.
 * Mapeamento documentado em DESIGN.md §2.
 */
const STATUS_META: Record<TChatAssignmentStatus, { label: string; dot: string; icon: typeof CircleDot }> = {
	ABERTO: { label: "Aberto", dot: "bg-brand", icon: CircleDot },
	EM_ATENDIMENTO: { label: "Em atendimento", dot: "bg-primary", icon: MessageCircle },
	AGUARDANDO_CLIENTE: { label: "Aguardando cliente", dot: "bg-muted-foreground/50", icon: Clock },
	AGUARDANDO_INTERNO: { label: "Aguardando interno", dot: "bg-muted-foreground/50", icon: PauseCircle },
	RESOLVIDO: { label: "Resolvido", dot: "bg-success", icon: CircleCheck },
	ENCERRADO: { label: "Encerrado", dot: "bg-success-strong", icon: CircleCheckBig },
	CANCELADO: { label: "Cancelado", dot: "bg-destructive", icon: CircleSlash },
};

const STATUS_LABELS: Record<TChatAssignmentStatus, string> = {
	ABERTO: STATUS_META.ABERTO.label,
	EM_ATENDIMENTO: STATUS_META.EM_ATENDIMENTO.label,
	AGUARDANDO_CLIENTE: STATUS_META.AGUARDANDO_CLIENTE.label,
	AGUARDANDO_INTERNO: STATUS_META.AGUARDANDO_INTERNO.label,
	RESOLVIDO: STATUS_META.RESOLVIDO.label,
	ENCERRADO: STATUS_META.ENCERRADO.label,
	CANCELADO: STATUS_META.CANCELADO.label,
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
						<DropdownMenuItem key={target.id} onClick={() => mutate({ acao: "transferir", chatId, usuarioDestinoId: target.id })}>
							{target.nome}
						</DropdownMenuItem>
					))}
				</DropdownMenuContent>
			</DropdownMenu>

			{!compact && (
				<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button size="sm" variant="ghost" className="gap-1 text-xs" disabled={isPending}>
								{atendimento ? STATUS_LABELS[atendimento.status] : "Status"}
								<ChevronDown className="h-3 w-3 opacity-60" />
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
			)}

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
