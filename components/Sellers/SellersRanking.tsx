"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDecimalPlaces, formatNameAsInitials, formatToMoney } from "@/lib/formatting";
import { useSellersRanking } from "@/lib/queries/sellers";
import { cn } from "@/lib/utils";
import type { TGetSellersRankingInput } from "@/pages/api/sellers/stats/ranking";
import { BadgeDollarSign, CirclePlus, Crown, Target, Ticket, TrendingUp } from "lucide-react";
import { useState } from "react";

type SellersRankingProps = {
	periodAfter: Date | null;
	periodBefore: Date | null;
};

export default function SellersRanking({ periodAfter, periodBefore }: SellersRankingProps) {
	const [rankingBy, setRankingBy] = useState<TGetSellersRankingInput["rankingBy"]>("sales-total-value");

	const { data: rankingData, isLoading: rankingLoading } = useSellersRanking({
		rankingBy,
		periodAfter: periodAfter ?? null,
		periodBefore: periodBefore ?? null,
	});

	const RANKING_LABEL_MAP = {
		"sales-total-value": "RANKING POR TOTAL VENDIDO",
		"sales-total-qty": "RANKING POR QUANTIDADE DE VENDAS",
		"average-ticket": "RANKING POR TICKET MÉDIO",
		"goal-achievement": "RANKING POR META ATINGIDA",
	};
	return (
		<div className="w-full flex flex-col gap-2 py-2 h-full">
			<div className="bg-card border-primary/20 flex w-full h-full flex-col gap-3 rounded-xl border px-3 py-4 shadow-2xs">
				<div className="flex items-center justify-between gap-2 flex-wrap shrink-0">
					<h1 className="text-xs font-medium tracking-tight uppercase">{rankingBy ? RANKING_LABEL_MAP[rankingBy] : "TOP 10 VENDEDORES"}</h1>
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
										variant={rankingBy === "average-ticket" ? "default" : "ghost"}
										size="fit"
										className="rounded-lg p-2"
										onClick={() => setRankingBy("average-ticket")}
									>
										<Ticket className="h-4 min-h-4 w-4 min-w-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									<p>Ordenar por Ticket Médio</p>
								</TooltipContent>
							</Tooltip>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant={rankingBy === "goal-achievement" ? "default" : "ghost"}
										size="fit"
										className="rounded-lg p-2"
										onClick={() => setRankingBy("goal-achievement")}
									>
										<Target className="h-4 min-h-4 w-4 min-w-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									<p>Ordenar por Meta Atingida</p>
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
						rankingData.map((seller) => (
							<div
								key={seller.vendedorId}
								className={cn(
									"bg-card border-primary/20 flex w-full flex-col sm:flex-row gap-2 rounded-xl border px-3 py-3 shadow-2xs",
									seller.rank === 1 && "border-yellow-500/50 bg-yellow-500/5",
									seller.rank === 2 && "border-gray-400/50 bg-gray-400/5",
									seller.rank === 3 && "border-orange-600/50 bg-orange-600/5",
								)}
							>
								<div className="w-full flex items-center justify-between gap-2 flex-wrap">
									<div className="flex items-center gap-2 flex-wrap">
										{seller.rank <= 3 ? (
											<Crown
												className={cn(
													"w-5 h-5 min-w-5 min-h-5",
													seller.rank === 1 && "text-yellow-500",
													seller.rank === 2 && "text-gray-400",
													seller.rank === 3 && "text-orange-600",
												)}
											/>
										) : (
											<div className="w-6 h-6 min-w-6 min-h-6 rounded-full bg-primary/10 flex items-center justify-center">
												<span className="text-xs font-bold">{seller.rank}</span>
											</div>
										)}
										<Avatar className="w-8 h-8 min-w-8 min-h-8 hidden lg:block">
											<AvatarImage src={seller.vendedorAvatarUrl ?? undefined} alt={seller.vendedorNome} />
											<AvatarFallback>{formatNameAsInitials(seller.vendedorNome)}</AvatarFallback>
										</Avatar>
										<div className="flex items-start flex-col">
											<h1 className="text-xs font-bold tracking-tight lg:text-sm">{seller.vendedorNome}</h1>
										</div>
									</div>
									<div className="flex items-center gap-3">
										{rankingBy === "sales-total-value" ? (
											<div className={cn("flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[0.65rem] font-bold bg-primary/10 text-primary")}>
												<BadgeDollarSign className="w-3 min-w-3 h-3 min-h-3" />
												<p className="text-xs font-bold tracking-tight uppercase">{formatToMoney(seller.totalRevenue)}</p>
											</div>
										) : null}
										{rankingBy === "sales-total-qty" ? (
											<div className={cn("flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[0.65rem] font-bold bg-primary/10 text-primary")}>
												<CirclePlus className="w-3 min-w-3 h-3 min-h-3" />
												<p className="text-xs font-bold tracking-tight uppercase">{formatDecimalPlaces(seller.totalSalesQty)}</p>
											</div>
										) : null}
										{rankingBy === "average-ticket" ? (
											<div className={cn("flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[0.65rem] font-bold bg-primary/10 text-primary")}>
												<Ticket className="w-3 min-w-3 h-3 min-h-3" />
												<p className="text-xs font-bold tracking-tight uppercase">{formatToMoney(seller.averageTicket)}</p>
											</div>
										) : null}
										{rankingBy === "goal-achievement" ? (
											<div
												className={cn(
													"flex items-center gap-1 rounded-md px-2 py-1 text-[0.65rem] font-bold",
													seller.goalAchievementPercentage >= 100 && "bg-green-500/20 text-green-700 dark:text-green-400",
													seller.goalAchievementPercentage >= 75 &&
														seller.goalAchievementPercentage < 100 &&
														"bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
													seller.goalAchievementPercentage < 75 && "bg-red-500/20 text-red-700 dark:text-red-400",
												)}
											>
												<Target className="w-3 min-w-3 h-3 min-h-3" />
												<p className="text-xs font-bold tracking-tight uppercase">{formatDecimalPlaces(seller.goalAchievementPercentage)}%</p>
											</div>
										) : null}
									</div>
								</div>
							</div>
						))
					) : (
						<div className="flex w-full items-center justify-center py-8">
							<p className="text-sm text-muted-foreground">Nenhum vendedor encontrado para o período selecionado.</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
