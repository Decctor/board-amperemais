import { ResponsiveMenuAnimatedBody } from "@/components/Utils/ResponsiveMenuAnimatedBody";
import { LoadingButton } from "@/components/loading-button";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import TextInput from "@/components/Inputs/TextInput";
import ResponsiveMenuSection from "@/components/Utils/ResponsiveMenuSection";
import { getErrorMessage } from "@/lib/errors";
import { createIntegration } from "@/lib/mutations/integrations";
import { TOrganizationIntegrationConfig } from "@/schemas/organizations";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Globe, Package, Tag } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
type ViewIntegrationProps = {
	integrationType: "ONLINE-SOFTWARE" | "CARDAPIO-WEB" | "ERP-FLEX";
	/** true quando já existe conexão ativa do mesmo tipo — o apelido vira obrigatório (D5). */
	requireApelido?: boolean;
	/** Reconexão explícita (D9): id da linha de `integrations` a reativar com as credenciais novas. */
	reconnectIntegrationId?: string | null;
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: () => void;
		onSettled?: () => void;
	};
	closeMenu: () => void;
};

const INITIAL_CONFIG: Record<"ONLINE-SOFTWARE" | "CARDAPIO-WEB" | "ERP-FLEX", TOrganizationIntegrationConfig> = {
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
	"ERP-FLEX": {
		tipo: "ERP-FLEX",
		username: "",
		password: "",
		database: "",
	},
};
export default function ViewIntegration({ integrationType, requireApelido, reconnectIntegrationId, callbacks, closeMenu }: ViewIntegrationProps) {
	const [organizationIntegrationConfig, setOrganizationIntegrationConfig] = useState<TOrganizationIntegrationConfig>(INITIAL_CONFIG[integrationType]);
	const [apelido, setApelido] = useState("");

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

	function updateOrganizationErpFlexConfig(changes: Partial<Extract<TOrganizationIntegrationConfig, { tipo: "ERP-FLEX" }>>) {
		setOrganizationIntegrationConfig((prev) => {
			if (prev.tipo === "ERP-FLEX") {
				return {
					...prev,
					...changes,
				};
			}
			return prev;
		});
	}

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
		if (integration.tipo === "ERP-FLEX") {
			if (!integration.username.trim() || !integration.password.trim() || !integration.database.trim()) {
				throw new Error("O usuário, a senha e o nome da base são obrigatórios para a integração ERPFlex.");
			}
		}
		if (requireApelido && !apelido.trim()) {
			throw new Error("Informe um apelido para diferenciar esta conexão das demais do mesmo tipo.");
		}

		return await createIntegration({
			apelido: apelido.trim() || null,
			configuracao: integration,
			reconnectIntegrationId: reconnectIntegrationId ?? null,
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
	const menuSuccessContent = isSuccess ? (
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
	) : null;

	return (
		<ResponsiveMenu.Root
			open
			onOpenChange={(open) => {
				if (!open) closeMenu();
			}}
		>
			<ResponsiveMenu.Content drawerClassName="max-h-[70dvh]">
				<ResponsiveMenu.Header>
					<ResponsiveMenu.Title>{`CONFIGURAR ${integrationType.toUpperCase()}`}</ResponsiveMenu.Title>
					<ResponsiveMenu.Description>
						Insira as credenciais para ativar a integração. Esses dados são obtidos diretamente no painel do sistema parceiro.
					</ResponsiveMenu.Description>
				</ResponsiveMenu.Header>
				<ResponsiveMenuAnimatedBody
					stateKey={menuSuccessContent ? "success" : "content"}
					className={menuSuccessContent ? "items-center justify-center p-6" : "overflow-x-hidden overflow-y-auto"}
				>
					{menuSuccessContent ? (
						menuSuccessContent
					) : (
						<>
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

							{organizationIntegrationConfig.tipo === "ERP-FLEX" ? (
								<ErpFlexIntegrationDetails
									organizationIntegrationConfig={organizationIntegrationConfig}
									updateOrganizationIntegrationConfig={updateOrganizationErpFlexConfig}
								/>
							) : null}

							<ResponsiveMenuSection title="IDENTIFICAÇÃO" icon={<Tag className="w-4 h-4" />}>
								<TextInput
									label={requireApelido ? "APELIDO (OBRIGATÓRIO)" : "APELIDO (OPCIONAL)"}
									value={apelido}
									placeholder="Ex.: Loja Centro, Conta principal..."
									handleChange={setApelido}
								/>
							</ResponsiveMenuSection>
						</>
					)}
				</ResponsiveMenuAnimatedBody>
				{!menuSuccessContent ? (
					<ResponsiveMenu.Footer>
						<ResponsiveMenu.Close variant="outline">FECHAR</ResponsiveMenu.Close>
						<LoadingButton loading={isPending} onClick={() => configureIntegrationMutation(organizationIntegrationConfig)}>
							CONECTAR
						</LoadingButton>
					</ResponsiveMenu.Footer>
				) : null}
			</ResponsiveMenu.Content>
		</ResponsiveMenu.Root>
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

type ErpFlexIntegrationDetailsProps = {
	organizationIntegrationConfig: Extract<TOrganizationIntegrationConfig, { tipo: "ERP-FLEX" }>;
	updateOrganizationIntegrationConfig: (changes: Partial<Extract<TOrganizationIntegrationConfig, { tipo: "ERP-FLEX" }>>) => void;
};
function ErpFlexIntegrationDetails({ organizationIntegrationConfig, updateOrganizationIntegrationConfig }: ErpFlexIntegrationDetailsProps) {
	return (
		<ResponsiveMenuSection title="INTEGRAÇÃO ERPFLEX" icon={<Globe className="w-4 h-4" />}>
			<p className="text-xs text-muted-foreground">
				As credenciais de API do ERPFlex são criadas pelo time deles (api@erpflex.com.br) — use o usuário e a senha de API, não o login do sistema.
			</p>
			<TextInput
				label="USUÁRIO DA API"
				value={organizationIntegrationConfig.username}
				placeholder="Preencha aqui o usuário da API..."
				handleChange={(value) => updateOrganizationIntegrationConfig({ username: value })}
			/>
			<TextInput
				label="SENHA DA API"
				value={organizationIntegrationConfig.password}
				placeholder="Preencha aqui a senha da API..."
				handleChange={(value) => updateOrganizationIntegrationConfig({ password: value })}
			/>
			<TextInput
				label="NOME DA BASE"
				value={organizationIntegrationConfig.database}
				placeholder="Preencha aqui o nome da base no ERPFlex..."
				handleChange={(value) => updateOrganizationIntegrationConfig({ database: value })}
			/>
		</ResponsiveMenuSection>
	);
}
