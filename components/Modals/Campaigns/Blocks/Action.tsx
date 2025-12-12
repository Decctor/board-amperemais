import SelectInput from "@/components/Inputs/SelectInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import type { TUseCampaignState } from "@/state-hooks/use-campaign-state";
import { Send } from "lucide-react";

type CampaignsActionBlockProps = {
	campaign: TUseCampaignState["state"]["campaign"];
	updateCampaign: TUseCampaignState["updateCampaign"];
};
export default function CampaignsActionBlock({ campaign, updateCampaign }: CampaignsActionBlockProps) {
	return (
		<ResponsiveMenuSection title="AÇÃO" icon={<Send className="h-4 min-h-4 w-4 min-w-4" />}>
			<div className="w-full flex flex-col gap-1">
				<p className="text-center text-sm tracking-tigh text-muted-foreground">Defina o template do WhatsApp que deve ser enviado.</p>
				<SelectInput
					label="TEMPLATE DO WHATSAPP"
					value={campaign.whatsappTemplateId}
					selectedItemLabel="SELECIONE O TEMPLATE"
					options={[]}
					handleChange={(value) => updateCampaign({ whatsappTemplateId: value })}
					onReset={() => updateCampaign({ whatsappTemplateId: "" })}
					width="100%"
				/>
			</div>
		</ResponsiveMenuSection>
	);
}
