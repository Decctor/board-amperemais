import type { TUserSession } from "@/schemas/users";
import React, { useState } from "react";
import LoadingComponent from "../Layouts/LoadingComponent";
import ErrorComponent from "../Layouts/ErrorComponent";
import { getErrorMessage } from "@/lib/errors";

import { fetchItemsExport, useSaleItemsBySearch } from "@/lib/queries/sales";
import { BsCart } from "react-icons/bs";
import { formatDateAsLocale, formatLongString } from "@/lib/formatting";
import TextInput from "../Inputs/TextInput";
import { Button } from "../ui/button";
import { Barcode, File, Group, ListFilter, Ruler, Tag } from "lucide-react";
import GeneralPaginationComponent from "../Utils/Pagination";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../ui/sheet";
import { getExcelFromJSON } from "@/lib/excel-utils";
import { toast } from "sonner";
import type { TGetProductsBySearchInput, TGetProductsBySearchOutput } from "@/pages/api/sales/items/search";

type ProductsViewProps = {
	session: TUserSession;
};
function ProductsView({ session }: ProductsViewProps) {
	const [filterMenuIsOpen, setFilterMenuIsOpen] = useState(false);
	const { data: productsResult, isLoading, isError, isSuccess, error, params, updateParams } = useSaleItemsBySearch();
	const products = productsResult?.products || [];
	const productsShowing = products.length;
	const productsMatched = productsResult?.productsMatched || 0;
	const totalPages = productsResult?.totalPages || 0;

	async function handleItemsExport() {
		try {
			const items = await fetchItemsExport();
			getExcelFromJSON(items, `EXPORTAÇÃO DE PRODUTOS ${formatDateAsLocale(new Date())}.xlsx`);
		} catch (error) {
			toast.error(getErrorMessage(error));
		}
	}
	return (
		<div className="flex h-full grow flex-col">
			<div className="flex w-full flex-col items-center justify-center lg:justify-between border-b border-gray-200 pb-2 lg:flex-row gap-2">
				<div className="flex flex-col items-center lg:items-start">
					<h1 className="text-lg font-bold">Controle de Produtos</h1>
					<p className="text-sm text-[#71717A]">Gerencie os produtos</p>
					<p className="text-sm text-[#71717A]">{isSuccess ? productsShowing : "0"} produtos atualmente cadastrados</p>
				</div>
				<div className="flex items-center gap-2">
					<Button onClick={() => setFilterMenuIsOpen(true)} className="flex items-center gap-2">
						<ListFilter size={15} />
						FILTRAR
					</Button>
					<Button onClick={handleItemsExport} className="flex items-center gap-2">
						<File size={15} />
						EXPORTAR
					</Button>
				</div>
			</div>
			<GeneralPaginationComponent
				totalPages={totalPages}
				activePage={params.page}
				selectPage={(page) => updateParams({ page })}
				queryLoading={isLoading}
				itemsMatchedText={productsMatched > 1 ? `${productsMatched} produtos encontrados` : `${productsMatched} produto encontrado `}
				itemsShowingText={productsShowing > 1 ? `${productsShowing} produtos sendo mostrados` : `${productsShowing} produto sendo mostrado`}
			/>
			<div className="flex w-full flex-col gap-2 py-2">
				{isLoading ? <LoadingComponent /> : null}
				{isError ? <ErrorComponent msg={getErrorMessage(error)} /> : null}
				{isSuccess && products ? (
					products.length > 0 ? (
						products.map((product, index: number) => <ProductCard key={`${product.descricao}-${index}`} product={product} />)
					) : (
						<p className="w-full tracking-tight text-center">Nenhum produto encontrado.</p>
					)
				) : null}
			</div>
			{filterMenuIsOpen ? <FilterMenu params={params} updateParams={updateParams} closeMenu={() => setFilterMenuIsOpen(false)} /> : null}
		</div>
	);
}

export default ProductsView;

type ProductCardProps = {
	product: TGetProductsBySearchOutput["products"][number];
};
function ProductCard({ product }: ProductCardProps) {
	return (
		<div className="border border-primary flex flex-col px-3 py-2 rounded w-full bg-[#fff] dark:bg-[#121212]">
			<div className="w-full flex items-center justify-start gap-2">
				<div className="flex items-center gap-1">
					<div className="w-6 h-6 rounded-full flex items-center justify-center border border-primary">
						<BsCart size={10} />
					</div>
					<h1 className="hidden lg:block text-[0.6rem] lg:text-sm tracking-tight font-bold">{product.descricao}</h1>
					<h1 className="block lg:hidden text-[0.6rem] lg:text-sm tracking-tight font-bold">{formatLongString(product.descricao, 25)}</h1>
				</div>
				<div className="flex items-center gap-1">
					<Ruler width={15} height={15} />
					<h1 className="py-0.5 text-center text-[0.6rem] font-medium italic text-primary/80">{product.unidade}</h1>
				</div>
				<div className="flex items-center gap-1">
					<Barcode width={15} height={15} />
					<h1 className="py-0.5 text-center text-[0.6rem] font-medium italic text-primary/80">{product.codigo}</h1>
				</div>
				<div className="flex items-center gap-1">
					<Group width={15} height={15} />
					<h1 className="py-0.5 text-center text-[0.6rem] font-medium italic text-primary/80">{product.grupo}</h1>
				</div>
				{/* <h1 className="text-xs lg:text-base font-black">{type == 'total' ? formatToMoney(d.total) : d.qtde}</h1> */}
			</div>
		</div>
	);
}

type FilterMenuProps = {
	params: TGetProductsBySearchInput;
	updateParams: (newParams: Partial<TGetProductsBySearchInput>) => void;
	closeMenu: () => void;
};
function FilterMenu({ params, updateParams, closeMenu }: FilterMenuProps) {
	const [queryParamsHolder, setQueryParamsHolder] = useState<TGetProductsBySearchInput>(params);
	return (
		<Sheet open onOpenChange={closeMenu}>
			<SheetContent>
				<div className="flex h-full w-full flex-col">
					<SheetHeader>
						<SheetTitle>FILTRAR FORMULÁRIOS DE SAÍDA</SheetTitle>
						<SheetDescription>Escolha aqui parâmetros para filtrar os formulários de saída de estoque.</SheetDescription>
					</SheetHeader>
					<div className="scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-gray-300 flex h-full flex-col gap-y-4 overflow-y-auto overscroll-y-auto p-2">
						<div className="flex w-full flex-col gap-2">
							<TextInput
								label="PESQUISA POR DESCRIÇÃO"
								value={queryParamsHolder.searchDescription}
								placeholder={"Preencha aqui a descrição do produto para filtro."}
								handleChange={(value) => setQueryParamsHolder((prev) => ({ ...prev, searchDescription: value }))}
								width={"100%"}
							/>
							<TextInput
								label="PESQUISA POR CÓDIGO"
								value={queryParamsHolder.searchCode}
								placeholder={"Preenha aqui o código do produto para filtro."}
								handleChange={(value) => setQueryParamsHolder((prev) => ({ ...prev, searchCode: value }))}
								width={"100%"}
							/>
						</div>
					</div>
					<Button
						onClick={() => {
							updateParams({ ...queryParamsHolder, page: 1 });
							closeMenu();
						}}
					>
						FILTRAR
					</Button>
				</div>
			</SheetContent>
		</Sheet>
	);
}
