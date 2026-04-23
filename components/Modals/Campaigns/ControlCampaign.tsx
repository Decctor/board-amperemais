import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { getErrorMessage } from "@/lib/errors";
import { updateCampaign as updateCampaignMutation } from "@/lib/mutations/campaigns";
import { useCampaignById } from "@/lib/queries/campaigns";
import type { TCampaignFiltersTree } from "@/schemas/campaigns";
import { useCampaignState } from "@/state-hooks/use-campaign-state";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import CampaignsActionBlock from "./Blocks/Action";
import CampaignsCashbackGenerationBlock from "./Blocks/CashbackGeneration";
import CampaignsConfigBlock from "./Blocks/Config";
import CampaignsConversionBlock from "./Blocks/Conversion";
import CampaignsExecutionBlock from "./Blocks/Execution";
import CampaignsFiltersBlock from "./Blocks/Filters";
import CampaignsGeneralBlock from "./Blocks/General";
import CampaignsTriggerBlock from "./Blocks/Trigger";
import { normalizeFiltersForSubmit } from "./utils";

type ControlCampaignProps = {
	campaignId: string;
	organizationId: string;
	closeModal: () => void;
	callbacks?: {
		onMutate?: () => void;
		onSuccess?: () => void;
		onError?: () => void;
		onSettled?: () => void;
	};
};
export default function ControlCampaign({ campaignId, organizationId, closeModal, callbacks }: ControlCampaignProps) {
	const queryClient = useQueryClient();
	const {
		state,
		updateCampaign,
		addSegmentation,
		updateSegmentation,
		deleteSegmentation,
		updateFiltersRoot,
		addFilterCondition,
		updateFilterCondition,
		addFilterGroup,
		updateFilterGroupOperator,
		removeFilterNode,
		redefineState,
	} = useCampaignState();

	const { data: campaign, queryKey, isLoading, isError, isSuccess, error } = useCampaignById({ id: campaignId });

	const { mutate: handleUpdateCampaignMutation, isPending } = useMutation({
		mutationKey: ["update-campaign"],
		mutationFn: updateCampaignMutation,
		onMutate: async () => {
			await queryClient.cancelQueries({ queryKey });
			if (callbacks?.onMutate) callbacks.onMutate();
			return;
		},
		onSuccess: async (data) => {
			if (callbacks?.onSuccess) callbacks.onSuccess();
			return toast.success(data.message);
		},
		onError: async (error) => {
			if (callbacks?.onError) callbacks.onError();
			return toast.error(getErrorMessage(error));
		},
		onSettled: async () => {
			if (callbacks?.onSettled) callbacks.onSettled();
			return queryClient.invalidateQueries({ queryKey });
		},
	});
	useEffect(() => {
		if (!campaign) return;
		// Split the persisted campaign.filtros off from the campaign record so the state
		// hook can keep it at the top level. Empty / null persisted filtros → empty root.
		const { filtros: persistedFiltros, ...rest } = campaign;
		const filtrosTree: TCampaignFiltersTree =
			persistedFiltros && (persistedFiltros as TCampaignFiltersTree).tipo === "GRUPO"
				? (persistedFiltros as TCampaignFiltersTree)
				: { tipo: "GRUPO", operador: "AND", itens: [] };
		redefineState({ campaign: rest, segmentations: campaign.segmentacoes, filtros: filtrosTree });
	}, [campaign, redefineState]);
	return (
		<ResponsiveMenu
			menuTitle="EDITAR CAMPANHA"
			menuDescription="Preencha os campos abaixo para editar a campanha"
			menuActionButtonText="ATUALIZAR CAMPANHA"
			menuCancelButtonText="CANCELAR"
			actionFunction={() =>
				handleUpdateCampaignMutation({
					campaignId: campaignId,
					campaign: { ...state.campaign, filtros: normalizeFiltersForSubmit(state.filtros) },
					segmentations: state.segmentations,
				})
			}
			actionIsLoading={isPending}
			stateIsLoading={isLoading}
			stateError={error ? getErrorMessage(error) : null}
			closeMenu={closeModal}
		>
			<CampaignsGeneralBlock
				campaign={state.campaign}
				updateCampaign={updateCampaign}
				campaignSegmentations={state.segmentations}
				addSegmentation={addSegmentation}
				updateSegmentation={updateSegmentation}
				deleteSegmentation={deleteSegmentation}
			/>
			{/** TODO: ENABLE BACK AFTER TESTING */}
			{/* <CampaignsFiltersBlock
				filtros={state.filtros}
				campaignSegmentations={state.segmentations}
				addFilterCondition={addFilterCondition}
				updateFilterCondition={updateFilterCondition}
				addFilterGroup={addFilterGroup}
				updateFilterGroupOperator={updateFilterGroupOperator}
				updateFiltersRoot={updateFiltersRoot}
				removeFilterNode={removeFilterNode}
			/> */}
			<CampaignsTriggerBlock campaign={state.campaign} updateCampaign={updateCampaign} />
			<CampaignsExecutionBlock campaign={state.campaign} updateCampaign={updateCampaign} campaignSegmentations={state.segmentations} />
			<CampaignsActionBlock organizationId={organizationId} campaign={state.campaign} updateCampaign={updateCampaign} />
			<CampaignsConversionBlock campaign={state.campaign} updateCampaign={updateCampaign} />
			<CampaignsConfigBlock campaign={state.campaign} updateCampaign={updateCampaign} />
			<CampaignsCashbackGenerationBlock campaign={state.campaign} updateCampaign={updateCampaign} />
		</ResponsiveMenu>
	);
}
