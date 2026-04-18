import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { getErrorMessage } from "@/lib/errors";
import { createFiscalOperationProfileMutation } from "@/lib/mutations/fiscal";
import { useFiscalOperationProfileState } from "@/state-hooks/use-fiscal-operation-profile-state";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import FiscalOperationProfileGeneralBlock from "./Blocks/General";
import FiscalOperationProfileOperationBlock from "./Blocks/Operation";
import FiscalOperationProfileSeriesBlock from "./Blocks/Series";

type NewFiscalOperationProfileProps = {
	closeModal: () => void;
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: () => void;
		onSettled?: () => void;
	};
};
export default function NewFiscalOperationProfile({ closeModal, callbacks }: NewFiscalOperationProfileProps) {
	const queryClient = useQueryClient();
	const { state, updateFiscalOperationProfile, resetState } = useFiscalOperationProfileState({});

	const { mutate, isPending } = useMutation({
		mutationKey: ["create-fiscal-operation-profile"],
		mutationFn: createFiscalOperationProfileMutation,
		onMutate: () => {
			if (callbacks?.onMutate) callbacks.onMutate();
		},
		onSuccess: (data) => {
			if (callbacks?.onSuccess) callbacks.onSuccess();
			resetState();
			toast.success(data.message);
			return closeModal();
		},
		onError: (error) => {
			if (callbacks?.onError) callbacks.onError();
			return toast.error(getErrorMessage(error));
		},
		onSettled: async () => {
			if (callbacks?.onSettled) callbacks.onSettled();
			await queryClient.invalidateQueries({ queryKey: ["fiscal-operation-profiles"] });
		},
	});

	return (
		<ResponsiveMenu
			menuTitle="NOVO PERFIL DE OPERAÇÃO FISCAL"
			menuDescription="Preencha os campos abaixo para criar um novo perfil de operação fiscal"
			menuActionButtonText="CRIAR PERFIL DE OPERAÇÃO FISCAL"
			menuCancelButtonText="CANCELAR"
			actionFunction={() => mutate({ operationProfile: state.fiscalOperationProfile })}
			actionIsLoading={isPending}
			stateIsLoading={false}
			stateError={null}
			closeMenu={closeModal}
			dialogVariant="md"
		>
			<FiscalOperationProfileGeneralBlock
				fiscalOperationProfile={state.fiscalOperationProfile}
				updateFiscalOperationProfile={updateFiscalOperationProfile}
			/>
			<FiscalOperationProfileOperationBlock
				fiscalOperationProfile={state.fiscalOperationProfile}
				updateFiscalOperationProfile={updateFiscalOperationProfile}
			/>
			<FiscalOperationProfileSeriesBlock
				fiscalOperationProfile={state.fiscalOperationProfile}
				updateFiscalOperationProfile={updateFiscalOperationProfile}
			/>
		</ResponsiveMenu>
	);
}
