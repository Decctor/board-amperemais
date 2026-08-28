"use client";

import { IfoodIcon } from "@/components/icons";
import type { TSalesChannelStatusKey } from "@/lib/sales-channels/status";
import { cn } from "@/lib/utils";
import { Store } from "lucide-react";

/**
 * Marca de um canal de venda, compartilhada entre o pill e o popover.
 *
 * O iFood é uma marca nominativa e ocupa largura; a loja digital usa o ícone genérico na cor
 * primária da organização, que é a identidade dela. Forçar os dois na mesma geometria tornaria o
 * logotipo do iFood ilegível, então o que se mantém constante é a altura, não a caixa.
 */

type ChannelMarkProps = {
	canal: TSalesChannelStatusKey;
	size?: "sm" | "md";
};

export function ChannelMark({ canal, size = "sm" }: ChannelMarkProps) {
	if (canal === "IFOOD") {
		return <IfoodIcon aria-hidden className={cn("w-auto shrink-0 text-[#ea1d2c]", size === "sm" ? "h-3" : "h-3.5")} />;
	}
	return <Store aria-hidden className={cn("shrink-0 text-brand-secondary", size === "sm" ? "size-3.5" : "size-4")} />;
}
