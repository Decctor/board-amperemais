"use client";

import { normalizeForSearch } from "@/lib/formatting";
import type { TShopCatalogProduct } from "@/lib/shop/catalog";
import { useCallback, useMemo, useState } from "react";

// Shared search + group filtering for the catalog and menu views, so the two
// implementations can't drift apart.
export function useShopProductFilter(products: TShopCatalogProduct[]) {
	const [searchValue, setSearchValue] = useState("");
	const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

	const filteredProducts = useMemo(() => {
		let filtered = products;

		if (searchValue.trim()) {
			const search = normalizeForSearch(searchValue);
			filtered = filtered.filter(
				(product) =>
					normalizeForSearch(product.nome).includes(search) ||
					(product.codigo && normalizeForSearch(product.codigo).includes(search)) ||
					(product.grupo && normalizeForSearch(product.grupo).includes(search)),
			);
		}

		if (selectedGroup) {
			filtered = filtered.filter((product) => product.grupo === selectedGroup);
		}

		return filtered;
	}, [products, searchValue, selectedGroup]);

	const isFiltering = searchValue.trim().length > 0 || selectedGroup !== null;

	const clearFilters = useCallback(() => {
		setSearchValue("");
		setSelectedGroup(null);
	}, []);

	return { searchValue, setSearchValue, selectedGroup, setSelectedGroup, filteredProducts, isFiltering, clearFilters };
}
