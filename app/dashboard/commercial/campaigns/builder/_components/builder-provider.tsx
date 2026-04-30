"use client";

import type { TCampaignTriggerTypeEnum } from "@/schemas/enums";
import { useCampaignState, type TUseCampaignState } from "@/state-hooks/use-campaign-state";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { type TBuilderCategoryId, getCategoryFromTrigger } from "../_helpers/categories";
import { type TBuilderStageId, nextStage as getNext, prevStage as getPrev } from "../_helpers/stages";
import { getTriggerDefaultsPatch } from "../_helpers/trigger-defaults";

export type TBuilderMode = "create" | "edit";
export type TTriggerPanel = "grid" | "inlineConfig";

type BuilderUiState = {
	mode: TBuilderMode;
	selectedCategory: TBuilderCategoryId | null;
	currentStage: TBuilderStageId;
	transientPanel: TTriggerPanel;
	dirty: boolean;
};

type BuilderUiActions = {
	setSelectedCategory: (category: TBuilderCategoryId | null) => void;
	setCurrentStage: (stage: TBuilderStageId) => void;
	setTransientPanel: (panel: TTriggerPanel) => void;
	pickTrigger: (trigger: TCampaignTriggerTypeEnum) => void;
	resetTrigger: () => void;
	next: () => void;
	back: () => void;
	markClean: () => void;
};

type BuilderUiContextValue = BuilderUiState & BuilderUiActions;

const BuilderUiContext = createContext<BuilderUiContextValue | null>(null);
const BuilderCampaignContext = createContext<TUseCampaignState | null>(null);

export type BuilderProviderProps = {
	mode: TBuilderMode;
	initialCategory: TBuilderCategoryId | null;
	initialStage: TBuilderStageId;
	children: ReactNode;
};

export function BuilderProvider({ mode, initialCategory, initialStage, children }: BuilderProviderProps) {
	const campaignState = useCampaignState();
	const { updateCampaign } = campaignState;

	const [selectedCategory, setSelectedCategoryState] = useState<TBuilderCategoryId | null>(initialCategory);
	const [currentStage, setCurrentStageState] = useState<TBuilderStageId>(initialStage);
	const [transientPanel, setTransientPanel] = useState<TTriggerPanel>(
		// On edit mode we already have a trigger; default to inlineConfig.
		// On create mode we start at the grid (the user hasn't picked a trigger yet).
		mode === "edit" ? "inlineConfig" : "grid",
	);
	const [dirty, setDirty] = useState(false);
	const dirtyRef = useRef(dirty);
	dirtyRef.current = dirty;

	const markDirty = useCallback(() => {
		if (!dirtyRef.current) setDirty(true);
	}, []);

	const setSelectedCategory = useCallback(
		(category: TBuilderCategoryId | null) => {
			setSelectedCategoryState(category);
			setTransientPanel("grid");
			markDirty();
		},
		[markDirty],
	);

	const setCurrentStage = useCallback((stage: TBuilderStageId) => {
		setCurrentStageState(stage);
	}, []);

	const pickTrigger = useCallback(
		(trigger: TCampaignTriggerTypeEnum) => {
			updateCampaign(getTriggerDefaultsPatch(trigger, campaignState.state.campaign));
			setTransientPanel("inlineConfig");
			const inferredCategory = getCategoryFromTrigger(trigger);
			if (inferredCategory) setSelectedCategoryState(inferredCategory);
			markDirty();
		},
		[campaignState.state.campaign, markDirty, updateCampaign],
	);

	const resetTrigger = useCallback(() => {
		setTransientPanel("grid");
	}, []);

	const next = useCallback(() => {
		setCurrentStageState((prev) => getNext(prev) ?? prev);
	}, []);

	const back = useCallback(() => {
		setCurrentStageState((prev) => getPrev(prev) ?? prev);
	}, []);

	const markClean = useCallback(() => setDirty(false), []);

	// Wrap mutation methods so they mark the form as dirty without mutating
	// the underlying useCampaignState hook (which we want to reuse unchanged).
	const wrappedCampaignState = useMemo<TUseCampaignState>(() => {
		return {
			...campaignState,
			updateCampaign: (changes) => {
				markDirty();
				return campaignState.updateCampaign(changes);
			},
			addSegmentation: (s) => {
				markDirty();
				return campaignState.addSegmentation(s);
			},
			updateSegmentation: (s) => {
				markDirty();
				return campaignState.updateSegmentation(s);
			},
			deleteSegmentation: (i) => {
				markDirty();
				return campaignState.deleteSegmentation(i);
			},
			addFilterCondition: (path, condicao) => {
				markDirty();
				return campaignState.addFilterCondition(path, condicao);
			},
			updateFilterCondition: (path, condicao) => {
				markDirty();
				return campaignState.updateFilterCondition(path, condicao);
			},
			addFilterGroup: (path, op) => {
				markDirty();
				return campaignState.addFilterGroup(path, op);
			},
			updateFilterGroupOperator: (path, op) => {
				markDirty();
				return campaignState.updateFilterGroupOperator(path, op);
			},
			updateFiltersRoot: (partial) => {
				markDirty();
				return campaignState.updateFiltersRoot(partial);
			},
			removeFilterNode: (path) => {
				markDirty();
				return campaignState.removeFilterNode(path);
			},
			resetFilters: () => {
				markDirty();
				return campaignState.resetFilters();
			},
		};
	}, [campaignState, markDirty]);

	const ui = useMemo<BuilderUiContextValue>(
		() => ({
			mode,
			selectedCategory,
			currentStage,
			transientPanel,
			dirty,
			setSelectedCategory,
			setCurrentStage,
			setTransientPanel,
			pickTrigger,
			resetTrigger,
			next,
			back,
			markClean,
		}),
		[
			mode,
			selectedCategory,
			currentStage,
			transientPanel,
			dirty,
			setSelectedCategory,
			setCurrentStage,
			pickTrigger,
			resetTrigger,
			next,
			back,
			markClean,
		],
	);

	return (
		<BuilderCampaignContext.Provider value={wrappedCampaignState}>
			<BuilderUiContext.Provider value={ui}>{children}</BuilderUiContext.Provider>
		</BuilderCampaignContext.Provider>
	);
}

export function useBuilderUi() {
	const ctx = useContext(BuilderUiContext);
	if (!ctx) throw new Error("useBuilderUi must be used within BuilderProvider");
	return ctx;
}

export function useBuilderCampaign() {
	const ctx = useContext(BuilderCampaignContext);
	if (!ctx) throw new Error("useBuilderCampaign must be used within BuilderProvider");
	return ctx;
}
