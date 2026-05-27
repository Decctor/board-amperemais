"use client";

import ProductStockBlock, { ProductStockBlockView } from "@/components/Modals/Products/Blocks/Stock";
import EntityDetailBlockSection from "@/components/Products/Detail/shared/entity-detail-block-section";
import { formatToMoney } from "@/lib/formatting";
import type { TUseProductState } from "@/state-hooks/use-product-state";
import { BadgeDollarSign, Package } from "lucide-react";

type ProductStockPricingSectionProps = {
	product: TUseProductState["state"]["product"];
	isEditing: boolean;
	isPending: boolean;
	onStartEdit: () => void;
	onCancel: () => void;
	onSave: () => void;
	updateProduct: TUseProductState["updateProduct"];
};

export default function ProductStockPricingSection({
	product,
	isEditing,
	isPending,
	onStartEdit,
	onCancel,
	onSave,
	updateProduct,
}: ProductStockPricingSectionProps) {
	return (
		<EntityDetailBlockSection
			title="PREÇO E ESTOQUE"
			icon={<BadgeDollarSign className="w-4 h-4 min-w-4 min-h-4" />}
			isEditing={isEditing}
			isPending={isPending}
			onStartEdit={onStartEdit}
			onCancel={onCancel}
			onSave={onSave}
			viewContent={
				<div className="flex w-full grow flex-col gap-4">
					<div className="w-full flex flex-col gap-1.5">
						<div className="w-full flex items-center gap-1.5">
							<BadgeDollarSign className="w-4 h-4" />
							<h3 className="text-sm font-semibold tracking-tighter text-foreground/80">PREÇO DE CUSTO</h3>
							<h3 className="text-sm font-semibold tracking-tight">
								{product.precoCusto != null ? formatToMoney(product.precoCusto) : "NÃO INFORMADO"}
							</h3>
						</div>
						<div className="w-full flex items-center gap-1.5">
							<BadgeDollarSign className="w-4 h-4" />
							<h3 className="text-sm font-semibold tracking-tighter text-foreground/80">PREÇO DE VENDA</h3>
							<h3 className="text-sm font-semibold tracking-tight">
								{product.precoVenda != null ? formatToMoney(product.precoVenda) : "NÃO INFORMADO"}
							</h3>
						</div>
					</div>
					<ProductStockBlockView product={product} />
				</div>
			}
			editContent={<ProductStockBlock product={product} updateProduct={updateProduct} showPricing embedded />}
		/>
	);
}
