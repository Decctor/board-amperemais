"use client";
import type { TGetCampaignFunnelOutput } from "@/app/api/campaigns/stats/funnel/route";
import { formatDecimalPlaces } from "@/lib/formatting";
import { CheckCircle2, Eye, MessageCircle, Send } from "lucide-react";

type CampaignFunnelBlockProps = {
	funnel: TGetCampaignFunnelOutput["data"] | undefined;
	isLoading: boolean;
};

type FunnelStage = {
	label: string;
	sublabel: string;
	value: number;
	rate: number | null;
	icon: React.ReactNode;
	color: string;
	bgColor: string;
};

export function CampaignFunnelBlock({ funnel, isLoading }: CampaignFunnelBlockProps) {
	const stages: FunnelStage[] = [
		{
			label: "Enviadas",
			sublabel: "mensagens disparadas",
			value: funnel?.enviados ?? 0,
			rate: null,
			icon: <Send className="w-4 h-4" />,
			color: "#24549C",
			bgColor: "rgba(36,84,156,0.10)",
		},
		{
			label: "Entregues",
			sublabel: "chegaram ao destinatário",
			value: funnel?.entregues ?? 0,
			rate: funnel?.taxaEntrega ?? null,
			icon: <MessageCircle className="w-4 h-4" />,
			color: "#0ea5e9",
			bgColor: "rgba(14,165,233,0.10)",
		},
		{
			label: "Lidas",
			sublabel: "abertas pelo cliente",
			value: funnel?.lidos ?? 0,
			rate: funnel?.taxaLeitura ?? null,
			icon: <Eye className="w-4 h-4" />,
			color: "#FFB900",
			bgColor: "rgba(255,185,0,0.12)",
		},
		{
			label: "Convertidas",
			sublabel: "geraram uma compra",
			value: funnel?.convertidos ?? 0,
			rate: funnel?.taxaConversaoDeLidos ?? null,
			icon: <CheckCircle2 className="w-4 h-4" />,
			color: "#16a34a",
			bgColor: "rgba(22,163,74,0.10)",
		},
	];

	const maxValue = Math.max(...stages.map((s) => s.value), 1);

	return (
		<div className="bg-card border-border flex min-h-0 w-full flex-col gap-4 rounded-xl border px-4 py-4 shadow-2xs lg:h-full">
			<div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
				<h2 className="text-xs font-bold uppercase tracking-wide text-foreground">Funil de engajamento</h2>
				{funnel && (
					<div className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold bg-primary/10 text-foreground">
						{formatDecimalPlaces(funnel.taxaConversaoGeral)}% conversão geral
					</div>
				)}
			</div>

			{isLoading ? (
				<div className="flex min-h-48 flex-1 flex-col justify-between gap-3 lg:min-h-0">
					{[...Array(4)].map((_, i) => (
						<div key={i} className="h-14 rounded-xl bg-muted/40 animate-pulse" />
					))}
				</div>
			) : funnel ? (
				<div className="flex min-h-0 flex-1 flex-col justify-between gap-4">
					{stages.map((stage, index) => {
						const widthPct = maxValue > 0 ? (stage.value / maxValue) * 100 : 0;
						const isLast = index === stages.length - 1;

						return (
							<div key={stage.label} className="flex flex-col gap-1.5">
								<div className="flex items-center gap-3">
									{/* Icon */}
									<div className="flex items-center justify-center rounded-lg p-2 shrink-0" style={{ backgroundColor: stage.bgColor, color: stage.color }}>
										{stage.icon}
									</div>

									{/* Bar + labels */}
									<div className="flex-1 flex flex-col gap-1 min-w-0">
										<div className="flex items-center justify-between gap-2">
											<div>
												<span className="text-xs font-bold uppercase tracking-tight">{stage.label}</span>
												<span className="ml-1.5 text-[0.65rem] text-muted-foreground">{stage.sublabel}</span>
											</div>
											<span className="text-sm font-bold tabular-nums shrink-0">{formatDecimalPlaces(stage.value)}</span>
										</div>
										<div className="w-full h-6 rounded-lg overflow-hidden bg-muted/30">
											<div
												className="h-full flex items-center justify-end pr-2 rounded-lg transition-all duration-500"
												style={{
													width: `${widthPct}%`,
													backgroundColor: stage.color,
												}}
											>
												{widthPct > 12 && <span className="text-[0.6rem] font-bold text-white">{Math.round(widthPct)}%</span>}
											</div>
										</div>
									</div>
								</div>

								{/* Rate arrow to next stage */}
								{!isLast && stage.rate !== null && (
									<div className="flex items-center gap-1.5 pl-12">
										<div className="h-px flex-1 bg-border" />
										<span className="text-[0.65rem] text-muted-foreground px-2 shrink-0">{formatDecimalPlaces(stage.rate)}% avançam</span>
										<div className="h-px flex-1 bg-border" />
									</div>
								)}
							</div>
						);
					})}
				</div>
			) : (
				<p className="flex flex-1 items-center justify-center py-6 text-center text-sm text-muted-foreground">Nenhum dado disponível para o período.</p>
			)}
		</div>
	);
}
