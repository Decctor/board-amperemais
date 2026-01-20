"use client";
import { formatDecimalPlaces, formatToMoney } from "@/lib/formatting";
import { useStatsBySegmentation } from "@/lib/queries/campaigns";
import { cn } from "@/lib/utils";
import { BadgeDollarSign, Grid3x3, MousePointerClick, Users } from "lucide-react";

type CampaignsBySegmentationProps = {
	startDate: Date | null;
	endDate: Date | null;
};

export default function CampaignsBySegmentation({ startDate, endDate }: CampaignsBySegmentationProps) {
	const { data: segmentationData, isLoading } = useStatsBySegmentation({
		startDate: startDate ?? null,
		endDate: endDate ?? null,
	});

	return (
		<div className="w-full flex flex-col gap-2 py-2 h-full">
			<div className="bg-card border-primary/20 flex w-full h-full flex-col gap-3 rounded-xl border px-3 py-4 shadow-2xs">
				<div className="flex items-center justify-between gap-2 flex-wrap shrink-0">
					<h1 className="text-xs font-medium tracking-tight uppercase">DESEMPENHO POR SEGMENTACAO</h1>
					<Users className="h-4 min-h-4 w-4 min-w-4 text-muted-foreground" />
				</div>
				<div className="flex w-full flex-1 flex-col gap-2 overflow-auto scrollbar-thin scrollbar-track-primary/10 scrollbar-thumb-primary/30 min-h-0">
					{isLoading ? (
						<div className="flex w-full items-center justify-center py-8">
							<p className="text-sm text-muted-foreground">Carregando dados...</p>
						</div>
					) : segmentationData && segmentationData.length > 0 ? (
						segmentationData.map((item, index) => (
							<div
								key={item.segmentacao}
								className={cn("bg-card border-primary/20 flex w-full flex-col gap-2 rounded-xl border px-3 py-3 shadow-2xs")}
							>
								<div className="w-full flex items-start justify-between gap-2 flex-wrap">
									<div className="flex items-center gap-2 flex-wrap">
										<div className="w-6 h-6 min-w-6 min-h-6 rounded-full bg-primary/10 flex items-center justify-center">
											<span className="text-xs font-bold">{index + 1}</span>
										</div>
										<div className="flex items-start flex-col gap-1">
											<h1 className="text-xs font-bold tracking-tight lg:text-sm">{item.segmentacao}</h1>
											<div className="flex items-center gap-2 flex-wrap">
												<div className="flex items-center gap-1">
													<Grid3x3 className="w-3 h-3 min-w-3 min-h-3 text-muted-foreground" />
													<span className="text-[0.65rem] text-muted-foreground">
														{formatDecimalPlaces(item.campanhasAtivas)} campanhas ativas
													</span>
												</div>
												<div className="flex items-center gap-1">
													<MousePointerClick className="w-3 h-3 min-w-3 min-h-3 text-muted-foreground" />
													<span className="text-[0.65rem] text-muted-foreground">
														{formatDecimalPlaces(item.conversoes)} conversoes
													</span>
												</div>
											</div>
										</div>
									</div>
									<div className="flex items-center gap-3 flex-wrap">
										<div className={cn("flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[0.65rem] font-bold bg-primary/10 text-primary")}>
											<BadgeDollarSign className="w-3 min-w-3 h-3 min-h-3" />
											<p className="text-xs font-bold tracking-tight uppercase">{formatToMoney(item.receita)}</p>
										</div>
									</div>
								</div>
							</div>
						))
					) : (
						<div className="flex w-full items-center justify-center py-8">
							<p className="text-sm text-muted-foreground">Nenhuma segmentacao encontrada para o periodo selecionado.</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
