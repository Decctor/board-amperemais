import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import { getErrorMessage } from "@/lib/errors";
import type { TGetPOSProductsOutput } from "@/app/api/pos/products/route";
import { memo } from "react";
import ProductCard from "../ProductCard";
import ProductListRow from "../ProductListRow";
import type { ProductViewMode } from "./ViewModeToggle";

type Product = TGetPOSProductsOutput["data"]["products"][number];

type ProductsGridBlockProps = {
	productsData: TGetPOSProductsOutput["data"] | undefined;
	isLoading: boolean;
	isError: boolean;
	error: unknown;
	viewMode: ProductViewMode;
	onProductClick: (product: Product) => void;
};

function ProductsGridBlock({ productsData, isLoading, isError, error, viewMode, onProductClick }: ProductsGridBlockProps) {
	if (isLoading) return <LoadingComponent />;
	if (isError) return <ErrorComponent msg={getErrorMessage(error)} />;

	if (productsData && productsData.products.length > 0) {
		if (viewMode === "list") {
			return (
				<div className="flex flex-col gap-2 pb-4">
					{productsData.products.map((product) => (
						<ProductListRow key={product.id} product={product} onSelect={onProductClick} />
					))}
				</div>
			);
		}

		return (
			<div className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-4 pb-4">
				{productsData.products.map((product) => (
					<ProductCard key={product.id} product={product} onSelect={onProductClick} />
				))}
			</div>
		);
	}

	return (
		<div className="w-full h-full flex items-center justify-center rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
			Nenhum produto encontrado para os filtros atuais.
		</div>
	);
}

export default memo(ProductsGridBlock);
