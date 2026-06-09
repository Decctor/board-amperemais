import { getCurrentSession } from "@/lib/authentication/session";
import { db } from "@/services/drizzle";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { OnboardingPage } from "./onboarding-page";
import { ONBOARDING_STAGE_COOKIE, resolveResumeStage, type TOnboardingStage } from "./_lib/stages";

export default async function Onboarding({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
	const authSession = await getCurrentSession();
	if (!authSession) redirect("/auth/signin");

	const membership = authSession.membership;
	const { new: newParam } = await searchParams;
	const startNewOrganization = newParam === "true";

	// Existing user explicitly creating an ADDITIONAL organization — always start a fresh flow,
	// even though they already have a concluded org. The new org becomes active once created.
	if (startNewOrganization) {
		return <OnboardingPage user={authSession.user} initialStage="organization-general-info" existingOrganization={null} />;
	}

	// Onboarding already concluded — there is nothing to do here.
	if (membership?.organizacao.dataOnboardingConclusao) redirect("/dashboard");

	// No org yet: start the flow from scratch at stage 1.
	if (!membership) {
		return <OnboardingPage user={authSession.user} initialStage="organization-general-info" existingOrganization={null} />;
	}

	// Org exists but onboarding is in progress: resume at the persisted stage (or the
	// default), hydrating the few org fields the deeper stages need (e.g. niche presets).
	const cookieStore = await cookies();
	const resumeStage: TOnboardingStage = resolveResumeStage(cookieStore.get(ONBOARDING_STAGE_COOKIE)?.value);

	const organization = await db.query.organizations.findFirst({
		where: (fields, { eq }) => eq(fields.id, membership.organizacao.id),
		columns: {
			id: true,
			nome: true,
			cnpj: true,
			email: true,
			telefone: true,
			logoUrl: true,
			atuacaoNicho: true,
			atuacaoCanais: true,
			tamanhoBaseClientes: true,
			plataformasUtilizadas: true,
			origemLead: true,
			dadosViaPDI: true,
			integracaoTipo: true,
		},
	});

	return <OnboardingPage user={authSession.user} initialStage={resumeStage} existingOrganization={organization ?? null} />;
}
