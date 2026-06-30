import type { TCreateProductionInput } from "@/app/api/productions/route";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { getErrorMessage } from "@/lib/errors";
import { createProduction } from "@/lib/mutations/productions";
import { useInternalProductionState } from "@/state-hooks/use-internal-production-state";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import ProductionGeneralBlock from "./Blocks/ProductionGeneral";
import { ProductionInputsBlock, ProductionOutputsBlock } from "./Blocks/ProductionItems";

type NewProductionProps = {
	closeModal: () => void;
	callbacks?: {
		onMutate?: (variables: TCreateProductionInput) => void;
		onSuccess?: () => void;
		onError?: (error: Error) => void;
		onSettled?: () => void;
	};
};

export default function NewProduction({ closeModal, callbacks }: NewProductionProps) {
	const {
		state,
		updateProduction,
		addProductionInput,
		updateProductionInput,
		removeProductionInput,
		addProductionOutput,
		updateProductionOutput,
		removeProductionOutput,
		resetState,
	} = useInternalProductionState({ initialState: {} });

	const { mutate: handleCreateProductionMutation, isPending } = useMutation({
		mutationKey: ["create-production"],
		mutationFn: createProduction,
		onMutate: (variables) => callbacks?.onMutate?.(variables),
		onSuccess: (data) => {
			callbacks?.onSuccess?.();
			toast.success(data.message);
			resetState();
			closeModal();
		},
		onError: (error) => {
			callbacks?.onError?.(error);
			toast.error(getErrorMessage(error));
		},
		onSettled: () => callbacks?.onSettled?.(),
	});

	return (
		<ResponsiveMenu
			menuTitle="NOVA PRODUÇÃO"
			menuDescription="Planeje ou registre uma produção operacional."
			menuActionButtonText="CRIAR PRODUÇÃO"
			menuCancelButtonText="CANCELAR"
			actionFunction={() => handleCreateProductionMutation(state)}
			actionIsLoading={isPending}
			stateIsLoading={false}
			stateError={null}
			closeMenu={closeModal}
			dialogVariant="md"
		>
			<ProductionGeneralBlock production={state.production} updateProduction={updateProduction} />
			<ProductionInputsBlock
				productionInputs={state.productionInputs}
				addProductionInput={addProductionInput}
				updateProductionInput={updateProductionInput}
				removeProductionInput={removeProductionInput}
			/>
			<ProductionOutputsBlock
				productionOutputs={state.productionOutputs}
				addProductionOutput={addProductionOutput}
				updateProductionOutput={updateProductionOutput}
				removeProductionOutput={removeProductionOutput}
			/>
		</ResponsiveMenu>
	);
}
