"use client";

import type { TSalesFulfillmentCard } from "@/app/api/sales/fulfillment/route";
import type { TPatchSalesFulfillmentInput } from "@/app/api/sales/fulfillment/route";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";

type QuickComandaControlProps = {
	card: TSalesFulfillmentCard;
	disabled?: boolean;
	onPatch: (input: TPatchSalesFulfillmentInput) => void;
};

function stopDragPropagation(event: React.PointerEvent) {
	event.stopPropagation();
}

export function QuickComandaControl({ card, disabled, onPatch }: QuickComandaControlProps) {
	const [value, setValue] = useState(card.comandaNumero ?? "");

	useEffect(() => {
		setValue(card.comandaNumero ?? "");
	}, [card.comandaNumero]);

	return (
		<Input
			value={value}
			disabled={disabled}
			placeholder="Número"
			className="h-7 w-28 text-right text-[11px] font-semibold uppercase tracking-tight"
			onPointerDown={stopDragPropagation}
			onChange={(event) => setValue(event.target.value)}
			onBlur={() => {
				const trimmed = value.trim();
				if (trimmed === (card.comandaNumero ?? "")) return;
				onPatch({
					id: card.id,
					entrega: {
						modalidade: "COMANDA",
						comandaNumero: trimmed || null,
					},
				});
			}}
			onKeyDown={(event) => {
				if (event.key !== "Enter") return;
				event.currentTarget.blur();
			}}
		/>
	);
}
