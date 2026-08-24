"use client";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { TChatThreadMessage } from "@/lib/queries/chats";
import { cn } from "@/lib/utils";
import { AlertCircle, Check, CheckCheck, ChevronDown, Clock, RotateCw, Smartphone, Sparkles } from "lucide-react";
import { ChatMediaAttachment } from "./ChatMediaAttachment";
import { WhatsAppMessageText } from "./WhatsAppMessageText";

/** Mensagem otimista: existe no cliente antes de a rota confirmar a persistência. */
export type TOptimisticFields = { optimistic?: boolean };

type ChatMessageBubbleProps = {
	message: TChatThreadMessage & TOptimisticFields;
	/** Primeira bolha de uma sequência do mesmo autor — só ela mostra o cabeçalho. */
	showAuthor: boolean;
	onRetry?: (messageId: string) => void;
	isRetrying?: boolean;
};

function formatTime(date: Date | string) {
	return new Date(date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

const DELIVERY_LABELS: Record<TChatThreadMessage["statusEntrega"], string> = {
	PENDENTE: "Enviando",
	ENVIADA: "Enviada",
	ENTREGUE: "Entregue",
	LIDA: "Lida",
	FALHA: "Falha no envio",
	CANCELADA: "Cancelada",
};

/**
 * Um check = enviada, dois = entregue, dois em destaque = lida.
 *
 * "Lida" se distingue por opacidade plena, não por matiz: a bolha de saída já é o azul
 * da marca, então um tick azul sobre ela seria invisível. O rótulo textual acompanha —
 * ticks são informação por forma e cor, que sozinha não passa em 1.4.1.
 */
function DeliveryTicks({ status }: { status: TChatThreadMessage["statusEntrega"] }) {
	const icon =
		status === "PENDENTE" ? (
			<Clock className="h-3 w-3 opacity-70" />
		) : status === "FALHA" ? (
			<AlertCircle className="h-3 w-3" />
		) : status === "ENVIADA" ? (
			<Check className="h-3 w-3 opacity-70" />
		) : status === "ENTREGUE" ? (
			<CheckCheck className="h-3 w-3 opacity-70" />
		) : status === "LIDA" ? (
			<CheckCheck className="h-3 w-3 opacity-100" />
		) : null;

	if (!icon) return null;
	return (
		<span className="inline-flex items-center">
			{icon}
			<span className="sr-only">{DELIVERY_LABELS[status]}</span>
		</span>
	);
}

function resolveAuthorLabel(message: TChatThreadMessage) {
	if (message.autorTipo === "CLIENTE") return message.autorCliente?.nome ?? "Cliente";
	if (message.autorTipo === "AI") return "Assistente IA";
	if (message.autorTipo === "BUSINESS-APP") return "Telefone";
	return message.autorUsuario?.nome ?? "Você";
}

export function ChatMessageBubble({ message, showAuthor, onRetry, isRetrying }: ChatMessageBubbleProps) {
	const isIncoming = message.autorTipo === "CLIENTE";
	const isFailed = message.statusEntrega === "FALHA";
	const isAutomated = message.autorTipo === "AI" || message.autorTipo === "BUSINESS-APP" || message.whatsappEcho;
	const hasMedia = message.conteudoMidiaTipo !== "TEXTO";
	// Figurinha se desenha sem bolha, como no WhatsApp: fundo transparente, tamanho próprio,
	// sem a coluna estável de mídia. A "análise da IA" também some — o texto processado de
	// figurinha é fixo, não uma leitura.
	const isSticker = message.conteudoMidiaTipo === "FIGURINHA";
	// Bolha de saída (azul) e de falha (vermelha) são superfícies coloridas: links, code
	// e fundos de anexo precisam derivar da cor do texto em vez de usar tokens fixos.
	const onColoredSurface = !isIncoming && !isAutomated;
	const referral = message.metadados?.whatsappReferral;
	const aiContext = message.conteudoMidiaTextoProcessado || message.conteudoMidiaTextoProcessadoResumo;

	return (
		<div className={cn("flex w-full flex-col gap-0.5", isIncoming ? "items-start" : "items-end")}>
			{showAuthor && (
				<span className="flex items-center gap-1 px-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground">
					{message.autorTipo === "AI" && <Sparkles className="h-3 w-3" />}
					{message.autorTipo === "BUSINESS-APP" && <Smartphone className="h-3 w-3" />}
					{resolveAuthorLabel(message)}
				</span>
			)}

			<div
				className={cn(
					"max-w-[72%] rounded-2xl text-sm",
					!isSticker && "px-3 py-2 shadow-sm",
					// Como no WhatsApp, mensagens com mídia têm uma coluna estável: a
					// legenda quebra dentro dela em vez de alargar a bubble sozinha.
					hasMedia && !isSticker && "w-[20rem]",
					// Rabinho assimétrico do lado do autor.
					isIncoming ? "rounded-tl-lg" : "rounded-tr-lg",
					isSticker
						? "bg-transparent"
						: isIncoming
							? "border border-border bg-card text-card-foreground"
							: isFailed
								? "bg-destructive text-destructive-foreground"
								: isAutomated
									? "bg-muted text-muted-foreground"
									: "bg-primary text-primary-foreground",
					message.optimistic && "opacity-70",
				)}
			>
				{referral && (
					<div className="mb-2 rounded-lg border border-current/20 bg-current/5 p-2 text-xs">
						<p className="font-semibold">Veio de um anúncio</p>
						{referral.headline && <p className="mt-0.5 line-clamp-2">{referral.headline}</p>}
						{referral.sourceUrl && (
							<a href={referral.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-0.5 block truncate underline">
								{referral.sourceUrl}
							</a>
						)}
					</div>
				)}

				{/* Checagem inline em vez de `hasMedia`: o narrowing do union não atravessa o alias. */}
				{message.conteudoMidiaTipo !== "TEXTO" && (
					<div className="mb-1">
						<ChatMediaAttachment
							tipo={message.conteudoMidiaTipo}
							url={message.conteudoMidiaUrl}
							arquivoNome={message.conteudoMidiaArquivoNome}
							arquivoTamanho={message.conteudoMidiaArquivoTamanho}
							mimeType={message.conteudoMidiaMimeType}
						/>
					</div>
				)}

				{message.conteudoTexto && <WhatsAppMessageText text={message.conteudoTexto} onColoredSurface={onColoredSurface} />}

				{hasMedia && !isSticker && aiContext && (
					<Collapsible className="mt-1.5">
						<CollapsibleTrigger className="flex items-center gap-1 text-[11px] opacity-80 hover:opacity-100">
							<ChevronDown className="h-3 w-3" />
							Ver análise da IA
						</CollapsibleTrigger>
						<CollapsibleContent className="mt-1 whitespace-pre-wrap rounded-lg bg-current/10 p-2 text-[11px] leading-snug">{aiContext}</CollapsibleContent>
					</Collapsible>
				)}

				<div
					className={cn(
						"mt-1 flex items-center gap-1 text-[11px] opacity-80",
						isIncoming ? "justify-start" : "justify-end",
						// Fora da bolha colorida não há cor herdada para o carimbo de hora.
						isSticker && "text-muted-foreground",
					)}
				>
					<span>{formatTime(message.dataEnvio)}</span>
					{!isIncoming && <DeliveryTicks status={message.statusEntrega} />}
				</div>
			</div>

			{/* O módulo equivalente do Control nunca passa onRetry, então este botão é
			    invisível lá mesmo quando o envio falha. */}
			{isFailed && onRetry && !message.optimistic && (
				<Button variant="ghost" size="sm" className="gap-1 text-xs" disabled={isRetrying} onClick={() => onRetry(message.id)}>
					<RotateCw className={cn("h-3 w-3", isRetrying && "animate-spin")} />
					Tentar novamente
				</Button>
			)}
		</div>
	);
}
