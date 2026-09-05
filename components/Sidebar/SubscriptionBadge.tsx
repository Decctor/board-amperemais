"use client";
import type { TBillingPortalOutput } from "@/app/api/integrations/stripe/billing-portal/route";
import { RecompraCRMIcon } from "@/components/icons";
import PlanSelectionMenu from "@/components/Subscription/PlanSelectionMenu";
import { SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AppSubscriptionPlans, type TAppSubscriptionPlanKey } from "@/config";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";

const TRIAL_BADGE_COLOR = "hsl(0 0% 0%)";
const TRIAL_BADGE_FOREGROUND = "hsl(0 0% 100%)";

type TSubscriptionBadgeProps = {
	organization: NonNullable<TAuthUserSession["membership"]>["organizacao"];
};

export default function SubscriptionBadge({ organization }: TSubscriptionBadgeProps) {
	const { open } = useSidebar();
	const [showPlansMenu, setShowPlansMenu] = useState(false);

	// Abre o portal de cobrança do Stripe (gestão da assinatura) para quem já paga.
	const portalMutation = useMutation({
		mutationFn: async () => {
			const response = await fetch("/api/integrations/stripe/billing-portal", { method: "POST" });
			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || "Erro ao abrir o portal de cobrança");
			}
			return response.json() as Promise<TBillingPortalOutput>;
		},
		onSuccess: (data) => {
			window.location.href = data.data.portalUrl;
		},
	});

	const isPaying = organization.assinaturaAtiva && !!organization.assinaturaPlano;
	const isOnTrial = organization.assinaturaAtiva && !organization.assinaturaPlano;

	// Assinante pagante → clicar abre o portal do Stripe para gerir a assinatura.
	if (isPaying) {
		const planKey = organization.assinaturaPlano as TAppSubscriptionPlanKey;
		const plan = AppSubscriptionPlans[planKey] ?? null;
		const displayName = plan?.name ?? "Plano";
		const planColor = plan?.color ?? "#24549C";

		const badgeContent = (
			<SidebarMenuButton
				onClick={() => portalMutation.mutate()}
				disabled={portalMutation.isPending}
				className="h-10 flex items-center gap-2 justify-center transition-all duration-200 hover:opacity-90 rounded-4xl border-0"
				style={{
					background: `linear-gradient(135deg, ${planColor} 0%, ${planColor}D9 100%)`,
					color: "#FFFFFF",
					boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
				}}
			>
				{portalMutation.isPending ? (
					<Loader2 className="h-4 w-4 shrink-0 animate-spin text-white" />
				) : (
					<RecompraCRMIcon className="h-4 w-4 shrink-0 text-white" />
				)}
				{open && <span className="truncate font-bold text-xs tracking-wide text-white drop-shadow-sm">PLANO {displayName}</span>}
			</SidebarMenuButton>
		);

		return (
			<SidebarMenuItem>
				{open ? (
					badgeContent
				) : (
					<Tooltip>
						<TooltipTrigger render={badgeContent} />
						<TooltipContent side="right" sideOffset={8}>
							Gerenciar assinatura
						</TooltipContent>
					</Tooltip>
				)}
			</SidebarMenuItem>
		);
	}

	// Em teste → clicar abre o menu de planos para assinar.
	if (isOnTrial) {
		const trialContent = (
			<SidebarMenuButton
				onClick={() => setShowPlansMenu(true)}
				className="h-10 flex items-center gap-2 justify-center transition-all duration-200 hover:opacity-90 rounded-4xl border-0"
				style={{
					background: TRIAL_BADGE_COLOR,
					color: TRIAL_BADGE_FOREGROUND,
					boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
				}}
			>
				<RecompraCRMIcon className="h-4 w-4 shrink-0 text-white" />
				{open && <span className="truncate font-bold text-xs tracking-wide text-white drop-shadow-sm">PLANO EM TESTES</span>}
			</SidebarMenuButton>
		);

		return (
			<>
				<SidebarMenuItem>
					{open ? (
						trialContent
					) : (
						<Tooltip>
							<TooltipTrigger render={trialContent} />
							<TooltipContent side="right" sideOffset={8}>
								Você está em período de testes — escolha um plano
							</TooltipContent>
						</Tooltip>
					)}
				</SidebarMenuItem>
				{showPlansMenu && <PlanSelectionMenu closeMenu={() => setShowPlansMenu(false)} />}
			</>
		);
	}

	// Sem assinatura ativa → botão de adquirir plano, que abre o menu de planos.
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
						<TooltipTrigger render={acquireContent} />
						<TooltipContent side="right" sideOffset={8}>
							Adquirir Plano
						</TooltipContent>
					</Tooltip>
				)}
			</SidebarMenuItem>
			{showPlansMenu && <PlanSelectionMenu closeMenu={() => setShowPlansMenu(false)} />}
		</>
	);
}
