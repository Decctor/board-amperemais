import { approveHint } from "@/lib/ai-hints/approval";
import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { ApproveHintInputSchema } from "@/schemas/ai-hints";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

export type TApproveHintInput = z.infer<typeof ApproveHintInputSchema>;
export type TApproveHintOutput = Awaited<ReturnType<typeof approveHint>>;

function getApproveHintInput(request: NextRequest): TApproveHintInput {
	return ApproveHintInputSchema.parse({
		id: request.nextUrl.searchParams.get("id"),
	});
}

async function approveHintRoutePOST(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session?.membership) {
		throw new createHttpError.Unauthorized("Você não está autenticado.");
	}

	const input = getApproveHintInput(request);
	console.log("[INFO] Approving hints of id", input.id);
	const result = await approveHint({
		input,
		session,
	});

	return NextResponse.json(result, { status: 200 });
}
async function approveHintRouteGET(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session?.membership) {
		throw new createHttpError.Unauthorized("Você não está autenticado.");
	}

	const input = getApproveHintInput(request);
	console.log("[INFO] Approving hints of id", input.id);
	const result = await approveHint({
		input,
		session,
	});

	return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/commercial/campaigns`);
}

export const GET = appApiHandler({ GET: approveHintRouteGET });
export const POST = appApiHandler({ POST: approveHintRoutePOST });
