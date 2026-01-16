import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import RecompraCRMLogo from "@/utils/svgs/logos/RECOMPRA - COMPLETE - VERTICAL - COLORFUL.svg";

export type OnboardingStage = "organization-general-info" | "organization-niche-origin" | "organization-actuation" | "subscription-plans-section";

const STAGES: { id: OnboardingStage; label: string }[] = [
	{ id: "organization-general-info", label: "Sobre a organização" },
	{ id: "organization-niche-origin", label: "Nicho e Origem" },
	{ id: "organization-actuation", label: "Atuação" },
	{ id: "subscription-plans-section", label: "Planos" },
];

type OnboardingSidebarProps = {
	currentStage: OnboardingStage;
};

export function OnboardingSidebar({ currentStage }: OnboardingSidebarProps) {
	const currentStageIndex = STAGES.findIndex((s) => s.id === currentStage);

	return (
		<div className="flex h-full w-full flex-col gap-8 bg-white p-6 md:w-64 md:border-r">
			<div className="flex items-center justify-start">
				<Image src={RecompraCRMLogo} alt="RecompraCRM Logo" width={120} height={40} className="object-contain" />
			</div>

			<div className="flex flex-1 flex-col justify-center gap-6">
				{STAGES.map((stage, index) => {
					const isCompleted = index < currentStageIndex;
					const isCurrent = index === currentStageIndex;

					return (
						<div key={stage.id} className="relative flex items-center gap-4">
							{/* Vertical Line Connector */}
							{index !== STAGES.length - 1 && (
								<div
									className={cn(
										"absolute top-8 left-[11px] h-full w-[2px]",
										index < currentStageIndex ? "bg-primary" : "bg-muted",
									)}
									style={{ height: "calc(100% + 24px - 24px)" }} // Adjust based on gap
								/>
							)}

							<div
								className={cn(
									"z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-300",
									isCompleted
										? "border-primary bg-primary text-primary-foreground"
										: isCurrent
											? "border-primary bg-white text-primary"
											: "border-muted bg-white text-muted-foreground",
								)}
							>
								{isCompleted ? <Check className="h-3 w-3" /> : <span className="text-xs font-bold">{index + 1}</span>}
							</div>
							<span
								className={cn(
									"font-medium text-sm transition-colors duration-300",
									isCompleted || isCurrent ? "text-foreground" : "text-muted-foreground",
								)}
							>
								{stage.label}
							</span>
						</div>
					);
				})}
			</div>

			<div className="mt-auto">
				<p className="text-xs text-muted-foreground">
					Tem uma dúvida?{" "}
					<Link href="#" className="text-primary hover:underline">
						Fale conosco
					</Link>
				</p>
			</div>
		</div>
	);
}
