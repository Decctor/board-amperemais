"use client";

import ProductAddOnsBlock from "@/components/Modals/Products/Blocks/AddOns";
import { LoadingButton } from "@/components/loading-button";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import type { TUseProductState } from "@/state-hooks/use-product-state";
import { Layers } from "lucide-react";

type ProductAddOnsSectionProps = {
	addOns: TUseProductState["state"]["productAddOns"];
	addProductAddOn: TUseProductState["addProductAddOn"];
	updateProductAddOn: TUseProductState["updateProductAddOn"];
	removeProductAddOn: TUseProductState["removeProductAddOn"];
	addProductAddOnOption: TUseProductState["addProductAddOnOption"];
	updateProductAddOnOption: TUseProductState["updateProductAddOnOption"];
	removeProductAddOnOption: TUseProductState["removeProductAddOnOption"];
	isPending: boolean;
	onSave: () => void;
};

export default function ProductAddOnsSection({
	addOns,
	addProductAddOn,
	updateProductAddOn,
	removeProductAddOn,
	addProductAddOnOption,
	updateProductAddOnOption,
	removeProductAddOnOption,
	isPending,
	onSave,
}: ProductAddOnsSectionProps) {
	const validCount = addOns.filter((a) => !a.deletar).length;

	return (
		<SectionWrapper
			title="ADICIONAIS"
			icon={<Layers className="w-4 h-4 min-w-4 min-h-4" />}
			actions={
				<LoadingButton variant="default" size="xs" onClick={onSave} loading={isPending}>
					SALVAR
				</LoadingButton>
			}
		>
			<p className="text-xs text-muted-foreground mb-2">{validCount} grupo(s) de adicionais. Alterações nos menus são salvas ao clicar em SALVAR.</p>
			<ProductAddOnsBlock
				addOns={addOns}
				addProductAddOn={addProductAddOn}
				updateProductAddOn={updateProductAddOn}
				removeProductAddOn={removeProductAddOn}
				addProductAddOnOption={addProductAddOnOption}
				updateProductAddOnOption={updateProductAddOnOption}
				removeProductAddOnOption={removeProductAddOnOption}
				embedded
			/>
		</SectionWrapper>
	);
}
