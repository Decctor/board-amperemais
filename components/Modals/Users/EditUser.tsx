import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { type TUseUserState, useUserState } from "@/hooks/use-user-state";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getErrorMessage } from "@/lib/errors";
import { uploadFile } from "@/lib/files-storage";
import { updateUser as updateUserMutation } from "@/lib/mutations/users";
import { useUserById } from "@/lib/queries/users";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import UsersCredentialsBlock from "./Blocks/Credentials";
import UsersGeneralBlock from "./Blocks/General";
import UsersSellerBlock from "./Blocks/Seller";
type EditUserProps = {
	userId: string;
	session: TAuthUserSession["user"];
	closeModal: () => void;
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: () => void;
		onSettled?: () => void;
	};
};
function EditUser({ userId, session, closeModal, callbacks }: EditUserProps) {
	const queryClient = useQueryClient();
	const { state, updateUser, updateAvatarHolder, redefineState } = useUserState();
	const { data: user, queryKey, isLoading, isError, isSuccess, error } = useUserById(userId);

	async function handleUpdateUserMutation(state: TUseUserState["state"]) {
		let userAvatarUrl = state.user.avatarUrl;
		if (state.avatarHolder.file) {
			const { url, format, size } = await uploadFile({ file: state.avatarHolder.file, fileName: state.user.nome, prefix: "avatars" });
			userAvatarUrl = url;
		}
		return await updateUserMutation({ id: userId, user: { ...state.user, avatarUrl: userAvatarUrl } });
	}
	const { mutate, isPending } = useMutation({
		mutationKey: ["create-user"],
		mutationFn: handleUpdateUserMutation,
		onMutate: async () => {
			await queryClient.cancelQueries({ queryKey });
			if (callbacks?.onMutate) callbacks.onMutate();
			return;
		},
		onSuccess: async (data) => {
			if (callbacks?.onSuccess) callbacks.onSuccess();
			return toast.success(data.message);
		},
		onError: async (error) => {
			if (callbacks?.onError) callbacks.onError();
			return toast.error(getErrorMessage(error));
		},
		onSettled: async () => {
			if (callbacks?.onSettled) callbacks.onSettled();
			await queryClient.invalidateQueries({ queryKey });
			return;
		},
	});

	useEffect(() => {
		if (user) redefineState({ user: user, avatarHolder: { file: null, previewUrl: null } });
	}, [user, redefineState]);

	console.log("[INFO] [EDIT USER] State:", state);
	return (
		<ResponsiveMenu
			menuTitle="EDITAR USUÁRIO"
			menuDescription="Preencha os campos abaixo para atualizar o usuário"
			menuActionButtonText="ATUALIZAR USUÁRIO"
			menuCancelButtonText="CANCELAR"
			actionFunction={() => mutate(state)}
			actionIsLoading={isPending}
			stateIsLoading={isLoading}
			stateError={error ? getErrorMessage(error) : null}
			closeMenu={closeModal}
			dialogVariant="md"
		>
			<UsersGeneralBlock
				infoHolder={state.user}
				updateInfoHolder={updateUser}
				avatarHolder={state.avatarHolder}
				updateAvatarHolder={updateAvatarHolder}
			/>
			<UsersCredentialsBlock infoHolder={state.user} updateInfoHolder={updateUser} />
			<UsersSellerBlock infoHolder={state.user} updateInfoHolder={updateUser} />
		</ResponsiveMenu>
	);
}

export default EditUser;
