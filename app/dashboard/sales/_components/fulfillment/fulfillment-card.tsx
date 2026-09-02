"use client";

import type { TPatchSalesFulfillmentInput } from "@/app/api/sales/fulfillment/route";
import type { TSalesFulfillmentCard } from "@/app/api/sales/fulfillment/route";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatToMoney, formatToPhone } from "@/lib/formatting";
import { appRoutes } from "@/lib/navigation/routes";
import { cn } from "@/lib/utils";
import type { TOrganizationConfiguration } from "@/schemas/organizations";
import type { TSaleAttendanceStatusEnum } from "@/schemas/enums";
import { SalesIntegrationPill } from "@/components/Sales/SalesIntegrationPill";
import type { DraggableAttributes, DraggableSyntheticListeners } from "@dnd-kit/core";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CircleUser, Clock, Eye, GripVertical, Loader2, MoveRight, PencilLine } from "lucide-react";
import Link from "next/link";
import { forwardRef, type CSSProperties } from "react";
import { ATTENDANCE_STATUS_LABEL, FINANCIAL_BADGE_META, getValidBoardTargets } from "./config";
import { CardQuickActions, fulfillmentCardShowsFinancialBadge } from "./quick-actions/CardQuickActions";

const TONE_CLASSES: Record<"success" | "muted" | "neutral" | "danger", string> = {
	success: "border-green-200 bg-green-100 text-green-600",
	muted: "border-border text-muted-foreground",
	neutral: "border-border bg-secondary text-secondary-foreground",
	danger: "border-destructive/30 bg-destructive/10 text-destructive",
};

function StatusPill({ label, tone, icon }: { label: string; tone: "success" | "muted" | "neutral" | "danger"; icon?: React.ReactNode }) {
	return (
		<span
			className={cn(
				"inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-tight uppercase gap-1.5",
				TONE_CLASSES[tone],
			)}
		>
			{icon ? icon : null}
			{label}
		</span>
	);
}

type FulfillmentCardProps = {
	card: TSalesFulfillmentCard;
	organizationConfig: TOrganizationConfiguration;
	canEditSales?: boolean;
	isPending?: boolean;
	isDragging?: boolean;
	isOverlay?: boolean;
	awaitingConfirm?: boolean;
	onMove?: (target: TSaleAttendanceStatusEnum) => void;
	onPatch?: (input: TPatchSalesFulfillmentInput) => void;
	onViewDetails?: () => void;
	dragAttributes?: DraggableAttributes;
	dragListeners?: DraggableSyntheticListeners;
	style?: CSSProperties;
	className?: string;
};

export const FulfillmentCard = forwardRef<HTMLDivElement, FulfillmentCardProps>(function FulfillmentCard(
	{
		card,
		organizationConfig,
		canEditSales,
		isPending,
		isDragging,
		isOverlay,
		awaitingConfirm,
		onMove,
		onPatch,
		onViewDetails,
		dragAttributes,
		dragListeners,
		style,
		className,
	},
	ref,
) {
	const financeiro = FINANCIAL_BADGE_META[card.financeiro];
	const moveTargets = onMove ? getValidBoardTargets(card.statusAtendimento) : [];
	const clientPhone = card.cliente?.telefone ? formatToPhone(card.cliente.telefone) : null;
	const hasPaymentSection =
		Boolean(onPatch) &&
		(card.pagamentos.some((payment) => payment.editavel || payment.dataEfetivacao != null) || card.resumoPagamentos.totalPendentes > 0);
	const showFinancialBadge = fulfillmentCardShowsFinancialBadge(card, hasPaymentSection);

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
			{awaitingConfirm ? (
				<div
					role="status"
					className="flex items-center justify-between gap-2 rounded-lg border border-brand/35 bg-brand/10 px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wide"
				>
					<span>Aguardando confirmação</span>
					<span aria-hidden="true" className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-brand motion-reduce:animate-none" />
				</div>
			) : null}
			{isPending && !awaitingConfirm ? (
				<div className="absolute right-2 top-2 z-10">
					<Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
				</div>
			) : null}

			<div className="flex items-start gap-1.5">
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
						<SalesIntegrationPill integracao={card.integracao} className="max-w-[8.5rem]" />
					</div>
					<span className="truncate text-[11px] text-muted-foreground">#{card.idExterno}</span>
				</div>

				<div className="flex shrink-0 items-center gap-0.5">
					{canEditSales && card.editabilidade.nivel === "TOTAL" ? (
						<Link
							href={appRoutes.sales.edit(card.id)}
							aria-label="Editar venda"
							onPointerDown={(event) => event.stopPropagation()}
							onClick={(event) => event.stopPropagation()}
							className="rounded-md p-1 text-muted-foreground/60 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						>
							<PencilLine className="h-4 w-4" />
						</Link>
					) : null}
					{onViewDetails ? (
						<button
							id={`sale-details-trigger-${card.id}`}
							type="button"
							aria-label="Ver detalhes do pedido"
							onPointerDown={(event) => event.stopPropagation()}
							onClick={(event) => {
								event.stopPropagation();
								onViewDetails();
							}}
							className="rounded-md p-1 text-muted-foreground/60 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						>
							<Eye className="h-4 w-4" />
						</button>
					) : null}

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
			</div>

			<div className="flex items-center justify-between gap-2 pl-5">
				{clientPhone ? (
					<span className="truncate text-[11px] tabular-nums text-muted-foreground">{clientPhone}</span>
				) : (
					<span className="text-[11px] text-muted-foreground/50">—</span>
				)}
				<span className="shrink-0 text-sm font-bold tabular-nums">{formatToMoney(card.valorTotal)}</span>
			</div>

			{onPatch ? (
				<CardQuickActions card={card} organizationConfig={organizationConfig} disabled={isPending || awaitingConfirm} onPatch={onPatch} />
			) : null}

			{showFinancialBadge ? (
				<div className="flex flex-wrap items-center gap-1.5">
					<StatusPill label={financeiro.label} tone={financeiro.tone} icon={financeiro.icon} />
				</div>
			) : null}

			{card.dataVenda ? (
				<div className="flex items-center gap-1 text-[10px] text-muted-foreground/80">
					<Clock className="h-2.5 w-2.5" />
					<span>confirmada {formatDistanceToNow(new Date(card.dataVenda), { addSuffix: true, locale: ptBR })}</span>
				</div>
			) : null}
		</div>
	);
});
