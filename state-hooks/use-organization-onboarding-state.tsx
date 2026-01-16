import { OrganizationSchema } from "@/schemas/organizations";
import { useCallback, useState } from "react";
import { z } from "zod";

const OrganizationOnboardingStateSchema = z.object({
	organization: OrganizationSchema.omit({ dataInsercao: true }),
	organizationLogoHolder: z.object({
		file: z.instanceof(File).optional().nullable(),
		previewUrl: z.string({ invalid_type_error: "Tipo não válido para a url do preview do logo da organização." }).optional().nullable(),
	}),
});
export type TOrganizationOnboardingState = z.infer<typeof OrganizationOnboardingStateSchema>;

type TUseOrganizationOnboardingStateProps = {
	initialState: Partial<TOrganizationOnboardingState>;
};
export function useOrganizationOnboardingState({ initialState }: TUseOrganizationOnboardingStateProps) {
	const start: TOrganizationOnboardingState = {
		organization: {
			nome: initialState?.organization?.nome ?? "",
			cnpj: initialState?.organization?.cnpj ?? "",
			atuacaoCanais: initialState?.organization?.atuacaoCanais ?? "",
			atuacaoNicho: initialState?.organization?.atuacaoNicho ?? "",
			oirgemLeads: initialState?.organization?.oirgemLeads ?? "",
			plataformasUtilizadas: initialState?.organization?.plataformasUtilizadas ?? "",
			tamanhoBaseClientes: initialState?.organization?.tamanhoBaseClientes ?? 0,
			assinaturaPlano: initialState?.organization?.assinaturaPlano ?? null,
			dadosViaERP: initialState?.organization?.dadosViaERP ?? false,
			dadosViaPDI: initialState?.organization?.dadosViaPDI ?? false,
			dadosViaIntegraoes: initialState?.organization?.dadosViaIntegraoes ?? false,
			telefone: initialState?.organization?.telefone ?? null,
			email: initialState?.organization?.email ?? null,
			localizacaoCep: initialState?.organization?.localizacaoCep ?? null,
			localizacaoEstado: initialState?.organization?.localizacaoEstado ?? null,
			localizacaoCidade: initialState?.organization?.localizacaoCidade ?? null,
			localizacaoBairro: initialState?.organization?.localizacaoBairro ?? null,
			localizacaoLogradouro: initialState?.organization?.localizacaoLogradouro ?? null,
		},
		organizationLogoHolder: {
			file: initialState?.organizationLogoHolder?.file ?? null,
			previewUrl: initialState?.organizationLogoHolder?.previewUrl ?? null,
		},
	};
	const [state, setState] = useState<TOrganizationOnboardingState>({
		organization: {
			nome: initialState?.organization?.nome ?? "",
			cnpj: initialState?.organization?.cnpj ?? "",
			atuacaoCanais: initialState?.organization?.atuacaoCanais ?? "",
			atuacaoNicho: initialState?.organization?.atuacaoNicho ?? "",
			oirgemLeads: initialState?.organization?.oirgemLeads ?? "",
			plataformasUtilizadas: initialState?.organization?.plataformasUtilizadas ?? "",
			tamanhoBaseClientes: initialState?.organization?.tamanhoBaseClientes ?? 0,
			assinaturaPlano: initialState?.organization?.assinaturaPlano ?? null,
			dadosViaERP: initialState?.organization?.dadosViaERP ?? false,
			dadosViaPDI: initialState?.organization?.dadosViaPDI ?? false,
			dadosViaIntegraoes: initialState?.organization?.dadosViaIntegraoes ?? false,
			telefone: initialState?.organization?.telefone ?? null,
			email: initialState?.organization?.email ?? null,
			localizacaoCep: initialState?.organization?.localizacaoCep ?? null,
			localizacaoEstado: initialState?.organization?.localizacaoEstado ?? null,
			localizacaoCidade: initialState?.organization?.localizacaoCidade ?? null,
			localizacaoBairro: initialState?.organization?.localizacaoBairro ?? null,
			localizacaoLogradouro: initialState?.organization?.localizacaoLogradouro ?? null,
		},
		organizationLogoHolder: {
			file: initialState?.organizationLogoHolder?.file ?? null,
			previewUrl: initialState?.organizationLogoHolder?.previewUrl ?? null,
		},
	});

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
	}, []);

	const redefineState = useCallback((state: TOrganizationOnboardingState) => {
		setState(state);
	}, []);

	return {
		state,
		updateOrganization,
		updateOrganizationLogoHolder,
		resetState,
		redefineState,
	};
}

export type TUseOrganizationOnboardingState = ReturnType<typeof useOrganizationOnboardingState>;
