"use client";

import { OrganizationFiscalConfigSchema } from "@/schemas/fiscal";
import { z } from "zod";
import { useCallback, useState } from "react";

const InternalFiscalSettingsStateSchema = z.object({
	fiscalProvedor: z.enum(["MANUAL", "NUVEM_FISCAL"]).default("MANUAL"),
	fiscalEmissaoAutomatica: z.boolean().default(false),
	fiscalConfiguracao: OrganizationFiscalConfigSchema,
});

type TInternalFiscalSettingsState = z.infer<typeof InternalFiscalSettingsStateSchema>;

export function useInternalFiscalSettingsState({ initialState }: { initialState: Partial<TInternalFiscalSettingsState> }) {
	const [state, setState] = useState<TInternalFiscalSettingsState>({
		fiscalProvedor: initialState.fiscalProvedor ?? "MANUAL",
		fiscalEmissaoAutomatica: initialState.fiscalEmissaoAutomatica ?? false,
		fiscalConfiguracao:
			initialState.fiscalConfiguracao ??
			OrganizationFiscalConfigSchema.parse({
				nomeRazaoSocial: "",
				cpfCnpj: "",
				endereco: {
					logradouro: "",
					numero: "",
					bairro: "",
					codigoMunicipio: "",
					cidade: "",
					uf: "",
					cep: "",
				},
				regimeTributario: 1,
			}),
	});

	const updateSettings = useCallback((patch: Partial<TInternalFiscalSettingsState>) => {
		setState((prev) => ({ ...prev, ...patch }));
	}, []);

	const updateFiscalConfig = useCallback((patch: Partial<TInternalFiscalSettingsState["fiscalConfiguracao"]>) => {
		setState((prev) => ({
			...prev,
			fiscalConfiguracao: {
				...prev.fiscalConfiguracao,
				...patch,
			},
		}));
	}, []);

	const redefineState = useCallback((nextState: Partial<TInternalFiscalSettingsState>) => {
		setState((prev) => ({ ...prev, ...nextState }));
	}, []);

	const resetState = useCallback(() => {
		setState({
			fiscalProvedor: initialState.fiscalProvedor ?? "MANUAL",
			fiscalEmissaoAutomatica: initialState.fiscalEmissaoAutomatica ?? false,
			fiscalConfiguracao:
				initialState.fiscalConfiguracao ??
				OrganizationFiscalConfigSchema.parse({
					nomeRazaoSocial: "",
					cpfCnpj: "",
					endereco: {
						logradouro: "",
						numero: "",
						bairro: "",
						codigoMunicipio: "",
						cidade: "",
						uf: "",
						cep: "",
					},
					regimeTributario: 1,
				}),
		});
	}, [initialState.fiscalConfiguracao, initialState.fiscalEmissaoAutomatica, initialState.fiscalProvedor]);

	return {
		state,
		updateSettings,
		updateFiscalConfig,
		redefineState,
		resetState,
	};
}

export type TUseInternalFiscalSettingsState = ReturnType<typeof useInternalFiscalSettingsState>;
