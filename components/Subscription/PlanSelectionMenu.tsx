import type { TGenerateCheckoutOutput } from "@/app/api/integrations/stripe/generate-checkout/route";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { AppSubscriptionPlans, CONSULTORIA_ADDON } from "@/config";
import { formatToMoney } from "@/lib/formatting";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { LayoutGrid, Loader2, Rocket } from "lucide-react";
import { useState } from "react";

type PlanSelectionMenuProps = {
	closeMenu: () => void;
};

export default function PlanSelectionMenu({ closeMenu }: PlanSelectionMenuProps) {
	const isDesktop = useMediaQuery("(min-width: 768px)");
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

	const content = (
		<div className="flex flex-col gap-3 p-4">
			{/* Bundle de consultoria (destaque) — plataforma + gestor dedicado */}
			<button
				type="button"
				disabled={checkoutMutation.isPending}
				onClick={handleConsultoriaSelect}
				className={cn(
					"group relative mt-1 flex items-center gap-4 rounded-xl p-4 text-left transition-all duration-300 border-2 cursor-pointer focus:outline-none focus:ring-4 focus:ring-[#24549C]/25",
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
					"bg-transparent border-gray-200 hover:bg-[#F5F5F0] hover:shadow-lg hover:scale-[1.005]",
					checkoutMutation.isPending && "opacity-50 cursor-not-allowed hover:scale-100",
				)}
			>
				<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100">
					<LayoutGrid className="h-5 w-5 text-[#24549C]" />
				</div>
				<div className="min-w-0 flex-1">
					<h3 className="font-bold text-sm text-gray-900">Plataforma</h3>
					<p className="text-gray-500 text-[11px] leading-snug">Plataforma completa — você opera as campanhas.</p>
				</div>
				<div className="flex shrink-0 flex-col items-end gap-1">
					<div className="flex items-baseline gap-0.5">
						<span className="font-bold text-lg tracking-tight text-gray-900">{formatToMoney(platformPrice).split(",")[0]}</span>
						<span className="text-xs font-bold text-gray-900">,{formatToMoney(platformPrice).split(",")[1]}</span>
						<span className="text-gray-500 font-medium text-[10px] ml-0.5">/mês</span>
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
	);

	if (isDesktop) {
		return (
			<Dialog onOpenChange={(v) => (v ? null : closeMenu())} open>
				<DialogContent className="max-w-lg max-h-[90vh] overflow-auto">
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
