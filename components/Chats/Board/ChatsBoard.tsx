"use client";

import type { TGetWhatsappConnectionsOutput } from "@/app/api/whatsapp-connections/route";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CHAT_BOARD_CLOSED_WINDOW_DEFAULT_DAYS, CHAT_BOARD_STATUSES } from "@/lib/chats/board";
import { getErrorMessage } from "@/lib/errors";
import { useChatsBoard, type TChatBoardFilters } from "@/lib/queries/chats-board";
import { cn } from "@/lib/utils";
import { supabaseClient } from "@/services/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ChatsBoardColumn } from "./ChatsBoardColumn";
import { ChatsBoardFilters } from "./ChatsBoardFilters";

const BOARD_SCROLL_CLASS = "scrollbar-subtle";
const BOARD_DESKTOP_MAX_HEIGHT = "md:max-h-[calc(100dvh-14rem)] md:overflow-hidden";

const INITIAL_FILTERS: TChatBoardFilters = {
	view: "TODAS",
	whatsappConexaoTelefoneId: null,
	prioridade: null,
	search: "",
	encerradosDias: CHAT_BOARD_CLOSED_WINDOW_DEFAULT_DAYS,
};

type ChatsBoardProps = {
	organizationId: string;
	whatsappConnections: TGetWhatsappConnectionsOutput["data"];
	onOpenChat: (chatId: string) => void;
};

export default function ChatsBoard({ organizationId, whatsappConnections, onOpenChat }: ChatsBoardProps) {
	const [filters, setFilters] = useState<TChatBoardFilters>(INITIAL_FILTERS);
	const queryClient = useQueryClient();

	const { data, isPending, isError, error, refetch, isRefetching } = useChatsBoard({ filters });

	const updateFilters = useCallback((patch: Partial<TChatBoardFilters>) => {
		setFilters((current) => ({ ...current, ...patch }));
	}, []);

	// Qualquer mudança em `chat_assignments` move um card de coluna, cria ou encerra um
	// atendimento. Diferente da inbox, aqui não há patch cirúrgico que valha a pena: a
	// posição do card depende de status, e o total da coluna vem do servidor.
	useEffect(() => {
		const channel = supabaseClient
			.channel(`chats-board-${organizationId}`)
			.on("postgres_changes", { event: "*", schema: "public", table: "ampmais_chat_assignments", filter: `organizacao_id=eq.${organizationId}` }, () => {
				void queryClient.invalidateQueries({ queryKey: ["chats-board"] });
			})
			.subscribe();

		return () => {
			void supabaseClient.removeChannel(channel);
		};
	}, [organizationId, queryClient]);

	if (isError) return <ErrorComponent msg={getErrorMessage(error)} />;

	return (
		<div className={cn("flex min-h-0 flex-1 flex-col gap-3", BOARD_DESKTOP_MAX_HEIGHT)}>
			<ChatsBoardFilters filters={filters} onChange={updateFilters} whatsappConnections={whatsappConnections} />

			<div className="flex shrink-0 items-center justify-between gap-2">
				<p className="text-xs text-muted-foreground">
					{isPending
						? "Carregando atendimentos..."
						: `${data?.totais.abertos ?? 0} em aberto · ${data?.totais.naFila ?? 0} na fila · ${data?.totais.pendentes ?? 0} aguardando resposta`}
				</p>
				<Button variant="ghost" size="icon" onClick={() => refetch()} disabled={isRefetching} aria-label="Atualizar quadro">
					<RefreshCw className={cn("h-4 w-4", isRefetching && "animate-spin")} />
				</Button>
			</div>

			{isPending ? (
				<div className={cn(BOARD_SCROLL_CLASS, "flex min-h-[50vh] flex-1 gap-3 overflow-x-auto pb-2 md:min-h-0 md:overflow-y-hidden")}>
					{CHAT_BOARD_STATUSES.map((status) => (
						<div key={status} className="flex h-full w-[300px] min-w-[300px] flex-col gap-2">
							<Skeleton className="h-5 w-32 shrink-0" />
							<Skeleton className="h-full min-h-24 w-full rounded-xl" />
						</div>
					))}
				</div>
			) : (
				<div className={cn(BOARD_SCROLL_CLASS, "flex min-h-[50vh] flex-1 snap-x gap-3 overflow-x-auto pb-2 md:min-h-0 md:overflow-y-hidden")}>
					{(data?.colunas ?? []).map((coluna) => (
						<ChatsBoardColumn key={coluna.status} status={coluna.status} itens={coluna.itens} total={coluna.total} onOpenChat={onOpenChat} />
					))}
				</div>
			)}
		</div>
	);
}
