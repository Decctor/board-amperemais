"use client";

import CheckboxInput from "@/components/Inputs/CheckboxInput";
import TextInput from "@/components/Inputs/TextInput";
import ResponsiveMenuV2 from "@/components/Utils/ResponsiveMenuV2";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/errors";
import type { TIfoodCategoryDTO } from "@/lib/integrations/ifood/catalog-types";
import { deleteIfoodCategory, updateIfoodCategory } from "@/lib/mutations/ifood";
import { useMutation } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type ControlIfoodCategoryProps = {
	merchantId: string;
	catalogId: string;
	category: TIfoodCategoryDTO;
	closeModal: () => void;
	callbacks?: {
		onSuccess?: () => void;
	};
};

/** Modal de edição/remoção de categoria do catálogo do iFood. */
export function ControlIfoodCategory({ merchantId, catalogId, category, closeModal, callbacks }: ControlIfoodCategoryProps) {
	const [nome, setNome] = useState(category.nome ?? "");
	const [codigoExterno, setCodigoExterno] = useState(category.codigoExterno ?? "");
	const [disponivel, setDisponivel] = useState(category.status?.toUpperCase() !== "UNAVAILABLE");

	const updateMutation = useMutation({
		mutationKey: ["update-ifood-category", merchantId, category.id],
		mutationFn: updateIfoodCategory,
		onSuccess: (data) => {
			callbacks?.onSuccess?.();
			toast.success(data.message);
			closeModal();
		},
		onError: (error) => {
			toast.error(getErrorMessage(error));
		},
	});

	const deleteMutation = useMutation({
		mutationKey: ["delete-ifood-category", merchantId, category.id],
		mutationFn: deleteIfoodCategory,
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
		updateMutation.mutate({
			merchantId,
			catalogId,
			categoryId: category.id,
			categoria: {
				nome: nome.trim(),
				codigoExterno: codigoExterno.trim() || null,
				status: disponivel ? "AVAILABLE" : "UNAVAILABLE",
			},
		});
	}

	function handleDelete() {
		if (confirm(`Remover a categoria "${category.nome ?? category.id}" do iFood? Os itens dela deixarão de ser vendidos.`)) {
			deleteMutation.mutate({ merchantId, categoryId: category.id });
		}
	}

	return (
		<ResponsiveMenuV2
			menuTitle="EDITAR CATEGORIA"
			menuDescription="Edite o nome, o código externo e a disponibilidade da categoria no iFood."
			menuActionButtonText="SALVAR CATEGORIA"
			menuCancelButtonText="CANCELAR"
			closeMenu={closeModal}
			actionFunction={handleSubmit}
			actionIsLoading={updateMutation.isPending}
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
				<div className="flex w-full justify-end border-t border-border pt-3">
					<Button variant="ghost-destructive" size="sm" disabled={deleteMutation.isPending} onClick={handleDelete}>
						<Trash2 className="h-4 w-4" />
						REMOVER CATEGORIA
					</Button>
				</div>
			</div>
		</ResponsiveMenuV2>
	);
}
