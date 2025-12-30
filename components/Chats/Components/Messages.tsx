"use client";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useChatMessagesRealtime } from "@/lib/hooks/use-supabase-realtime";
import { useRetryMessage } from "@/lib/mutations/chats";
import { useChatMessages } from "@/lib/queries/chats";
import { cn } from "@/lib/utils";
import { AlertCircle, ArrowDown, Check, CheckCheck, Clock, Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";
import MediaMessageDisplay from "../MediaMessageDisplay";
import { useChatHub } from "./context";

export type ChatHubMessagesProps = {
	className?: string;
	emptyState?: React.ReactNode;
};

type MessageType = {
	id: string;
	autorTipo: "CLIENTE" | "USUÁRIO" | "AI" | "BUSINESS-APP";
	conteudoTexto: string | null;
	conteudoMidiaTipo: "TEXTO" | "IMAGEM" | "VIDEO" | "AUDIO" | "DOCUMENTO";
	conteudoMidiaUrl: string | null;
	conteudoMidiaStorageId: string | null;
	conteudoMidiaMimeType: string | null;
	conteudoMidiaArquivoNome: string | null;
	conteudoMidiaArquivoTamanho: number | null;
	whatsappMessageStatus: "PENDENTE" | "ENVIADO" | "ENTREGUE" | "FALHOU";
	dataEnvio: Date;
	chatId: string;
	autor: { nome: string; avatarUrl?: string | null } | null;
};

export function Messages({ className, emptyState }: ChatHubMessagesProps) {
	const { selectedChatId } = useChatHub();
	const previousChatId = useRef(selectedChatId);

	// Use TanStack Query for messages
	const { messages, isPending, isError, hasNextPage, isFetchingNextPage, fetchNextPage } = useChatMessages(selectedChatId);

	// Subscribe to realtime updates
	useChatMessagesRealtime({
		chatId: selectedChatId,
		enabled: !!selectedChatId,
	});

	// Reset when chat changes
	useEffect(() => {
		if (selectedChatId !== previousChatId.current) {
			previousChatId.current = selectedChatId;
		}
	}, [selectedChatId]);

	// Initial loading state
	if (isPending) {
		return (
			<div className={cn("flex-1 flex items-center justify-center bg-background/50", className)}>
				<div className="flex flex-col items-center gap-2">
					<Loader2 className="w-8 h-8 animate-spin text-primary/40" />
					<div className="text-sm text-primary/60">Carregando mensagens...</div>
				</div>
			</div>
		);
	}

	// Error state
	if (isError) {
		return (
			<div className={cn("flex-1 flex items-center justify-center bg-background/50", className)}>
				<div className="flex flex-col items-center gap-2">
					<AlertCircle className="w-8 h-8 text-red-500/40" />
					<div className="text-sm text-red-500/60">Erro ao carregar mensagens</div>
				</div>
			</div>
		);
	}

	// Empty state
	if (messages.length === 0) {
		return (
			<div className={cn("flex-1 flex items-center justify-center bg-background/50", className)}>
				{emptyState || (
					<div className="flex flex-col items-center justify-center p-8 text-center">
						<div className="w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center mb-4">
							<span className="text-4xl">💬</span>
						</div>
						<h3 className="text-base font-semibold text-primary/70 mb-1">Nenhuma mensagem ainda</h3>
						<p className="text-sm text-primary/50">Envie a primeira mensagem para iniciar a conversa</p>
					</div>
				)}
			</div>
		);
	}

	return (
		<StickToBottom
			className={cn(
				"relative flex-1 flex flex-col overflow-y-auto",
				"bg-gradient-to-b from-background/50 to-background",
				"scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent",
				className,
			)}
			initial="smooth"
			resize="smooth"
			role="log"
			aria-live="polite"
		>
			<StickToBottom.Content className="p-4 space-y-1 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
				{/* Load Older Messages Button */}
				{hasNextPage && (
					<div className="flex items-center justify-center mb-4">
						<Button variant="outline" size="sm" onClick={() => fetchNextPage()} disabled={isFetchingNextPage} className="shadow-sm">
							{isFetchingNextPage ? (
								<>
									<Loader2 className="w-4 h-4 animate-spin mr-2" />
									Carregando...
								</>
							) : (
								"Carregar mensagens anteriores"
							)}
						</Button>
					</div>
				)}

				{messages.map((message, index) => {
					const previousMessage = index > 0 ? messages[index - 1] : null;
					const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;

					const isUser = message.autorTipo === "USUÁRIO" || message.autorTipo === "AI" || message.autorTipo === "BUSINESS-APP";
					const isSameAuthorAsPrevious = previousMessage?.autorTipo === message.autorTipo;
					const isSameAuthorAsNext = nextMessage?.autorTipo === message.autorTipo;

					return (
						<MessageBubble
							key={message.id}
							message={message as MessageType}
							isUser={isUser}
							isSameAuthorAsPrevious={isSameAuthorAsPrevious}
							isSameAuthorAsNext={isSameAuthorAsNext}
						/>
					);
				})}
			</StickToBottom.Content>
			<ScrollToBottomButton />
		</StickToBottom>
	);
}

type MessageBubbleProps = {
	message: MessageType;
	isUser: boolean;
	isSameAuthorAsPrevious: boolean;
	isSameAuthorAsNext: boolean;
};

function MessageBubble({ message, isUser, isSameAuthorAsPrevious, isSameAuthorAsNext }: MessageBubbleProps) {
	const shouldShowTimestamp = !isSameAuthorAsNext;
	const marginTop = isSameAuthorAsPrevious ? "mt-1" : "mt-4";

	// Define border radius based on grouping
	const roundedClasses = cn({
		"rounded-2xl": !isSameAuthorAsPrevious && !isSameAuthorAsNext, // Single message
		"rounded-t-2xl rounded-b-lg": !isSameAuthorAsPrevious && isSameAuthorAsNext, // First in group
		"rounded-lg": isSameAuthorAsPrevious && isSameAuthorAsNext, // Middle of group
		"rounded-t-lg rounded-b-2xl": isSameAuthorAsPrevious && !isSameAuthorAsNext, // Last in group
	});

	return (
		<div className={cn("flex w-full animate-in fade-in slide-in-from-bottom-2 duration-300", marginTop, isUser ? "justify-end" : "justify-start")}>
			<div
				className={cn(
					"max-w-[85%] sm:max-w-[75%] lg:max-w-[65%] px-4 py-2.5",
					"shadow-sm transition-all duration-200 hover:shadow-md",
					roundedClasses,
					isUser ? "bg-linear-to-br from-blue-500 to-blue-600 text-white" : "bg-card border border-primary/10 text-primary",
				)}
			>
				{/* Message Content */}
				{message.conteudoMidiaTipo && message.conteudoMidiaTipo !== "TEXTO" ? (
					<div className="space-y-2">
						<MediaMessageDisplay
							storageId={message.conteudoMidiaStorageId ?? undefined}
							mediaUrl={message.conteudoMidiaUrl ?? undefined}
							mediaType={message.conteudoMidiaTipo}
							fileName={message.conteudoMidiaArquivoNome ?? undefined}
							fileSize={message.conteudoMidiaArquivoTamanho ?? undefined}
							mimeType={message.conteudoMidiaMimeType ?? undefined}
							caption={message.conteudoTexto ?? undefined}
							variant={isUser ? "sent" : "received"}
						/>
					</div>
				) : (
					<p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{message.conteudoTexto}</p>
				)}

				{/* Timestamp and Status */}
				{shouldShowTimestamp && (
					<div className={cn("flex items-center gap-1.5 mt-1.5 justify-end", isUser ? "text-blue-100/90" : "text-primary/60")}>
						<time className="text-[10px] font-medium">
							{new Date(message.dataEnvio).toLocaleTimeString("pt-BR", {
								hour: "2-digit",
								minute: "2-digit",
							})}
						</time>
						{isUser && <MessageStatusIcon status={message.whatsappMessageStatus} messageId={message.id} chatId={message.chatId} />}
					</div>
				)}
			</div>
		</div>
	);
}

type MessageStatusIconProps = {
	status?: string | null;
	messageId: string;
	chatId: string;
};

function MessageStatusIcon({ status, messageId, chatId }: MessageStatusIconProps) {
	const [isOpen, setIsOpen] = useState(false);
	const retryMessageMutation = useRetryMessage();

	const handleRetry = useCallback(async () => {
		try {
			await retryMessageMutation.mutateAsync({ messageId, chatId });
			setIsOpen(false);
		} catch (error) {
			console.error("Erro ao reenviar mensagem:", error);
		}
	}, [retryMessageMutation, messageId, chatId]);

	switch (status) {
		case "PENDENTE":
			return <Clock className="w-3.5 h-3.5 animate-pulse" aria-label="Pendente" />;
		case "ENVIADO":
			return <Check className="w-3.5 h-3.5" aria-label="Enviado" />;
		case "ENTREGUE":
		case "LIDO":
			return <CheckCheck className="w-3.5 h-3.5" aria-label="Entregue" />;
		case "FALHOU":
			return (
				<Popover open={isOpen} onOpenChange={setIsOpen}>
					<PopoverTrigger asChild>
						<button
							type="button"
							className="inline-flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
							aria-label="Falhou - clique para reenviar"
						>
							<AlertCircle className="w-3.5 h-3.5 text-red-300" />
						</button>
					</PopoverTrigger>
					<PopoverContent side="top" align="end" className="w-auto p-2" sideOffset={8}>
						<Button size="sm" variant="destructive" onClick={handleRetry} disabled={retryMessageMutation.isPending} className="gap-2">
							{retryMessageMutation.isPending ? (
								<>
									<Loader2 className="w-3.5 h-3.5 animate-spin" />
									Reenviando...
								</>
							) : (
								<>
									<RefreshCw className="w-3.5 h-3.5" />
									Reenviar mensagem
								</>
							)}
						</Button>
					</PopoverContent>
				</Popover>
			);
		default:
			return null;
	}
}

function ScrollToBottomButton() {
	const { isAtBottom, scrollToBottom } = useStickToBottomContext();

	const handleScrollToBottom = useCallback(() => {
		scrollToBottom();
	}, [scrollToBottom]);

	if (isAtBottom) return null;

	return (
		<Button
			className={cn(
				"absolute bottom-4 left-1/2 -translate-x-1/2",
				"rounded-full shadow-lg border-2 border-background",
				"bg-card hover:bg-card/90 text-primary",
				"animate-in fade-in slide-in-from-bottom-2 duration-300",
				"transition-transform hover:scale-105",
			)}
			onClick={handleScrollToBottom}
			size="icon"
			type="button"
			variant="outline"
			aria-label="Rolar para o final"
		>
			<ArrowDown className="w-4 h-4" />
		</Button>
	);
}
