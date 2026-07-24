import SelectInput from "@/components/Inputs/SelectInput";
import TextInput from "@/components/Inputs/TextInput";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { getErrorMessage } from "@/lib/errors";
import { transferTab } from "@/lib/mutations/tabs";
import { useServicePoints } from "@/lib/queries/tabs";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

type TransferTabProps = {
	tabId: string;
	currentServicePointId: string | null;
	closeModal: () => void;
	callbacks?: {
		onSuccess?: () => void;
	};
};

export function TransferTab({ tabId, currentServicePointId, closeModal, callbacks }: TransferTabProps) {
	const { data: servicePoints, isLoading, isError, error } = useServicePoints({ activeOnly: true });
	const [servicePointDestinoId, setServicePointDestinoId] = useState<string | null>(null);
	const [motivo, setMotivo] = useState<string>("");

	const { mutate, isPending } = useMutation({
		mutationKey: ["transfer-tab", tabId],
		mutationFn: transferTab,
		onSuccess: (data) => {
			callbacks?.onSuccess?.();
			toast.success(data.message);
			closeModal();
		},
		onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
	});

	const options = (servicePoints ?? [])
		.filter((point) => point.id !== currentServicePointId)
		.map((point) => ({ id: point.id, value: point.id, label: point.rotulo }));

	return (
		<ResponsiveMenu
			menuTitle="TRANSFERIR CONTA"
			menuDescription="Mova a conta para outro ponto de atendimento, preservando pedidos e consumo."
			menuActionButtonText="TRANSFERIR"
			menuActionButtonDisabled={!servicePointDestinoId}
			menuCancelButtonText="CANCELAR"
			actionFunction={() => {
				if (!servicePointDestinoId) return;
				mutate({ tabId, servicePointDestinoId, motivo: motivo || null });
			}}
			actionIsLoading={isPending}
			stateIsLoading={isLoading}
			stateError={isError ? getErrorMessage(error) : null}
			closeMenu={closeModal}
		>
			<div className="flex flex-col gap-3 p-1">
				<SelectInput
					label="PONTO DE DESTINO"
					value={servicePointDestinoId}
					options={options}
					resetOptionLabel="SELECIONE"
					handleChange={(value) => setServicePointDestinoId(value)}
					onReset={() => setServicePointDestinoId(null)}
				/>
				<TextInput label="MOTIVO" value={motivo} placeholder="Motivo da transferência (opcional)" handleChange={setMotivo} />
			</div>
		</ResponsiveMenu>
	);
}
