import DateInput from "@/components/Inputs/DateInput";
import TextInput from "@/components/Inputs/TextInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { formatToMoney } from "@/lib/formatting";
import { getPaymentPreset, getPaymentSummaryLabel, getTodayDateInputValue } from "@/lib/payments/schemas";
import { useClientCashbackBalance } from "@/lib/queries/cashback-programs";
import type { TUseCheckoutState } from "@/state-hooks/use-checkout-state";
import { SalePaymentMethodsOptions } from "@/utils/select-options";
import { Check, CreditCard, NotebookPen, Trash2, Truck } from "lucide-react";
import { useState } from "react";

type PaymentStepProps = {
	sale: {
		valorTotal: number;
		clienteId: string | null;
	};
	checkoutState: TUseCheckoutState;
};

export default function PaymentStep({ sale, checkoutState }: PaymentStepProps) {
	const [paymentAmount, setPaymentAmount] = useState("");
	const [cashbackInput, setCashbackInput] = useState("");

	const { data: cashbackBalance, isLoading: isCashbackLoading } = useClientCashbackBalance({
		clienteId: sale.clienteId,
	});

	const availableCashback = cashbackBalance?.saldoValorDisponivel ?? 0;
	const maxCashbackResgate = Math.max(0, Math.min(availableCashback, checkoutState.valorAntesCashback));

	const addPayment = (preset: "IMEDIATO" | "ENTREGA" | "PARCELADO" | "FIADO") => {
		const valor = Number(paymentAmount) || checkoutState.valorRestante;
		if (!valor || valor <= 0) return;

		if (preset === "IMEDIATO") {
			checkoutState.addPagamento({ metodo: "DINHEIRO", valor, efetivacaoTipo: "IMEDIATA", dataPrevisao: getTodayDateInputValue() });
		}
		if (preset === "ENTREGA") {
			checkoutState.addPagamento({
				metodo: "A_DEFINIR",
				valor,
				efetivacaoTipo: "PENDENTE",
				dataPrevisao: getTodayDateInputValue(),
				observacoes: "Receber com entregador",
			});
		}
		if (preset === "PARCELADO") {
			checkoutState.addPagamento({
				metodo: "CARTAO_CREDITO",
				valor,
				efetivacaoTipo: "PENDENTE",
				totalParcelas: 2,
				dataPrevisao: getTodayDateInputValue(),
			});
		}
		if (preset === "FIADO") {
			checkoutState.addPagamento({
				metodo: "FIADO_NOTA",
				valor,
				efetivacaoTipo: "PENDENTE",
				dataPrevisao: getTodayDateInputValue(),
				observacoes: "Cobrança em aberto",
			});
		}

		setPaymentAmount("");
	};

	const handleApplyCashback = () => {
		const value = Number(cashbackInput);
		if (!value || value <= 0) return;
		if (value > maxCashbackResgate) return;

		checkoutState.setCashbackResgate(value);
		checkoutState.setCashbackProgramaId(cashbackBalance?.programaId ?? null);
		setCashbackInput("");
	};

	const handleRemoveCashback = () => {
		checkoutState.setCashbackResgate(0);
		checkoutState.setCashbackProgramaId(null);
	};

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h2 className="text-lg font-black">Pagamento</h2>
				<p className="text-sm text-muted-foreground">Registre recebimentos imediatos e pendentes sem descaracterizar a venda.</p>
			</div>

			{sale.clienteId ? (
				<div className="flex flex-col gap-3 rounded-xl border p-4">
					<h3 className="font-bold text-sm uppercase tracking-wide text-muted-foreground">Desconto em Cashback</h3>
					{isCashbackLoading ? <p className="text-sm text-muted-foreground">Carregando saldo de cashback...</p> : null}
					{!isCashbackLoading ? (
						<>
							<p className="text-sm text-muted-foreground">Saldo disponível: {formatToMoney(availableCashback)}</p>
							<div className="flex items-end gap-2">
								<div className="flex-1">
									<TextInput label="Valor do Resgate" placeholder="0,00" value={cashbackInput} handleChange={setCashbackInput} />
								</div>
								<Button type="button" onClick={handleApplyCashback} disabled={!cashbackInput || Number(cashbackInput) <= 0 || maxCashbackResgate <= 0}>
									Aplicar desconto
								</Button>
							</div>
							<p className="text-xs text-muted-foreground">Máximo aplicável agora: {formatToMoney(maxCashbackResgate)}</p>
							{checkoutState.state.cashbackResgate > 0 ? (
								<div className="flex items-center justify-between rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2">
									<p className="text-sm font-medium">Desconto em cashback: {formatToMoney(checkoutState.state.cashbackResgate)}</p>
									<Button type="button" variant="ghost" size="sm" onClick={handleRemoveCashback}>
										Remover
									</Button>
								</div>
							) : null}
						</>
					) : null}
				</div>
			) : null}

			<div className="rounded-xl border p-4 flex flex-col gap-3">
				<div className="flex flex-col gap-2">
					<TextInput label="Valor do pagamento" placeholder="0,00" value={paymentAmount} handleChange={setPaymentAmount} />
					<div className="flex flex-wrap gap-2">
						<Button type="button" variant="outline" onClick={() => addPayment("IMEDIATO")} className="gap-2">
							<Check className="w-4 h-4" />
							Recebido agora
						</Button>
						<Button type="button" variant="outline" onClick={() => addPayment("ENTREGA")} className="gap-2">
							<Truck className="w-4 h-4" />
							Receber na entrega
						</Button>
						<Button type="button" variant="outline" onClick={() => addPayment("PARCELADO")} className="gap-2">
							<CreditCard className="w-4 h-4" />
							Cartão parcelado
						</Button>
						<Button type="button" variant="outline" onClick={() => addPayment("FIADO")} className="gap-2" disabled={!sale.clienteId}>
							<NotebookPen className="w-4 h-4" />
							Fiado / Nota
						</Button>
					</div>
				</div>
			</div>

			{checkoutState.state.pagamentos.length > 0 && (
				<div className="flex flex-col gap-3 rounded-xl border p-4">
					<h3 className="font-bold text-sm uppercase tracking-wide text-muted-foreground">Pagamentos Registrados</h3>

					{checkoutState.state.pagamentos.map((pagamento) => {
						const preset = getPaymentPreset(pagamento);
						const methods =
							pagamento.efetivacaoTipo === "IMEDIATA"
								? SalePaymentMethodsOptions.filter((option) => !["A_DEFINIR", "FIADO_NOTA"].includes(option.value))
								: SalePaymentMethodsOptions.filter((option) => option.value !== "FIADO_NOTA");

						return (
							<div key={pagamento.id} className="rounded-lg border p-3 flex flex-col gap-3">
								<div className="flex items-start justify-between gap-3">
									<div>
										<p className="font-medium text-sm">{getPaymentSummaryLabel(pagamento)}</p>
										<p className="text-xs text-muted-foreground">Valor: {formatToMoney(pagamento.valor)}</p>
									</div>
									<Button
										variant="ghost"
										size="icon"
										className="h-8 w-8 text-destructive hover:text-destructive"
										onClick={() => checkoutState.removePagamento(pagamento.id)}
									>
										<Trash2 className="w-3 h-3" />
									</Button>
								</div>

								<div className="flex flex-wrap gap-2">
									{methods.map((method) => (
										<Button
											key={method.value}
											type="button"
											size="sm"
											variant={pagamento.metodo === method.value ? "default" : "outline"}
											onClick={() => checkoutState.updatePagamento(pagamento.id, { metodo: method.value })}
										>
											{method.icon}
											{method.label}
										</Button>
									))}
								</div>

								<div className="grid gap-3 md:grid-cols-2">
									<Input
										type="number"
										value={pagamento.valor}
										onChange={(event) => checkoutState.updatePagamento(pagamento.id, { valor: Number(event.target.value) || 0 })}
									/>
									{pagamento.efetivacaoTipo === "PENDENTE" ? (
										<DateInput
											label="Data prevista"
											value={pagamento.dataPrevisao ?? undefined}
											handleChange={(value) => checkoutState.updatePagamento(pagamento.id, { dataPrevisao: value ?? null })}
										/>
									) : null}
								</div>

								{preset === "PARCELADO" ? (
									<div className="grid gap-3 md:grid-cols-2">
										<Input
											type="number"
											min={2}
											value={pagamento.totalParcelas ?? 2}
											onChange={(event) => checkoutState.updatePagamento(pagamento.id, { totalParcelas: Math.max(2, Number(event.target.value) || 2) })}
										/>
										<DateInput
											label="Data da 1a parcela"
											value={pagamento.dataPrevisao ?? undefined}
											handleChange={(value) => checkoutState.updatePagamento(pagamento.id, { dataPrevisao: value ?? null })}
										/>
									</div>
								) : null}

								{pagamento.efetivacaoTipo === "PENDENTE" ? (
									<TextInput
										label="Observações"
										placeholder="Ex.: cobrança em aberto"
										value={pagamento.observacoes ?? ""}
										handleChange={(value) => checkoutState.updatePagamento(pagamento.id, { observacoes: value || null })}
									/>
								) : null}

								<div className="flex flex-wrap gap-2">
									<Button
										type="button"
										size="sm"
										variant={pagamento.efetivacaoTipo === "IMEDIATA" ? "default" : "outline"}
										onClick={() => checkoutState.updatePagamento(pagamento.id, { efetivacaoTipo: "IMEDIATA" })}
									>
										Recebido agora
									</Button>
									<Button
										type="button"
										size="sm"
										variant={pagamento.efetivacaoTipo === "PENDENTE" ? "default" : "outline"}
										onClick={() =>
											checkoutState.updatePagamento(pagamento.id, {
												efetivacaoTipo: "PENDENTE",
												dataPrevisao: pagamento.dataPrevisao ?? getTodayDateInputValue(),
											})
										}
									>
										Recebimento pendente
									</Button>
								</div>
							</div>
						);
					})}
				</div>
			)}

			<div className="flex flex-col gap-2 p-4 rounded-xl bg-secondary/50 border">
				<div className="flex justify-between text-sm">
					<span className="text-muted-foreground">Subtotal após outros ajustes</span>
					<span className="font-bold">{formatToMoney(checkoutState.valorAntesCashback)}</span>
				</div>
				{checkoutState.state.cashbackResgate > 0 ? (
					<div className="flex justify-between text-sm">
						<span className="text-muted-foreground">Desconto em cashback</span>
						<span className="font-bold text-green-600">-{formatToMoney(checkoutState.state.cashbackResgate)}</span>
					</div>
				) : null}
				<div className="flex justify-between text-sm">
					<span className="text-muted-foreground">Total da venda</span>
					<span className="font-bold">{formatToMoney(checkoutState.valorFinal)}</span>
				</div>
				<div className="flex justify-between text-sm">
					<span className="text-muted-foreground">Total Pago / Previsto</span>
					<span className="font-bold">{formatToMoney(checkoutState.totalPagamentos)}</span>
				</div>
				<Separator />
				{checkoutState.valorRestante > 0 ? (
					<div className="flex justify-between">
						<span className="font-black text-red-600">Falta</span>
						<span className="text-xl font-black text-red-600">{formatToMoney(checkoutState.valorRestante)}</span>
					</div>
				) : checkoutState.troco > 0 ? (
					<div className="flex justify-between">
						<span className="font-black text-green-600">Troco</span>
						<span className="text-xl font-black text-green-600">{formatToMoney(checkoutState.troco)}</span>
					</div>
				) : (
					<div className="flex justify-between">
						<span className="font-black text-green-600">Cobertura Completa</span>
						<span className="text-green-600 font-bold">OK</span>
					</div>
				)}
			</div>
		</div>
	);
}
