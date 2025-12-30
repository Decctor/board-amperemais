"use client";

import { supabaseClient } from "@/services/supabase";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";

type RealtimeEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

type RealtimeFilter = {
	column: string;
	value: string;
};

type UseSupabaseRealtimeOptions<T> = {
	table: string;
	schema?: string;
	event?: RealtimeEvent;
	filter?: RealtimeFilter;
	enabled?: boolean;
	onInsert?: (payload: T) => void;
	onUpdate?: (payload: { old: T; new: T }) => void;
	onDelete?: (payload: T) => void;
	invalidateQueries?: string[][];
};

/**
 * Hook to subscribe to Supabase Realtime changes on a table
 *
 * @example
 * // Subscribe to all changes on chats table
 * useSupabaseRealtime({
 *   table: 'chats',
 *   filter: { column: 'whatsapp_telefone_id', value: phoneId },
 *   invalidateQueries: [['chats']],
 * });
 *
 * @example
 * // Subscribe to new messages in a specific chat
 * useSupabaseRealtime({
 *   table: 'chat_messages',
 *   filter: { column: 'chat_id', value: chatId },
 *   onInsert: (message) => console.log('New message:', message),
 * });
 */
export function useSupabaseRealtime<T extends Record<string, unknown>>({
	table,
	schema = "public",
	event = "*",
	filter,
	enabled = true,
	onInsert,
	onUpdate,
	onDelete,
	invalidateQueries,
}: UseSupabaseRealtimeOptions<T>) {
	const queryClient = useQueryClient();
	const channelRef = useRef<ReturnType<typeof supabaseClient.channel> | null>(null);

	const handleChange = useCallback(
		(payload: RealtimePostgresChangesPayload<T>) => {
			console.log("[REALTIME] Change received:", payload.eventType, table);

			// Call specific handlers
			switch (payload.eventType) {
				case "INSERT":
					onInsert?.(payload.new as T);
					break;
				case "UPDATE":
					onUpdate?.({ old: payload.old as T, new: payload.new as T });
					break;
				case "DELETE":
					onDelete?.(payload.old as T);
					break;
			}

			// Invalidate queries
			if (invalidateQueries) {
				for (const queryKey of invalidateQueries) {
					queryClient.invalidateQueries({ queryKey });
				}
			}
		},
		[onInsert, onUpdate, onDelete, invalidateQueries, queryClient, table],
	);

	useEffect(() => {
		if (!enabled) {
			return;
		}

		// Create channel name based on table and filter
		const channelName = filter ? `${table}_${filter.column}_${filter.value}` : table;

		console.log("[REALTIME] Subscribing to:", channelName);

		// Build the filter string for Supabase
		const filterString = filter ? `${filter.column}=eq.${filter.value}` : undefined;

		// Create subscription
		const channel = supabaseClient.channel(channelName).on<T>(
			"postgres_changes",
			{
				event,
				schema,
				table,
				filter: filterString,
			},
			handleChange,
		);

		channel.subscribe((status) => {
			console.log("[REALTIME] Subscription status:", status, channelName);
		});

		channelRef.current = channel;

		// Cleanup
		return () => {
			console.log("[REALTIME] Unsubscribing from:", channelName);
			if (channelRef.current) {
				supabaseClient.removeChannel(channelRef.current);
				channelRef.current = null;
			}
		};
	}, [table, schema, event, filter?.column, filter?.value, enabled, handleChange]);

	return {
		unsubscribe: () => {
			if (channelRef.current) {
				supabaseClient.removeChannel(channelRef.current);
				channelRef.current = null;
			}
		},
	};
}

/**
 * Hook to subscribe to chat list updates
 */
export function useChatsRealtime({
	whatsappPhoneId,
	enabled = true,
}: {
	whatsappPhoneId: string | null;
	enabled?: boolean;
}) {
	return useSupabaseRealtime({
		table: "chats",
		filter: whatsappPhoneId ? { column: "whatsapp_telefone_id", value: whatsappPhoneId } : undefined,
		enabled: enabled && !!whatsappPhoneId,
		invalidateQueries: [["chats"]],
	});
}

/**
 * Hook to subscribe to messages in a specific chat
 */
export function useChatMessagesRealtime({
	chatId,
	enabled = true,
	onNewMessage,
}: {
	chatId: string | null;
	enabled?: boolean;
	onNewMessage?: (message: Record<string, unknown>) => void;
}) {
	return useSupabaseRealtime({
		table: "chat_messages",
		filter: chatId ? { column: "chat_id", value: chatId } : undefined,
		enabled: enabled && !!chatId,
		invalidateQueries: [["chat-messages", chatId ?? ""]],
		onInsert: onNewMessage,
	});
}
