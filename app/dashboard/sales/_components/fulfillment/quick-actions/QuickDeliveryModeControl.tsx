"use client";

import type { TSalesFulfillmentCard } from "@/app/api/sales/fulfillment/route";
import type { TPatchSalesFulfillmentInput } from "@/app/api/sales/fulfillment/route";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TDeliveryModeEnum } from "@/schemas/enums";
import { SaleFullfilmentModesOptions } from "@/utils/select-options";
import { Check } from "lucide-react";
import { DELIVERY_MODE_META } from "../config";

type QuickDeliveryModeControlProps = {
	card: TSalesFulfillmentCard;
	disabled?: boolean;
	onPatch: (input: TPatchSalesFulfillmentInput) => void;
};

function stopDragPropagation(event: React.PointerEvent) {
	event.stopPropagation();
}

export function QuickDeliveryModeControl({ card, disabled, onPatch }: QuickDeliveryModeControlProps) {
	const currentMode = card.entregaModalidade;
	const currentMeta = currentMode ? DELIVERY_MODE_META[currentMode] : null;
	const CurrentIcon = currentMeta?.icon;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild disabled={disabled}>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="h-7 gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-tight"
					onPointerDown={stopDragPropagation}
				>
					{CurrentIcon ? <CurrentIcon className="h-3 w-3 shrink-0" /> : null}
					{currentMeta?.label ?? "Definir"}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuLabel className="text-[11px]">MODALIDADE</DropdownMenuLabel>
				<DropdownMenuSeparator />
				{SaleFullfilmentModesOptions.map((mode) => {
					const isEntregaBlocked = mode.value === "ENTREGA" && !card.clienteId;
					return (
						<DropdownMenuItem
							key={mode.value}
							disabled={isEntregaBlocked}
							title={isEntregaBlocked ? "Entrega exige cliente vinculado." : undefined}
							onSelect={() =>
								onPatch({
									id: card.id,
									entrega: {
										modalidade: mode.value as TDeliveryModeEnum,
										comandaNumero: mode.value === "COMANDA" ? card.comandaNumero : null,
									},
								})
							}
						>
							<div className="flex w-full items-center justify-between gap-2">
								<div className="flex items-center gap-2">
									{mode.icon}
									{mode.label}
								</div>
								{mode.value === currentMode ? <Check className="h-4 w-4" /> : null}
							</div>
						</DropdownMenuItem>
					);
				})}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
