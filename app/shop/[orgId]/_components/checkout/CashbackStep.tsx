"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { formatToMoney } from "@/lib/formatting";
import { useShopClientLookup } from "@/lib/queries/shop";
import { ArrowRight, BadgePercent, Info } from "lucide-react";
import { useMemo } from "react";
import { useShop } from "../ShopProvider";

type CashbackStepProps = {
	onNext: () => void;
};

export default function CashbackStep({ onNext }: CashbackStepProps) {
	const { orgId, catalog, orderState } = useShop();
	const { customer, cashback, cart } = orderState.state;

	const { data: lookupData } = useShopClientLookup({
		orgId,
		telefone: customer.telefone,
	});

	const program = catalog.cashbackProgram;
	const balance = lookupData?.client?.saldos?.[0]?.saldoValorDisponivel ?? 0;

	const subtotal = useMemo(() => {
		let total = 0;
		for (const item of cart.items) {
			const product = catalog.products.find((p) => p.id === item.produtoId);
			if (!product) continue;

			let unitPrice = product.precoVenda ?? 0;
			if (item.produtoVarianteId) {
				const variant = product.variantes.find((v) => v.id === item.produtoVarianteId);
				if (variant) unitPrice = variant.precoVenda ?? 0;
			}

			let modifiersPrice = 0;
			for (const modifier of item.modificadores) {
				const allReferences = [...product.addOnsReferencias];
				const variant = product.variantes.find((v) => v.id === item.produtoVarianteId);
				if (variant) allReferences.push(...variant.addOnsReferencias);

				for (const ref of allReferences) {
					const option = ref.grupo.opcoes.find((o) => o.id === modifier.opcaoId);
					if (option) {
						modifiersPrice += option.precoDelta * modifier.quantidade;
					}
				}
			}

			total += (unitPrice + modifiersPrice) * item.quantidade;
		}
		return total;
	}, [cart.items, catalog.products]);

	const maxRedemption = useMemo(() => {
		if (!program) return 0;

		let limit = balance;

		if (program.resgateLimiteTipo === "FIXO" && program.resgateLimiteValor) {
			limit = Math.min(limit, program.resgateLimiteValor);
		} else if (program.resgateLimiteTipo === "PERCENTUAL" && program.resgateLimiteValor) {
			limit = Math.min(limit, (subtotal * program.resgateLimiteValor) / 100);
		}

		return Math.min(limit, subtotal);
	}, [program, balance, subtotal]);

	const handleSliderChange = (value: number[]) => {
		orderState.updateCashback({ resgateSolicitado: Math.min(value[0], maxRedemption) });
	};

	const handleInputChange = (value: string) => {
		const numValue = Number.parseFloat(value.replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
		orderState.updateCashback({ resgateSolicitado: Math.min(Math.max(0, numValue), maxRedemption) });
	};

	const terminology = program?.terminologia || "DINHEIRO";

	if (!program || balance <= 0) {
		return (
			<div className="flex flex-col gap-6">
				<div className="flex flex-col items-center gap-4 py-8 text-center">
					<div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
						<BadgePercent className="w-8 h-8 text-muted-foreground" />
					</div>
					<div>
						<p className="font-semibold">SEM CASHBACK DISPONIVEL</p>
						<p className="text-sm text-muted-foreground mt-1">Você ainda não possui saldo de cashback para utilizar.</p>
					</div>
				</div>

				<Button variant="brand" className="flex items-center gap-1.5 w-full h-12 rounded-xl font-bold" onClick={onNext}>
					CONTINUAR SEM CASHBACK
					<ArrowRight className="h-4 w-4" />
				</Button>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			<div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
				<BadgePercent className="w-6 h-6 text-primary flex-shrink-0" />
				<div className="flex-1">
					<p className="text-sm text-muted-foreground">Saldo disponivel</p>
					<p className="font-black text-lg text-primary">{formatToMoney(balance)}</p>
				</div>
			</div>

			<div className="flex flex-col gap-4">
				<Label className="font-semibold">Quanto deseja usar?</Label>

				<div className="flex flex-col gap-4 p-4 rounded-xl bg-muted/50 border">
					<Slider value={[cashback.resgateSolicitado]} min={0} max={maxRedemption} step={0.01} onValueChange={handleSliderChange} className="w-full" />

					<div className="flex items-center justify-between gap-4">
						<span className="text-sm text-muted-foreground">R$ 0,00</span>
						<div className="flex-1 max-w-[150px]">
							<Input
								type="text"
								inputMode="decimal"
								value={formatToMoney(cashback.resgateSolicitado).replace("R$", "").trim()}
								onChange={(e) => handleInputChange(e.target.value)}
								className="h-10 text-center font-bold"
							/>
						</div>
						<span className="text-sm text-muted-foreground">{formatToMoney(maxRedemption)}</span>
					</div>
				</div>

				{cashback.resgateSolicitado > 0 && (
					<div className="flex items-center justify-between p-4 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
						<span className="font-semibold text-green-900 dark:text-green-100">Desconto solicitado</span>
						<span className="font-black text-green-600 dark:text-green-400">-{formatToMoney(cashback.resgateSolicitado)}</span>
					</div>
				)}
			</div>

			<div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
				<Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
				<p className="text-xs text-blue-800 dark:text-blue-200">
					A loja confirmara o desconto ao aceitar o pedido. O saldo sera descontado somente apos a confirmacao.
				</p>
			</div>

			<Button variant="brand" className="flex items-center gap-1.5 w-full h-12 rounded-xl font-bold mt-auto" onClick={onNext}>
				CONTINUAR
				<ArrowRight className="h-4 w-4" />
			</Button>
		</div>
	);
}
