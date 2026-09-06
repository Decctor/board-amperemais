import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getOnboardingReadiness } from "@/lib/onboarding/readiness";
import { db } from "@/services/drizzle";
import { getOnboardingQuality as deriveOnboardingQuality } from "@/lib/onboarding/quality";

import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";

export type TOnboardingQualityStep = {
	id: string;
	title: string;
	description: string;
	completed: boolean;
	actionUrl: string;
	actionLabel: string;
	applicable: boolean;
};

export type TGetOnboardingQualityOutput = {
	data: {
		steps: TOnboardingQualityStep[];
		completedCount: number;
		totalApplicable: number;
		percentComplete: number;
		allCompleted: boolean;
	};
};

async function getOnboardingQuality({ session }: { session: TAuthUserSession }): Promise<TGetOnboardingQualityOutput> {
 const organizationId = session.membership?.organizacao.id;
 if (!organizationId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");
 return { data: deriveOnboardingQuality(await getOnboardingReadiness({ executor: db, organizationId })) };
}
async function getOnboardingQualityRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");

	const result = await getOnboardingQuality({ session });
	return NextResponse.json(result, { status: 200 });
}

export const GET = appApiHandler({
	GET: getOnboardingQualityRoute,
});
