"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { POS_PRODUCT_ORDERING_LABELS, POSProductOrderingEnum, type TPOSProductOrderingEnum } from "@/schemas/enums";
import { ArrowDownWideNarrow } from "lucide-react";

type ProductOrderingSelectProps = {
	value: TPOSProductOrderingEnum;
	onChange: (ordering: TPOSProductOrderingEnum) => void;
	disabled?: boolean;
};

/**
 * Ordenação da grade do PDV. Substitui a faixa de "mais pedidos": o que a loja mais gira já vem na
 * frente da própria grade, e o operador troca o critério quando o atendimento pede outro.
 */
export default function ProductOrderingSelect({ value, onChange, disabled }: ProductOrderingSelectProps) {
	return (
		<Select value={value} onValueChange={(selected) => onChange(selected as TPOSProductOrderingEnum)} disabled={disabled}>
			<SelectTrigger
				aria-label="Ordenar produtos"
				title="Ordenar produtos"
				className="h-9 shrink-0 rounded-xl border-border bg-card px-3 text-xs font-semibold shadow-2xs"
			>
				<ArrowDownWideNarrow className="h-4 w-4 text-muted-foreground" />
				<SelectValue />
			</SelectTrigger>
			<SelectContent align="end">
				{POSProductOrderingEnum.options.map((option) => (
					<SelectItem key={option} value={option} className="text-xs font-semibold">
						{POS_PRODUCT_ORDERING_LABELS[option]}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
