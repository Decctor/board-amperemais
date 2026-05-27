"use client";

import ProductVariantsBlock from "@/components/Modals/Products/Blocks/Variants";
import { LoadingButton } from "@/components/loading-button";
import SectionWrapper from "@/components/ui/section-wrapper";
import type { TUseProductState } from "@/state-hooks/use-product-state";
import { GitBranch } from "lucide-react";

type ProductVariantsSectionProps = {
	variants: TUseProductState["state"]["productVariants"];
	addVariant: TUseProductState["addProductVariant"];
	updateVariant: TUseProductState["updateProductVariant"];
	updateVariantImageHolder: TUseProductState["updateProductVariantImageHolder"];
	removeVariant: TUseProductState["removeProductVariant"];
	isPending: boolean;
	onSave: () => void;
};

export default function ProductVariantsSection({
	variants,
	addVariant,
	updateVariant,
	updateVariantImageHolder,
	removeVariant,
	isPending,
	onSave,
}: ProductVariantsSectionProps) {
	const validCount = variants.filter((v) => !v.deletar).length;

	return (
		<SectionWrapper
			title="VARIANTES"
			icon={<GitBranch className="w-4 h-4 min-w-4 min-h-4" />}
			actions={
				<LoadingButton variant="default" size="xs" onClick={onSave} loading={isPending}>
					SALVAR
				</LoadingButton>
			}
		>
			<p className="text-xs text-muted-foreground mb-2">{validCount} variante(s) cadastrada(s). Alterações nos menus são salvas ao clicar em SALVAR.</p>
			<ProductVariantsBlock
				variants={variants}
				addVariant={addVariant}
				updateVariant={updateVariant}
				updateVariantImageHolder={updateVariantImageHolder}
				removeVariant={removeVariant}
				embedded
			/>
		</SectionWrapper>
	);
}
