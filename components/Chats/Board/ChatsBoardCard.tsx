"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getChatListMessagePreview } from "@/lib/chats/chat-list-preview";
import { getWhatsappWindowDisplay } from "@/lib/chats/whatsapp-window-status";
import type { TChatBoardCard } from "@/lib/queries/chats-board";
import { cn } from "@/lib/utils";
import { FileText, Image as ImageIcon, Mic, Smartphone, Sparkles, Video } from "lucide-react";
import { CHAT_PRIORITY_LABEL, CHAT_PRIORITY_PILL_CLASS, CHAT_WINDOW_DOT_CLASS } from "./config";

const MEDIA_ICONS = { IMAGEM: ImageIcon, VIDEO: Video, AUDIO: Mic, DOCUMENTO: FileText } as const;

function formatRelative(date: Date | string | null | undefined) {
	if (!date) return "";
	const value = new Date(date);
	const minutes = Math.floor((Date.now() - value.getTime()) / 60_000);
	if (minutes < 1) return "agora";
	if (minutes < 60) return `${minutes}min`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h`;
	const days = Math.floor(hours / 24);
	if (days < 7) return `${days}d`;
	return value.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

type ChatsBoardCardProps = {
	card: TChatBoardCard;
	onOpen: (chatId: string) => void;
	className?: string;
};

/**
 * Card do quadro: um retrato do atendimento denso o bastante para varrer uma coluna
 * inteira sem abrir nada.
 *
 * O preview da última mensagem sai do mesmo `getChatListMessagePreview` da inbox — duas
 * telas mostrando a mesma conversa com resumos diferentes seria um jeito barato de perder
 * a confiança de quem atende.
 */
export function ChatsBoardCard({ card, onOpen, className }: ChatsBoardCardProps) {
	const preview = getChatListMessagePreview(card.ultimaMensagem);
	const janela = getWhatsappWindowDisplay({ expiracao: card.whatsappJanelaDataExpiracao, tipoConexao: card.conexaoTipo });
	const MediaIcon = preview.contentType && preview.contentType !== "TEXTO" ? MEDIA_ICONS[preview.contentType] : null;
	const prioridadePillClass = card.prioridade ? CHAT_PRIORITY_PILL_CLASS[card.prioridade] : undefined;
	const naoLidas = card.mensagensNaoLidas ?? 0;

	return (
		<button
			type="button"
			onClick={() => onOpen(card.chatId)}
			className={cn(
				"flex w-full flex-col gap-2 rounded-xl border border-border bg-card p-2.5 text-left shadow-sm transition-colors",
				"hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
				className,
			)}
		>
			<div className="flex items-start gap-2">
				<div className="relative shrink-0">
					<Avatar className="h-8 w-8">
						<AvatarFallback className="text-[10px]">{(card.cliente?.nome ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
					</Avatar>
					{/* O ponto sozinho seria informação só por cor (WCAG 1.4.1); o rótulo sr-only
					    entrega o mesmo dado a leitores de tela. Idêntico ao item da inbox. */}
					<span className={cn("absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background", CHAT_WINDOW_DOT_CLASS[janela.variant])} />
					<span className="sr-only">{janela.label}</span>
				</div>

				<div className="flex min-w-0 flex-1 flex-col gap-0.5">
					<div className="flex items-center justify-between gap-2">
						<span className="truncate text-sm font-medium">{card.cliente?.nome ?? "Cliente sem nome"}</span>
						<span className="shrink-0 text-[11px] text-muted-foreground">{formatRelative(card.ultimaMensagemData)}</span>
					</div>

					<span className={cn("flex min-w-0 items-center gap-1 text-xs", preview.isEmpty ? "italic text-muted-foreground" : "text-muted-foreground")}>
						{preview.isOutgoing && !preview.isEmpty && <span className="shrink-0 font-medium">Você:</span>}
						{MediaIcon && <MediaIcon className="h-3 w-3 shrink-0" />}
						<span className="truncate">{preview.body}</span>
					</span>
				</div>
			</div>

			{card.resumo && <p className="line-clamp-2 rounded-lg bg-muted/60 px-2 py-1 text-[11px] leading-snug text-muted-foreground">{card.resumo}</p>}

			<div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
				{card.responsavelTipo === "USUARIO" && (
					<span className="flex min-w-0 items-center gap-1">
						<Avatar className="h-3.5 w-3.5">
							{card.responsavelUsuario?.avatarUrl && <AvatarImage src={card.responsavelUsuario.avatarUrl} />}
							<AvatarFallback className="text-[9px]">{(card.responsavelUsuario?.nome ?? "?").slice(0, 1)}</AvatarFallback>
						</Avatar>
						<span className="truncate">{card.responsavelUsuario?.nome ?? "Atribuído"}</span>
					</span>
				)}
				{card.responsavelTipo === "AGENTE" && (
					<span className="flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5">
						<Sparkles className="h-3 w-3" /> Automação
					</span>
				)}
				{card.responsavelTipo === "EXTERNO" && (
					<span className="flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5">
						<Smartphone className="h-3 w-3" /> Telefone
					</span>
				)}
				{card.responsavelTipo === "NAO_ATRIBUIDO" && (
					<span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 font-bold text-primary">Livre</span>
				)}

				{card.prioridade && prioridadePillClass && (
					<span className={cn("rounded-full px-2 py-0.5 font-bold", prioridadePillClass)}>{CHAT_PRIORITY_LABEL[card.prioridade]}</span>
				)}

				{card.categoria && <span className="truncate rounded-full bg-muted px-2 py-0.5">{card.categoria}</span>}

				<span className="ml-auto flex items-center gap-1.5">
					{card.aguardandoResposta && <span className="font-bold text-destructive">Aguardando resposta</span>}
					{naoLidas > 0 && (
						<span className="rounded-full bg-primary px-1.5 py-0.5 font-bold text-primary-foreground">{naoLidas > 99 ? "99+" : naoLidas}</span>
					)}
				</span>
			</div>
		</button>
	);
}
