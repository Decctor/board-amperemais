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

/**
 * Só os estados acionáveis recebem cor. Numa inbox com dezenas de conversas, colorir
 * também o estado saudável faz quatro sinais competirem e nenhum se destacar — "janela
 * aberta" e "sessão do gateway" são o normal, e normal não pede atenção.
 *
 * O âmbar é o único sinal quente da paleta; o vermelho é o destrutivo. Nada de
 * emerald/sky ad-hoc: a regra de fechamento da paleta do DESIGN.md não abre exceção.
 */
const WINDOW_DOT_CLASS = {
	aberta: "bg-muted-foreground/40",
	gateway: "bg-muted-foreground/40",
	expirando: "bg-brand",
	expirada: "bg-destructive",
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
			aria-current={isSelected ? "true" : undefined}
			className={cn(
				"flex w-full items-start gap-3 border-b border-border/60 px-3 py-3 text-left transition-colors",
				"hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
				isSelected && "bg-muted",
			)}
		>
			<div className="relative shrink-0">
				<Avatar className="h-10 w-10">
					<AvatarFallback className="text-xs">{(chat.cliente?.nome ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
				</Avatar>
				{/* O ponto sozinho seria informação só por cor (WCAG 1.4.1); o rótulo em
				    sr-only entrega o mesmo dado a leitores de tela. */}
				<span className={cn("absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background", WINDOW_DOT_CLASS[janela.variant])} />
				<span className="sr-only">{janela.label}</span>
			</div>

			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<div className="flex items-center justify-between gap-2">
					<span className="truncate text-sm font-medium">{chat.cliente?.nome ?? "Cliente sem nome"}</span>
					<span className="shrink-0 text-[11px] text-muted-foreground">{formatRelative(chat.ultimaMensagemData)}</span>
				</div>

				<div className="flex items-center justify-between gap-2">
					<span className={cn("flex min-w-0 items-center gap-1 truncate text-xs", preview.isEmpty ? "italic text-muted-foreground" : "text-muted-foreground")}>
						{preview.isOutgoing && !preview.isEmpty && <span className="shrink-0 font-medium">Você:</span>}
						{MediaIcon && <MediaIcon className="h-3 w-3 shrink-0" />}
						<span className="truncate">{preview.body}</span>
					</span>
					{naoLidas > 0 && (
						<span className="shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[11px] font-bold text-primary-foreground">
							{naoLidas > 99 ? "99+" : naoLidas}
						</span>
					)}
				</div>

				<div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
					{atendimento?.responsavelTipo === "USUARIO" && (
						<>
							<Avatar className="h-3.5 w-3.5">
								{atendimento.responsavelUsuario?.avatarUrl && <AvatarImage src={atendimento.responsavelUsuario.avatarUrl} />}
								<AvatarFallback className="text-[10px]">{(atendimento.responsavelUsuario?.nome ?? "?").slice(0, 1)}</AvatarFallback>
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
					{/* "Livre" é disponibilidade, não alerta. O âmbar já significa "janela
					    expirando"; duplicar a cor apagaria os dois sentidos. */}
					{(!atendimento || atendimento.responsavelTipo === "NAO_ATRIBUIDO") && (
						<span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 font-bold text-primary">Livre</span>
					)}
				</div>
			</div>
		</button>
	);
}
