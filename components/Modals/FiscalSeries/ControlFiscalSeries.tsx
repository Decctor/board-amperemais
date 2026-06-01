import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { getErrorMessage } from "@/lib/errors";
import { updateFiscalSeriesMutation } from "@/lib/mutations/fiscal";
import { useFiscalSeriesById } from "@/lib/queries/fiscal";
import { useFiscalSeriesState } from "@/state-hooks/use-fiscal-series-state";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import FiscalSeriesGeneralBlock from "./Blocks/General";
import FiscalSeriesNumberingBlock from "./Blocks/Numbering";

type ControlFiscalSeriesProps = {
	fiscalSeriesId: string;
	closeModal: () => void;
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: () => void;
		onSettled?: () => void;
	};
};
export default function ControlFiscalSeries({ fiscalSeriesId, closeModal, callbacks }: ControlFiscalSeriesProps) {
	const queryClient = useQueryClient();
	const { data: fiscalSeries, queryKey, isLoading, error } = useFiscalSeriesById({ id: fiscalSeriesId });
	const { state, updateFiscalSeries, redefineState } = useFiscalSeriesState({});

	useEffect(() => {
		if (!fiscalSeries) return;
		redefineState({
			fiscalSeries: {
				tipoDocumento: fiscalSeries.tipoDocumento,
				ambiente: fiscalSeries.ambiente,
				serie: fiscalSeries.serie,
				proximoNumero: fiscalSeries.proximoNumero,
				ativo: fiscalSeries.ativo,
			},
		});
	}, [fiscalSeries, redefineState]);

	const { mutate, isPending } = useMutation({
		mutationKey: ["update-fiscal-series", fiscalSeriesId],
		mutationFn: updateFiscalSeriesMutation,
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
			await queryClient.invalidateQueries({ queryKey: ["fiscal-series"] });
		},
	});

	return (
		<ResponsiveMenu
			menuTitle="EDITAR SÉRIE FISCAL"
			menuDescription="Atualize as informações da série fiscal"
			menuActionButtonText="SALVAR ALTERAÇÕES"
			menuCancelButtonText="CANCELAR"
			actionFunction={() =>
				mutate({
					fiscalSeriesId,
					fiscalSeries: state.fiscalSeries,
				})
			}
			actionIsLoading={isPending || isLoading}
			stateIsLoading={isLoading}
			stateError={error ? getErrorMessage(error) : null}
			closeMenu={closeModal}
			dialogVariant="md"
		>
			<FiscalSeriesGeneralBlock fiscalSeries={state.fiscalSeries} updateFiscalSeries={updateFiscalSeries} />
			<FiscalSeriesNumberingBlock fiscalSeries={state.fiscalSeries} updateFiscalSeries={updateFiscalSeries} />
		</ResponsiveMenu>
	);
}
