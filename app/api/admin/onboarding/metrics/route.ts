import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getActivationMetrics } from "@/lib/onboarding/activation-metrics";
import createHttpError from "http-errors";
import { NextResponse } from "next/server";
async function getOnboardingMetrics({ session }: { session: TAuthUserSession }) {
 if (!session.user.admin) throw new createHttpError.Forbidden("Acesso restrito a administradores.");
 return { data: await getActivationMetrics(), message: "Métricas consultadas com sucesso." };
}
export type TGetOnboardingMetricsOutput = Awaited<ReturnType<typeof getOnboardingMetrics>>;
async function getOnboardingMetricsRoute() {
 const session = await getCurrentSessionUncached();
 if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
 return NextResponse.json(await getOnboardingMetrics({ session }));
}
export const GET = appApiHandler({ GET: getOnboardingMetricsRoute });
