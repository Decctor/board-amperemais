import { OrganizationSchema } from "@/schemas/organizations";
import { useCallback, useMemo, useState } from "react";
import { z } from "zod";

const OrganizationOnboardingStateSchema = z.object({
	stage: z.enum(["organization-general-info", "organization-niche-origin", "organization-actuation", "subscription-plans-section"]),
	organization: OrganizationSchema.omit({ dataInsercao: true, autorId: true, configuracao: true }),
	organizationLogoHolder: z.object({
		file: z.instanceof(File).optional().nullable(),
		previewUrl: z.string({ invalid_type_error: "Tipo não válido para a url do preview do logo da organização." }).optional().nullable(),
	}),
	subscription: z
		.enum(["ESSENCIAL-MONTHLY", "ESSENCIAL-YEARLY", "CRESCIMENTO-MONTHLY", "CRESCIMENTO-YEARLY", "ESCALA-MONTHLY", "ESCALA-YEARLY", "FREE-TRIAL"])
		.optional()
		.nullable(),
});
export type TOrganizationOnboardingState = z.infer<typeof OrganizationOnboardingStateSchema>;

type TUseOrganizationOnboardingStateProps = {
	initialState?: Partial<TOrganizationOnboardingState>;
};
export function useOrganizationOnboardingState({ initialState }: TUseOrganizationOnboardingStateProps) {
	const start: TOrganizationOnboardingState = useMemo(
		() => ({
			stage: "organization-general-info",
			organization: {
				nome: initialState?.organization?.nome ?? "",
				cnpj: initialState?.organization?.cnpj ?? "",
				atuacaoCanais: initialState?.organization?.atuacaoCanais ?? "",
				atuacaoNicho: initialState?.organization?.atuacaoNicho ?? "",
				origemLead: initialState?.organization?.origemLead ?? "",
				plataformasUtilizadas: initialState?.organization?.plataformasUtilizadas ?? "",
				tamanhoBaseClientes: initialState?.organization?.tamanhoBaseClientes ?? 0,
				assinaturaPlano: initialState?.organization?.assinaturaPlano ?? null,
				dadosViaERP: initialState?.organization?.dadosViaERP ?? false,
				dadosViaPDI: initialState?.organization?.dadosViaPDI ?? false,
				dadosViaIntegracoes: initialState?.organization?.dadosViaIntegracoes ?? false,
				telefone: initialState?.organization?.telefone ?? null,
				email: initialState?.organization?.email ?? null,
				localizacaoCep: initialState?.organization?.localizacaoCep ?? null,
				localizacaoEstado: initialState?.organization?.localizacaoEstado ?? null,
				localizacaoCidade: initialState?.organization?.localizacaoCidade ?? null,
				localizacaoBairro: initialState?.organization?.localizacaoBairro ?? null,
				localizacaoLogradouro: initialState?.organization?.localizacaoLogradouro ?? null,
				periodoTesteInicio: initialState?.organization?.periodoTesteInicio ?? null,
				periodoTesteFim: initialState?.organization?.periodoTesteFim ?? null,
			},
			organizationLogoHolder: {
				file: initialState?.organizationLogoHolder?.file ?? null,
				previewUrl: initialState?.organizationLogoHolder?.previewUrl ?? null,
			},
			subscription: initialState?.subscription ?? null,
		}),
		[initialState],
	);

	const [state, setState] = useState<TOrganizationOnboardingState>(start);

	const updateOrganization = useCallback((organization: Partial<TOrganizationOnboardingState["organization"]>) => {
		setState((prev) => ({
			...prev,
			organization: {
				...prev.organization,
				...organization,
			},
		}));
	}, []);

	const updateOrganizationLogoHolder = useCallback((organizationLogoHolder: Partial<TOrganizationOnboardingState["organizationLogoHolder"]>) => {
		setState((prev) => ({
			...prev,
			organizationLogoHolder: {
				...prev.organizationLogoHolder,
				...organizationLogoHolder,
			},
		}));
	}, []);

	const resetState = useCallback(() => {
		setState(start);
	}, [start]);

	const redefineState = useCallback((state: TOrganizationOnboardingState) => {
		setState(state);
	}, []);

	const updateOrganizationOnboarding = useCallback((changes: Partial<TOrganizationOnboardingState>) => {
		setState((prev) => ({
			...prev,
			...changes,
		}));
	}, []);

	const goToNextStage = useCallback(() => {
		setState((prev) => {
			if (prev.stage === "organization-general-info") return { ...prev, stage: "organization-niche-origin" };
			if (prev.stage === "organization-niche-origin") return { ...prev, stage: "organization-actuation" };
			if (prev.stage === "organization-actuation") return { ...prev, stage: "subscription-plans-section" };
			return prev;
		});
	}, []);

	const goToPreviousStage = useCallback(() => {
		setState((prev) => {
			if (prev.stage === "organization-niche-origin") return { ...prev, stage: "organization-general-info" };
			if (prev.stage === "organization-actuation") return { ...prev, stage: "organization-niche-origin" };
			if (prev.stage === "subscription-plans-section") return { ...prev, stage: "organization-actuation" };
			return prev;
		});
	}, []);

	return {
		state,
		updateOrganization,
		updateOrganizationLogoHolder,
		updateOrganizationOnboarding,
		goToNextStage,
		goToPreviousStage,
		resetState,
		redefineState,
	};
}

export type TUseOrganizationOnboardingState = ReturnType<typeof useOrganizationOnboardingState>;
