import { generateHintsForSubject } from "@/lib/ai-hints/generate-hints";
import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { GenerateHintsInputSchema } from "@/schemas/ai-hints";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";

async function generateHints(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session?.membership) {
		throw new createHttpError.Unauthorized("Você não está autenticado.");
	}

	const orgId = session.membership.organizacao.id;
	const body = await request.json();
	const input = GenerateHintsInputSchema.parse(body);
	const result = await generateHintsForSubject({
		organizacaoId: orgId,
		assunto: input.assunto,
		contextoAdicional: input.contextoAdicional,
	});

	return NextResponse.json(
		{
			data: result,
			message: "Geração automática de dicas não está disponível nesta versão.",
		},
		{ status: 200 },
	);
}

export const POST = appApiHandler({ POST: generateHints });
