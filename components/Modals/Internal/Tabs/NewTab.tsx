import type { TCreateTabInput, TCreateTabOutput } from "@/app/api/tabs/route";
import SelectInput from "@/components/Inputs/SelectInput";
import TextInput from "@/components/Inputs/TextInput";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { getErrorMessage } from "@/lib/errors";
import { createTab } from "@/lib/mutations/tabs";
import { useServicePoints, useServiceSettings } from "@/lib/queries/tabs";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

type NewTabProps = {
	// Pre-seleciona o ponto (clique num ponto livre do board).
	initialServicePointId?: string | null;
	closeModal: () => void;
	callbacks?: {
		onSuccess?: (data: TCreateTabOutput) => void;
	};
};

export function NewTab({ initialServicePointId, closeModal, callbacks }: NewTabProps) {
	const { data: settings, isLoading: settingsLoading, isError: settingsError, error } = useServiceSettings();
	const { data: servicePoints } = useServicePoints({ activeOnly: true });

	const [state, setState] = useState<TCreateTabInput>({
		servicePointId: initialServicePointId ?? null,
		codigo: null,
		clienteId: null,
		responsavelVendedorId: null,
		observacoes: null,
	});

	const { mutate, isPending } = useMutation({
		mutationKey: ["create-tab"],
		mutationFn: createTab,
		onSuccess: (data) => {
			callbacks?.onSuccess?.(data);
			toast.success(data.message);
			closeModal();
		},
		onError: (mutationError) => toast.error(getErrorMessage(mutationError)),
	});

	const showPointSelect = settings?.pontos.habilitados ?? false;
	const showCodeInput = settings?.contas.identificacao === "CODIGO_MANUAL";

	return (
		<ResponsiveMenu
			menuTitle="NOVA CONTA"
			menuDescription="Abra uma conta de atendimento para acumular pedidos até o fechamento."
			menuActionButtonText="ABRIR CONTA"
			menuCancelButtonText="CANCELAR"
			actionFunction={() => mutate(state)}
			actionIsLoading={isPending}
			stateIsLoading={settingsLoading}
			stateError={settingsError ? getErrorMessage(error) : null}
			closeMenu={closeModal}
		>
			<div className="flex flex-col gap-3 p-1">
				{showPointSelect ? (
					<SelectInput
						label="PONTO DE ATENDIMENTO"
						value={state.servicePointId}
						options={(servicePoints ?? []).map((point) => ({ id: point.id, value: point.id, label: point.rotulo }))}
						resetOptionLabel="NENHUM"
						handleChange={(value) => setState((prev) => ({ ...prev, servicePointId: value }))}
						onReset={() => setState((prev) => ({ ...prev, servicePointId: null }))}
					/>
				) : null}
				{showCodeInput ? (
					<TextInput
						label="CÓDIGO DA COMANDA"
						value={state.codigo ?? ""}
						placeholder="Ex: 15"
						handleChange={(value) => setState((prev) => ({ ...prev, codigo: value || null }))}
					/>
				) : null}
				<TextInput
					label="OBSERVAÇÕES"
					value={state.observacoes ?? ""}
					placeholder="Observações da conta (opcional)"
					handleChange={(value) => setState((prev) => ({ ...prev, observacoes: value || null }))}
				/>
			</div>
		</ResponsiveMenu>
	);
}
