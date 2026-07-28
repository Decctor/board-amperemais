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
import { QuickActionRow } from "./quick-actions/QuickActionRow";
import { cn } from "@/lib/utils";
import type { TOrganizationConfiguration } from "@/schemas/organizations";
import type { TSaleAttendanceStatusEnum } from "@/schemas/enums";
import type { DraggableAttributes, DraggableSyntheticListeners } from "@dnd-kit/core";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CircleUser, Clock, Eye, GripVertical, Loader2, MoveRight, PencilLine } from "lucide-react";
import Link from "next/link";
import { forwardRef, type CSSProperties } from "react";
import { ATTENDANCE_STATUS_LABEL, FINANCIAL_BADGE_META, getValidBoardTargets } from "./config";
import {
	CardQuickActions,
	fulfillmentCardShowsFinancialBadge,
	getPaymentControlTone,
	QuickPaymentMethodControl,
} from "./quick-actions/CardQuickActions";

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
	onConfirmDelivery?: () => void;
	onDeliverWithoutPayment?: () => void;
	onCancelConfirm?: () => void;
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
		onConfirmDelivery,
		onDeliverWithoutPayment,
		onCancelConfirm,
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
	const editablePayments = card.pagamentos.filter((payment) => payment.editavel);
	const primaryPendingPayment = editablePayments[0] ?? null;
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
			{isPending ? (
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
						{card.integracaoCanal === "IFOOD" ? (
							<span className="shrink-0 rounded-md bg-[#EA1D2C]/10 px-1.5 py-0.5 text-[0.6rem] font-bold tracking-tight text-[#EA1D2C]">iFood</span>
						) : null}
					</div>
					<span className="truncate text-[11px] text-muted-foreground">#{card.idExterno}</span>
				</div>

				<div className="flex shrink-0 items-center gap-0.5">
					{canEditSales && card.editabilidade.nivel === "TOTAL" ? (
						<Link
							href={`/dashboard/commercial/sales/edit/${card.id}`}
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

			{awaitingConfirm ? (
				<div className="mt-1 flex flex-col gap-2 border-t border-border pt-2">
					<p className="text-[11px] leading-snug text-muted-foreground">
						{card.financeiro === "RECEBIDA"
							? "Confirmar entrega? Isso registra a baixa física de estoque do pedido."
							: `Pagamento pendente${editablePayments.length > 0 ? ` (${editablePayments.length} recebimento${editablePayments.length > 1 ? "s" : ""})` : ""}. Confirme o recebimento antes de entregar.`}
					</p>
					{card.financeiro !== "RECEBIDA" && primaryPendingPayment && onPatch ? (
						<div className="flex flex-col gap-1.5">
							{editablePayments.map((payment, index) => (
								<QuickActionRow key={payment.id} label={editablePayments.length > 1 ? `Receber ${index + 1}` : "Receber como"}>
									<QuickPaymentMethodControl
										payment={payment}
										saleId={card.id}
										organizationConfig={organizationConfig}
										tone={getPaymentControlTone(payment)}
										onPatch={onPatch}
									/>
								</QuickActionRow>
							))}
						</div>
					) : null}
					<div className="flex items-center gap-1.5">
						<button
							type="button"
							onClick={onConfirmDelivery}
							className="inline-flex h-7 grow items-center justify-center rounded-lg bg-primary px-2 text-[0.55rem] font-bold text-primary-foreground hover:bg-primary/90"
						>
							{card.financeiro === "RECEBIDA" ? "CONFIRMAR ENTREGA" : "RECEBER E ENTREGAR"}
						</button>
						{card.financeiro !== "RECEBIDA" && onDeliverWithoutPayment ? (
							<button
								type="button"
								onClick={onDeliverWithoutPayment}
								className="inline-flex h-7 items-center justify-center rounded-lg border border-border px-2 text-[0.55rem] font-bold text-muted-foreground hover:bg-accent hover:text-foreground"
							>
								ENTREGAR SEM RECEBER
							</button>
						) : null}
					</div>
					<button
						type="button"
						onClick={onCancelConfirm}
						className="inline-flex h-7 items-center justify-center rounded-lg border border-border px-2 text-[0.55rem] font-bold hover:bg-accent"
					>
						CANCELAR
					</button>
				</div>
			) : null}
		</div>
	);
});
