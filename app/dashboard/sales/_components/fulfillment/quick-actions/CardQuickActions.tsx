"use client";

import type { TSalesFulfillmentCard } from "@/app/api/sales/fulfillment/route";
import type { TPatchSalesFulfillmentInput } from "@/app/api/sales/fulfillment/route";
import { Button } from "@/components/ui/button";
import {
	DropdownMenuGroup,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDateAsLocale, formatToMoney } from "@/lib/formatting";
import { getOrganizationPaymentMethodsConfig } from "@/lib/payments/defaults";
import { isPaymentOverdue, toDateOrNull } from "@/lib/sales/utils";
import { cn } from "@/lib/utils";
import type { TOrganizationConfiguration } from "@/schemas/organizations";
import type { TPaymentMethodEnum } from "@/schemas/enums";
import { SalePaymentMethodsOptions } from "@/utils/select-options";
import { Check, CircleCheck, Wallet } from "lucide-react";
import { FiscalStatusChip } from "./FiscalStatusChip";
import { QuickActionFullWidthBlock } from "./QuickActionFullWidthBlock";
import { QuickActionRow } from "./QuickActionRow";
import { QuickComandaControl } from "./QuickComandaControl";
import { QuickDeliveryModeControl } from "./QuickDeliveryModeControl";

type ClassifiedPayment = TSalesFulfillmentCard["pagamentos"][number];

type PaymentControlTone = "default" | "overdue" | "received" | "pending";

type CardQuickActionsProps = {
	card: TSalesFulfillmentCard;
	organizationConfig: TOrganizationConfiguration;
	disabled?: boolean;
	onPatch: (input: TPatchSalesFulfillmentInput) => void;
};

const PAYMENT_CONTROL_TONE_CLASSES: Record<PaymentControlTone, string> = {
	default: "",
	pending: "border border-border/60 bg-muted/30 hover:bg-muted/50",
	overdue: "border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/15 hover:text-destructive",
	received:
		"border border-green-200/70 bg-green-50/90 text-green-800 hover:bg-green-50/90 dark:border-green-900/50 dark:bg-green-950/40 dark:text-green-300",
};

function stopDragPropagation(event: React.PointerEvent) {
	event.stopPropagation();
}

function paymentRowLabel(payment: ClassifiedPayment, index: number, total: number) {
	if (total <= 1) return "Pagamento";
	if (payment.parcela && payment.totalParcelas && payment.totalParcelas > 1) {
		return `Pagamento ${payment.parcela}/${payment.totalParcelas}`;
	}
	return `Pagamento ${index + 1}`;
}

export function getPaymentControlTone(payment: ClassifiedPayment): PaymentControlTone {
	if (toDateOrNull(payment.dataEfetivacao) != null) return "received";
	if (isPaymentOverdue(payment)) return "overdue";
	if (payment.editavel) return "pending";
	return "default";
}

function paymentRowTooltip(payment: ClassifiedPayment): string | undefined {
	if (toDateOrNull(payment.dataEfetivacao) != null) return undefined;
	const previsao = toDateOrNull(payment.dataPrevisao);
	if (!isPaymentOverdue(payment) || !previsao) return undefined;
	return `Vencimento: ${formatDateAsLocale(previsao)}`;
}

function QuickPaymentMethodControl({
	payment,
	saleId,
	organizationConfig,
	disabled,
	tone = "default",
	onPatch,
}: {
	payment: ClassifiedPayment;
	saleId: string;
	organizationConfig: TOrganizationConfiguration;
	disabled?: boolean;
	tone?: PaymentControlTone;
	onPatch: (input: TPatchSalesFulfillmentInput) => void;
}) {
	const supportedMethods = SalePaymentMethodsOptions.filter(
		(method) => getOrganizationPaymentMethodsConfig(organizationConfig)[method.value]?.suportado,
	);
	const selectedMethod = SalePaymentMethodsOptions.find((method) => method.value === payment.metodo);
	const toneClasses = PAYMENT_CONTROL_TONE_CLASSES[tone];

	if (!payment.editavel) {
		return (
			<span
				className={cn(
					"inline-flex h-7 max-w-full items-center gap-1.5 truncate rounded-md px-2 text-[11px] font-semibold uppercase tracking-tight",
					toneClasses || "text-foreground/80",
				)}
			>
				<CircleCheck className={cn("h-3 w-3 shrink-0", tone === "received" ? "text-green-600 dark:text-green-400" : "text-muted-foreground")} />
				<span className="truncate">{selectedMethod?.label ?? payment.metodo}</span>
				<span className={cn("shrink-0 tabular-nums", tone === "overdue" ? "text-destructive/80" : "text-muted-foreground")}>
					{formatToMoney(payment.valor)}
				</span>
			</span>
		);
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				disabled={disabled}
				render={
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className={cn("h-7 max-w-full gap-1.5 rounded-md px-2 text-[11px] font-semibold uppercase tracking-tight", toneClasses)}
						onPointerDown={stopDragPropagation}
					>
						{selectedMethod?.icon ?? <Wallet className="h-3 w-3 shrink-0" />}
						<span className="truncate">{selectedMethod?.label ?? payment.metodo}</span>
						<span
							className={cn(
								"shrink-0 tabular-nums",
								tone === "overdue" ? "text-destructive/80" : tone === "received" ? "text-green-700/80 dark:text-green-400/80" : "text-muted-foreground",
							)}
						>
							{formatToMoney(payment.valor)}
						</span>
					</Button>
				}
			/>
			<DropdownMenuContent align="end" className="max-w-[240px]">
				<DropdownMenuGroup>
					<DropdownMenuLabel className="text-[11px]">MÉTODO</DropdownMenuLabel>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					{supportedMethods.map((method) => (
						<DropdownMenuItem
							key={method.value}
							onClick={() =>
								onPatch({
									id: saleId,
									pagamento: { transacaoId: payment.id, metodo: method.value as TPaymentMethodEnum },
								})
							}
						>
							<div className="flex w-full items-center justify-between gap-2">
								<div className="flex items-center gap-2">
									{method.icon}
									{method.label}
								</div>
								{method.value === payment.metodo ? <Check className="h-4 w-4" /> : null}
							</div>
						</DropdownMenuItem>
					))}
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function buildObservationsText(card: TSalesFulfillmentCard): string | null {
	const parts: string[] = [];
	if (card.observacoes?.trim()) parts.push(card.observacoes.trim());
	if (card.pagamentoObservacoes?.trim()) {
		const paymentNote = card.pagamentoObservacoes.trim();
		if (!parts.some((part) => part === paymentNote)) parts.push(paymentNote);
	}
	return parts.length > 0 ? parts.join("\n\n") : null;
}

export function CardQuickActions({ card, organizationConfig, disabled, onPatch }: CardQuickActionsProps) {
	const editablePayments = card.pagamentos.filter((payment) => payment.editavel);
	const settledPayments = card.pagamentos.filter((payment) => !payment.editavel && payment.dataEfetivacao != null);
	const displayPayments = [...editablePayments, ...settledPayments];
	const hasPaymentControls = displayPayments.length > 0;
	const observationsText = buildObservationsText(card);

	return (
		<div className={cn("flex flex-col gap-1.5 border-t border-border/60 pt-2", disabled && "pointer-events-none opacity-60")}>
			{hasPaymentControls ? (
				displayPayments.map((payment, index) => (
					<QuickActionRow key={payment.id} label={paymentRowLabel(payment, index, displayPayments.length)} tooltip={paymentRowTooltip(payment)}>
						<QuickPaymentMethodControl
							payment={payment}
							saleId={card.id}
							organizationConfig={organizationConfig}
							disabled={disabled}
							tone={getPaymentControlTone(payment)}
							onPatch={onPatch}
						/>
					</QuickActionRow>
				))
			) : card.resumoPagamentos.totalPendentes === 0 ? null : (
				<Tooltip>
					<TooltipTrigger
						render={
							<QuickActionRow label="Pagamento">
								<span className="text-[11px] text-muted-foreground">Não editável</span>
							</QuickActionRow>
						}
					/>
					<TooltipContent>Nenhum recebimento pendente pode ser alterado neste pedido.</TooltipContent>
				</Tooltip>
			)}

			<QuickActionRow label="Modalidade">
				<QuickDeliveryModeControl card={card} disabled={disabled} onPatch={onPatch} />
			</QuickActionRow>

			{card.entregaModalidade === "COMANDA" ? (
				<QuickActionRow label="Comanda">
					<QuickComandaControl card={card} disabled={disabled} onPatch={onPatch} />
				</QuickActionRow>
			) : null}

			<QuickActionRow label="Nota fiscal">
				<FiscalStatusChip status={card.fiscal} documentId={card.documentoFiscalId} />
			</QuickActionRow>

			{observationsText ? <QuickActionFullWidthBlock label="Observações">{observationsText}</QuickActionFullWidthBlock> : null}
		</div>
	);
}

export { QuickPaymentMethodControl };

export function fulfillmentCardShowsFinancialBadge(card: TSalesFulfillmentCard, hasPaymentSection: boolean) {
	if (!hasPaymentSection) return true;
	return card.financeiro === "NAO_GERADO";
}
