"use client";

import { SelectGroup, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
		<Select
			items={[...merchants.map((merchant) => ({ value: merchant.id, label: merchant.nome ?? merchant.razaoSocial ?? merchant.id }))]}
			value={selectedMerchantId ?? null}
			onValueChange={(value) => {
				if (value !== null) onSelect(value);
			}}
		>
			<SelectTrigger className="w-full sm:w-[280px]">
				<SelectValue placeholder="Selecione a loja" />
			</SelectTrigger>
			<SelectContent>
				<SelectGroup>
					{merchants.map((merchant) => (
						<SelectItem key={merchant.id} value={merchant.id}>
							{merchant.nome ?? merchant.razaoSocial ?? merchant.id}
						</SelectItem>
					))}
				</SelectGroup>
			</SelectContent>
		</Select>
	);
}
