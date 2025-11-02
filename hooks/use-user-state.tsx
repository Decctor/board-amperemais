import { UserSchema } from "@/schemas/users";
import { useCallback, useState } from "react";
import z from "zod";

const UserStateSchema = z.object({
	user: UserSchema.omit({ dataInsercao: true }),
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
			usuario: "",
			senha: "",
			visualizacao: "PRÓPRIA",
			vendedor: "",
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
		resetState,
		redefineState,
	};
}
export type TUseUserState = ReturnType<typeof useUserState>;
