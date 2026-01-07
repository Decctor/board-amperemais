"use client";

import TextareaInput from "@/components/Inputs/TextareaInput";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { getErrorMessage } from "@/lib/errors";
import { updateService, useUpdateService } from "@/lib/mutations/chats";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

type ServiceConclusionDialogProps = {
	closeMenu: () => void;
	serviceId: string;
	currentDescription: string;
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: () => void;
		onSettled?: () => void;
	};
};

export function ServiceConclusionDialog({ closeMenu, serviceId, currentDescription, callbacks }: ServiceConclusionDialogProps) {
	const [serviceDescription, setServiceDescription] = useState(currentDescription);

	const updateServiceMutation = useUpdateService();

	const { mutate: handleUpdateService, isPending } = useMutation({
		mutationFn: updateService,
		mutationKey: ["update-service", serviceId],
		onMutate: () => {
			if (callbacks?.onMutate) callbacks.onMutate();
		},
		onSuccess: (data) => {
			if (callbacks?.onSuccess) callbacks.onSuccess();
			toast.success(data.message);
			return closeMenu();
		},
		onError: (error) => {
			if (callbacks?.onError) callbacks.onError();
			return toast.error(getErrorMessage(error));
		},
		onSettled: () => {
			if (callbacks?.onSettled) callbacks.onSettled();
		},
	});
	async function handleConclusion(newDescription: string) {
		if (!newDescription || newDescription.trim().length <= 3) {
			throw new Error("Defina um descrição de atendimento válida");
		}
		handleUpdateService({
			serviceId,
			descricao: newDescription,
			status: "CONCLUIDO",
		});
	}

	return (
		<ResponsiveMenu
			menuTitle="CONCLUIR ATENDIMENTO"
			menuDescription="Confirme a conclusão do atendimento."
			menuActionButtonText="CONCLUIR"
			menuCancelButtonText="CANCELAR"
			actionFunction={() => handleConclusion(serviceDescription)}
			actionIsLoading={updateServiceMutation.isPending}
			stateIsLoading={false}
			stateError={null}
			closeMenu={() => closeMenu()}
		>
			<TextareaInput
				label="DESCRIÇÃO DO ATENDIMENTO"
				value={serviceDescription}
				placeholder="Descreva o atendimento realizado..."
				handleChange={setServiceDescription}
			/>
		</ResponsiveMenu>
	);
}
