import TextInput from "@/components/Inputs/TextInput";
import ResponsiveMenuV2 from "@/components/Utils/ResponsiveMenuV2";
import { Button } from "@/components/ui/button";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getErrorMessage } from "@/lib/errors";
import { updateOrganization } from "@/lib/mutations/organizations";
import type { TOrganizationIntegrationConfig } from "@/schemas/organizations";
import { useOrganizationState } from "@/state-hooks/use-organization-state";
import { useMutation } from "@tanstack/react-query";
import { Calendar, CheckCircle2, LinkIcon, Pencil, Settings2, Unlink } from "lucide-react";
import Image, { type StaticImageData } from "next/image";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import type { TOrganizationIntegrationTypeEnum } from "@/schemas/enums";
import { formatDateAsLocale } from "@/lib/formatting";
import { cn } from "@/lib/utils";
import CardapioWebLogo from "@/utils/images/integrations/cardapio-web.png";
import NuvemshopLogo from "@/utils/images/integrations/nuvemshop-logo.png";
import OnlineSoftwareLogo from "@/utils/images/integrations/online-software-logo.png";
import IfoodLogo from "@/utils/images/integrations/ifood-logo.png";
import BlingLogo from "@/utils/images/integrations/bling-logo.png";
import { Chip } from "../ui/chip";
import ViewIntegration from "../Modals/Integrations/ViewIntegration";
import ConfigureIntegration from "../Modals/Integrations/ConfigureIntegration";

type TIntegrationDefinition = {
	id: TOrganizationIntegrationTypeEnum;
	name: string;
	logo?: StaticImageData;
	description: string;
	buttonText: string;
	brandColor: string;
	brandClassName: string;
	authUrl?: string;
};

const INTEGRATIONS: TIntegrationDefinition[] = [
	{
		id: "ONLINE-SOFTWARE",
		name: "Online Software",
		logo: OnlineSoftwareLogo,
		description:
			"Líder regional no Triângulo Mineiro, este ERP é a escolha certa para materiais de construção, conveniência e vestuário. Sincronize vendas, produtos, clientes e parcerios com total eficiência.",
		buttonText: "CONECTAR COM ONLINE SOFTWARE",
		brandColor: "#145c99",
		brandClassName: "bg-[#145c99] text-white hover:bg-[#145c99]/80",
	},
	{
		id: "CARDAPIO-WEB",
		name: "Cardápio Web",
		logo: CardapioWebLogo,
		description:
			"A solução completa para Food Service. Perfeito para restaurantes, sorveterias e delivery. Integre sua gestão de pedidos e cardápios para escalar sua operação gastronômica (com suporte a iFood).",
		buttonText: "CONECTAR COM CARDÁPIO WEB",
		brandColor: "#a543fb",
		brandClassName: "bg-[#a543fb] text-white hover:bg-[#a543fb]/80",
	},
	{
		id: "NUVEM-SHOP",
		name: "Nuvem Shop",
		logo: NuvemshopLogo,
		description:
			"Conecte sua loja Nuvem Shop para sincronizar pedidos, clientes e produtos com o Recompra CRM através da autorização segura da plataforma.",
		buttonText: "CONECTAR COM NUVEM SHOP",
		brandColor: "#2d2e6f",
		brandClassName: "bg-[#2d2e6f] text-white hover:bg-[#2d2e6f]/80",
		authUrl: "/api/integrations/nuvemshop/auth",
	},
	{
		id: "IFOOD",
		name: "iFood",
		logo: IfoodLogo,
		description:
			"Conecte sua loja iFood para receber eventos e pedidos no Recompra CRM, alimentando vendas, clientes, campanhas e cashback automaticamente.",
		buttonText: "CONECTAR COM IFOOD",
		brandColor: "#EA1D2C",
		brandClassName: "bg-[#EA1D2C] text-white hover:bg-[#EA1D2C]/80",
	},
	{
		id: "BLING",
		name: "Bling",
		logo: BlingLogo,
		description: "Conecte sua conta Bling para sincronizar pedidos de venda, clientes e produtos com o Recompra CRM em modo somente leitura.",
		buttonText: "CONECTAR COM BLING",
		brandColor: "#34AD61",
		brandClassName: "bg-[#34AD61] text-white hover:bg-[#34AD61]/80",
		authUrl: "/api/integrations/bling/auth",
	},
];

type SettingsIntegrationProps = {
	user: TAuthUserSession["user"];
	membership: NonNullable<TAuthUserSession["membership"]>;
};

export default function SettingsIntegration({ membership }: SettingsIntegrationProps) {
	const { state, redefineState } = useOrganizationState();
	const permissions = membership.permissoes.empresa;
	const canEdit = permissions.editar;
	const [editingIntegrationMenuIsOpen, setEditingIntegrationMenuIsOpen] = useState(false);

	// Menu State
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [selectedIntegrationId, setSelectedIntegrationId] = useState<"ONLINE-SOFTWARE" | "CARDAPIO-WEB" | null>(null);
	const [ifoodMenuIsOpen, setIfoodMenuIsOpen] = useState(false);

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
		// oxlint-disable-next-line react/exhaustive-deps -- Initialize state only once
	}, []);

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

	const handleIntegrationSelect = (integrationId: TOrganizationIntegrationTypeEnum) => {
		if (!canEdit) return;
		const integration = INTEGRATIONS.find((item) => item.id === integrationId);
		if (integration?.authUrl) {
			window.location.href = integration.authUrl;
			return;
		}
		if (integrationId === "IFOOD") {
			setIfoodMenuIsOpen(true);
			return;
		}
		if (integrationId === "NUVEM-SHOP") return;
		if (integrationId === "BLING") return;
		setSelectedIntegrationId(integrationId);
		setIsMenuOpen(true);
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

			{activeIntegration && state.organization.integracaoConfiguracao ? (
				<ActiveIntegrationCard
					integration={state.organization.integracaoConfiguracao}
					integrationDetails={activeIntegration}
					integrationLastSyncDate={lastSyncDate}
					handleDisconnect={handleDisconnect}
					disconnectIsLoading={disconnectIntegrationMutation.isPending}
					handleEdit={() => setEditingIntegrationMenuIsOpen(true)}
				/>
			) : (
				<div className="w-full flex items-center flex-wrap gap-x-6 gap-y-4">
					{INTEGRATIONS.map((integration) => {
						const brandColor = integration.brandColor;

						return (
							<div
								key={integration.id}
								role="button"
								tabIndex={0}
								className="w-[450px] cursor-pointer bg-card border border-border flex flex-col gap-3 px-3 py-4 rounded-xl shadow-2xs"
								onClick={() => handleIntegrationSelect(integration.id)}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										handleIntegrationSelect(integration.id);
									}
								}}
							>
								<div className="mb-6 flex items-start justify-between">
									<div className="relative h-12 w-32">
										{integration.logo ? (
											<Image src={integration.logo} alt={integration.name} fill className="object-contain object-left" />
										) : (
											<div
												className="flex h-12 w-12 items-center justify-center rounded-lg text-lg font-bold text-white"
												style={{ backgroundColor: brandColor }}
											>
												{integration.name.slice(0, 2)}
											</div>
										)}
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
										{integration.buttonText}
									</Button>
								</div>
							</div>
						);
					})}
				</div>
			)}

			{isMenuOpen && selectedIntegrationId ? (
				<ConfigureIntegration integrationType={selectedIntegrationId} closeMenu={() => setIsMenuOpen(false)} />
			) : null}
			{ifoodMenuIsOpen ? <IfoodIntegrationMenu closeMenu={() => setIfoodMenuIsOpen(false)} /> : null}
			{editingIntegrationMenuIsOpen && state.organization.integracaoConfiguracao ? (
				<ViewIntegration
					initialOrganizationIntegrationConfig={state.organization.integracaoConfiguracao}
					closeMenu={() => setEditingIntegrationMenuIsOpen(false)}
				/>
			) : null}
		</div>
	);
}

type ActiveIntegrationCardProps = {
	integration: TOrganizationIntegrationConfig;
	integrationDetails: TIntegrationDefinition;
	integrationLastSyncDate: Date | null;
	handleDisconnect: () => void;
	handleEdit: () => void;
	disconnectIsLoading: boolean;
};
function ActiveIntegrationCard({
	integration,
	integrationDetails,
	integrationLastSyncDate,
	handleDisconnect,
	handleEdit,
	disconnectIsLoading,
}: ActiveIntegrationCardProps) {
	return (
		<div className="bg-card border-border flex w-full flex-col sm:flex-row gap-3 rounded-xl border px-3 py-4 shadow-2xs h-full">
			<div className="flex items-center justify-center">
				<div className="relative w-20 h-20 lg:h-20 lg:w-20 lg:min-h-20 lg:min-w-20 overflow-hidden rounded-lg">
					{integrationDetails.logo ? (
						<Image src={integrationDetails.logo} alt={integrationDetails.name} fill={true} objectFit="contain" />
					) : (
						<div className="bg-primary/50 text-foreground-foreground flex h-full w-full items-center justify-center">
							<Settings2 className="h-6 w-6" />
						</div>
					)}
				</div>
			</div>
			<div className="flex h-full grow flex-col gap-1.5">
				<div className="w-full flex items-center justify-between gap-2 flex-col lg:flex-row">
					<h1 className="text-sm font-bold">{integrationDetails.name}</h1>
					<div className="flex items-center gap-3">
						<Chip.Root variant="success" size="md">
							<Chip.Icon>
								<CheckCircle2 className="w-4 h-4 min-w-4 min-h-4" />
							</Chip.Icon>
							<Chip.Label>CONECTADO</Chip.Label>
						</Chip.Root>

						{integrationDetails.authUrl || integration.tipo === "IFOOD" ? null : (
							<Button variant="ghost" size="sm" onClick={handleEdit}>
								<Pencil className="w-4 h-4 min-w-4 min-h-4" />
							</Button>
						)}

						<Button variant="ghost-destructive" size="sm" onClick={handleDisconnect} disabled={disconnectIsLoading}>
							<Unlink className="w-4 h-4 min-w-4 min-h-4" />
						</Button>
					</div>
				</div>
				<div className="grow w-full flex flex-col gap-1.5">
					<p className="text-sm text-foreground/80">{integrationDetails.description}</p>
				</div>
				<div className="w-full flex items-center justify-end gap-2 flex-col lg:flex-row">
					<div className="flex items-center gap-1.5">
						<Calendar className="w-4 h-4 min-w-4 min-h-4" />
						<p className="text-sm tracking-tight">
							{integrationLastSyncDate ? `Última sincronização: ${formatDateAsLocale(integrationLastSyncDate)}` : "Nenhuma sincronização recente"}
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}

type TIfoodAuthorizationResponse = {
	userCode: string;
	verificationUrl?: string | null;
	verificationUrlComplete?: string | null;
	expiresIn?: number | null;
};

function IfoodIntegrationMenu({ closeMenu }: { closeMenu: () => void }) {
	const [authorization, setAuthorization] = useState<TIfoodAuthorizationResponse | null>(null);
	const [authorizationCode, setAuthorizationCode] = useState("");

	const createAuthorizationMutation = useMutation({
		mutationFn: async () => {
			const response = await fetch("/api/integrations/ifood/auth", {
				method: "POST",
			});
			const data = await response.json();
			if (!response.ok) throw new Error(data.error ?? "Não foi possível gerar o código de autorização do iFood.");
			return data as TIfoodAuthorizationResponse;
		},
		onSuccess: (data) => {
			setAuthorization(data);
			toast.success("Código de autorização do iFood gerado com sucesso.");
		},
		onError: (error) => {
			toast.error(getErrorMessage(error));
		},
	});

	const completeAuthorizationMutation = useMutation({
		mutationFn: async () => {
			const response = await fetch("/api/integrations/ifood/auth/complete", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ authorizationCode }),
			});
			const data = await response.json();
			if (!response.ok) throw new Error(data.error ?? "Não foi possível conectar o iFood.");
			return data;
		},
		onSuccess: () => {
			toast.success("Integração iFood conectada com sucesso.");
			window.location.reload();
		},
		onError: (error) => {
			toast.error(getErrorMessage(error));
		},
	});

	return (
		<ResponsiveMenuV2
			menuTitle="CONFIGURAR IFOOD"
			menuDescription="Gere o código, autorize o aplicativo no portal do iFood e cole o código de autorização para concluir."
			menuActionButtonText={authorization ? "FINALIZAR CONEXÃO" : "GERAR CÓDIGO"}
			menuCancelButtonText="FECHAR"
			closeMenu={closeMenu}
			actionFunction={() => {
				if (!authorization) return createAuthorizationMutation.mutate();
				return completeAuthorizationMutation.mutate();
			}}
			actionIsLoading={createAuthorizationMutation.isPending || completeAuthorizationMutation.isPending}
			stateIsLoading={false}
		>
			<div className="flex flex-col gap-4">
				{authorization ? (
					<div className="rounded-lg border bg-muted/30 p-4">
						<p className="text-xs font-semibold text-muted-foreground">CÓDIGO IFOOD</p>
						<p className="mt-1 text-2xl font-bold tracking-wide">{authorization.userCode}</p>
						{authorization.verificationUrlComplete || authorization.verificationUrl ? (
							<Button
								type="button"
								size="sm"
								className="mt-3"
								onClick={() => window.open(authorization.verificationUrlComplete ?? authorization.verificationUrl ?? "", "_blank")}
							>
								<LinkIcon className="h-4 w-4" />
								ABRIR PORTAL IFOOD
							</Button>
						) : null}
					</div>
				) : (
					<p className="text-sm text-muted-foreground">Clique em gerar código para iniciar a autorização distribuída do iFood.</p>
				)}

				{authorization ? (
					<TextInput
						label="CÓDIGO DE AUTORIZAÇÃO"
						value={authorizationCode}
						placeholder="Cole aqui o código recebido no portal do iFood..."
						handleChange={setAuthorizationCode}
					/>
				) : null}
			</div>
		</ResponsiveMenuV2>
	);
}
