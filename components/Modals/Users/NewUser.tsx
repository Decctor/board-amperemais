import SelectInput from "@/components/Inputs/SelectInput";
import TextInput from "@/components/Inputs/TextInput";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { LoadingButton } from "@/components/loading-button";
import { type TUseUserState, useUserState } from "@/hooks/use-user-state";
import { getErrorMessage } from "@/lib/errors";
import { uploadFile } from "@/lib/files-storage";
import { useMutationWithFeedback } from "@/lib/mutations/common";
import { createUser } from "@/lib/mutations/users";
import { useSaleQueryFilterOptions } from "@/lib/queries/stats/utils";
import type { TUser, TUserSession } from "@/schemas/users";
import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import { VscChromeClose } from "react-icons/vsc";
import { toast } from "sonner";
import UsersCredentialsBlock from "./Blocks/Credentials";
import UsersGeneralBlock from "./Blocks/General";
import UsersSellerBlock from "./Blocks/Seller";
type NewUserProps = {
	session: TUserSession;
	closeModal: () => void;
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: () => void;
		onSettled?: () => void;
	};
};
function NewUser({ session, closeModal, callbacks }: NewUserProps) {
	const { state, updateUser, updateAvatarHolder, resetState } = useUserState();

	async function handleCreateUser(state: TUseUserState["state"]) {
		let userAvatarUrl = state.user.avatar;

		if (state.avatarHolder.file) {
			const { url, format, size } = await uploadFile({ file: state.avatarHolder.file, fileName: state.user.nome, prefix: "avatars" });
			userAvatarUrl = url;
		}

		return await createUser({ user: { ...state.user, avatar: userAvatarUrl } });
	}
	const { mutate, isPending } = useMutation({
		mutationKey: ["create-user"],
		mutationFn: handleCreateUser,
		onMutate: async () => {
			if (callbacks?.onMutate) callbacks.onMutate();
			return;
		},
		onSuccess: async (data) => {
			if (callbacks?.onSuccess) callbacks.onSuccess();
			resetState();
			return toast.success(data.message);
		},
		onError: async (error) => {
			if (callbacks?.onError) callbacks.onError();
			return toast.error(getErrorMessage(error));
		},
		onSettled: async () => {
			if (callbacks?.onSettled) callbacks.onSettled();
			return;
		},
	});

	return (
		<ResponsiveMenu
			menuTitle="NOVO USUÁRIO"
			menuDescription="Preencha os campos abaixo para criar um novo usuário"
			menuActionButtonText="CRIAR USUÁRIO"
			menuCancelButtonText="CANCELAR"
			actionFunction={() => mutate(state)}
			actionIsLoading={isPending}
			stateIsLoading={false}
			stateError={null}
			closeMenu={closeModal}
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

export default NewUser;
