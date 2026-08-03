"use client";

import CouponAudienceBlock from "@/components/Modals/Coupons/Blocks/Audience";
import type { TCouponScopeEnum } from "@/schemas/enums";
import { Globe, Info, UserRound } from "lucide-react";
import { useBuilderCoupon } from "../builder-provider";
import ChoiceCards from "../choice-cards";

export default function StageAudience() {
	const { state, updateCoupon, addCouponAudience, removeCouponAudience } = useBuilderCoupon();
	const { coupon, couponAudiences } = state;

	function handleScopeChange(value: TCouponScopeEnum) {
		updateCoupon({ escopo: value });
		// Tag/segment audiences are exclusive to GLOBAL coupons; drop them when switching to INDIVIDUAL.
		if (value === "INDIVIDUAL") {
			const activeCount = couponAudiences.filter((audience) => !audience.deletar).length;
			for (let i = 0; i < activeCount; i++) removeCouponAudience(0);
		}
	}

	return (
		<div className="flex w-full flex-col gap-5">
			<ChoiceCards<TCouponScopeEnum>
				label="Quem pode usar este cupom?"
				value={coupon.escopo}
				onChange={handleScopeChange}
				options={[
					{ value: "GLOBAL", label: "Qualquer cliente", description: "Vale para todo mundo, ou para os públicos que você escolher abaixo.", icon: Globe },
					{
						value: "INDIVIDUAL",
						label: "Clientes específicos",
						description: "O cupom é atribuído a clientes selecionados, por campanha ou manualmente.",
						icon: UserRound,
					},
				]}
			/>

			{coupon.escopo === "GLOBAL" ? (
				<CouponAudienceBlock couponAudiences={couponAudiences} addCouponAudience={addCouponAudience} removeCouponAudience={removeCouponAudience} />
			) : (
				<div className="flex w-full items-start gap-2.5 rounded-xl border border-border bg-muted/40 px-3.5 py-3">
					<Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
					<p className="text-xs leading-snug text-muted-foreground">
						Cupons individuais são entregues a clientes específicos, por uma campanha ou por atribuição manual no perfil do cliente. Por isso não usam
						restrição por tag ou segmento aqui.
					</p>
				</div>
			)}
		</div>
	);
}
