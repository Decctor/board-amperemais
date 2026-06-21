import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { DEFAULT_ANALYSIS_MONTHS, getRFMHealthForOrganization } from "@/lib/segmentations/rfm-health";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const GetRFMHealthInputSchema = z.object({
	months: z
		.string({ invalid_type_error: "Tipo inválido para meses de análise." })
		.optional()
		.nullable()
		.transform((v) => {
			const parsed = v ? Number(v) : DEFAULT_ANALYSIS_MONTHS;
			return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_ANALYSIS_MONTHS;
		}),
});
export type TGetRFMHealthInput = z.infer<typeof GetRFMHealthInputSchema>;

export type TGetRFMHealthOutput = Awaited<ReturnType<typeof getRFMHealthForOrganization>>;

async function getRFMHealthRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para acessar esse recurso.");

	const userOrgId = session.membership?.organizacao.id;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const input = GetRFMHealthInputSchema.parse({
		months: request.nextUrl.searchParams.get("months"),
	});
	const result = await getRFMHealthForOrganization({ organizacaoId: userOrgId, months: input.months });
	return NextResponse.json(result);
}

export const GET = appApiHandler({ GET: getRFMHealthRoute });
