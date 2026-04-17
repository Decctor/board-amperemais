"use client";
import { TAuthUserSession } from "@/lib/authentication/types";
import { parseAsStringEnum, useQueryState } from "nuqs";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BookText, Settings, BadgeCheck, Receipt, RefreshCcw, Save } from "lucide-react";
import { useFiscalOperationProfiles, useFiscalSettings } from "@/lib/queries/fiscal";
import { syncFiscalCompany, updateFiscalSettings } from "@/lib/mutations/fiscal";

import { TUseInternalFiscalSettingsState, useInternalFiscalSettingsState } from "@/state-hooks/use-internal-fiscal-settings-state";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import { Button } from "@/components/ui/button";
import SectionWrapper from "@/components/ui/section-wrapper";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import TextInput from "@/components/Inputs/TextInput";
import NumberInput from "@/components/Inputs/NumberInput";
import UnauthorizedPage from "@/components/Utils/UnauthorizedPage";
import { getCEPInfo } from "@/lib/utils";
import { formatToCEP, formatToPhone } from "@/lib/formatting";
import SelectInput from "@/components/Inputs/SelectInput";
import { BrazilianCitiesOptionsFromUF, BrazilianStatesOptions } from "@/utils/states-cities";
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

function CompanyFiscalOperationProfiles() {
	const { data, isLoading, isError, isSuccess, error, queryKey } = useFiscalOperationProfiles();

	return (
		<SectionWrapper title="PERFIS DE OPERAÇÃO FISCAL" icon={<BadgeCheck className="h-4 w-4" />}>
			{isLoading ? <LoadingComponent /> : null}
			{isError ? <ErrorComponent msg={getErrorMessage(error)} /> : null}
			{isSuccess ? (
				data.length > 0 ? (
					data.map((profile) => (
						<div key={profile.id}>
							<h3>{profile.nome}</h3>
							<p>{profile.descricao}</p>
						</div>
					))
				) : (
					<div className="flex items-center justify-center">
						<p className="text-sm text-muted-foreground">Nenhum perfil de operação fiscal encontrado.</p>
					</div>
				)
			) : null}
		</SectionWrapper>
	);
}
