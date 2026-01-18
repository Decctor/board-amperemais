"use client";
import type { TGetCampaignRankingInput } from "@/app/api/campaigns/stats/ranking/route";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDecimalPlaces, formatToMoney } from "@/lib/formatting";
import { useCampaignRanking } from "@/lib/queries/campaigns";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, BadgeDollarSign, Crown, MessageCircle, Minus, MousePointerClick, TrendingUp } from "lucide-react";
import { useState } from "react";

type CampaignsRankingProps = {
	startDate: Date | null;
	endDate: Date | null;
	comparingStartDate?: Date | null;
	comparingEndDate?: Date | null;
};

export default function CampaignsRanking({ startDate, endDate, comparingStartDate, comparingEndDate }: CampaignsRankingProps) {
	const [rankingBy, setRankingBy] = useState<TGetCampaignRankingInput["rankingBy"]>("revenue");

	const { data: rankingData, isLoading: rankingLoading } = useCampaignRanking({
		rankingBy,
		startDate: startDate ?? null,
		endDate: endDate ?? null,
		comparingStartDate: comparingStartDate ?? null,
		comparingEndDate: comparingEndDate ?? null,
	});

	return (
		<div className="w-full flex flex-col gap-2 py-2 h-full">
			<div className="bg-card border-primary/20 flex w-full h-full flex-col gap-3 rounded-xl border px-3 py-4 shadow-2xs">
				<div className="flex items-center justify-between gap-2 flex-wrap shrink-0">
					<h1 className="text-xs font-medium tracking-tight uppercase">RANKING DE CAMPANHAS - TOP 10</h1>
					<div className="flex items-center gap-2">
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant={rankingBy === "revenue" ? "default" : "ghost"}
										size="fit"
										className="rounded-lg p-2"
										onClick={() => setRankingBy("revenue")}
									>
										<BadgeDollarSign className="h-4 min-h-4 w-4 min-w-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									<p>Ordenar por Receita</p>
								</TooltipContent>
							</Tooltip>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant={rankingBy === "conversions" ? "default" : "ghost"}
										size="fit"
										className="rounded-lg p-2"
										onClick={() => setRankingBy("conversions")}
									>
										<MousePointerClick className="h-4 min-h-4 w-4 min-w-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									<p>Ordenar por Conversões</p>
								</TooltipContent>
							</Tooltip>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant={rankingBy === "conversion-rate" ? "default" : "ghost"}
										size="fit"
										className="rounded-lg p-2"
										onClick={() => setRankingBy("conversion-rate")}
									>
										<TrendingUp className="h-4 min-h-4 w-4 min-w-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									<p>Ordenar por Taxa de Conversão</p>
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
						rankingData.map((campaign) => (
							<div
								key={campaign.campanhaId}
								className={cn(
									"bg-card border-primary/20 flex w-full flex-col gap-2 rounded-xl border px-3 py-3 shadow-2xs",
									campaign.rank === 1 && "border-yellow-500/50 bg-yellow-500/5",
									campaign.rank === 2 && "border-gray-400/50 bg-gray-400/5",
									campaign.rank === 3 && "border-orange-600/50 bg-orange-600/5",
								)}
							>
								<div className="w-full flex items-start justify-between gap-2 flex-wrap">
									<div className="flex items-center gap-2 flex-wrap">
										{campaign.rank <= 3 ? (
											<Crown
												className={cn(
													"w-5 h-5 min-w-5 min-h-5",
													campaign.rank === 1 && "text-yellow-500",
													campaign.rank === 2 && "text-gray-400",
													campaign.rank === 3 && "text-orange-600",
												)}
											/>
										) : (
											<div className="w-6 h-6 min-w-6 min-h-6 rounded-full bg-primary/10 flex items-center justify-center">
												<span className="text-xs font-bold">{campaign.rank}</span>
											</div>
										)}
										<div className="flex items-start flex-col gap-1">
											<div className="flex items-center gap-2">
												<h1 className="text-xs font-bold tracking-tight lg:text-sm">{campaign.titulo}</h1>
												{campaign.rankDelta !== null && campaign.rankDelta !== 0 && (
													<div
														className={cn(
															"flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[0.65rem] font-bold",
															campaign.rankDelta > 0 && "bg-green-500/10 text-green-600 dark:text-green-400",
															campaign.rankDelta < 0 && "bg-red-500/10 text-red-600 dark:text-red-400",
														)}
													>
														{campaign.rankDelta > 0 ? (
															<>
																<ArrowUp className="w-3 h-3 min-w-3 min-h-3" />
																<span>+{campaign.rankDelta}</span>
															</>
														) : (
															<>
																<ArrowDown className="w-3 h-3 min-w-3 min-h-3" />
																<span>{campaign.rankDelta}</span>
															</>
														)}
													</div>
												)}
												{campaign.rankDelta === 0 && (
													<div className="flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[0.65rem] font-bold bg-gray-500/10 text-gray-600 dark:text-gray-400">
														<Minus className="w-3 h-3 min-w-3 min-h-3" />
													</div>
												)}
											</div>
											<div className="flex items-center gap-2 flex-wrap">
												<div className="flex items-center gap-1">
													<MessageCircle className="w-3 h-3 min-w-3 min-h-3 text-muted-foreground" />
													<span className="text-[0.65rem] text-muted-foreground">{formatDecimalPlaces(campaign.interacoes)} interações</span>
												</div>
												<div className="flex items-center gap-1">
													<TrendingUp className="w-3 h-3 min-w-3 min-h-3 text-muted-foreground" />
													<span className="text-[0.65rem] text-muted-foreground">{formatDecimalPlaces(campaign.taxaConversao)}% taxa</span>
												</div>
											</div>
										</div>
									</div>
									<div className="flex items-center gap-3 flex-wrap">
										{rankingBy === "revenue" ? (
											<div className="flex flex-col items-end gap-1">
												<div className={cn("flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[0.65rem] font-bold bg-primary/10 text-primary")}>
													<BadgeDollarSign className="w-3 min-w-3 h-3 min-h-3" />
													<p className="text-xs font-bold tracking-tight uppercase">{formatToMoney(campaign.receita)}</p>
												</div>
												{campaign.receitaComparison !== null && (
													<p className="text-[0.60rem] text-muted-foreground">Anterior: {formatToMoney(campaign.receitaComparison)}</p>
												)}
											</div>
										) : null}
										{rankingBy === "conversions" ? (
											<div className="flex flex-col items-end gap-1">
												<div className={cn("flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[0.65rem] font-bold bg-primary/10 text-primary")}>
													<MousePointerClick className="w-3 min-w-3 h-3 min-h-3" />
													<p className="text-xs font-bold tracking-tight uppercase">{formatDecimalPlaces(campaign.conversoes)}</p>
												</div>
												{campaign.conversoesComparison !== null && (
													<p className="text-[0.60rem] text-muted-foreground">Anterior: {formatDecimalPlaces(campaign.conversoesComparison)}</p>
												)}
											</div>
										) : null}
										{rankingBy === "conversion-rate" ? (
											<div className="flex flex-col items-end gap-1">
												<div className={cn("flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[0.65rem] font-bold bg-primary/10 text-primary")}>
													<TrendingUp className="w-3 min-w-3 h-3 min-h-3" />
													<p className="text-xs font-bold tracking-tight uppercase">{formatDecimalPlaces(campaign.taxaConversao)}%</p>
												</div>
												{campaign.taxaConversaoComparison !== null && (
													<p className="text-[0.60rem] text-muted-foreground">Anterior: {formatDecimalPlaces(campaign.taxaConversaoComparison)}%</p>
												)}
											</div>
										) : null}
									</div>
								</div>
							</div>
						))
					) : (
						<div className="flex w-full items-center justify-center py-8">
							<p className="text-sm text-muted-foreground">Nenhuma campanha encontrada para o período selecionado.</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
