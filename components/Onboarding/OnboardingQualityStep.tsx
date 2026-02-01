import type { TOnboardingQualityStep } from "@/app/api/organizations/onboarding-quality/route";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, ArrowRight } from "lucide-react";
import Link from "next/link";

type OnboardingQualityStepProps = {
	step: TOnboardingQualityStep;
	isActive: boolean;
	onActionClick?: () => void;
};

export function OnboardingQualityStep({ step, isActive, onActionClick }: OnboardingQualityStepProps) {
	return (
		<div
			className={cn(
				"group flex items-start gap-4 p-3 transition-all duration-300 rounded-xl border border-transparent",
				isActive && "bg-secondary/40 border-border/40",
				!isActive && !step.completed && "opacity-60 hover:opacity-100",
			)}
		>
			<div className="flex-shrink-0">
				{step.completed ? (
					<div className="h-6 w-6 rounded-full bg-brand text-brand-foreground flex items-center justify-center">
						<Check className="h-4 w-4" strokeWidth={3} />
					</div>
				) : isActive ? (
					<div className="h-6 w-6 rounded-full border-1.5 border-brand flex items-center justify-center relative">
						<div className="h-2.5 w-2.5 rounded-full bg-brand animate-pulse-slow" />
					</div>
				) : (
					<div className="h-6 w-6 rounded-full border-2 border-muted-foreground/30" />
				)}
			</div>

			<div className="flex-1 min-w-0">
				<p
					className={cn(
						"text-sm font-semibold leading-none transition-colors uppercase",
						step.completed ? "text-foreground/80 line-through decoration-muted-foreground" : "text-foreground",
						isActive && "text-brand-foreground/90",
					)}
				>
					{step.title}
				</p>

				{isActive && (
					<div className=" space-y-3 animate-in fade-in slide-in-from-top-1 duration-300">
						<p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
						<Button
							asChild
							size="sm"
							variant="default"
							className="h-8 px-4 text-xs font-semibold rounded-full bg-brand text-brand-foreground hover:bg-brand/90 hover:shadow-md transition-all"
							onClick={onActionClick}
						>
							<Link href={step.actionUrl} className="flex items-center gap-1.5">
								{step.actionLabel}
								<ArrowRight className="w-3 h-3 text-brand-foreground/70" />
							</Link>
						</Button>
					</div>
				)}
			</div>
		</div>
	);
}
