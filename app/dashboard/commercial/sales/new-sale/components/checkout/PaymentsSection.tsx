import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InteractiveInput } from "@/components/ui/interactive-input";
import { Input } from "@/components/ui/input";
import { formatDateAsLocale, formatDateOnInputChange } from "@/lib/formatting";
import { getPaymentInstallmentsOptions } from "@/lib/payments/defaults";
import { getTodayDateInputValue } from "@/lib/payments/schemas";
import type { TUseSaleState } from "@/state-hooks/use-sale-state";
import { SalePaymentMethodsOptions } from "@/utils/select-options";
import { CalendarClock, Check, CheckCheck, Clock, Plus, Wallet, X } from "lucide-react";

type PaymentsSectionProps = {
	saleState: TUseSaleState;
};

type PaymentCardProps = {
	saleState: TUseSaleState;
	payment: TUseSaleState["state"]["pagamentos"][number];
};

function PaymentCard({ saleState, payment }: PaymentCardProps) {
	const paymentMethodConfig = saleState.organizationPaymentMethodsConfig[payment.metodo];
	const selectedMethod = SalePaymentMethodsOptions.find((method) => method.value === payment.metodo);
	const selectedForecastDate = payment.dataPrevisao ? new Date(payment.dataPrevisao) : undefined;
	const supportedMethodOptions = SalePaymentMethodsOptions.filter((method) => saleState.organizationPaymentMethodsConfig[method.value]?.suportado);
	const installmentOptions = getPaymentInstallmentsOptions(paymentMethodConfig);
	const shouldShowInstallments = installmentOptions.length > 0;
	return (
		<div className="w-full flex flex-col gap-2 rounded-lg border px-2 py-2">
			<div className="flex items-center gap-1.5 justify-between">
				<div className="flex items-center gap-1.5">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant={payment.efetivacaoTipo === "IMEDIATA" ? "success-light" : "warning-light"} size="fit" className="px-2 py-1 rounded-lg">
								{payment.efetivacaoTipo === "IMEDIATA" ? <CheckCheck className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent>
							<DropdownMenuLabel>EFETIVAÇÃO</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								onClick={() =>
									saleState.updatePagamento(payment.id, {
										efetivacaoTipo: "IMEDIATA",
										dataPrevisao: getTodayDateInputValue(),
									})
								}
							>
								<CheckCheck className="w-3 h-3" />
								RECEBER AGORA
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={() =>
									saleState.updatePagamento(payment.id, {
										efetivacaoTipo: "PENDENTE",
										dataPrevisao: payment.dataPrevisao ?? getTodayDateInputValue(),
									})
								}
							>
								<Clock className="w-3 h-3" />
								RECEBER DEPOIS
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>

					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="sm" className="flex items-center gap-1.5 uppercase text-xs">
								{selectedMethod?.icon ?? <Wallet className="w-4 h-4" />}
								{selectedMethod?.label ?? payment.metodo}
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent>
							<DropdownMenuLabel>MÉTODO</DropdownMenuLabel>
							<DropdownMenuSeparator />
							{supportedMethodOptions.map((method) => (
								<DropdownMenuItem key={method.value} onClick={() => saleState.updatePagamento(payment.id, { metodo: method.value })}>
									<div className="flex items-center gap-2 w-full justify-between">
										<div className="flex items-center gap-2">
											{method.icon}
											{method.label}
										</div>
										{method.value === payment.metodo ? <Check className="w-4 h-4" /> : null}
									</div>
								</DropdownMenuItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>

				<div className="flex items-center gap-1.5">
					<Input
						type="number"
						className="w-24 max-w-full text-xs"
						value={payment.valor}
						onChange={(event) => saleState.updatePagamento(payment.id, { valor: Number(event.target.value) || 0 })}
					/>
					<Button type="button" variant="ghost-destructive" size="icon" className="h-8 w-8" onClick={() => saleState.removePagamento(payment.id)}>
						<X className="w-3 h-3" />
					</Button>
				</div>
			</div>

			{shouldShowInstallments || payment.efetivacaoTipo === "PENDENTE" ? (
				<div className="w-full flex justify-end items-center gap-3">
					{shouldShowInstallments ? (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button type="button" variant="ghost" size="sm" className="h-8 gap-1.5 text-[0.7rem]">
									{payment.totalParcelas ? `${payment.totalParcelas}x` : "PARCELAS"}
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuLabel>PARCELAMENTO</DropdownMenuLabel>
								<DropdownMenuSeparator />
								{installmentOptions.map((parcelas) => (
									<DropdownMenuItem key={parcelas} onClick={() => saleState.updatePagamento(payment.id, { totalParcelas: parcelas })}>
										<div className="flex items-center gap-2 w-full justify-between">
											<span>{parcelas}x</span>
											{payment.totalParcelas === parcelas ? <Check className="w-4 h-4" /> : null}
										</div>
									</DropdownMenuItem>
								))}
							</DropdownMenuContent>
						</DropdownMenu>
					) : null}
					{payment.efetivacaoTipo === "PENDENTE" ? (
						<InteractiveInput.Root>
							<InteractiveInput.Trigger>
								<Button type="button" variant="ghost" size="sm" className="h-8 gap-1.5 text-[0.7rem]">
									<CalendarClock className="w-3.5 h-3.5 text-amber-600" />
									{payment.dataPrevisao ? `PREVISÃO: ${formatDateAsLocale(payment.dataPrevisao)}` : "DEFINIR PREVISÃO"}
								</Button>
							</InteractiveInput.Trigger>
							<InteractiveInput.Content align="end">
								<InteractiveInput.DateContent
									value={selectedForecastDate}
									onChange={(nextDate) =>
										saleState.updatePagamento(payment.id, {
											dataPrevisao: formatDateOnInputChange(nextDate?.toISOString()) ?? null,
										})
									}
								/>
							</InteractiveInput.Content>
						</InteractiveInput.Root>
					) : null}
				</div>
			) : null}
		</div>
	);
}

export default function PaymentsSection({ saleState }: PaymentsSectionProps) {
	const supportedMethodOptions = SalePaymentMethodsOptions.filter((method) => saleState.organizationPaymentMethodsConfig[method.value]?.suportado);

	return (
		<div className="bg-card border-border flex w-full flex-col gap-3 rounded-xl border px-3 py-3 shadow-2xs">
			<div className="flex items-center gap-1.5 justify-between">
				<div className="flex items-center gap-1.5">
					<Wallet className="w-4 h-4 text-foreground" />
					<h3 className="font-bold text-xs tracking-wide">PAGAMENTO</h3>
				</div>
				<Button
					type="button"
					size="fit"
					className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs"
					variant="ghost-brand"
					onClick={() => saleState.addPagamento({ metodo: supportedMethodOptions[0]?.value ?? "DINHEIRO" })}
				>
					<Plus className="w-4 h-4" /> ADICIONAR
				</Button>
			</div>

			{saleState.state.pagamentos.length === 0 ? (
				<div className="rounded-lg border border-dashed p-4 text-xs text-muted-foreground flex items-center gap-2">
					<CalendarClock className="w-4 h-4" />
					Nenhum pagamento adicionado. Você pode registrar recebimento imediato ou previsto.
				</div>
			) : null}

			{saleState.state.pagamentos.map((payment) => (
				<PaymentCard key={payment.id} saleState={saleState} payment={payment} />
			))}
		</div>
	);
}
