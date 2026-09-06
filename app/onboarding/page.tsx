import { getCurrentSession } from "@/lib/authentication/session";
import { LEGACY_ONBOARDING_STAGE_COOKIE, getOnboardingReadiness, mapLegacyStageId, resolveOnboardingIntent, isOnboardingStageId } from "@/lib/onboarding";
import type { TOnboardingProductEnum } from "@/schemas/enums";
import { db } from "@/services/drizzle";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { OnboardingPage } from "./onboarding-page";

type OnboardingSearchParams = { new?: string; produto?: string; retomar?: string; etapa?: string };

/**
 * Gate e retomada. A etapa vive em `organization_onboardings` (não mais no cookie); a prontidão é
 * derivada das tabelas reais e chega ao cliente como `initialData`. Organizações em curso no
 * fluxo antigo são migradas a partir do cookie legado pelo cliente, na criação da jornada.
 */
export default async function Onboarding({ searchParams }: { searchParams: Promise<OnboardingSearchParams> }) {
	const authSession = await getCurrentSession();
	if (!authSession) redirect("/auth/signin");

	const { new: newParam, produto: produtoParam, retomar, etapa } = await searchParams;
	const intent = resolveOnboardingIntent({ produto: produtoParam });
	const membership = authSession.membership;

	// Usuário existente criando uma organização ADICIONAL: fluxo do zero, a nova org vira ativa.
	if (newParam === "true" || !membership) {
		return <OnboardingPage user={authSession.user} intent={intent} existingOrganization={null} journey={null} readiness={null} legacyStage={null} />;
	}

	const organizationId = membership.organizacao.id;
	const readiness = await getOnboardingReadiness({ executor: db, organizationId });

	// Produto da jornada: link comercial > jornada existente não concluída > CRM.
	const openJourney = readiness.jornadas.find((journey) => !journey.dataConclusao) ?? null;
	const produto: TOnboardingProductEnum = intent?.produto ?? openJourney?.produto ?? "CRM";
	const storedJourney = readiness.jornadas.find((row) => row.produto === produto) ?? null;
	const journey = storedJourney && retomar === "true" && isOnboardingStageId(produto, etapa) ? { ...storedJourney, etapaAtual: etapa } : storedJourney;

	// Já concluída (para este produto) e sem outra em aberto: nada a fazer aqui.
	if ((journey?.dataConclusao && retomar !== "true") || (!journey && membership.organizacao.dataOnboardingConclusao && !intent)) redirect("/dashboard");
	if (produto === "ERP" && !readiness.erp.acesso && !readiness.erp.testeDisponivel) redirect("/dashboard");

	const organization = await db.query.organizations.findFirst({
		where: (fields, { eq }) => eq(fields.id, organizationId),
		columns: {
			id: true,
			nome: true,
			cnpj: true,
			slug: true,
			email: true,
			telefone: true,
			logoUrl: true,
			atuacaoNicho: true,
			atuacaoCanais: true,
			tamanhoBaseClientes: true,
			plataformasUtilizadas: true,
			origemLead: true,
			dadosViaPDI: true,
		},
	});

	const cookieStore = await cookies();
	const legacyStage = journey ? null : mapLegacyStageId(cookieStore.get(LEGACY_ONBOARDING_STAGE_COOKIE)?.value);

	return (
		<OnboardingPage
			user={authSession.user}
			membership={authSession.membership}
			intent={intent ?? { produto, origem: "PERGUNTA" }}
			existingOrganization={organization ?? null}
			journey={journey}
			readiness={readiness}
			legacyStage={legacyStage}
		/>
	);
}
