"use client";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { TChatThreadMessage } from "@/lib/queries/chats";
import { cn } from "@/lib/utils";
import { AlertCircle, Check, CheckCheck, ChevronDown, Clock, RotateCw, Smartphone, Sparkles } from "lucide-react";
import MediaMessageDisplay from "./MediaMessageDisplay";
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
					"max-w-[72%] rounded-2xl px-3 py-2 text-sm shadow-sm",
					// Rabinho assimétrico do lado do autor.
					isIncoming ? "rounded-tl-lg" : "rounded-tr-lg",
					isIncoming
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

				{message.conteudoMidiaTipo !== "TEXTO" && (
					<div className="mb-1">
						<MediaMessageDisplay
							mediaUrl={message.conteudoMidiaUrl ?? undefined}
							mediaType={message.conteudoMidiaTipo}
							fileName={message.conteudoMidiaArquivoNome ?? undefined}
							fileSize={message.conteudoMidiaArquivoTamanho ?? undefined}
							mimeType={message.conteudoMidiaMimeType ?? undefined}
							variant={isIncoming ? "received" : "sent"}
						/>
					</div>
				)}

				{message.conteudoTexto && <WhatsAppMessageText text={message.conteudoTexto} className="whitespace-pre-wrap break-words" />}

				{message.conteudoMidiaTipo !== "TEXTO" && aiContext && (
					<Collapsible className="mt-1.5">
						<CollapsibleTrigger className="flex items-center gap-1 text-[11px] opacity-80 hover:opacity-100">
							<ChevronDown className="h-3 w-3" />
							Ver análise da IA
						</CollapsibleTrigger>
						<CollapsibleContent className="mt-1 whitespace-pre-wrap rounded-lg bg-current/10 p-2 text-[11px] leading-snug">
							{aiContext}
						</CollapsibleContent>
					</Collapsible>
				)}

				<div className={cn("mt-1 flex items-center gap-1 text-[11px] opacity-80", isIncoming ? "justify-start" : "justify-end")}>
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
