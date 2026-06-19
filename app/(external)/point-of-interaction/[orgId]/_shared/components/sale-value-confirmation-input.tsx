"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatDecimalPlaces } from "@/lib/formatting";
import { useAutoScrollOnFocus } from "@/lib/hooks/use-auto-scroll-on-focus";
import { ShieldCheck } from "lucide-react";

type SaleValueConfirmationInputProps = {
	value: number | null;
	onChange: (value: number | null) => void;
	compact?: boolean;
};

const SECURITY_HINT_ID = "poi-operator-confirmed-sale-value-hint";

export function SaleValueConfirmationInput({ value, onChange, compact = false }: SaleValueConfirmationInputProps) {
	const handleScrollOnFocus = useAutoScrollOnFocus(300);
	const displayValue = value == null ? "" : `R$ ${formatDecimalPlaces(value, 2, 2)}`;

	return (
		<div className={compact ? "w-full" : "max-w-md mx-auto"}>
			<div className={cn("rounded-2xl border-2 border-brand/25 bg-brand/5", compact ? "space-y-2 p-3" : "space-y-4 short:space-y-2.5 p-5 short:p-3")}>
				<div className="flex items-center justify-center gap-2">
					<ShieldCheck className={cn("text-brand shrink-0", compact ? "h-3.5 w-3.5" : "h-4 w-4 short:h-3.5 short:w-3.5")} aria-hidden />
					<span className={cn("font-black uppercase tracking-widest text-brand", compact ? "text-[0.65rem]" : "text-[0.7rem] short:text-[0.65rem]")}>
						Verificação de segurança
					</span>
				</div>

				<div className={compact ? "space-y-2" : "space-y-3 short:space-y-1.5"}>
					<Label
						htmlFor="poi-operator-confirmed-sale-value"
						className="block text-center font-black text-xs short:text-[0.7rem] text-muted-foreground uppercase tracking-widest italic"
					>
						Confirme o Valor Final da Venda
					</Label>

					<p
						id={SECURITY_HINT_ID}
						className={cn("text-center text-muted-foreground leading-snug", compact ? "text-[0.7rem]" : "text-xs short:text-[0.65rem]")}
					>
						Por segurança, digite novamente o valor final apresentado para aprovação.
					</p>

					<Input
						id="poi-operator-confirmed-sale-value"
						type="text"
						inputMode="numeric"
						autoComplete="off"
						aria-describedby={SECURITY_HINT_ID}
						value={displayValue}
						onChange={(event) => {
							const digits = event.target.value.replace(/\D/g, "").slice(0, 12);
							onChange(digits ? Number(digits) / 100 : null);
						}}
						placeholder="R$ 0,00"
						className={
							compact
								? "h-11 text-lg text-center rounded-lg border border-brand/20 focus:border-green-500 transition-all font-bold"
								: "h-16 short:h-11 text-2xl short:text-xl text-center rounded-2xl short:rounded-lg border-4 short:border border-brand/20 focus:border-green-500 transition-all font-bold"
						}
						onFocus={handleScrollOnFocus}
					/>
				</div>
			</div>
		</div>
	);
}
