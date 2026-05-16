"use client";

import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getErrorMessage } from "@/lib/errors";
import { createCampaign, updateCampaign } from "@/lib/mutations/campaigns";
import { useCampaignById } from "@/lib/queries/campaigns";
import type { TCampaignFiltersTree } from "@/schemas/campaigns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { normalizeFiltersForSubmit } from "@/components/Modals/Campaigns/utils";
import { getCategoryById, getCategoryFromTrigger, type TBuilderCategoryId } from "../_helpers/categories";
import { STAGE_ORDER, type TBuilderStageId } from "../_helpers/stages";
import { categoryParser, stageParser } from "../_helpers/url-state";
import { validateStage } from "../_helpers/validation";
import { useQueryState } from "nuqs";
import BuilderHeader from "./builder-header";
import BuilderStepper from "./builder-stepper";
import { BuilderProvider, useBuilderCampaign, useBuilderUi } from "./builder-provider";
import UnsavedChangesPrompt from "./unsaved-changes-prompt";
import StageAudience from "./stages/stage-audience";
import StageEffects from "./stages/stage-effects";
import StageReview from "./stages/stage-review";
import StageSend from "./stages/stage-send";
import StageSettings from "./stages/stage-settings";
import StageTrigger from "./stages/stage-trigger";

type BuilderShellProps = {
	initialCampaignId: string | null;
	membership: NonNullable<TAuthUserSession["membership"]>;
};

function createEmptyFiltersTree(): TCampaignFiltersTree {
	return { tipo: "GRUPO", operador: "AND", itens: [] };
}

export default function BuilderShell({ initialCampaignId, membership }: BuilderShellProps) {
	const mode = initialCampaignId ? "edit" : "create";
	const [categoryParam] = useQueryState("category", categoryParser.withOptions({ shallow: true }));
	const [stageParam] = useQueryState("stage", stageParser.withOptions({ shallow: true }));

	const initialCategory: TBuilderCategoryId | null = mode === "edit" ? null : (categoryParam ?? null);
	const initialStage: TBuilderStageId = mode === "edit" ? "review" : initialCategory ? (stageParam ?? "trigger") : "trigger";

	return (
		<BuilderProvider mode={mode} initialCategory={initialCategory} initialStage={initialStage}>
			<BuilderShellContent initialCampaignId={initialCampaignId} membership={membership} />
		</BuilderProvider>
	);
}

function BuilderShellContent({ initialCampaignId, membership }: BuilderShellProps) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const [leavePromptOpen, setLeavePromptOpen] = useState(false);
	const [, setCategoryParam] = useQueryState("category", categoryParser.withOptions({ shallow: true }));
	const [, setStageParam] = useQueryState("stage", stageParser.withOptions({ shallow: true }));

	const { mode, currentStage, selectedCategory, dirty, setSelectedCategory, setCurrentStage, markClean } = useBuilderUi();
	const campaignState = useBuilderCampaign();
	const { state, redefineState } = campaignState;

	const shouldLoadCampaign = mode === "edit" && !!initialCampaignId;
	const campaignQuery = useCampaignById({ id: initialCampaignId ?? "", enabled: shouldLoadCampaign });

	useEffect(() => {
		setStageParam(currentStage);
	}, [currentStage, setStageParam]);

	useEffect(() => {
		setCategoryParam(selectedCategory);
	}, [selectedCategory, setCategoryParam]);

	useEffect(() => {
		if (!shouldLoadCampaign || !campaignQuery.data) return;

		const { filtros: persistedFiltros, ...campaign } = campaignQuery.data;
		const filtros =
			persistedFiltros && (persistedFiltros as TCampaignFiltersTree).tipo === "GRUPO"
				? (persistedFiltros as TCampaignFiltersTree)
				: createEmptyFiltersTree();

		redefineState({
			campaign,
			segmentations: campaignQuery.data.segmentacoes,
			filtros,
		});
		setSelectedCategory(getCategoryFromTrigger(campaign.gatilhoTipo));
		setCurrentStage("review");
		markClean();
	}, [campaignQuery.data, markClean, redefineState, setCurrentStage, setSelectedCategory, shouldLoadCampaign]);

	const activeValidation = useMemo(
		() => validateStage(currentStage, state.campaign, state.segmentations),
		[currentStage, state.campaign, state.segmentations],
	);

	const { mutate: createCampaignMutation, isPending: createIsPending } = useMutation({
		mutationKey: ["create-campaign-builder"],
		mutationFn: createCampaign,
		onSuccess: async (data) => {
			markClean();
			toast.success(data.message);
			await queryClient.invalidateQueries({ queryKey: ["campaigns"] });
			router.push("/dashboard/commercial/campaigns?view=database");
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	const { mutate: updateCampaignMutation, isPending: updateIsPending } = useMutation({
		mutationKey: ["update-campaign-builder", initialCampaignId],
		mutationFn: updateCampaign,
		onSuccess: async (data) => {
			markClean();
			toast.success(data.message);
			await queryClient.invalidateQueries({ queryKey: ["campaigns"] });
			if (initialCampaignId) await queryClient.invalidateQueries({ queryKey: ["campaign-by-id", initialCampaignId] });
			router.push("/dashboard/commercial/campaigns?view=database");
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	function handleBackToList() {
		if (dirty) {
			setLeavePromptOpen(true);
			return;
		}
		router.push("/dashboard/commercial/campaigns?view=database");
	}

	function handleSubmit() {
		const category = getCategoryById(selectedCategory);
		if (!category || !category.triggers.includes(state.campaign.gatilhoTipo)) {
			setCurrentStage("trigger");
			toast.error("Escolha uma categoria e um gatilho para continuar.");
			return;
		}

		const invalidStage = STAGE_ORDER.map((stage) => ({
			stage,
			result: validateStage(stage, state.campaign, state.segmentations),
		})).find((item) => !item.result.valid);

		if (invalidStage) {
			setCurrentStage(invalidStage.stage);
			toast.error(invalidStage.result.reason ?? "Revise os campos obrigatórios.");
			return;
		}

		const payload = {
			campaign: { ...state.campaign, filtros: normalizeFiltersForSubmit(state.filtros) },
			segmentations: state.segmentations,
		};

		if (mode === "edit" && initialCampaignId) {
			updateCampaignMutation({ campaignId: initialCampaignId, ...payload });
			return;
		}

		createCampaignMutation(payload);
	}

	if (shouldLoadCampaign && campaignQuery.isLoading) return <LoadingComponent />;
	if (shouldLoadCampaign && campaignQuery.isError) {
		return <ErrorComponent msg={getErrorMessage(campaignQuery.error)} />;
	}

	const finalLoading = createIsPending || updateIsPending;

	return (
		<div className="mx-auto flex w-full flex-col gap-4 px-3 py-4 lg:px-6">
			<BuilderHeader backToUrl="/dashboard/commercial/campaigns?view=database" />
			<BuilderStepper />
			<div className="rounded-xl border border-border bg-background p-3 shadow-sm lg:p-5">
				{currentStage === "trigger" ? <StageTrigger validation={activeValidation} /> : null}
				{currentStage === "send" ? <StageSend organizationId={membership.organizacao.id} validation={activeValidation} /> : null}
				{currentStage === "audience" ? <StageAudience validation={activeValidation} /> : null}
				{currentStage === "effects" ? <StageEffects validation={activeValidation} /> : null}
				{currentStage === "settings" ? <StageSettings validation={activeValidation} /> : null}
				{currentStage === "review" ? <StageReview validation={activeValidation} finalLoading={finalLoading} onSubmit={handleSubmit} /> : null}
			</div>
			<UnsavedChangesPrompt
				open={leavePromptOpen}
				onCancel={() => setLeavePromptOpen(false)}
				onConfirm={() => {
					markClean();
					router.push("/dashboard/commercial/campaigns?view=database");
				}}
			/>
		</div>
	);
}
