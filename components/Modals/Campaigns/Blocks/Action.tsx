import SelectInput from "@/components/Inputs/SelectInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { useWhatsappConnection } from "@/lib/queries/whatsapp-connections";
import { useWhatsappTemplates } from "@/lib/queries/whatsapp-templates";
import type { TUseCampaignState } from "@/state-hooks/use-campaign-state";
import { Send } from "lucide-react";
import { useEffect, useMemo } from "react";

type CampaignsActionBlockProps = {
	organizationId: string;
	campaign: TUseCampaignState["state"]["campaign"];
	updateCampaign: TUseCampaignState["updateCampaign"];
};
export default function CampaignsActionBlock({ organizationId, campaign, updateCampaign }: CampaignsActionBlockProps) {
	const { data: whatsappConnection } = useWhatsappConnection();
	console.log("campaign.whatsappConexaoTelefoneId", campaign.whatsappConexaoTelefoneId);
	const { data: whatsappTemplatesResult, updateParams } = useWhatsappTemplates({
		initialParams: { page: 1, search: "", whatsappConnectionPhoneId: campaign.whatsappConexaoTelefoneId },
	});

	const whatsappConnectionPhones =
		whatsappConnection?.telefones.map((v) => ({
			id: v.id,
			label: `(${v.numero}) - ${v.nome}`,
			value: v.id,
		})) ?? [];
	const whatsappTemplates = whatsappTemplatesResult?.whatsappTemplates ?? [];

	return (
		<ResponsiveMenuSection title="AÇÃO" icon={<Send className="h-4 min-h-4 w-4 min-w-4" />}>
			<div className="w-full flex flex-col gap-1">
				<p className="text-center text-sm tracking-tigh text-muted-foreground">Defina o template do WhatsApp que deve ser enviado.</p>
				<SelectInput
					label="TELEFONE DO WHATSAPP"
					value={campaign.whatsappConexaoTelefoneId}
					resetOptionLabel="SELECIONE O TELEFONE"
					options={whatsappConnectionPhones}
					handleChange={(value) => {
						updateCampaign({ whatsappConexaoTelefoneId: value, whatsappTemplateId: "" });
						updateParams({ whatsappConnectionPhoneId: value });
					}}
					onReset={() => {
						updateCampaign({ whatsappConexaoTelefoneId: "", whatsappTemplateId: "" });
						updateParams({ whatsappConnectionPhoneId: undefined });
					}}
					width="100%"
				/>
				<SelectInput
					label="TEMPLATE DO WHATSAPP"
					value={campaign.whatsappTemplateId}
					editable={!!campaign.whatsappConexaoTelefoneId}
					resetOptionLabel={campaign.whatsappConexaoTelefoneId ? "SELECIONE O TEMPLATE" : "SELECIONE UM TELEFONE PRIMEIRO"}
					options={whatsappTemplates.map((template) => ({ id: template.id, label: template.nome, value: template.id }))}
					handleChange={(value) => updateCampaign({ whatsappTemplateId: value })}
					onReset={() => updateCampaign({ whatsappTemplateId: "" })}
					width="100%"
				/>
			</div>
		</ResponsiveMenuSection>
	);
}
