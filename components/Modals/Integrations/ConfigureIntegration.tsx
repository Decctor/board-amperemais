import TextInput from "@/components/Inputs/TextInput";
import ResponsiveMenuV2 from "@/components/Utils/ResponsiveMenuV2";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { getErrorMessage } from "@/lib/errors";
import { updateOrganization } from "@/lib/mutations/organizations";
import { TOrganizationIntegrationConfig } from "@/schemas/organizations";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Globe, Package } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
type ViewIntegrationProps = {
	integrationType: "ONLINE-SOFTWARE" | "CARDAPIO-WEB";
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: () => void;
		onSettled?: () => void;
	};
	closeMenu: () => void;
};

const INITIAL_CONFIG: Record<"ONLINE-SOFTWARE" | "CARDAPIO-WEB", TOrganizationIntegrationConfig> = {
	"ONLINE-SOFTWARE": {
		tipo: "ONLINE-SOFTWARE",
		token: "",
		url: "",
	},
	"CARDAPIO-WEB": {
		tipo: "CARDAPIO-WEB",
		merchantId: "",
		apiKey: "",
	},
};
export default function ViewIntegration({ integrationType, callbacks, closeMenu }: ViewIntegrationProps) {
	const [organizationIntegrationConfig, setOrganizationIntegrationConfig] = useState<TOrganizationIntegrationConfig>(INITIAL_CONFIG[integrationType]);

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

	async function handleValidateAndCommit(integration: TOrganizationIntegrationConfig) {
		if (integration.tipo === "ONLINE-SOFTWARE") {
			if (!integration.token.trim()) {
				throw new Error("O token é obrigatório para a integração Online Software.");
			}
		}
		if (integration.tipo === "CARDAPIO-WEB") {
			if (!integration.merchantId.trim() || !integration.apiKey.trim()) {
				throw new Error("O Merchant ID e API Key são obrigatórios para a integração Cardápio Web.");
			}
		}

		// We need to pass the selected type here, not the state one, because state one updates only on success/reload logic effectively in the old code,
		// but here we want to update to what is being configured.
		return await updateOrganization({
			organization: {
				integracaoTipo: integrationType,
				integracaoConfiguracao: integration,
			},
		});
	}

	const {
		mutate: configureIntegrationMutation,
		isPending,
		isSuccess,
	} = useMutation({
		mutationFn: handleValidateAndCommit,
		onMutate: () => {
			if (callbacks?.onMutate) callbacks.onMutate();
		},
		onSuccess: () => {
			if (callbacks?.onSuccess) callbacks.onSuccess();
			toast.success("Integração configurada com sucesso!");
			return closeMenu();
		},
		onError: (error) => {
			if (callbacks?.onError) callbacks.onError();
			toast.error(getErrorMessage(error));
		},
		onSettled: () => {
			if (callbacks?.onSettled) callbacks.onSettled();
		},
	});
	return (
		<ResponsiveMenuV2
			menuTitle={`CONFIGURAR ${integrationType.toUpperCase()}`}
			menuDescription="Insira as credenciais para ativar a integração. Esses dados são obtidos diretamente no painel do sistema parceiro."
			menuActionButtonText="CONECTAR"
			menuCancelButtonText="FECHAR"
			closeMenu={closeMenu}
			actionFunction={() => configureIntegrationMutation(organizationIntegrationConfig)}
			actionIsLoading={isPending}
			stateIsLoading={false}
			successContent={
				isSuccess ? (
					<div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
						<motion.div
							initial={{ scale: 0.5, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							transition={{ type: "spring", stiffness: 300, damping: 20 }}
							className="rounded-full bg-green-100 p-4 text-green-600 dark:bg-green-900/30 dark:text-green-500"
						>
							<CheckCircle2 className="h-12 w-12" />
						</motion.div>
						<div className="space-y-2">
							<h3 className="text-xl font-semibold text-foreground">Integração Conectada!</h3>
							<p className="text-muted-foreground max-w-xs mx-auto">
								Suas credenciais foram validadas. A página será recarregada em instantes para aplicar as alterações.
							</p>
						</div>
					</div>
				) : null
			}
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
		</ResponsiveMenuV2>
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
