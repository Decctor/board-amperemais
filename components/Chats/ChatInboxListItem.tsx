"use client";

import { getChatListMessagePreview } from "@/lib/chats/chat-list-preview";
import { getWhatsappWindowDisplay } from "@/lib/chats/whatsapp-window-status";
import type { TChatInboxItem } from "@/lib/queries/chats";
import { cn } from "@/lib/utils";
import { FileText, Image as ImageIcon, Mic, Smartphone, Sparkles, Sticker, Video } from "lucide-react";
import { PRIORITY_META, STATUS_META } from "./attendance-meta";

type ChatInboxListItemProps = {
	chat: TChatInboxItem;
	isSelected: boolean;
	/** Só faz sentido mostrar o número quando a lista mistura vários. */
	showPhoneBadge: boolean;
	onSelect: (chatId: string) => void;
};

const MEDIA_ICONS = { IMAGEM: ImageIcon, VIDEO: Video, AUDIO: Mic, DOCUMENTO: FileText, FIGURINHA: Sticker } as const;

/**
 * Só os estados acionáveis recebem cor. Numa inbox com dezenas de conversas, colorir
 * também o estado saudável faz quatro sinais competirem e nenhum se destacar — "janela
 * aberta" e "sessão do gateway" são o normal, e normal não pede atenção.
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
	const minutes = Math.floor((Date.now() - value.getTime()) / 60_000);
	if (minutes < 1) return "agora";
	if (minutes < 60) return `${minutes}min`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h`;
	const days = Math.floor(hours / 24);
	if (days < 7) return `${days}d`;
	return value.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function ChatInboxListItem({ chat, isSelected, showPhoneBadge, onSelect }: ChatInboxListItemProps) {
	const preview = getChatListMessagePreview(chat.ultimaMensagem);
	const janela = getWhatsappWindowDisplay({ expiracao: chat.whatsappJanelaDataExpiracao, tipoConexao: chat.conexaoTipo });
	const MediaIcon = preview.contentType && preview.contentType !== "TEXTO" ? MEDIA_ICONS[preview.contentType] : null;
	const atendimento = chat.atendimentoAtivo;
	const naoLidas = chat.mensagensNaoLidas ?? 0;
	const numeroConexao = chat.conexaoTelefone?.numero || chat.conexaoTelefone?.nome;

	return (
		<button
			type="button"
			onClick={() => onSelect(chat.id)}
			aria-current={isSelected ? "true" : undefined}
			className={cn(
				"flex w-full flex-col gap-1 border-b border-border/60 px-3 py-2.5 text-left transition-colors",
				"hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
				isSelected && "bg-muted",
			)}
		>
			<div className="flex items-center justify-between gap-2">
				<span className="flex min-w-0 items-center gap-1.5">
					{/* O ponto perdeu o avatar como âncora e passou a marcar o nome. Cor
					    sozinha não passa em 1.4.1, então o rótulo vai em sr-only. */}
					<span className={cn("h-2 w-2 shrink-0 rounded-full", WINDOW_DOT_CLASS[janela.variant])} />
					<span className="sr-only">{janela.label}</span>
					<span className="truncate text-sm font-semibold">{chat.cliente?.nome ?? "Cliente sem nome"}</span>
				</span>
				<span className="shrink-0 text-[11px] text-muted-foreground">{formatRelative(chat.ultimaMensagemData)}</span>
			</div>

			<div className="flex items-center justify-between gap-2 pl-3.5">
				<span className={cn("flex min-w-0 items-center gap-1 truncate text-xs text-muted-foreground", preview.isEmpty && "italic")}>
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

			<div className="flex flex-wrap items-center gap-1.5 pl-3.5 text-[11px] text-muted-foreground">
				{/* Estado do atendimento: mesmo vocabulário do select, para a cor significar
				    a mesma coisa nas duas superfícies. */}
				{atendimento && (
					<span className="flex items-center gap-1">
						<span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", STATUS_META[atendimento.status].dot)} />
						{STATUS_META[atendimento.status].label}
					</span>
				)}

				{/* Prioridade só aparece quando foi atribuída: um pill em toda conversa
				    "média" tornaria a urgência invisível justamente onde ela importa. */}
				{atendimento?.prioridade && (
					<span className={cn("flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 font-bold", PRIORITY_META[atendimento.prioridade].pill)}>
						{(() => {
							const PriorityIcon = PRIORITY_META[atendimento.prioridade].icon;
							return PriorityIcon ? <PriorityIcon className="h-3 w-3" /> : null;
						})()}
						{PRIORITY_META[atendimento.prioridade].label}
					</span>
				)}

				{/* "Livre" é disponibilidade, não alerta. O âmbar já significa "janela
				    expirando"; duplicar a cor apagaria os dois sentidos. */}
				{(!atendimento || atendimento.responsavelTipo === "NAO_ATRIBUIDO") && (
					<span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 font-bold text-primary">Livre</span>
				)}
				{atendimento?.responsavelTipo === "USUARIO" && (
					<span className="truncate font-medium">{atendimento.responsavelUsuario?.nome ?? "Atribuído"}</span>
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

				{showPhoneBadge && numeroConexao && (
					<span className="ml-auto shrink-0 truncate rounded-full border border-border px-1.5 py-0.5 font-medium">{numeroConexao}</span>
				)}
			</div>
		</button>
	);
}
