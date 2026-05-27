"use client";

import ProductAddOnsSection from "@/components/Products/Detail/blocks/product-addons-section";
import ProductGeneralSection from "@/components/Products/Detail/blocks/product-general-section";
import ProductStockPricingSection from "@/components/Products/Detail/blocks/product-stock-pricing-section";
import ProductVariantsSection from "@/components/Products/Detail/blocks/product-variants-section";
import { useProductUpdate } from "@/components/Products/Detail/shared/use-product-update";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import { getErrorMessage } from "@/lib/errors";
import { useProductById } from "@/lib/queries/products";
import { type TProductState, useProductState } from "@/state-hooks/use-product-state";
import { useCallback, useEffect, useRef, useState } from "react";

type ProductCadastroTabProps = {
	productId: string;
};

type EditingBlockId = "general" | "stock" | null;

export default function ProductCadastroTab({ productId }: ProductCadastroTabProps) {
	const { data: product, queryKey, isLoading, isError, error } = useProductById({ id: productId });
	const {
		state,
		updateProduct,
		updateProductImageHolder,
		addProductVariant,
		updateProductVariant,
		updateProductVariantImageHolder,
		removeProductVariant,
		addProductAddOn,
		updateProductAddOn,
		removeProductAddOn,
		addProductAddOnOption,
		updateProductAddOnOption,
		removeProductAddOnOption,
		resetState,
	} = useProductState({});

	const [editingBlockId, setEditingBlockId] = useState<EditingBlockId>(null);
	const draftSnapshotRef = useRef<TProductState | null>(null);

	const { mutate, isPending } = useProductUpdate({
		productId,
		queryKey,
		callbacks: {
			onSuccess: () => {
				setEditingBlockId(null);
				draftSnapshotRef.current = null;
			},
		},
	});

	useEffect(() => {
		if (product) {
			resetState(product);
			setEditingBlockId(null);
			draftSnapshotRef.current = null;
		}
	}, [product, resetState]);

	const requestEditBlock = useCallback(
		(blockId: EditingBlockId) => {
			if (editingBlockId && editingBlockId !== blockId) {
				const confirmed = window.confirm("Há alterações em outro bloco. Deseja descartar e editar este bloco?");
				if (!confirmed) return;
				if (product) resetState(product);
			}
			draftSnapshotRef.current = structuredClone(state);
			setEditingBlockId(blockId);
		},
		[editingBlockId, product, resetState, state],
	);

	const cancelEdit = useCallback(() => {
		if (draftSnapshotRef.current) {
			resetState(draftSnapshotRef.current);
		} else if (product) {
			resetState(product);
		}
		setEditingBlockId(null);
		draftSnapshotRef.current = null;
	}, [product, resetState]);

	const saveState = useCallback(() => {
		mutate(state);
	}, [mutate, state]);

	if (isLoading) return <LoadingComponent />;
	if (isError) return <ErrorComponent msg={getErrorMessage(error)} />;
	if (!product) return null;

	return (
		<div className="flex w-full flex-col gap-6">
			<ProductGeneralSection
				product={state.product}
				isEditing={editingBlockId === "general"}
				isPending={isPending}
				onStartEdit={() => requestEditBlock("general")}
				onCancel={cancelEdit}
				onSave={saveState}
				updateProduct={updateProduct}
				updateProductImageHolder={updateProductImageHolder}
			/>
			<ProductStockPricingSection
				product={state.product}
				isEditing={editingBlockId === "stock"}
				isPending={isPending}
				onStartEdit={() => requestEditBlock("stock")}
				onCancel={cancelEdit}
				onSave={saveState}
				updateProduct={updateProduct}
			/>
			<ProductVariantsSection
				variants={state.productVariants}
				addVariant={addProductVariant}
				updateVariant={updateProductVariant}
				updateVariantImageHolder={updateProductVariantImageHolder}
				removeVariant={removeProductVariant}
				isPending={isPending}
				onSave={saveState}
			/>
			<ProductAddOnsSection
				addOns={state.productAddOns}
				addProductAddOn={addProductAddOn}
				updateProductAddOn={updateProductAddOn}
				removeProductAddOn={removeProductAddOn}
				addProductAddOnOption={addProductAddOnOption}
				updateProductAddOnOption={updateProductAddOnOption}
				removeProductAddOnOption={removeProductAddOnOption}
				isPending={isPending}
				onSave={saveState}
			/>
		</div>
	);
}
