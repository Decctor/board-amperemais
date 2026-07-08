"use client";

import TextInput from "@/components/Inputs/TextInput";
import TextareaInput from "@/components/Inputs/TextareaInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import type { TUseInternalAudienceState } from "@/state-hooks/use-internal-audience-state";
import { LayoutGrid } from "lucide-react";

type AudienceGeneralBlockProps = {
	audience: TUseInternalAudienceState["state"]["audience"];
	updateAudience: TUseInternalAudienceState["updateAudience"];
};
export default function AudienceGeneralBlock({ audience, updateAudience }: AudienceGeneralBlockProps) {
	return (
		<ResponsiveMenuSection title="INFORMAÇÕES GERAIS" icon={<LayoutGrid className="h-4 w-4" />}>
			<TextInput
				label="Nome"
				required
				value={audience.nome}
				placeholder="Ex.: Campeões e Leais"
				handleChange={(value) => updateAudience({ nome: value })}
			/>
			<TextareaInput
				label="Descrição"
				value={audience.descricao ?? ""}
				placeholder="Opcional — descreva o propósito deste público"
				handleChange={(value) => updateAudience({ descricao: value || null })}
			/>
		</ResponsiveMenuSection>
	);
}
