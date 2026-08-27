"use client";
/*
 * CÓPIA ESTÁTICA — não é o componente de produção.
 * Origem: components/Stats/Blocks/CampaignRankingBlock.tsx (commit 19d8578).
 *
 * Mesmo JSX do original, sem `useCampaignRanking` e sem o `useState` de ordenação.
 * Os botões de métrica continuam aparecendo, mas são inertes: a métrica destacada
 * chega por prop. Ao mexer no original, refaça o diff contra este arquivo.
 */
import type { TGetCampaignRankingInput, TGetCampaignRankingOutput } from "@/app/api/campaigns/stats/ranking/route";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDecimalPlaces, formatToMoney } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import { BadgeDollarSign, Crown, MousePointerClick, TrendingUp } from "lucide-react";

type CampaignRankingBlockProps = {
	ranking: TGetCampaignRankingOutput["data"];
	/** Métrica destacada. Os botões seguem o original, mas aqui não trocam nada. */
	rankingBy: TGetCampaignRankingInput["rankingBy"];
};

type CampaignRankingItem = TGetCampaignRankingOutput["data"][number];

const RANK_CARD_STYLES: Record<1 | 2 | 3, string> = {
	1: "border-brand/45 bg-brand/[0.07]",
	2: "border-muted-foreground/30 bg-muted/20",
	3: "border-orange-600/35 bg-orange-600/[0.06]",
};

function CampaignRankBadge({ rank }: { rank: number }) {
	if (rank <= 3) {
		return (
			<Crown
				className={cn(
					"h-5 w-5 min-h-5 min-w-5 shrink-0",
					rank === 1 && "text-brand",
					rank === 2 && "text-muted-foreground",
					rank === 3 && "text-orange-600",
				)}
			/>
		);
	}

	return (
		<div className="flex h-6 w-6 min-h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
			<span className="text-xs font-bold tabular-nums">{rank}</span>
		</div>
	);
}

function CampaignStatusBadge({ ativo }: { ativo: boolean }) {
	return (
		<span
			className={cn(
				"shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-bold",
				ativo ? "bg-[rgba(22,163,74,0.12)] text-[#16a34a]" : "bg-muted text-muted-foreground",
			)}
		>
			{ativo ? "ATIVA" : "INATIVA"}
		</span>
	);
}

function MobileMetricCell({ label, value, emphasized }: { label: string; value: string; emphasized?: boolean }) {
	return (
		<div className="flex flex-col gap-0.5 rounded-lg bg-muted/30 px-2.5 py-2">
			<span className="text-[0.65rem] font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
			<span className={cn("text-sm tabular-nums", emphasized ? "font-bold text-[#24549C]" : "font-medium text-foreground")}>{value}</span>
		</div>
	);
}

function CampaignRankingMobileCard({ campaign, rankingBy }: { campaign: CampaignRankingItem; rankingBy: TGetCampaignRankingInput["rankingBy"] }) {
	const primaryMetric =
		rankingBy === "revenue"
			? { icon: BadgeDollarSign, value: formatToMoney(campaign.receita) }
			: rankingBy === "conversions"
				? { icon: MousePointerClick, value: formatDecimalPlaces(campaign.conversoes) }
				: { icon: TrendingUp, value: `${formatDecimalPlaces(campaign.taxaConversao)}%` };

	const PrimaryIcon = primaryMetric.icon;

	return (
		<div
			className={cn(
				"flex w-full flex-col gap-3 rounded-xl border px-3 py-3 shadow-2xs",
				"border-border bg-card",
				campaign.rank === 1 && RANK_CARD_STYLES[1],
				campaign.rank === 2 && RANK_CARD_STYLES[2],
				campaign.rank === 3 && RANK_CARD_STYLES[3],
			)}
		>
			<div className="flex items-start gap-2.5">
				<div className="pt-0.5">
					<CampaignRankBadge rank={campaign.rank} />
				</div>
				<div className="flex min-w-0 flex-1 flex-col gap-1.5">
					<div className="flex flex-wrap items-center gap-2">
						<p className="min-w-0 flex-1 text-sm font-bold leading-snug text-foreground">{campaign.titulo}</p>
						<CampaignStatusBadge ativo={campaign.ativo} />
					</div>
					<div className="flex w-fit self-center items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1.5">
						<PrimaryIcon className="h-3.5 w-3.5 shrink-0 opacity-80" />
						<span className="text-sm font-bold tabular-nums text-foreground">{primaryMetric.value}</span>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
				<MobileMetricCell label="Msgs" value={formatDecimalPlaces(campaign.interacoes)} />
				<MobileMetricCell label="Tx. entrega" value={`${formatDecimalPlaces(campaign.taxaEntrega)}%`} />
				<MobileMetricCell label="Tx. leitura" value={`${formatDecimalPlaces(campaign.taxaLeitura)}%`} />
				<MobileMetricCell label="Conv." value={formatDecimalPlaces(campaign.conversoes)} emphasized={rankingBy === "conversions"} />
				<MobileMetricCell label="Tx. conv." value={`${formatDecimalPlaces(campaign.taxaConversao)}%`} emphasized={rankingBy === "conversion-rate"} />
				<MobileMetricCell label="Receita" value={formatToMoney(campaign.receita)} emphasized={rankingBy === "revenue"} />
			</div>
		</div>
	);
}

export function CampaignRankingBlock({ ranking, rankingBy }: CampaignRankingBlockProps) {
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
									className="min-h-11 min-w-11 rounded-lg p-2"
								>
									<BadgeDollarSign className="h-4 w-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p>Ordenar por receita</p>
							</TooltipContent>
						</Tooltip>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant={rankingBy === "conversions" ? "default" : "ghost"}
									size="fit"
									className="min-h-11 min-w-11 rounded-lg p-2"
								>
									<MousePointerClick className="h-4 w-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p>Ordenar por conversões</p>
							</TooltipContent>
						</Tooltip>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant={rankingBy === "conversion-rate" ? "default" : "ghost"}
									size="fit"
									className="min-h-11 min-w-11 rounded-lg p-2"
								>
									<TrendingUp className="h-4 w-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p>Ordenar por taxa de conversão</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				</div>
			</div>

			<div className="flex w-full flex-col gap-2 lg:hidden">
				{ranking.map((campaign) => (
					<CampaignRankingMobileCard key={campaign.campanhaId} campaign={campaign} rankingBy={rankingBy} />
				))}
			</div>
			<div className="hidden w-full overflow-x-auto lg:block">
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
						{ranking.map((campaign) => (
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
									<CampaignRankBadge rank={campaign.rank} />
								</td>
								<td className="py-2.5">
									<div className="flex items-center gap-2">
										<span className="max-w-[160px] truncate font-semibold text-foreground" title={campaign.titulo}>
											{campaign.titulo}
										</span>
										<CampaignStatusBadge ativo={campaign.ativo} />
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
		</div>
	);
}
