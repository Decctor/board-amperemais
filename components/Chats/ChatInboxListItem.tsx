"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getChatListMessagePreview } from "@/lib/chats/chat-list-preview";
import { getWhatsappWindowDisplay } from "@/lib/chats/whatsapp-window-status";
import type { TChatInboxItem } from "@/lib/queries/chats";
import { cn } from "@/lib/utils";
import { FileText, Image as ImageIcon, Mic, Smartphone, Sparkles, Video } from "lucide-react";

type ChatInboxListItemProps = {
	chat: TChatInboxItem;
	isSelected: boolean;
	onSelect: (chatId: string) => void;
};

const MEDIA_ICONS = { IMAGEM: ImageIcon, VIDEO: Video, AUDIO: Mic, DOCUMENTO: FileText } as const;

const WINDOW_DOT_CLASS = {
	aberta: "bg-emerald-500",
	expirando: "bg-amber-500",
	expirada: "bg-destructive",
	gateway: "bg-sky-500",
} as const;

function formatRelative(date: Date | string | null) {
	if (!date) return "";
	const value = new Date(date);
	const diffMs = Date.now() - value.getTime();
	const minutes = Math.floor(diffMs / 60_000);
	if (minutes < 1) return "agora";
	if (minutes < 60) return `${minutes}min`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h`;
	const days = Math.floor(hours / 24);
	if (days < 7) return `${days}d`;
	return value.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function ChatInboxListItem({ chat, isSelected, onSelect }: ChatInboxListItemProps) {
	const preview = getChatListMessagePreview(chat.ultimaMensagem);
	const janela = getWhatsappWindowDisplay({ expiracao: chat.whatsappJanelaDataExpiracao, tipoConexao: chat.conexaoTipo });
	const MediaIcon = preview.contentType && preview.contentType !== "TEXTO" ? MEDIA_ICONS[preview.contentType] : null;
	const atendimento = chat.atendimentoAtivo;
	const naoLidas = chat.mensagensNaoLidas ?? 0;

	return (
		<button
			type="button"
			onClick={() => onSelect(chat.id)}
			className={cn(
				"flex w-full items-start gap-3 border-b border-border/60 px-3 py-3 text-left transition-colors hover:bg-muted/50",
				isSelected && "bg-muted",
			)}
		>
			<div className="relative shrink-0">
				<Avatar className="h-10 w-10">
					<AvatarFallback className="text-xs">{(chat.cliente?.nome ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
				</Avatar>
				<span
					className={cn("absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background", WINDOW_DOT_CLASS[janela.variant])}
					title={janela.label}
				/>
			</div>

			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<div className="flex items-center justify-between gap-2">
					<span className="truncate text-sm font-medium">{chat.cliente?.nome ?? "Cliente sem nome"}</span>
					<span className="shrink-0 text-[0.65rem] text-muted-foreground">{formatRelative(chat.ultimaMensagemData)}</span>
				</div>

				<div className="flex items-center justify-between gap-2">
					<span className={cn("flex min-w-0 items-center gap-1 truncate text-xs", preview.isEmpty ? "italic text-muted-foreground" : "text-muted-foreground")}>
						{preview.isOutgoing && !preview.isEmpty && <span className="shrink-0 font-medium">Você:</span>}
						{MediaIcon && <MediaIcon className="h-3 w-3 shrink-0" />}
						<span className="truncate">{preview.body}</span>
					</span>
					{naoLidas > 0 && (
						<span className="shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[0.6rem] font-bold text-primary-foreground">
							{naoLidas > 99 ? "99+" : naoLidas}
						</span>
					)}
				</div>

				<div className="flex items-center gap-1.5 text-[0.65rem] text-muted-foreground">
					{atendimento?.responsavelTipo === "USUARIO" && (
						<>
							<Avatar className="h-3.5 w-3.5">
								{atendimento.responsavelUsuario?.avatarUrl && <AvatarImage src={atendimento.responsavelUsuario.avatarUrl} />}
								<AvatarFallback className="text-[0.5rem]">{(atendimento.responsavelUsuario?.nome ?? "?").slice(0, 1)}</AvatarFallback>
							</Avatar>
							<span className="truncate">{atendimento.responsavelUsuario?.nome ?? "Atribuído"}</span>
						</>
					)}
					{atendimento?.responsavelTipo === "AGENTE" && (
						<span className="flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5">
							<Sparkles className="h-3 w-3" /> Automação
						</span>
					)}
					{atendimento?.responsavelTipo === "EXTERNO" && (
						<span className="flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5">
							<Smartphone className="h-3 w-3" /> Telefone
						</span>
					)}
					{(!atendimento || atendimento.responsavelTipo === "NAO_ATRIBUIDO") && (
						<span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 font-medium text-amber-600 dark:text-amber-400">Livre</span>
					)}
				</div>
			</div>
		</button>
	);
}
