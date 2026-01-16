import type { ReactNode } from "react";
import { OnboardingSidebar, type OnboardingStage } from "./OnboardingSidebar";

type OnboardingLayoutProps = {
	children: ReactNode;
	currentStage: OnboardingStage;
};

export function OnboardingLayout({ children, currentStage }: OnboardingLayoutProps) {
	return (
		<div className="flex min-h-screen w-full flex-col bg-[#e8f5e9] md:flex-row">
			{/* Mobile Sidebar / Header */}
			<div className="block md:hidden">
				{/* TODO: Implement mobile specific header if needed, for now reusing logic or just hiding sidebar on small screens */}
				<div className="bg-white p-4">
					<p className="font-bold text-primary">RecompraCRM Onboarding</p>
				</div>
			</div>

			<OnboardingSidebar currentStage={currentStage} />

			<main className="flex flex-1 items-center justify-center p-4 md:p-8">
				<div className="w-full max-w-4xl">{children}</div>
			</main>
		</div>
	);
}
