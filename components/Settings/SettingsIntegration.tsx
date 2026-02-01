import TextInput from "@/components/Inputs/TextInput";
import ResponsiveMenuV2 from "@/components/Utils/ResponsiveMenuV2";
import { Button } from "@/components/ui/button";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getErrorMessage } from "@/lib/errors";
import { updateOrganization } from "@/lib/mutations/organizations";
import type { TOrganizationIntegrationConfig } from "@/schemas/organizations";
import { useOrganizationState } from "@/state-hooks/use-organization-state";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BadgeCheck, Calendar, Check, CheckCircle2, Info, Key, LinkIcon } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { formatDateAsLocale } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import CardapioWebLogo from "@/utils/images/integrations/cardapio-web.png";
import OnlineSoftwareLogo from "@/utils/images/integrations/online-software-logo.png";
import { Badge } from "../ui/badge";

const INTEGRATIONS = [
	{
		id: "ONLINE-SOFTWARE",
		name: "Online Software",
		logo: OnlineSoftwareLogo,
		description:
			"Líder regional no Triângulo Mineiro, este ERP é a escolha certa para materiais de construção, conveniência e vestuário. Sincronize vendas, produtos, clientes e parcerios com total eficiência.",
		buttonText: "PROSSEGUIR COM ONLINE SOFTWARE",
		brandColor: "#145c99",
		brandClassName: "bg-[#145c99] text-white hover:bg-[#145c99]/80",
	},
	{
		id: "CARDAPIO-WEB",
		name: "Cardápio Web",
		logo: CardapioWebLogo,
		description:
			"A solução completa para Food Service. Perfeito para restaurantes, sorveterias e delivery. Integre sua gestão de pedidos e cardápios para escalar sua operação gastronômica (com suporte a iFood).",
		buttonText: "PROSSEGUIR COM CARDÁPIO WEB",
		brandColor: "#a543fb",
		brandClassName: "bg-[#a543fb] text-white hover:bg-[#a543fb]/80",
	},
] as const;

type SettingsIntegrationProps = {
	user: TAuthUserSession["user"];
	membership: NonNullable<TAuthUserSession["membership"]>;
};

export default function SettingsIntegration({ user, membership }: SettingsIntegrationProps) {
	const { state, updateOrganization: updateOrgState, redefineState } = useOrganizationState();
	const permissions = membership.permissoes.empresa;
	const canEdit = permissions.editar;

	// Local state for credential fields
	const [token, setToken] = useState("");
	const [merchantId, setMerchantId] = useState("");
	const [apiKey, setApiKey] = useState("");

	// Menu State
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [selectedIntegrationId, setSelectedIntegrationId] = useState<"ONLINE-SOFTWARE" | "CARDAPIO-WEB" | null>(null);
	const [isSuccess, setIsSuccess] = useState(false);

	// Initialize state from membership
	useEffect(() => {
		if (membership.organizacao) {
			redefineState({
				...state,
				organization: {
					...state.organization,
					integracaoTipo: membership.organizacao.integracaoTipo,
					integracaoConfiguracao: membership.organizacao.integracaoConfiguracao,
					integracaoDataUltimaSincronizacao: membership.organizacao.integracaoDataUltimaSincronizacao,
				},
			});
		}
		// biome-ignore lint/correctness/useExhaustiveDependencies: Initialize state only once
	}, []);

	// Pre-fill credentials when opening menu for the *currently active* integration
	// OR reset if it's a new one.
	useEffect(() => {
		if (isMenuOpen && selectedIntegrationId) {
			setIsSuccess(false); // Reset success state on open
			const currentConfig = membership.organizacao.integracaoConfiguracao;
			const isCurrentIntegration = membership.organizacao.integracaoTipo === selectedIntegrationId;

			if (isCurrentIntegration && currentConfig) {
				if (selectedIntegrationId === "ONLINE-SOFTWARE" && currentConfig.tipo === "ONLINE-SOFTWARE") {
					setToken(currentConfig.token || "");
					setMerchantId("");
					setApiKey("");
				} else if (selectedIntegrationId === "CARDAPIO-WEB" && currentConfig.tipo === "CARDAPIO-WEB") {
					setMerchantId(currentConfig.merchantId || "");
					setApiKey(currentConfig.apiKey || "");
					setToken("");
				} else {
					// Fallback if types mismatch for some reason, though logic above prevents it mostly
					setToken("");
					setMerchantId("");
					setApiKey("");
				}
			} else {
				// Reset if it's a new integration selection
				setToken("");
				setMerchantId("");
				setApiKey("");
			}
		}
	}, [isMenuOpen, selectedIntegrationId, membership.organizacao]);

	const updateIntegrationMutation = useMutation({
		mutationFn: async () => {
			let integracaoConfiguracao: TOrganizationIntegrationConfig | null = null;

			if (selectedIntegrationId === "ONLINE-SOFTWARE") {
				if (!token.trim()) {
					throw new Error("O token é obrigatório para a integração Online Software.");
				}
				integracaoConfiguracao = {
					tipo: "ONLINE-SOFTWARE",
					token: token.trim(),
				};
			} else if (selectedIntegrationId === "CARDAPIO-WEB") {
				if (!merchantId.trim() || !apiKey.trim()) {
					throw new Error("O Merchant ID e API Key são obrigatórios para a integração Cardápio Web.");
				}
				integracaoConfiguracao = {
					tipo: "CARDAPIO-WEB",
					merchantId: merchantId.trim(),
					apiKey: apiKey.trim(),
				};
			}

			// We need to pass the selected type here, not the state one, because state one updates only on success/reload logic effectively in the old code,
			// but here we want to update to what is being configured.
			return await updateOrganization({
				organization: {
					integracaoTipo: selectedIntegrationId,
					integracaoConfiguracao: integracaoConfiguracao,
				},
			});
		},
		onSuccess: () => {
			toast.success("Integração configurada com sucesso!");
			setIsSuccess(true);
			setTimeout(() => {
				window.location.reload();
			}, 3000);
		},
		onError: (error) => {
			toast.error(getErrorMessage(error));
		},
	});

	// Disconnect Mutation
	const disconnectIntegrationMutation = useMutation({
		mutationFn: async () => {
			return await updateOrganization({
				organization: {
					integracaoTipo: null,
					integracaoConfiguracao: null,
					integracaoDataUltimaSincronizacao: null,
				},
			});
		},
		onSuccess: () => {
			toast.success("Integração desconectada com sucesso!");
			setTimeout(() => {
				window.location.reload();
			}, 2000);
		},
		onError: (error) => {
			toast.error(getErrorMessage(error));
		},
	});

	const handleDisconnect = () => {
		if (confirm("Tem certeza que deseja desconectar? Essa ação irá interromper a sincronização de dados.")) {
			disconnectIntegrationMutation.mutate();
		}
	};

	const handleIntegrationSelect = (integrationId: "ONLINE-SOFTWARE" | "CARDAPIO-WEB") => {
		if (!canEdit) return;
		setSelectedIntegrationId(integrationId);
		setIsMenuOpen(true);
	};

	const handleSave = () => {
		updateIntegrationMutation.mutate();
	};

	const handleCloseMenu = () => {
		if (!isSuccess) {
			setIsMenuOpen(false);
		}
	};

	const getIntegrationName = (id: string | null) => {
		return INTEGRATIONS.find((i) => i.id === id)?.name || "Integração";
	};

	const activeIntegrationId = membership.organizacao.integracaoTipo;
	const activeIntegration = INTEGRATIONS.find((i) => i.id === activeIntegrationId);
	const lastSyncDate = membership.organizacao.integracaoDataUltimaSincronizacao;

	return (
		<div className="flex w-full flex-col gap-3">
			{/* Header Section */}
			<div className="flex flex-col lg:flex-row items-center justify-between border-b pb-4">
				<div className="space-y-1">
					<h2 className="text-xl font-semibold tracking-tight">Configuração de Integração</h2>
					<p className="text-sm text-muted-foreground">Escolha e configure a integração ideal para o seu negócio.</p>
				</div>
			</div>

			{activeIntegration ? (
				<div className="flex w-full flex-col gap-2 py-2">
					<div className="w-full flex items-center justify-between gap-2 flex-col lg:flex-row">
						<Badge className="flex items-center gap-1 bg-green-200 text-green-800 pointer-events-none">
							<BadgeCheck className="w-4 h-4 min-w-4 min-h-4" />
							<h1 className="text-sm font-bold">Você está conectado ao {activeIntegration.name}</h1>
						</Badge>
						<Button
							variant="ghost"
							size="sm"
							className="w-fit hover:bg-destructive/10 hover:text-destructive"
							onClick={handleDisconnect}
							disabled={disconnectIntegrationMutation.isPending}
						>
							{disconnectIntegrationMutation.isPending ? "DESCONECTANDO..." : "DESCONECTAR"}
						</Button>
					</div>

					<div className="w-full flex flex-col gap-1.5">
						<p className="text-sm text-primary/80">DETALHES DA INTEGRAÇÃO:</p>
						<div className="w-full flex flex-col gap-3">
							<div className="flex items-start lg:items-center gap-x-2 gap-y-1 flex-col lg:flex-row">
								<div className="flex items-center gap-2">
									<Calendar className="w-4 h-4 min-w-4 min-h-4" />
									<p className="text-sm text-primary/80">Última sincronização:</p>
								</div>
								<p className="text-sm font-bold">{lastSyncDate ? formatDateAsLocale(lastSyncDate) : "Nenhuma sincronização recente"}</p>
							</div>

							<div className="flex items-start lg:items-center gap-x-2 gap-y-1 flex-col lg:flex-row">
								<div className="flex items-center gap-2">
									<Key className="w-4 h-4 min-w-4 min-h-4" />
									<p className="text-sm text-primary/80">Credenciais configuradas:</p>
								</div>
								<Badge className="text-xs text-primary/80 bg-primary/10 rounded-md px-2 py-1 pointer-events-none">Autenticado com Sucesso</Badge>
							</div>
						</div>
					</div>
				</div>
			) : (
				<div className="w-full flex items-center flex-wrap gap-x-6 gap-y-4">
					{INTEGRATIONS.map((integration) => {
						const isSelected = state.organization.integracaoTipo === integration.id;
						const brandColor = integration.brandColor;

						return (
							<button
								type="button"
								key={integration.id}
								className="w-[450px] bg-card border border-primary/20 flex flex-col gap-3 px-3 py-4 rounded-xl shadow-2xs"
								onClick={() => handleIntegrationSelect(integration.id)}
							>
								<div className="mb-6 flex items-start justify-between">
									<div className="relative h-12 w-32 grayscale transition-all group-hover:grayscale-0">
										<Image src={integration.logo} alt={integration.name} fill className="object-contain object-left" />
									</div>
								</div>
								<div className="w-full flex flex-col gap-1.5">
									<h3 className="w-full text-start font-semibold text-lg">{integration.name}</h3>
									<p className="text-sm text-muted-foreground leading-relaxed">{integration.description}</p>
									<Button
										variant="default"
										size="fit"
										className={cn("flex items-center gap-1.5 px-3 py-2 rounded-xl self-end font-bold", integration.brandClassName)}
										onClick={(e) => {
											e.stopPropagation();
											handleIntegrationSelect(integration.id);
										}}
									>
										<LinkIcon className="h-4 w-4" />
										CONECTAR
									</Button>
								</div>
							</button>
						);
					})}
				</div>
			)}

			{isMenuOpen ? (
				<ResponsiveMenuV2
					menuTitle={`CONFIGURAR ${getIntegrationName(selectedIntegrationId).toUpperCase()}`}
					menuDescription="Insira as credenciais para ativar a integração. Esses dados são obtidos diretamente no painel do sistema parceiro."
					menuActionButtonText="CONECTAR"
					menuCancelButtonText="CANCELAR"
					actionFunction={handleSave}
					closeMenu={handleCloseMenu}
					stateIsLoading={false}
					actionIsLoading={updateIntegrationMutation.isPending}
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
					{selectedIntegrationId === "ONLINE-SOFTWARE" && (
						<TextInput
							label="TOKEN DE ACESSO"
							value={token}
							placeholder="Cole seu token aqui"
							handleChange={setToken}
							width="100%"
							// type="password" // Keep visible or password usually depends on length, often tokens are visible or toggleable. User asked for native inputs.
						/>
					)}

					{selectedIntegrationId === "CARDAPIO-WEB" && (
						<div className="flex flex-col gap-4">
							<TextInput label="MERCHANT ID" value={merchantId} placeholder="ID do Estabelecimento" handleChange={setMerchantId} width="100%" />
							<TextInput label="API KEY" value={apiKey} placeholder="Chave de API" handleChange={setApiKey} width="100%" type="password" />
						</div>
					)}
				</ResponsiveMenuV2>
			) : null}
		</div>
	);
}
