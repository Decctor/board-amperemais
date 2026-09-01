import ResponsiveMenuV2 from "@/components/Utils/ResponsiveMenuV2";
import TextInput from "@/components/Inputs/TextInput";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import type { TAuthSessionIntegrationSummary, TAuthUserSession } from "@/lib/authentication/types";
import { NATIVE_CUSTOM_FIELD_LIST } from "@/lib/custom-fields/native-catalog";
import { getErrorMessage } from "@/lib/errors";
import { createCustomField } from "@/lib/mutations/custom-fields";
import { deleteIntegration } from "@/lib/mutations/integrations";
import { updateOrganization } from "@/lib/mutations/organizations";
import { useMutation } from "@tanstack/react-query";
import { useCashbackProgram } from "@/lib/queries/cashback-programs";
import { useCustomFields } from "@/lib/queries/custom-fields";
import { AlertTriangle, Calendar, Check, CheckCircle2, ChevronDown, ChevronUp, Copy, LinkIcon, Plus, RefreshCcw, Settings2, Unlink, X } from "lucide-react";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import type { TDataSourceIntegrationTipoEnum, TPoiRegistrationFlowEnum } from "@/schemas/enums";
import { CUSTOM_FIELD_TYPE_LABELS, DataSourceIntegrationTipoEnum, POI_REGISTRATION_FLOW_LABELS, PoiRegistrationFlowEnum } from "@/schemas/enums";
import type { TStoredPoiRegistrationConfig } from "@/schemas/organizations";
import { formatDateAsLocale } from "@/lib/formatting";
import { cn, copyToClipboard } from "@/lib/utils";
import CardapioWebLogo from "@/utils/images/integrations/cardapio-web.png";
import NuvemshopLogo from "@/utils/images/integrations/nuvemshop-logo.png";
import OnlineSoftwareLogo from "@/utils/images/integrations/online-software-logo.png";
import IfoodLogo from "@/utils/images/integrations/ifood-logo.png";
import BlingLogo from "@/utils/images/integrations/bling-logo.png";
import ErpFlexLogo from "@/utils/images/integrations/erpflex.png";
import { Chip } from "../ui/chip";
import ConfigureIntegration from "../Modals/Integrations/ConfigureIntegration";
// SANDBOX: remover import e voltar IfoodIntegrationMenu ao deletar fluxo sandbox
import { IfoodSandboxIntegrationMenu } from "./IfoodSandboxIntegrationMenu";

type TIntegrationDefinition = {
	id: TDataSourceIntegrationTipoEnum;
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
	{
		id: "ERP-FLEX",
		name: "ERPFlex",
		logo: ErpFlexLogo,
		description:
			"Conecte sua conta ERPFlex para importar faturamentos, clientes e produtos com as credenciais de API fornecidas pelo time do ERPFlex.",
		buttonText: "CONECTAR COM ERPFLEX",
		brandColor: "#1B5FAA",
		brandClassName: "bg-[#1B5FAA] text-white hover:bg-[#1B5FAA]/80",
	},
];

function isDataSourceSummary(integration: TAuthSessionIntegrationSummary) {
	return DataSourceIntegrationTipoEnum.options.includes(integration.tipo as TDataSourceIntegrationTipoEnum);
}

type SettingsIntegrationProps = {
	user: TAuthUserSession["user"];
	membership: NonNullable<TAuthUserSession["membership"]>;
};

export default function SettingsIntegration({ membership }: SettingsIntegrationProps) {
	const permissions = membership.permissoes.empresa;
	const canEdit = permissions.editar;

	// Menu State
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [selectedIntegrationId, setSelectedIntegrationId] = useState<"ONLINE-SOFTWARE" | "CARDAPIO-WEB" | "ERP-FLEX" | null>(null);
	const [ifoodMenuIsOpen, setIfoodMenuIsOpen] = useState(false);
	// Reconexão explícita (D9): a linha desativada a reativar com as credenciais novas — preserva
	// o `integrationId` e a proveniência das vendas históricas.
	const [reconnectIntegrationId, setReconnectIntegrationId] = useState<string | null>(null);

	const activeConnections = membership.organizacao.integracoes.filter((integration) => integration.ativo && isDataSourceSummary(integration));
	const inactiveConnections = membership.organizacao.integracoes.filter((integration) => !integration.ativo && isDataSourceSummary(integration));
	const poiSalesRegistrationEnabled = membership.organizacao.poiConfiguracao?.vendas.registroAtivo ?? activeConnections.length === 0;
	// Espelho somente-leitura da permissão de resgate pelo POI: ela pertence ao programa de cashback
	// (a atualização exige o payload inteiro do programa + recompensas), então aqui só informamos e
	// apontamos para o lugar certo de editar.
	const { data: cashbackProgram } = useCashbackProgram();
	const poiRedemptionEnabled = cashbackProgram?.resgatePermitirViaPontoIntegracao ?? null;

	// Disconnect Mutation — soft delete por conexão (D9). A linha permanece como identidade
	// histórica da conta e proveniência das vendas.
	const disconnectIntegrationMutation = useMutation({
		mutationFn: async (integrationId: string) => deleteIntegration({ id: integrationId }),
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

	// `poiConfiguracao` é gravada como jsonb inteiro (a rota não faz merge por chave), então
	// escrever `vendas` obriga a reenviar o `cadastro` atual — e vice-versa.
	const poiRegistrationConfig = membership.organizacao.poiConfiguracao?.cadastro;

	const enablePoiSalesRegistrationMutation = useMutation({
		mutationFn: async (registroAtivo: boolean) =>
			updateOrganization({ organization: { poiConfiguracao: { vendas: { registroAtivo }, cadastro: poiRegistrationConfig } } }),
		onSuccess: () => {
			toast.success("Configuração do Ponto de Interação atualizada com sucesso!");
			setTimeout(() => {
				window.location.reload();
			}, 1500);
		},
		onError: (error) => {
			toast.error(getErrorMessage(error));
		},
	});

	const handleDisconnect = (integration: TAuthSessionIntegrationSummary) => {
		const isLastActiveDataSource = activeConnections.length === 1;
		// R12: desconectar a última fonte NÃO religa o registro de vendas do POI automaticamente
		// (D8) — o operador precisa saber e decidir.
		const warning = isLastActiveDataSource
			? "Tem certeza que deseja desconectar? Essa ação irá interromper a sincronização de dados.\n\nAtenção: esta é a última fonte de dados ativa e o registro de vendas pelo Ponto de Interação NÃO será reativado automaticamente — ative-o no bloco \"Ponto de Interação\" abaixo, se desejar."
			: "Tem certeza que deseja desconectar? Essa ação irá interromper a sincronização de dados desta conexão.";
		if (confirm(warning)) {
			disconnectIntegrationMutation.mutate(integration.id);
		}
	};

	const handleIntegrationSelect = (integrationId: TDataSourceIntegrationTipoEnum) => {
		if (!canEdit) return;
		const integration = INTEGRATIONS.find((item) => item.id === integrationId);
		if (integration?.authUrl) {
			window.location.href = integration.authUrl;
			return;
		}
		if (integrationId === "IFOOD") {
			setReconnectIntegrationId(null);
			setIfoodMenuIsOpen(true);
			return;
		}
		if (integrationId === "NUVEM-SHOP") return;
		if (integrationId === "BLING") return;
		setReconnectIntegrationId(null);
		setSelectedIntegrationId(integrationId);
		setIsMenuOpen(true);
	};

	// Reconectar aponta EXPLICITAMENTE para a linha desativada (D9) — autorizar de novo pela
	// entrada genérica criaria outra linha e as vendas históricas ficariam presas à antiga
	// (colisão fail-closed de idExterno). Nuvemshop/Cardápio Web também casam pela identidade
	// externa (storeId/merchantId); Bling e iFood dependem do alvo explícito.
	const handleReconnect = (connection: TAuthSessionIntegrationSummary) => {
		if (!canEdit) return;
		if (connection.tipo === "BLING") {
			window.location.href = `/api/integrations/bling/auth?reconnectIntegrationId=${connection.id}`;
			return;
		}
		if (connection.tipo === "NUVEM-SHOP") {
			window.location.href = "/api/integrations/nuvemshop/auth";
			return;
		}
		if (connection.tipo === "IFOOD") {
			setReconnectIntegrationId(connection.id);
			setIfoodMenuIsOpen(true);
			return;
		}
		if (connection.tipo === "ONLINE-SOFTWARE" || connection.tipo === "CARDAPIO-WEB" || connection.tipo === "ERP-FLEX") {
			setReconnectIntegrationId(connection.id);
			setSelectedIntegrationId(connection.tipo);
			setIsMenuOpen(true);
		}
	};

	const selectedTypeHasActiveConnection = selectedIntegrationId
		? activeConnections.some((integration) => integration.tipo === selectedIntegrationId)
		: false;

	return (
		<div className="flex w-full flex-col gap-3">
			{/* Header Section */}
			<div className="flex flex-col lg:flex-row items-center justify-between border-b pb-4">
				<div className="space-y-1">
					<h2 className="text-xl font-semibold tracking-tight">Configuração de Integração</h2>
					<p className="text-sm text-muted-foreground">
						Conecte uma ou mais fontes de dados — inclusive mais de uma conta do mesmo provedor.
					</p>
				</div>
			</div>

			{activeConnections.length > 0 ? (
				<div className="flex w-full flex-col gap-3">
					{activeConnections.map((connection) => {
						const integrationDetails = INTEGRATIONS.find((item) => item.id === connection.tipo);
						if (!integrationDetails) return null;
						return (
							<ActiveIntegrationCard
								key={connection.id}
								connection={connection}
								integrationDetails={integrationDetails}
								handleDisconnect={() => handleDisconnect(connection)}
								disconnectIsLoading={disconnectIntegrationMutation.isPending}
							/>
						);
					})}
				</div>
			) : null}

			{activeConnections.length === 0 && !poiSalesRegistrationEnabled ? (
				<div className="flex w-full items-center gap-2 rounded-xl border border-amber-500/50 bg-amber-500/10 px-3 py-2">
					<AlertTriangle className="h-4 w-4 min-w-4 text-amber-600" />
					<p className="text-sm text-amber-700 dark:text-amber-400">
						Nenhum canal de vendas ativo: não há fonte de dados conectada e o registro de vendas pelo Ponto de Interação está desativado.
					</p>
				</div>
			) : null}

			<div className="w-full flex items-center flex-wrap gap-x-6 gap-y-4">
				{INTEGRATIONS.map((integration) => {
					const brandColor = integration.brandColor;
					const activeCount = activeConnections.filter((connection) => connection.tipo === integration.id).length;

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
								{activeCount > 0 ? (
									<Chip.Root variant="success" size="sm">
										<Chip.Label>{activeCount > 1 ? `${activeCount} CONEXÕES ATIVAS` : "1 CONEXÃO ATIVA"}</Chip.Label>
									</Chip.Root>
								) : null}
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
									{activeCount > 0 ? "CONECTAR OUTRA CONTA" : integration.buttonText}
								</Button>
							</div>
						</div>
					);
				})}
			</div>

			{inactiveConnections.length > 0 ? (
				<div className="flex w-full flex-col gap-2">
					<h3 className="text-sm font-semibold text-muted-foreground">Conexões desativadas</h3>
					{inactiveConnections.map((connection) => {
						const integrationDetails = INTEGRATIONS.find((item) => item.id === connection.tipo);
						if (!integrationDetails) return null;
						const connectionLabel = connection.apelido ?? (connection.refExterno ? `Conta ${connection.refExterno}` : null);
						return (
							<div
								key={connection.id}
								className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 px-3 py-2"
							>
								<div className="flex items-center gap-2">
									<span className="text-sm font-semibold">{integrationDetails.name}</span>
									{connectionLabel ? <span className="text-sm text-muted-foreground">— {connectionLabel}</span> : null}
								</div>
								<Button variant="outline" size="sm" disabled={!canEdit} onClick={() => handleReconnect(connection)}>
									<RefreshCcw className="h-4 w-4 min-h-4 min-w-4" />
									RECONECTAR
								</Button>
							</div>
						);
					})}
					<p className="text-xs text-muted-foreground">
						Reconectar reativa a mesma conexão — as vendas já importadas continuam vinculadas a ela. Conectar pela lista acima cria uma conexão
						nova.
					</p>
				</div>
			) : null}

			{/* Ponto de Interação — registro de vendas explícito (D8): destrava o caso "fonte de dados
			ativa + coleta local de balcão via POI". */}
			<div className="flex w-full flex-col gap-2 rounded-xl border border-border bg-card px-3 py-4 shadow-2xs">
				<div className="flex items-center justify-between gap-3">
					<div className="space-y-1">
						<h3 className="font-semibold">Ponto de Interação — registro de vendas</h3>
						<p className="text-sm text-muted-foreground">
							Quando ativo, transações no Ponto de Interação criam vendas internas (com cashback, campanhas e métricas). Pode ficar ativo mesmo
							com integrações conectadas — ideal para registrar vendas de balcão.
						</p>
					</div>
					<Switch
						checked={poiSalesRegistrationEnabled}
						disabled={!canEdit || enablePoiSalesRegistrationMutation.isPending}
						onCheckedChange={(checked) => enablePoiSalesRegistrationMutation.mutate(checked)}
					/>
				</div>

				{poiRedemptionEnabled !== null ? (
					<div className="flex flex-col gap-2 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
						<div className="flex flex-col gap-1">
							<div className="flex items-center gap-2">
								<span className="text-sm font-semibold">Resgates pelo Ponto de Interação</span>
								<Chip.Root variant={poiRedemptionEnabled ? "success" : "destructive"} size="sm">
									<Chip.Label>{poiRedemptionEnabled ? "PERMITIDOS" : "BLOQUEADOS"}</Chip.Label>
								</Chip.Root>
							</div>
							<p className="text-sm text-muted-foreground">
								Controla se o cliente pode usar o saldo como desconto ou trocar por recompensas direto no totem/celular. A configuração vive no
								programa de cashback.
							</p>
						</div>
						<Button variant="outline" size="sm" asChild>
							<Link href="/dashboard/growth/cashback">
								<Settings2 className="h-4 w-4 min-h-4 min-w-4" />
								AJUSTAR NO PROGRAMA
							</Link>
						</Button>
					</div>
				) : null}

				<PoiRegistrationSettings
					storedConfig={poiRegistrationConfig}
					salesRegistrationEnabled={poiSalesRegistrationEnabled}
					canEdit={canEdit}
				/>
			</div>

			{isMenuOpen && selectedIntegrationId ? (
				<ConfigureIntegration
					integrationType={selectedIntegrationId}
					requireApelido={!reconnectIntegrationId && selectedTypeHasActiveConnection}
					reconnectIntegrationId={reconnectIntegrationId}
					closeMenu={() => {
						setIsMenuOpen(false);
						setReconnectIntegrationId(null);
					}}
				/>
			) : null}
			{/* SANDBOX: trocar de volta para IfoodIntegrationMenu (passando reconnectIntegrationId) ao
			remover o fluxo sandbox. O sandbox reativa a mesma linha por auto-match de merchants. */}
			{ifoodMenuIsOpen ? (
				<IfoodSandboxIntegrationMenu
					closeMenu={() => {
						setIfoodMenuIsOpen(false);
						setReconnectIntegrationId(null);
					}}
				/>
			) : null}
		</div>
	);
}

type TPoiRegistrationSurfaceKey = keyof TStoredPoiRegistrationConfig;

const POI_REGISTRATION_SURFACES: { key: TPoiRegistrationSurfaceKey; label: string; description: string }[] = [
	{ key: "mobile", label: "CELULAR", description: "Cliente lendo o QR Code no próprio aparelho." },
	{ key: "kiosk", label: "TOTEM", description: "Tela fixa no balcão, com o cliente de pé." },
];

/**
 * Configuração do cadastro do Ponto de Interação, por superfície.
 *
 * Edita um rascunho local e grava tudo de uma vez: reordenar campos é uma sequência de pequenos
 * ajustes, e salvar a cada clique transformaria um arraste mental em dez requisições. O `vendas`
 * atual entra no payload porque `poiConfiguracao` é gravada como jsonb inteiro.
 */
type PoiRegistrationSettingsProps = {
	storedConfig: TStoredPoiRegistrationConfig | undefined;
	salesRegistrationEnabled: boolean;
	canEdit: boolean;
};
function PoiRegistrationSettings({ storedConfig, salesRegistrationEnabled, canEdit }: PoiRegistrationSettingsProps) {
	// Sem `ativoOnly`: os inativos não podem ser adicionados, mas precisam ser conhecidos — um
	// campo nativo desativado ainda ocupa a chave, e oferecer "ativar" de novo daria erro.
	const { data: customFieldsResult, isLoading: customFieldsAreLoading, refetch: refetchCustomFields } = useCustomFields({ entidade: "CLIENTE" });
	const organizationCustomFields = customFieldsResult?.customFields ?? [];
	const activeCustomFields = organizationCustomFields.filter((customField) => customField.ativo);
	const takenNativeKeys = organizationCustomFields.map((customField) => customField.chaveNativa).filter(Boolean);
	const missingNativeFields = NATIVE_CUSTOM_FIELD_LIST.filter((nativeField) => !takenNativeKeys.includes(nativeField.chave));

	const [config, setConfig] = useState<TStoredPoiRegistrationConfig>(() => ({
		mobile: storedConfig?.mobile ?? { fluxo: "RAPIDO", campos: [] },
		kiosk: storedConfig?.kiosk ?? { fluxo: "RAPIDO", campos: [] },
	}));

	const setSurfaceFlow = (surface: TPoiRegistrationSurfaceKey, fluxo: TPoiRegistrationFlowEnum) => {
		setConfig((previous) => ({ ...previous, [surface]: { ...previous[surface], fluxo } }));
	};

	const addFieldToSurface = (surface: TPoiRegistrationSurfaceKey, campoId: string) => {
		setConfig((previous) => {
			const surfaceConfig = previous[surface];
			if (surfaceConfig.campos.some((campo) => campo.campoId === campoId)) return previous;
			return { ...previous, [surface]: { ...surfaceConfig, campos: [...surfaceConfig.campos, { campoId, obrigatorio: false }] } };
		});
	};

	const removeFieldFromSurface = (surface: TPoiRegistrationSurfaceKey, campoId: string) => {
		setConfig((previous) => ({
			...previous,
			[surface]: { ...previous[surface], campos: previous[surface].campos.filter((campo) => campo.campoId !== campoId) },
		}));
	};

	const setFieldRequired = (surface: TPoiRegistrationSurfaceKey, campoId: string, obrigatorio: boolean) => {
		setConfig((previous) => ({
			...previous,
			[surface]: {
				...previous[surface],
				campos: previous[surface].campos.map((campo) => (campo.campoId === campoId ? { ...campo, obrigatorio } : campo)),
			},
		}));
	};

	// A ordem do array É a ordem dos passos — mover é trocar de lugar com o vizinho.
	const moveFieldInSurface = (surface: TPoiRegistrationSurfaceKey, index: number, direction: -1 | 1) => {
		setConfig((previous) => {
			const campos = [...previous[surface].campos];
			const targetIndex = index + direction;
			const movedField = campos[index];
			const displacedField = campos[targetIndex];
			if (!movedField || !displacedField) return previous;
			campos[index] = displacedField;
			campos[targetIndex] = movedField;
			return { ...previous, [surface]: { ...previous[surface], campos } };
		});
	};

	const saveRegistrationConfigMutation = useMutation({
		mutationFn: async () =>
			updateOrganization({ organization: { poiConfiguracao: { vendas: { registroAtivo: salesRegistrationEnabled }, cadastro: config } } }),
		onSuccess: () => {
			toast.success("Cadastro do Ponto de Interação atualizado com sucesso!");
			setTimeout(() => {
				window.location.reload();
			}, 1500);
		},
		onError: (error) => {
			toast.error(getErrorMessage(error));
		},
	});

	// Ativar um campo nativo cria a definição para a organização inteira (ela passa a existir no
	// CRM) e, por conveniência, já o coloca na superfície de onde o botão foi clicado.
	const enableNativeFieldMutation = useMutation({
		mutationFn: async ({ chave }: { chave: string; surface: TPoiRegistrationSurfaceKey }) =>
			createCustomField({
				customField: { entidade: "CLIENTE", chaveNativa: chave, titulo: null, tipo: null, descricao: null, opcoes: null, ativo: true },
			}),
		onSuccess: async (data, variables) => {
			toast.success(data.message);
			addFieldToSurface(variables.surface, data.data.insertedId);
			await refetchCustomFields();
		},
		onError: (error) => {
			toast.error(getErrorMessage(error));
		},
	});

	return (
		<div className="flex flex-col gap-3 border-t border-border pt-3">
			<div className="flex flex-col gap-1">
				<h4 className="text-sm font-semibold">CADASTRO NO PONTO DE INTERAÇÃO</h4>
				<p className="text-sm text-muted-foreground">
					No cadastro rápido o cliente informa apenas nome e telefone. No completo, o assistente pergunta também os campos escolhidos abaixo — na ordem
					em que eles aparecem aqui.
				</p>
			</div>

			{POI_REGISTRATION_SURFACES.map((surface) => {
				const surfaceConfig = config[surface.key];
				const availableCustomFields = activeCustomFields.filter(
					(customField) => !surfaceConfig.campos.some((campo) => campo.campoId === customField.id),
				);

				return (
					<div key={surface.key} className="flex w-full flex-col gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2">
						<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
							<div className="flex flex-col">
								<span className="text-sm font-semibold">{surface.label}</span>
								<span className="text-xs text-muted-foreground">{surface.description}</span>
							</div>
							<div className="flex items-center gap-1.5">
								{PoiRegistrationFlowEnum.options.map((fluxo) => (
									<Button
										key={fluxo}
										size="sm"
										variant={surfaceConfig.fluxo === fluxo ? "default" : "outline"}
										disabled={!canEdit}
										onClick={() => setSurfaceFlow(surface.key, fluxo)}
									>
										{POI_REGISTRATION_FLOW_LABELS[fluxo].toUpperCase()}
									</Button>
								))}
							</div>
						</div>

						{surfaceConfig.fluxo !== "COMPLETO" ? null : customFieldsAreLoading ? (
							<p className="text-xs text-muted-foreground italic">Carregando campos...</p>
						) : (
							<div className="flex w-full flex-col gap-2 border-t border-border pt-2">
								{surfaceConfig.campos.length === 0 ? (
									<p className="text-xs text-muted-foreground italic">
										Nenhum campo no cadastro desta superfície — o cliente vai ver o cadastro rápido.
									</p>
								) : (
									surfaceConfig.campos.map((campo, index) => {
										const definition = activeCustomFields.find((customField) => customField.id === campo.campoId);
										return (
											<div key={campo.campoId} className="flex w-full items-center gap-2 rounded-md border border-border bg-card px-2 py-1.5">
												<div className="flex flex-col">
													<Button
														variant="ghost"
														size="fit"
														className="p-0.5"
														disabled={!canEdit || index === 0}
														onClick={() => moveFieldInSurface(surface.key, index, -1)}
													>
														<ChevronUp className="h-3.5 w-3.5 min-h-3.5 min-w-3.5" />
													</Button>
													<Button
														variant="ghost"
														size="fit"
														className="p-0.5"
														disabled={!canEdit || index === surfaceConfig.campos.length - 1}
														onClick={() => moveFieldInSurface(surface.key, index, 1)}
													>
														<ChevronDown className="h-3.5 w-3.5 min-h-3.5 min-w-3.5" />
													</Button>
												</div>
												<div className="flex grow flex-col">
													<span className="text-sm font-medium">
														{index + 1}. {definition?.titulo ?? "Campo indisponível"}
													</span>
													<span className="text-xs text-muted-foreground">
														{definition
															? CUSTOM_FIELD_TYPE_LABELS[definition.tipo]
															: "O campo foi desativado — remova-o para limpar o cadastro."}
													</span>
												</div>
												<label className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-muted-foreground">
													<Checkbox
														checked={campo.obrigatorio}
														disabled={!canEdit}
														onCheckedChange={(checked) => setFieldRequired(surface.key, campo.campoId, checked === true)}
													/>
													OBRIGATÓRIO
												</label>
												<Button
													variant="ghost-destructive"
													size="fit"
													className="p-1"
													disabled={!canEdit}
													onClick={() => removeFieldFromSurface(surface.key, campo.campoId)}
												>
													<X className="h-3.5 w-3.5 min-h-3.5 min-w-3.5" />
												</Button>
											</div>
										);
									})
								)}

								{availableCustomFields.length > 0 ? (
									<div className="flex w-full flex-wrap items-center gap-1.5">
										<span className="text-xs font-medium text-muted-foreground">ADICIONAR:</span>
										{availableCustomFields.map((customField) => (
											<Button
												key={customField.id}
												variant="outline"
												size="fit"
												className="gap-1 px-2 py-1 text-xs"
												disabled={!canEdit}
												onClick={() => addFieldToSurface(surface.key, customField.id)}
											>
												<Plus className="h-3 w-3 min-h-3 min-w-3" />
												{customField.titulo.toUpperCase()}
											</Button>
										))}
									</div>
								) : null}

								{missingNativeFields.length > 0 ? (
									<div className="flex w-full flex-wrap items-center gap-1.5">
										<span className="text-xs font-medium text-muted-foreground">ATIVAR CAMPO PRONTO:</span>
										{missingNativeFields.map((nativeField) => (
											<Button
												key={nativeField.chave}
												variant="outline"
												size="fit"
												className="gap-1 px-2 py-1 text-xs"
												disabled={!canEdit || enableNativeFieldMutation.isPending}
												onClick={() => enableNativeFieldMutation.mutate({ chave: nativeField.chave, surface: surface.key })}
											>
												<Plus className="h-3 w-3 min-h-3 min-w-3" />
												{nativeField.titulo.toUpperCase()}
											</Button>
										))}
									</div>
								) : null}
							</div>
						)}
					</div>
				);
			})}

			<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<p className="text-xs text-muted-foreground">
					Os campos prontos já são entendidos pela plataforma (segmentação e aniversariantes saem de graça). Campos próprios da organização, se
					existirem, aparecem na lista acima.
				</p>
				<Button
					size="sm"
					disabled={!canEdit || saveRegistrationConfigMutation.isPending}
					onClick={() => saveRegistrationConfigMutation.mutate()}
				>
					SALVAR CADASTRO
				</Button>
			</div>
		</div>
	);
}

type ActiveIntegrationCardProps = {
	connection: TAuthSessionIntegrationSummary;
	integrationDetails: TIntegrationDefinition;
	handleDisconnect: () => void;
	disconnectIsLoading: boolean;
};
function ActiveIntegrationCard({ connection, integrationDetails, handleDisconnect, disconnectIsLoading }: ActiveIntegrationCardProps) {
	const connectionLabel = connection.apelido ?? (connection.refExterno ? `Conta ${connection.refExterno}` : null);
	return (
		<div className="bg-card border-border flex w-full flex-col sm:flex-row gap-3 rounded-xl border px-3 py-4 shadow-2xs h-full">
			<div className="flex items-center justify-center">
				<div className="relative w-20 h-20 lg:h-20 lg:w-20 lg:min-h-20 lg:min-w-20 overflow-hidden rounded-lg">
					{integrationDetails.logo ? (
						<Image src={integrationDetails.logo} alt={integrationDetails.name} fill={true} objectFit="contain" />
					) : (
						<div
							className="flex h-full w-full items-center justify-center rounded-lg text-lg font-bold text-white"
							style={{ backgroundColor: integrationDetails.brandColor }}
						>
							{integrationDetails.name.slice(0, 2)}
						</div>
					)}
				</div>
			</div>
			<div className="flex h-full grow flex-col gap-1.5">
				<div className="w-full flex items-center justify-between gap-2 flex-col lg:flex-row">
					<div className="flex items-center gap-2">
						<h1 className="text-sm font-bold">{integrationDetails.name}</h1>
						{connectionLabel ? <span className="text-sm text-muted-foreground">— {connectionLabel}</span> : null}
					</div>
					<div className="flex items-center gap-3">
						{connection.status === "CONECTADO" ? (
							<Chip.Root variant="success" size="md">
								<Chip.Icon>
									<CheckCircle2 className="w-4 h-4 min-w-4 min-h-4" />
								</Chip.Icon>
								<Chip.Label>CONECTADO</Chip.Label>
							</Chip.Root>
						) : (
							<Chip.Root variant="destructive" size="md">
								<Chip.Icon>
									<AlertTriangle className="w-4 h-4 min-w-4 min-h-4" />
								</Chip.Icon>
								<Chip.Label>{connection.status}</Chip.Label>
							</Chip.Root>
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
							{connection.dataUltimaSincronizacao
								? `Última sincronização: ${formatDateAsLocale(connection.dataUltimaSincronizacao)}`
								: "Nenhuma sincronização recente"}
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

function IfoodIntegrationMenu({ reconnectIntegrationId, closeMenu }: { reconnectIntegrationId?: string | null; closeMenu: () => void }) {
	const [authorization, setAuthorization] = useState<TIfoodAuthorizationResponse | null>(null);
	const [authorizationCode, setAuthorizationCode] = useState("");
	const [linkCopied, setLinkCopied] = useState(false);

	const verificationLink = authorization?.verificationUrlComplete ?? authorization?.verificationUrl ?? null;

	async function handleCopyVerificationLink() {
		if (!verificationLink) return;
		await copyToClipboard(verificationLink);
		setLinkCopied(true);
		setTimeout(() => setLinkCopied(false), 2000);
	}

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
				body: JSON.stringify({ authorizationCode, reconnectIntegrationId: reconnectIntegrationId ?? null }),
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
						{verificationLink ? (
							<div className="mt-3 flex flex-col gap-2">
								<p className="break-all text-xs text-muted-foreground">{verificationLink}</p>
								<div className="flex flex-col gap-2 lg:flex-row lg:items-center">
									<Button type="button" size="sm" onClick={() => window.open(verificationLink, "_blank")}>
										<LinkIcon className="h-4 w-4" />
										ABRIR PORTAL IFOOD
									</Button>
									<Button type="button" size="sm" variant="secondary" onClick={handleCopyVerificationLink}>
										{linkCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
										{linkCopied ? "LINK COPIADO" : "COPIAR LINK"}
									</Button>
								</div>
							</div>
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
