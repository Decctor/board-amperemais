import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getErrorMessage } from "@/lib/errors";
import { uploadFile } from "@/lib/files-storage";
import { createPartner } from "@/lib/mutations/partners";
import type { TPartnerState } from "@/schemas/partners";
import { usePartnerState } from "@/state-hooks/use-partner-state";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { GeneralBlock } from "./Blocks/General";

type NewPartnerProps = {
	user: TAuthUserSession["user"];
	closeModal: () => void;
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: () => void;
		onSettled?: () => void;
	};
};

export default function NewPartner({ user, closeModal, callbacks }: NewPartnerProps) {
	const { state, updatePartner, updateAvatarHolder, resetState } = usePartnerState();

	async function handleCreatePartner(state: TPartnerState) {
		let partnerAvatarUrl = state.partner.avatarUrl;

		if (state.avatarHolder.file) {
			const { url } = await uploadFile({
				file: state.avatarHolder.file,
				fileName: state.partner.nome,
				prefix: "avatars",
			});
			partnerAvatarUrl = url;
		}

		return await createPartner({
			partner: { ...state.partner, avatarUrl: partnerAvatarUrl },
		});
	}

	const { mutate, isPending } = useMutation({
		mutationKey: ["create-partner"],
		mutationFn: handleCreatePartner,
		onMutate: async () => {
			if (callbacks?.onMutate) callbacks.onMutate();
			return;
		},
		onSuccess: async (data) => {
			if (callbacks?.onSuccess) callbacks.onSuccess();
			resetState();
			toast.success(data.message);
			return closeModal();
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
			menuTitle="NOVO PARCEIRO"
			menuDescription="Preencha os campos abaixo para criar um novo parceiro"
			menuActionButtonText="CRIAR PARCEIRO"
			menuCancelButtonText="CANCELAR"
			actionFunction={() => mutate(state)}
			actionIsLoading={isPending}
			stateIsLoading={false}
			stateError={null}
			closeMenu={closeModal}
			dialogVariant="md"
		>
			<GeneralBlock partner={state.partner} updatePartner={updatePartner} avatarHolder={state.avatarHolder} updateAvatar={updateAvatarHolder} />
		</ResponsiveMenu>
	);
}
