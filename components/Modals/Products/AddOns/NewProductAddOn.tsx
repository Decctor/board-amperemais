"use client";

import AddOnGroupForm from "@/components/Modals/Products/AddOns/AddOnGroupForm";
import { validateAddOnGroupFields } from "@/components/Modals/Products/Blocks/AddOns";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { getErrorMessage } from "@/lib/errors";
import { createProductAddOn } from "@/lib/mutations/products";
import type { TCreateProductAddOnInput } from "@/app/api/products/add-ons/route";
import { useProductAddOnState } from "@/state-hooks/use-product-state";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

type NewProductAddOnProps = {
	closeModal: () => void;
	callbacks?: {
		onMutate?: (variables: TCreateProductAddOnInput) => void;
		onSuccess?: () => void;
		onError?: (error: Error) => void;
		onSettled?: () => void;
	};
};

export default function NewProductAddOn({ closeModal, callbacks }: NewProductAddOnProps) {
	const { state, updateAddOn, addOption, updateOption, removeOption } = useProductAddOnState({});

	const { mutate, isPending } = useMutation({
		mutationKey: ["create-product-add-on"],
		mutationFn: createProductAddOn,
		onMutate: (variables) => callbacks?.onMutate?.(variables),
		onSuccess: (data) => {
			callbacks?.onSuccess?.();
			toast.success(data.message);
			closeModal();
		},
		onError: (error) => {
			callbacks?.onError?.(error);
			toast.error(getErrorMessage(error));
		},
		onSettled: () => callbacks?.onSettled?.(),
	});

	function handleSubmit() {
		if (!validateAddOnGroupFields(state)) return;
		if (state.opcoes.filter((option) => !option.deletar).some((option) => !option.nome.trim())) {
			toast.error("Informe o nome de todas as opções do grupo.");
			return;
		}
		mutate({ addOn: state });
	}

	return (
		<ResponsiveMenu
			menuTitle="NOVO GRUPO DE ADICIONAIS"
			menuDescription="Preencha os campos abaixo para criar um grupo de adicionais reutilizável entre produtos."
			menuActionButtonText="CRIAR GRUPO"
			menuCancelButtonText="CANCELAR"
			actionFunction={handleSubmit}
			actionIsLoading={isPending}
			stateIsLoading={false}
			stateError={null}
			closeMenu={closeModal}
			dialogVariant="lg"
			drawerVariant="lg"
		>
			<AddOnGroupForm state={state} updateAddOn={updateAddOn} addOption={addOption} updateOption={updateOption} removeOption={removeOption} />
		</ResponsiveMenu>
	);
}
