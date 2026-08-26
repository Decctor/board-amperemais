import { getOrganizationNicheByValue } from "@/config/onboarding";
import { OnboardingCampaignPresets, type TOnboardingCampaignPresetKey } from "@/config/onboarding-campaign-presets";
import { ONBOARDING_STAGES, type TOnboardingStage } from "@/app/onboarding/_lib/stages";
import { OrganizationSchema } from "@/schemas/organizations";
import { useCallback, useMemo, useState } from "react";
import { z } from "zod";

const CashbackConfigSchema = z.object({
	ativo: z.boolean(),
	titulo: z.string(),
	terminologia: z.enum(["DINHEIRO", "PONTOS"]),
	modalidadeDescontosPermitida: z.boolean(),
	modalidadeRecompensasPermitida: z.boolean(),
	acumuloTipo: z.enum(["FIXO", "PERCENTUAL"]),
	acumuloValor: z.number(),
	acumuloRegraValorMinimo: z.number(),
	acumuloValorParceiro: z.number(),
	acumuloPermitirViaIntegracao: z.boolean(),
	acumuloPermitirViaPontoIntegracao: z.boolean(),
	expiracaoRegraValidadeValor: z.number(),
	resgateLimiteTipo: z.enum(["FIXO", "PERCENTUAL"]).nullable(),
	resgateLimiteValor: z.number().nullable(),
});
export type TOnboardingCashbackConfig = z.infer<typeof CashbackConfigSchema>;

const DataSourceSchema = z.object({
	mode: z.enum(["INTEGRATION", "POI"]).nullable(),
	integrationKey: z.string().nullable(),
	// Tipos das conexões de fonte de dados já ativas (retomada pós-OAuth) — podem ser N.
	integracoesConectadas: z.array(z.string()),
});

const OrganizationOnboardingStateSchema = z.object({
	stage: z.enum(ONBOARDING_STAGES),
	organization: OrganizationSchema.omit({ dataInsercao: true, autorId: true, configuracao: true, dataOnboardingConclusao: true }),
	organizationLogoHolder: z.object({
		file: z.instanceof(File).optional().nullable(),
		previewUrl: z.string().optional().nullable(),
	}),
	cashback: CashbackConfigSchema,
	selectedCampaignKeys: z.array(z.string()),
	dataSource: DataSourceSchema,
	indicadorCodigo: z.string().optional().nullable(),
	termsAccepted: z.boolean(),
});
export type TOrganizationOnboardingState = z.infer<typeof OrganizationOnboardingStateSchema>;

export const DEFAULT_ONBOARDING_CASHBACK_CONFIG: TOnboardingCashbackConfig = {
	ativo: false,
	titulo: "",
	terminologia: "DINHEIRO",
	modalidadeDescontosPermitida: true,
	modalidadeRecompensasPermitida: true,
	acumuloTipo: "PERCENTUAL",
	acumuloValor: 5,
	acumuloRegraValorMinimo: 0,
	acumuloValorParceiro: 0,
	acumuloPermitirViaIntegracao: false,
	acumuloPermitirViaPontoIntegracao: true,
	expiracaoRegraValidadeValor: 60,
	resgateLimiteTipo: "PERCENTUAL",
	resgateLimiteValor: 30,
};

/** Builds a cashback config pre-filled from the niche preset (keeps the merchant's `ativo` choice). */
export function buildCashbackConfigFromNiche(
	nicheValue: string | null | undefined,
	organizationName: string,
	ativo: boolean,
): TOnboardingCashbackConfig {
	const preset = nicheValue ? getOrganizationNicheByValue(nicheValue)?.cashbackProgramDefault : null;
	return {
		...DEFAULT_ONBOARDING_CASHBACK_CONFIG,
		...preset,
		ativo,
		titulo: organizationName ? `Programa de Cashback ${organizationName}` : "Nosso programa de fidelidade",
	};
}

type TExistingOrganization = Partial<TOrganizationOnboardingState["organization"]> & {
	id?: string | null;
	/** Tipos das conexões de fonte de dados ativas em `integrations` (retomada pós-OAuth). */
	integracoesAtivas?: string[] | null;
};

type TUseOrganizationOnboardingStateProps = {
	initialStage?: TOnboardingStage;
	existingOrganization?: TExistingOrganization | null;
};

export function useOrganizationOnboardingState({ initialStage, existingOrganization }: TUseOrganizationOnboardingStateProps) {
	const start: TOrganizationOnboardingState = useMemo(() => {
		const org = existingOrganization;
		return {
			stage: initialStage ?? "organization-general-info",
			organization: {
				nome: org?.nome ?? "",
				cnpj: org?.cnpj ?? "",
				slug: org?.slug ?? "",
				atuacaoCanais: org?.atuacaoCanais ?? "",
				atuacaoNicho: org?.atuacaoNicho ?? "",
				origemLead: org?.origemLead ?? "",
				plataformasUtilizadas: org?.plataformasUtilizadas ?? "",
				tamanhoBaseClientes: org?.tamanhoBaseClientes ?? 0,
				assinaturaPlano: null,
				dadosViaERP: false,
				dadosViaPDI: org?.dadosViaPDI ?? false,
				dadosViaIntegracoes: false,
				origemDadosPadrao: "RECEPTOR",
				fiscalEmissaoAutomatica: false,
				fiscalProvedor: null,
				fiscalConfiguracao: null,
				telefone: org?.telefone ?? null,
				email: org?.email ?? null,
				localizacaoCep: null,
				localizacaoEstado: null,
				localizacaoCidade: null,
				localizacaoBairro: null,
				localizacaoLogradouro: null,
				localizacaoNumero: null,
				localizacaoComplemento: null,
				periodoTesteInicio: null,
				periodoTesteFim: null,
				corPrimaria: null,
				corPrimariaForeground: null,
				corSecundaria: null,
				corSecundariaForeground: null,
				integracaoTipo: null,
				integracaoConfiguracao: null,
				integracaoDataUltimaSincronizacao: null,
				logoUrl: org?.logoUrl ?? null,
				poiQrCodeKioskDataUrl: null,
				poiQrCodeMobileDataUrl: null,
				poiConfirmacaoValorObrigatoria: false,
			},
			organizationLogoHolder: { file: null, previewUrl: null },
			cashback: buildCashbackConfigFromNiche(org?.atuacaoNicho, org?.nome ?? "", false),
			selectedCampaignKeys: OnboardingCampaignPresets.filter((preset) => preset.defaultSelected).map((preset) => preset.key),
			dataSource: { mode: null, integrationKey: null, integracoesConectadas: org?.integracoesAtivas ?? [] },
			indicadorCodigo: null,
			termsAccepted: false,
		};
	}, [initialStage, existingOrganization]);

	const [state, setState] = useState<TOrganizationOnboardingState>(start);

	const updateOrganization = useCallback((organization: Partial<TOrganizationOnboardingState["organization"]>) => {
		setState((prev) => ({ ...prev, organization: { ...prev.organization, ...organization } }));
	}, []);

	const updateOrganizationLogoHolder = useCallback((organizationLogoHolder: Partial<TOrganizationOnboardingState["organizationLogoHolder"]>) => {
		setState((prev) => ({ ...prev, organizationLogoHolder: { ...prev.organizationLogoHolder, ...organizationLogoHolder } }));
	}, []);

	const updateOnboarding = useCallback((changes: Partial<TOrganizationOnboardingState>) => {
		setState((prev) => ({ ...prev, ...changes }));
	}, []);

	const updateCashback = useCallback((cashback: Partial<TOnboardingCashbackConfig>) => {
		setState((prev) => ({ ...prev, cashback: { ...prev.cashback, ...cashback } }));
	}, []);

	const applyCashbackPresetFromNiche = useCallback(() => {
		setState((prev) => ({
			...prev,
			cashback: buildCashbackConfigFromNiche(prev.organization.atuacaoNicho, prev.organization.nome, prev.cashback.ativo),
		}));
	}, []);

	const toggleCampaign = useCallback((key: TOnboardingCampaignPresetKey) => {
		setState((prev) => ({
			...prev,
			selectedCampaignKeys: prev.selectedCampaignKeys.includes(key)
				? prev.selectedCampaignKeys.filter((item) => item !== key)
				: [...prev.selectedCampaignKeys, key],
		}));
	}, []);

	const updateDataSource = useCallback((dataSource: Partial<TOrganizationOnboardingState["dataSource"]>) => {
		setState((prev) => ({ ...prev, dataSource: { ...prev.dataSource, ...dataSource } }));
	}, []);

	const setStage = useCallback((stage: TOnboardingStage) => {
		setState((prev) => ({ ...prev, stage }));
	}, []);

	const goToNextStage = useCallback(() => {
		setState((prev) => {
			const index = ONBOARDING_STAGES.indexOf(prev.stage);
			const next = ONBOARDING_STAGES[Math.min(index + 1, ONBOARDING_STAGES.length - 1)];
			return { ...prev, stage: next };
		});
	}, []);

	const goToPreviousStage = useCallback(() => {
		setState((prev) => {
			const index = ONBOARDING_STAGES.indexOf(prev.stage);
			const previous = ONBOARDING_STAGES[Math.max(index - 1, 0)];
			return { ...prev, stage: previous };
		});
	}, []);

	return {
		state,
		updateOrganization,
		updateOrganizationLogoHolder,
		updateOnboarding,
		updateCashback,
		applyCashbackPresetFromNiche,
		toggleCampaign,
		updateDataSource,
		setStage,
		goToNextStage,
		goToPreviousStage,
	};
}

export type TUseOrganizationOnboardingState = ReturnType<typeof useOrganizationOnboardingState>;
