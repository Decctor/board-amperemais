"use client";

import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { getErrorMessage } from "@/lib/errors";
import { useClientState } from "@/state-hooks/use-client-state";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { updateClient as updateClientMutation } from "@/lib/mutations/clients";
import ClientGeneralBlock from "./Blocks/General";
import ClientLocationsBlock from "./Blocks/Locations";
import ClientProfileBlock from "./Blocks/Profile";
import ClientSocialsBlock from "./Blocks/Socials";
import { useClientById } from "@/lib/queries/clients";
import { useEffect } from "react";

type ControlClientProps = {
	clientId: string;
	closeModal: () => void;
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: () => void;
		onSettled?: () => void;
	};
};

function ControlClient({ clientId, closeModal, callbacks }: ControlClientProps) {
	const { data: client, isLoading, isError, error } = useClientById({ id: clientId });
	const { state, updateClient, addClientLocation, updateClientLocation, removeClientLocation, resetState, redefineState } = useClientState();

	const { mutate: handleUpdateClient, isPending } = useMutation({
		mutationKey: ["update-client", clientId],
		mutationFn: updateClientMutation,
		onMutate: async () => {
			if (callbacks?.onMutate) callbacks.onMutate();
			return;
		},
		onSuccess: async (response) => {
			if (callbacks?.onSuccess) callbacks.onSuccess();
			toast.success(response.message);
			resetState();
			closeModal();
		},
		onError: (error) => {
			if (callbacks?.onError) callbacks.onError();
			toast.error(getErrorMessage(error));
		},
		onSettled: async () => {
			if (callbacks?.onSettled) callbacks.onSettled();
			return;
		},
	});

	function handleSubmit() {
		if (!state.client.nome.trim()) {
			toast.error("Nome do cliente não informado.");
			return;
		}

		handleUpdateClient({
			clientId,
			client: state.client,
			clientLocations: state.clientLocations.map((location) => ({
				id: location.id ?? undefined,
				deletar: location.deletar ?? false,
				titulo: location.titulo,
				localizacaoCep: location.localizacaoCep,
				localizacaoEstado: location.localizacaoEstado,
				localizacaoCidade: location.localizacaoCidade,
				localizacaoBairro: location.localizacaoBairro,
				localizacaoLogradouro: location.localizacaoLogradouro,
				localizacaoNumero: location.localizacaoNumero,
				localizacaoComplemento: location.localizacaoComplemento,
				localizacaoLatitude: location.localizacaoLatitude,
				localizacaoLongitude: location.localizacaoLongitude,
			})),
		});
	}

	useEffect(() => {
		if (client) redefineState({ client: client, clientLocations: client.localizacoes });
	}, [client, redefineState]);
	return (
		<ResponsiveMenu
			menuTitle="EDITAR CLIENTE"
			menuDescription="Preencha os dados para editar o cliente."
			menuActionButtonText="ATUALIZAR CLIENTE"
			menuCancelButtonText="CANCELAR"
			actionFunction={handleSubmit}
			actionIsLoading={isPending}
			stateIsLoading={isLoading}
			stateError={isError ? getErrorMessage(error) : null}
			closeMenu={closeModal}
			dialogVariant="md"
			drawerVariant="md"
		>
			<ClientGeneralBlock client={state.client} updateClient={updateClient} />
			<ClientSocialsBlock client={state.client} updateClient={updateClient} />
			<ClientProfileBlock client={state.client} updateClient={updateClient} />
			<ClientLocationsBlock
				locations={state.clientLocations}
				addClientLocation={addClientLocation}
				updateClientLocation={updateClientLocation}
				removeClientLocation={removeClientLocation}
			/>
		</ResponsiveMenu>
	);
}

export default ControlClient;
