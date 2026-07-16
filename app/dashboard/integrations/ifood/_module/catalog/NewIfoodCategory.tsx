"use client";

import CheckboxInput from "@/components/Inputs/CheckboxInput";
import TextInput from "@/components/Inputs/TextInput";
import ResponsiveMenuV2 from "@/components/Utils/ResponsiveMenuV2";
import { getErrorMessage } from "@/lib/errors";
import { createIfoodCategory } from "@/lib/mutations/ifood";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

type NewIfoodCategoryProps = {
	merchantId: string;
	catalogId: string;
	closeModal: () => void;
	callbacks?: {
		onSuccess?: () => void;
	};
};

/** Modal de criação de categoria no catálogo do iFood. */
export function NewIfoodCategory({ merchantId, catalogId, closeModal, callbacks }: NewIfoodCategoryProps) {
	const [nome, setNome] = useState("");
	const [codigoExterno, setCodigoExterno] = useState("");
	const [disponivel, setDisponivel] = useState(true);

	const { mutate, isPending } = useMutation({
		mutationKey: ["create-ifood-category", merchantId],
		mutationFn: createIfoodCategory,
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
		if (!nome.trim()) return toast.error("Informe o nome da categoria.");
		mutate({
			merchantId,
			catalogId,
			categoria: {
				nome: nome.trim(),
				codigoExterno: codigoExterno.trim() || null,
				status: disponivel ? "AVAILABLE" : "UNAVAILABLE",
			},
		});
	}

	return (
		<ResponsiveMenuV2
			menuTitle="NOVA CATEGORIA"
			menuDescription="Cria uma nova categoria no catálogo da sua loja no iFood."
			menuActionButtonText="CRIAR CATEGORIA"
			menuCancelButtonText="CANCELAR"
			closeMenu={closeModal}
			actionFunction={handleSubmit}
			actionIsLoading={isPending}
			stateIsLoading={false}
		>
			<div className="flex flex-col gap-4">
				<TextInput label="NOME DA CATEGORIA" value={nome} placeholder="Ex: Lanches, Bebidas, Sobremesas..." handleChange={setNome} />
				<TextInput
					label="CÓDIGO EXTERNO (PDV)"
					value={codigoExterno}
					placeholder="Código da categoria no seu sistema..."
					handleChange={setCodigoExterno}
				/>
				<CheckboxInput labelTrue="Categoria disponível" labelFalse="Categoria disponível" checked={disponivel} handleChange={setDisponivel} />
			</div>
		</ResponsiveMenuV2>
	);
}
