"use client";

import type { TPatchSalesFulfillmentInput, TSalesFulfillmentCard } from "@/app/api/sales/fulfillment/route";
import { cn } from "@/lib/utils";
import type { TOrganizationConfiguration } from "@/schemas/organizations";
import type { TSaleAttendanceStatusEnum } from "@/schemas/enums";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import { ATTENDANCE_COLUMN_META, BOARD_COLUMN_WIDTH_PX, BOARD_RAIL_WIDTH_PX, type TBoardStatus } from "./config";
import { FulfillmentCard } from "./fulfillment-card";

// Curva ease-out-quart: sai rapido e assenta devagar, sem overshoot.
const COMPACTION_EASING = "cubic-bezier(0.22,1,0.36,1)";

const COUNT_BADGE_CLASS =
	"inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary px-1.5 text-[11px] font-bold tabular-nums text-secondary-foreground";

const HEADER_BUTTON_CLASS =
	"inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/15";

function DraggableCard({
	card,
	organizationConfig,
	isPending,
	awaitingConfirm,
	onMove,
	onPatch,
	onViewDetails,
	canEditSales,
}: {
	card: TSalesFulfillmentCard;
	organizationConfig: TOrganizationConfiguration;
	isPending: boolean;
	awaitingConfirm: boolean;
	onMove: (card: TSalesFulfillmentCard, target: TSaleAttendanceStatusEnum) => void;
	onPatch: (input: TPatchSalesFulfillmentInput) => void;
	onViewDetails: (saleId: string) => void;
	canEditSales?: boolean;
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
			canEditSales={canEditSales}
			isPending={isPending}
			isDragging={isDragging}
			awaitingConfirm={awaitingConfirm}
			onMove={(target) => onMove(card, target)}
			onPatch={onPatch}
			onViewDetails={() => onViewDetails(card.id)}
			dragAttributes={attributes}
			dragListeners={listeners}
			className="animate-in fade-in-0 slide-in-from-top-1 duration-200 motion-reduce:animate-none"
		/>
	);
}

/**
 * Trilha vertical de uma etapa recolhida. A trilha inteira e o alvo de clique, e a contagem vem no
 * topo porque uma etapa recolhida jamais pode esconder QUANTOS pedidos ela guarda. O ponto vermelho
 * e o que torna a compactacao segura em vez de apenas arrumada: sem ele, recolher uma etapa vira uma
 * forma de perder um pedido com pagamento em atraso.
 */
function CollapsedStageRail({
	status,
	count,
	hasOverduePayment,
	onExpand,
	controlsId,
}: {
	status: TBoardStatus;
	count: number;
	hasOverduePayment: boolean;
	onExpand: () => void;
	controlsId: string;
}) {
	const meta = ATTENDANCE_COLUMN_META[status];
	const Icon = meta.icon;

	return (
		<button
			type="button"
			onClick={onExpand}
			aria-expanded={false}
			aria-controls={controlsId}
			aria-label={`Expandir etapa ${meta.label}, ${count} pedido(s)`}
			className={cn(
				"group/rail absolute inset-0 z-10 flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/60 bg-secondary/50 py-2",
				"transition-colors hover:border-border hover:bg-accent",
				"focus-visible:border-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/15",
				"animate-in fade-in-0 duration-200 motion-reduce:animate-none",
			)}
		>
			<span className={cn(COUNT_BADGE_CLASS, "bg-background")}>{count}</span>
			<Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
			{hasOverduePayment ? (
				<span
					className="h-1.5 w-1.5 shrink-0 rounded-full bg-destructive"
					title={`Há pedido com pagamento em atraso em ${meta.label}.`}
					aria-label="Pagamento em atraso nesta etapa"
					role="img"
				/>
			) : null}

			<span className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
				<span className="truncate text-xs font-extrabold uppercase tracking-wide [writing-mode:vertical-rl] rotate-180">{meta.label}</span>
			</span>

			<ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/rail:opacity-100 group-focus-visible/rail:opacity-100" />
		</button>
	);
}

/**
 * Previa de destino quando um card e arrastado sobre uma etapa recolhida. Ela e posicionada por cima
 * das colunas vizinhas em vez de expandir no fluxo: se a trilha empurrasse os vizinhos, o alvo de
 * soltura escorregaria debaixo do cursor no meio do arraste.
 */
function CollapsedStageDropPreview({ status, count, alignEnd }: { status: TBoardStatus; count: number; alignEnd: boolean }) {
	const meta = ATTENDANCE_COLUMN_META[status];
	const Icon = meta.icon;

	return (
		<div
			aria-hidden
			style={{ width: BOARD_COLUMN_WIDTH_PX }}
			className={cn(
				"pointer-events-none absolute inset-y-0 z-20 flex flex-col gap-2 rounded-xl border border-primary/40 bg-card p-1.5",
				"shadow-[0_12px_24px_rgba(0,0,0,0.08),0_4px_8px_rgba(0,0,0,0.04)] animate-in fade-in-0 zoom-in-95 duration-150 motion-reduce:animate-none",
				// A previa abre para o lado que tem espaco: na ultima coluna, abrir para a direita a
				// jogaria para fora do scroller horizontal e ela apareceria cortada.
				alignEnd ? "right-0" : "left-0",
			)}
		>
			<div className="flex shrink-0 items-center gap-1.5 px-1.5 pt-1">
				<Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
				<span className="truncate text-xs font-extrabold uppercase tracking-wide">{meta.label}</span>
				<span className={cn(COUNT_BADGE_CLASS, "ml-auto")}>{count}</span>
			</div>
			<div className="flex min-h-0 flex-1 items-center justify-center rounded-xl border border-dashed border-primary/40 bg-accent/50 px-4 text-center text-xs font-bold text-primary">
				Soltar em {meta.label}
			</div>
		</div>
	);
}

export function FulfillmentColumn({
	status,
	cards,
	organizationConfig,
	pendingCardIds,
	pendingTransitionCardId,
	isCollapsed,
	hasOverduePayment,
	isLastColumn,
	canCompact,
	onSetCollapsed,
	onFocus,
	onMove,
	onPatch,
	onViewDetails,
	canEditSales,
}: {
	status: TBoardStatus;
	cards: TSalesFulfillmentCard[];
	organizationConfig: TOrganizationConfiguration;
	pendingCardIds: Set<string>;
	pendingTransitionCardId: string | null;
	isCollapsed: boolean;
	hasOverduePayment: boolean;
	isLastColumn: boolean;
	canCompact: boolean;
	onSetCollapsed: (status: TBoardStatus, collapsed: boolean) => void;
	onFocus: (status: TBoardStatus) => void;
	onMove: (card: TSalesFulfillmentCard, target: TSaleAttendanceStatusEnum) => void;
	onPatch: (input: TPatchSalesFulfillmentInput) => void;
	onViewDetails: (saleId: string) => void;
	canEditSales?: boolean;
}) {
	const { setNodeRef, isOver } = useDroppable({ id: status });
	const meta = ATTENDANCE_COLUMN_META[status];
	const Icon = meta.icon;
	const bodyId = `fulfillment-column-body-${status}`;
	const showDropPreview = isCollapsed && isOver;

	return (
		<div
			ref={setNodeRef}
			style={{ width: isCollapsed ? BOARD_RAIL_WIDTH_PX : BOARD_COLUMN_WIDTH_PX, transitionTimingFunction: COMPACTION_EASING }}
			className={cn(
				"relative h-full min-h-0 shrink-0 snap-start transition-[width] duration-200 motion-reduce:transition-none",
				showDropPreview && "z-30",
			)}
		>
			{/* Recorte: o conteudo expandido existe sempre em 300px e apenas some por baixo da borda. */}
			<div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
				<div
					style={{ width: BOARD_COLUMN_WIDTH_PX }}
					inert={isCollapsed || undefined}
					aria-hidden={isCollapsed || undefined}
					className={cn(
						"flex h-full min-h-0 shrink-0 flex-col gap-2 transition-opacity duration-150 motion-reduce:transition-none",
						isCollapsed && "opacity-0",
					)}
				>
					<div className="group/header flex shrink-0 items-center gap-1.5 px-1.5">
						<Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
						<span className="truncate text-xs font-extrabold uppercase tracking-wide">{meta.label}</span>
						<span className={cn(COUNT_BADGE_CLASS, "ml-auto")}>{cards.length}</span>
						<div
							className={cn(
								"flex items-center gap-0.5 opacity-60 transition-opacity group-hover/header:opacity-100 focus-within:opacity-100",
								!canCompact && "hidden",
							)}
						>
							<button
								type="button"
								onClick={() => onFocus(status)}
								aria-label={`Focar em ${meta.label} e recolher as demais etapas`}
								title={`Focar em ${meta.label}`}
								className={HEADER_BUTTON_CLASS}
							>
								<Maximize2 className="h-3.5 w-3.5" />
							</button>
							<button
								type="button"
								onClick={() => onSetCollapsed(status, true)}
								aria-expanded
								aria-controls={bodyId}
								aria-label={`Recolher etapa ${meta.label}`}
								title={`Recolher ${meta.label}`}
								className={HEADER_BUTTON_CLASS}
							>
								<ChevronLeft className="h-4 w-4" />
							</button>
						</div>
					</div>

					<div
						id={bodyId}
						className={cn(
							"scrollbar-subtle flex min-h-0 grow flex-col gap-2 overflow-y-auto rounded-xl border border-dashed p-1.5 transition-colors",
							isOver && !isCollapsed ? "border-foreground/30 bg-accent/50" : "border-border/60",
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
									awaitingConfirm={pendingTransitionCardId === card.id}
									onMove={onMove}
									onPatch={onPatch}
									onViewDetails={onViewDetails}
									canEditSales={canEditSales}
								/>
							))
						)}
					</div>
				</div>
			</div>

			{isCollapsed ? (
				<CollapsedStageRail
					status={status}
					count={cards.length}
					hasOverduePayment={hasOverduePayment}
					onExpand={() => onSetCollapsed(status, false)}
					controlsId={bodyId}
				/>
			) : null}

			{showDropPreview ? <CollapsedStageDropPreview status={status} count={cards.length} alignEnd={isLastColumn} /> : null}
		</div>
	);
}
