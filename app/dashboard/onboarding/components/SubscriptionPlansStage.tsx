import { Button } from "@/components/ui/button";
import { AppSubscriptionPlans } from "@/config";
import { formatToMoney } from "@/lib/formatting";
import type { TUseOrganizationOnboardingState } from "@/state-hooks/use-organization-onboarding-state";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { SelectableCard } from "./SelectableCard";

type SubscriptionPlansStageProps = {
	state: TUseOrganizationOnboardingState["state"];
	updateOrganizationOnboarding: (changes: Partial<TUseOrganizationOnboardingState["state"]>) => void;
};

export function SubscriptionPlansStage({ state, updateOrganizationOnboarding }: SubscriptionPlansStageProps) {
	const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("monthly");

	const handlePlanSelect = (plan: "STARTER" | "PLUS") => {
		const subscriptionKey = `${plan}-${billingInterval.toUpperCase()}` as
			| "STARTER-MONTHLY"
			| "STARTER-YEARLY"
			| "PLUS-MONTHLY"
			| "PLUS-YEARLY";
		updateOrganizationOnboarding({ subscription: subscriptionKey });
	};

	return (
		<div className="flex flex-col gap-8">
			{/* Billing Toggle */}
			<div className="flex justify-center">
				<div className="flex items-center rounded-full border bg-muted p-1">
					<button
						type="button"
						onClick={() => setBillingInterval("monthly")}
						className={cn(
							"rounded-full px-6 py-2 font-medium text-sm transition-all",
							billingInterval === "monthly" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
						)}
					>
						Mensal
					</button>
					<button
						type="button"
						onClick={() => setBillingInterval("yearly")}
						className={cn(
							"rounded-full px-6 py-2 font-medium text-sm transition-all",
							billingInterval === "yearly" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
						)}
					>
						Anual
					</button>
				</div>
			</div>

			{/* Plans Grid */}
			<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
				{(["STARTER", "PLUS"] as const).map((planKey) => {
					const plan = AppSubscriptionPlans[planKey];
					const pricing = plan.pricing[billingInterval];
					const isSelected = state.subscription === `${planKey}-${billingInterval.toUpperCase()}`;

					return (
						<SelectableCard
							key={planKey}
							label={plan.name}
							selected={isSelected}
							onSelect={() => handlePlanSelect(planKey)}
							className="flex flex-col justify-between p-6"
						>
							<div className="mb-4 flex flex-col gap-4">
								<p className="text-sm text-muted-foreground">{plan.description}</p>
								<div className="flex items-baseline justify-center gap-1">
									<span className="font-bold text-3xl">{formatToMoney(pricing.price / 100)}</span>
									<span className="text-muted-foreground text-sm">/{billingInterval === "monthly" ? "mês" : "ano"}</span>
								</div>
							</div>
							<ul className="mb-6 flex flex-col gap-2 text-left text-sm">
								{Object.entries(plan.routes).map(([route, config]) => {
									// Simple way to show features based on routes, or hardcode features list if preferred.
									// For now, let's just show a few key highlights manually or just the description.
									// Since description is short, let's just stick to what we have in the card.
									return null; 
								})}
                                {/* Hardcoded features for better visuals if needed, or just rely on description */}
							</ul>
						</SelectableCard>
					);
				})}
			</div>

			{/* Free Trial Option */}
			<div className="flex justify-center border-t pt-8">
				<Button
					variant="outline"
					size="lg"
					className={cn(
						"w-full max-w-sm gap-2 border-primary/20 hover:bg-primary/5 hover:text-primary md:w-auto",
						state.subscription === "FREE-TRIAL" && "border-primary bg-primary/10 text-primary",
					)}
					onClick={() => updateOrganizationOnboarding({ subscription: "FREE-TRIAL" })}
				>
					Começar com Teste Grátis (7 dias)
				</Button>
			</div>
		</div>
	);
}
