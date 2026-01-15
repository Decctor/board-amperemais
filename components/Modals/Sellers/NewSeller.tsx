import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getErrorMessage } from "@/lib/errors";
import { uploadFile } from "@/lib/files-storage";
import { createSeller } from "@/lib/mutations/sellers";
import type { TSellerState } from "@/schemas/sellers";
import { useSellerState } from "@/state-hooks/use-seller-state";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { GeneralBlock } from "./Blocks/General";

type NewSellerProps = {
	user: TAuthUserSession["user"];
	closeModal: () => void;
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: () => void;
		onSettled?: () => void;
	};
};

export default function NewSeller({ user, closeModal, callbacks }: NewSellerProps) {
	const { state, updateSeller, updateAvatarHolder, resetState } = useSellerState();

	async function handleCreateSeller(state: TSellerState) {
		let sellerAvatarUrl = state.seller.avatarUrl;

		if (state.avatarHolder.file) {
			const { url } = await uploadFile({
				file: state.avatarHolder.file,
				fileName: state.seller.nome,
				prefix: "avatars",
			});
			sellerAvatarUrl = url;
		}

		return await createSeller({ ...state.seller, avatarUrl: sellerAvatarUrl });
	}

	const { mutate, isPending } = useMutation({
		mutationKey: ["create-seller"],
		mutationFn: handleCreateSeller,
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
			menuTitle="NOVO VENDEDOR"
			menuDescription="Preencha os campos abaixo para criar um novo vendedor"
			menuActionButtonText="CRIAR VENDEDOR"
			menuCancelButtonText="CANCELAR"
			actionFunction={() => mutate(state)}
			actionIsLoading={isPending}
			stateIsLoading={false}
			stateError={null}
			closeMenu={closeModal}
			dialogVariant="md"
		>
			<GeneralBlock seller={state.seller} updateSeller={updateSeller} avatarHolder={state.avatarHolder} updateAvatar={updateAvatarHolder} />
		</ResponsiveMenu>
	);
}
