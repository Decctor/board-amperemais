import { approveHint } from "@/lib/ai/ai-hints/approval";
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
	const baseRedirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/ai-hints/approval-dismiss`;
	try {
		const session = await getCurrentSessionUncached();
		if (!session?.membership) {
			const msg = encodeURIComponent("Você não está autenticado.");
			return NextResponse.redirect(`${baseRedirectUrl}?type=error&message=${msg}`);
		}

		const input = getApproveHintInput(request);
		console.log("[INFO] Approving hints of id", input.id);
		const result = await approveHint({ input, session });

		const msg = encodeURIComponent(result.message);
		return NextResponse.redirect(`${baseRedirectUrl}?type=success&message=${msg}`);
	} catch (error) {
		const msg = encodeURIComponent(error instanceof Error ? error.message : "Algo deu errado.");
		return NextResponse.redirect(`${baseRedirectUrl}?type=error&message=${msg}`);
	}
}

export const GET = appApiHandler({ GET: approveHintRouteGET });
export const POST = appApiHandler({ POST: approveHintRoutePOST });
