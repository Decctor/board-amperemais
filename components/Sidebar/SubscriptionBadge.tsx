"use client";
import type { TGenerateCheckoutOutput } from "@/app/api/integrations/stripe/generate-checkout/route";
import ErrorComponent from "@/components/Layouts/ErrorComponent";
import LoadingComponent from "@/components/Layouts/LoadingComponent";
import { RecompraCRMIcon } from "@/components/icons";
import { LoadingButton } from "@/components/loading-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AppSubscriptionPlans, type TAppSubscriptionPlanKey } from "@/config";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { formatToMoney } from "@/lib/formatting";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const TRIAL_BADGE_COLOR = "hsl(0 0% 0%)";
const TRIAL_BADGE_FOREGROUND = "hsl(0 0% 100%)";

type TSubscriptionBadgeProps = {
	organization: NonNullable<TAuthUserSession["membership"]>["organizacao"];
};

export default function SubscriptionBadge({ organization }: TSubscriptionBadgeProps) {
	const { open } = useSidebar();
	const [showPlansMenu, setShowPlansMenu] = useState(false);

	// If active subscription, show the badge
	if (organization.assinaturaAtiva) {
		const isOnTrial = !organization.assinaturaPlano;
		const planKey = organization.assinaturaPlano as TAppSubscriptionPlanKey | null;
		const plan = planKey ? AppSubscriptionPlans[planKey] : null;

		const displayName = isOnTrial ? "EM TESTES" : (plan?.name ?? "Plano");
		const badgeColor = isOnTrial ? TRIAL_BADGE_COLOR : (plan?.badgeColor ?? "hsl(210 40% 96.1%)");
		const badgeForeground = isOnTrial ? TRIAL_BADGE_FOREGROUND : (plan?.badgeForeground ?? "hsl(222.2 47.4% 11.2%)");

		const badgeContent = (
			<SidebarMenuButton
				asChild
				className="h-10 flex items-center gap-2 justify-center transition-all duration-200 hover:opacity-90 rounded-4xl border-0"
				style={{
					background: isOnTrial ? TRIAL_BADGE_COLOR : `linear-gradient(135deg, ${plan?.color} 0%, ${plan?.color}D9 100%)`,
					color: isOnTrial ? TRIAL_BADGE_FOREGROUND : "#FFFFFF",
					boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
				}}
			>
				<Link href="/dashboard/settings?tab=subscription">
					<RecompraCRMIcon className="h-4 w-4 shrink-0 text-white" />
					{open && <span className="truncate font-bold text-xs tracking-wide text-white drop-shadow-sm">PLANO {displayName}</span>}
				</Link>
			</SidebarMenuButton>
		);

		return (
			<SidebarMenuItem>
				{open ? (
					badgeContent
				) : (
					<Tooltip>
						<TooltipTrigger asChild>{badgeContent}</TooltipTrigger>
						<TooltipContent side="right" sideOffset={8}>
							Sua organização faz parte do plano RecompraCRM {displayName}
						</TooltipContent>
					</Tooltip>
				)}
			</SidebarMenuItem>
		);
	}

	// If no active subscription, show acquire button
	const acquireContent = (
		<SidebarMenuButton
			onClick={() => setShowPlansMenu(true)}
			className="h-10 flex items-center gap-2 justify-center transition-all duration-200 bg-linear-to-r from-[#ffb900] to-[#ffb900]/90 text-white hover:text-white hover:from-[#ffb900]/80 hover:to-[#ffb900]/90 rounded-4xl shadow-md border-0"
		>
			<Sparkles className="h-4 w-4 shrink-0" />
			{open && <span className="truncate font-bold text-xs tracking-wide">ADQUIRIR PLANO</span>}
		</SidebarMenuButton>
	);

	return (
		<>
			<SidebarMenuItem>
				{open ? (
					acquireContent
				) : (
					<Tooltip>
						<TooltipTrigger asChild>{acquireContent}</TooltipTrigger>
						<TooltipContent side="right" sideOffset={8}>
							Adquirir Plano
						</TooltipContent>
					</Tooltip>
				)}
			</SidebarMenuItem>

			{showPlansMenu && <PlanSelectionMenu organization={organization} closeMenu={() => setShowPlansMenu(false)} />}
		</>
	);
}

// Plan Selection Menu Component
type PlanSelectionMenuProps = {
	organization: NonNullable<TAuthUserSession["membership"]>["organizacao"];
	closeMenu: () => void;
};

function PlanSelectionMenu({ organization, closeMenu }: PlanSelectionMenuProps) {
	const isDesktop = useMediaQuery("(min-width: 768px)");
	const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("monthly");
	const [selectedPlan, setSelectedPlan] = useState<TAppSubscriptionPlanKey | null>(null);

	const checkoutMutation = useMutation({
		mutationFn: async (subscription: string) => {
			const response = await fetch("/api/integrations/stripe/generate-checkout", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ subscription }),
			});
			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || "Erro ao gerar checkout");
			}
			return response.json() as Promise<TGenerateCheckoutOutput>;
		},
		onSuccess: (data) => {
			window.location.href = data.data.checkoutUrl;
		},
	});

	const handlePlanSelect = (planKey: TAppSubscriptionPlanKey) => {
		setSelectedPlan(planKey);
		const subscriptionKey = `${planKey}-${billingInterval.toUpperCase()}`;
		checkoutMutation.mutate(subscriptionKey);
	};

	const content = (
		<div className="flex flex-col gap-4 p-4">
			{/* Billing Toggle */}
			<div className="flex justify-center">
				<div className="relative flex items-center bg-gray-200/50 p-1.5 rounded-full">
					<button
						type="button"
						onClick={() => setBillingInterval("monthly")}
						disabled={checkoutMutation.isPending}
						className={cn(
							"relative z-10 box-border w-28 rounded-full py-2 text-center text-sm font-bold transition-colors duration-300",
							billingInterval === "monthly" ? "text-gray-900" : "text-gray-500 hover:text-gray-700",
							checkoutMutation.isPending && "opacity-50 cursor-not-allowed",
						)}
					>
						MENSAL
					</button>
					<button
						type="button"
						onClick={() => setBillingInterval("yearly")}
						disabled={checkoutMutation.isPending}
						className={cn(
							"relative z-10 box-border w-28 rounded-full py-2 text-center text-sm font-bold transition-colors duration-300",
							billingInterval === "yearly" ? "text-gray-900" : "text-gray-500 hover:text-gray-700",
							checkoutMutation.isPending && "opacity-50 cursor-not-allowed",
						)}
					>
						ANUAL
					</button>
					<div
						className={cn(
							"absolute top-1.5 bottom-1.5 w-28 rounded-full bg-[#FFD600] shadow-sm transition-all duration-300 ease-in-out",
							billingInterval === "monthly" ? "left-1.5" : "left-[calc(100%-7.35rem)]",
						)}
					/>
				</div>
			</div>

			{/* Plans Grid */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
				{(["ESSENCIAL", "CRESCIMENTO", "ESCALA"] as const).map((planKey) => {
					const plan = AppSubscriptionPlans[planKey];
					const pricing = plan.pricing[billingInterval];
					const isSelected = selectedPlan === planKey;

					// Calculate discount percentage for annual plans
					const monthlyEquivalent = plan.pricing.monthly.price * 12;
					const yearlyPrice = plan.pricing.yearly.price;
					const discountPercentage = Math.round(((monthlyEquivalent - yearlyPrice) / monthlyEquivalent) * 100);

					return (
						<button
							key={planKey}
							type="button"
							disabled={checkoutMutation.isPending}
							className={cn(
								"group relative flex flex-col rounded-xl p-4 transition-all duration-300 border-2 cursor-pointer text-left focus:outline-none focus:ring-4 focus:ring-yellow-400/30",
								"bg-transparent border-gray-200 hover:bg-[#F5F5F0] hover:shadow-lg hover:scale-[1.01]",
								isSelected ? "bg-[#F5F5F0] shadow-lg scale-[1.01] ring-2 ring-[#FFD600] ring-offset-2 border-transparent" : "",
								checkoutMutation.isPending && "opacity-50 cursor-not-allowed hover:scale-100",
							)}
							onClick={() => handlePlanSelect(planKey)}
						>
							{/* Discount Badge */}
							{billingInterval === "yearly" && (
								<div className="absolute -top-2 -right-2 bg-linear-to-r from-emerald-500 to-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md">
									-{discountPercentage}%
								</div>
							)}

							{/* Header */}
							<div className="mb-2">
								<h3 className="font-bold text-base text-gray-900 mb-0.5">{plan.name}</h3>
								<p className="text-gray-500 text-[10px] leading-relaxed line-clamp-2">{plan.description}</p>
							</div>

							{/* Features */}
							<ul className="mb-3 space-y-1 flex-1">
								{plan.pricingTableFeatures.slice(0, 4).map((feature, idx) => (
									<li key={idx.toString()} className="flex items-start gap-1.5">
										<div className="mt-0.5 rounded-full bg-emerald-100 p-0.5">
											<CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />
										</div>
										<span className="text-[10px] text-gray-700 font-medium leading-tight line-clamp-1">{feature.label}</span>
									</li>
								))}
								{plan.pricingTableFeatures.length > 4 && <li className="text-[10px] text-gray-500 ml-4">+{plan.pricingTableFeatures.length - 4} mais...</li>}
							</ul>

							{/* Footer: Pricing & Action */}
							<div className="space-y-2 pt-3 border-t border-gray-100 mt-auto">
								<div className="flex items-baseline gap-1">
									<span className="font-bold text-xl text-gray-900 tracking-tight">{formatToMoney(pricing.price).split(",")[0]}</span>
									<span className="text-sm font-bold text-gray-900">,{formatToMoney(pricing.price).split(",")[1]}</span>
									<span className="text-gray-500 font-medium text-[10px] ml-1">{billingInterval === "monthly" ? "/mês" : "/ano"}</span>
								</div>

								<div
									className={cn(
										"w-full h-8 rounded-4xl text-xs font-bold transition-all duration-300 flex items-center justify-center",
										"bg-[#FFD600] text-gray-900",
										isSelected && "ring-2 ring-gray-900 ring-offset-1",
									)}
								>
									{checkoutMutation.isPending && isSelected ? (
										<>
											<Loader2 className="h-3 w-3 animate-spin mr-1.5" />
											PROCESSANDO...
										</>
									) : (
										"ESCOLHER"
									)}
								</div>
							</div>
						</button>
					);
				})}
			</div>

			{checkoutMutation.isError && (
				<p className="text-red-500 text-sm text-center">{checkoutMutation.error?.message || "Erro ao processar. Tente novamente."}</p>
			)}
		</div>
	);

	if (isDesktop) {
		return (
			<Dialog onOpenChange={(v) => (v ? null : closeMenu())} open>
				<DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
					<DialogHeader>
						<DialogTitle>ESCOLHA SEU PLANO</DialogTitle>
						<DialogDescription>Selecione o plano ideal para o seu negócio</DialogDescription>
					</DialogHeader>
					{content}
				</DialogContent>
			</Dialog>
		);
	}

	return (
		<Drawer onOpenChange={(v) => (v ? null : closeMenu())} open>
			<DrawerContent className="max-h-[90vh]">
				<DrawerHeader className="text-left">
					<DrawerTitle>Escolha seu Plano</DrawerTitle>
					<DrawerDescription>Selecione o plano ideal para o seu negócio</DrawerDescription>
				</DrawerHeader>
				<div className="overflow-auto pb-6">{content}</div>
			</DrawerContent>
		</Drawer>
	);
}
