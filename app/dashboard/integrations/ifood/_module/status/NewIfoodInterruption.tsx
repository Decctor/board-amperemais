"use client";

import DateTimeInput from "@/components/Inputs/DateTimeInput";
import TextInput from "@/components/Inputs/TextInput";
import ResponsiveMenuV2 from "@/components/Utils/ResponsiveMenuV2";
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
		const inicioDate = new Date(inicio);
		const fimDate = new Date(fim);
		if (Number.isNaN(inicioDate.getTime()) || Number.isNaN(fimDate.getTime())) return toast.error("Datas da pausa inválidas.");
		if (fimDate <= inicioDate) return toast.error("A data de fim da pausa deve ser posterior à data de início.");

		mutate({
			merchantId,
			descricao: descricao.trim(),
			inicio: inicioDate.toISOString(),
			fim: fimDate.toISOString(),
		});
	}

	return (
		<ResponsiveMenuV2
			menuTitle="PAUSAR LOJA"
			menuDescription="Cria uma pausa programada no iFood. A loja ficará fechada para pedidos durante o período informado."
			menuActionButtonText="PAUSAR LOJA"
			menuCancelButtonText="CANCELAR"
			closeMenu={closeModal}
			actionFunction={handleSubmit}
			actionIsLoading={isPending}
			stateIsLoading={false}
		>
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
		</ResponsiveMenuV2>
	);
}
