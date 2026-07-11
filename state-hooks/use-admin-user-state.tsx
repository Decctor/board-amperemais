import { UserSchema } from "@/schemas/users";
import { useCallback, useState } from "react";
import z from "zod";

const AdminUserStateSchema = z.object({
	user: UserSchema.pick({
		nome: true,
		email: true,
		telefone: true,
		avatarUrl: true,
		usuario: true,
		dataNascimento: true,
	}),
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
type TAdminUserState = z.infer<typeof AdminUserStateSchema>;

export function useAdminUserState() {
	const initialState: TAdminUserState = {
		user: {
			nome: "",
			email: "",
			telefone: "",
			avatarUrl: null,
			usuario: "",
			dataNascimento: null,
		},
		avatarHolder: {
			file: null,
			previewUrl: null,
		},
	};
	const [state, setState] = useState<TAdminUserState>(initialState);

	const updateUser = useCallback((user: Partial<TAdminUserState["user"]>) => {
		setState((prev) => ({
			...prev,
			user: {
				...prev.user,
				...user,
			},
		}));
	}, []);

	const updateAvatarHolder = useCallback((avatarHolder: Partial<TAdminUserState["avatarHolder"]>) => {
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

	const redefineState = useCallback((state: TAdminUserState) => {
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
export type TUseAdminUserState = ReturnType<typeof useAdminUserState>;
