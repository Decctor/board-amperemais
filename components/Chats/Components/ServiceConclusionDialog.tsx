"use client";

import TextareaInput from "@/components/Inputs/TextareaInput";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { useUpdateService } from "@/lib/mutations/chats";
import { useState } from "react";
import { toast } from "sonner";

type ServiceConclusionDialogProps = {
	closeMenu: () => void;
	serviceId: string;
	currentDescription: string;
};

export function ServiceConclusionDialog({ closeMenu, serviceId, currentDescription }: ServiceConclusionDialogProps) {
	const [serviceDescription, setServiceDescription] = useState(currentDescription);

	const updateServiceMutation = useUpdateService();

	const handleConclusion = async (newDescription: string) => {
		if (!newDescription || newDescription.trim().length <= 3) {
			toast.error("Defina um descrição de atendimento válida");
			return;
		}

		try {
			await updateServiceMutation.mutateAsync({
				serviceId,
				descricao: newDescription,
				status: "CONCLUIDO",
			});

			toast.success("Atendimento concluído com sucesso");
			closeMenu();
		} catch (error) {
			// Error is already handled by the mutation hook
		}
	};

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
