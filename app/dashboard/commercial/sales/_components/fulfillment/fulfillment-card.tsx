"use client";

import type { TSalesFulfillmentCard } from "@/app/api/sales/fulfillment/route";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatToMoney } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import type { TSaleAttendanceStatusEnum } from "@/schemas/enums";
import type { DraggableAttributes, DraggableSyntheticListeners } from "@dnd-kit/core";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CircleUser, Clock, GripVertical, Loader2, MoveRight, StickyNote } from "lucide-react";
import { forwardRef, type CSSProperties } from "react";
import { ATTENDANCE_STATUS_LABEL, DELIVERY_MODE_META, FINANCIAL_BADGE_META, FISCAL_BADGE_META, getValidBoardTargets } from "./config";

const TONE_CLASSES: Record<"muted" | "neutral" | "danger", string> = {
	muted: "border-border text-muted-foreground",
	neutral: "border-border bg-secondary text-secondary-foreground",
	danger: "border-destructive/30 bg-destructive/10 text-destructive",
};

function StatusPill({ label, tone }: { label: string; tone: "muted" | "neutral" | "danger" }) {
	return (
		<span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-tight uppercase", TONE_CLASSES[tone])}>
			{label}
		</span>
	);
}

type FulfillmentCardProps = {
	card: TSalesFulfillmentCard;
	isPending?: boolean;
	isDragging?: boolean;
	isOverlay?: boolean;
	awaitingConfirm?: boolean;
	onMove?: (target: TSaleAttendanceStatusEnum) => void;
	onConfirmDelivery?: () => void;
	onCancelConfirm?: () => void;
	dragAttributes?: DraggableAttributes;
	dragListeners?: DraggableSyntheticListeners;
	style?: CSSProperties;
	className?: string;
};

export const FulfillmentCard = forwardRef<HTMLDivElement, FulfillmentCardProps>(function FulfillmentCard(
	{ card, isPending, isDragging, isOverlay, awaitingConfirm, onMove, onConfirmDelivery, onCancelConfirm, dragAttributes, dragListeners, style, className },
	ref,
) {
	const modalidade = card.entregaModalidade ? DELIVERY_MODE_META[card.entregaModalidade] : null;
	const ModalidadeIcon = modalidade?.icon;
	const financeiro = FINANCIAL_BADGE_META[card.financeiro];
	const fiscal = FISCAL_BADGE_META[card.fiscal];
	const moveTargets = onMove ? getValidBoardTargets(card.statusAtendimento) : [];

	return (
		<div
			ref={ref}
			style={style}
			className={cn(
				"group/card relative flex flex-col gap-2 rounded-xl border border-border bg-card px-3 py-2.5 shadow-2xs",
				"transition-shadow hover:shadow-sm motion-reduce:transition-none",
				isOverlay && "rotate-2 cursor-grabbing shadow-md",
				isDragging && "opacity-40",
				isPending && "pointer-events-none opacity-60",
				awaitingConfirm && "ring-2 ring-foreground/20",
				className,
			)}
		>
			{isPending ? (
				<div className="absolute right-2 top-2 z-10">
					<Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
				</div>
			) : null}

			<div className="flex items-start gap-1.5">
				{/* Drag handle: only this area initiates the drag, keeping the kebab clickable. */}
				{awaitingConfirm ? (
					<span className="mt-0.5 w-4" />
				) : (
					<button
						type="button"
						aria-label="Arrastar pedido"
						className="mt-0.5 cursor-grab touch-none text-muted-foreground/50 hover:text-muted-foreground focus-visible:outline-none active:cursor-grabbing"
						{...dragAttributes}
						{...dragListeners}
					>
						<GripVertical className="h-4 w-4" />
					</button>
				)}

				<div className="flex min-w-0 grow flex-col gap-0.5">
					<div className="flex min-w-0 items-center gap-1.5">
						<CircleUser className="h-3.5 w-3.5 shrink-0 text-foreground/60" />
						<span className="truncate text-sm font-bold tracking-tight">{card.cliente?.nome ?? "Ao consumidor"}</span>
					</div>
					<span className="truncate text-[11px] text-muted-foreground">#{card.idExterno}</span>
				</div>

				{onMove && moveTargets.length > 0 ? (
					<DropdownMenu>
						<DropdownMenuTrigger
							aria-label="Mover pedido"
							onPointerDown={(e) => e.stopPropagation()}
							className="rounded-md p-1 text-muted-foreground/60 hover:bg-accent hover:text-foreground focus-visible:outline-none"
						>
							<MoveRight className="h-4 w-4" />
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuLabel className="text-[11px]">Mover para</DropdownMenuLabel>
							<DropdownMenuSeparator />
							{moveTargets.map((target) => (
								<DropdownMenuItem key={target} onSelect={() => onMove?.(target)}>
									{ATTENDANCE_STATUS_LABEL[target]}
								</DropdownMenuItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>
				) : null}
			</div>

			<div className="flex items-center justify-between gap-2">
				<span className="text-sm font-bold tabular-nums">{formatToMoney(card.valorTotal)}</span>
				{modalidade && ModalidadeIcon ? (
					<span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
						<ModalidadeIcon className="h-3 w-3" />
						{modalidade.label}
					</span>
				) : null}
			</div>

			<div className="flex flex-wrap items-center gap-1.5">
				<StatusPill label={financeiro.label} tone={financeiro.tone} />
				<StatusPill label={fiscal.label} tone={fiscal.tone} />
			</div>

			{card.observacoes ? (
				<div className="flex items-start gap-1 text-[11px] text-muted-foreground">
					<StickyNote className="mt-0.5 h-3 w-3 shrink-0" />
					<span className="line-clamp-2 break-words">{card.observacoes}</span>
				</div>
			) : null}

			{card.dataVenda ? (
				<div className="flex items-center gap-1 text-[10px] text-muted-foreground/80">
					<Clock className="h-2.5 w-2.5" />
					<span>confirmada {formatDistanceToNow(new Date(card.dataVenda), { addSuffix: true, locale: ptBR })}</span>
				</div>
			) : null}

			{awaitingConfirm ? (
				<div className="mt-1 flex flex-col gap-2 border-t border-border pt-2">
					<p className="text-[11px] leading-snug text-muted-foreground">Confirmar entrega? Isso registra a baixa física de estoque do pedido.</p>
					<div className="flex items-center gap-1.5">
						<button
							type="button"
							onClick={onConfirmDelivery}
							className="inline-flex h-7 grow items-center justify-center rounded-lg bg-primary px-2 text-[11px] font-bold text-primary-foreground hover:bg-primary/90"
						>
							Confirmar entrega
						</button>
						<button
							type="button"
							onClick={onCancelConfirm}
							className="inline-flex h-7 items-center justify-center rounded-lg border border-border px-2 text-[11px] font-bold hover:bg-accent"
						>
							Cancelar
						</button>
					</div>
				</div>
			) : null}
		</div>
	);
});
