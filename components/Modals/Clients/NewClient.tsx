import React, { useState } from "react";

import { TUserSession } from "@/schemas/users";

import * as Dialog from "@radix-ui/react-dialog";
import { VscChromeClose } from "react-icons/vsc";
import TextInput from "@/components/Inputs/TextInput";
import { TClient } from "@/schemas/clients";
import { formatToPhone } from "@/lib/formatting";
import SelectInput from "@/components/Inputs/SelectInput";
import { CustomersAcquisitionChannels } from "@/utils/select-options";
import { LoadingButton } from "@/components/loading-button";
import { useMutationWithFeedback } from "@/lib/mutations/common";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/mutations/clients";

type NewClientProps = {
	session: TUserSession;
	closeModal: () => void;
};
function NewClient({ session, closeModal }: NewClientProps) {
	const queryClient = useQueryClient();
	const [infoHolder, setInfoHolder] = useState<TClient>({
		nome: "",
		telefone: "",
		dataInsercao: new Date().toISOString(),
		autor: {
			id: session._id,
			nome: session.nome,
			avatar_url: session.avatar || null,
		},
	});

	const { mutate: handleCreateClient, isPending } = useMutationWithFeedback({
		mutationKey: ["create-client"],
		mutationFn: createClient,
		queryClient,
		affectedQueryKey: ["clients-by-search"],
	});
	return (
		<Dialog.Root open onOpenChange={closeModal}>
			<Dialog.Overlay className="fixed inset-0 z-100 bg-primary/70 backdrop-blur-xs" />
			<Dialog.Content className="fixed left-[50%] top-[50%] z-100 h-[90%] w-[90%] translate-x-[-50%] translate-y-[-50%] rounded-md bg-background p-[10px] lg:h-[60%] lg:w-[40%]">
				<div className="flex h-full w-full flex-col">
					<div className="flex flex-col items-center justify-between border-b border-gray-200 px-2 pb-2 text-lg lg:flex-row">
						<h3 className="text-sm font-bold lg:text-xl">NOVO CLIENTE</h3>
						<button
							onClick={() => closeModal()}
							type="button"
							className="flex items-center justify-center rounded-lg p-1 duration-300 ease-linear hover:scale-105 hover:bg-red-200"
						>
							<VscChromeClose style={{ color: "red" }} />
						</button>
					</div>
					<div className="scrollbar-thin scrollbar-track-primary/10 scrollbar-thumb-primary/30 flex h-full flex-col gap-y-2 overflow-y-auto overscroll-y-auto p-2 py-1">
						<div className="flex w-full flex-col items-center gap-2 lg:flex-row">
							<div className="w-full lg:w-1/2">
								<TextInput
									label="NOME DO CLIENTE"
									placeholder="Digite o nome do cliente..."
									value={infoHolder.nome}
									handleChange={(value) => setInfoHolder((prev) => ({ ...prev, nome: value }))}
									width="100%"
								/>
							</div>
							<div className="w-full lg:w-1/2">
								<TextInput
									label="TELEFONE DO CLIENTE"
									placeholder="Digite o nome do cliente..."
									value={infoHolder.telefone || ""}
									handleChange={(value) => setInfoHolder((prev) => ({ ...prev, telefone: formatToPhone(value) }))}
									width="100%"
								/>
							</div>
						</div>
						<TextInput
							label="EMAIL DO CLIENTE"
							placeholder="Preencha aqui o email do cliente..."
							value={infoHolder.email || ""}
							handleChange={(value) => setInfoHolder((prev) => ({ ...prev, email: value }))}
						/>
						<SelectInput
							label="CANAL DE AQUISIÇÃO"
							value={infoHolder.canalAquisicao || null}
							options={CustomersAcquisitionChannels}
							handleChange={(value) => setInfoHolder((prev) => ({ ...prev, canalAquisicao: value }))}
							onReset={() => setInfoHolder((prev) => ({ ...prev, canalAquisicao: null }))}
							selectedItemLabel="NÃO DEFINIDO"
							width="100%"
						/>
					</div>
					<div className="mt-2 flex w-full items-center justify-end">
						<LoadingButton
							loading={isPending}
							onClick={() =>
								// @ts-ignore
								handleCreateClient(infoHolder)
							}
							type="button"
						>
							CRIAR CLIENTE
						</LoadingButton>
					</div>
				</div>
			</Dialog.Content>
		</Dialog.Root>
	);
}

export default NewClient;
