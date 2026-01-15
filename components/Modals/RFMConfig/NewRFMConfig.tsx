import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getErrorMessage } from "@/lib/errors";
import { createRFMConfig } from "@/lib/mutations/configs";
import type { TRFMConfig } from "@/utils/rfm";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import RFMConfigMatrixForm from "./Blocks/RFMConfigMatrixForm";

type NewRFMConfigProps = {
	user: TAuthUserSession["user"];
	closeModal: () => void;
};

export default function NewRFMConfig({ closeModal }: NewRFMConfigProps) {
	const [infoHolder, setInfoHolder] = useState<TRFMConfig>({
		identificador: "CONFIG_RFM",
		recencia: {
			"1": { min: 0, max: 0 },
			"2": { min: 0, max: 0 },
			"3": { min: 0, max: 0 },
			"4": { min: 0, max: 0 },
			"5": { min: 0, max: 0 },
		},
		frequencia: {
			"1": { min: 0, max: 0 },
			"2": { min: 0, max: 0 },
			"3": { min: 0, max: 0 },
			"4": { min: 0, max: 0 },
			"5": { min: 0, max: 0 },
		},
		monetario: {
			"1": { min: 0, max: 0 },
			"2": { min: 0, max: 0 },
			"3": { min: 0, max: 0 },
			"4": { min: 0, max: 0 },
			"5": { min: 0, max: 0 },
		},
	});
	const queryClient = useQueryClient();

	const { mutate: handleCreateRFMConfigMutation, isPending } = useMutation({
		mutationKey: ["create-rfm-config"],
		mutationFn: createRFMConfig,
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
			menuTitle="NOVA CONFIGURAÇÃO RFM"
			menuDescription="Preencha os valores abaixo para definir as notas de segmentação RFM da sua organização."
			menuActionButtonText="CRIAR CONFIGURAÇÃO"
			menuCancelButtonText="CANCELAR"
			actionFunction={() => handleCreateRFMConfigMutation({ rfmConfig: infoHolder })}
			closeMenu={closeModal}
			actionIsLoading={isPending}
			stateIsLoading={false}
			stateError={null}
		>
			<RFMConfigMatrixForm infoHolder={infoHolder} setInfoHolder={setInfoHolder} />
		</ResponsiveMenu>
	);
}
