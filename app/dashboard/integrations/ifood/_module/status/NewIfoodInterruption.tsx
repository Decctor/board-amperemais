"use client";
import { ResponsiveMenuAnimatedBody } from "@/components/Utils/ResponsiveMenuAnimatedBody";
import { LoadingButton } from "@/components/loading-button";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";

import DateTimeInput from "@/components/Inputs/DateTimeInput";
import TextInput from "@/components/Inputs/TextInput";
import { getErrorMessage } from "@/lib/errors";
import { createIfoodInterruption } from "@/lib/mutations/ifood";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

type NewIfoodInterruptionProps = {
	merchantId: string;
	closeModal: () => void;
	callbacks?: {
		onSuccess?: () => void;
	};
};

/** Modal de criação de pausa programada — fecha a loja no iFood durante o período informado. */
export function NewIfoodInterruption({ merchantId, closeModal, callbacks }: NewIfoodInterruptionProps) {
	const [descricao, setDescricao] = useState("");
	const [inicio, setInicio] = useState<string | undefined>(undefined);
	const [fim, setFim] = useState<string | undefined>(undefined);

	const { mutate, isPending } = useMutation({
		mutationKey: ["create-ifood-interruption", merchantId],
		mutationFn: createIfoodInterruption,
		onSuccess: (data) => {
			callbacks?.onSuccess?.();
			toast.success(data.message);
			closeModal();
		},
		onError: (error) => {
			toast.error(getErrorMessage(error));
		},
	});

	function handleSubmit() {
		if (!descricao.trim()) return toast.error("Informe a descrição da pausa.");
		if (!inicio) return toast.error("Informe a data de início da pausa.");
		if (!fim) return toast.error("Informe a data de fim da pausa.");
		// Sem conversão de fuso: o iFood grava o horário local da loja e descarta qualquer offset, então
		// converter para UTC deslocaria a pausa em 3h. O valor do input já é o wall-clock desejado.
		if (fim <= inicio) return toast.error("A data de fim da pausa deve ser posterior à data de início.");

		mutate({ merchantId, descricao: descricao.trim(), inicio, fim });
	}

	return (
		<ResponsiveMenu.Root
			open
			onOpenChange={(open) => {
				if (!open) closeModal();
			}}
		>
			<ResponsiveMenu.Content drawerClassName="max-h-[70dvh]">
				<ResponsiveMenu.Header>
					<ResponsiveMenu.Title>PAUSAR LOJA</ResponsiveMenu.Title>
					<ResponsiveMenu.Description>
						Cria uma pausa programada no iFood. A loja ficará fechada para pedidos durante o período informado.
					</ResponsiveMenu.Description>
				</ResponsiveMenu.Header>
				<ResponsiveMenuAnimatedBody stateKey="content" className="overflow-x-hidden overflow-y-auto">
					<div className="flex flex-col gap-4">
						<TextInput
							label="MOTIVO DA PAUSA"
							value={descricao}
							placeholder="Ex: Manutenção na cozinha, feriado, alta demanda..."
							handleChange={setDescricao}
						/>
						<DateTimeInput label="INÍCIO DA PAUSA" value={inicio} handleChange={setInicio} required />
						<DateTimeInput label="FIM DA PAUSA" value={fim} handleChange={setFim} required />
					</div>
				</ResponsiveMenuAnimatedBody>
				<ResponsiveMenu.Footer>
					<ResponsiveMenu.Close variant="outline">CANCELAR</ResponsiveMenu.Close>
					<LoadingButton loading={isPending} onClick={handleSubmit}>
						PAUSAR LOJA
					</LoadingButton>
				</ResponsiveMenu.Footer>
			</ResponsiveMenu.Content>
		</ResponsiveMenu.Root>
	);
}
