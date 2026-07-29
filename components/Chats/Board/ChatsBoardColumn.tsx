"use client";

import type { TChatBoardStatus } from "@/lib/chats/board";
import type { TChatBoardCard } from "@/lib/queries/chats-board";
import { ChatsBoardCard } from "./ChatsBoardCard";
import { CHAT_BOARD_COLUMN_META } from "./config";

type ChatsBoardColumnProps = {
	status: TChatBoardStatus;
	itens: TChatBoardCard[];
	total: number;
	onOpenChat: (chatId: string) => void;
};

export function ChatsBoardColumn({ status, itens, total, onOpenChat }: ChatsBoardColumnProps) {
	const meta = CHAT_BOARD_COLUMN_META[status];
	const Icon = meta.icon;
	const excedente = total - itens.length;

	return (
		<div className="flex h-full min-h-0 w-[300px] min-w-[300px] snap-start flex-col gap-2">
			<div className="flex shrink-0 items-center justify-between px-1.5">
				<div className="flex items-center gap-1.5">
					<Icon className="h-4 w-4 text-muted-foreground" />
					<span className="text-xs font-extrabold uppercase tracking-wide">{meta.label}</span>
				</div>
				<span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary px-1.5 text-[11px] font-bold tabular-nums text-secondary-foreground">
					{total}
				</span>
			</div>

			<div className="scrollbar-subtle flex min-h-0 grow flex-col gap-2 overflow-y-auto rounded-xl border border-dashed border-border/60 p-1.5">
				{itens.length === 0 ? (
					<div className="flex grow items-center justify-center px-2 py-8 text-center text-[11px] text-muted-foreground/60">{meta.hint}</div>
				) : (
					itens.map((card) => <ChatsBoardCard key={card.id} card={card} onOpen={onOpenChat} />)
				)}

				{/* Truncar em silêncio faria a coluna parecer completa quando não está. */}
				{excedente > 0 && (
					<p className="shrink-0 py-1 text-center text-[11px] text-muted-foreground">
						+{excedente} {excedente === 1 ? "atendimento não exibido" : "atendimentos não exibidos"}
					</p>
				)}
			</div>
		</div>
	);
}
