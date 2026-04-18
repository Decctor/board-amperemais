"use client";
import { TAuthUserSession } from "@/lib/authentication/types";
import { parseAsStringEnum, useQueryState } from "nuqs";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
	BadgeCheck,
	BookText,
	Calendar,
	CircleCheck,
	CircleX,
	FileText,
	Flag,
	Hash,
	MapPin,
	PencilIcon,
	Receipt,
	RefreshCcw,
	Save,
	Settings,
	User,
} from "lucide-react";
import { useFiscalOperationProfiles, useFiscalSettings } from "@/lib/queries/fiscal";
import { syncFiscalCompany, updateFiscalSettings } from "@/lib/mutations/fiscal";
import { Plus } from "lucide-react";
import { TUseInternalFiscalSettingsState, useInternalFiscalSettingsState } from "@/state-hooks/use-internal-fiscal-settings-state";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import { Button } from "@/components/ui/button";
import SectionWrapper from "@/components/ui/section-wrapper";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { StatBadge } from "@/components/ui/stat-badge";
import { TooltipProvider } from "@/components/ui/tooltip";
import TextInput from "@/components/Inputs/TextInput";
import UnauthorizedPage from "@/components/Utils/UnauthorizedPage";
import { cn, getCEPInfo } from "@/lib/utils";
import { formatDateAsLocale, formatToCEP, formatToPhone } from "@/lib/formatting";
import SelectInput from "@/components/Inputs/SelectInput";
import { BrazilianCitiesOptionsFromUF, BrazilianStatesOptions } from "@/utils/states-cities";
import { TGetFiscalOperationProfilesOutputDefault } from "@/app/api/fiscal/operation-profiles/route";
import type { TFiscalDocumentTypeEnum, TFiscalOperationConsumerPresenceEnum, TFiscalOperationFinalityEnum } from "@/schemas/enums";
import NewFiscalOperationProfile from "@/components/Modals/FiscalOperationProfile/NewFiscalOperationProfile";
import ControlFiscalOperationProfile from "@/components/Modals/FiscalOperationProfile/ControlFiscalOperationProfile";
type FiscalPageProps = {
	user: TAuthUserSession["user"];
	userHasFiscalViewPermission: boolean;
	userHasFiscalConfigurePermission: boolean;
	userHasFiscalEmitPermission: boolean;
	userHasFiscalCancelPermission: boolean;
};
export default function FiscalPage({
	user,
	userHasFiscalViewPermission,
	userHasFiscalConfigurePermission,
	userHasFiscalEmitPermission,
	userHasFiscalCancelPermission,
}: FiscalPageProps) {
	const [viewMode, setViewMode] = useQueryState("view", parseAsStringEnum(["documents", "configuration"]));
	return (
		<div className="w-full h-full flex flex-col gap-3">
			<Tabs value={viewMode ?? "documents"} onValueChange={(v) => setViewMode(v as typeof viewMode)}>
				<TabsList className="flex items-center gap-1.5 w-fit h-fit self-start rounded-lg px-2 py-1">
					<TabsTrigger value="documents" className="flex items-center gap-1.5 px-2 py-2 rounded-lg">
						<BookText className="w-4 h-4 min-w-4 min-h-4" />
						Documentos
					</TabsTrigger>
					<TabsTrigger value="configuration" className="flex items-center gap-1.5 px-2 py-2 rounded-lg">
						<Settings className="w-4 h-4 min-w-4 min-h-4" />
						Configuração
					</TabsTrigger>
				</TabsList>
				<TabsContent value="configuration" className="flex flex-col gap-3">
					{userHasFiscalConfigurePermission ? (
						<FiscalConfigurationsView userHasFiscalConfigurePermission={userHasFiscalConfigurePermission} />
					) : (
						<UnauthorizedPage message="Oops,  você não possui permissão para visualizar o módulo fiscal." />
					)}
				</TabsContent>
				{/* <TabsContent value="stats" className="flex flex-col gap-3">
					<FinancesStatsView />
				</TabsContent>
				<TabsContent value="accounting-entries" className="flex flex-col gap-3">
					<FinancesAccountingEntriesView />
				</TabsContent>
				<TabsContent value="financial-transactions" className="flex flex-col gap-3">
					<FinancesTransactionsView />
				</TabsContent>
				<TabsContent value="financial-accounts" className="flex flex-col gap-3">
					<FinancesAccountsView />
				</TabsContent> */}
			</Tabs>
		</div>
	);
}

type FiscalConfigurationsViewProps = {
	userHasFiscalConfigurePermission: boolean;
};
function FiscalConfigurationsView({ userHasFiscalConfigurePermission }: FiscalConfigurationsViewProps) {
	const canEdit = userHasFiscalConfigurePermission;
	const queryClient = useQueryClient();
	const { data, isLoading, isError, error, queryKey } = useFiscalSettings();
	const { state, redefineState, updateSettings, updateFiscalConfig } = useInternalFiscalSettingsState({
		initialState: {
			fiscalProvedor: data?.fiscalProvedor ?? "MANUAL",
			fiscalEmissaoAutomatica: data?.fiscalEmissaoAutomatica ?? false,
			fiscalConfiguracao: data?.fiscalConfiguracao ?? undefined,
		},
	});

	useEffect(() => {
		if (data) {
			redefineState({
				fiscalProvedor: data.fiscalProvedor ?? "MANUAL",
				fiscalEmissaoAutomatica: data.fiscalEmissaoAutomatica ?? false,
				fiscalConfiguracao: data.fiscalConfiguracao ?? state.fiscalConfiguracao,
			});
		}
	}, [data, redefineState]);

	const saveMutation = useMutation({
		mutationFn: () =>
			updateFiscalSettings({
				fiscalProvedor: state.fiscalProvedor,
				fiscalEmissaoAutomatica: state.fiscalEmissaoAutomatica,
				fiscalConfiguracao: state.fiscalConfiguracao,
			}),
		onSuccess: (response) => {
			toast.success(response.message);
			queryClient.invalidateQueries({ queryKey });
		},
		onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
	});

	const syncMutation = useMutation({
		mutationFn: syncFiscalCompany,
		onSuccess: (response) => {
			toast.success(response.message);
		},
		onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
	});

	if (isLoading) return <LoadingComponent />;
	if (isError) return <ErrorComponent msg={getErrorMessage(error)} />;

	return (
		<div className="flex w-full flex-col gap-6">
			<div className="flex flex-col gap-2 border-b pb-4 lg:flex-row lg:items-center lg:justify-between">
				<div className="space-y-1">
					<h2 className="text-xl font-semibold tracking-tight">Configuração Fiscal</h2>
					<p className="text-sm text-muted-foreground">Configure o provedor fiscal, dados da empresa e sincronização com a Nuvem Fiscal.</p>
				</div>
				<div className="flex items-center gap-2">
					<Button variant="outline" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending || !canEdit}>
						<RefreshCcw className="mr-2 h-4 w-4" />
						SINCRONIZAR EMPRESA
					</Button>
					<Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !canEdit}>
						<Save className="mr-2 h-4 w-4" />
						SALVAR
					</Button>
				</div>
			</div>

			<SectionWrapper title="OPERACIONAL" icon={<BadgeCheck className="h-4 w-4" />}>
				<div className="flex items-center justify-between rounded-lg border p-4">
					<div>
						<Label>EMISSÃO AUTOMÁTICA</Label>
						<p className="text-sm text-muted-foreground">Dispara emissão ao confirmar a venda.</p>
					</div>
					<Switch checked={state.fiscalEmissaoAutomatica} onCheckedChange={(checked) => updateSettings({ fiscalEmissaoAutomatica: checked })} />
				</div>
			</SectionWrapper>

			<CompanyBasicInformation fiscalConfig={state.fiscalConfiguracao} updateFiscalConfig={updateFiscalConfig} />
			<CompanyFiscalOperationProfiles />
		</div>
	);
}

type CompanyBasicInformationProps = {
	fiscalConfig: TUseInternalFiscalSettingsState["state"]["fiscalConfiguracao"];
	updateFiscalConfig: TUseInternalFiscalSettingsState["updateFiscalConfig"];
};
function CompanyBasicInformation({ fiscalConfig, updateFiscalConfig }: CompanyBasicInformationProps) {
	async function setAddressDataByCEP(cep: string) {
		const addressInfo = await getCEPInfo(cep);
		const toastID = toast.loading("Buscando informações sobre o CEP...", {
			duration: 2000,
		});
		setTimeout(() => {
			if (addressInfo) {
				toast.dismiss(toastID);
				toast.success("Dados do CEP buscados com sucesso.", {
					duration: 1000,
				});
				updateFiscalConfig({
					endereco: {
						...fiscalConfig.endereco,
						logradouro: addressInfo.logradouro,
						bairro: addressInfo.bairro,
						uf: addressInfo.uf,
						cidade: addressInfo.localidade.toUpperCase(),
						cep: cep,
						codigoMunicipio: addressInfo.ibge ?? "",
					},
				});
			}
		}, 1000);
	}
	return (
		<SectionWrapper title="EMPRESA FISCAL" icon={<Receipt className="h-4 w-4" />}>
			<TextInput
				label="RAZÃO SOCIAL"
				value={fiscalConfig.nomeRazaoSocial}
				placeholder="Razão social"
				handleChange={(value) => updateFiscalConfig({ nomeRazaoSocial: value })}
			/>
			<div className="w-full flex items-center gap-3 flex-col lg:flex-row">
				<div className="w-full lg:w-1/2">
					<TextInput
						label="NOME FANTASIA"
						value={fiscalConfig.nomeFantasia ?? ""}
						placeholder="Nome fantasia"
						handleChange={(value) => updateFiscalConfig({ nomeFantasia: value })}
					/>
				</div>
				<div className="w-full lg:w-1/2">
					<TextInput
						label="CPF/CNPJ"
						value={fiscalConfig.cpfCnpj}
						placeholder="Somente números"
						handleChange={(value) => updateFiscalConfig({ cpfCnpj: value })}
					/>
				</div>
			</div>

			<div className="w-full flex items-center gap-3 flex-col lg:flex-row">
				<div className="w-full lg:w-1/3">
					<SelectInput
						label="REGIME TRIBUTÁRIO"
						value={fiscalConfig.regimeTributario?.toString()}
						options={[
							{ id: 1, label: "1", value: "1" },
							{ id: 2, label: "2", value: "2" },
							{ id: 3, label: "3", value: "3" },
							{ id: 4, label: "4", value: "4" },
						]}
						resetOptionLabel="Selecione um regime tributário"
						handleChange={(value) => updateFiscalConfig({ regimeTributario: Number(value) })}
						onReset={() => updateFiscalConfig({ regimeTributario: undefined })}
					/>
				</div>
				<div className="w-full lg:w-1/3">
					<TextInput
						label="INSCRIÇÃO ESTADUAL"
						value={fiscalConfig.inscricaoEstadual ?? ""}
						placeholder="Inscrição estadual"
						handleChange={(value) => updateFiscalConfig({ inscricaoEstadual: value })}
					/>
				</div>
				<div className="w-full lg:w-1/3">
					<TextInput
						label="INSCRIÇÃO MUNICIPAL"
						value={fiscalConfig.inscricaoMunicipal ?? ""}
						placeholder="Inscrição municipal"
						handleChange={(value) => updateFiscalConfig({ inscricaoMunicipal: value })}
					/>
				</div>
			</div>
			<div className="w-full flex items-center gap-3 flex-col lg:flex-row">
				<div className="w-full lg:w-1/2">
					<TextInput
						label="EMAIL FISCAL"
						value={fiscalConfig.emailFiscal ?? ""}
						placeholder="financeiro@empresa.com"
						handleChange={(value) => updateFiscalConfig({ emailFiscal: value })}
					/>
				</div>
				<div className="w-full lg:w-1/2">
					<TextInput
						label="TELEFONE FISCAL"
						value={fiscalConfig.telefoneFiscal ?? ""}
						placeholder="Telefone fiscal"
						handleChange={(value) => updateFiscalConfig({ telefoneFiscal: formatToPhone(value) })}
					/>
				</div>
			</div>
			<div className="w-full flex items-center gap-3 flex-col lg:flex-row">
				<div className="w-full lg:w-1/3">
					<TextInput
						label="CEP"
						value={fiscalConfig.endereco.cep}
						placeholder="CEP"
						handleChange={(value) => {
							if (value.length === 9) {
								setAddressDataByCEP(value);
							}
							updateFiscalConfig({ endereco: { ...fiscalConfig.endereco, cep: formatToCEP(value) } });
						}}
					/>
				</div>
				<div className="w-full lg:w-1/3">
					<SelectInput
						label="UF"
						value={fiscalConfig.endereco.uf}
						options={BrazilianStatesOptions}
						resetOptionLabel="Selecione uma UF"
						handleChange={(value) =>
							updateFiscalConfig({ endereco: { ...fiscalConfig.endereco, uf: value, cidade: BrazilianCitiesOptionsFromUF(value ?? null)[0]?.value } })
						}
						onReset={() => updateFiscalConfig({ endereco: { ...fiscalConfig.endereco, uf: "", cidade: "" } })}
					/>
				</div>
				<div className="w-full lg:w-1/3">
					<SelectInput
						label="CIDADE"
						value={fiscalConfig.endereco.cidade}
						options={BrazilianCitiesOptionsFromUF(fiscalConfig.endereco.uf ?? null)}
						resetOptionLabel="Selecione uma cidade"
						handleChange={(value) => updateFiscalConfig({ endereco: { ...fiscalConfig.endereco, cidade: value } })}
						onReset={() => updateFiscalConfig({ endereco: { ...fiscalConfig.endereco, cidade: "" } })}
					/>
				</div>
			</div>
			<div className="w-full flex items-center gap-3 flex-col lg:flex-row">
				<div className="w-full lg:w-1/2">
					<TextInput
						label="CÓDIGO MUNICÍPIO"
						value={fiscalConfig.endereco.codigoMunicipio}
						placeholder="Código IBGE"
						handleChange={(value) => updateFiscalConfig({ endereco: { ...fiscalConfig.endereco, codigoMunicipio: value } })}
					/>
				</div>
				<div className="w-full lg:w-1/2">
					<TextInput
						label="BAIRRO"
						value={fiscalConfig.endereco.bairro}
						placeholder="Bairro"
						handleChange={(value) => updateFiscalConfig({ endereco: { ...fiscalConfig.endereco, bairro: value } })}
					/>
				</div>
			</div>
			<div className="w-full flex items-center gap-3 flex-col lg:flex-row">
				<div className="w-full lg:w-1/2">
					<TextInput
						label="LOGRADOURO"
						value={fiscalConfig.endereco.logradouro}
						placeholder="Rua / avenida"
						handleChange={(value) => updateFiscalConfig({ endereco: { ...fiscalConfig.endereco, logradouro: value } })}
					/>
				</div>
				<div className="w-full lg:w-1/2">
					<TextInput
						label="NÚMERO"
						value={fiscalConfig.endereco.numero}
						placeholder="Número"
						handleChange={(value) => updateFiscalConfig({ endereco: { ...fiscalConfig.endereco, numero: value } })}
					/>
				</div>
			</div>
		</SectionWrapper>
	);
}

const FISCAL_FINALITY_LABELS: Record<TFiscalOperationFinalityEnum, string> = {
	NORMAL: "NORMAL",
	COMPLEMENTAR: "COMPLEMENTAR",
	AJUSTE: "AJUSTE",
	DEVOLUCAO: "DEVOLUÇÃO",
};

const FISCAL_CONSUMER_PRESENCE_LABELS: Record<TFiscalOperationConsumerPresenceEnum, string> = {
	NAO_SE_APLICA: "NÃO SE APLICA",
	OPERACAO_PRESENCIAL: "PRESENCIAL",
	INTERNET: "INTERNET",
	TELEATENDIMENTO: "TELEATENDIMENTO",
	ENTREGA_DOMICILIO: "ENTREGA À DOMICÍLIO",
};

const FISCAL_DOCUMENT_TYPE_STYLES: Record<TFiscalDocumentTypeEnum, string> = {
	NFCE: "bg-blue-500 dark:bg-blue-600 text-white",
	NFE: "bg-indigo-500 dark:bg-indigo-600 text-white",
	NFSE: "bg-teal-500 dark:bg-teal-600 text-white",
};

function CompanyFiscalOperationProfiles() {
	const queryClient = useQueryClient();
	const [newProfileMenuIsOpen, setNewProfileMenuIsOpen] = useState(false);
	const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
	const { data, queryKey, isLoading, isError, isSuccess, error } = useFiscalOperationProfiles();

	const handleOnMutate = async () => await queryClient.cancelQueries({ queryKey: queryKey });
	const handleOnSettled = async () => await queryClient.invalidateQueries({ queryKey: queryKey });
	return (
		<SectionWrapper title="PERFIS DE OPERAÇÃO FISCAL" icon={<BadgeCheck className="h-4 w-4" />}>
			{isLoading ? <LoadingComponent /> : null}
			{isError ? <ErrorComponent msg={getErrorMessage(error)} /> : null}
			{isSuccess ? (
				data.length > 0 ? (
					<div className="flex flex-col gap-2 w-full">
						{data.map((profile) => (
							<CompanyFiscalOperationProfile key={profile.id} profile={profile} handleEditClick={() => setEditingProfileId(profile.id)} />
						))}
					</div>
				) : (
					<div className="flex items-center justify-center py-6">
						<p className="text-sm text-muted-foreground">Nenhum perfil de operação fiscal encontrado.</p>
					</div>
				)
			) : null}
			<div className="w-full flex items-center justify-center">
				<Button variant={"ghost"} size={"fit"} className="flex items-center gap-1 px-2 py-1 text-xs" onClick={() => setNewProfileMenuIsOpen(true)}>
					<Plus className="w-4 h-4 min-w-4 min-h-4" />
					ADICIONAR
				</Button>
			</div>
			{newProfileMenuIsOpen ? (
				<NewFiscalOperationProfile
					closeModal={() => setNewProfileMenuIsOpen(false)}
					callbacks={{ onMutate: handleOnMutate, onSettled: handleOnSettled }}
				/>
			) : null}
			{editingProfileId ? (
				<ControlFiscalOperationProfile
					operationProfileId={editingProfileId}
					closeModal={() => setEditingProfileId(null)}
					callbacks={{ onMutate: handleOnMutate, onSettled: handleOnSettled }}
				/>
			) : null}
		</SectionWrapper>
	);
}

type CompanyFiscalOperationProfileProps = {
	profile: TGetFiscalOperationProfilesOutputDefault[number];
	handleEditClick: () => void;
};
function CompanyFiscalOperationProfile({ profile, handleEditClick }: CompanyFiscalOperationProfileProps) {
	return (
		<TooltipProvider>
			<div
				className={cn(
					"bg-card border-primary/20 flex w-full flex-col gap-1 rounded-xl border px-3 py-4 shadow-2xs",
					!profile.ativo ? "opacity-70" : null,
				)}
			>
				<div className="w-full flex items-center justify-between flex-col md:flex-row gap-2">
					<div className="flex items-center gap-2 flex-wrap">
						<h1 className="text-xs font-bold tracking-tight lg:text-sm">{profile.nome}</h1>
						<div className="flex items-center gap-1">
							<Flag className="w-4 h-4 min-w-4 min-h-4" />
							<h1 className="py-0.5 text-center text-[0.65rem] font-medium italic text-primary/80">{FISCAL_FINALITY_LABELS[profile.finalidade]}</h1>
						</div>
						<div className="flex items-center gap-1">
							<User className="w-4 h-4 min-w-4 min-h-4" />
							<h1 className="py-0.5 text-center text-[0.65rem] font-medium italic text-primary/80">
								{profile.consumidorFinal ? "CONSUMIDOR FINAL" : "NÃO CONSUMIDOR FINAL"}
							</h1>
						</div>
					</div>
					<div className="flex items-center gap-3 flex-col md:flex-row gap-y-1">
						<div className="flex items-center gap-3 flex-wrap">
							<StatBadge
								icon={<Receipt className="w-4 min-w-4 h-4 min-h-4" />}
								value={profile.tipoDocumento}
								tooltipContent="Tipo do documento fiscal emitido por este perfil"
								className={cn(FISCAL_DOCUMENT_TYPE_STYLES[profile.tipoDocumento])}
							/>
							<StatBadge
								icon={<Hash className="w-4 min-w-4 h-4 min-h-4" />}
								value={`CFOP ${profile.cfopPadrao}`}
								tooltipContent="CFOP padrão aplicado aos itens da emissão"
							/>
							{profile.seriePadrao ? (
								<StatBadge
									icon={<BookText className="w-4 min-w-4 h-4 min-h-4" />}
									value={`SÉRIE ${profile.seriePadrao.serie}`}
									tooltipContent={`Série padrão — próximo número: ${profile.seriePadrao.proximoNumero}`}
								/>
							) : null}
							<StatBadge
								icon={profile.ativo ? <CircleCheck className="w-4 min-w-4 h-4 min-h-4" /> : <CircleX className="w-4 min-w-4 h-4 min-h-4" />}
								value={profile.ativo ? "ATIVO" : "INATIVO"}
								tooltipContent={profile.ativo ? "Perfil disponível para emissão" : "Perfil desativado"}
								className={cn(profile.ativo ? "bg-green-500 dark:bg-green-600 text-white" : "bg-red-500 dark:bg-red-600 text-white")}
							/>
						</div>
					</div>
				</div>
				{profile.descricao ? <p className="text-xs text-muted-foreground tracking-tight">{profile.descricao}</p> : null}
				<div className="w-full flex items-center justify-between gap-2 flex-wrap">
					<div className="flex items-center gap-2 flex-wrap">
						<div className={cn("flex items-center gap-1.5 text-[0.65rem] font-bold text-primary")}>
							<FileText className="w-3 min-w-3 h-3 min-h-3" />
							<p className="text-xs font-medium tracking-tight uppercase">NATUREZA: {profile.naturezaOperacao}</p>
						</div>
						<div className={cn("flex items-center gap-1.5 text-[0.65rem] font-bold text-primary")}>
							<MapPin className="w-3 min-w-3 h-3 min-h-3" />
							<p className="text-xs font-medium tracking-tight uppercase">PRESENÇA: {FISCAL_CONSUMER_PRESENCE_LABELS[profile.presencaConsumidor]}</p>
						</div>
						{profile.dataInsercao ? (
							<div className={cn("flex items-center gap-1.5 text-[0.65rem] font-bold text-primary")}>
								<Calendar className="w-3 min-w-3 h-3 min-h-3" />
								<p className="text-xs font-medium tracking-tight uppercase">CADASTRADO EM: {formatDateAsLocale(profile.dataInsercao)}</p>
							</div>
						) : null}
					</div>
					<Button variant="ghost" className="flex items-center gap-1.5" size="sm" onClick={handleEditClick}>
						<PencilIcon className="w-3 min-w-3 h-3 min-h-3" />
						EDITAR
					</Button>
				</div>
			</div>
		</TooltipProvider>
	);
}
