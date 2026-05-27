"use client";
import type { TGetCampaignRankingInput } from "@/app/api/campaigns/stats/ranking/route";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDecimalPlaces, formatToMoney } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import { useCampaignRanking } from "@/lib/queries/campaigns";
import { BadgeDollarSign, Crown, MousePointerClick, TrendingUp } from "lucide-react";
import { useState } from "react";

type CampaignRankingBlockProps = {
	startDate: Date | null;
	endDate: Date | null;
};

export function CampaignRankingBlock({ startDate, endDate }: CampaignRankingBlockProps) {
	const [rankingBy, setRankingBy] = useState<TGetCampaignRankingInput["rankingBy"]>("revenue");

	const { data: rankingData, isLoading } = useCampaignRanking({
		rankingBy,
		startDate,
		endDate,
		comparingStartDate: null,
		comparingEndDate: null,
	});

	return (
		<div className="bg-card border-border flex w-full flex-col gap-4 rounded-xl border px-4 py-4 shadow-2xs">
			<div className="flex items-center justify-between flex-wrap gap-2 shrink-0">
				<h2 className="text-xs font-bold uppercase tracking-wide text-foreground">Ranking de campanhas</h2>
				<div className="flex items-center gap-1">
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant={rankingBy === "revenue" ? "default" : "ghost"}
									size="fit"
									className="rounded-lg p-2"
									onClick={() => setRankingBy("revenue")}
								>
									<BadgeDollarSign className="h-4 w-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent><p>Ordenar por receita</p></TooltipContent>
						</Tooltip>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant={rankingBy === "conversions" ? "default" : "ghost"}
									size="fit"
									className="rounded-lg p-2"
									onClick={() => setRankingBy("conversions")}
								>
									<MousePointerClick className="h-4 w-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent><p>Ordenar por conversões</p></TooltipContent>
						</Tooltip>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant={rankingBy === "conversion-rate" ? "default" : "ghost"}
									size="fit"
									className="rounded-lg p-2"
									onClick={() => setRankingBy("conversion-rate")}
								>
									<TrendingUp className="h-4 w-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent><p>Ordenar por taxa de conversão</p></TooltipContent>
						</Tooltip>
					</TooltipProvider>
				</div>
			</div>

			{isLoading ? (
				<div className="flex flex-col gap-2">
					{[...Array(5)].map((_, i) => (
						<div key={i} className="h-10 rounded-lg bg-muted/40 animate-pulse" />
					))}
				</div>
			) : rankingData && rankingData.length > 0 ? (
				<div className="w-full overflow-x-auto">
					<table className="w-full text-xs">
						<thead>
							<tr className="border-b border-border">
								<th className="pb-2 text-left font-bold uppercase tracking-wide text-muted-foreground w-8">#</th>
								<th className="pb-2 text-left font-bold uppercase tracking-wide text-muted-foreground">Campanha</th>
								<th className="pb-2 text-right font-bold uppercase tracking-wide text-muted-foreground">Msgs</th>
								<th className="pb-2 text-right font-bold uppercase tracking-wide text-muted-foreground">Tx. Entrega</th>
								<th className="pb-2 text-right font-bold uppercase tracking-wide text-muted-foreground">Tx. Leitura</th>
								<th className="pb-2 text-right font-bold uppercase tracking-wide text-muted-foreground">Conv.</th>
								<th className="pb-2 text-right font-bold uppercase tracking-wide text-muted-foreground">Tx. Conv.</th>
								<th className="pb-2 text-right font-bold uppercase tracking-wide text-muted-foreground">Receita</th>
							</tr>
						</thead>
						<tbody>
							{rankingData.map((campaign) => (
								<tr
									key={campaign.campanhaId}
									className={cn(
										"border-b border-border/50 transition-colors hover:bg-muted/30",
										campaign.rank === 1 && "bg-yellow-500/5",
										campaign.rank === 2 && "bg-muted/20",
										campaign.rank === 3 && "bg-orange-600/5",
									)}
								>
									<td className="py-2.5 pr-2">
										{campaign.rank <= 3 ? (
											<Crown
												className={cn(
													"w-4 h-4",
													campaign.rank === 1 && "text-yellow-500",
													campaign.rank === 2 && "text-muted-foreground",
													campaign.rank === 3 && "text-orange-600",
												)}
											/>
										) : (
											<span className="font-bold text-muted-foreground">{campaign.rank}</span>
										)}
									</td>
									<td className="py-2.5">
										<div className="flex items-center gap-2">
											<span className="font-semibold text-foreground truncate max-w-[160px]" title={campaign.titulo}>
												{campaign.titulo}
											</span>
											<span
												className={cn(
													"shrink-0 rounded-full px-2 py-0.5 text-[0.6rem] font-bold",
													campaign.ativo
														? "bg-[rgba(22,163,74,0.12)] text-[#16a34a]"
														: "bg-muted text-muted-foreground",
												)}
											>
												{campaign.ativo ? "ATIVA" : "INATIVA"}
											</span>
										</div>
									</td>
									<td className="py-2.5 text-right tabular-nums">{formatDecimalPlaces(campaign.interacoes)}</td>
									<td className="py-2.5 text-right tabular-nums">{formatDecimalPlaces(campaign.taxaEntrega)}%</td>
									<td className="py-2.5 text-right tabular-nums">{formatDecimalPlaces(campaign.taxaLeitura)}%</td>
									<td className="py-2.5 text-right tabular-nums">{formatDecimalPlaces(campaign.conversoes)}</td>
									<td className="py-2.5 text-right tabular-nums font-semibold">{formatDecimalPlaces(campaign.taxaConversao)}%</td>
									<td className="py-2.5 text-right tabular-nums font-bold text-[#24549C]">{formatToMoney(campaign.receita)}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			) : (
				<p className="text-sm text-muted-foreground py-6 text-center">Nenhuma campanha encontrada para o período.</p>
			)}
		</div>
	);
}
