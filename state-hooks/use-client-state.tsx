import { ClientLocationSchema, ClientSchema, ClientTagReferenceSchema, ClientTagSchema } from "@/schemas/clients";
import { useCallback, useMemo, useState } from "react";
import z from "zod";

export const ClientLocationStateSchema = ClientLocationSchema.omit({
	organizacaoId: true,
	clienteId: true,
	dataInsercao: true,
}).extend({
	id: z
		.string({
			invalid_type_error: "Tipo não válido para ID da localização.",
		})
		.optional()
		.nullable(),
	deletar: z
		.boolean({
			invalid_type_error: "Tipo não válido para marcador de exclusão.",
		})
		.optional()
		.nullable(),
});

export const ClientStateSchema = z.object({
	client: ClientSchema,
	clientLocations: z.array(ClientLocationStateSchema),
	clientTags: z.array(
		ClientTagReferenceSchema.omit({ clienteId: true, organizacaoId: true }).extend({
			tag: ClientTagSchema.pick({
				titulo: true,
				icone: true,
				cor: true,
				corForeground: true,
			}),
			id: z.string({ invalid_type_error: "Tipo não válido para o ID da tag do cliente." }).optional(),
			deletar: z.boolean({ invalid_type_error: "Tipo não válido para a flag de exclusão da tag do cliente." }).optional(),
		}),
	),
});

export type TClientState = z.infer<typeof ClientStateSchema>;
export type TClientLocationState = TClientState["clientLocations"][number];

type UseClientStateProps = {
	initialState?: Partial<TClientState>;
};

function getDefaultState(initialState?: Partial<TClientState>): TClientState {
	return {
		client: {
			idExterno: initialState?.client?.idExterno ?? null,
			organizacaoId: initialState?.client?.organizacaoId ?? "",
			nome: initialState?.client?.nome ?? "",
			cpfCnpj: initialState?.client?.cpfCnpj ?? null,
			anotacoes: initialState?.client?.anotacoes ?? null,
			inscricaoEstadual: initialState?.client?.inscricaoEstadual ?? null,
			indicadorInscricaoEstadual: initialState?.client?.indicadorInscricaoEstadual ?? "NAO_CONTRIBUINTE",
			suframa: initialState?.client?.suframa ?? null,
			telefone: initialState?.client?.telefone ?? "",
			telefoneBase: initialState?.client?.telefoneBase ?? "",
			email: initialState?.client?.email ?? "",
			websiteUrl: initialState?.client?.websiteUrl ?? null,
			instagram: initialState?.client?.instagram ?? null,
			linkedin: initialState?.client?.linkedin ?? null,
			twitter: initialState?.client?.twitter ?? null,
			localizacaoCep: initialState?.client?.localizacaoCep ?? null,
			localizacaoEstado: initialState?.client?.localizacaoEstado ?? null,
			localizacaoCidade: initialState?.client?.localizacaoCidade ?? null,
			localizacaoBairro: initialState?.client?.localizacaoBairro ?? null,
			localizacaoLogradouro: initialState?.client?.localizacaoLogradouro ?? null,
			localizacaoNumero: initialState?.client?.localizacaoNumero ?? null,
			localizacaoComplemento: initialState?.client?.localizacaoComplemento ?? null,
			canalAquisicao: initialState?.client?.canalAquisicao ?? null,
			primeiraCompraData: initialState?.client?.primeiraCompraData ?? null,
			primeiraCompraId: initialState?.client?.primeiraCompraId ?? "",
			ultimaCompraData: initialState?.client?.ultimaCompraData ?? null,
			ultimaCompraId: initialState?.client?.ultimaCompraId ?? "",
			analiseRFMTitulo: initialState?.client?.analiseRFMTitulo ?? null,
			analiseRFMNotasRecencia: initialState?.client?.analiseRFMNotasRecencia ?? null,
			analiseRFMNotasFrequencia: initialState?.client?.analiseRFMNotasFrequencia ?? null,
			analiseRFMNotasMonetario: initialState?.client?.analiseRFMNotasMonetario ?? null,
			analiseRFMUltimaAtualizacao: initialState?.client?.analiseRFMUltimaAtualizacao ?? null,
			dataNascimento: initialState?.client?.dataNascimento ?? null,
			dataFundacao: initialState?.client?.dataFundacao ?? null,
			profissao: initialState?.client?.profissao ?? null,
			ondeTrabalha: initialState?.client?.ondeTrabalha ?? null,
			estadoCivil: initialState?.client?.estadoCivil ?? null,
			deficiencia: initialState?.client?.deficiencia ?? null,
			dataSincronizacaoExterna: initialState?.client?.dataSincronizacaoExterna ?? null,
			dataInsercao: initialState?.client?.dataInsercao ?? new Date(),
		},
		clientLocations: initialState?.clientLocations ?? [],
		clientTags: initialState?.clientTags ?? [],
	};
}

function syncClientMainLocation(state: TClientState): TClientState {
	const firstLocation = state.clientLocations.find((location) => !location.deletar);
	if (!firstLocation) {
		return {
			...state,
			client: {
				...state.client,
				localizacaoCep: null,
				localizacaoEstado: null,
				localizacaoCidade: null,
				localizacaoBairro: null,
				localizacaoLogradouro: null,
				localizacaoNumero: null,
				localizacaoComplemento: null,
			},
		};
	}

	return {
		...state,
		client: {
			...state.client,
			localizacaoCep: firstLocation.localizacaoCep,
			localizacaoEstado: firstLocation.localizacaoEstado,
			localizacaoCidade: firstLocation.localizacaoCidade,
			localizacaoBairro: firstLocation.localizacaoBairro,
			localizacaoLogradouro: firstLocation.localizacaoLogradouro,
			localizacaoNumero: firstLocation.localizacaoNumero,
			localizacaoComplemento: firstLocation.localizacaoComplemento,
		},
	};
}

export function useClientState({ initialState }: UseClientStateProps = {}) {
	const initialDefaultState = useMemo(() => getDefaultState(initialState), [initialState]);
	const [state, setState] = useState<TClientState>(() => syncClientMainLocation(initialDefaultState));

	const updateClient = useCallback((changes: Partial<TClientState["client"]>) => {
		setState((prev) => ({
			...prev,
			client: {
				...prev.client,
				...changes,
			},
		}));
	}, []);

	const addClientLocation = useCallback((location?: Partial<TClientLocationState>) => {
		setState((prev) => {
			const nextState = {
				...prev,
				clientLocations: [
					...prev.clientLocations,
					{
						id: location?.id ?? null,
						deletar: location?.deletar ?? false,
						titulo: location?.titulo ?? "",
						localizacaoCep: location?.localizacaoCep ?? null,
						localizacaoEstado: location?.localizacaoEstado ?? null,
						localizacaoCidade: location?.localizacaoCidade ?? null,
						localizacaoBairro: location?.localizacaoBairro ?? null,
						localizacaoLogradouro: location?.localizacaoLogradouro ?? null,
						localizacaoNumero: location?.localizacaoNumero ?? null,
						localizacaoComplemento: location?.localizacaoComplemento ?? null,
						localizacaoLatitude: location?.localizacaoLatitude ?? null,
						localizacaoLongitude: location?.localizacaoLongitude ?? null,
					},
				],
			};

			return syncClientMainLocation(nextState);
		});
	}, []);

	const updateClientLocation = useCallback((index: number, changes: Partial<TClientLocationState>) => {
		setState((prev) => {
			const nextState = {
				...prev,
				clientLocations: prev.clientLocations.map((location, locationIndex) => {
					if (locationIndex !== index) return location;
					return {
						...location,
						...changes,
					};
				}),
			};

			return syncClientMainLocation(nextState);
		});
	}, []);

	const removeClientLocation = useCallback((index: number) => {
		setState((prev) => {
			const location = prev.clientLocations[index];
			if (!location) return prev;

			const nextLocations = location.id
				? prev.clientLocations.map((current, currentIndex) =>
						currentIndex === index
							? {
									...current,
									deletar: true,
								}
							: current,
					)
				: prev.clientLocations.filter((_, currentIndex) => currentIndex !== index);

			return syncClientMainLocation({
				...prev,
				clientLocations: nextLocations,
			});
		});
	}, []);

	const addClientTag = useCallback((tag: TClientState["clientTags"][number]) => {
		setState((prev) => ({
			...prev,
			clientTags: [...prev.clientTags, tag],
		}));
	}, []);

	const updateClientTag = useCallback((index: number, changes: Partial<TClientState["clientTags"][number]>) => {
		setState((prev) => ({
			...prev,
			clientTags: prev.clientTags.map((tag, tagIndex) => (tagIndex === index ? { ...tag, ...changes } : tag)),
		}));
	}, []);

	const removeClientTag = useCallback((index: number) => {
		setState((prev) => {
			const clientTag = prev.clientTags[index];
			if (!clientTag) return prev;

			const nextClientTags = clientTag.id
				? prev.clientTags.map((current, currentIndex) =>
						currentIndex === index
							? {
									...current,
									deletar: true,
								}
							: current,
					)
				: prev.clientTags.filter((_, currentIndex) => currentIndex !== index);

			return {
				...prev,
				clientTags: nextClientTags,
			};
		});
	}, []);

	const redefineState = useCallback((newState: TClientState) => {
		setState(syncClientMainLocation(newState));
	}, []);

	const resetState = useCallback(() => {
		setState(syncClientMainLocation(initialDefaultState));
	}, [initialDefaultState]);

	return {
		state,
		updateClient,
		addClientLocation,
		updateClientLocation,
		removeClientLocation,
		addClientTag,
		updateClientTag,
		removeClientTag,
		redefineState,
		resetState,
	};
}

export type TUseClientState = ReturnType<typeof useClientState>;
