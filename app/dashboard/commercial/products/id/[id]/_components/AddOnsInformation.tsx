import { TGetProductsOutputById } from "@/app/api/products/route";
import ProductStateAddOnsBlock from "@/components/Modals/Products/Blocks/AddOns";
import SectionApplyBar from "@/components/Products/SectionApplyBar";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { useProductAddOnsSectionEditor } from "@/state-hooks/use-product-section-editor";
import { Layers } from "lucide-react";

type ProductAddOnsInformationProps = {
	product: TGetProductsOutputById;
	sectionWrapperClassName?: string;
	callbacks: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: (error: Error) => void;
		onSettled?: () => void;
	};
};

export default function ProductAddOnsInformation({ product, sectionWrapperClassName, callbacks }: ProductAddOnsInformationProps) {
	const editor = useProductAddOnsSectionEditor({ product, callbacks });

	return (
		<SectionWrapper icon={<Layers className="h-4 w-4 min-h-4 min-w-4" />} title="ADICIONAIS" wrapperClassName={sectionWrapperClassName}>
			<ProductStateAddOnsBlock
				embedded
				addOns={editor.state.productAddOns}
				addProductAddOn={editor.addProductAddOn}
				updateProductAddOn={editor.updateProductAddOn}
				removeProductAddOn={editor.removeProductAddOn}
				addProductAddOnOption={editor.addProductAddOnOption}
				updateProductAddOnOption={editor.updateProductAddOnOption}
				removeProductAddOnOption={editor.removeProductAddOnOption}
			/>
			<SectionApplyBar isDirty={editor.isDirty} isPending={editor.isPending} onApply={editor.apply} onDiscard={editor.discard} />
		</SectionWrapper>
	);
}
