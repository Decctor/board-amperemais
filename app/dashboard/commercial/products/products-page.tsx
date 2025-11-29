"use client";
import SelectInput from "@/components/Inputs/SelectInput";
import TextInput from "@/components/Inputs/TextInput";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import ControlProduct from "@/components/Modals/Products/ControlProduct";
import GeneralPaginationComponent from "@/components/Utils/Pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getErrorMessage } from "@/lib/errors";
import { formatDecimalPlaces, formatToMoney } from "@/lib/formatting";
import { useProducts } from "@/lib/queries/products";
import { cn } from "@/lib/utils";
import type { TGetProductsOutputDefault } from "@/pages/api/products";
import { useQueryClient } from "@tanstack/react-query";
import {
	BadgeDollarSign,
	CirclePlus,
	Code,
	Diamond,
	Info,
	ListFilter,
	Package,
	Pencil,
	PencilIcon,
	Search,
	ShoppingBag,
	ShoppingCart,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

type ProductsPageProps = {
	user: TAuthUserSession["user"];
};

export default function ProductsPage({ user }: ProductsPageProps) {
	const queryClient = useQueryClient();
	const [filterMenuIsOpen, setFilterMenuIsOpen] = useState<boolean>(false);
	const [editProductModalId, setEditProductModalId] = useState<string | null>(null);
	const {
		data: productsResult,
		queryKey,
		isLoading,
		isError,
		isSuccess,
		error,
		filters,
		updateFilters,
	} = useProducts({
		initialFilters: {
			search: "",
			grupo: null,
			orderByField: "descricao",
			orderByDirection: "asc",
		},
	});

	const products = productsResult?.products;
	const productsShowing = products ? products.length : 0;
	const productsMatched = productsResult?.productsMatched || 0;
	const totalPages = productsResult?.totalPages;

	const handleOnMutate = async () => await queryClient.cancelQueries({ queryKey: queryKey });
	const handleOnSettled = async () => await queryClient.invalidateQueries({ queryKey: queryKey });
	return (
		<div className="w-full h-full flex flex-col gap-3">
			<div className="w-full flex items-center gap-2 flex-col-reverse lg:flex-row">
				<Input
					value={filters.search ?? ""}
					placeholder="Pesquisar produto..."
					onChange={(e) => updateFilters({ search: e.target.value })}
					className="grow rounded-xl"
				/>
				<Button className="flex items-center gap-2" size="sm" onClick={() => setFilterMenuIsOpen(true)}>
					<ListFilter className="w-4 h-4 min-w-4 min-h-4" />
					FILTROS
				</Button>
			</div>
			<GeneralPaginationComponent
				activePage={filters.page}
				queryLoading={isLoading}
				selectPage={(page) => updateFilters({ page })}
				totalPages={totalPages || 0}
				itemsMatchedText={productsMatched > 0 ? `${productsMatched} produtos encontrados.` : `${productsMatched} produto encontrado.`}
				itemsShowingText={productsShowing > 0 ? `Mostrando ${productsShowing} produtos.` : `Mostrando ${productsShowing} produto.`}
			/>
			{isLoading ? <LoadingComponent /> : null}
			{isError ? <ErrorComponent msg={getErrorMessage(error)} /> : null}
			{isSuccess && products ? (
				products.length > 0 ? (
					products.map((product, index: number) => (
						<ProductCard key={product.id} product={product} handleEditClick={() => setEditProductModalId(product.id)} />
					))
				) : (
					<p className="w-full tracking-tight text-center">Nenhum produto encontrado.</p>
				)
			) : null}
			{editProductModalId ? (
				<ControlProduct
					productId={editProductModalId}
					user={user}
					closeModal={() => setEditProductModalId(null)}
					callbacks={{ onMutate: handleOnMutate, onSettled: handleOnSettled }}
				/>
			) : null}
		</div>
	);
}

function ProductCard({ product, handleEditClick }: { product: TGetProductsOutputDefault["products"][number]; handleEditClick: () => void }) {
	return (
		<div className={cn("bg-card border-primary/20 flex w-full flex-col sm:flex-row gap-2 rounded-xl border px-3 py-4 shadow-2xs")}>
			<div className="flex items-center justify-center">
				<div className="relative h-16 max-h-16 min-h-16 w-16 max-w-16 min-w-16 overflow-hidden rounded-lg">
					{product.imagemCapaUrl ? (
						<Image src={product.imagemCapaUrl} alt="Imagem de capa do produto" fill={true} objectFit="cover" />
					) : (
						<div className="bg-primary/50 text-primary-foreground flex h-full w-full items-center justify-center">
							<ShoppingCart className="h-6 w-6" />
						</div>
					)}
				</div>
			</div>
			<div className=" flex flex-col grow gap-1">
				<div className="w-full flex items-center justify-between gap-2">
					<div className="flex items-center gap-2 flex-wrap">
						<h1 className="text-xs font-bold tracking-tight lg:text-sm">{product.descricao}</h1>
						<div className="flex items-center gap-1">
							<Code className="w-4 h-4 min-w-4 min-h-4" />
							<h1 className="py-0.5 text-center text-[0.65rem] font-medium italic text-primary/80">{product.codigo}</h1>
						</div>
						{product.grupo ? (
							<div className="flex items-center gap-1">
								<Diamond className="w-4 h-4 min-w-4 min-h-4" />
								<h1 className="py-0.5 text-center text-[0.65rem] font-medium italic text-primary/80">{product.grupo}</h1>
							</div>
						) : null}
					</div>

					<div className="flex items-center gap-3 flex-col md:flex-row gap-y-1">
						<div className="flex items-center gap-3">
							<div className={cn("flex items-center gap-1.5 rounded-md px-1.5 py-1.5 text-[0.65rem] font-bold bg-primary/10 text-primary")}>
								<CirclePlus className="w-3 min-w-3 h-3 min-h-3" />
								<p className="text-xs font-bold tracking-tight uppercase">{product.estatisticas.vendasQtdeTotal}</p>
							</div>
							<div className={cn("flex items-center gap-1.5 rounded-md px-1.5 py-1.5 text-[0.65rem] font-bold bg-primary/10 text-primary")}>
								<BadgeDollarSign className="w-3 min-w-3 h-3 min-h-3" />
								<p className="text-xs font-bold tracking-tight uppercase">{formatToMoney(product.estatisticas.vendasValorTotal)}</p>
							</div>
						</div>
					</div>
				</div>
				<div className="w-full flex items-center justify-end gap-2 flex-wrap">
					<Button variant="ghost" className="flex items-center gap-1.5" size="sm" onClick={handleEditClick}>
						<PencilIcon className="w-3 min-w-3 h-3 min-h-3" />
						EDITAR
					</Button>
					<Button variant="link" className="flex items-center gap-1.5" size="sm" asChild>
						<Link href={`/dashboard/commercial/products/id/${product.id}`}>
							<Info className="w-3 min-w-3 h-3 min-h-3" />
							DETALHES
						</Link>
					</Button>
				</div>
			</div>
		</div>
	);
}
