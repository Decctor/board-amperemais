import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { getErrorMessage } from "@/lib/errors";
import { uploadFile } from "@/lib/files-storage";
import { updateSeller as updateSellerMutation } from "@/lib/mutations/sellers";
import { useSellerById } from "@/lib/queries/sellers";
import type { TSeller, TSellerState } from "@/schemas/sellers";
import type { TUserSession } from "@/schemas/users";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { GeneralBlock } from "./Blocks/General";
type EditSellerProps = {
	sellerId: string;
	sessionUser: TUserSession;
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: () => void;
		onSettled?: () => void;
	};
	closeModal: () => void;
};
export default function EditSeller({ sellerId, sessionUser, callbacks, closeModal }: EditSellerProps) {
	const queryClient = useQueryClient();
	const { data: seller, queryKey, isLoading, isError, isSuccess, error } = useSellerById({ id: sellerId });
	const [infoHolder, setInfoHolder] = useState<TSellerState>({
		seller: {
			nome: "",
			identificador: "",
			telefone: "",
			email: "",
			avatarUrl: "",
			dataInsercao: new Date(),
		},
		avatarHolder: {
			file: null,
			previewUrl: null,
		},
	});

	function updateSeller(changes: Partial<TSellerState["seller"]>) {
		setInfoHolder((prev) => ({ ...prev, seller: { ...prev.seller, ...changes } }));
	}

	function updateAvatar(changes: Partial<TSellerState["avatarHolder"]>) {
		setInfoHolder((prev) => ({ ...prev, avatarHolder: { ...prev.avatarHolder, ...changes } }));
	}

	async function handleUpdateSellerMutation(state: TSellerState) {
		let sellerAvatarUrl = state.seller.avatarUrl;
		if (state.avatarHolder.file) {
			const { url, format, size } = await uploadFile({ file: state.avatarHolder.file, fileName: state.seller.nome, prefix: "avatars" });
			sellerAvatarUrl = url;
		}
		return await updateSellerMutation({ sellerId: sellerId, seller: { ...state.seller, avatarUrl: sellerAvatarUrl } });
	}
	const { mutate: mutateEditSeller, isPending } = useMutation({
		mutationKey: ["update-seller", sellerId],
		mutationFn: handleUpdateSellerMutation,
		onMutate: async () => {
			await queryClient.cancelQueries({ queryKey: queryKey });
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
			await queryClient.invalidateQueries({ queryKey: queryKey });
			if (callbacks?.onSettled) callbacks.onSettled();
		},
	});
	useEffect(() => {
		if (seller)
			setInfoHolder({
				seller: seller,
				avatarHolder: {
					file: null,
					previewUrl: null,
				},
			});
	}, [seller]);
	return (
		<ResponsiveMenu
			menuTitle="EDITAR VENDEDOR"
			menuDescription="Preencha aqui as informações do vendedor para atualizá-lo."
			menuActionButtonText="ATUALIZAR VENDEDOR"
			menuCancelButtonText="CANCELAR"
			actionFunction={() => {
				mutateEditSeller({ seller: infoHolder.seller, avatarHolder: infoHolder.avatarHolder });
			}}
			actionIsLoading={isPending}
			stateIsLoading={isLoading}
			stateError={error ? getErrorMessage(error) : null}
			closeMenu={closeModal}
		>
			<GeneralBlock seller={infoHolder.seller} updateSeller={updateSeller} avatarHolder={infoHolder.avatarHolder} updateAvatar={updateAvatar} />
		</ResponsiveMenu>
	);
}
