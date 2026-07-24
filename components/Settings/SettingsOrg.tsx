"use client";

import NumberInput from "@/components/Inputs/NumberInput";
import SelectInput from "@/components/Inputs/SelectInput";
import TextInput from "@/components/Inputs/TextInput";
import { DEFAULT_ORG_COLORS, hexToRgba } from "@/components/Providers/OrgColorsProvider";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { Switch } from "@/components/ui/switch";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getErrorMessage } from "@/lib/errors";
import { uploadFile } from "@/lib/files-storage";
import { formatToCPForCNPJ, formatToPhone } from "@/lib/formatting";
import { updateOrganization } from "@/lib/mutations/organizations";
import { useAccountCharts, useFinancesAccounts } from "@/lib/queries/finances";
import { useOrganization } from "@/lib/queries/organizations";
import { cn } from "@/lib/utils";
import type { TOrganizationPaymentMethodDefaults } from "@/schemas/organizations";
import { type TUseOrganizationState, useOrganizationState } from "@/state-hooks/use-organization-state";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, Camera, ChevronDown, Database, ImageIcon, Loader2, Palette, Save, Settings2, Undo2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo } from "react";
import { toast } from "sonner";
import ErrorComponent from "../Layouts/ErrorComponent";
import LoadingComponent from "../Layouts/LoadingComponent";
import { SalePaymentMethodsOptions } from "@/utils/select-options";
import { useUsers } from "@/lib/queries/users";
import MultipleSelectInput from "../Inputs/MultipleSelectInput";
import { formatNameAsInitials } from "@/lib/formatting";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

type SettingsOrgProps = {
	user: TAuthUserSession["user"];
	membership: NonNullable<TAuthUserSession["membership"]>;
};

export default function SettingsOrg({ membership }: SettingsOrgProps) {
	const permissions = membership.permissoes.empresa;

	if (!permissions.visualizar) {
		return (
			<div className="flex w-full flex-col items-center justify-center p-8 text-center text-muted-foreground">
				<Building2 className="mb-4 h-12 w-12 opacity-20" />
				<h2 className="text-lg font-medium">Acesso Negado</h2>
				<p className="text-sm">Você não tem permissão para visualizar as configurações da organização.</p>
			</div>
		);
	}

	return <SettingsOrgContent userHasEditPermissions={permissions.editar} />;
}

type SettingsOrgContentProps = {
	userHasEditPermissions: boolean;
};

// ---------------------------------------------------------------------------
// Payment method helpers
// ---------------------------------------------------------------------------
const PAYMENT_METHOD_LABELS: Record<string, string> = {
	DINHEIRO: "Dinheiro",
	PIX: "PIX",
	CARTAO_DEBITO: "Cartão de Débito",
	CARTAO_CREDITO: "Cartão de Crédito",
	BOLETO: "Boleto",
	TRANSFERENCIA: "Transferência",
	CASHBACK: "Cashback",
	VALE: "Vale",
	A_DEFINIR: "A Definir",
	FIADO_NOTA: "Fiado / Nota",
	OUTRO: "Outro",
};

const PAYMENT_METHOD_KEYS = Object.keys(PAYMENT_METHOD_LABELS) as (keyof typeof PAYMENT_METHOD_LABELS)[];

// ---------------------------------------------------------------------------
// PaymentMethodCard sub-component
// ---------------------------------------------------------------------------
type PaymentMethodCardProps = {
	methodOption: (typeof SalePaymentMethodsOptions)[number];
	methodData: TOrganizationPaymentMethodDefaults;
	financialAccountOptions: { id: string; value: string; label: string }[];
	editable: boolean;
	onChange: (key: string, data: TOrganizationPaymentMethodDefaults) => void;
};

function PaymentMethodCard({ methodOption, methodData, financialAccountOptions, editable, onChange }: PaymentMethodCardProps) {
	const { value, label, icon, renderIcon } = methodOption;

	function update(partial: Partial<TOrganizationPaymentMethodDefaults>) {
		onChange(value, { ...methodData, ...partial });
	}

	function updateParcelamento(partial: Partial<TOrganizationPaymentMethodDefaults["parcelamento"]>) {
		onChange(value, {
			...methodData,
			parcelamento: { ...methodData.parcelamento, ...partial },
		});
	}

	const selectedAccount = financialAccountOptions.find((o) => o.value === methodData.contaFinanceiraPadraoId) ?? null;

	return (
		<Collapsible className="rounded-lg border border-border bg-card">
			<div className="flex items-center justify-between px-4 py-3">
				<div className="flex items-center gap-3">
					{icon}
					<span className="text-sm font-semibold tracking-tight">{label}</span>
					{!methodData.suportado && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">DESATIVADO</span>}
				</div>
				<div className="flex items-center gap-3">
					<div className="flex items-center gap-2">
						<Switch checked={methodData.suportado} onCheckedChange={(checked) => editable && update({ suportado: checked })} disabled={!editable} />
					</div>
					<CollapsibleTrigger asChild>
						<Button variant="ghost" size="icon" className="h-7 w-7">
							<ChevronDown className="h-4 w-4 transition-transform duration-200 [[data-state=open]_&]:rotate-180" />
						</Button>
					</CollapsibleTrigger>
				</div>
			</div>

			<CollapsibleContent>
				<div className="w-full flex flex-col gap-3 p-3">
					{/* Financial Account */}
					<SelectInput
						label="CONTA FINANCEIRA PADRÃO"
						value={selectedAccount?.value ?? null}
						options={financialAccountOptions}
						resetOptionLabel="Nenhuma conta"
						editable={editable}
						handleChange={(val) => {
							const acc = financialAccountOptions.find((o) => o.value === val);
							update({
								contaFinanceiraPadraoId: acc?.value ?? null,
								contaFinanceiraPadraoKey: acc?.label ?? null,
							});
						}}
						onReset={() => update({ contaFinanceiraPadraoId: null, contaFinanceiraPadraoKey: null })}
					/>

					{/* Efetivação tipo */}
					<div className="flex flex-col gap-1">
						<h3 className="text-sm font-medium tracking-tight text-foreground/80">EFETIVAÇÃO PADRÃO</h3>
						<div className="flex items-center gap-2">
							{(["IMEDIATA", "PENDENTE"] as const).map((tipo) => (
								<Button
									key={tipo}
									variant={methodData.efetivacaoTipoPadrao === tipo ? "default" : "ghost"}
									size="fit"
									className={cn("px-2 py-1 rounded-lg text-xs", {
										"opacity-100": methodData.efetivacaoTipoPadrao === tipo,
										"opacity-50": methodData.efetivacaoTipoPadrao !== tipo,
									})}
									onClick={() => editable && update({ efetivacaoTipoPadrao: tipo })}
									disabled={!editable}
								>
									{tipo}
								</Button>
							))}
						</div>
					</div>

					{/* Delay dias (only when PENDENTE) */}
					{methodData.efetivacaoTipoPadrao === "PENDENTE" && (
						<NumberInput
							label="DELAY (DIAS)"
							value={methodData.delayDiasPadrao}
							placeholder="Número de dias..."
							handleChange={(val) => update({ delayDiasPadrao: val })}
							editable={editable}
						/>
					)}

					{/* Parcelamento */}
					<div className="mt-4 flex flex-col gap-3 rounded-lg border border-dashed border-border bg-muted/30 p-3">
						<div className="flex items-center justify-between">
							<span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">PARCELAMENTO</span>
							<div className="flex items-center gap-2">
								<Label className="text-xs text-muted-foreground">{methodData.parcelamento.permitido ? "PERMITIDO" : "NÃO PERMITIDO"}</Label>
								<Switch
									checked={methodData.parcelamento.permitido}
									onCheckedChange={(checked) => editable && updateParcelamento({ permitido: checked })}
									disabled={!editable}
								/>
							</div>
						</div>
						{methodData.parcelamento.permitido && (
							<div className="grid grid-cols-1 gap-3 md:grid-cols-3">
								<NumberInput
									label="MÍN. PARCELAS"
									value={methodData.parcelamento.minParcelas}
									placeholder="Ex: 2"
									handleChange={(val) => updateParcelamento({ minParcelas: val ?? 1 })}
									editable={editable}
								/>
								<NumberInput
									label="MÁX. PARCELAS"
									value={methodData.parcelamento.maxParcelas}
									placeholder="Ex: 12"
									handleChange={(val) => updateParcelamento({ maxParcelas: val })}
									editable={editable}
								/>
								<NumberInput
									label="INTERVALO (MESES)"
									value={methodData.parcelamento.intervaloMeses}
									placeholder="Ex: 1"
									handleChange={(val) => updateParcelamento({ intervaloMeses: val })}
									editable={editable}
								/>
							</div>
						)}
					</div>
				</div>
			</CollapsibleContent>
		</Collapsible>
	);
}

// ---------------------------------------------------------------------------
// Main content component
// ---------------------------------------------------------------------------
function SettingsOrgContent({ userHasEditPermissions }: SettingsOrgContentProps) {
	const queryClient = useQueryClient();
	const { data: organization, queryKey, isLoading: isOrgLoading, isError: isOrgError, isSuccess: isOrgSuccess, error: orgError } = useOrganization();
	const { data: users } = useUsers({ initialFilters: { search: "" } });
	const { state, updateOrganization: updateOrgState, updateLogoHolder, redefineState } = useOrganizationState();

	const hasErpAccess = organization?.configuracao.recursos.erp.acesso ?? false;

	// Financial accounts — only fetched when ERP is accessible

	const { data: accountChartsData } = useAccountCharts({ initialFilters: { search: "" } });
	const { data: financialAccountsData } = useFinancesAccounts({
		initialFilters: { activeOnly: true, stats: false },
	});

	const accountChartsOptions = useMemo(
		() =>
			(accountChartsData ?? []).map((a) => ({
				id: a.id,
				value: a.id,
				label: a.nome,
			})),
		[accountChartsData],
	);
	const financialAccountOptions = useMemo(
		() =>
			(financialAccountsData?.accounts ?? []).map((a) => ({
				id: a.id,
				value: a.id,
				label: a.nome,
			})),
		[financialAccountsData],
	);
	console.log(financialAccountOptions);
	const { mutate: updateOrgMutation, isPending: isUpdateOrgPending } = useMutation({
		mutationKey: ["update-organization"],
		mutationFn: async (info: TUseOrganizationState["state"]) => {
			let logoUrl = info.organization.logoUrl;

			if (info.logoHolder.file) {
				const { url } = await uploadFile({
					file: info.logoHolder.file,
					fileName: `${info.organization.nome}-logo`,
					prefix: "organizations",
				});
				logoUrl = url;
			}

			return await updateOrganization({
				organization: {
					nome: info.organization.nome,
					email: info.organization.email,
					telefone: info.organization.telefone,
					logoUrl: logoUrl,
					corPrimaria: info.organization.corPrimaria,
					corPrimariaForeground: info.organization.corPrimariaForeground,
					corSecundaria: info.organization.corSecundaria,
					corSecundariaForeground: info.organization.corSecundariaForeground,
				},
				configuracao: {
					preferencias: info.organization.configuracao.preferencias,
					defaults: info.organization.configuracao.defaults,
				},
			});
		},
		onMutate: async () => {
			await queryClient.cancelQueries({ queryKey });
			return;
		},
		onSuccess: () => {
			return toast.success("Organização atualizada com sucesso!");
		},
		onError: (error) => {
			toast.error(getErrorMessage(error));
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey });
		},
	});

	const handleReset = () => {
		if (organization) {
			redefineState({
				...state,
				organization: {
					...state.organization,
					...organization,
					corPrimaria: organization.corPrimaria || DEFAULT_ORG_COLORS.primary,
					corPrimariaForeground: organization.corPrimariaForeground || DEFAULT_ORG_COLORS.primaryForeground,
					corSecundaria: organization.corSecundaria || DEFAULT_ORG_COLORS.secondary,
					corSecundariaForeground: organization.corSecundariaForeground || DEFAULT_ORG_COLORS.secondaryForeground,
					configuracao: {
						...organization.configuracao,
					},
				},
				logoHolder: {
					file: null,
					previewUrl: organization.logoUrl,
				},
			});
		}
	};

	const primaryColor = state.organization.corPrimaria || DEFAULT_ORG_COLORS.primary;
	const primaryForegroundColor = state.organization.corPrimariaForeground || DEFAULT_ORG_COLORS.primaryForeground;
	const secondaryColor = state.organization.corSecundaria || DEFAULT_ORG_COLORS.secondary;
	const secondaryForegroundColor = state.organization.corSecundariaForeground || DEFAULT_ORG_COLORS.secondaryForeground;

	const isCustomMessageSendingLimit = useMemo(() => {
		return (
			!!state.organization.configuracao.preferencias.limiteMensagensSemanaisViaCampanhas &&
			state.organization.configuracao.preferencias.limiteMensagensSemanaisViaCampanhas !== 300 &&
			state.organization.configuracao.preferencias.limiteMensagensSemanaisViaCampanhas !== 500 &&
			state.organization.configuracao.preferencias.limiteMensagensSemanaisViaCampanhas !== 1000
		);
	}, [state.organization.configuracao.preferencias.limiteMensagensSemanaisViaCampanhas]);

	useEffect(() => {
		if (organization) {
			redefineState({
				...state,
				organization: { ...organization },
			});
		}
	}, [organization, redefineState]);

	if (isOrgLoading) return <LoadingComponent />;
	if (isOrgError) return <ErrorComponent msg={getErrorMessage(orgError)} />;
	if (!isOrgSuccess) return null;

	// ---------------------------------------------------------------------------
	// Helpers for nested state updates
	// ---------------------------------------------------------------------------
	function updatePreferencias(partial: Partial<typeof state.organization.configuracao.preferencias>) {
		updateOrgState({
			configuracao: {
				...state.organization.configuracao,
				preferencias: { ...state.organization.configuracao.preferencias, ...partial },
			},
		});
	}

	function updateSessoesVenda(partial: Partial<NonNullable<typeof state.organization.configuracao.preferencias.sessoesVenda>>) {
		const current = state.organization.configuracao.preferencias.sessoesVenda ?? {
			habilitado: false,
			obrigatorio: false,
			escopo: "OPERADOR" as const,
			exigirFundoTroco: false,
			conferenciaCega: false,
			bloquearFechamentoComPendenciaFiscal: false,
		};
		updatePreferencias({ sessoesVenda: { ...current, ...partial } });
	}

	function updateCarteirasClientes(partial: Partial<NonNullable<typeof state.organization.configuracao.preferencias.carteirasClientes>>) {
		const current = state.organization.configuracao.preferencias.carteirasClientes ?? {
			habilitado: false,
		};
		updatePreferencias({ carteirasClientes: { ...current, ...partial } });
	}

	function updatePaymentMethod(key: string, data: TOrganizationPaymentMethodDefaults) {
		updateOrgState({
			configuracao: {
				...state.organization.configuracao,
				defaults: {
					...state.organization.configuracao.defaults,
					pagamentos: {
						...state.organization.configuracao.defaults.pagamentos,
						metodos: {
							...state.organization.configuracao.defaults.pagamentos.metodos,
							[key]: data,
						},
					},
				},
			},
		});
	}

	function updateAccountingField(
		type: "vendas" | "compras",
		field: "debitoContaId" | "debitoContaKey" | "creditoContaId" | "creditoContaKey",
		value: string | null,
	) {
		updateOrgState({
			configuracao: {
				...state.organization.configuracao,
				defaults: {
					...state.organization.configuracao.defaults,
					contabilidade: {
						...state.organization.configuracao.defaults.contabilidade,
						lancamentosPadrao: {
							...state.organization.configuracao.defaults.contabilidade.lancamentosPadrao,
							[type]: {
								...state.organization.configuracao.defaults.contabilidade.lancamentosPadrao[type],
								[field]: value,
							},
						},
					},
				},
			},
		});
	}

	const lancamentosPadrao = state.organization.configuracao.defaults.contabilidade.lancamentosPadrao;
	const contasAtendimentoConfig = state.organization.configuracao.preferencias.contasAtendimento ?? { habilitado: false };
	const sessoesVendaConfig = state.organization.configuracao.preferencias.sessoesVenda ?? {
		habilitado: false,
		obrigatorio: false,
		escopo: "OPERADOR" as const,
		exigirFundoTroco: false,
		conferenciaCega: false,
		bloquearFechamentoComPendenciaFiscal: false,
	};
	const carteirasClientesConfig = state.organization.configuracao.preferencias.carteirasClientes ?? {
		habilitado: false,
	};

	return (
		<div className="flex w-full flex-col gap-6">
			{/* Header Section */}
			<div className="flex flex-col lg:flex-row items-center justify-between border-b pb-4">
				<div className="space-y-1">
					<h2 className="text-xl font-semibold tracking-tight">Configurações da Organização</h2>
					<p className="text-sm text-muted-foreground">Gerencie as informações gerais, identidade visual e preferências da sua organização.</p>
				</div>
				<div className="flex items-center gap-2">
					<Button
						variant="ghost"
						size="sm"
						onClick={handleReset}
						disabled={isUpdateOrgPending || !userHasEditPermissions}
						className="flex items-center gap-2"
					>
						<Undo2 className="h-4 w-4" />
						RESTAURAR
					</Button>
					<Button
						size="sm"
						onClick={() => updateOrgMutation(state)}
						disabled={isUpdateOrgPending || !userHasEditPermissions}
						className="flex items-center gap-2"
					>
						{isUpdateOrgPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
						SALVAR ALTERAÇÕES
					</Button>
				</div>
			</div>

			{/* ------------------------------------------------------------------ */}
			{/* INFORMAÇÕES GERAIS                                                  */}
			{/* ------------------------------------------------------------------ */}
			<SectionWrapper title="INFORMAÇÕES GERAIS" icon={<Building2 className="h-4 w-4" />}>
				<div className="flex flex-col md:flex-row gap-6">
					{/* Logo Upload Section */}
					<div className="flex flex-col gap-2 items-center md:items-start">
						<Label className="text-xs font-medium text-muted-foreground">LOGO</Label>
						<div className="relative group">
							<div className="relative h-32 w-32 overflow-hidden rounded-xl border-2 border-dashed border-muted-foreground/25 bg-muted/50 transition-colors hover:bg-muted">
								{state.organization.logoUrl ? (
									<Image src={state.organization.logoUrl} alt="Logo da organização" fill className="object-cover" />
								) : state.logoHolder.previewUrl ? (
									<Image src={state.logoHolder.previewUrl} alt="Logo da organização" fill className="object-cover" />
								) : (
									<div className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground">
										<ImageIcon className="h-8 w-8 opacity-50" />
										<span className="text-[10px] font-medium">SEM LOGO</span>
									</div>
								)}
								{userHasEditPermissions && (
									<label
										htmlFor="logo-upload"
										className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
									>
										<Camera className="h-6 w-6 text-white" />
										<span className="mt-1 text-[10px] font-medium text-white">ALTERAR</span>
										<input
											id="logo-upload"
											type="file"
											accept="image/png, image/jpeg, image/jpg"
											className="sr-only"
											onChange={(e) => {
												const file = e.target.files?.[0];
												if (file) {
													updateLogoHolder({
														file,
														previewUrl: URL.createObjectURL(file),
													});
												}
											}}
										/>
									</label>
								)}
							</div>
						</div>
					</div>

					{/* Fields */}
					<div className="flex-1 grid gap-4">
						<TextInput
							label="NOME DA ORGANIZAÇÃO"
							value={state.organization.nome}
							placeholder="Nome da sua empresa"
							handleChange={(val) => updateOrgState({ nome: val })}
							editable={userHasEditPermissions}
						/>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<TextInput
								label="CNPJ"
								value={state.organization.cnpj ? formatToCPForCNPJ(state.organization.cnpj) : ""}
								placeholder="00.000.000/0000-00"
								handleChange={() => {}}
								editable={false}
								holderClassName="bg-muted/50"
							/>
							<TextInput
								label="TELEFONE"
								value={state.organization.telefone || ""}
								placeholder="(00) 00000-0000"
								handleChange={(val) => updateOrgState({ telefone: formatToPhone(val) })}
								editable={userHasEditPermissions}
							/>
						</div>
						<TextInput
							label="EMAIL DE CONTATO"
							value={state.organization.email || ""}
							placeholder="contato@empresa.com"
							handleChange={(val) => updateOrgState({ email: val })}
							editable={userHasEditPermissions}
						/>
					</div>
				</div>
			</SectionWrapper>

			{/* ------------------------------------------------------------------ */}
			{/* PREFERÊNCIAS                                                        */}
			{/* ------------------------------------------------------------------ */}
			<SectionWrapper title="PREFERÊNCIAS" icon={<Settings2 className="h-4 w-4" />}>
				<div className="flex flex-col gap-6">
					<MultipleSelectInput
						label="DESTINATÁRIOS DE RELATÓRIOS"
						selected={state.organization.configuracao.preferencias.relatoriosDestinatariosIds ?? []}
						options={
							users?.map((user) => ({
								id: user.id,
								label: user.nome,
								value: user.id,
								startContent: (
									<Avatar className="w-4 h-4 min-w-4 min-h-4">
										<AvatarImage src={user.avatarUrl ?? undefined} />
										<AvatarFallback>{formatNameAsInitials(user.nome)}</AvatarFallback>
									</Avatar>
								),
							})) ?? []
						}
						resetOptionLabel="Selecione os destinatários"
						handleChange={(value) => updatePreferencias({ relatoriosDestinatariosIds: value })}
						onReset={() => updatePreferencias({ relatoriosDestinatariosIds: null })}
						editable={userHasEditPermissions}
					/>

					{/* Carteira de clientes */}
					<div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-4 py-3">
						<div className="flex flex-col gap-0.5">
							<span className="text-sm font-medium tracking-tight">CARTEIRA DE CLIENTES</span>
							<span className="text-xs text-muted-foreground">Habilita a &quot;Carteira de Clientes&quot; — fila diária de atendimentos e follow-ups por vendedor.</span>
						</div>
						<Switch
							checked={carteirasClientesConfig.habilitado}
							onCheckedChange={(checked) => userHasEditPermissions && updateCarteirasClientes({ habilitado: checked })}
							disabled={!userHasEditPermissions}
						/>
					</div>

					{/* Message limit */}
					<div className={cn("flex w-full flex-col gap-1")}>
						<h3 className={cn("text-sm font-medium tracking-tight text-foreground/80")}>LIMITE DE ENVIOS DE MENSAGEM VIA CAMPANHA (POR SEMANA)</h3>
						<div className="w-full flex items-center justify-start flex-wrap gap-x-2 gap-y-1">
							<Button
								variant={!state.organization.configuracao.preferencias.limiteMensagensSemanaisViaCampanhas ? "default" : "ghost"}
								size={"fit"}
								className={cn("px-2 py-1 rounded-lg text-xs", {
									"opacity-100": !state.organization.configuracao.preferencias.limiteMensagensSemanaisViaCampanhas,
									"opacity-50": !!state.organization.configuracao.preferencias.limiteMensagensSemanaisViaCampanhas,
								})}
								onClick={() => updatePreferencias({ limiteMensagensSemanaisViaCampanhas: null })}
							>
								SEM LIMITE
							</Button>
							{[300, 500, 1000].map((limit) => (
								<Button
									key={limit}
									variant={state.organization.configuracao.preferencias.limiteMensagensSemanaisViaCampanhas === limit ? "default" : "ghost"}
									size={"fit"}
									className={cn("px-2 py-1 rounded-lg text-xs", {
										"opacity-100": state.organization.configuracao.preferencias.limiteMensagensSemanaisViaCampanhas === limit,
										"opacity-50": state.organization.configuracao.preferencias.limiteMensagensSemanaisViaCampanhas !== limit,
									})}
									onClick={() => updatePreferencias({ limiteMensagensSemanaisViaCampanhas: limit })}
								>
									{limit}
								</Button>
							))}
							<Button
								variant={isCustomMessageSendingLimit ? "default" : "ghost"}
								size={"fit"}
								className={cn("px-2 py-1 rounded-lg text-xs", {
									"opacity-100": isCustomMessageSendingLimit,
									"opacity-50": !isCustomMessageSendingLimit,
								})}
								onClick={() => updatePreferencias({ limiteMensagensSemanaisViaCampanhas: 1500 })}
							>
								PERSONALIZADO
							</Button>
						</div>
						{isCustomMessageSendingLimit ? (
							<NumberInput
								label="LIMITE DE ENVIOS POR SEMANA"
								showLabel={false}
								value={state.organization.configuracao.preferencias.limiteMensagensSemanaisViaCampanhas ?? null}
								placeholder="Preencha aqui o valor do limite de envios por semana..."
								handleChange={(value) => updatePreferencias({ limiteMensagensSemanaisViaCampanhas: value })}
							/>
						) : null}
					</div>

					{/* rastreamentoEstoque — ERP only */}
					{hasErpAccess && (
						<>
							<div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-4 py-3">
								<div className="flex flex-col gap-0.5">
									<span className="text-sm font-medium tracking-tight">RASTREAMENTO DE ESTOQUE</span>
									<span className="text-xs text-muted-foreground">Habilita o controle e rastreamento de estoque para os produtos da organização.</span>
								</div>
								<Switch
									checked={state.organization.configuracao.preferencias.rastreamentoEstoque}
									onCheckedChange={(checked) => userHasEditPermissions && updatePreferencias({ rastreamentoEstoque: checked })}
									disabled={!userHasEditPermissions}
								/>
							</div>
							<div className="flex flex-col gap-3">
								<div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-4 py-3">
									<div className="flex flex-col gap-0.5">
										<span className="text-sm font-medium tracking-tight">SESSÕES DE VENDA</span>
										<span className="text-xs text-muted-foreground">Habilita abertura, movimentação e fechamento de caixa no balcão.</span>
									</div>
									<Switch
										checked={sessoesVendaConfig.habilitado}
										onCheckedChange={(checked) => userHasEditPermissions && updateSessoesVenda({ habilitado: checked })}
										disabled={!userHasEditPermissions}
									/>
								</div>

								{sessoesVendaConfig.habilitado ? (
									<div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/10 p-4">
										<p className="text-xs text-muted-foreground">Ajustes de operação do caixa. O escopo atual é por vendedor responsável.</p>

										<div className="flex items-center justify-between rounded-lg border border-border/70 bg-background px-4 py-3">
											<div className="flex flex-col gap-0.5">
												<span className="text-sm font-medium tracking-tight">CAIXA OBRIGATÓRIO</span>
												<span className="text-xs text-muted-foreground">Bloqueia novas vendas até que o vendedor abra uma sessão de caixa.</span>
											</div>
											<Switch
												checked={sessoesVendaConfig.obrigatorio}
												onCheckedChange={(checked) => userHasEditPermissions && updateSessoesVenda({ obrigatorio: checked })}
												disabled={!userHasEditPermissions}
											/>
										</div>

										<div className="flex items-center justify-between rounded-lg border border-border/70 bg-background px-4 py-3">
											<div className="flex flex-col gap-0.5">
												<span className="text-sm font-medium tracking-tight">EXIGIR FUNDO DE TROCO</span>
												<span className="text-xs text-muted-foreground">Solicita saldo inicial ao abrir o caixa.</span>
											</div>
											<Switch
												checked={sessoesVendaConfig.exigirFundoTroco}
												onCheckedChange={(checked) => userHasEditPermissions && updateSessoesVenda({ exigirFundoTroco: checked })}
												disabled={!userHasEditPermissions}
											/>
										</div>

										<div className="flex items-center justify-between rounded-lg border border-border/70 bg-background px-4 py-3">
											<div className="flex flex-col gap-0.5">
												<span className="text-sm font-medium tracking-tight">CONFERÊNCIA CEGA</span>
												<span className="text-xs text-muted-foreground">Oculta os valores esperados até o operador informar a contagem do caixa.</span>
											</div>
											<Switch
												checked={sessoesVendaConfig.conferenciaCega}
												onCheckedChange={(checked) => userHasEditPermissions && updateSessoesVenda({ conferenciaCega: checked })}
												disabled={!userHasEditPermissions}
											/>
										</div>

										<div className="flex items-center justify-between rounded-lg border border-border/70 bg-background px-4 py-3">
											<div className="flex flex-col gap-0.5">
												<span className="text-sm font-medium tracking-tight">BLOQUEAR FECHAMENTO COM PENDÊNCIA FISCAL</span>
												<span className="text-xs text-muted-foreground">Impede fechar o caixa enquanto houver notas fiscais pendentes no turno.</span>
											</div>
											<Switch
												checked={sessoesVendaConfig.bloquearFechamentoComPendenciaFiscal}
												onCheckedChange={(checked) => userHasEditPermissions && updateSessoesVenda({ bloquearFechamentoComPendenciaFiscal: checked })}
												disabled={!userHasEditPermissions}
											/>
										</div>
									</div>
								) : null}
							</div>

							<div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-4 py-3">
								<div className="flex flex-col gap-0.5">
									<span className="text-sm font-medium tracking-tight">CONTAS DE ATENDIMENTO</span>
									<span className="text-xs text-muted-foreground">
										Habilita pontos de atendimento e contas de consumo (mesas, comandas, quartos) com pedidos acumulados e fechamento único. O modo de
										operação e os pedidos via QR Code são configurados dentro do módulo.
									</span>
								</div>
								<Switch
									checked={contasAtendimentoConfig.habilitado}
									onCheckedChange={(checked) => userHasEditPermissions && updatePreferencias({ contasAtendimento: { habilitado: checked } })}
									disabled={!userHasEditPermissions}
								/>
							</div>
						</>
					)}
				</div>
			</SectionWrapper>

			{/* ------------------------------------------------------------------ */}
			{/* IDENTIDADE VISUAL                                                   */}
			{/* ------------------------------------------------------------------ */}
			<SectionWrapper title="IDENTIDADE VISUAL" icon={<Palette className="h-4 w-4" />}>
				{/* Colors Inputs */}
				<div className="flex flex-col gap-6">
					{/* Primary Colors */}
					<div className="flex flex-col gap-3">
						<h4 className="text-xs font-bold uppercase text-muted-foreground">Cores Primárias</h4>
						<div className="space-y-2">
							<Label className="text-xs font-medium">COR DE FUNDO</Label>
							<div className="flex items-center gap-3">
								<div className="relative h-10 w-10 overflow-hidden rounded-lg border shadow-sm">
									<input
										type="color"
										value={primaryColor}
										onChange={(e) => userHasEditPermissions && updateOrgState({ corPrimaria: e.target.value })}
										disabled={!userHasEditPermissions}
										className="absolute -inset-2 h-[200%] w-[200%] cursor-pointer"
									/>
								</div>
								<Input
									value={primaryColor}
									onChange={(e) => userHasEditPermissions && updateOrgState({ corPrimaria: e.target.value })}
									disabled={!userHasEditPermissions}
									className="font-mono uppercase"
									maxLength={7}
								/>
							</div>
						</div>

						<div className="space-y-2">
							<Label className="text-xs font-medium">COR DO TEXTO</Label>
							<div className="flex items-center gap-3">
								<div className="relative h-10 w-10 overflow-hidden rounded-lg border shadow-sm">
									<input
										type="color"
										value={primaryForegroundColor}
										onChange={(e) => userHasEditPermissions && updateOrgState({ corPrimariaForeground: e.target.value })}
										disabled={!userHasEditPermissions}
										className="absolute -inset-2 h-[200%] w-[200%] cursor-pointer"
									/>
								</div>
								<Input
									value={primaryForegroundColor}
									onChange={(e) => userHasEditPermissions && updateOrgState({ corPrimariaForeground: e.target.value })}
									disabled={!userHasEditPermissions}
									className="font-mono uppercase"
									maxLength={7}
								/>
							</div>
						</div>
					</div>

					{/* Secondary Colors */}
					<div className="flex flex-col gap-3">
						<h4 className="text-xs font-bold uppercase text-muted-foreground">Cores Secundárias</h4>
						<div className="space-y-2">
							<Label className="text-xs font-medium">COR DE FUNDO</Label>
							<div className="flex items-center gap-3">
								<div className="relative h-10 w-10 overflow-hidden rounded-lg border shadow-sm">
									<input
										type="color"
										value={secondaryColor}
										onChange={(e) => userHasEditPermissions && updateOrgState({ corSecundaria: e.target.value })}
										disabled={!userHasEditPermissions}
										className="absolute -inset-2 h-[200%] w-[200%] cursor-pointer"
									/>
								</div>
								<Input
									value={secondaryColor}
									onChange={(e) => userHasEditPermissions && updateOrgState({ corSecundaria: e.target.value })}
									disabled={!userHasEditPermissions}
									className="font-mono uppercase"
									maxLength={7}
								/>
							</div>
						</div>

						<div className="space-y-2">
							<Label className="text-xs font-medium">COR DO TEXTO</Label>
							<div className="flex items-center gap-3">
								<div className="relative h-10 w-10 overflow-hidden rounded-lg border shadow-sm">
									<input
										type="color"
										value={secondaryForegroundColor}
										onChange={(e) => userHasEditPermissions && updateOrgState({ corSecundariaForeground: e.target.value })}
										disabled={!userHasEditPermissions}
										className="absolute -inset-2 h-[200%] w-[200%] cursor-pointer"
									/>
								</div>
								<Input
									value={secondaryForegroundColor}
									onChange={(e) => userHasEditPermissions && updateOrgState({ corSecundariaForeground: e.target.value })}
									disabled={!userHasEditPermissions}
									className="font-mono uppercase"
									maxLength={7}
								/>
							</div>
						</div>
					</div>
				</div>

				{/* Mini Preview */}
				<div className="flex flex-col gap-3">
					<span className="text-xs font-medium">PRÉ-VISUALIZAÇÃO</span>
					<div className="flex flex-col gap-3">
						<div className="flex flex-col gap-1">
							<span className="text-xs text-muted-foreground">BOTÃO COM COR PRIMÁRIA</span>
							<div
								className="px-6 py-3 rounded-lg text-sm font-bold inline-block w-fit shadow-sm"
								style={{ backgroundColor: primaryColor, color: primaryForegroundColor }}
							>
								GANHAR CASHBACK
							</div>
						</div>

						<div className="flex flex-col gap-1">
							<span className="text-xs text-muted-foreground">BARRA DE PROGRESSO</span>
							<div className="h-6 w-full rounded-md overflow-hidden bg-gray-100">
								<div
									className="h-full w-[65%] rounded-md"
									style={{
										background: `linear-gradient(to right, ${hexToRgba(primaryColor, 0.6)}, ${primaryColor})`,
									}}
								/>
							</div>
						</div>

						<div className="flex flex-col gap-1">
							<span className="text-xs text-muted-foreground">CORES DOS GRÁFICOS</span>
							<div className="flex items-center gap-4">
								<div className="flex items-center gap-2">
									<div className="w-4 h-4 rounded" style={{ backgroundColor: primaryColor }} />
									<span className="text-xs">Período Atual</span>
								</div>
								<div className="flex items-center gap-2">
									<div className="w-4 h-4 rounded" style={{ backgroundColor: secondaryColor }} />
									<span className="text-xs">Período Anterior</span>
								</div>
							</div>
						</div>

						<div className="flex flex-col gap-1">
							<span className="text-xs text-muted-foreground">VALORES DE ESTATÍSTICAS (COR SECUNDÁRIA)</span>
							<div className="text-2xl font-bold px-3 py-2 rounded w-fit" style={{ backgroundColor: secondaryColor, color: secondaryForegroundColor }}>
								R$ 129.513,28
							</div>
						</div>

						<div className="flex flex-col gap-1">
							<span className="text-xs text-muted-foreground">MAPAS DE CALOR</span>
							<div className="flex gap-1">
								{[0.2, 0.4, 0.6, 0.8, 1].map((opacity, index) => (
									<div
										key={index.toString()}
										className="w-8 h-8 rounded border border-border flex items-center justify-center text-[0.6rem] font-bold"
										style={{ backgroundColor: hexToRgba(primaryColor, opacity) }}
									>
										{index + 1}
									</div>
								))}
							</div>
						</div>
					</div>
				</div>
			</SectionWrapper>

			{/* ------------------------------------------------------------------ */}
			{/* PADRÕES ERP — only visible when erp.acesso = true                  */}
			{/* ------------------------------------------------------------------ */}
			{hasErpAccess && (
				<SectionWrapper title="PADRÕES ERP" icon={<Database className="h-4 w-4" />}>
					<div className="flex flex-col gap-8">
						{/* ---- Contabilidade ---- */}
						<div className="flex flex-col gap-4">
							<div className="flex flex-col gap-0.5">
								<h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Lançamentos Contábeis Padrão</h4>
								<p className="text-xs text-muted-foreground">Contas de débito e crédito padrão utilizadas na geração automática de lançamentos.</p>
							</div>

							{(["vendas", "compras"] as const).map((tipo) => {
								const entry = lancamentosPadrao[tipo];
								const debitoOption = accountChartsOptions.find((o) => o.value === entry.debitoContaId) ?? null;
								const creditoOption = accountChartsOptions.find((o) => o.value === entry.creditoContaId) ?? null;
								console.log(entry, debitoOption, creditoOption);
								return (
									<div key={tipo} className="rounded-lg border border-border bg-muted/20 p-4 flex flex-col gap-3">
										<span className="text-xs font-semibold uppercase tracking-wider text-foreground">{tipo === "vendas" ? "Vendas" : "Compras"}</span>
										<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
											<SelectInput
												label="CONTA DE DÉBITO PADRÃO"
												value={debitoOption?.value ?? null}
												options={accountChartsOptions}
												resetOptionLabel="Nenhuma conta"
												editable={userHasEditPermissions}
												handleChange={(val) => {
													const acc = accountChartsOptions.find((o) => o.value === val);
													updateAccountingField(tipo, "debitoContaId", acc?.value ?? null);
													updateAccountingField(tipo, "debitoContaKey", acc?.label ?? null);
												}}
												onReset={() => {
													updateAccountingField(tipo, "debitoContaId", null);
													updateAccountingField(tipo, "debitoContaKey", null);
												}}
											/>
											<SelectInput
												label="CONTA DE CRÉDITO PADRÃO"
												value={creditoOption?.value ?? null}
												options={accountChartsOptions}
												resetOptionLabel="Nenhuma conta"
												editable={userHasEditPermissions}
												handleChange={(val) => {
													const acc = accountChartsOptions.find((o) => o.value === val);
													updateAccountingField(tipo, "creditoContaId", acc?.value ?? null);
													updateAccountingField(tipo, "creditoContaKey", acc?.label ?? null);
												}}
												onReset={() => {
													updateAccountingField(tipo, "creditoContaId", null);
													updateAccountingField(tipo, "creditoContaKey", null);
												}}
											/>
										</div>
									</div>
								);
							})}
						</div>

						{/* ---- Métodos de Pagamento ---- */}
						<div className="flex flex-col gap-4">
							<div className="flex flex-col gap-0.5">
								<h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Métodos de Pagamento</h4>
								<p className="text-xs text-muted-foreground">Configure os padrões de cada método de pagamento utilizado na organização.</p>
							</div>
							<div className="flex flex-col gap-2">
								{SalePaymentMethodsOptions.map((option) => {
									const methodData = state.organization.configuracao.defaults.pagamentos.metodos[option.value];
									if (!methodData) return null;
									return (
										<PaymentMethodCard
											key={option.value}
											methodOption={option}
											methodData={methodData}
											financialAccountOptions={financialAccountOptions}
											editable={userHasEditPermissions}
											onChange={updatePaymentMethod}
										/>
									);
								})}
							</div>
						</div>
					</div>
				</SectionWrapper>
			)}
		</div>
	);
}
