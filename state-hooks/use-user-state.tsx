import { NewUserSchema, UserSchema } from "@/schemas/users";
import { useCallback, useState } from "react";
import z from "zod";

const UserStateSchema = z.object({
	user: NewUserSchema.omit({ dataInsercao: true }),
	avatarHolder: z.object({
		file: z.instanceof(File).optional().nullable(),
		previewUrl: z
			.string({
				invalid_type_error: "Tipo não válido para a url do preview do avatar do usuário.",
			})
			.optional()
			.nullable(),
	}),
});
type TUserState = z.infer<typeof UserStateSchema>;

export function useUserState() {
	const initialState: TUserState = {
		user: {
			nome: "",
			email: "",
			telefone: "",
			avatarUrl: "",
			dataNascimento: null,
			usuario: "",
			senha: "",
			permissoes: {
				resultados: {
					visualizar: false,
					criarMetas: false,
					visualizarMetas: false,
					editarMetas: false,
					excluirMetas: false,
					escopo: [],
				},
				usuarios: {
					visualizar: false,
					criar: false,
					editar: false,
					excluir: false,
				},
				atendimentos: {
					visualizar: false,
					iniciar: false,
					responder: false,
					finalizar: false,
				},
			},
		},
		avatarHolder: {
			file: null,
			previewUrl: null,
		},
	};
	const [state, setState] = useState<TUserState>(initialState);

	const updateUser = useCallback((user: Partial<TUserState["user"]>) => {
		setState((prev) => ({
			...prev,
			user: {
				...prev.user,
				...user,
			},
		}));
	}, []);

	const updateAvatarHolder = useCallback((avatarHolder: Partial<TUserState["avatarHolder"]>) => {
		setState((prev) => ({
			...prev,
			avatarHolder: {
				...prev.avatarHolder,
				...avatarHolder,
			},
		}));
	}, []);

	const updateUserPermissions = useCallback((permissoes: Partial<TUserState["user"]["permissoes"]>) => {
		setState((prev) => ({
			...prev,
			user: {
				...prev.user,
				permissoes: { ...prev.user.permissoes, ...permissoes },
			},
		}));
	}, []);
	const resetState = useCallback(() => {
		setState(initialState);
	}, []);

	const redefineState = useCallback((state: TUserState) => {
		setState(state);
	}, []);
	return {
		state,
		updateUser,
		updateAvatarHolder,
		updateUserPermissions,
		resetState,
		redefineState,
	};
}
export type TUseUserState = ReturnType<typeof useUserState>;
