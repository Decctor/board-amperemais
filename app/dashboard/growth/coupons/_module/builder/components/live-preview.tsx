"use client";

import { Eye } from "lucide-react";
import { buildCouponSummary } from "../helpers/summary";
import { useBuilderCoupon, useBuilderUi } from "./builder-provider";

/**
 * Always-visible plain-language readout of what the coupon does. Keeps the effect
 * of every choice in front of the lojista while they build, so nothing is abstract.
 */
export default function LivePreview() {
	const { benefitPicked } = useBuilderUi();
	const { state } = useBuilderCoupon();
	if (!benefitPicked) return null;

	return (
		<div className="flex w-full items-start gap-2.5 rounded-xl border border-primary/15 bg-primary/[0.04] px-3.5 py-2.5">
			<span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
				<Eye className="h-3.5 w-3.5" />
			</span>
			<div className="flex min-w-0 flex-col gap-0.5">
				<span className="text-[10px] font-semibold uppercase tracking-wider text-primary/80">Prévia do cupom</span>
				<p className="text-sm font-medium leading-snug text-foreground">{buildCouponSummary(state)}</p>
			</div>
		</div>
	);
}
