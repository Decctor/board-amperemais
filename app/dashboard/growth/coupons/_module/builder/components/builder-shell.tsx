"use client";

import { getErrorMessage } from "@/lib/errors";
import { appRoutes } from "@/lib/navigation/routes";
import { createCoupon } from "@/lib/mutations/coupons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { toast } from "sonner";
import { COUPON_STAGES, STAGE_ORDER } from "../helpers/stages";
import { validateStage } from "../helpers/validation";
import { CouponBuilderProvider, useBuilderCoupon, useBuilderUi } from "./builder-provider";
import BuilderHeader from "./builder-header";
import BuilderStepper from "./builder-stepper";
import LivePreview from "./live-preview";
import StageNav from "./stage-nav";
import StageAudience from "./stages/stage-audience";
import StageBenefit from "./stages/stage-benefit";
import StageReview from "./stages/stage-review";
import StageRules from "./stages/stage-rules";
import StageValidity from "./stages/stage-validity";

const BACK_TO_URL = appRoutes.growth.coupons();

export default function CouponBuilderShell() {
	return (
		<CouponBuilderProvider>
			<BuilderShellContent />
		</CouponBuilderProvider>
	);
}

function BuilderShellContent() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { currentStage, benefitPicked, dirty, setCurrentStage, markClean } = useBuilderUi();
	const { state } = useBuilderCoupon();
	const { coupon, couponTargets, couponAudiences } = state;

	const activeValidation = useMemo(() => validateStage(currentStage, coupon, couponTargets), [currentStage, coupon, couponTargets]);

	// Warn before leaving with unsaved work (browser close / refresh / native nav).
	useEffect(() => {
		if (!dirty) return;
		function handleBeforeUnload(event: BeforeUnloadEvent) {
			event.preventDefault();
			event.returnValue = "";
		}
		window.addEventListener("beforeunload", handleBeforeUnload);
		return () => window.removeEventListener("beforeunload", handleBeforeUnload);
	}, [dirty]);

	const { mutate: createCouponMutation, isPending } = useMutation({
		mutationKey: ["create-coupon-builder"],
		mutationFn: createCoupon,
		onSuccess: async (data) => {
			markClean();
			toast.success(data.message);
			await queryClient.invalidateQueries({ queryKey: ["coupons"] });
			router.push(BACK_TO_URL);
		},
		onError: (error) => toast.error(getErrorMessage(error)),
	});

	function handleSubmit() {
		const invalidStage = STAGE_ORDER.map((stage) => ({ stage, result: validateStage(stage, coupon, couponTargets) })).find(
			(item) => !item.result.valid,
		);
		if (invalidStage) {
			setCurrentStage(invalidStage.stage);
			toast.error(invalidStage.result.reason ?? "Revise os campos obrigatórios.");
			return;
		}
		createCouponMutation({ coupon, couponTargets, couponAudiences });
	}

	const stageMeta = COUPON_STAGES[currentStage];
	const showStageHeading = !(currentStage === "benefit" && !benefitPicked);

	return (
		<div className="mx-auto flex w-full flex-col gap-4 px-3 py-4 lg:px-6">
			<BuilderHeader backToUrl={BACK_TO_URL} />
			<BuilderStepper />
			<LivePreview />
			<div className="flex w-full flex-col gap-4 rounded-2xl border border-border bg-background p-4 shadow-sm lg:p-5">
				{showStageHeading ? (
					<div className="flex flex-col">
						<h2 className="text-base font-semibold tracking-tight text-foreground">{stageMeta.label}</h2>
						<p className="text-xs text-muted-foreground">{stageMeta.description}</p>
					</div>
				) : null}

				{currentStage === "benefit" ? <StageBenefit /> : null}
				{currentStage === "rules" ? <StageRules /> : null}
				{currentStage === "audience" ? <StageAudience /> : null}
				{currentStage === "validity" ? <StageValidity /> : null}
				{currentStage === "review" ? <StageReview /> : null}

				{benefitPicked ? <StageNav validation={activeValidation} onSubmit={handleSubmit} submitLoading={isPending} /> : null}
			</div>
		</div>
	);
}
