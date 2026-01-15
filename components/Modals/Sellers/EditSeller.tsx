import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getErrorMessage } from "@/lib/errors";
import { uploadFile } from "@/lib/files-storage";
import { updateSeller as updateSellerMutation } from "@/lib/mutations/sellers";
import { useSellerById } from "@/lib/queries/sellers";
import type { TSellerState } from "@/schemas/sellers";
import { useSellerState } from "@/state-hooks/use-seller-state";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { GeneralBlock } from "./Blocks/General";

type EditSellerProps = {
	sellerId: string;
	user: TAuthUserSession["user"];
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: () => void;
		onSettled?: () => void;
	};
	closeModal: () => void;
};

export default function EditSeller({ sellerId, user, callbacks, closeModal }: EditSellerProps) {
	const queryClient = useQueryClient();
	const { state, updateSeller, updateAvatarHolder, redefineState } = useSellerState();
	const { data: seller, queryKey, isLoading, error } = useSellerById({ id: sellerId });

	async function handleUpdateSellerMutation(state: TSellerState) {
		let sellerAvatarUrl = state.seller.avatarUrl;
		if (state.avatarHolder.file) {
			const { url } = await uploadFile({
				file: state.avatarHolder.file,
				fileName: state.seller.nome,
				prefix: "avatars",
			});
			sellerAvatarUrl = url;
		}
		return await updateSellerMutation({
			sellerId: sellerId,
			seller: { ...state.seller, avatarUrl: sellerAvatarUrl },
		});
	}

	const { mutate: mutateEditSeller, isPending } = useMutation({
		mutationKey: ["update-seller", sellerId],
		mutationFn: handleUpdateSellerMutation,
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
		if (seller) {
			redefineState({
				seller: seller,
				avatarHolder: {
					file: null,
					previewUrl: null,
				},
			});
		}
	}, [seller, redefineState]);

	return (
		<ResponsiveMenu
			menuTitle="EDITAR VENDEDOR"
			menuDescription="Preencha aqui as informações do vendedor para atualizá-lo."
			menuActionButtonText="ATUALIZAR VENDEDOR"
			menuCancelButtonText="CANCELAR"
			actionFunction={() => {
				mutateEditSeller(state);
			}}
			actionIsLoading={isPending}
			stateIsLoading={isLoading}
			stateError={error ? getErrorMessage(error) : null}
			closeMenu={closeModal}
		>
			<GeneralBlock seller={state.seller} updateSeller={updateSeller} avatarHolder={state.avatarHolder} updateAvatar={updateAvatarHolder} />
		</ResponsiveMenu>
	);
}
