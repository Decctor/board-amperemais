import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { dismissHint as dismissHintService } from "@/lib/ai-hints/service";
import { DismissHintInputSchema } from "@/schemas/ai-hints";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";
import { TAuthUserSession } from "@/lib/authentication/types";

export type TDismissHintInput = z.infer<typeof DismissHintInputSchema>;
async function dismissHint({ input, session }: { input: TDismissHintInput; session: TAuthUserSession }) {
	const userId = session.user.id;
	const userOrgId = session.membership?.organizacao.id;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const hint = await dismissHintService({
		organizacaoId: userOrgId,
		hintId: input.id,
		userId,
	});

	if (!hint) {
		throw new createHttpError.NotFound("Dica não encontrada.");
	}

	return {
		data: {
			hint,
		},
		message: "Dica descartada com sucesso.",
	};
}
export type TDismissHintOutput = Awaited<ReturnType<typeof dismissHint>>;
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

	const result = await dismissHint({
		input,
		session,
	});

	return NextResponse.json(result);
}

export const POST = appApiHandler({ POST: dismissHintRoute });
