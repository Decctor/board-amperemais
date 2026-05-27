import type { ReactNode } from "react";
import { OnboardingSidebar, type OnboardingStage } from "./OnboardingSidebar";

type OnboardingLayoutProps = {
	children: ReactNode;
	currentStage: OnboardingStage;
};

export function OnboardingLayout({ children, currentStage }: OnboardingLayoutProps) {
	return (
		<div className="relative flex min-h-dvh w-full flex-col gap-3 overflow-x-hidden bg-linear-to-br from-[#0f2c5c] via-[#1a4480] to-[#24549C] px-3 py-3 md:min-h-screen md:flex-row md:items-center md:gap-4 md:px-8 md:py-6 md:overflow-hidden lg:px-12 lg:py-8 xl:gap-6 xl:px-24 xl:py-12">
			{/* Decorative background elements */}
			<div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[100px] pointer-events-none" />
			<div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-blue-400/10 rounded-full blur-[100px] pointer-events-none" />

			<OnboardingSidebar currentStage={currentStage} />
			<main className="relative z-10 flex grow flex-col gap-4 overflow-visible rounded-2xl border border-white/20 bg-white/95 p-4 shadow-2xl shadow-black/50 backdrop-blur-sm transition-all duration-300 md:max-h-[calc(100dvh-3rem)] md:overflow-hidden md:p-8 lg:max-h-[90dvh] lg:gap-6 lg:p-10 xl:max-h-[85dvh] xl:p-12">
				{children}
			</main>
		</div>
	);
}
