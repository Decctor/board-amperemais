"use client";
import { TAuthUserSession } from "@/lib/authentication/types";
import { parseAsStringEnum, useQueryState } from "nuqs";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BookText, Settings, BadgeCheck, Receipt, RefreshCcw, Save } from "lucide-react";
import { useFiscalSettings } from "@/lib/queries/fiscal";
import { syncFiscalCompany, updateFiscalSettings } from "@/lib/mutations/fiscal";

import { useInternalFiscalSettingsState } from "@/state-hooks/use-internal-fiscal-settings-state";
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
				<div className="grid gap-4 md:grid-cols-2">
					<div className="flex flex-col gap-2">
						<Label>PROVEDOR</Label>
						<div className="flex gap-2">
							<Button
								type="button"
								variant={state.fiscalProvedor === "MANUAL" ? "default" : "outline"}
								onClick={() => updateSettings({ fiscalProvedor: "MANUAL" })}
							>
								MANUAL
							</Button>
							<Button
								type="button"
								variant={state.fiscalProvedor === "NUVEM_FISCAL" ? "default" : "outline"}
								onClick={() => updateSettings({ fiscalProvedor: "NUVEM_FISCAL" })}
							>
								NUVEM FISCAL
							</Button>
						</div>
					</div>
					<div className="flex items-center justify-between rounded-lg border p-4">
						<div>
							<Label>EMISSÃO AUTOMÁTICA</Label>
							<p className="text-sm text-muted-foreground">Dispara emissão ao confirmar a venda.</p>
						</div>
						<Switch checked={state.fiscalEmissaoAutomatica} onCheckedChange={(checked) => updateSettings({ fiscalEmissaoAutomatica: checked })} />
					</div>
				</div>
			</SectionWrapper>

			<SectionWrapper title="EMPRESA FISCAL" icon={<Receipt className="h-4 w-4" />}>
				<div className="grid gap-4 md:grid-cols-2">
					<TextInput
						label="RAZÃO SOCIAL"
						value={state.fiscalConfiguracao.nomeRazaoSocial}
						placeholder="Razão social"
						handleChange={(value) => updateFiscalConfig({ nomeRazaoSocial: value })}
					/>
					<TextInput
						label="NOME FANTASIA"
						value={state.fiscalConfiguracao.nomeFantasia ?? ""}
						placeholder="Nome fantasia"
						handleChange={(value) => updateFiscalConfig({ nomeFantasia: value })}
					/>
					<TextInput
						label="CPF/CNPJ"
						value={state.fiscalConfiguracao.cpfCnpj}
						placeholder="Somente números"
						handleChange={(value) => updateFiscalConfig({ cpfCnpj: value })}
					/>
					<TextInput
						label="INSCRIÇÃO ESTADUAL"
						value={state.fiscalConfiguracao.inscricaoEstadual ?? ""}
						placeholder="Inscrição estadual"
						handleChange={(value) => updateFiscalConfig({ inscricaoEstadual: value })}
					/>
					<TextInput
						label="INSCRIÇÃO MUNICIPAL"
						value={state.fiscalConfiguracao.inscricaoMunicipal ?? ""}
						placeholder="Inscrição municipal"
						handleChange={(value) => updateFiscalConfig({ inscricaoMunicipal: value })}
					/>
					<NumberInput
						label="REGIME TRIBUTÁRIO"
						value={state.fiscalConfiguracao.regimeTributario}
						placeholder="1 a 4"
						handleChange={(value) => updateFiscalConfig({ regimeTributario: value })}
					/>
					<TextInput
						label="EMAIL FISCAL"
						value={state.fiscalConfiguracao.emailFiscal ?? ""}
						placeholder="financeiro@empresa.com"
						handleChange={(value) => updateFiscalConfig({ emailFiscal: value })}
					/>
					<TextInput
						label="TELEFONE FISCAL"
						value={state.fiscalConfiguracao.telefoneFiscal ?? ""}
						placeholder="Telefone fiscal"
						handleChange={(value) => updateFiscalConfig({ telefoneFiscal: value })}
					/>
					<TextInput
						label="LOGRADOURO"
						value={state.fiscalConfiguracao.endereco.logradouro}
						placeholder="Rua / avenida"
						handleChange={(value) => updateFiscalConfig({ endereco: { ...state.fiscalConfiguracao.endereco, logradouro: value } })}
					/>
					<TextInput
						label="NÚMERO"
						value={state.fiscalConfiguracao.endereco.numero}
						placeholder="Número"
						handleChange={(value) => updateFiscalConfig({ endereco: { ...state.fiscalConfiguracao.endereco, numero: value } })}
					/>
					<TextInput
						label="BAIRRO"
						value={state.fiscalConfiguracao.endereco.bairro}
						placeholder="Bairro"
						handleChange={(value) => updateFiscalConfig({ endereco: { ...state.fiscalConfiguracao.endereco, bairro: value } })}
					/>
					<TextInput
						label="CIDADE"
						value={state.fiscalConfiguracao.endereco.cidade}
						placeholder="Cidade"
						handleChange={(value) => updateFiscalConfig({ endereco: { ...state.fiscalConfiguracao.endereco, cidade: value } })}
					/>
					<TextInput
						label="UF"
						value={state.fiscalConfiguracao.endereco.uf}
						placeholder="UF"
						handleChange={(value) => updateFiscalConfig({ endereco: { ...state.fiscalConfiguracao.endereco, uf: value } })}
					/>
					<TextInput
						label="CEP"
						value={state.fiscalConfiguracao.endereco.cep}
						placeholder="CEP"
						handleChange={(value) => updateFiscalConfig({ endereco: { ...state.fiscalConfiguracao.endereco, cep: value } })}
					/>
					<TextInput
						label="CÓDIGO MUNICÍPIO"
						value={state.fiscalConfiguracao.endereco.codigoMunicipio}
						placeholder="Código IBGE"
						handleChange={(value) => updateFiscalConfig({ endereco: { ...state.fiscalConfiguracao.endereco, codigoMunicipio: value } })}
					/>
				</div>
			</SectionWrapper>

			<SectionWrapper title="NUVEM FISCAL" icon={<RefreshCcw className="h-4 w-4" />}>
				<div className="grid gap-4 md:grid-cols-2">
					<TextInput
						label="BASE URL"
						value={state.fiscalConfiguracao.nuvemFiscal.api.baseUrl}
						placeholder="https://api.nuvemfiscal.com.br"
						handleChange={(value) =>
							updateFiscalConfig({
								nuvemFiscal: { ...state.fiscalConfiguracao.nuvemFiscal, api: { ...state.fiscalConfiguracao.nuvemFiscal.api, baseUrl: value } },
							})
						}
					/>
					<TextInput
						label="TOKEN API"
						value={state.fiscalConfiguracao.nuvemFiscal.api.apiToken ?? ""}
						placeholder="Token opcional salvo na organização"
						handleChange={(value) =>
							updateFiscalConfig({
								nuvemFiscal: { ...state.fiscalConfiguracao.nuvemFiscal, api: { ...state.fiscalConfiguracao.nuvemFiscal.api, apiToken: value } },
							})
						}
					/>
					<NumberInput
						label="ID CSC NFC-E"
						value={state.fiscalConfiguracao.nuvemFiscal.nfce.idCsc ?? 0}
						placeholder="ID CSC"
						handleChange={(value) =>
							updateFiscalConfig({
								nuvemFiscal: { ...state.fiscalConfiguracao.nuvemFiscal, nfce: { ...state.fiscalConfiguracao.nuvemFiscal.nfce, idCsc: value } },
							})
						}
					/>
					<TextInput
						label="CSC NFC-E"
						value={state.fiscalConfiguracao.nuvemFiscal.nfce.csc ?? ""}
						placeholder="CSC da NFC-e"
						handleChange={(value) =>
							updateFiscalConfig({
								nuvemFiscal: { ...state.fiscalConfiguracao.nuvemFiscal, nfce: { ...state.fiscalConfiguracao.nuvemFiscal.nfce, csc: value } },
							})
						}
					/>
				</div>
			</SectionWrapper>
		</div>
	);
}
