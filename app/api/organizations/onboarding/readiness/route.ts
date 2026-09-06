import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getOnboardingReadiness } from "@/lib/onboarding";
import { db } from "@/services/drizzle";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";

// Prontidão derivada das tabelas reais. Sem cache de servidor: o cliente decide a cadência de
// polling (curta enquanto há carga em andamento, longa depois).
async function getReadiness({ session }: { session: TAuthUserSession }) {
	const organizacaoId = session.membership?.organizacao.id;
	if (!organizacaoId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");
	const readiness = await getOnboardingReadiness({ executor: db, organizationId: organizacaoId });
	return { data: readiness, message: "Prontidão calculada." };
}
export type TGetOnboardingReadinessOutput = Awaited<ReturnType<typeof getReadiness>>;

async function getReadinessRoute(_request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const result = await getReadiness({ session });
	return NextResponse.json(result);
}

export const GET = appApiHandler({ GET: getReadinessRoute });

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
