"use client";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDecimalPlaces, formatToMoney } from "@/lib/formatting";
import { useProductsRanking } from "@/lib/queries/products";
import { cn } from "@/lib/utils";
import type { TGetProductsRankingInput } from "@/pages/api/products/stats/ranking";
import { BadgeDollarSign, CirclePlus, Code, Crown, Diamond, ShoppingCart, TrendingUp } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

type ProductsRankingProps = {
	periodAfter: Date | null;
	periodBefore: Date | null;
};

export default function ProductsRanking({ periodAfter, periodBefore }: ProductsRankingProps) {
	const [rankingBy, setRankingBy] = useState<TGetProductsRankingInput["rankingBy"]>("sales-total-value");

	const { data: rankingData, isLoading: rankingLoading } = useProductsRanking({
		rankingBy,
		periodAfter: periodAfter ?? null,
		periodBefore: periodBefore ?? null,
		saleNatures: null,
		excludedSalesIds: null,
		totalMin: null,
		totalMax: null,
	});

	return (
		<div className="w-full flex flex-col gap-2 py-2 h-full">
			<div className="bg-card border-primary/20 flex w-full h-full flex-col gap-3 rounded-xl border px-3 py-4 shadow-2xs">
				<div className="flex items-center justify-between gap-2 flex-wrap shrink-0">
					<h1 className="text-xs font-medium tracking-tight uppercase">RANKING DE PRODUTOS - TOP 10</h1>
					<div className="flex items-center gap-2">
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant={rankingBy === "sales-total-value" ? "default" : "ghost"}
										size="fit"
										className="rounded-lg p-2"
										onClick={() => setRankingBy("sales-total-value")}
									>
										<BadgeDollarSign className="h-4 min-h-4 w-4 min-w-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									<p>Ordenar por Faturamento</p>
								</TooltipContent>
							</Tooltip>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant={rankingBy === "sales-total-qty" ? "default" : "ghost"}
										size="fit"
										className="rounded-lg p-2"
										onClick={() => setRankingBy("sales-total-qty")}
									>
										<CirclePlus className="h-4 min-h-4 w-4 min-w-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									<p>Ordenar por Quantidade</p>
								</TooltipContent>
							</Tooltip>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant={rankingBy === "sales-total-margin" ? "default" : "ghost"}
										size="fit"
										className="rounded-lg p-2"
										onClick={() => setRankingBy("sales-total-margin")}
									>
										<TrendingUp className="h-4 min-h-4 w-4 min-w-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									<p>Ordenar por Margem</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					</div>
				</div>
				<div className="flex w-full flex-1 flex-col gap-2 overflow-auto scrollbar-thin scrollbar-track-primary/10 scrollbar-thumb-primary/30 min-h-0">
					{rankingLoading ? (
						<div className="flex w-full items-center justify-center py-8">
							<p className="text-sm text-muted-foreground">Carregando ranking...</p>
						</div>
					) : rankingData && rankingData.length > 0 ? (
						rankingData.map((product) => (
							<div
								key={product.produtoId}
								className={cn(
									"bg-card border-primary/20 flex w-full flex-col sm:flex-row gap-2 rounded-xl border px-3 py-3 shadow-2xs",
									product.rank === 1 && "border-yellow-500/50 bg-yellow-500/5",
									product.rank === 2 && "border-gray-400/50 bg-gray-400/5",
									product.rank === 3 && "border-orange-600/50 bg-orange-600/5",
								)}
							>
								<div className="flex items-center justify-center">
									<div className="relative h-12 max-h-12 min-h-12 w-12 max-w-12 min-w-12 overflow-hidden rounded-lg">
										{product.imagemCapaUrl ? (
											<Image src={product.imagemCapaUrl} alt="Imagem de capa do produto" fill={true} objectFit="cover" />
										) : (
											<div className="bg-primary/50 text-primary-foreground flex h-full w-full items-center justify-center">
												<ShoppingCart className="h-5 w-5" />
											</div>
										)}
									</div>
								</div>
								<div className="flex flex-col grow gap-1">
									<div className="w-full flex items-center justify-between gap-2 flex-wrap">
										<div className="flex items-center gap-2 flex-wrap">
											<div className="flex items-center gap-1.5">
												{product.rank <= 3 ? (
													<Crown
														className={cn(
															"w-5 h-5 min-w-5 min-h-5",
															product.rank === 1 && "text-yellow-500",
															product.rank === 2 && "text-gray-400",
															product.rank === 3 && "text-orange-600",
														)}
													/>
												) : (
													<div className="w-6 h-6 min-w-6 min-h-6 rounded-full bg-primary/10 flex items-center justify-center">
														<span className="text-xs font-bold">{product.rank}</span>
													</div>
												)}
												<h1 className="text-xs font-bold tracking-tight lg:text-sm">{product.descricao}</h1>
											</div>
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
									<div className="w-full flex items-center justify-center sm:justify-end gap-2 flex-wrap">
										<div className={cn("flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[0.65rem] font-bold bg-primary/10 text-primary")}>
											<CirclePlus className="w-3 min-w-3 h-3 min-h-3" />
											<p className="text-xs font-bold tracking-tight uppercase">{formatDecimalPlaces(product.totalQuantity)}</p>
										</div>
										<div className={cn("flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[0.65rem] font-bold bg-primary/10 text-primary")}>
											<BadgeDollarSign className="w-3 min-w-3 h-3 min-h-3" />
											<p className="text-xs font-bold tracking-tight uppercase">{formatToMoney(product.totalRevenue)}</p>
										</div>
										<div className={cn("flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[0.65rem] font-bold bg-primary/10 text-primary")}>
											<TrendingUp className="w-3 min-w-3 h-3 min-h-3" />
											<p className="text-xs font-bold tracking-tight uppercase">{formatDecimalPlaces(product.marginPercentage)}%</p>
										</div>
									</div>
								</div>
							</div>
						))
					) : (
						<div className="flex w-full items-center justify-center py-8">
							<p className="text-sm text-muted-foreground">Nenhum produto encontrado para o período selecionado.</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
