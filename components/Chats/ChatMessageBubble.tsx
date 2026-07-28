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

/** Um check = enviada, dois = entregue, dois azuis = lida. Convenção do WhatsApp. */
function DeliveryTicks({ status }: { status: TChatThreadMessage["statusEntrega"] }) {
	if (status === "PENDENTE") return <Clock className="h-3 w-3 opacity-70" />;
	if (status === "FALHA") return <AlertCircle className="h-3 w-3 text-destructive" />;
	if (status === "ENVIADA") return <Check className="h-3 w-3 opacity-70" />;
	if (status === "ENTREGUE") return <CheckCheck className="h-3 w-3 opacity-70" />;
	if (status === "LIDA") return <CheckCheck className="h-3 w-3 text-sky-400" />;
	return null;
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
				<span className="flex items-center gap-1 px-1 text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
					{message.autorTipo === "AI" && <Sparkles className="h-3 w-3" />}
					{message.autorTipo === "BUSINESS-APP" && <Smartphone className="h-3 w-3" />}
					{resolveAuthorLabel(message)}
				</span>
			)}

			<div
				className={cn(
					"max-w-[72%] rounded-2xl px-3 py-2 text-sm shadow-sm",
					// Rabinho assimétrico do lado do autor.
					isIncoming ? "rounded-tl-md" : "rounded-tr-md",
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
					<div className="mb-2 rounded-lg border border-current/20 bg-black/5 p-2 text-xs">
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
						<CollapsibleTrigger className="flex items-center gap-1 text-[0.7rem] opacity-80 hover:opacity-100">
							<ChevronDown className="h-3 w-3" />
							Ver análise da IA
						</CollapsibleTrigger>
						<CollapsibleContent className="mt-1 whitespace-pre-wrap rounded-lg bg-black/10 p-2 text-[0.7rem] leading-snug">
							{aiContext}
						</CollapsibleContent>
					</Collapsible>
				)}

				<div className={cn("mt-1 flex items-center gap-1 text-[0.65rem] opacity-80", isIncoming ? "justify-start" : "justify-end")}>
					<span>{formatTime(message.dataEnvio)}</span>
					{!isIncoming && <DeliveryTicks status={message.statusEntrega} />}
				</div>
			</div>

			{/* O módulo equivalente do Control nunca passa onRetry, então este botão é
			    invisível lá mesmo quando o envio falha. */}
			{isFailed && onRetry && !message.optimistic && (
				<Button variant="ghost" size="sm" className="h-6 gap-1 px-2 text-xs" disabled={isRetrying} onClick={() => onRetry(message.id)}>
					<RotateCw className={cn("h-3 w-3", isRetrying && "animate-spin")} />
					Tentar novamente
				</Button>
			)}
		</div>
	);
}
