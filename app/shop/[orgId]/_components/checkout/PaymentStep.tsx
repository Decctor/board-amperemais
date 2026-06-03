"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { TShopPaymentMethod } from "@/schemas/shop";
import { Banknote, CreditCard, QrCode } from "lucide-react";
import { useShop } from "../ShopProvider";

const PAYMENT_METHODS: Array<{ value: TShopPaymentMethod; label: string; description: string; icon: typeof Banknote }> = [
	{ value: "DINHEIRO", label: "Dinheiro", description: "Pague em espécie no recebimento.", icon: Banknote },
	{ value: "PIX", label: "PIX", description: "A loja fornecerá a chave no atendimento.", icon: QrCode },
	{ value: "CARTAO_DEBITO", label: "Cartão de débito", description: "Pagamento na maquininha.", icon: CreditCard },
	{ value: "CARTAO_CREDITO", label: "Cartão de crédito", description: "Pagamento na maquininha.", icon: CreditCard },
];

export default function PaymentStep({ onNext }: { onNext: () => void }) {
	const { catalog, orderState } = useShop();
	const { payment, delivery } = orderState.state;
	const acceptedMethods = new Set(catalog.shopSettings.configuracoes.pagamento.metodosAceitos);
	const methods = PAYMENT_METHODS.filter((method) => acceptedMethods.has(method.value));

	const handleNext = () => {
		if (!acceptedMethods.has(payment.metodo)) return;
		onNext();
	};

	return (
		<div className="flex flex-col gap-5">
			<div>
				<h2 className="text-lg font-black">Como você prefere pagar?</h2>
				<p className="text-sm text-muted-foreground">O pagamento será realizado na {delivery.modalidade === "RETIRADA" ? "retirada" : "entrega"}.</p>
			</div>

			<div className="grid gap-2">
				{methods.map((method) => {
					const Icon = method.icon;
					const selected = payment.metodo === method.value;
					return (
						<button
							key={method.value}
							type="button"
							onClick={() => orderState.updatePayment({ metodo: method.value, precisaTroco: method.value === "DINHEIRO" && payment.precisaTroco })}
							className={`flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-colors ${
								selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
							}`}
						>
							<span
								className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${selected ? "bg-primary text-primary-foreground" : "bg-muted"}`}
							>
								<Icon className="size-5" />
							</span>
							<span className="min-w-0">
								<span className="block text-sm font-bold">{method.label}</span>
								<span className="block text-xs text-muted-foreground">{method.description}</span>
							</span>
						</button>
					);
				})}
			</div>

			{payment.metodo === "DINHEIRO" ? (
				<div className="flex flex-col gap-3 rounded-2xl border bg-muted/30 p-4">
					<div className="flex items-center justify-between gap-3">
						<div>
							<Label className="font-bold">Precisa de troco?</Label>
							<p className="text-xs text-muted-foreground">Informe o valor da nota para a loja se preparar.</p>
						</div>
						<Switch
							checked={payment.precisaTroco}
							onCheckedChange={(precisaTroco) => orderState.updatePayment({ precisaTroco, trocoPara: precisaTroco ? payment.trocoPara : null })}
						/>
					</div>
					{payment.precisaTroco ? (
						<Input
							type="number"
							min={0}
							step="0.01"
							placeholder="Troco para quanto?"
							value={payment.trocoPara ?? ""}
							onChange={(event) => orderState.updatePayment({ trocoPara: event.target.value ? Number(event.target.value) : null })}
						/>
					) : null}
				</div>
			) : null}

			<div className="space-y-2">
				<Label htmlFor="shop-payment-notes" className="font-bold">
					Observações
				</Label>
				<Textarea
					id="shop-payment-notes"
					placeholder="Ex.: levar maquininha com aproximação, chamar na portaria..."
					value={payment.observacoes}
					onChange={(event) => orderState.updatePayment({ observacoes: event.target.value })}
				/>
			</div>

			<Button variant="brand" className="h-12 rounded-xl font-bold" onClick={handleNext} disabled={!acceptedMethods.has(payment.metodo)}>
				CONTINUAR
			</Button>
		</div>
	);
}
