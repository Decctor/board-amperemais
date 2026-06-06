import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { dismissHint as dismissHintService } from "@/lib/ai/ai-hints/service";
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

function getDismissHintInput(request: NextRequest): TDismissHintInput {
	return DismissHintInputSchema.parse({
		id: request.nextUrl.searchParams.get("id"),
	});
}

async function dismissHintRoutePOST(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session?.membership) {
		throw new createHttpError.Unauthorized("Você não está autenticado.");
	}

	const input = getDismissHintInput(request);
	console.log("[INFO] Dismissing hints of id", input.id);
	const result = await dismissHint({
		input,
		session,
	});

	return NextResponse.json(result);
}
async function dismissHintRouteGET(request: NextRequest) {
	const baseRedirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/ai-hints/approval-dismiss`;
	try {
		const session = await getCurrentSessionUncached();
		if (!session?.membership) {
			const msg = encodeURIComponent("Você não está autenticado.");
			return NextResponse.redirect(`${baseRedirectUrl}?type=error&message=${msg}`);
		}

		const input = getDismissHintInput(request);
		console.log("[INFO] Dismissing hints of id", input.id);
		const result = await dismissHint({ input, session });

		const msg = encodeURIComponent(result.message);
		return NextResponse.redirect(`${baseRedirectUrl}?type=dismiss&message=${msg}`);
	} catch (error) {
		const msg = encodeURIComponent(error instanceof Error ? error.message : "Algo deu errado.");
		return NextResponse.redirect(`${baseRedirectUrl}?type=error&message=${msg}`);
	}
}

export const GET = appApiHandler({ GET: dismissHintRouteGET });
export const POST = appApiHandler({ POST: dismissHintRoutePOST });
