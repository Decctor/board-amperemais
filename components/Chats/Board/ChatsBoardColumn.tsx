"use client";

import { type TChatBoardStatus } from "@/lib/chats/board";
import type { TChatBoardCard } from "@/lib/queries/chats-board";
import { cn } from "@/lib/utils";
import type { TChatAssignmentPriority, TChatAssignmentStatus } from "@/schemas/enums";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { ChatsBoardCard } from "./ChatsBoardCard";
import { CHAT_BOARD_COLUMN_META } from "./config";

type ColumnCallbacks = {
	onOpenChat: (chatId: string) => void;
	onMove: (card: TChatBoardCard, target: TChatAssignmentStatus) => void;
	onChangePriority: (card: TChatBoardCard, prioridade: TChatAssignmentPriority | null) => void;
};

function DraggableCard({
	card,
	isPending,
	awaitingConfirm,
	callbacks,
}: {
	card: TChatBoardCard;
	isPending: boolean;
	awaitingConfirm: boolean;
	callbacks: ColumnCallbacks;
}) {
	const { setNodeRef, attributes, listeners, isDragging } = useDraggable({
		id: card.id,
		data: { from: card.status },
		disabled: !card.podeGerenciar || isPending || awaitingConfirm,
	});

	return (
		<ChatsBoardCard
			ref={setNodeRef}
			card={card}
			isPending={isPending}
			isDragging={isDragging}
			awaitingConfirm={awaitingConfirm}
			onOpen={callbacks.onOpenChat}
			onMove={(target) => callbacks.onMove(card, target)}
			onChangePriority={(prioridade) => callbacks.onChangePriority(card, prioridade)}
			dragAttributes={attributes}
			dragListeners={listeners}
			className="animate-in fade-in-0 slide-in-from-top-1 duration-200 motion-reduce:animate-none"
		/>
	);
}

type ChatsBoardColumnProps = {
	status: TChatBoardStatus;
	itens: TChatBoardCard[];
	total: number;
	pendingCardIds: Set<string>;
	confirmCardId: string | null;
	callbacks: ColumnCallbacks;
};

export function ChatsBoardColumn({ status, itens, total, pendingCardIds, confirmCardId, callbacks }: ChatsBoardColumnProps) {
	// `ENCERRADO` é vitrine, não área de drop — ver `isValidChatBoardTransition`.
	const isDropDisabled = status === "ENCERRADO";
	const { setNodeRef, isOver } = useDroppable({ id: status, disabled: isDropDisabled });
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

			<div
				ref={setNodeRef}
				className={cn(
					"scrollbar-subtle flex min-h-0 grow flex-col gap-2 overflow-y-auto rounded-xl border border-dashed p-1.5 transition-colors",
					isOver && !isDropDisabled ? "border-foreground/30 bg-accent/50" : "border-border/60",
				)}
			>
				{itens.length === 0 ? (
					<div className="flex grow items-center justify-center px-2 py-8 text-center text-[11px] text-muted-foreground/60">{meta.hint}</div>
				) : (
					itens.map((card) => (
						<DraggableCard
							key={card.id}
							card={card}
							isPending={pendingCardIds.has(card.id)}
							awaitingConfirm={confirmCardId === card.id}
							callbacks={callbacks}
						/>
					))
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
