"use client";

import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import { Button } from "@/components/ui/button";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getErrorMessage } from "@/lib/errors";
import { usePOSGroups, usePOSProducts } from "@/lib/queries/pos";
import type { TGetPOSProductsOutput } from "@/pages/api/pos/products";
import { useSaleState } from "@/state-hooks/use-sale-state";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import CartPane from "./components/CartPane";
import GroupsPane from "./components/GroupsPane";
import ProductBuilderModal from "./components/ProductBuilderModal";
import ProductCard from "./components/ProductCard";

type NewSalePageProps = {
	user: TAuthUserSession["user"];
};
export default function NewSalePage({ user }: NewSalePageProps) {
	const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
	const [searchValue, setSearchValue] = useState("");
	const [builderProduct, setBuilderProduct] = useState<TGetPOSProductsOutput["data"]["products"][number] | null>(null);

	// Sale state management
	const saleState = useSaleState();

	// Fetch groups
	const { data: groupsData, isLoading: groupsLoading } = usePOSGroups();

	// Fetch products
	const {
		data: productsData,
		isLoading: productsLoading,
		isError: productsError,
		error: productsErrorData,
		filters,
		updateFilters,
	} = usePOSProducts({
		initialFilters: {
			page: 1,
			search: searchValue,
			group: selectedGroup,
		},
	});

	// Update filters when group or search changes
	const handleGroupSelect = (group: string | null) => {
		setSelectedGroup(group);
		updateFilters({ group, page: 1 });
	};

	const handleSearchChange = (value: string) => {
		setSearchValue(value);
		updateFilters({ search: value, page: 1 });
	};

	// Handle product card click
	const handleProductClick = (product: TGetPOSProductsOutput["data"]["products"][number]) => {
		const hasVariants = product.variantes && product.variantes.length > 0;
		const hasAddOns = product.addOnsReferencias && product.addOnsReferencias.length > 0;
		const isComplex = hasVariants || hasAddOns;

		if (isComplex) {
			// Open builder modal
			setBuilderProduct(product);
		} else {
			// Add directly to cart
			const cartItem = {
				tempId: crypto.randomUUID(),
				produtoId: product.id,
				produtoVarianteId: null,
				nome: product.descricao,
				codigo: product.codigo,
				imagemUrl: product.imagemCapaUrl,
				quantidade: 1,
				valorUnitarioBase: product.precoVenda ?? 0,
				valorModificadores: 0,
				valorUnitarioFinal: product.precoVenda ?? 0,
				valorTotalBruto: product.precoVenda ?? 0,
				valorDesconto: 0,
				valorTotalLiquido: product.precoVenda ?? 0,
				modificadores: [],
			};
			saleState.addItem(cartItem);
			toast.success(`${product.descricao} adicionado ao carrinho!`);
		}
	};

	// Handle checkout
	const handleCheckout = () => {
		if (!saleState.isReadyForCheckout) {
			toast.error("Complete o carrinho antes de finalizar a venda.");
			return;
		}

		console.log("=== FINALIZANDO VENDA ===");
		console.log("Estado da Venda:", saleState.state);
		console.log("Subtotal:", saleState.subtotal);
		console.log("Total Desconto:", saleState.totalDesconto);
		console.log("Total:", saleState.total);
		console.log("Quantidade de Itens:", saleState.itemCount);
		console.log("========================");

		toast.success("Venda finalizada! (Verifique o console para detalhes)");

		// Clear the cart after checkout
		saleState.clearCart();
		saleState.clearCliente();
	};

	return (
		<div className="w-full h-[calc(100vh-4rem)] flex flex-col lg:flex-row gap-4 p-4 overflow-hidden">
			{/* Left Pane: Groups and Filters */}
			<div className="hidden lg:block w-64 shrink-0">
				<div className="h-full max-h-[calc(100vh-6rem)] sticky top-4 overflow-hidden">
					{groupsLoading ? (
						<LoadingComponent />
					) : (
						<GroupsPane
							groups={groupsData?.groups ?? []}
							selectedGroup={selectedGroup}
							onGroupSelect={handleGroupSelect}
							searchValue={searchValue}
							onSearchChange={handleSearchChange}
							isLoading={productsLoading}
						/>
					)}
				</div>
			</div>

			{/* Center Pane: Product Grid */}
			<div className="flex-1 min-w-0 flex flex-col gap-4 overflow-y-auto pr-2">
				{/* Mobile Search */}
				<div className="lg:hidden shrink-0">
					<GroupsPane
						groups={groupsData?.groups ?? []}
						selectedGroup={selectedGroup}
						onGroupSelect={handleGroupSelect}
						searchValue={searchValue}
						onSearchChange={handleSearchChange}
						isLoading={productsLoading}
					/>
				</div>

				{/* Products Grid */}
				<div className="flex-1">
					{productsLoading ? (
						<LoadingComponent />
					) : productsError ? (
						<ErrorComponent msg={getErrorMessage(productsErrorData)} />
					) : productsData && productsData.products.length > 0 ? (
						<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-4">
							{productsData.products.map((product) => (
								<ProductCard key={product.id} product={product} onClick={() => handleProductClick(product)} />
							))}
						</div>
					) : (
						<div className="flex items-center justify-center h-full">
							<p className="text-muted-foreground">Nenhum produto encontrado.</p>
						</div>
					)}
				</div>

				{/* Pagination */}
				{productsData && productsData.totalPages > 1 && (
					<div className="flex items-center justify-between gap-4 shrink-0 pb-4">
						<Button
							variant="outline"
							size="sm"
							onClick={() => updateFilters({ page: Math.max(1, filters.page - 1) })}
							disabled={filters.page <= 1 || productsLoading}
						>
							<ChevronLeft className="w-4 h-4 mr-1" />
							Anterior
						</Button>
						<span className="text-sm text-muted-foreground">
							Página {productsData.currentPage} de {productsData.totalPages}
						</span>
						<Button
							variant="outline"
							size="sm"
							onClick={() => updateFilters({ page: Math.min(productsData.totalPages, filters.page + 1) })}
							disabled={filters.page >= productsData.totalPages || productsLoading}
						>
							Próxima
							<ChevronRight className="w-4 h-4 ml-1" />
						</Button>
					</div>
				)}
			</div>

			{/* Right Pane: Cart */}
			<div className="w-full lg:w-96 shrink-0">
				<div className="h-full max-h-[calc(100vh-6rem)] sticky top-4 overflow-hidden">
					<CartPane organizationId={user.organizacaoId as string} saleState={saleState} onCheckout={handleCheckout} />
				</div>
			</div>

			{/* Product Builder Modal */}
			{builderProduct && <ProductBuilderModal product={builderProduct} onAddToCart={saleState.addItem} onClose={() => setBuilderProduct(null)} />}
		</div>
	);
}
