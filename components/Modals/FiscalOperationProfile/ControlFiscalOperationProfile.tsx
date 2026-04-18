import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { getErrorMessage } from "@/lib/errors";
import { updateFiscalOperationProfileMutation } from "@/lib/mutations/fiscal";
import { useFiscalOperationProfileById } from "@/lib/queries/fiscal";
import { useFiscalOperationProfileState } from "@/state-hooks/use-fiscal-operation-profile-state";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import FiscalOperationProfileGeneralBlock from "./Blocks/General";
import FiscalOperationProfileOperationBlock from "./Blocks/Operation";
import FiscalOperationProfileSeriesBlock from "./Blocks/Series";

type ControlFiscalOperationProfileProps = {
	operationProfileId: string;
	closeModal: () => void;
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: () => void;
		onSettled?: () => void;
	};
};
export default function ControlFiscalOperationProfile({ operationProfileId, closeModal, callbacks }: ControlFiscalOperationProfileProps) {
	const queryClient = useQueryClient();
	const { data: operationProfile, queryKey, isLoading, error } = useFiscalOperationProfileById({ id: operationProfileId });
	const { state, updateFiscalOperationProfile, redefineState } = useFiscalOperationProfileState({});

	useEffect(() => {
		if (!operationProfile) return;
		redefineState({
			fiscalOperationProfile: {
				nome: operationProfile.nome,
				descricao: operationProfile.descricao,
				tipoDocumento: operationProfile.tipoDocumento,
				finalidade: operationProfile.finalidade,
				presencaConsumidor: operationProfile.presencaConsumidor,
				consumidorFinal: operationProfile.consumidorFinal,
				cfopPadrao: operationProfile.cfopPadrao,
				naturezaOperacao: operationProfile.naturezaOperacao,
				seriePadraoId: operationProfile.seriePadraoId,
				ativo: operationProfile.ativo,
			},
		});
	}, [operationProfile, redefineState]);

	const { mutate, isPending } = useMutation({
		mutationKey: ["update-fiscal-operation-profile", operationProfileId],
		mutationFn: updateFiscalOperationProfileMutation,
		onMutate: async () => {
			await queryClient.cancelQueries({ queryKey });
			if (callbacks?.onMutate) callbacks.onMutate();
		},
		onSuccess: (data) => {
			if (callbacks?.onSuccess) callbacks.onSuccess();
			toast.success(data.message);
			return closeModal();
		},
		onError: (error) => {
			if (callbacks?.onError) callbacks.onError();
			return toast.error(getErrorMessage(error));
		},
		onSettled: async () => {
			if (callbacks?.onSettled) callbacks.onSettled();
			await queryClient.invalidateQueries({ queryKey });
			await queryClient.invalidateQueries({ queryKey: ["fiscal-operation-profiles"] });
		},
	});

	return (
		<ResponsiveMenu
			menuTitle="EDITAR PERFIL DE OPERAÇÃO FISCAL"
			menuDescription="Atualize as informações do perfil de operação fiscal"
			menuActionButtonText="SALVAR ALTERAÇÕES"
			menuCancelButtonText="CANCELAR"
			actionFunction={() =>
				mutate({
					operationProfileId,
					operationProfile: state.fiscalOperationProfile,
				})
			}
			actionIsLoading={isPending || isLoading}
			stateIsLoading={isLoading}
			stateError={error ? getErrorMessage(error) : null}
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
