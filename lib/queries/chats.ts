import type { TGetTransferTargetsOutput } from "@/app/api/chats/assignments/route";
import type { TGetChatMessagesOutput } from "@/app/api/chats/messages/route";
import type { TGetChatsOutput } from "@/app/api/chats/route";
import type { TGetClientContextOutput } from "@/app/api/clients/context/route";
import type { TChatAssignmentStatus, TChatInboxView } from "@/schemas/enums";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useDebounceMemo } from "../hooks/use-debounce";

// ============= Fetch functions =============

type TChatsCursor = string | null;

async function fetchChats(params: {
	whatsappConexaoTelefoneId: string | null;
	view: TChatInboxView;
	search: string;
	status: TChatAssignmentStatus[];
	cursor?: TChatsCursor;
}) {
	const searchParams = new URLSearchParams();
	if (params.whatsappConexaoTelefoneId) searchParams.set("whatsappConexaoTelefoneId", params.whatsappConexaoTelefoneId);
	searchParams.set("view", params.view);
	if (params.search) searchParams.set("search", params.search);
	if (params.status.length > 0) searchParams.set("status", params.status.join(","));
	if (params.cursor) searchParams.set("cursor", params.cursor);

	const { data } = await axios.get<TGetChatsOutput>(`/api/chats?${searchParams.toString()}`);
	if (!data.data.default) throw new Error("Não foi possível carregar os chats.");
	return data.data.default;
}

async function fetchChatById(chatId: string) {
	const { data } = await axios.get<TGetChatsOutput>(`/api/chats?id=${chatId}`);
	if (!data.data.byId) throw new Error("Chat não encontrado.");
	return data.data.byId;
}

type TChatMessagesCursor = { dataEnvio: string; id: string } | null;

async function fetchChatMessages(params: { chatId: string; cursor?: TChatMessagesCursor }) {
	const searchParams = new URLSearchParams();
	searchParams.set("chatId", params.chatId);
	if (params.cursor) {
		searchParams.set("cursorDataEnvio", params.cursor.dataEnvio);
		searchParams.set("cursorId", params.cursor.id);
	}

	const { data } = await axios.get<TGetChatMessagesOutput>(`/api/chats/messages?${searchParams.toString()}`);
	return data.data;
}

async function fetchChatTransferTargets() {
	const { data } = await axios.get<TGetTransferTargetsOutput>("/api/chats/assignments");
	return data.data.usuarios;
}

async function fetchClientContext(clientId: string) {
	const { data } = await axios.get<TGetClientContextOutput>(`/api/clients/context?clientId=${clientId}`);
	return data.data;
}

// ============= Hooks =============

export type TChatInboxItem = NonNullable<TGetChatsOutput["data"]["default"]>["items"][number];
export type TChatMessagesPage = TGetChatMessagesOutput["data"];
export type TChatThreadMessage = TChatMessagesPage["items"][number];
export type TChatAttendance = TChatMessagesPage["chat"]["atendimentoAtivo"];

export function getChatsQueryKey({
	whatsappConexaoTelefoneId,
	view,
	search,
	status,
}: {
	whatsappConexaoTelefoneId: string | null;
	view: TChatInboxView;
	search: string;
	status: TChatAssignmentStatus[];
}) {
	return ["chats", whatsappConexaoTelefoneId, view, search, status] as const;
}

export function useChats({
	whatsappConexaoTelefoneId,
	view,
	search = "",
	status = [],
}: {
	whatsappConexaoTelefoneId: string | null;
	view: TChatInboxView;
	search?: string;
	status?: TChatAssignmentStatus[];
}) {
	// A busca vai para o servidor (o índice de chave natural + ordenação já suportam),
	// então precisa de debounce para não disparar uma query por tecla.
	const debounced = useDebounceMemo({ search }, 350);
	const queryKey = getChatsQueryKey({ whatsappConexaoTelefoneId, view, search: debounced.search, status });

	const query = useInfiniteQuery({
		queryKey,
		queryFn: ({ pageParam }) =>
			fetchChats({ whatsappConexaoTelefoneId, view, search: debounced.search, status, cursor: pageParam ?? undefined }),
		getNextPageParam: (lastPage) => lastPage.nextCursor,
		initialPageParam: null as TChatsCursor,
		refetchOnWindowFocus: false,
	});

	return { ...query, chats: query.data?.pages.flatMap((page) => page.items) ?? [], queryKey };
}

export function useChatById(chatId: string | null) {
	const queryKey = ["chat-by-id", chatId] as const;
	return { ...useQuery({ queryKey, queryFn: () => fetchChatById(chatId ?? ""), enabled: !!chatId }), queryKey };
}

export function getChatMessagesQueryKey(chatId: string | null) {
	return ["chat-messages", chatId] as const;
}

export function useChatMessages(chatId: string | null) {
	const queryKey = getChatMessagesQueryKey(chatId);
	const query = useInfiniteQuery({
		queryKey,
		queryFn: ({ pageParam }) => fetchChatMessages({ chatId: chatId ?? "", cursor: pageParam }),
		getNextPageParam: (lastPage) => lastPage.nextCursor,
		initialPageParam: null as TChatMessagesCursor,
		enabled: !!chatId,
		refetchOnWindowFocus: false,
	});

	return {
		...query,
		// Páginas em DESC concatenadas seguem em DESC: a thread renderiza em
		// flex-col-reverse, então "mais antigas" entram no fim do array.
		messages: query.data?.pages.flatMap((page) => page.items) ?? [],
		chat: query.data?.pages[0]?.chat ?? null,
		queryKey,
	};
}

export function useChatTransferTargets({ enabled = true }: { enabled?: boolean } = {}) {
	const queryKey = ["chat-transfer-targets"] as const;
	return { ...useQuery({ queryKey, queryFn: fetchChatTransferTargets, enabled, staleTime: 5 * 60 * 1000 }), queryKey };
}

export function useChatClientContext({ clienteId, enabled = true }: { clienteId: string | null; enabled?: boolean }) {
	const queryKey = ["chat-client-context", clienteId] as const;
	return {
		...useQuery({ queryKey, queryFn: () => fetchClientContext(clienteId ?? ""), enabled: enabled && !!clienteId }),
		queryKey,
	};
}
