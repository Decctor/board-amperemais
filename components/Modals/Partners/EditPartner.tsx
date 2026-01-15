import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getErrorMessage } from "@/lib/errors";
import { uploadFile } from "@/lib/files-storage";
import { updatePartner as updatePartnerMutation } from "@/lib/mutations/partners";
import { usePartnerById } from "@/lib/queries/partners";
import type { TPartnerState } from "@/schemas/partners";
import { usePartnerState } from "@/state-hooks/use-partner-state";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { GeneralBlock } from "./Blocks/General";

type EditPartnerProps = {
	partnerId: string;
	user: TAuthUserSession["user"];
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: () => void;
		onSettled?: () => void;
	};
	closeModal: () => void;
};

export default function EditPartner({ partnerId, user, callbacks, closeModal }: EditPartnerProps) {
	const queryClient = useQueryClient();
	const { state, updatePartner, updateAvatarHolder, redefineState } = usePartnerState();
	const { data: partner, queryKey, isLoading, error } = usePartnerById({ id: partnerId });

	async function handleUpdatePartnerMutation(state: TPartnerState) {
		let partnerAvatarUrl = state.partner.avatarUrl;
		if (state.avatarHolder.file) {
			const { url } = await uploadFile({
				file: state.avatarHolder.file,
				fileName: state.partner.nome,
				prefix: "avatars",
			});
			partnerAvatarUrl = url;
		}
		return await updatePartnerMutation({
			partnerId: partnerId,
			partner: { ...state.partner, avatarUrl: partnerAvatarUrl },
		});
	}

	const { mutate: mutateEditPartner, isPending } = useMutation({
		mutationKey: ["update-partner", partnerId],
		mutationFn: handleUpdatePartnerMutation,
		onMutate: async () => {
			await queryClient.cancelQueries({ queryKey });
			if (callbacks?.onMutate) callbacks.onMutate();
		},
		onSuccess: (data) => {
			if (callbacks?.onSuccess) callbacks.onSuccess();
			return toast.success(data.message);
		},
		onError: (error) => {
			if (callbacks?.onError) callbacks.onError();
			return toast.error(getErrorMessage(error));
		},
		onSettled: async () => {
			await queryClient.invalidateQueries({ queryKey });
			if (callbacks?.onSettled) callbacks.onSettled();
		},
	});

	useEffect(() => {
		if (partner) {
			redefineState({
				partner: partner,
				avatarHolder: {
					file: null,
					previewUrl: null,
				},
			});
		}
	}, [partner, redefineState]);

	return (
		<ResponsiveMenu
			menuTitle="EDITAR PARCEIRO"
			menuDescription="Preencha aqui as informações do parceiro para atualizá-lo."
			menuActionButtonText="ATUALIZAR PARCEIRO"
			menuCancelButtonText="CANCELAR"
			actionFunction={() => {
				mutateEditPartner(state);
			}}
			actionIsLoading={isPending}
			stateIsLoading={isLoading}
			stateError={error ? getErrorMessage(error) : null}
			closeMenu={closeModal}
		>
			<GeneralBlock partner={state.partner} updatePartner={updatePartner} avatarHolder={state.avatarHolder} updateAvatar={updateAvatarHolder} />
		</ResponsiveMenu>
	);
}
