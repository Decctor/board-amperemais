"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useOrganizationOnboardingState } from "@/state-hooks/use-organization-onboarding-state";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { ActuationStage } from "./components/ActuationStage";
import { GeneralInfoStage } from "./components/GeneralInfoStage";
import { NicheOriginStage } from "./components/NicheOriginStage";
import { OnboardingLayout } from "./components/OnboardingLayout";
import { SubscriptionPlansStage } from "./components/SubscriptionPlansStage";

type OnboardingPageProps = {
	user: unknown; // We might need this later, keeping prop signature
};

export function OnboardingPage({ user }: OnboardingPageProps) {
	const { state, updateOrganization, updateOrganizationLogoHolder, updateOrganizationOnboarding, goToNextStage, goToPreviousStage } =
		useOrganizationOnboardingState({});

	const handleNext = () => {
		if (state.stage === "subscription-plans-section") {
			console.log("Onboarding Complete:", state);
			// Submit logic would go here
			return;
		}
		goToNextStage();
	};

	const handleBack = () => {
		goToPreviousStage();
	};

	const renderStageContent = () => {
		switch (state.stage) {
			case "organization-general-info":
				return <GeneralInfoStage state={state} updateOrganization={updateOrganization} updateOrganizationLogoHolder={updateOrganizationLogoHolder} />;
			case "organization-niche-origin":
				return <NicheOriginStage state={state} updateOrganization={updateOrganization} />;
			case "organization-actuation":
				return <ActuationStage state={state} updateOrganization={updateOrganization} />;
			case "subscription-plans-section":
				return <SubscriptionPlansStage state={state} handlePlanSelection={updateOrganizationOnboarding} />;
			default:
				return null;
		}
	};

	const getStageInfo = () => {
		switch (state.stage) {
			case "organization-general-info":
				return {
					step: 1,
					title: "SOBRE A EMPRESA",
					description: "Preencha aqui as informações básicas da sua empresa para começarmos.",
				};
			case "organization-niche-origin":
				return {
					step: 2,
					title: "NICHO E ORIGEM",
					description: "Conte-nos um pouco mais sobre o seu mercado e como nos conheceu.",
				};
			case "organization-actuation":
				return {
					step: 3,
					title: "ATUAÇÃO",
					description: "Entenda melhor o perfil e escala da sua operação.",
				};
			case "subscription-plans-section":
				return {
					step: 4,
					title: "PLANOS",
					description: "Escolha o plano ideal para o seu negócio.",
				};
		}
	};

	const stageInfo = getStageInfo();

	return (
		<OnboardingLayout currentStage={state.stage}>
			<div className="h-full flex w-full flex-col gap-6 min-h-0">
				<div className="flex flex-col gap-0.5">
					<h3 className="text-xs text-gray-500 tracking-tight">ETAPA {stageInfo.step}</h3>
					<h1 className="font-bold text-xl md:text-2xl text-gray-900 tracking-tight">{stageInfo.title}</h1>
					<p className="text-sm text-gray-500 tracking-tight">{stageInfo.description}</p>
				</div>
				<div className="w-full flex flex-col gap-6 grow overflow-y-auto px-1 min-h-0 scrollbar-thin scrollbar-track-primary/10 scrollbar-thumb-primary/30">
					{renderStageContent()}
				</div>
				{state.stage !== "subscription-plans-section" ? (
					<>
						<Separator />
						<div className="w-full flex items-center justify-between">
							<Button variant="ghost" size="lg" onClick={handleBack} className="flex items-center gap-1.5 rounded-xl py-3">
								<ArrowLeft className="h-4 w-4" />
								VOLTAR
							</Button>

							<Button
								onClick={handleNext}
								size={"lg"}
								className="flex items-center gap-1.5 bg-[#24549C] text-white hover:bg-[#1e4682] transition-all rounded-xl py-3"
							>
								CONTINUAR
								<ArrowRight className="h-4 w-4" />
							</Button>
						</div>
					</>
				) : null}
			</div>
		</OnboardingLayout>
	);
}
