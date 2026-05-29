import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { getErrorMessage } from "@/lib/errors";
import { createFiscalTaxGroupMutation } from "@/lib/mutations/fiscal";
import { useFiscalTaxGroupState } from "@/state-hooks/use-fiscal-tax-group-state";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import FiscalTaxGroupGeneralBlock from "./Blocks/General";
import FiscalTaxGroupIcmsBlock from "./Blocks/Icms";
import FiscalTaxGroupPisCofinsBlock from "./Blocks/PisCofins";
import FiscalTaxGroupRulesBlock from "./Blocks/Rules";

type NewFiscalTaxGroupProps = {
	closeModal: () => void;
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: () => void;
		onSettled?: () => void;
	};
};
export default function NewFiscalTaxGroup({ closeModal, callbacks }: NewFiscalTaxGroupProps) {
	const queryClient = useQueryClient();
	const { state, updateFiscalTaxGroup, addRegra, updateRegra, removeRegra, resetState } = useFiscalTaxGroupState({});

	const { mutate, isPending } = useMutation({
		mutationKey: ["create-fiscal-tax-group"],
		mutationFn: createFiscalTaxGroupMutation,
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
			await queryClient.invalidateQueries({ queryKey: ["fiscal-tax-groups"] });
		},
	});

	return (
		<ResponsiveMenu
			menuTitle="NOVO GRUPO TRIBUTÁRIO"
			menuDescription="Defina como uma classe de produtos é tributada"
			menuActionButtonText="CRIAR GRUPO TRIBUTÁRIO"
			menuCancelButtonText="CANCELAR"
			actionFunction={() => mutate({ taxGroup: state.fiscalTaxGroup, regras: state.regras })}
			actionIsLoading={isPending}
			stateIsLoading={false}
			stateError={null}
			closeMenu={closeModal}
			dialogVariant="md"
		>
			<FiscalTaxGroupGeneralBlock fiscalTaxGroup={state.fiscalTaxGroup} updateFiscalTaxGroup={updateFiscalTaxGroup} />
			<FiscalTaxGroupIcmsBlock fiscalTaxGroup={state.fiscalTaxGroup} updateFiscalTaxGroup={updateFiscalTaxGroup} />
			<FiscalTaxGroupPisCofinsBlock fiscalTaxGroup={state.fiscalTaxGroup} updateFiscalTaxGroup={updateFiscalTaxGroup} />
			<FiscalTaxGroupRulesBlock regras={state.regras} addRegra={addRegra} updateRegra={updateRegra} removeRegra={removeRegra} />
		</ResponsiveMenu>
	);
}
