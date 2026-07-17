"use client";

import type { TPatchSalesFulfillmentInput, TSalesFulfillmentCard } from "@/app/api/sales/fulfillment/route";
import { cn } from "@/lib/utils";
import type { TOrganizationConfiguration } from "@/schemas/organizations";
import type { TSaleAttendanceStatusEnum } from "@/schemas/enums";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { ATTENDANCE_COLUMN_META, type TBoardStatus } from "./config";
import { FulfillmentCard } from "./fulfillment-card";

function DraggableCard({
	card,
	organizationConfig,
	isPending,
	awaitingConfirm,
	onMove,
	onPatch,
	onConfirmDelivery,
	onDeliverWithoutPayment,
	onCancelConfirm,
	onViewDetails,
}: {
	card: TSalesFulfillmentCard;
	organizationConfig: TOrganizationConfiguration;
	isPending: boolean;
	awaitingConfirm: boolean;
	onMove: (card: TSalesFulfillmentCard, target: TSaleAttendanceStatusEnum) => void;
	onPatch: (input: TPatchSalesFulfillmentInput) => void;
	onConfirmDelivery: (card: TSalesFulfillmentCard) => void;
	onDeliverWithoutPayment: (card: TSalesFulfillmentCard) => void;
	onCancelConfirm: () => void;
	onViewDetails: (saleId: string) => void;
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
			organizationConfig={organizationConfig}
			isPending={isPending}
			isDragging={isDragging}
			awaitingConfirm={awaitingConfirm}
			onMove={(target) => onMove(card, target)}
			onPatch={onPatch}
			onConfirmDelivery={() => onConfirmDelivery(card)}
			onDeliverWithoutPayment={() => onDeliverWithoutPayment(card)}
			onCancelConfirm={onCancelConfirm}
			onViewDetails={() => onViewDetails(card.id)}
			dragAttributes={attributes}
			dragListeners={listeners}
			className="animate-in fade-in-0 slide-in-from-top-1 duration-200 motion-reduce:animate-none"
		/>
	);
}

export function FulfillmentColumn({
	status,
	cards,
	organizationConfig,
	pendingCardIds,
	confirmCardId,
	onMove,
	onPatch,
	onConfirmDelivery,
	onDeliverWithoutPayment,
	onCancelConfirm,
	onViewDetails,
}: {
	status: TBoardStatus;
	cards: TSalesFulfillmentCard[];
	organizationConfig: TOrganizationConfiguration;
	pendingCardIds: Set<string>;
	confirmCardId: string | null;
	onMove: (card: TSalesFulfillmentCard, target: TSaleAttendanceStatusEnum) => void;
	onPatch: (input: TPatchSalesFulfillmentInput) => void;
	onConfirmDelivery: (card: TSalesFulfillmentCard) => void;
	onDeliverWithoutPayment: (card: TSalesFulfillmentCard) => void;
	onCancelConfirm: () => void;
	onViewDetails: (saleId: string) => void;
}) {
	const { setNodeRef, isOver } = useDroppable({ id: status });
	const meta = ATTENDANCE_COLUMN_META[status];
	const Icon = meta.icon;

	return (
		<div className="flex h-full min-h-0 w-[300px] min-w-[300px] snap-start flex-col gap-2">
			<div className="flex shrink-0 items-center justify-between px-1.5">
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
					"scrollbar-subtle flex min-h-0 grow flex-col gap-2 overflow-y-auto rounded-xl border border-dashed p-1.5 transition-colors",
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
							organizationConfig={organizationConfig}
							isPending={pendingCardIds.has(card.id)}
							awaitingConfirm={confirmCardId === card.id}
							onMove={onMove}
							onPatch={onPatch}
							onConfirmDelivery={onConfirmDelivery}
							onDeliverWithoutPayment={onDeliverWithoutPayment}
							onCancelConfirm={onCancelConfirm}
							onViewDetails={onViewDetails}
						/>
					))
				)}
			</div>
		</div>
	);
}
