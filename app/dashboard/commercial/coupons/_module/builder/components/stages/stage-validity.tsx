"use client";

import CouponValidityAndLimitsBlock from "@/components/Modals/Coupons/Blocks/ValidityAndLimits";
import { useBuilderCoupon } from "../builder-provider";

export default function StageValidity() {
	const { state, updateCoupon } = useBuilderCoupon();
	return (
		<div className="flex w-full flex-col gap-4">
			<CouponValidityAndLimitsBlock coupon={state.coupon} updateCoupon={updateCoupon} />
		</div>
	);
}
