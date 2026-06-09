import { notifyInternalsOnNewOrganization } from "@/config/internal-coms";
import { welcomeOrganizationOwnerOnOnboarding } from "@/config/onboarding";
import { captureServerEvent } from "@/lib/analytics/posthog-server";
import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { db } from "@/services/drizzle";
import { organizations } from "@/services/drizzle/schema";
import { eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";

// Concludes the deep onboarding flow: stamps the conclusion timestamp (which un-gates the
// dashboard), notifies the founders and welcomes the org owner. Idempotent — re-running on an
// already-concluded org just returns success without re-firing side effects.
async function completeOnboarding({ session }: { session: TAuthUserSession }) {
	const organizacaoId = session.membership?.organizacao.id;
	if (!organizacaoId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para concluir o onboarding.");

	const organization = await db.query.organizations.findFirst({
		where: (fields, { eq }) => eq(fields.id, organizacaoId),
	});
	if (!organization) throw new createHttpError.NotFound("Organização não encontrada.");

	if (organization.dataOnboardingConclusao) {
		return {
			data: { insertedId: organizacaoId, redirectTo: "/dashboard" },
			message: "Onboarding já concluído.",
		};
	}

	await db.update(organizations).set({ dataOnboardingConclusao: new Date() }).where(eq(organizations.id, organizacaoId));

	void notifyInternalsOnNewOrganization({
		organization: {
			nome: organization.nome,
			cnpj: organization.cnpj,
			email: organization.email ?? session.user.email,
			telefone: organization.telefone ?? "NÃO INFORMADO",
			atuacaoNicho: organization.atuacaoNicho ?? "NÃO INFORMADO",
			tamanhoBaseClientes: organization.tamanhoBaseClientes ?? null,
			plataformasUtilizadas: organization.plataformasUtilizadas ?? "NÃO INFORMADO",
		},
		subscription: organization.assinaturaPlano ?? "FREE-TRIAL",
	}).catch((err) => console.error("[WARN] [COMPLETE_ONBOARDING] Falha ao notificar fundadores:", err));

	void welcomeOrganizationOwnerOnOnboarding({ orgOwner: session.user }).catch((err) =>
		console.error("[WARN] [COMPLETE_ONBOARDING] Falha ao enviar boas-vindas ao dono da organização:", err),
	);

	try {
		await captureServerEvent({
			distinctId: session.user.id,
			event: "onboarding_completed",
			properties: {
				organization_id: organizacaoId,
				subscription: organization.assinaturaPlano ?? "FREE-TRIAL",
			},
		});
	} catch (error) {
		console.error("[WARN] [COMPLETE_ONBOARDING] Falha ao capturar evento onboarding_completed:", error);
	}

	return {
		data: { insertedId: organizacaoId, redirectTo: "/dashboard" },
		message: "Onboarding concluído com sucesso!",
	};
}
export type TCompleteOnboardingOutput = Awaited<ReturnType<typeof completeOnboarding>>;

async function completeOnboardingRoute(_request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");

	const result = await completeOnboarding({ session });
	return NextResponse.json(result);
}

export const POST = appApiHandler({
	POST: completeOnboardingRoute,
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
