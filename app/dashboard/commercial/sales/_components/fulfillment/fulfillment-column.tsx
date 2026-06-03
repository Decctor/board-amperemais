"use client";

import type { TSalesFulfillmentCard } from "@/app/api/sales/fulfillment/route";
import { cn } from "@/lib/utils";
import type { TSaleAttendanceStatusEnum } from "@/schemas/enums";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { ATTENDANCE_COLUMN_META, type TBoardStatus } from "./config";
import { FulfillmentCard } from "./fulfillment-card";

function DraggableCard({
	card,
	isPending,
	awaitingConfirm,
	onMove,
	onConfirmDelivery,
	onCancelConfirm,
}: {
	card: TSalesFulfillmentCard;
	isPending: boolean;
	awaitingConfirm: boolean;
	onMove: (card: TSalesFulfillmentCard, target: TSaleAttendanceStatusEnum) => void;
	onConfirmDelivery: (card: TSalesFulfillmentCard) => void;
	onCancelConfirm: () => void;
}) {
	const { setNodeRef, attributes, listeners, isDragging } = useDraggable({
		id: card.id,
		data: { from: card.statusAtendimento },
		disabled: isPending || awaitingConfirm,
	});

	return (
		<FulfillmentCard
			ref={setNodeRef}
			card={card}
			isPending={isPending}
			isDragging={isDragging}
			awaitingConfirm={awaitingConfirm}
			onMove={(target) => onMove(card, target)}
			onConfirmDelivery={() => onConfirmDelivery(card)}
			onCancelConfirm={onCancelConfirm}
			dragAttributes={attributes}
			dragListeners={listeners}
			className="animate-in fade-in-0 slide-in-from-top-1 duration-200 motion-reduce:animate-none"
		/>
	);
}

export function FulfillmentColumn({
	status,
	cards,
	pendingCardIds,
	confirmCardId,
	onMove,
	onConfirmDelivery,
	onCancelConfirm,
}: {
	status: TBoardStatus;
	cards: TSalesFulfillmentCard[];
	pendingCardIds: Set<string>;
	confirmCardId: string | null;
	onMove: (card: TSalesFulfillmentCard, target: TSaleAttendanceStatusEnum) => void;
	onConfirmDelivery: (card: TSalesFulfillmentCard) => void;
	onCancelConfirm: () => void;
}) {
	const { setNodeRef, isOver } = useDroppable({ id: status });
	const meta = ATTENDANCE_COLUMN_META[status];
	const Icon = meta.icon;

	return (
		<div className="flex h-full w-[280px] min-w-[280px] snap-start flex-col gap-2">
			<div className="flex items-center justify-between px-1.5">
				<div className="flex items-center gap-1.5">
					<Icon className="h-4 w-4 text-muted-foreground" />
					<span className="text-xs font-extrabold uppercase tracking-wide">{meta.label}</span>
				</div>
				<span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary px-1.5 text-[11px] font-bold tabular-nums text-secondary-foreground">
					{cards.length}
				</span>
			</div>

			<div
				ref={setNodeRef}
				className={cn(
					"flex grow flex-col gap-2 overflow-y-auto rounded-xl border border-dashed p-1.5 transition-colors",
					isOver ? "border-foreground/30 bg-accent/50" : "border-border/60",
				)}
			>
				{cards.length === 0 ? (
					<div className="flex grow items-center justify-center py-8 text-center text-[11px] text-muted-foreground/60">{meta.hint}</div>
				) : (
					cards.map((card) => (
						<DraggableCard
							key={card.id}
							card={card}
							isPending={pendingCardIds.has(card.id)}
							awaitingConfirm={confirmCardId === card.id}
							onMove={onMove}
							onConfirmDelivery={onConfirmDelivery}
							onCancelConfirm={onCancelConfirm}
						/>
					))
				)}
			</div>
		</div>
	);
}
