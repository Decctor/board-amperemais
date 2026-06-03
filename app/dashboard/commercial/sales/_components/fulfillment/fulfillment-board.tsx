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
	type Announcements,
	type DragEndEvent,
	type DragStartEvent,
	type ScreenReaderInstructions,
} from "@dnd-kit/core";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ATTENDANCE_COLUMN_META, ATTENDANCE_STATUS_LABEL, BOARD_STATUSES, type TBoardStatus, transitionNeedsConfirmation } from "./config";
import { FulfillmentCard } from "./fulfillment-card";
import { FulfillmentColumn } from "./fulfillment-column";

const KANBAN_SCROLL_CLASS = "scrollbar-subtle";

/**
 * Altura máxima do board em desktop: desconta só o chrome *acima* dele
 * (padding do layout, AppHeader, abas). A barra "X pedidos" fica dentro e
 * o kanban usa flex-1 — evita somar ~100dvh de kanban + header da página.
 */
const BOARD_DESKTOP_MAX_HEIGHT = "md:max-h-[calc(100dvh-10.5rem)] md:overflow-hidden";

type FulfillmentData = TGetSalesFulfillmentOutput["data"];

const screenReaderInstructions: ScreenReaderInstructions = {
	// O arrastar e por ponteiro/toque. Para teclado e leitores de tela, cada card tem um botao
	// "Mover pedido" com as etapas validas, que e o caminho acessivel completo.
	draggable: "Para mover um pedido pelo teclado, use o botão 'Mover pedido' em cada card e escolha a etapa de destino.",
};

export default function FulfillmentBoard() {
	const [activeId, setActiveId] = useState<string | null>(null);
	const [pendingCardIds, setPendingCardIds] = useState<Set<string>>(new Set());
	const [confirm, setConfirm] = useState<{ cardId: string; previousStatus: TSaleAttendanceStatusEnum } | null>(null);

	// Pausa o auto-refresh enquanto ha movimento otimista em voo ou confirmacao aberta.
	const paused = pendingCardIds.size > 0 || confirm !== null;
	const { data, isLoading, isError, error, refetch, isRefetching } = useSalesFulfillment({ paused });
	const queryClient = useQueryClient();

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
	// We fire the request and, on failure, roll back ONLY this card to its previous status, so a
	// failure on one move never clobbers other cards moved concurrently.
	async function commitMove(card: TSalesFulfillmentCard, target: TSaleAttendanceStatusEnum, previousStatus: TSaleAttendanceStatusEnum) {
		setPendingCardIds((prev) => new Set(prev).add(card.id));
		try {
			await updateSaleAttendanceStatus({ id: card.id, statusAtendimento: target });
			toast.success(`Pedido movido para ${ATTENDANCE_STATUS_LABEL[target]}.`);
		} catch (err) {
			setCardStatus(card.id, previousStatus);
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
		if (pendingCardIds.has(card.id) || confirm?.cardId === card.id) return;
		if (target === card.statusAtendimento) return;
		if (!isValidAttendanceTransition(card.statusAtendimento, target)) {
			toast.info(`Não é possível mover de ${ATTENDANCE_STATUS_LABEL[card.statusAtendimento]} para ${ATTENDANCE_STATUS_LABEL[target]}.`);
			return;
		}
		const previousStatus = card.statusAtendimento;
		setCardStatus(card.id, target);
		if (transitionNeedsConfirmation(target)) {
			setConfirm({ cardId: card.id, previousStatus });
		} else {
			void commitMove(card, target, previousStatus);
		}
	}

	const announcements: Announcements = {
		onDragStart: ({ active }) => {
			const card = cards.find((item) => item.id === String(active.id));
			return `Pegou o pedido de ${card?.cliente?.nome ?? card?.idExterno ?? "cliente"}.`;
		},
		onDragOver: ({ over }) => {
			if (!over) return undefined;
			const label = ATTENDANCE_COLUMN_META[String(over.id) as TBoardStatus]?.label ?? String(over.id);
			return `Sobre a etapa ${label}.`;
		},
		onDragEnd: ({ over }) => {
			if (!over) return "Movimento cancelado.";
			const label = ATTENDANCE_COLUMN_META[String(over.id) as TBoardStatus]?.label ?? String(over.id);
			return `Pedido solto na etapa ${label}.`;
		},
		onDragCancel: () => "Movimento cancelado.",
	};

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
		const previousStatus = confirm?.previousStatus ?? "PRONTO";
		setConfirm(null);
		void commitMove(card, "ENTREGUE", previousStatus);
	}

	function handleCancelConfirm() {
		if (confirm) setCardStatus(confirm.cardId, confirm.previousStatus);
		setConfirm(null);
	}

	if (isLoading) {
		return (
			<div className={cn("flex min-h-0 flex-1 flex-col gap-3", BOARD_DESKTOP_MAX_HEIGHT)}>
				<Skeleton className="h-9 w-full max-w-md shrink-0" />
				<div
					className={cn(
						KANBAN_SCROLL_CLASS,
						"flex min-h-[50vh] flex-1 gap-3 overflow-x-auto pb-2 md:min-h-0 md:overflow-y-hidden",
					)}
				>
					{BOARD_STATUSES.map((status) => (
						<div key={status} className="flex h-full w-[280px] min-w-[280px] flex-col gap-2">
							<Skeleton className="h-5 w-32 shrink-0" />
							<Skeleton className="h-full min-h-24 w-full rounded-xl" />
						</div>
					))}
				</div>
			</div>
		);
	}

	if (isError) return <ErrorComponent msg={getErrorMessage(error)} />;

	return (
		<div className={cn("flex min-h-0 flex-1 flex-col gap-3", BOARD_DESKTOP_MAX_HEIGHT)}>
			<div className="flex shrink-0 items-center justify-between">
				<p className="text-xs text-muted-foreground">
					{cards.length > 0 ? `${cards.length} pedido(s) em atendimento` : "Nenhum pedido em atendimento no momento"}
				</p>
				<Button variant="ghost" size="icon" onClick={() => refetch()} disabled={isRefetching} aria-label="Atualizar">
					<RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
				</Button>
			</div>

			{cards.length === 0 ? (
				<div className="flex min-h-[40vh] flex-1 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border py-16 text-center md:min-h-0">
					<p className="text-sm font-bold tracking-tight">Nenhum pedido em atendimento</p>
					<p className="max-w-md text-xs text-muted-foreground">
						Pedidos confirmados aparecem aqui para você acompanhar o preparo e a entrega. Arraste um card para mover entre as etapas.
					</p>
				</div>
			) : (
				<DndContext
					sensors={sensors}
					collisionDetection={closestCorners}
					accessibility={{ announcements, screenReaderInstructions }}
					onDragStart={handleDragStart}
					onDragEnd={handleDragEnd}
					onDragCancel={() => setActiveId(null)}
				>
					<div
						className={cn(
							KANBAN_SCROLL_CLASS,
							"flex min-h-[50vh] flex-1 snap-x gap-3 overflow-x-auto pb-2 md:min-h-0 md:overflow-y-hidden",
						)}
					>
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

					<DragOverlay dropAnimation={null}>{activeCard ? <FulfillmentCard card={activeCard} isOverlay /> : null}</DragOverlay>
				</DndContext>
			)}
		</div>
	);
}
