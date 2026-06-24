"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDecimalPlaces, formatToMoney } from "@/lib/formatting";
import { useAutoScrollOnFocus } from "@/lib/hooks/use-auto-scroll-on-focus";
import { Plus, X } from "lucide-react";

const VALUE_HELPERS = [10, 25, 50, 100];

type SaleValueStepProps = {
	value: number;
	onChange: (value: number) => void;
	onSubmit: () => void;
};

// Converte o valor em reais (ex.: 20.96) para o texto exibido com 2 casas (ex.: "20,96").
function formatValueForInput(value: number): string {
	return formatDecimalPlaces(value, 2, 2);
}

// Lógica de centavos: extrai apenas os dígitos do texto digitado e interpreta o número
// como centavos, deslocando da direita para a esquerda. Assim, ao digitar "2", "0", "9", "6"
// o valor evolui R$0,02 → R$0,20 → R$2,09 → R$20,96, eliminando a ambiguidade da vírgula.
function parseInputToValue(rawInput: string): number {
	const digits = rawInput.replace(/\D/g, "");
	if (!digits) return 0;
	// Limita a quantidade de dígitos para evitar overflow visual em valores absurdos.
	const cents = Number(digits.slice(0, 12));
	return cents / 100;
}

export function SaleValueStep({ value, onChange, onSubmit }: SaleValueStepProps) {
	const handleScrollOnFocus = useAutoScrollOnFocus(300);

	return (
		<form
			className="space-y-8 short:space-y-2 animate-in fade-in slide-in-from-bottom-4"
			onSubmit={(e) => {
				e.preventDefault();
				onSubmit();
			}}
		>
			<div className="text-center space-y-2 short:space-y-0.5">
				<h2 className="text-xl short:text-lg font-black uppercase tracking-tight">Qual o valor da compra?</h2>
				<p className="text-muted-foreground short:text-xs">Digite os centavos da direita para a esquerda.</p>
			</div>
			<div className="relative max-w-md mx-auto">
				<span className="absolute left-6 short:left-3 top-1/2 -translate-y-1/2 text-2xl short:text-lg font-black text-muted-foreground">R$</span>
				<Input
					type="text"
					inputMode="numeric"
					enterKeyHint="go"
					autoComplete="off"
					value={formatValueForInput(value)}
					onChange={(e) => onChange(parseInputToValue(e.target.value))}
					className="h-24 short:h-14 text-5xl short:text-3xl font-black text-center rounded-3xl short:rounded-xl border-4 short:border border-brand/20 focus:border-brand px-12 short:px-9"
					onFocus={handleScrollOnFocus}
				/>
			</div>
			<div className="grid grid-cols-2 md:grid-cols-4 gap-3 short:gap-1.5 max-w-xl mx-auto">
				{VALUE_HELPERS.map((h) => (
					<Button
						key={h}
						type="button"
						variant="secondary"
						onClick={() => onChange(value + h)}
						className="h-14 short:h-9 rounded-xl short:rounded-lg font-black text-lg short:text-base"
					>
						<Plus className="w-4 h-4 short:w-3 short:h-3 mr-1 text-brand" /> {formatToMoney(h)}
					</Button>
				))}
				<Button
					type="button"
					variant="ghost"
					onClick={() => onChange(0)}
					className="h-14 short:h-9 rounded-xl short:rounded-lg font-bold text-muted-foreground col-span-2 md:col-span-4 italic short:text-sm"
				>
					<X className="w-4 h-4 short:w-3 short:h-3 mr-1" /> LIMPAR VALOR
				</Button>
			</div>
		</form>
	);
}
