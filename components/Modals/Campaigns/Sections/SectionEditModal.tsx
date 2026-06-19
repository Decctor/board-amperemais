"use client";

import type { TGetCampaignsOutputById } from "@/app/api/campaigns/route";
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { getErrorMessage } from "@/lib/errors";
import { updateCampaign } from "@/lib/mutations/campaigns";
import { useCampaignState, type TUseCampaignState } from "@/state-hooks/use-campaign-state";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useEffect, useRef } from "react";
import { toast } from "sonner";
import { buildCampaignStateFromEntity, buildCampaignUpdatePayload } from "./utils";

type SectionValidationResult = { valid: boolean; reason?: string };

type SectionEditModalProps = {
	campaign: TGetCampaignsOutputById;
	menuTitle: string;
	menuDescription: string;
	dialogVariant?: "fit" | "sm" | "md" | "lg" | "xl";
	/** Optional gate run before submit; blocks the update and surfaces `reason`. */
	validate?: (state: TUseCampaignState["state"]) => SectionValidationResult;
	closeModal: () => void;
	callbacks?: {
		onSuccess?: () => void;
		onSettled?: () => void;
	};
	/** Renders the section's form blocks against the hydrated campaign state. */
	children: (controller: TUseCampaignState) => ReactNode;
};

/**
 * Shared shell for every per-section campaign edit. It hydrates a local
 * `useCampaignState` from the persisted campaign, renders the section blocks,
 * and submits the whole entity (so untouched fields are preserved) through the
 * existing `updateCampaign` mutation.
 */
export default function SectionEditModal({
	campaign,
	menuTitle,
	menuDescription,
	dialogVariant = "md",
	validate,
	closeModal,
	callbacks,
	children,
}: SectionEditModalProps) {
	const queryClient = useQueryClient();
	const controller = useCampaignState();
	const { state, redefineState } = controller;
	console.log("STATE", state);
	useEffect(() => {
		redefineState(buildCampaignStateFromEntity(campaign));
	}, [campaign, redefineState]);

	const { mutate, isPending } = useMutation({
		mutationKey: ["update-campaign-section", campaign.id],
		mutationFn: updateCampaign,
		onSuccess: async (data) => {
			toast.success(data.message);
			await queryClient.invalidateQueries({ queryKey: ["campaign-by-id", campaign.id] });
			await queryClient.invalidateQueries({ queryKey: ["campaigns"] });
			callbacks?.onSuccess?.();
		},
		onError: (error) => toast.error(getErrorMessage(error)),
		onSettled: async () => {
			callbacks?.onSettled?.();
			closeModal();
		},
	});

	function handleSubmit() {
		if (validate) {
			const result = validate(state);
			if (!result.valid) {
				toast.error(result.reason ?? "Revise os campos obrigatórios.");
				return;
			}
		}
		mutate(buildCampaignUpdatePayload(campaign.id, state));
	}

	return (
		<ResponsiveMenu
			menuTitle={menuTitle}
			menuDescription={menuDescription}
			menuActionButtonText="SALVAR ALTERAÇÕES"
			menuCancelButtonText="CANCELAR"
			actionFunction={handleSubmit}
			actionIsLoading={isPending}
			stateIsLoading={false}
			stateError={null}
			closeMenu={closeModal}
			dialogVariant={dialogVariant}
		>
			{children(controller)}
		</ResponsiveMenu>
	);
}
