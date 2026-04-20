import CheckboxInput from "@/components/Inputs/CheckboxInput";
import TextInput from "@/components/Inputs/TextInput";
import TextareaInput from "@/components/Inputs/TextareaInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { useCampaignUtilPreviewSegmentationAudience } from "@/lib/queries/campaigns";
import { cn } from "@/lib/utils";
import type { TUseCampaignState } from "@/state-hooks/use-campaign-state";
import { RFMLabels } from "@/utils/rfm";
import { LayoutGrid, Loader2 } from "lucide-react";

type CampaignsGeneralBlockProps = {
	campaign: TUseCampaignState["state"]["campaign"];
	campaignSegmentations: TUseCampaignState["state"]["segmentations"];
	updateCampaign: TUseCampaignState["updateCampaign"];
	addSegmentation: TUseCampaignState["addSegmentation"];
	updateSegmentation: TUseCampaignState["updateSegmentation"];
	deleteSegmentation: TUseCampaignState["deleteSegmentation"];
};

function formatSegmentCount(n: number) {
	return n.toLocaleString("pt-BR");
}

export default function CampaignsGeneralBlock({
	campaign,
	campaignSegmentations,
	updateCampaign,
	addSegmentation,
	updateSegmentation,
	deleteSegmentation,
}: CampaignsGeneralBlockProps) {
	const { data: audience, isLoading } = useCampaignUtilPreviewSegmentationAudience();

	function handleSegmentationToggle(labelText: string) {
		const idx = campaignSegmentations.findIndex((s) => s.segmentacao === labelText);
		if (idx < 0) {
			addSegmentation({ segmentacao: labelText });
			return;
		}
		const row = campaignSegmentations[idx];
		if (row.deletar) {
			if (row.id) updateSegmentation({ ...row, deletar: false });
			return;
		}
		deleteSegmentation(idx);
	}

	return (
		<ResponsiveMenuSection title="INFORMAÇÕES GERAIS" icon={<LayoutGrid className="h-4 min-h-4 w-4 min-w-4" />}>
			<div className="w-full flex items-center justify-center">
				<CheckboxInput
					checked={campaign.ativo}
					labelTrue="ATIVO"
					labelFalse="ATIVO"
					handleChange={(value) => updateCampaign({ ativo: value })}
					justify="justify-center"
				/>
			</div>
			<TextInput
				value={campaign.titulo}
				label="TÍTULO"
				placeholder="Preencha aqui o título da campanha..."
				handleChange={(value) => updateCampaign({ titulo: value })}
				width="100%"
			/>
			<TextareaInput
				value={campaign.descricao ?? ""}
				label="DESCRIÇÃO"
				placeholder="Preencha aqui a descrição da campanha..."
				handleChange={(value) => updateCampaign({ descricao: value })}
			/>

			<div className="flex w-full flex-col gap-1">
				<h2 className="text-sm tracking-tight text-primary/80 font-medium">SEGMENTAÇÕES</h2>
				<div className="w-full flex flex-wrap items-center gap-x-2 gap-y-1">
					{RFMLabels.map((label) => {
						const isExisting = campaignSegmentations.some((s) => s.segmentacao === label.text && !s.deletar);
						const count = audience?.bySegment[label.text];
						return (
							<button
								key={label.text}
								type="button"
								className={cn(
									"inline-flex min-w-0 items-center justify-between gap-3 rounded-lg px-2 py-4 text-left text-xs font-medium",
									isExisting && label.backgroundCollor,
									isExisting && label.textCollor,
								)}
								onClick={() => handleSegmentationToggle(label.text)}
							>
								<span className="min-w-0 truncate">{label.text}</span>
								<span
									className={cn(
										"shrink-0 tabular-nums text-xs font-semibold",
										isExisting ? "opacity-95" : "text-muted-foreground",
									)}
									aria-label={
										typeof count === "number"
											? `${formatSegmentCount(count)} clientes nesta segmentação`
											: "Quantidade de clientes nesta segmentação"
									}
								>
									{isLoading ? (
										<Loader2 className="h-3.5 w-3.5 animate-spin opacity-70" aria-hidden />
									) : typeof count === "number" ? (
										formatSegmentCount(count)
									) : (
										"—"
									)}
								</span>
							</button>
						);
					})}
				</div>
			</div>
		</ResponsiveMenuSection>
	);
}
