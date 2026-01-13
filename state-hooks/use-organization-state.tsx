import { OrganizationSchema } from "@/schemas/organizations";
import { NewUserSchema } from "@/schemas/users";
import { useCallback, useState } from "react";
import z from "zod";

const OrganizationStateSchema = z.object({
	organization: OrganizationSchema.omit({ dataInsercao: true }),
	logoHolder: z.object({
		file: z.instanceof(File).optional().nullable(),
		previewUrl: z
			.string({
				invalid_type_error: "Tipo não válido para a url do preview do logo da organização.",
			})
			.optional()
			.nullable(),
	}),
	mainUser: NewUserSchema.omit({ dataInsercao: true, organizacaoId: true }),
	mainUserAvatarHolder: z.object({
		file: z.instanceof(File).optional().nullable(),
		previewUrl: z
			.string({
				invalid_type_error: "Tipo não válido para a url do preview do avatar do usuário.",
			})
			.optional()
			.nullable(),
	}),
	productsExcelFile: z.instanceof(File).optional().nullable(),
});

export type TOrganizationState = z.infer<typeof OrganizationStateSchema>;

export function useOrganizationState() {
	const initialState: TOrganizationState = {
		organization: {
			nome: "",
			cnpj: "",
			logoUrl: null,
			telefone: null,
			email: null,
			localizacaoCep: null,
			localizacaoEstado: null,
			localizacaoCidade: null,
			localizacaoBairro: null,
			localizacaoLogradouro: null,
			localizacaoNumero: null,
			localizacaoComplemento: null,
			integracaoTipo: null,
			integracaoConfiguracao: null,
			integracaoDataUltimaSincronizacao: null,
		},
		logoHolder: {
			file: null,
			previewUrl: null,
		},
		mainUser: {
			nome: "",
			email: "",
			telefone: "",
			avatarUrl: "",
			dataNascimento: null,
			usuario: "",
			senha: "",
			admin: false,
			permissoes: {
				resultados: {
					visualizar: true,
					criarMetas: true,
					visualizarMetas: true,
					editarMetas: true,
					excluirMetas: true,
					escopo: [],
				},
				usuarios: {
					visualizar: true,
					criar: true,
					editar: true,
					excluir: true,
				},
				atendimentos: {
					visualizar: true,
					iniciar: true,
					responder: true,
					finalizar: true,
				},
			},
		},
		mainUserAvatarHolder: {
			file: null,
			previewUrl: null,
		},
		productsExcelFile: null,
	};

	const [state, setState] = useState<TOrganizationState>(initialState);

	const updateOrganization = useCallback((organization: Partial<TOrganizationState["organization"]>) => {
		setState((prev) => ({
			...prev,
			organization: {
				...prev.organization,
				...organization,
			},
		}));
	}, []);

	const updateLogoHolder = useCallback((logoHolder: Partial<TOrganizationState["logoHolder"]>) => {
		setState((prev) => ({
			...prev,
			logoHolder: {
				...prev.logoHolder,
				...logoHolder,
			},
		}));
	}, []);

	const updateMainUser = useCallback((mainUser: Partial<TOrganizationState["mainUser"]>) => {
		setState((prev) => ({
			...prev,
			mainUser: {
				...prev.mainUser,
				...mainUser,
			},
		}));
	}, []);

	const updateMainUserAvatarHolder = useCallback((avatarHolder: Partial<TOrganizationState["mainUserAvatarHolder"]>) => {
		setState((prev) => ({
			...prev,
			mainUserAvatarHolder: {
				...prev.mainUserAvatarHolder,
				...avatarHolder,
			},
		}));
	}, []);

	const updateMainUserPermissions = useCallback((permissoes: Partial<TOrganizationState["mainUser"]["permissoes"]>) => {
		setState((prev) => ({
			...prev,
			mainUser: {
				...prev.mainUser,
				permissoes: { ...prev.mainUser.permissoes, ...permissoes },
			},
		}));
	}, []);

	const updateProductsExcelFile = useCallback((file: File | null) => {
		setState((prev) => ({
			...prev,
			productsExcelFile: file,
		}));
	}, []);

	const resetState = useCallback(() => {
		setState(initialState);
	}, []);

	const redefineState = useCallback((state: TOrganizationState) => {
		setState(state);
	}, []);

	return {
		state,
		updateOrganization,
		updateLogoHolder,
		updateMainUser,
		updateMainUserAvatarHolder,
		updateMainUserPermissions,
		updateProductsExcelFile,
		resetState,
		redefineState,
	};
}

export type TUseOrganizationState = ReturnType<typeof useOrganizationState>;
