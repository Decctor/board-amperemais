"use client";

import type { TGetProductsOutputById } from "@/app/api/products/route";
import { getErrorMessage } from "@/lib/errors";
import { updateProduct } from "@/lib/mutations/products";
import {
	buildAddOnsUpdateInput,
	buildVariationsUpdateInput,
	hydrateAddOnsState,
	hydrateVariationsState,
	mergeProductStateFromHydration,
	processVariantImages,
	validateAddOnsState,
	validateVariationsState,
} from "@/lib/products/product-registry-state";
import { type TProductState, type TUseProductState, useProductState } from "@/state-hooks/use-product-state";
import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type ProductSectionEditorCallbacks = {
	onMutate?: () => void;
	onSuccess?: () => void;
	onError?: (error: Error) => void;
	onSettled?: () => void;
};

function wrapWithDirty<T extends (...args: never[]) => void>(fn: T, markDirty: () => void): T {
	return ((...args: Parameters<T>) => {
		markDirty();
		fn(...args);
	}) as T;
}

function hydrateVariationsFullState(product: TGetProductsOutputById): TProductState {
	return mergeProductStateFromHydration(hydrateVariationsState(product));
}

function hydrateAddOnsFullState(product: TGetProductsOutputById): TProductState {
	return mergeProductStateFromHydration(hydrateAddOnsState(product));
}

function useSectionDirtyState(product: TGetProductsOutputById, hydrate: (product: TGetProductsOutputById) => TProductState) {
	const [isDirty, setIsDirty] = useState(false);
	const isDirtyRef = useRef(false);
	const productState = useProductState({ initialState: hydrate(product) });
	const { state, redefineState } = productState;

	const markDirty = useCallback(() => {
		isDirtyRef.current = true;
		setIsDirty(true);
	}, []);

	const discard = useCallback(() => {
		redefineState(hydrate(product));
		isDirtyRef.current = false;
		setIsDirty(false);
	}, [hydrate, product, redefineState]);

	useEffect(() => {
		if (!isDirtyRef.current) {
			redefineState(hydrate(product));
		}
	}, [hydrate, product, redefineState]);

	return { state, isDirty, isDirtyRef, markDirty, discard, setIsDirty, productState };
}

export function useProductVariationsSectionEditor({
	product,
	callbacks,
}: {
	product: TGetProductsOutputById;
	callbacks?: ProductSectionEditorCallbacks;
}) {
	const { state, isDirty, isDirtyRef, markDirty, discard, setIsDirty, productState } = useSectionDirtyState(product, hydrateVariationsFullState);

	const { mutate: applyMutation, isPending } = useMutation({
		mutationKey: ["apply-product-variations", product.id],
		mutationFn: async () => {
			const validationError = validateVariationsState(state);
			if (validationError) throw new Error(validationError);

			const processedVariants = await processVariantImages(state.productVariants);
			return updateProduct(
				buildVariationsUpdateInput(product, {
					productOptions: state.productOptions,
					productVariants: processedVariants,
				}),
			);
		},
		onMutate: () => callbacks?.onMutate?.(),
		onSuccess: (data) => {
			isDirtyRef.current = false;
			setIsDirty(false);
			callbacks?.onSuccess?.();
			toast.success(data.message);
		},
		onError: (error) => {
			callbacks?.onError?.(error as Error);
			toast.error(getErrorMessage(error));
		},
		onSettled: () => callbacks?.onSettled?.(),
	});

	const apply = useCallback(() => applyMutation(), [applyMutation]);

	const updaters = useMemo(
		() => ({
			addProductVariant: wrapWithDirty(productState.addProductVariant, markDirty),
			updateProductVariant: wrapWithDirty(productState.updateProductVariant, markDirty),
			updateProductVariantImageHolder: wrapWithDirty(productState.updateProductVariantImageHolder, markDirty),
			removeProductVariant: wrapWithDirty(productState.removeProductVariant, markDirty),
			addProductOption: wrapWithDirty(productState.addProductOption, markDirty),
			updateProductOption: wrapWithDirty(productState.updateProductOption, markDirty),
			removeProductOption: wrapWithDirty(productState.removeProductOption, markDirty),
			addProductOptionValue: wrapWithDirty(productState.addProductOptionValue, markDirty),
			updateProductOptionValue: wrapWithDirty(productState.updateProductOptionValue, markDirty),
			removeProductOptionValue: wrapWithDirty(productState.removeProductOptionValue, markDirty),
			generateVariantMatrix: wrapWithDirty(productState.generateVariantMatrix, markDirty),
		}),
		[markDirty, productState],
	);

	return {
		state,
		isDirty,
		isPending,
		apply,
		discard,
		...updaters,
	};
}

export function useProductAddOnsSectionEditor({
	product,
	callbacks,
}: {
	product: TGetProductsOutputById;
	callbacks?: ProductSectionEditorCallbacks;
}) {
	const { state, isDirty, isDirtyRef, markDirty, discard, setIsDirty, productState } = useSectionDirtyState(product, hydrateAddOnsFullState);

	const { mutate: applyMutation, isPending } = useMutation({
		mutationKey: ["apply-product-add-ons", product.id],
		mutationFn: async () => {
			const validationError = validateAddOnsState(state);
			if (validationError) throw new Error(validationError);

			return updateProduct(buildAddOnsUpdateInput(product, { productAddOns: state.productAddOns }));
		},
		onMutate: () => callbacks?.onMutate?.(),
		onSuccess: (data) => {
			isDirtyRef.current = false;
			setIsDirty(false);
			callbacks?.onSuccess?.();
			toast.success(data.message);
		},
		onError: (error) => {
			callbacks?.onError?.(error as Error);
			toast.error(getErrorMessage(error));
		},
		onSettled: () => callbacks?.onSettled?.(),
	});

	const apply = useCallback(() => applyMutation(), [applyMutation]);

	const updaters = useMemo(
		() => ({
			addProductAddOn: wrapWithDirty(productState.addProductAddOn, markDirty),
			updateProductAddOn: wrapWithDirty(productState.updateProductAddOn, markDirty),
			removeProductAddOn: wrapWithDirty(productState.removeProductAddOn, markDirty),
			addProductAddOnOption: wrapWithDirty(productState.addProductAddOnOption, markDirty),
			updateProductAddOnOption: wrapWithDirty(productState.updateProductAddOnOption, markDirty),
			removeProductAddOnOption: wrapWithDirty(productState.removeProductAddOnOption, markDirty),
		}),
		[markDirty, productState],
	);

	return {
		state,
		isDirty,
		isPending,
		apply,
		discard,
		...updaters,
	};
}

export type TUseProductVariationsSectionEditor = ReturnType<typeof useProductVariationsSectionEditor>;
export type TUseProductAddOnsSectionEditor = ReturnType<typeof useProductAddOnsSectionEditor>;

export type TUseProductVariationsSectionEditorUpdaters = Pick<
	TUseProductState,
	| "addProductVariant"
	| "updateProductVariant"
	| "updateProductVariantImageHolder"
	| "removeProductVariant"
	| "addProductOption"
	| "updateProductOption"
	| "removeProductOption"
	| "addProductOptionValue"
	| "updateProductOptionValue"
	| "removeProductOptionValue"
	| "generateVariantMatrix"
>;
