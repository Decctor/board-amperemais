import ErrorComponent from "@/components/Layouts/ErrorComponent";
import GeneralPaginationComponent from "@/components/Utils/Pagination";
import ResponsiveMenuViewOnly from "@/components/Utils/ResponsiveMenuViewOnly";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getErrorMessage } from "@/lib/errors";
import { useProductsBySearch } from "@/lib/queries/products";
import { cn } from "@/lib/utils";
import type { TGetProductsBySearchOutput } from "@/pages/api/products/search";
import { Code, Diamond, LinkIcon } from "lucide-react";

type ProductVinculationProps = {
	handleSelection: (product: TGetProductsBySearchOutput["data"]["products"][number], variant?: { id: string; nome: string }) => void;
	closeModal: () => void;
};
export default function ProductVinculation({ handleSelection, closeModal }: ProductVinculationProps) {
	const {
		data: productsResult,
		isLoading,
		isError,
		isSuccess,
		error,
		queryKey,
		params,
		updateParams,
	} = useProductsBySearch({
		initialParams: { search: "", page: 1 },
	});

	const products = productsResult?.products;
	const productsShowing = products ? products.length : 0;
	const productsMatched = productsResult?.productsMatched || 0;
	const totalPages = productsResult?.totalPages;
	return (
		<ResponsiveMenuViewOnly
			menuTitle="VINCULAÇÃO DE PRODUTO"
			menuDescription="Selecione o produto para vincular"
			menuCancelButtonText="CANCELAR"
			stateIsLoading={isLoading}
			stateError={error ? getErrorMessage(error) : undefined}
			closeMenu={closeModal}
		>
			<Input
				value={params.search ?? ""}
				placeholder="Pesquisar produto..."
				onChange={(e) => updateParams({ search: e.target.value })}
				className="grow rounded-xl"
			/>
			<div className="h-1 bg-primary/20 w-full" />
			{isLoading ? <p className="w-full flex items-center justify-center animate-pulse"> Carregando produtos...</p> : null}
			{isError ? <ErrorComponent msg={getErrorMessage(error)} /> : null}
			{isSuccess ? (
				<div className="w-full flex flex-col gap-1.5">
					<GeneralPaginationComponent
						activePage={params.page}
						queryLoading={isLoading}
						selectPage={(page) => updateParams({ page })}
						totalPages={totalPages || 0}
						itemsMatchedText={productsMatched > 0 ? `${productsMatched} produtos encontrados.` : `${productsMatched} produto encontrado.`}
						itemsShowingText={productsShowing > 0 ? `Mostrando ${productsShowing} produtos.` : `Mostrando ${productsShowing} produto.`}
					/>
					{products ? (
						products.length > 0 ? (
							products.map((product) => (
								<ProductVinculationProductCard key={product.id} product={product} handleClick={(variantId) => handleSelection(product, variantId)} />
							))
						) : (
							<p className="w-full text-center text-sm italic text-primary">Sem opções disponíveis.</p>
						)
					) : null}
				</div>
			) : null}
		</ResponsiveMenuViewOnly>
	);
}

function ProductVinculationProductCard({
	product,
	handleClick,
}: { product: TGetProductsBySearchOutput["data"]["products"][number]; handleClick: (variant?: { id: string; nome: string }) => void }) {
	const variants = product.variantes || [];
	return (
		<div className={cn("bg-card border-primary/20 flex w-full flex-col gap-1 rounded-xl border px-3 py-4 shadow-2xs")}>
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
			</div>
			{variants.length > 0 ? (
				<div className="flex flex-col gap-1 pl-4 mt-2 border-l-2 border-primary/10">
					{variants.map((variant) => (
						<div key={variant.id} className="flex items-center justify-between gap-2 py-1">
							<div className="flex flex-col">
								<h2 className="text-xs font-medium text-muted-foreground">{variant.nome}</h2>
								<p className="text-[0.65rem] text-muted-foreground/70">{variant.codigo}</p>
							</div>
							<Button
								variant="ghost"
								className="flex items-center gap-1 h-6 px-2 text-[0.65rem]"
								size="sm"
								onClick={() => handleClick({ id: variant.id, nome: variant.nome })}
							>
								<LinkIcon className="w-2.5 min-w-2.5 h-2.5 min-h-2.5" />
								VINCULAR VARIANTE
							</Button>
						</div>
					))}
				</div>
			) : null}
			<div className="w-full flex items-center justify-end mt-2">
				<div className="flex items-center gap-3">
					<Button variant="ghost" className="flex items-center gap-1.5" size="sm" onClick={() => handleClick()}>
						<LinkIcon className="w-3 min-w-3 h-3 min-h-3" />
						VINCULAR PRODUTO
					</Button>
				</div>
			</div>
		</div>
	);
}
