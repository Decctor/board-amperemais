"use client";

import TextareaInput from "@/components/Inputs/TextareaInput";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { getErrorMessage } from "@/lib/errors";
import { updateService, useUpdateService } from "@/lib/mutations/chats";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
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
	const [confirmConclusion, setConfirmConclusion] = useState(false);

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
		if (!confirmConclusion) {
			toast.error("Confirme que deseja concluir o atendimento");
			return;
		}
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
			<div className="space-y-4">
				{/* Warning Banner */}
				<div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
					<AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
					<div className="flex-1">
						<p className="text-sm font-medium text-amber-800 dark:text-amber-200">Ação irreversível</p>
						<p className="text-xs text-amber-700 dark:text-amber-300/80 mt-0.5">
							Ao concluir o atendimento, ele será finalizado e não poderá ser reaberto.
						</p>
					</div>
				</div>

				<TextareaInput
					label="DESCRIÇÃO DO ATENDIMENTO"
					value={serviceDescription}
					placeholder="Descreva o atendimento realizado..."
					handleChange={setServiceDescription}
				/>

				{/* Confirmation Checkbox */}
				<div className="flex items-center gap-2">
					<Checkbox
						id="confirm-conclusion"
						checked={confirmConclusion}
						onCheckedChange={(checked) => setConfirmConclusion(checked === true)}
					/>
					<Label
						htmlFor="confirm-conclusion"
						className="text-sm text-muted-foreground cursor-pointer"
					>
						Confirmo que desejo concluir este atendimento
					</Label>
				</div>
			</div>
		</ResponsiveMenu>
	);
}
