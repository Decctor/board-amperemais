import TextInput from "@/components/Inputs/TextInput";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { TOrganizationIntegrationConfig } from "@/schemas/organizations";
import { Globe, Package } from "lucide-react";
import { useState } from "react";

type ViewIntegrationProps = {
	initialOrganizationIntegrationConfig: TOrganizationIntegrationConfig;
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: () => void;
		onSettled?: () => void;
	};
	closeMenu: () => void;
};
export default function ViewIntegration({ initialOrganizationIntegrationConfig, callbacks, closeMenu }: ViewIntegrationProps) {
	const [organizationIntegrationConfig, setOrganizationIntegrationConfig] =
		useState<TOrganizationIntegrationConfig>(initialOrganizationIntegrationConfig);

	function updateOrganizationOnlineSoftwareConfig(changes: Partial<Extract<TOrganizationIntegrationConfig, { tipo: "ONLINE-SOFTWARE" }>>) {
		setOrganizationIntegrationConfig((prev) => {
			if (prev.tipo === "ONLINE-SOFTWARE") {
				return {
					...prev,
					...changes,
				};
			}
			return prev;
		});
	}

	function updateOrganizationCardapioWebConfig(changes: Partial<Extract<TOrganizationIntegrationConfig, { tipo: "CARDAPIO-WEB" }>>) {
		setOrganizationIntegrationConfig((prev) => {
			if (prev.tipo === "CARDAPIO-WEB") {
				return {
					...prev,
					...changes,
				};
			}
			return prev;
		});
	}

	const updateOrg = async () => {
		console.log("TESTING UPDATE ORG");
	};
	return (
		<ResponsiveMenu
			menuTitle="INTEGRAÇÃO"
			menuDescription="Verifique os detalhes da integração."
			menuActionButtonText="ATUALIZAR"
			menuCancelButtonText="FECHAR"
			closeMenu={closeMenu}
			actionFunction={updateOrg}
			actionIsLoading={false}
			stateIsLoading={false}
		>
			{organizationIntegrationConfig.tipo === "ONLINE-SOFTWARE" ? (
				<OnlineSoftwareIntegrationDetails
					organizationIntegrationConfig={organizationIntegrationConfig}
					updateOrganizationIntegrationConfig={updateOrganizationOnlineSoftwareConfig}
				/>
			) : null}

			{organizationIntegrationConfig.tipo === "CARDAPIO-WEB" ? (
				<CardapioWebIntegrationDetails
					organizationIntegrationConfig={organizationIntegrationConfig}
					updateOrganizationIntegrationConfig={updateOrganizationCardapioWebConfig}
				/>
			) : null}
		</ResponsiveMenu>
	);
}

type OnlineSoftwareIntegrationDetailsProps = {
	organizationIntegrationConfig: Extract<TOrganizationIntegrationConfig, { tipo: "ONLINE-SOFTWARE" }>;
	updateOrganizationIntegrationConfig: (changes: Partial<Extract<TOrganizationIntegrationConfig, { tipo: "ONLINE-SOFTWARE" }>>) => void;
};
function OnlineSoftwareIntegrationDetails({
	organizationIntegrationConfig,
	updateOrganizationIntegrationConfig,
}: OnlineSoftwareIntegrationDetailsProps) {
	return (
		<ResponsiveMenuSection title="INTEGRAÇÃO ONLINE" icon={<Globe className="w-4 h-4" />}>
			<TextInput
				label="TOKEN"
				value={organizationIntegrationConfig.token}
				placeholder="Preencha aqui o seu token de acesso..."
				handleChange={(value) => updateOrganizationIntegrationConfig({ token: value })}
			/>
			<TextInput
				label="URL"
				value={organizationIntegrationConfig.url}
				placeholder="Preencha aqui a URL da integração..."
				handleChange={(value) => updateOrganizationIntegrationConfig({ url: value })}
			/>
		</ResponsiveMenuSection>
	);
}

type CardapioWebIntegrationDetailsProps = {
	organizationIntegrationConfig: Extract<TOrganizationIntegrationConfig, { tipo: "CARDAPIO-WEB" }>;
	updateOrganizationIntegrationConfig: (changes: Partial<Extract<TOrganizationIntegrationConfig, { tipo: "CARDAPIO-WEB" }>>) => void;
};
function CardapioWebIntegrationDetails({ organizationIntegrationConfig, updateOrganizationIntegrationConfig }: CardapioWebIntegrationDetailsProps) {
	return (
		<ResponsiveMenuSection title="INTEGRAÇÃO CARDÁPIO WEB" icon={<Package className="w-4 h-4" />}>
			<TextInput
				label="ID DA LOJA (MERCHANT ID)"
				value={organizationIntegrationConfig.merchantId}
				placeholder="Preencha aqui o ID da loja..."
				handleChange={(value) => updateOrganizationIntegrationConfig({ merchantId: value })}
			/>
			<TextInput
				label="CHAVE DE API (API KEY)"
				value={organizationIntegrationConfig.apiKey}
				placeholder="Preencha aqui a chave de API..."
				handleChange={(value) => updateOrganizationIntegrationConfig({ apiKey: value })}
			/>
		</ResponsiveMenuSection>
	);
}
