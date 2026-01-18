"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNameAsInitials } from "@/lib/formatting";
import { useChatsRealtime } from "@/lib/hooks/use-supabase-realtime";
import { useChats } from "@/lib/queries/chats";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import { AudioWaveformIcon, FileIcon, ImageIcon, Loader2, MessageCircle, VideoIcon } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { useChatHub } from "./context";

export type ChatHubListProps = {
	className?: string;
	onChatSelect?: (chatId: string) => void;
	searchQuery?: string;
};

type ChatItem = {
	id: string;
	mensagensNaoLidas: number;
	ultimaMensagemData: Date;
	ultimaMensagemConteudoTipo: "TEXTO" | "IMAGEM" | "VIDEO" | "AUDIO" | "DOCUMENTO";
	ultimaMensagemConteudoTexto: string | null;
	cliente: {
		id: string;
		nome: string;
		avatarUrl?: string | null;
	} | null;
};

export function List({ className, onChatSelect, searchQuery = "" }: ChatHubListProps) {
	const { selectedPhoneNumber, selectedChatId, setSelectedChatId } = useChatHub();
	const scrollRef = useRef<HTMLDivElement>(null);

	// Use TanStack Query for chats
	const { chats, isPending, isError, hasNextPage, isFetchingNextPage, fetchNextPage } = useChats({
		whatsappPhoneId: selectedPhoneNumber,
		search: searchQuery,
	});

	// Subscribe to realtime updates
	useChatsRealtime({
		whatsappPhoneId: selectedPhoneNumber,
		enabled: !!selectedPhoneNumber,
	});

	// Infinite scroll handler
	const handleScroll = useCallback(() => {
		if (!scrollRef.current || isFetchingNextPage || !hasNextPage) return;

		const container = scrollRef.current;
		const { scrollTop, scrollHeight, clientHeight } = container;
		const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

		if (isNearBottom) {
			fetchNextPage();
		}
	}, [isFetchingNextPage, hasNextPage, fetchNextPage]);

	useEffect(() => {
		const container = scrollRef.current;
		if (container) {
			container.addEventListener("scroll", handleScroll);
			return () => container.removeEventListener("scroll", handleScroll);
		}
	}, [handleScroll]);

	const handleSelectChat = (chatId: string) => {
		setSelectedChatId(chatId);
		onChatSelect?.(chatId);
	};

	// No phone number selected
	if (!selectedPhoneNumber) {
		return (
			<div className={cn("flex flex-col items-center justify-center p-8 text-center", className)}>
				<MessageCircle className="w-12 h-12 text-primary/20 mb-3" />
				<p className="text-sm text-primary/60 italic">Selecione um número de telefone para ver os chats</p>
			</div>
		);
	}

	// Initial loading
	if (isPending) {
		return (
			<div className={cn("flex flex-col gap-3 p-3", className)} aria-busy="true" aria-live="polite">
				{Array.from({ length: 5 }).map((_, i) => (
					<ChatItemSkeleton key={i.toString()} />
				))}
			</div>
		);
	}

	// Error state
	if (isError) {
		return (
			<div className={cn("flex flex-col items-center justify-center p-8 text-center", className)}>
				<MessageCircle className="w-12 h-12 text-red-500/20 mb-3" />
				<p className="text-sm text-red-500/60 font-medium">Erro ao carregar chats</p>
			</div>
		);
	}

	// No chats found
	if (chats.length === 0) {
		return (
			<div className={cn("flex flex-col items-center justify-center p-8 text-center", className)}>
				<MessageCircle className="w-12 h-12 text-primary/20 mb-3" />
				<p className="text-sm text-primary/60 font-medium">{searchQuery ? "Nenhum chat encontrado" : "Nenhum chat ainda"}</p>
				<p className="text-xs text-primary/40 mt-1">{searchQuery ? "Tente outro termo de busca" : "Inicie uma nova conversa clicando no botão +"}</p>
			</div>
		);
	}

	return (
		<div
			ref={scrollRef}
			className={cn("w-full flex flex-col scrollbar-thin scrollbar-track-primary/10 scrollbar-thumb-primary/30 overflow-y-auto", className)}
		>
			<div className="flex flex-col gap-2 p-3">
				{chats.map((chat) => (
					<ChatListItem key={chat.id} chat={chat as ChatItem} isSelected={selectedChatId === chat.id} onSelect={() => handleSelectChat(chat.id)} />
				))}

				{/* Loading More Indicator */}
				{isFetchingNextPage && (
					<div className="flex items-center justify-center py-4">
						<Loader2 className="w-5 h-5 animate-spin text-primary/60" />
					</div>
				)}

				{/* Load More Button (alternative to infinite scroll) */}
				{!isFetchingNextPage && hasNextPage && (
					<Button variant="ghost" onClick={() => fetchNextPage()} className="w-full mt-2 text-primary/60 hover:text-primary hover:bg-primary/5">
						Carregar mais conversas
					</Button>
				)}
			</div>
		</div>
	);
}

type ChatListItemProps = {
	chat: ChatItem;
	isSelected: boolean;
	onSelect: () => void;
};

function ChatListItem({ chat, isSelected, onSelect }: ChatListItemProps) {
	const hasUnread = (chat.mensagensNaoLidas || 0) > 0;

	function getFormattedLastMessageDate(date: Date) {
		if (!date) return "";
		const isSameDay = dayjs(date).isSame(dayjs(), "day");
		if (isSameDay) return dayjs(date).format("HH:mm");
		const isSameYear = dayjs(date).isSame(dayjs(), "year");
		if (isSameYear) return dayjs(date).format("DD/MM HH:mm");
		return dayjs(date).format("DD/MM/YYYY HH:mm");
	}

	function getMediaMessageFormattedValue(mediaType: "IMAGEM" | "VIDEO" | "AUDIO" | "DOCUMENTO") {
		if (mediaType === "IMAGEM")
			return {
				icon: <ImageIcon className="w-3.5 h-3.5 text-primary/60 shrink-0" />,
				value: "IMAGEM",
			};
		if (mediaType === "VIDEO")
			return {
				icon: <VideoIcon className="w-3.5 h-3.5 text-primary/60 shrink-0" />,
				value: "VÍDEO",
			};
		if (mediaType === "AUDIO")
			return {
				icon: <AudioWaveformIcon className="w-3.5 h-3.5 text-primary/60 shrink-0" />,
				value: "ÁUDIO",
			};

		return {
			icon: <FileIcon className="w-3.5 h-3.5 text-primary/60 shrink-0" />,
			value: "DOCUMENTO",
		};
	}

	const mediaMessageFormattedValue = getMediaMessageFormattedValue(chat.ultimaMensagemConteudoTipo as "IMAGEM" | "VIDEO" | "AUDIO" | "DOCUMENTO");
	const lastMessageDate = getFormattedLastMessageDate(chat.ultimaMensagemData);

	return (
		<Button
			variant="ghost"
			className={cn(
				"w-full h-auto p-3 flex items-start gap-3 hover:bg-primary/10 transition-all duration-200",
				"rounded-lg relative group",
				isSelected && "bg-primary/10 shadow-sm",
			)}
			onClick={onSelect}
		>
			{/* Selection indicator */}
			{isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />}

			{/* Avatar */}
			<Avatar className="w-12 h-12 min-w-12 min-h-12 ring-2 ring-transparent group-hover:ring-primary/20 transition-all">
				<AvatarImage src={chat.cliente?.avatarUrl ?? undefined} alt={chat.cliente?.nome ?? ""} />
				<AvatarFallback className="bg-linear-to-br from-primary/20 to-primary/10 text-primary font-semibold">
					{formatNameAsInitials(chat.cliente?.nome ?? "?")}
				</AvatarFallback>
			</Avatar>

			{/* Content */}
			<div className="grow flex flex-col min-w-0 gap-1">
				{/* Header: Name and Time */}
				<div className="flex items-center justify-between gap-2 w-full">
					<h3 className={cn("font-semibold text-sm truncate text-left", hasUnread && "text-primary")}>{chat.cliente?.nome || "Cliente desconhecido"}</h3>
					{chat.ultimaMensagemData && (
						<span className={cn("text-xs shrink-0", hasUnread ? "text-primary font-medium" : "text-primary/60")}>{lastMessageDate}</span>
					)}
				</div>

				{/* Last Message Preview */}
				<div className="flex items-center justify-between gap-2 w-full">
					<div className="flex items-center gap-1.5 min-w-0 flex-1">
						{chat.ultimaMensagemConteudoTipo === "TEXTO" ? (
							<p className={cn("text-xs truncate text-left", hasUnread ? "text-primary/80 font-medium" : "text-primary/60")}>
								{chat.ultimaMensagemConteudoTexto || "Nenhuma mensagem ainda"}
							</p>
						) : (
							<>
								{mediaMessageFormattedValue.icon}
								<p className={cn("text-xs truncate", hasUnread ? "text-primary/80 font-medium" : "text-primary/60")}>{mediaMessageFormattedValue.value}</p>
							</>
						)}
					</div>

					{/* Unread Badge */}
					{hasUnread && (
						<Badge
							variant="default"
							className="bg-green-500 hover:bg-green-500 text-white text-xs font-bold px-2 py-0.5 min-w-5 h-5 flex items-center justify-center rounded-full"
						>
							{chat.mensagensNaoLidas}
						</Badge>
					)}
				</div>
			</div>
		</Button>
	);
}

function ChatItemSkeleton() {
	return (
		<div className="w-full p-3 flex items-start gap-3">
			<Skeleton className="w-12 h-12 rounded-full" />
			<div className="flex-1 flex flex-col gap-2">
				<div className="flex items-center justify-between">
					<Skeleton className="h-4 w-32" />
					<Skeleton className="h-3 w-12" />
				</div>
				<Skeleton className="h-3 w-full" />
			</div>
		</div>
	);
}
