import type { TOnboardingQualityStep } from "@/app/api/organizations/onboarding-quality/route";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CheckboxIcon } from "@radix-ui/react-icons";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";

type OnboardingQualityStepProps = {
	step: TOnboardingQualityStep;
	isActive: boolean;
	isOpened: boolean;
	onClick?: () => void;
	onActionClick?: () => void;
};

export function OnboardingQualityStep({ step, isActive, isOpened, onClick, onActionClick }: OnboardingQualityStepProps) {
	return (
		<div
			className={cn(
				"group flex items-start gap-4 p-3 transition-all duration-300 rounded-xl border border-transparent cursor-pointer",
				isOpened && "bg-secondary/40 border-border/40",
				!isOpened && !step.completed && "opacity-60 hover:opacity-100",
			)}
			onClick={onClick}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					onClick?.();
				}
			}}
			role="button"
			tabIndex={0}
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
						isActive && "text-primary",
					)}
				>
					{step.title}
				</p>

				<AnimatePresence initial={false}>
					{isOpened && (
						<motion.div
							initial={{ height: 0, opacity: 0, marginTop: 0 }}
							animate={{ height: "auto", opacity: 1, marginTop: 12 }}
							exit={{ height: 0, opacity: 0, marginTop: 0 }}
							transition={{ duration: 0.25, ease: "easeOut" }}
							className="overflow-hidden"
						>
							<div className="space-y-3">
								<p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
								{step.completed ? (
									<div className="w-fit h-8 px-4 text-xs font-semibold rounded-full bg-green-500 text-white transition-all flex items-center gap-1.5">
										<CheckboxIcon className="h-4 w-4" />
										<p>Concluído</p>
									</div>
								) : (
									<Button
										asChild
										size="sm"
										variant="default"
										className="h-8 px-4 text-xs font-semibold rounded-full bg-brand text-brand-foreground hover:bg-brand/90 hover:shadow-md transition-all"
										onClick={(e) => {
											e.stopPropagation();
											onActionClick?.();
										}}
									>
										<Link href={step.actionUrl} className="flex items-center gap-1.5">
											{step.actionLabel}
											<ArrowRight className="w-3 h-3 text-brand-foreground/70" />
										</Link>
									</Button>
								)}
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</div>
	);
}
