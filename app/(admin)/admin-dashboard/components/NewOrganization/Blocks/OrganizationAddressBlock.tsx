"use client";
import TextInput from "@/components/Inputs/TextInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import type { TUseOrganizationState } from "@/state-hooks/use-organization-state";
import { MapPin } from "lucide-react";

type OrganizationAddressBlockProps = {
	organization: TUseOrganizationState["state"]["organization"];
	updateOrganization: TUseOrganizationState["updateOrganization"];
};

export default function OrganizationAddressBlock({ organization, updateOrganization }: OrganizationAddressBlockProps) {
	return (
		<ResponsiveMenuSection title="ENDEREÇO" icon={<MapPin className="w-4 h-4" />}>
			<div className="flex flex-col gap-3">
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
					<TextInput
						label="CEP"
						placeholder="Preencha aqui o CEP da organização."
						value={organization.localizacaoCep || ""}
						handleChange={(value) => updateOrganization({ localizacaoCep: value })}
					/>
					<TextInput
						label="Estado"
						placeholder="Preencha aqui o estado da organização."
						value={organization.localizacaoEstado || ""}
						handleChange={(value) => updateOrganization({ localizacaoEstado: value })}
						width="100%"
					/>
				</div>
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
					<TextInput
						label="Cidade"
						placeholder="Preencha aqui a cidade da organização."
						value={organization.localizacaoCidade || ""}
						handleChange={(value) => updateOrganization({ localizacaoCidade: value })}
						width="100%"
					/>
					<TextInput
						label="Bairro"
						placeholder="Preencha aqui o bairro da organização."
						value={organization.localizacaoBairro || ""}
						handleChange={(value) => updateOrganization({ localizacaoBairro: value })}
						width="100%"
					/>
				</div>
				<TextInput
					label="Logradouro"
					placeholder="Preencha aqui o logradouro da organização."
					value={organization.localizacaoLogradouro || ""}
					handleChange={(value) => updateOrganization({ localizacaoLogradouro: value })}
					width="100%"
				/>
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
					<TextInput
						label="Número"
						placeholder="Preencha aqui o número da organização."
						value={organization.localizacaoNumero || ""}
						handleChange={(value) => updateOrganization({ localizacaoNumero: value })}
					/>
					<TextInput
						label="Complemento"
						placeholder="Preencha aqui o complemento da organização."
						value={organization.localizacaoComplemento || ""}
						handleChange={(value) => updateOrganization({ localizacaoComplemento: value })}
						width="100%"
					/>
				</div>
			</div>
		</ResponsiveMenuSection>
	);
}
