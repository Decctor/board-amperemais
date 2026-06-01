import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { getErrorMessage } from "@/lib/errors";
import { createFiscalSeriesMutation } from "@/lib/mutations/fiscal";
import { useFiscalSeriesState } from "@/state-hooks/use-fiscal-series-state";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import FiscalSeriesGeneralBlock from "./Blocks/General";
import FiscalSeriesNumberingBlock from "./Blocks/Numbering";

type NewFiscalSeriesProps = {
	closeModal: () => void;
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: () => void;
		onSettled?: () => void;
	};
};
export default function NewFiscalSeries({ closeModal, callbacks }: NewFiscalSeriesProps) {
	const queryClient = useQueryClient();
	const { state, updateFiscalSeries, resetState } = useFiscalSeriesState({});

	const { mutate, isPending } = useMutation({
		mutationKey: ["create-fiscal-series"],
		mutationFn: createFiscalSeriesMutation,
		onMutate: () => {
			if (callbacks?.onMutate) callbacks.onMutate();
		},
		onSuccess: (data) => {
			if (callbacks?.onSuccess) callbacks.onSuccess();
			resetState();
			toast.success(data?.message ?? "Série fiscal criada com sucesso.");
			return closeModal();
		},
		onError: (error) => {
			if (callbacks?.onError) callbacks.onError();
			return toast.error(getErrorMessage(error));
		},
		onSettled: async () => {
			if (callbacks?.onSettled) callbacks.onSettled();
			await queryClient.invalidateQueries({ queryKey: ["fiscal-series"] });
		},
	});

	return (
		<ResponsiveMenu
			menuTitle="NOVA SÉRIE FISCAL"
			menuDescription="Preencha os campos abaixo para criar uma nova série fiscal"
			menuActionButtonText="CRIAR SÉRIE FISCAL"
			menuCancelButtonText="CANCELAR"
			actionFunction={() => mutate({ fiscalSeries: state.fiscalSeries })}
			actionIsLoading={isPending}
			stateIsLoading={false}
			stateError={null}
			closeMenu={closeModal}
			dialogVariant="md"
		>
			<FiscalSeriesGeneralBlock fiscalSeries={state.fiscalSeries} updateFiscalSeries={updateFiscalSeries} />
			<FiscalSeriesNumberingBlock fiscalSeries={state.fiscalSeries} updateFiscalSeries={updateFiscalSeries} />
		</ResponsiveMenu>
	);
}
