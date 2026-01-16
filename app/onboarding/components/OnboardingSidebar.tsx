import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import RecompraCRMLogo from "@/utils/svgs/logos/RECOMPRA - COMPLETE - VERTICAL - COLORFUL.svg";
import { AreaChartIcon, BuildingIcon, Check, CreditCardIcon, TargetIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export type OnboardingStage = "organization-general-info" | "organization-niche-origin" | "organization-actuation" | "subscription-plans-section";

const STAGES: { id: OnboardingStage; label: string; description: string; icon: ReactNode }[] = [
	{
		id: "organization-general-info",
		label: "Sobre a organização",
		description: "Dados básicos da empresa",
		icon: <BuildingIcon className="h-5 w-5" />,
	},
	{ id: "organization-niche-origin", label: "Nicho e Origem", description: "Segmento de atuação", icon: <TargetIcon className="h-5 w-5" /> },
	{ id: "organization-actuation", label: "Atuação", description: "Escala e operações", icon: <AreaChartIcon className="h-5 w-5" /> },
	{ id: "subscription-plans-section", label: "Planos", description: "Escolha seu plano", icon: <CreditCardIcon className="h-5 w-5" /> },
];

type OnboardingSidebarProps = {
	currentStage: OnboardingStage;
};

export function OnboardingSidebar({ currentStage }: OnboardingSidebarProps) {
	const currentStageIndex = STAGES.findIndex((s) => s.id === currentStage);

	return (
		<div className="w-[450px] h-full flex flex-col justify-between gap-6 py-4 z-20">
			<div className="flex flex-col gap-12">
				<div className="flex items-center justify-center">
					<div className="relative w-36 h-36 filter drop-shadow-lg">
						<Image src={RecompraCRMLogo} alt="RecompraCRM Logo" fill={true} className="object-contain" />
					</div>
				</div>
				<div className="flex flex-col gap-14 px-4">
					{STAGES.map((stage, index) => {
						const isCompleted = index < currentStageIndex;
						const isCurrent = index === currentStageIndex;

						return (
							<div key={stage.id} className="relative flex items-center gap-5 group">
								{/* Vertical Line Connector */}
								{index !== STAGES.length - 1 && (
									<div
										className={cn(
											"absolute top-10 left-[22px] h-full w-[2px] -translate-x-1/2 transition-colors duration-500",
											index < currentStageIndex ? "bg-gradient-to-b from-[#FFB900] to-white/20" : "bg-white/10",
										)}
										style={{ height: "calc(100% + 40px)" }}
									/>
								)}

								<div
									className={cn("flex items-center justify-center w-[44px] h-[44px] rounded-xl z-10 transition-all duration-300 shadow-lg border-2", {
										"bg-[#FFB900] border-[#FFB900] text-blue-900 scale-100": isCompleted,
										"bg-white border-white text-blue-900 scale-110 shadow-blue-900/40 ring-4 ring-white/10": !isCompleted && isCurrent,
										"bg-transparent border-white/30 text-white/50": !isCompleted && !isCurrent,
									})}
								>
									{isCompleted ? <Check className="h-5 w-5 stroke-[3px]" /> : stage.icon}
								</div>
								<div className="flex flex-col">
									<span
										className={cn("font-bold text-base transition-colors duration-300", {
											"text-white": isCurrent || isCompleted,
											"text-white/50 group-hover:text-white/80": !isCurrent && !isCompleted,
										})}
									>
										{stage.label}
									</span>
									<span
										className={cn("text-sm transition-colors duration-300", {
											"text-blue-100/80": isCurrent,
											"text-white/30 group-hover:text-white/50": !isCurrent,
										})}
									>
										{stage.description}
									</span>
								</div>
							</div>
						);
					})}
				</div>
			</div>

			<div className="flex flex-col gap-4">
				<div className="flex items-center gap-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 p-5 shadow-xl transition-all hover:bg-white/15 cursor-default">
					<div className="flex h-10 w-10 min-w-[2.5rem] items-center justify-center rounded-full bg-gradient-to-br from-white to-white/80 shadow-inner">
						<span className="font-bold text-[#24549C] text-lg">?</span>
					</div>
					<div className="flex flex-col gap-0.5">
						<span className="font-semibold text-white text-sm">Precisa de ajuda?</span>
						<Link href="#" className="text-blue-200 text-xs hover:text-white hover:underline transition-colors">
							Fale com nosso suporte
						</Link>
					</div>
				</div>
			</div>
		</div>
	);
}
