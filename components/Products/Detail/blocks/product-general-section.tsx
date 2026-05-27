"use client";

import ProductGeneralBlock from "@/components/Modals/Products/Blocks/General";
import ProductFieldRow from "@/components/Products/Detail/shared/product-field-row";
import EntityDetailBlockSection from "@/components/Products/Detail/shared/entity-detail-block-section";
import type { TUseProductState } from "@/state-hooks/use-product-state";
import { Code, LayoutGrid, Tag } from "lucide-react";

type ProductGeneralSectionProps = {
	product: TUseProductState["state"]["product"];
	isEditing: boolean;
	isPending: boolean;
	onStartEdit: () => void;
	onCancel: () => void;
	onSave: () => void;
	updateProduct: TUseProductState["updateProduct"];
	updateProductImageHolder: TUseProductState["updateProductImageHolder"];
};

export default function ProductGeneralSection({
	product,
	isEditing,
	isPending,
	onStartEdit,
	onCancel,
	onSave,
	updateProduct,
	updateProductImageHolder,
}: ProductGeneralSectionProps) {
	return (
		<EntityDetailBlockSection
			title="INFORMAÇÕES GERAIS"
			icon={<LayoutGrid className="w-4 h-4 min-w-4 min-h-4" />}
			isEditing={isEditing}
			isPending={isPending}
			onStartEdit={onStartEdit}
			onCancel={onCancel}
			onSave={onSave}
			viewContent={
				<div className="flex w-full grow flex-col gap-4">
					<div className="w-full flex flex-col gap-2">
						<h2 className="text-xs leading-none tracking-tight">DADOS DO PRODUTO</h2>
						<div className="w-full flex flex-col gap-1.5">
							<ProductFieldRow icon={<Tag className="w-4 h-4" />} label="DESCRIÇÃO" value={product.descricao || "NÃO INFORMADO"} />
							<ProductFieldRow icon={<Code className="w-4 h-4" />} label="CÓDIGO" value={product.codigo || "NÃO INFORMADO"} />
							<ProductFieldRow icon={<Tag className="w-4 h-4" />} label="UNIDADE" value={product.unidade || "NÃO INFORMADO"} />
							<ProductFieldRow icon={<Tag className="w-4 h-4" />} label="GRUPO" value={product.grupo || "NÃO INFORMADO"} />
							<ProductFieldRow icon={<Tag className="w-4 h-4" />} label="NCM" value={product.ncm || "NÃO INFORMADO"} />
						</div>
					</div>
				</div>
			}
			editContent={
				<ProductGeneralBlock
					product={product}
					updateProduct={updateProduct}
					updateProductImageHolder={updateProductImageHolder}
					showPricing={false}
					embedded
				/>
			}
		/>
	);
}
