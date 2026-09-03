"use client";

import TextInput from "@/components/Inputs/TextInput";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { getErrorMessage } from "@/lib/errors";
import { renameProductGroup } from "@/lib/mutations/products";
import { useMutation } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type RenameProductGroupProps = {
	grupo: string;
	/** Demais grupos da organização, para avisar quando o novo nome funde dois cadastros. */
	existingGroups?: string[];
	closeModal: () => void;
	callbacks?: {
		onSuccess?: (grupoNovo: string) => void;
		onError?: (error: Error) => void;
	};
};

export default function RenameProductGroup({ grupo, existingGroups = [], closeModal, callbacks }: RenameProductGroupProps) {
	const [grupoNovo, setGrupoNovo] = useState(grupo);
	const nomeFinal = grupoNovo.trim();

	// O grupo não é entidade: renomear é reescrever o texto em todos os produtos. Dizer isso na
	// tela evita a leitura de que a edição vale só para a vitrine.
	const mergesInto = nomeFinal !== grupo && existingGroups.some((item) => item === nomeFinal);

	const { mutate, isPending } = useMutation({
		mutationKey: ["rename-product-group", grupo],
		mutationFn: () => renameProductGroup({ grupoAtual: grupo, grupoNovo: nomeFinal }),
		onSuccess: (data) => {
			toast.success(data.message);
			callbacks?.onSuccess?.(data.data.grupo);
			closeModal();
		},
		onError: (error) => {
			callbacks?.onError?.(error as Error);
			toast.error(getErrorMessage(error));
		},
	});

	return (
		<ResponsiveMenu
			menuTitle="RENOMEAR GRUPO"
			menuDescription="O novo nome vale para todos os produtos deste grupo, não só na vitrine."
			menuActionButtonText="RENOMEAR"
			menuCancelButtonText="CANCELAR"
			menuActionButtonDisabled={nomeFinal.length === 0 || nomeFinal === grupo}
			actionFunction={() => mutate()}
			actionIsLoading={isPending}
			stateIsLoading={false}
			stateError={null}
			closeMenu={closeModal}
			dialogVariant="fit"
			drawerVariant="fit"
		>
			<div className="flex w-full flex-col gap-3 px-1 py-2">
				<TextInput
					label="NOME DO GRUPO"
					value={grupoNovo}
					placeholder="Ex.: Bebidas"
					handleChange={setGrupoNovo}
					required
				/>
				{mergesInto ? (
					<div className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
						<AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-500" />
						<p className="text-xs text-muted-foreground">
							Já existe um grupo chamado <span className="font-semibold text-foreground">{nomeFinal}</span>. Os produtos de{" "}
							<span className="font-semibold text-foreground">{grupo}</span> serão unidos a ele.
						</p>
					</div>
				) : null}
			</div>
		</ResponsiveMenu>
	);
}
