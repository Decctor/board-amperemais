import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

/**
 * Custom hook for paginated chats with search and infinite scroll
 */
export function usePaginatedChats(whatsappPhoneNumberId: string | null, searchQuery: string = "") {
	const [allChats, setAllChats] = useState<any[]>([]);
	const [nextCursor, setNextCursor] = useState<string | null>(null);
	const [hasMore, setHasMore] = useState(false);
	const [isLoadingMore, setIsLoadingMore] = useState(false);
	const previousSearchQuery = useRef(searchQuery);

	// Query the first page
	const result = useQuery(
		api.queries.chat.getChats,
		whatsappPhoneNumberId
			? {
					whatsappPhoneNumberId,
					paginationOpts: {
						cursor: null,
						numItems: 20,
					},
					searchQuery: searchQuery || undefined,
			  }
			: "skip"
	);

	// Reset when search query changes
	useEffect(() => {
		if (searchQuery !== previousSearchQuery.current) {
			previousSearchQuery.current = searchQuery;
			setAllChats([]);
			setNextCursor(null);
			setIsLoadingMore(false);
		}
	}, [searchQuery]);

	// Update state when first page loads
	useEffect(() => {
		if (result) {
			setAllChats(result.items);
			setNextCursor(result.nextCursor);
			setHasMore(result.hasMore);
		}
	}, [result]);

	// Load more chats
	const loadMore = useCallback(() => {
		if (!hasMore || isLoadingMore || !nextCursor) return;
		setIsLoadingMore(true);
	}, [hasMore, isLoadingMore, nextCursor]);

	const isLoading = result === undefined;

	return {
		chats: allChats,
		isLoading,
		isLoadingMore,
		hasMore,
		loadMore,
		nextCursor,
	};
}

/**
 * Hook for loading more chats with a specific cursor
 */
export function useLoadMoreChats(
	whatsappPhoneNumberId: string | null,
	cursor: string | null,
	searchQuery: string = ""
) {
	const result = useQuery(
		api.queries.chat.getChats,
		whatsappPhoneNumberId && cursor
			? {
					whatsappPhoneNumberId,
					paginationOpts: {
						cursor,
						numItems: 20,
					},
					searchQuery: searchQuery || undefined,
			  }
			: "skip"
	);

	return result;
}

/**
 * Custom hook for paginated messages with reverse infinite scroll
 */
export function usePaginatedMessages(chatId: string | null) {
	const [allMessages, setAllMessages] = useState<any[]>([]);
	const [nextCursor, setNextCursor] = useState<string | null>(null);
	const [hasMore, setHasMore] = useState(false);
	const [isLoadingMore, setIsLoadingMore] = useState(false);
	const previousChatId = useRef(chatId);

	// Query the first page (most recent messages)
	const result = useQuery(
		api.queries.chat.getChatMessages,
		chatId
			? {
					chatId: chatId as any,
					paginationOpts: {
						cursor: null,
						numItems: 30, // Initial load
					},
			  }
			: "skip"
	);

	// Reset when chat changes
	useEffect(() => {
		if (chatId !== previousChatId.current) {
			previousChatId.current = chatId;
			setAllMessages([]);
			setNextCursor(null);
			setIsLoadingMore(false);
			setHasMore(false);
		}
	}, [chatId]);

	// Update state when first page loads
	useEffect(() => {
		if (result && chatId === previousChatId.current) {
			setAllMessages(result.items);
			setNextCursor(result.nextCursor);
			setHasMore(result.hasMore);
		}
	}, [result, chatId]);

	// Load older messages
	const loadOlderMessages = useCallback(() => {
		if (!hasMore || isLoadingMore || !nextCursor) return;
		setIsLoadingMore(true);
	}, [hasMore, isLoadingMore, nextCursor]);

	const isLoading = result === undefined;

	return {
		messages: allMessages,
		isLoading,
		isLoadingMore,
		hasMore,
		loadOlderMessages,
		nextCursor,
	};
}

/**
 * Hook for loading older messages with a specific cursor
 */
export function useLoadOlderMessages(chatId: string | null, cursor: string | null) {
	const result = useQuery(
		api.queries.chat.getChatMessages,
		chatId && cursor
			? {
					chatId: chatId as any,
					paginationOpts: {
						cursor,
						numItems: 50, // Load more messages
					},
			  }
			: "skip"
	);

	return result;
}

/**
 * Debounce hook for search input
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
	const [debouncedValue, setDebouncedValue] = useState<T>(value);

	useEffect(() => {
		const handler = setTimeout(() => {
			setDebouncedValue(value);
		}, delay);

		return () => {
			clearTimeout(handler);
		};
	}, [value, delay]);

	return debouncedValue;
}
