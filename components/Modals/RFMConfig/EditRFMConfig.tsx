import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getErrorMessage } from "@/lib/errors";
import { updateRFMConfig } from "@/lib/mutations/configs";
import type { TRFMConfig } from "@/utils/rfm";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import RFMConfigMatrixForm from "./Blocks/RFMConfigMatrixForm";

type EditRFMConfigProps = {
	user: TAuthUserSession["user"];
	rfmConfig: TRFMConfig;
	closeModal: () => void;
};

export default function EditRFMConfig({ rfmConfig, closeModal }: EditRFMConfigProps) {
	const [infoHolder, setInfoHolder] = useState<TRFMConfig>(rfmConfig);
	const queryClient = useQueryClient();

	useEffect(() => {
		if (rfmConfig) setInfoHolder(rfmConfig);
	}, [rfmConfig]);

	const { mutate: handleUpdateRFMConfigMutation, isPending } = useMutation({
		mutationKey: ["update-rfm-config"],
		mutationFn: updateRFMConfig,
		onSuccess: (data) => {
			toast.success(data.message);
			queryClient.invalidateQueries({ queryKey: ["rfm-config"] });
			closeModal();
		},
		onError: (error) => {
			toast.error(getErrorMessage(error));
		},
	});

	return (
		<ResponsiveMenu
			menuTitle="EDITAR CONFIGURAÇÃO RFM"
			menuDescription="Atualize os valores abaixo para redefinir as notas de segmentação RFM da sua organização."
			menuActionButtonText="SALVAR ALTERAÇÕES"
			menuCancelButtonText="CANCELAR"
			actionFunction={() => handleUpdateRFMConfigMutation({ rfmConfig: infoHolder })}
			closeMenu={closeModal}
			actionIsLoading={isPending}
			stateIsLoading={false}
			stateError={null}
		>
			<RFMConfigMatrixForm infoHolder={infoHolder} setInfoHolder={setInfoHolder} />
		</ResponsiveMenu>
	);
}
