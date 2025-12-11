"use client";

import TextareaInput from "@/components/Inputs/TextareaInput";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

type ServiceConclusionDialogProps = {
	closeMenu: () => void;
	serviceId: Id<"services">;
	currentDescription: string;
};

export function ServiceConclusionDialog({ closeMenu, serviceId, currentDescription }: ServiceConclusionDialogProps) {
	const [serviceDescription, setServiceDescription] = useState(currentDescription);
	const [isConclusioning, setIsConclusioning] = useState(false);

	const users = useQuery(api.queries.users.getUsers);
	const updateService = useMutation(api.mutations.services.updateService);

	const handleConclusion = async (newDescription: string) => {
		if (!newDescription || newDescription.trim().length <= 3) {
			toast.error("Defina um descrição de atendimento válida");
			return;
		}

		setIsConclusioning(true);
		try {
			await updateService({ serviceId, service: { descricao: newDescription, status: "CONCLUIDO", dataFim: Date.now() } });

			toast.success("Atendimento concluído com sucesso");
			closeMenu();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Erro ao concluir atendimento");
		} finally {
			setIsConclusioning(false);
		}
	};

	return (
		<ResponsiveMenu
			menuTitle="CONCLUIR ATENDIMENTO"
			menuDescription="Confirme a conclusão do atendimento."
			menuActionButtonText="CONCLUIR"
			menuCancelButtonText="CANCELAR"
			actionFunction={() => handleConclusion(serviceDescription)}
			actionIsLoading={isConclusioning}
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
