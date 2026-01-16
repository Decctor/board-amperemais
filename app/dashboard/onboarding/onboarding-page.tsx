"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
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
				return <SubscriptionPlansStage state={state} updateOrganizationOnboarding={updateOrganizationOnboarding} />;
			default:
				return null;
		}
	};

	const getStageInfo = () => {
		switch (state.stage) {
			case "organization-general-info":
				return {
					step: 1,
					title: "Sobre a organização",
					description: "Preencha as informações básicas da sua empresa para começarmos.",
				};
			case "organization-niche-origin":
				return {
					step: 2,
					title: "Nicho e Origem",
					description: "Conte-nos um pouco mais sobre o seu mercado e como nos conheceu.",
				};
			case "organization-actuation":
				return {
					step: 3,
					title: "Atuação",
					description: "Entenda melhor o perfil e escala da sua operação.",
				};
			case "subscription-plans-section":
				return {
					step: 4,
					title: "Planos",
					description: "Escolha o plano ideal para o seu negócio.",
				};
		}
	};

	const stageInfo = getStageInfo();

	return (
		<OnboardingLayout currentStage={state.stage}>
			<Card className="w-full shadow-lg">
				<CardHeader className="space-y-1">
					<div className="flex items-center justify-between">
						<span className="font-semibold text-primary text-xs uppercase tracking-wider">Passo {stageInfo.step} de 4</span>
					</div>
					<h2 className="font-bold text-2xl">{stageInfo.title}</h2>
					<p className="text-muted-foreground">{stageInfo.description}</p>
				</CardHeader>

				<CardContent className="pt-6">{renderStageContent()}</CardContent>

				<CardFooter className="flex justify-between border-t p-6">
					<Button variant="ghost" onClick={handleBack} disabled={state.stage === "organization-general-info"} className="gap-2">
						<ArrowLeft className="h-4 w-4" />
						Voltar
					</Button>

					<Button onClick={handleNext} className="gap-2 bg-[#24549C] px-8 hover:bg-[#1e4682]">
						{state.stage === "subscription-plans-section" ? "Finalizar" : "Próximo"}
						{state.stage === "subscription-plans-section" ? <Check className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
					</Button>
				</CardFooter>
			</Card>
		</OnboardingLayout>
	);
}
