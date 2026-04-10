import { approveHint } from "@/lib/ai-hints/approval";
import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { ApproveHintInputSchema } from "@/schemas/ai-hints";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

export type TApproveHintInput = z.infer<typeof ApproveHintInputSchema>;
export type TApproveHintOutput = Awaited<ReturnType<typeof approveHint>>;

async function approveHintRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session?.membership) {
		throw new createHttpError.Unauthorized("Você não está autenticado.");
	}

	const url = new URL(request.url);
	const input = ApproveHintInputSchema.parse({
		id: url.searchParams.get("id"),
	});

	const result = await approveHint({
		input,
		session,
	});

	return NextResponse.json(result, { status: 200 });
}

export const POST = appApiHandler({ POST: approveHintRoute });
