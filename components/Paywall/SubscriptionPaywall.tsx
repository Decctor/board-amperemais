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
import { AppSubscriptionPlans, CONSULTORIA_ADDON } from "@/config";
import { formatToMoney } from "@/lib/formatting";
import { switchOrganization } from "@/lib/mutations/organizations";
import { useOrganizationSubscriptionStatus, useUserMemberships } from "@/lib/queries/organizations";
import { useUserSession } from "@/lib/queries/session";
import { cn } from "@/lib/utils";
import LogoIcon from "@/utils/images/logo-icon.png";
import { useMutation } from "@tanstack/react-query";
import { Check, ChevronsUpDown, LayoutGrid, Loader2, Plus, Rocket, Shield, ShieldAlert } from "lucide-react";
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
	const [platformSelected, setPlatformSelected] = useState(false);
	const [consultoriaSelected, setConsultoriaSelected] = useState(false);

	const checkoutMutation = useMutation({
		mutationFn: async (vars: { subscription: string; consultoria?: boolean }) => {
			const response = await fetch("/api/integrations/stripe/generate-checkout", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(vars),
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

	// Plataforma (self-serve) — mensal. Internamente é o plano CRESCIMENTO.
	const platformPrice = AppSubscriptionPlans.CRESCIMENTO.pricing.monthly.price;
	const handlePlatformSelect = () => {
		setConsultoriaSelected(false);
		setPlatformSelected(true);
		checkoutMutation.mutate({ subscription: "CRESCIMENTO-MONTHLY" });
	};

	// Bundle: plataforma + consultoria (Gestor de Crescimento), num clique.
	const consultoriaBundlePrice = platformPrice + CONSULTORIA_ADDON.monthlyPrice;
	const handleConsultoriaSelect = () => {
		setPlatformSelected(false);
		setConsultoriaSelected(true);
		checkoutMutation.mutate({ subscription: "CRESCIMENTO-MONTHLY", consultoria: true });
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
				{/* Bundle de consultoria (destaque do pitch) — plataforma + gestor dedicado */}
				<button
					type="button"
					disabled={checkoutMutation.isPending}
					onClick={handleConsultoriaSelect}
					className={cn(
						"group relative flex items-center gap-4 rounded-xl p-4 text-left transition-all duration-300 border-2 cursor-pointer focus:outline-none focus:ring-4 focus:ring-[#24549C]/25",
						"bg-linear-to-br from-[#24549C] to-[#1a3d7a] border-transparent text-white hover:shadow-lg hover:scale-[1.005]",
						checkoutMutation.isPending && "opacity-50 cursor-not-allowed hover:scale-100",
					)}
				>
					<div className="absolute -top-2 left-4 bg-[#FFD600] text-gray-900 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md">RECOMENDADO</div>
					<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/15">
						<Rocket className="h-5 w-5 text-[#FFD600]" />
					</div>
					<div className="min-w-0 flex-1">
						<h3 className="font-bold text-sm">Plataforma + Gestor de Crescimento</h3>
						<p className="text-white/70 text-[11px] leading-snug">A gente opera por você: dados, campanhas e relatório de resultado.</p>
					</div>
					<div className="flex shrink-0 flex-col items-end gap-1">
						<div className="flex items-baseline gap-0.5">
							<span className="font-bold text-lg tracking-tight text-[#FFD600]">{formatToMoney(consultoriaBundlePrice).split(",")[0]}</span>
							<span className="text-xs font-bold text-[#FFD600]">,{formatToMoney(consultoriaBundlePrice).split(",")[1]}</span>
							<span className="text-white/60 font-medium text-[10px] ml-0.5">/mês</span>
						</div>
						<div className="flex h-7 items-center justify-center rounded-4xl bg-[#FFD600] px-3 text-[11px] font-bold text-gray-900">
							{checkoutMutation.isPending && consultoriaSelected ? <Loader2 className="h-3 w-3 animate-spin" /> : "CONTRATAR"}
						</div>
					</div>
				</button>

				{/* Plataforma (self-serve) — você opera */}
				<button
					type="button"
					disabled={checkoutMutation.isPending}
					onClick={handlePlatformSelect}
					className={cn(
						"group relative flex items-center gap-4 rounded-xl p-4 text-left transition-all duration-300 border-2 cursor-pointer focus:outline-none focus:ring-4 focus:ring-yellow-400/30",
						"bg-transparent border-gray-200 dark:border-gray-700 hover:bg-muted/50 hover:shadow-lg hover:scale-[1.005]",
						checkoutMutation.isPending && "opacity-50 cursor-not-allowed hover:scale-100",
					)}
				>
					<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
						<LayoutGrid className="h-5 w-5 text-[#24549C]" />
					</div>
					<div className="min-w-0 flex-1">
						<h3 className="font-bold text-sm">Plataforma</h3>
						<p className="text-muted-foreground text-[11px] leading-snug">Plataforma completa — você opera as campanhas.</p>
					</div>
					<div className="flex shrink-0 flex-col items-end gap-1">
						<div className="flex items-baseline gap-0.5">
							<span className="font-bold text-lg tracking-tight">{formatToMoney(platformPrice).split(",")[0]}</span>
							<span className="text-xs font-bold">,{formatToMoney(platformPrice).split(",")[1]}</span>
							<span className="text-muted-foreground font-medium text-[10px] ml-0.5">/mês</span>
						</div>
						<div className="flex h-7 items-center justify-center rounded-4xl bg-[#FFD600] px-3 text-[11px] font-bold text-gray-900">
							{checkoutMutation.isPending && platformSelected ? <Loader2 className="h-3 w-3 animate-spin" /> : "ESCOLHER"}
						</div>
					</div>
				</button>

				{checkoutMutation.isError && (
					<p className="text-red-500 text-sm text-center">{checkoutMutation.error?.message || "Erro ao processar. Tente novamente."}</p>
				)}
			</div>
		</div>
	);
}
