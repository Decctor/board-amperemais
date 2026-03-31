import DateInput from "@/components/Inputs/DateInput";
import TextInput from "@/components/Inputs/TextInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPaymentPreset, getPaymentSummaryLabel, getTodayDateInputValue } from "@/lib/payments/schemas";
import type { TUseSaleState } from "@/state-hooks/use-sale-state";
import { SalePaymentMethodsOptions } from "@/utils/select-options";
import { CalendarClock, Check, CheckCheck, Clock, CreditCard, NotebookPen, Plus, Truck, Wallet, X } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
type PaymentsSectionProps = {
	saleState: TUseSaleState;
};

type PaymentCardProps = {
	saleState: TUseSaleState;
	payment: TUseSaleState["state"]["pagamentos"][number];
};

const IMMEDIATE_METHODS = SalePaymentMethodsOptions.filter((option) => !["A_DEFINIR", "FIADO_NOTA"].includes(option.value));
const PENDING_METHODS = SalePaymentMethodsOptions.filter((option) => option.value !== "FIADO_NOTA");

function PaymentPresetButton({
	active,
	icon,
	label,
	onClick,
	disabled = false,
}: {
	active: boolean;
	icon: React.ReactNode;
	label: string;
	onClick: () => void;
	disabled?: boolean;
}) {
	return (
		<Button
			type="button"
			variant={active ? "default" : "outline"}
			size="sm"
			className="h-8 gap-1.5 text-[0.7rem]"
			onClick={onClick}
			disabled={disabled}
		>
			{icon}
			{label}
		</Button>
	);
}

function PaymentCard({ saleState, payment }: PaymentCardProps) {
	const selectedMethod = SalePaymentMethodsOptions.find((method) => method.value === payment.metodo);
	const preset = getPaymentPreset(payment);
	const canUseFiado = !!saleState.state.cliente;
	const availableMethods = payment.efetivacaoTipo === "IMEDIATA" ? IMMEDIATE_METHODS : PENDING_METHODS;

	const applyPreset = (nextPreset: "IMEDIATO" | "ENTREGA" | "PARCELADO" | "FIADO") => {
		if (nextPreset === "IMEDIATO") {
			saleState.updatePagamento(payment.id, {
				metodo: payment.metodo === "A_DEFINIR" || payment.metodo === "FIADO_NOTA" ? "DINHEIRO" : payment.metodo,
				efetivacaoTipo: "IMEDIATA",
				dataPrevisao: getTodayDateInputValue(),
				totalParcelas: payment.metodo === "CARTAO_CREDITO" ? payment.totalParcelas : null,
				primeiraDataPrevisaoParcela: null,
				observacoes: null,
			});
			return;
		}

		if (nextPreset === "ENTREGA") {
			saleState.updatePagamento(payment.id, {
				metodo: "A_DEFINIR",
				efetivacaoTipo: "PENDENTE",
				dataPrevisao: payment.dataPrevisao ?? getTodayDateInputValue(),
				totalParcelas: null,
				primeiraDataPrevisaoParcela: null,
				observacoes: payment.observacoes ?? "Receber com entregador",
			});
			return;
		}

		if (nextPreset === "PARCELADO") {
			saleState.updatePagamento(payment.id, {
				metodo: "CARTAO_CREDITO",
				efetivacaoTipo: "PENDENTE",
				totalParcelas: Math.max(2, payment.totalParcelas ?? 2),
				primeiraDataPrevisaoParcela: payment.primeiraDataPrevisaoParcela ?? payment.dataPrevisao ?? getTodayDateInputValue(),
				dataPrevisao: payment.dataPrevisao ?? getTodayDateInputValue(),
			});
			return;
		}

		saleState.updatePagamento(payment.id, {
			metodo: "FIADO_NOTA",
			efetivacaoTipo: "PENDENTE",
			dataPrevisao: payment.dataPrevisao ?? getTodayDateInputValue(),
			totalParcelas: null,
			primeiraDataPrevisaoParcela: null,
			observacoes: payment.observacoes ?? "Cobrança em aberto",
		});
	};

	return (
		<div className="rounded-lg border px-2 py-2 flex items-center gap-1.5 justify-between">
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
						<DropdownMenuItem onClick={() => saleState.updatePagamento(payment.id, { efetivacaoTipo: "IMEDIATA" })}>
							<CheckCheck className="w-3 h-3" />
							RECEBER AGORA
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => saleState.updatePagamento(payment.id, { efetivacaoTipo: "PENDENTE" })}>
							<Clock className="w-3 h-3" />
							RECEBER DEPOIS
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="sm" className="flex items-center gap-1.5 uppercase text-xs">
							{selectedMethod ? selectedMethod.renderIcon("w-4 h-4") : <Wallet className="w-4 h-4" />}
							{selectedMethod ? selectedMethod.label : payment.metodo}
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent>
						<DropdownMenuLabel>MÉTODO</DropdownMenuLabel>
						<DropdownMenuSeparator />
						{SalePaymentMethodsOptions.map((method) => (
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
	);
}

export default function PaymentsSection({ saleState }: PaymentsSectionProps) {
	return (
		<div className="bg-card border-primary/20 flex w-full flex-col gap-3 rounded-xl border px-3 py-3 shadow-2xs">
			<div className="flex items-center gap-1.5 justify-between">
				<div className="flex items-center gap-1.5">
					<Wallet className="w-4 h-4 text-primary" />
					<h3 className="font-bold text-xs tracking-wide">PAGAMENTO</h3>
				</div>
				<Button
					type="button"
					size="fit"
					className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs"
					variant="ghost-brand"
					onClick={() => saleState.addPagamento()}
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
