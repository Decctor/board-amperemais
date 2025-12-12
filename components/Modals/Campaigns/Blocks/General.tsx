import CheckboxInput from "@/components/Inputs/CheckboxInput";
import MultipleSelectInput from "@/components/Inputs/MultipleSelectInput";
import SelectInput from "@/components/Inputs/SelectInput";
import TextInput from "@/components/Inputs/TextInput";
import TextareaInput from "@/components/Inputs/TextareaInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TCampaignState } from "@/schemas/campaigns";
import type { TUseCampaignState } from "@/state-hooks/use-campaign-state";
import { RFMLabels } from "@/utils/rfm";
import { LayoutGrid } from "lucide-react";

type CampaignsGeneralBlockProps = {
	campaign: TUseCampaignState["state"]["campaign"];
	campaignSegmentations: TUseCampaignState["state"]["segmentations"];
	updateCampaign: TUseCampaignState["updateCampaign"];
	addSegmentation: TUseCampaignState["addSegmentation"];
	deleteSegmentation: TUseCampaignState["deleteSegmentation"];
};
export default function CampaignsGeneralBlock({
	campaign,
	campaignSegmentations,
	updateCampaign,
	addSegmentation,
	deleteSegmentation,
}: CampaignsGeneralBlockProps) {
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
				<div className="w-full flex items-center flex-wrap gap-x-2 gap-y-1">
					{RFMLabels.map((label) => {
						const isExisting = campaignSegmentations.some((s) => s.segmentacao === label.text);
						return (
							<Button
								key={label.text}
								variant={isExisting ? "default" : "ghost"}
								size={"fit"}
								className={cn("px-2 py-1 rounded-lg", {
									"opacity-100": isExisting,
									"opacity-50": !isExisting,
								})}
								onClick={() => {
									if (isExisting) {
										deleteSegmentation(campaignSegmentations.findIndex((s) => s.segmentacao === label.text));
									} else {
										addSegmentation({ segmentacao: label.text });
									}
								}}
							>
								{label.text}
							</Button>
						);
					})}
				</div>
			</div>
		</ResponsiveMenuSection>
	);
}
