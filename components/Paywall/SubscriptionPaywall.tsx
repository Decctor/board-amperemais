"use client";

import type { TGenerateCheckoutOutput } from "@/app/api/integrations/stripe/generate-checkout/route";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AppSubscriptionPlans, type TAppSubscriptionPlanKey } from "@/config";
import { formatToMoney } from "@/lib/formatting";
import { switchOrganization } from "@/lib/mutations/organizations";
import { useOrganizationSubscriptionStatus, useUserMemberships } from "@/lib/queries/organizations";
import { useUserSession } from "@/lib/queries/session";
import { cn } from "@/lib/utils";
import LogoIcon from "@/utils/images/logo-icon.png";
import { useMutation } from "@tanstack/react-query";
import { Check, CheckCircle2, ChevronsUpDown, Loader2, Plus, Shield, ShieldAlert } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export default function SubscriptionPaywall() {
	const { data, isLoading } = useOrganizationSubscriptionStatus();

	if (isLoading || !data || data.modo !== "fail") return null;

	return (
		<div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm">
			<div className="w-full max-w-3xl mx-4 bg-background rounded-xl shadow-2xl border overflow-hidden">
				<PaywallContent mensagem={data.mensagem} status={data.status} />
			</div>
		</div>
	);
}

function PaywallOrgSwitcher({ disabled }: { disabled?: boolean }) {
	const { data: membershipsData, isLoading } = useUserMemberships();
	const { data: userSession } = useUserSession();

	const switchOrgMutation = useMutation({
		mutationFn: switchOrganization,
		onSuccess: () => {
			window.location.reload();
		},
	});

	if (isLoading) {
		return (
			<div className="flex justify-center py-1">
				<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
			</div>
		);
	}

	const memberships = membershipsData?.memberships ?? [];
	const activeOrganizationId = membershipsData?.activeOrganizationId ?? null;
	const hasMultipleOrgs = memberships.length > 1;
	const showPanelLink = userSession?.admin === true;
	const panelHref = "/admin-dashboard";
	const panelLabelUppercase = "PAINEL ADMIN";

	const currentOrg =
		memberships.find((m) => m.organizacao.id === activeOrganizationId)?.organizacao ?? (memberships.length === 1 ? memberships[0].organizacao : null);

	if (!hasMultipleOrgs) {
		return (
			<div className="flex justify-center">
				<div
					className={cn(
						"inline-flex max-w-full items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2",
						disabled && "pointer-events-none opacity-50",
					)}
				>
					<div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg">
						<Image src={currentOrg?.logoUrl ?? LogoIcon} alt={currentOrg?.nome ?? "RecompraCRM"} fill className="object-cover" />
					</div>
					<div className="min-w-0 text-left text-sm leading-tight">
						<span className="block truncate font-medium">{currentOrg?.nome ?? "RecompraCRM"}</span>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="w-full items-center flex justify-center flex-col py-2 gap-1.5">
			<h3 className="text-sm font-medium text-muted-foreground">Você está usando a organização:</h3>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						type="button"
						variant="ghost"
						disabled={disabled || switchOrgMutation.isPending}
						className="h-auto min-h-11 justify-between gap-2 rounded-lg border-border bg-muted/30 px-3 py-2 font-normal shadow-none hover:bg-muted/50"
					>
						<div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg">
							<Image src={currentOrg?.logoUrl ?? LogoIcon} alt={currentOrg?.nome ?? "Organização"} fill className="object-cover" />
						</div>
						<div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
							<span className="truncate font-medium">{currentOrg?.nome ?? "Selecionar organização"}</span>
						</div>
						{switchOrgMutation.isPending ? (
							<Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
						) : (
							<ChevronsUpDown className="size-4 shrink-0 opacity-60" aria-hidden />
						)}
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg z-200" side="bottom" align="center" sideOffset={4}>
					<DropdownMenuLabel>Organizações</DropdownMenuLabel>
					<DropdownMenuSeparator />
					{memberships.map((membership) => {
						const isActive = membership.organizacao.id === activeOrganizationId;
						return (
							<DropdownMenuItem
								key={membership.id}
								onClick={() => {
									if (!isActive && !switchOrgMutation.isPending) {
										switchOrgMutation.mutate({ organizationId: membership.organizacao.id });
									}
								}}
								className="cursor-pointer"
								disabled={switchOrgMutation.isPending}
							>
								<div className="flex w-full items-center gap-2">
									<div className="relative h-6 w-6 min-h-6 min-w-6 overflow-hidden rounded-md">
										<Image src={membership.organizacao.logoUrl ?? LogoIcon} alt={membership.organizacao.nome} fill className="object-cover" />
									</div>
									<span className="flex-1 truncate">{membership.organizacao.nome}</span>
									{isActive && <Check className="size-4 text-foreground" aria-hidden />}
								</div>
							</DropdownMenuItem>
						);
					})}
					<DropdownMenuSeparator />
					<DropdownMenuItem asChild className="cursor-pointer">
						<Link href="/onboarding">
							<div className="flex w-full items-center justify-center gap-2">
								<Plus className="h-4 w-4 min-h-4 min-w-4 shrink-0" />
								<span className="flex-1 truncate">NOVA ORGANIZAÇÃO</span>
							</div>
						</Link>
					</DropdownMenuItem>
					{showPanelLink && (
						<>
							<DropdownMenuSeparator />
							<DropdownMenuItem asChild className="cursor-pointer">
								<Link href={panelHref}>
									<div className="flex w-full items-center justify-center gap-2">
										<Shield className="h-4 w-4 min-h-4 min-w-4 shrink-0" />
										<span className="flex-1 truncate">{panelLabelUppercase}</span>
									</div>
								</Link>
							</DropdownMenuItem>
						</>
					)}
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}

function PaywallContent({ mensagem, status }: { mensagem: string; status: string }) {
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

	return (
		<div className="flex flex-col">
			{/* Header */}
			<div className="flex flex-col items-center gap-3 p-6 pb-4 border-b bg-muted/30">
				<div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
					<ShieldAlert className="w-6 h-6 text-red-600 dark:text-red-400" />
				</div>
				<div className="text-center">
					<h2 className="text-xl font-bold tracking-tight">{status.toUpperCase()}</h2>
					<p className="text-sm text-muted-foreground mt-1 max-w-md">{mensagem}</p>
				</div>
			</div>
			<PaywallOrgSwitcher disabled={checkoutMutation.isPending} />

			{/* Plan selection */}
			<div className="p-6 flex flex-col gap-4">
				{/* Billing toggle */}
				<div className="flex justify-center">
					<div className="relative flex items-center bg-gray-200/50 dark:bg-gray-800/50 p-1.5 rounded-full">
						<button
							type="button"
							onClick={() => setBillingInterval("monthly")}
							disabled={checkoutMutation.isPending}
							className={cn(
								"relative z-10 box-border w-28 rounded-full py-2 text-center text-sm font-bold transition-colors duration-300",
								billingInterval === "monthly" ? "text-gray-900 dark:text-white" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300",
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
								billingInterval === "yearly" ? "text-gray-900 dark:text-white" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300",
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

				{/* Plans grid */}
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
					{(["ESSENCIAL", "CRESCIMENTO", "ESCALA"] as const).map((planKey) => {
						const plan = AppSubscriptionPlans[planKey];
						const pricing = plan.pricing[billingInterval];
						const isSelected = selectedPlan === planKey;

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
									"bg-transparent border-gray-200 dark:border-gray-700 hover:bg-muted/50 hover:shadow-lg hover:scale-[1.01]",
									isSelected ? "bg-muted/50 shadow-lg scale-[1.01] ring-2 ring-[#FFD600] ring-offset-2 border-transparent" : "",
									checkoutMutation.isPending && "opacity-50 cursor-not-allowed hover:scale-100",
								)}
								onClick={() => handlePlanSelect(planKey)}
							>
								{billingInterval === "yearly" && (
									<div className="absolute -top-2 -right-2 bg-linear-to-r from-emerald-500 to-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md">
										-{discountPercentage}%
									</div>
								)}

								<div className="mb-2">
									<h3 className="font-bold text-base mb-0.5">{plan.name}</h3>
									<p className="text-muted-foreground text-[10px] leading-relaxed line-clamp-2">{plan.description}</p>
								</div>

								<ul className="mb-3 space-y-1 flex-1">
									{plan.pricingTableFeatures.slice(0, 3).map((feature, idx) => (
										<li key={idx.toString()} className="flex items-start gap-1.5">
											<div className="mt-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 p-0.5">
												<CheckCircle2 className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" />
											</div>
											<span className="text-[10px] font-medium leading-tight line-clamp-1">{feature.label}</span>
										</li>
									))}
									{plan.pricingTableFeatures.length > 3 && (
										<li className="text-[10px] text-muted-foreground ml-4">+{plan.pricingTableFeatures.length - 3} mais...</li>
									)}
								</ul>

								<div className="space-y-2 pt-3 border-t border-border mt-auto">
									<div className="flex items-baseline gap-1">
										<span className="font-bold text-xl tracking-tight">{formatToMoney(pricing.price).split(",")[0]}</span>
										<span className="text-sm font-bold">,{formatToMoney(pricing.price).split(",")[1]}</span>
										<span className="text-muted-foreground font-medium text-[10px] ml-1">{billingInterval === "monthly" ? "/mês" : "/ano"}</span>
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
		</div>
	);
}
