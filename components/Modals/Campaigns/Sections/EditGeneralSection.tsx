"use client";

import type { TGetCampaignsOutputById } from "@/app/api/campaigns/route";
import TextInput from "@/components/Inputs/TextInput";
import TextareaInput from "@/components/Inputs/TextareaInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { TextIcon } from "lucide-react";
import SectionEditModal from "./SectionEditModal";

type EditGeneralSectionProps = {
	campaign: TGetCampaignsOutputById;
	closeModal: () => void;
	callbacks?: { onSuccess?: () => void; onSettled?: () => void };
};

export default function EditGeneralSection({ campaign, closeModal, callbacks }: EditGeneralSectionProps) {
	return (
		<SectionEditModal
			campaign={campaign}
			menuTitle="EDITAR INFORMAÇÕES GERAIS"
			menuDescription="Atualize o título e a descrição interna da campanha."
			dialogVariant="sm"
			validate={(state) =>
				state.campaign.titulo && state.campaign.titulo.trim().length > 0
					? { valid: true }
					: { valid: false, reason: "Dê um título para a campanha." }
			}
			closeModal={closeModal}
			callbacks={callbacks}
		>
			{({ state, updateCampaign }) => (
				<ResponsiveMenuSection title="INFORMAÇÕES GERAIS" icon={<TextIcon className="h-4 min-h-4 w-4 min-w-4" />}>
					<TextInput
						label="TÍTULO"
						value={state.campaign.titulo}
						placeholder="Dê um nome para identificar esta campanha"
						handleChange={(value) => updateCampaign({ titulo: value })}
					/>
					<TextareaInput
						label="DESCRIÇÃO"
						value={state.campaign.descricao ?? ""}
						placeholder="Conte em poucas linhas o objetivo desta campanha (uso interno)..."
						handleChange={(value) => updateCampaign({ descricao: value })}
					/>
				</ResponsiveMenuSection>
			)}
		</SectionEditModal>
	);
}
