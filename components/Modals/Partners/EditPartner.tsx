import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getErrorMessage } from "@/lib/errors";
import { uploadFile } from "@/lib/files-storage";
import { updatePartner as updatePartnerMutation } from "@/lib/mutations/partners";
import { updateSeller as updateSellerMutation } from "@/lib/mutations/sellers";
import { usePartnerById } from "@/lib/queries/partners";
import { useSellerById } from "@/lib/queries/sellers";
import type { TPartnerState } from "@/schemas/partners";
import type { TSeller, TSellerState } from "@/schemas/sellers";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
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
	const { data: partner, queryKey, isLoading, isError, isSuccess, error } = usePartnerById({ id: partnerId });
	const [infoHolder, setInfoHolder] = useState<TPartnerState>({
		partner: {
			nome: "",
			identificador: "",
			telefone: "",
			telefoneBase: "",
			email: "",
			avatarUrl: "",
			dataInsercao: new Date(),
		},
		avatarHolder: {
			file: null,
			previewUrl: null,
		},
	});

	function updatePartner(changes: Partial<TPartnerState["partner"]>) {
		setInfoHolder((prev) => ({ ...prev, partner: { ...prev.partner, ...changes } }));
	}

	function updateAvatar(changes: Partial<TPartnerState["avatarHolder"]>) {
		setInfoHolder((prev) => ({ ...prev, avatarHolder: { ...prev.avatarHolder, ...changes } }));
	}

	async function handleUpdatePartnerMutation(state: TPartnerState) {
		let partnerAvatarUrl = state.partner.avatarUrl;
		if (state.avatarHolder.file) {
			const { url, format, size } = await uploadFile({ file: state.avatarHolder.file, fileName: state.partner.nome, prefix: "avatars" });
			partnerAvatarUrl = url;
		}
		return await updatePartnerMutation({ partnerId: partnerId, partner: { ...state.partner, avatarUrl: partnerAvatarUrl } });
	}
	const { mutate: mutateEditPartner, isPending } = useMutation({
		mutationKey: ["update-partner", partnerId],
		mutationFn: handleUpdatePartnerMutation,
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
		if (partner)
			setInfoHolder({
				partner: partner,
				avatarHolder: {
					file: null,
					previewUrl: null,
				},
			});
	}, [partner]);
	return (
		<ResponsiveMenu
			menuTitle="EDITAR PARCEIRO"
			menuDescription="Preencha aqui as informações do parceiro para atualizá-lo."
			menuActionButtonText="ATUALIZAR PARCEIRO"
			menuCancelButtonText="CANCELAR"
			actionFunction={() => {
				mutateEditPartner({ partner: infoHolder.partner, avatarHolder: infoHolder.avatarHolder });
			}}
			actionIsLoading={isPending}
			stateIsLoading={isLoading}
			stateError={error ? getErrorMessage(error) : null}
			closeMenu={closeModal}
		>
			<GeneralBlock partner={infoHolder.partner} updatePartner={updatePartner} avatarHolder={infoHolder.avatarHolder} updateAvatar={updateAvatar} />
		</ResponsiveMenu>
	);
}
