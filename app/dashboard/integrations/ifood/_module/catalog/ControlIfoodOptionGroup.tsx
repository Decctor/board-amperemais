"use client";

import NumberInput from "@/components/Inputs/NumberInput";
import TextInput from "@/components/Inputs/TextInput";
import ResponsiveMenuV2 from "@/components/Utils/ResponsiveMenuV2";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/errors";
import { formatToMoney } from "@/lib/formatting";
import type { TIfoodOptionGroupDTO } from "@/lib/integrations/ifood/catalog-types";
import { addIfoodOptions, deleteIfoodOptionGroup, patchIfoodOptions, updateIfoodOptionGroup } from "@/lib/mutations/ifood";
import { cn } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type ControlIfoodOptionGroupProps = {
	merchantId: string;
	optionGroup: TIfoodOptionGroupDTO;
	closeModal: () => void;
	callbacks?: {
		onSuccess?: () => void;
	};
};

/**
 * Modal de gestão de um grupo de complementos: renomear, pausar/reativar opções e adicionar novas
 * opções. As alterações de opções são aplicadas imediatamente (a API do iFood trabalha por lote).
 */
export function ControlIfoodOptionGroup({ merchantId, optionGroup, closeModal, callbacks }: ControlIfoodOptionGroupProps) {
	const [nome, setNome] = useState(optionGroup.nome ?? "");
	const [novaOpcaoNome, setNovaOpcaoNome] = useState("");
	const [novaOpcaoPreco, setNovaOpcaoPreco] = useState<number | null>(null);

	const renameMutation = useMutation({
		mutationKey: ["update-ifood-option-group", merchantId, optionGroup.id],
		mutationFn: updateIfoodOptionGroup,
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
		mutationKey: ["delete-ifood-option-group", merchantId, optionGroup.id],
		mutationFn: deleteIfoodOptionGroup,
		onSuccess: (data) => {
			callbacks?.onSuccess?.();
			toast.success(data.message);
			closeModal();
		},
		onError: (error) => {
			toast.error(getErrorMessage(error));
		},
	});

	const patchOptionsMutation = useMutation({
		mutationKey: ["patch-ifood-options", merchantId, optionGroup.id],
		mutationFn: patchIfoodOptions,
		onSuccess: (data) => {
			callbacks?.onSuccess?.();
			toast.success(data.message);
		},
		onError: (error) => {
			toast.error(getErrorMessage(error));
		},
	});

	const addOptionMutation = useMutation({
		mutationKey: ["add-ifood-options", merchantId, optionGroup.id],
		mutationFn: addIfoodOptions,
		onSuccess: (data) => {
			callbacks?.onSuccess?.();
			toast.success(data.message);
			setNovaOpcaoNome("");
			setNovaOpcaoPreco(null);
		},
		onError: (error) => {
			toast.error(getErrorMessage(error));
		},
	});

	function handleSave() {
		if (!nome.trim()) return toast.error("Informe o nome do grupo de complementos.");
		renameMutation.mutate({ merchantId, optionGroupId: optionGroup.id, nome: nome.trim(), status: null });
	}

	function handleDelete() {
		if (confirm(`Remover o grupo de complementos "${optionGroup.nome ?? optionGroup.id}" do iFood?`)) {
			deleteMutation.mutate({ merchantId, optionGroupId: optionGroup.id });
		}
	}

	function handleAddOption() {
		if (!novaOpcaoNome.trim()) return toast.error("Informe o nome da nova opção.");
		addOptionMutation.mutate({
			merchantId,
			optionGroupId: optionGroup.id,
			opcoes: [{ nome: novaOpcaoNome.trim(), preco: novaOpcaoPreco, codigoExterno: null, status: "AVAILABLE" }],
		});
	}

	return (
		<ResponsiveMenuV2
			menuTitle="GRUPO DE COMPLEMENTOS"
			menuDescription="Gerencie o nome e as opções deste grupo de complementos no iFood."
			menuActionButtonText="SALVAR GRUPO"
			menuCancelButtonText="FECHAR"
			closeMenu={closeModal}
			actionFunction={handleSave}
			actionIsLoading={renameMutation.isPending}
			stateIsLoading={false}
		>
			<div className="flex flex-col gap-4">
				<TextInput label="NOME DO GRUPO" value={nome} placeholder="Ex: Adicionais, Molhos, Bordas..." handleChange={setNome} />

				<div className="flex flex-col gap-1.5">
					<p className="text-xs font-medium tracking-tight uppercase text-muted-foreground">Opções</p>
					{optionGroup.opcoes.length === 0 ? (
						<p className="py-2 text-center text-xs text-muted-foreground">Nenhuma opção neste grupo.</p>
					) : (
						optionGroup.opcoes.map((opcao, index) => {
							const isAvailable = opcao.status?.toUpperCase() === "AVAILABLE";
							return (
								<div key={opcao.id ?? index} className="flex w-full items-center justify-between gap-2 rounded-lg border border-border px-2.5 py-2">
									<div className="flex min-w-0 flex-col gap-0.5">
										<span className="truncate text-sm font-medium text-foreground">{opcao.nome ?? "Opção sem nome"}</span>
										<span className="text-xs tabular-nums text-muted-foreground">{opcao.preco != null ? formatToMoney(opcao.preco) : "Sem preço"}</span>
									</div>
									<button
										type="button"
										disabled={patchOptionsMutation.isPending || !opcao.id}
										onClick={() => {
											if (!opcao.id) return;
											patchOptionsMutation.mutate({
												merchantId,
												tipo: "STATUS",
												opcoes: [{ optionId: opcao.id, status: isAvailable ? "UNAVAILABLE" : "AVAILABLE" }],
											});
										}}
										className={cn(
											"rounded-full px-2 py-0.5 text-[0.65rem] font-semibold transition-opacity hover:opacity-70",
											isAvailable ? "bg-emerald-500/15 text-emerald-600" : "bg-red-500/15 text-red-600",
										)}
										title={isAvailable ? "Pausar opção" : "Reativar opção"}
									>
										{isAvailable ? "DISPONÍVEL" : "INDISPONÍVEL"}
									</button>
								</div>
							);
						})
					)}
				</div>

				<div className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-2.5">
					<p className="text-xs font-medium tracking-tight uppercase text-muted-foreground">Adicionar opção</p>
					<TextInput label="NOME DA OPÇÃO" value={novaOpcaoNome} placeholder="Ex: Bacon extra..." handleChange={setNovaOpcaoNome} />
					<NumberInput label="PREÇO (R$)" value={novaOpcaoPreco} placeholder="Ex: 4,50..." handleChange={setNovaOpcaoPreco} />
					<Button variant="outline" size="sm" className="self-end" disabled={addOptionMutation.isPending} onClick={handleAddOption}>
						<Plus className="h-4 w-4" />
						ADICIONAR OPÇÃO
					</Button>
				</div>

				<div className="flex w-full justify-end border-t border-border pt-3">
					<Button variant="ghost-destructive" size="sm" disabled={deleteMutation.isPending} onClick={handleDelete}>
						<Trash2 className="h-4 w-4" />
						REMOVER GRUPO
					</Button>
				</div>
			</div>
		</ResponsiveMenuV2>
	);
}
