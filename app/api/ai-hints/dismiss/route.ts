import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { dismissHint } from "@/lib/ai-hints/service";
import { DismissHintInputSchema } from "@/schemas/ai-hints";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";

async function dismissHintRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session?.membership) {
		throw new createHttpError.Unauthorized("Você não está autenticado.");
	}

	const orgId = session.membership.organizacao.id;
	const userId = session.user.id;
	const url = new URL(request.url);
	const input = DismissHintInputSchema.parse({
		id: url.searchParams.get("id"),
	});

	const hint = await dismissHint({
		organizacaoId: orgId,
		hintId: input.id,
		userId,
	});

	if (!hint) {
		throw new createHttpError.NotFound("Dica não encontrada.");
	}

	return NextResponse.json({ message: "Dica descartada com sucesso." }, { status: 200 });
}

export const POST = appApiHandler({ POST: dismissHintRoute });
