import type { TGetChatDetailsOutput } from "@/app/api/chats/[chatId]/route";
import type { TGetMessagesInput, TGetMessagesOutput } from "@/app/api/chats/messages/route";
import type { TGetChatsInput, TGetChatsOutput } from "@/app/api/chats/route";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useState } from "react";
import { useDebounceMemo } from "../hooks/use-debounce";

// ============= Fetch functions =============

async function fetchChats(input: TGetChatsInput) {
	const searchParams = new URLSearchParams();
	searchParams.set("whatsappPhoneId", input.whatsappPhoneId);
	if (input.cursor) searchParams.set("cursor", input.cursor);
	if (input.limit) searchParams.set("limit", input.limit.toString());
	if (input.search) searchParams.set("search", input.search);

	const { data } = await axios.get<TGetChatsOutput>(`/api/chats?${searchParams.toString()}`);
	return data.data;
}

async function fetchChatDetails(chatId: string) {
	const { data } = await axios.get<TGetChatDetailsOutput>(`/api/chats/${chatId}`);
	return data.data;
}

async function fetchChatMessages(input: TGetMessagesInput) {
	const searchParams = new URLSearchParams();
	searchParams.set("chatId", input.chatId);
	if (input.cursor) searchParams.set("cursor", input.cursor);
	if (input.limit) searchParams.set("limit", input.limit.toString());

	const { data } = await axios.get<TGetMessagesOutput>(`/api/chats/messages?${searchParams.toString()}`);
	return data.data;
}

// ============= Hooks =============

type UseChatsParams = {
	whatsappPhoneId: string | null;
	search?: string;
};

/**
 * Hook to fetch and manage chats list with pagination and search
 */
export function useChats({ whatsappPhoneId, search = "" }: UseChatsParams) {
	const debouncedSearch = useDebounceMemo({ search }, 1000);

	const query = useInfiniteQuery({
		queryKey: ["chats", whatsappPhoneId, debouncedSearch],
		queryFn: ({ pageParam }) =>
			fetchChats({
				whatsappPhoneId: whatsappPhoneId ?? "",
				cursor: pageParam ?? undefined,
				search: debouncedSearch.search,
				limit: 20,
			}),
		enabled: !!whatsappPhoneId,
		getNextPageParam: (lastPage) => lastPage.nextCursor,
		initialPageParam: undefined as string | undefined,
	});

	// Flatten pages into single array
	const chats = query.data?.pages.flatMap((page) => page.items) ?? [];

	console.log("[TESTING] [useChats] Rerendering...")
	return {
		...query,
		chats,
		queryKey: ["chats", whatsappPhoneId, debouncedSearch],
	};
}

/**
 * Hook to fetch a single chat's details
 */
export function useChat(chatId: string | null) {
	return useQuery({
		queryKey: ["chat", chatId],
		queryFn: () => fetchChatDetails(chatId ?? ""),
		enabled: !!chatId,
	});
}

/**
 * Hook to fetch chat messages with infinite scroll (load older messages)
 */
export function useChatMessages(chatId: string | null) {
	const query = useInfiniteQuery({
		queryKey: ["chat-messages", chatId],
		queryFn: ({ pageParam }) =>
			fetchChatMessages({
				chatId: chatId ?? "",
				cursor: pageParam ?? undefined,
				limit: 50,
			}),
		enabled: !!chatId,
		getNextPageParam: (lastPage) => lastPage.nextCursor,
		initialPageParam: undefined as string | undefined,
	});

	// Flatten pages and reverse to get chronological order
	// Note: API returns messages in reverse order per page, then reverses each page
	// So we need to properly merge pages
	const messages = query.data?.pages.flatMap((page) => page.items) ?? [];

	return {
		...query,
		messages,
		queryKey: ["chat-messages", chatId],
	};
}

/**
 * Hook to get chat summary for AI context
 */
export function useChatSummary(chatId: string | null) {
	return useQuery({
		queryKey: ["chat-summary", chatId],
		queryFn: async () => {
			const { data } = await axios.get(`/api/chats/${chatId}/summary`);
			return data.data;
		},
		enabled: !!chatId,
		staleTime: 30000, // Cache for 30 seconds
	});
}
