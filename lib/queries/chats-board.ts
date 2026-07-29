import type { TChatBoardCard, TGetChatBoardOutput } from "@/app/api/chats/board/route";
import { useDebounceMemo } from "@/lib/hooks/use-debounce";
import type { TChatAssignmentPriority, TChatInboxView } from "@/schemas/enums";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export type TChatBoardFilters = {
	view: TChatInboxView;
	whatsappConexaoTelefoneId: string | null;
	prioridade: TChatAssignmentPriority | null;
	search: string;
	encerradosDias: number;
};

export type { TChatBoardCard };
export type TChatBoardData = TGetChatBoardOutput["data"];
export type TChatBoardColumn = TChatBoardData["colunas"][number];

async function fetchChatBoard(filters: TChatBoardFilters) {
	const searchParams = new URLSearchParams();
	searchParams.set("view", filters.view);
	if (filters.whatsappConexaoTelefoneId) searchParams.set("whatsappConexaoTelefoneId", filters.whatsappConexaoTelefoneId);
	if (filters.prioridade) searchParams.set("prioridade", filters.prioridade);
	if (filters.search) searchParams.set("search", filters.search);
	searchParams.set("encerradosDias", String(filters.encerradosDias));

	const { data } = await axios.get<TGetChatBoardOutput>(`/api/chats/board?${searchParams.toString()}`);
	return data.data;
}

export function getChatBoardQueryKey(filters: TChatBoardFilters) {
	return ["chats-board", filters.view, filters.whatsappConexaoTelefoneId, filters.prioridade, filters.search, filters.encerradosDias] as const;
}

const AUTO_REFRESH_INTERVAL_MS = 30_000;

/**
 * O quadro reconcilia sozinho a cada 30s, mas o intervalo e o refetch no foco são
 * **pausados** enquanto há movimento otimista ou confirmação aberta (`paused`) — do
 * contrário um refetch no meio do arraste devolveria o card à coluna de origem.
 *
 * Mesma solução do quadro de pedidos (`lib/queries/sales-fulfillment.ts`); aqui o realtime
 * de `chat_assignments` é o sinal primário e o intervalo é só rede de segurança.
 */
export function useChatsBoard({
	filters,
	paused = false,
	enabled = true,
}: {
	filters: TChatBoardFilters;
	paused?: boolean;
	enabled?: boolean;
}) {
	const debounced = useDebounceMemo({ search: filters.search }, 350);
	const effectiveFilters = { ...filters, search: debounced.search };
	const queryKey = getChatBoardQueryKey(effectiveFilters);

	return {
		...useQuery({
			queryKey,
			queryFn: () => fetchChatBoard(effectiveFilters),
			enabled,
			refetchInterval: paused ? false : AUTO_REFRESH_INTERVAL_MS,
			refetchIntervalInBackground: false,
			refetchOnWindowFocus: !paused,
		}),
		queryKey,
	};
}
