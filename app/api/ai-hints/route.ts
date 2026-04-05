import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { listCampaignSuggestionHints } from "@/lib/ai-hints/service";
import { GetHintsInputSchema } from "@/schemas/ai-hints";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";

async function getHints(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session?.membership) {
		throw new createHttpError.Unauthorized("Você não está autenticado.");
	}

	const orgId = session.membership.organizacao.id;
	const url = new URL(request.url);
	const input = GetHintsInputSchema.parse({
		assunto: url.searchParams.get("assunto") || undefined,
		status: url.searchParams.get("status") || "active",
		limite: url.searchParams.get("limite") || 5,
	});

	const hints = await listCampaignSuggestionHints({
		organizacaoId: orgId,
		status: input.status,
		limite: input.limite,
	});

	return NextResponse.json({ data: hints }, { status: 200 });
}

export const GET = appApiHandler({ GET: getHints });
