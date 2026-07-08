"use client";

import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { getErrorMessage } from "@/lib/errors";
import { updateAudience as updateAudienceMutation } from "@/lib/mutations/audiences";
import { useAudienceById } from "@/lib/queries/audiences";
import type { TCampaignFiltersTree } from "@/schemas/campaigns";
import type { TUpdateAudienceInput } from "@/schemas/audiences";
import {
	createEmptyFiltersTree,
	normalizeAudienceFiltersForSubmit,
	useInternalAudienceState,
	type TUseInternalAudienceState,
} from "@/state-hooks/use-internal-audience-state";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import AudienceGeneralBlock from "./Blocks/General";
import AudienceFiltersBlock from "./Blocks/Filters";
import AudienceSegmentationsBlock from "./Blocks/Segmentations";

type ControlAudienceProps = {
	audienceId: string;
	closeModal: () => void;
	callbacks?: {
		onMutate?: (variables: TUpdateAudienceInput) => void;
		onSuccess?: () => void;
		onError?: (error: Error) => void;
		onSettled?: () => void;
	};
};
export function ControlAudience({ audienceId, closeModal, callbacks }: ControlAudienceProps) {
	const queryClient = useQueryClient();
	const { data: audience, queryKey, isLoading, error } = useAudienceById({ audienceId });
	const {
		state,
		updateAudience,
		toggleSegmentacao,
		addFilterCondition,
		updateFilterCondition,
		addFilterGroup,
		updateFilterGroupOperator,
		removeFilterNode,
		redefineState,
	} = useInternalAudienceState({ initialState: {} });

	useEffect(() => {
		if (!audience) return;
		const filtros = audience.filtros as TCampaignFiltersTree | null;
		redefineState({
			audience: { nome: audience.nome, descricao: audience.descricao ?? null },
			segmentacoes: audience.segmentacoes ?? [],
			filtros: filtros && filtros.tipo === "GRUPO" ? filtros : createEmptyFiltersTree(),
		});
	}, [audience, redefineState]);

	async function handleUpdateAudience(state: TUseInternalAudienceState["state"]) {
		const nome = state.audience.nome.trim();
		if (!nome) throw new Error("Informe o nome do público.");
		const filtros = normalizeAudienceFiltersForSubmit(state.filtros);
		if (state.segmentacoes.length === 0 && !filtros) throw new Error("Selecione ao menos uma segmentação ou filtro.");
		return await updateAudienceMutation({
			id: audienceId,
			nome,
			descricao: state.audience.descricao?.trim() || null,
			segmentacoes: state.segmentacoes,
			filtros,
		});
	}

	const { mutate, isPending } = useMutation({
		mutationKey: ["update-audience", audienceId],
		mutationFn: handleUpdateAudience,
		onMutate: async (variables) => {
			await queryClient.cancelQueries({ queryKey });
			callbacks?.onMutate?.(variables as unknown as TUpdateAudienceInput);
		},
		onSuccess: (data) => {
			callbacks?.onSuccess?.();
			toast.success(data.message);
			closeModal();
		},
		onError: (error) => {
			callbacks?.onError?.(error);
			toast.error(getErrorMessage(error));
		},
		onSettled: async () => {
			callbacks?.onSettled?.();
			await queryClient.invalidateQueries({ queryKey });
		},
	});

	return (
		<ResponsiveMenu
			menuTitle="CONTROLAR PÚBLICO"
			menuDescription="Atualize as segmentações e filtros que definem este público."
			menuActionButtonText="SALVAR ALTERAÇÕES"
			menuCancelButtonText="CANCELAR"
			actionFunction={() => mutate(state)}
			actionIsLoading={isPending}
			stateIsLoading={isLoading}
			stateError={error ? getErrorMessage(error) : null}
			closeMenu={closeModal}
			dialogVariant="md"
			drawerVariant="lg"
		>
			<AudienceGeneralBlock audience={state.audience} updateAudience={updateAudience} />
			<AudienceSegmentationsBlock segmentacoes={state.segmentacoes} toggleSegmentacao={toggleSegmentacao} />
			<AudienceFiltersBlock
				filtros={state.filtros}
				segmentacoes={state.segmentacoes}
				addFilterCondition={addFilterCondition}
				updateFilterCondition={updateFilterCondition}
				addFilterGroup={addFilterGroup}
				updateFilterGroupOperator={updateFilterGroupOperator}
				removeFilterNode={removeFilterNode}
			/>
		</ResponsiveMenu>
	);
}
