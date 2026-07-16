"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TIfoodMerchantSummaryDTO } from "@/lib/integrations/ifood/merchant-types";

type MerchantSelectorProps = {
	merchants: TIfoodMerchantSummaryDTO[];
	selectedMerchantId: string | null;
	onSelect: (merchantId: string) => void;
};

/** Seletor de loja do iFood. Some quando a organização só tem uma loja conectada. */
export function MerchantSelector({ merchants, selectedMerchantId, onSelect }: MerchantSelectorProps) {
	if (merchants.length <= 1) return null;

	return (
		<Select value={selectedMerchantId ?? undefined} onValueChange={onSelect}>
			<SelectTrigger className="w-full sm:w-[280px]">
				<SelectValue placeholder="Selecione a loja" />
			</SelectTrigger>
			<SelectContent>
				{merchants.map((merchant) => (
					<SelectItem key={merchant.id} value={merchant.id}>
						{merchant.nome ?? merchant.razaoSocial ?? merchant.id}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
