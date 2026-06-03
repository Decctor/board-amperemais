"use client";

import type { TGetSalesFulfillmentOutput, TSalesFulfillmentCard } from "@/app/api/sales/fulfillment/route";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/errors";
import { updateSaleAttendanceStatus } from "@/lib/mutations/sales";
import { SALES_FULFILLMENT_QUERY_KEY, useSalesFulfillment } from "@/lib/queries/sales-fulfillment";
import { isValidAttendanceTransition } from "@/lib/sale-processing/attendance";
import type { TSaleAttendanceStatusEnum } from "@/schemas/enums";
import {
	DndContext,
	DragOverlay,
	PointerSensor,
	closestCorners,
	useSensor,
	useSensors,
	type DragEndEvent,
	type DragStartEvent,
} from "@dnd-kit/core";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ATTENDANCE_STATUS_LABEL, BOARD_STATUSES, type TBoardStatus, transitionNeedsConfirmation } from "./config";
import { FulfillmentCard } from "./fulfillment-card";
import { FulfillmentColumn } from "./fulfillment-column";

type FulfillmentData = TGetSalesFulfillmentOutput["data"];

export default function FulfillmentBoard() {
	const { data, isLoading, isError, error, refetch, isRefetching } = useSalesFulfillment();
	const queryClient = useQueryClient();

	const [activeId, setActiveId] = useState<string | null>(null);
	const [pendingCardIds, setPendingCardIds] = useState<Set<string>>(new Set());
	const [confirm, setConfirm] = useState<{ cardId: string; snapshot: FulfillmentData | undefined } | null>(null);

	const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

	const cards = useMemo(() => data?.cards ?? [], [data]);
	const grouped = useMemo(() => {
		const map = Object.fromEntries(BOARD_STATUSES.map((status) => [status, [] as TSalesFulfillmentCard[]])) as Record<
			TBoardStatus,
			TSalesFulfillmentCard[]
		>;
		for (const card of cards) {
			if ((BOARD_STATUSES as readonly string[]).includes(card.statusAtendimento)) {
				map[card.statusAtendimento as TBoardStatus].push(card);
			}
		}
		return map;
	}, [cards]);

	const activeCard = activeId ? cards.find((card) => card.id === activeId) ?? null : null;

	function setCardStatus(cardId: string, target: TSaleAttendanceStatusEnum) {
		queryClient.setQueryData<FulfillmentData>(SALES_FULFILLMENT_QUERY_KEY, (old) =>
			old ? { cards: old.cards.map((card) => (card.id === cardId ? { ...card, statusAtendimento: target } : card)) } : old,
		);
	}

	// Optimistic controller: the card is already in the target column (moved in `initiateMove`).
	// We fire the request and, on failure, roll back to the snapshot taken before the move.
	async function commitMove(card: TSalesFulfillmentCard, target: TSaleAttendanceStatusEnum, snapshot: FulfillmentData | undefined) {
		setPendingCardIds((prev) => new Set(prev).add(card.id));
		try {
			await updateSaleAttendanceStatus({ id: card.id, statusAtendimento: target });
			toast.success(`Pedido movido para ${ATTENDANCE_STATUS_LABEL[target]}.`);
			queryClient.invalidateQueries({ queryKey: SALES_FULFILLMENT_QUERY_KEY });
		} catch (err) {
			if (snapshot) queryClient.setQueryData(SALES_FULFILLMENT_QUERY_KEY, snapshot);
			toast.error(getErrorMessage(err));
		} finally {
			setPendingCardIds((prev) => {
				const next = new Set(prev);
				next.delete(card.id);
				return next;
			});
		}
	}

	function initiateMove(card: TSalesFulfillmentCard, target: TSaleAttendanceStatusEnum) {
		if (target === card.statusAtendimento) return;
		if (!isValidAttendanceTransition(card.statusAtendimento, target)) {
			toast.info(`Não é possível mover de ${ATTENDANCE_STATUS_LABEL[card.statusAtendimento]} para ${ATTENDANCE_STATUS_LABEL[target]}.`);
			return;
		}
		const snapshot = queryClient.getQueryData<FulfillmentData>(SALES_FULFILLMENT_QUERY_KEY);
		setCardStatus(card.id, target);
		if (transitionNeedsConfirmation(target)) {
			setConfirm({ cardId: card.id, snapshot });
		} else {
			void commitMove(card, target, snapshot);
		}
	}

	function handleDragStart(event: DragStartEvent) {
		setActiveId(String(event.active.id));
	}

	function handleDragEnd(event: DragEndEvent) {
		setActiveId(null);
		const { active, over } = event;
		if (!over) return;
		const card = cards.find((item) => item.id === String(active.id));
		if (!card) return;
		initiateMove(card, String(over.id) as TSaleAttendanceStatusEnum);
	}

	function handleConfirmDelivery(card: TSalesFulfillmentCard) {
		const snapshot = confirm?.snapshot;
		setConfirm(null);
		void commitMove(card, "ENTREGUE", snapshot);
	}

	function handleCancelConfirm() {
		if (confirm?.snapshot) queryClient.setQueryData(SALES_FULFILLMENT_QUERY_KEY, confirm.snapshot);
		setConfirm(null);
	}

	if (isLoading) {
		return (
			<div className="flex gap-3 overflow-hidden">
				{BOARD_STATUSES.map((status) => (
					<div key={status} className="flex w-[280px] min-w-[280px] flex-col gap-2">
						<Skeleton className="h-5 w-32" />
						<Skeleton className="h-24 w-full rounded-xl" />
						<Skeleton className="h-24 w-full rounded-xl" />
					</div>
				))}
			</div>
		);
	}

	if (isError) return <ErrorComponent msg={getErrorMessage(error)} />;

	return (
		<div className="flex h-full min-h-[60vh] flex-col gap-3">
			<div className="flex items-center justify-between">
				<p className="text-xs text-muted-foreground">
					{cards.length > 0 ? `${cards.length} pedido(s) em atendimento` : "Nenhum pedido em atendimento no momento"}
				</p>
				<Button variant="ghost" size="icon" onClick={() => refetch()} disabled={isRefetching} aria-label="Atualizar">
					<RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
				</Button>
			</div>

			{cards.length === 0 ? (
				<div className="flex grow flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border py-16 text-center">
					<p className="text-sm font-bold tracking-tight">Nenhum pedido em atendimento</p>
					<p className="max-w-md text-xs text-muted-foreground">
						Pedidos confirmados aparecem aqui para você acompanhar o preparo e a entrega. Arraste um card para mover entre as etapas.
					</p>
				</div>
			) : (
				<DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
					<div className="flex min-h-0 grow gap-3 overflow-x-auto pb-2">
						{BOARD_STATUSES.map((status) => (
							<FulfillmentColumn
								key={status}
								status={status}
								cards={grouped[status]}
								pendingCardIds={pendingCardIds}
								confirmCardId={confirm?.cardId ?? null}
								onMove={initiateMove}
								onConfirmDelivery={handleConfirmDelivery}
								onCancelConfirm={handleCancelConfirm}
							/>
						))}
					</div>

					<DragOverlay>{activeCard ? <FulfillmentCard card={activeCard} isOverlay /> : null}</DragOverlay>
				</DndContext>
			)}
		</div>
	);
}
