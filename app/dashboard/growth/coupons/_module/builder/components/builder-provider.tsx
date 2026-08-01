"use client";

import type { TCouponBenefitTypeEnum } from "@/schemas/enums";
import { type TUseInternalCouponState, useInternalCouponState } from "@/state-hooks/use-internal-coupon-state";
import { type ReactNode, createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { benefitIsItemScoped } from "../helpers/benefits";
import { type TCouponStageId, nextStage as getNext, prevStage as getPrev } from "../helpers/stages";

type BuilderUiState = {
	currentStage: TCouponStageId;
	benefitPicked: boolean;
	dirty: boolean;
};

type BuilderUiActions = {
	setCurrentStage: (stage: TCouponStageId) => void;
	pickBenefit: (type: TCouponBenefitTypeEnum) => void;
	reopenBenefitPicker: () => void;
	next: () => void;
	back: () => void;
	markClean: () => void;
};

type BuilderUiContextValue = BuilderUiState & BuilderUiActions;

const BuilderUiContext = createContext<BuilderUiContextValue | null>(null);
const CouponStateContext = createContext<TUseInternalCouponState | null>(null);

export function CouponBuilderProvider({ children }: { children: ReactNode }) {
	const couponState = useInternalCouponState({});
	const { updateCoupon } = couponState;

	const [currentStage, setCurrentStageState] = useState<TCouponStageId>("benefit");
	const [benefitPicked, setBenefitPicked] = useState(false);
	const [dirty, setDirty] = useState(false);
	const dirtyRef = useRef(dirty);
	dirtyRef.current = dirty;

	const markDirty = useCallback(() => {
		if (!dirtyRef.current) setDirty(true);
	}, []);

	const setCurrentStage = useCallback((stage: TCouponStageId) => setCurrentStageState(stage), []);

	const pickBenefit = useCallback(
		(type: TCouponBenefitTypeEnum) => {
			// Item-scoped benefits (preço fixo, leve/pague) must apply to eligible items.
			updateCoupon({ beneficioTipo: type, beneficioAplicacao: benefitIsItemScoped(type) ? "ITENS_ELEGIVEIS" : "VENDA_TOTAL" });
			setBenefitPicked(true);
			markDirty();
		},
		[updateCoupon, markDirty],
	);

	const reopenBenefitPicker = useCallback(() => setBenefitPicked(false), []);

	const next = useCallback(() => setCurrentStageState((prev) => getNext(prev) ?? prev), []);
	const back = useCallback(() => setCurrentStageState((prev) => getPrev(prev) ?? prev), []);
	const markClean = useCallback(() => setDirty(false), []);

	// Wrap every mutator so any edit flips the dirty flag for the unsaved-changes guard.
	const wrappedCouponState = useMemo<TUseInternalCouponState>(
		() => ({
			...couponState,
			updateCoupon: (patch) => {
				markDirty();
				return couponState.updateCoupon(patch);
			},
			addCouponTarget: (target) => {
				markDirty();
				return couponState.addCouponTarget(target);
			},
			updateCouponTarget: (index, target) => {
				markDirty();
				return couponState.updateCouponTarget(index, target);
			},
			removeCouponTarget: (index) => {
				markDirty();
				return couponState.removeCouponTarget(index);
			},
			addCouponAudience: (audience) => {
				markDirty();
				return couponState.addCouponAudience(audience);
			},
			removeCouponAudience: (index) => {
				markDirty();
				return couponState.removeCouponAudience(index);
			},
		}),
		[couponState, markDirty],
	);

	const ui = useMemo<BuilderUiContextValue>(
		() => ({
			currentStage,
			benefitPicked,
			dirty,
			setCurrentStage,
			pickBenefit,
			reopenBenefitPicker,
			next,
			back,
			markClean,
		}),
		[currentStage, benefitPicked, dirty, setCurrentStage, pickBenefit, reopenBenefitPicker, next, back, markClean],
	);

	return (
		<CouponStateContext.Provider value={wrappedCouponState}>
			<BuilderUiContext.Provider value={ui}>{children}</BuilderUiContext.Provider>
		</CouponStateContext.Provider>
	);
}

export function useBuilderUi() {
	const ctx = useContext(BuilderUiContext);
	if (!ctx) throw new Error("useBuilderUi must be used within CouponBuilderProvider");
	return ctx;
}

export function useBuilderCoupon() {
	const ctx = useContext(CouponStateContext);
	if (!ctx) throw new Error("useBuilderCoupon must be used within CouponBuilderProvider");
	return ctx;
}
