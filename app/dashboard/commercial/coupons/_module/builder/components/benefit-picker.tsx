"use client";

import { BENEFIT_CARDS } from "../helpers/benefits";
import BenefitCard from "./benefit-card";
import { useBuilderCoupon, useBuilderUi } from "./builder-provider";

export default function BenefitPicker() {
	const { pickBenefit } = useBuilderUi();
	const { state } = useBuilderCoupon();

	return (
		<div className="flex w-full flex-col gap-3">
			<div className="flex flex-col">
				<h2 className="text-base font-semibold tracking-tight text-foreground">O que você quer oferecer?</h2>
				<p className="text-xs text-muted-foreground">Escolha o tipo de benefício. Você poderá trocar depois.</p>
			</div>
			<div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
				{BENEFIT_CARDS.map((card) => (
					<BenefitCard
						key={card.id}
						icon={card.icon}
						label={card.label}
						tagline={card.tagline}
						description={card.description}
						example={card.example}
						selected={state.coupon.beneficioTipo === card.id}
						onClick={() => pickBenefit(card.id)}
					/>
				))}
			</div>
		</div>
	);
}
