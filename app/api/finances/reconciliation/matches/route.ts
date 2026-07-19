import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { createManualReconciliationMatch, rejectReconciliationMatch } from "@/lib/financial-reconciliation";
import { canReconcileFinances } from "@/lib/permissions/finances";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const CreateManualMatchInputSchema = z.object({
	extratoTransacaoId: z.string({ required_error: "ID da linha do extrato não informado." }),
	transacaoFinanceiraId: z.string({ required_error: "ID da transação financeira não informado." }),
});
export type TCreateManualMatchInput = z.infer<typeof CreateManualMatchInputSchema>;

async function createManualMatch({ input, orgId, authorId }: { input: TCreateManualMatchInput; orgId: string; authorId: string }) {
	const result = await createManualReconciliationMatch({
		organizacaoId: orgId,
		autorId: authorId,
		extratoTransacaoId: input.extratoTransacaoId,
		transacaoFinanceiraId: input.transacaoFinanceiraId,
	});
	return {
		data: result,
		message: result.acao === "EFETIVADO" ? "Transação efetivada e conciliada com sucesso." : "Linha conciliada com sucesso.",
	};
}
export type TCreateManualMatchOutput = Awaited<ReturnType<typeof createManualMatch>>;

async function createManualMatchRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session?.membership) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");
	if (!canReconcileFinances(session.membership.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para realizar conciliação bancária.");

	const body = await request.json();
	const input = CreateManualMatchInputSchema.parse(body);
	const result = await createManualMatch({ input, orgId: session.membership.organizacao.id, authorId: session.user.id });
	return NextResponse.json(result);
}

export const POST = appApiHandler({ POST: createManualMatchRoute });

const RejectMatchInputSchema = z.object({
	matchId: z.string({ required_error: "ID da sugestão não informado." }),
});
export type TRejectMatchInput = z.infer<typeof RejectMatchInputSchema>;

async function rejectMatch({ input, orgId, authorId }: { input: TRejectMatchInput; orgId: string; authorId: string }) {
	const result = await rejectReconciliationMatch({ organizacaoId: orgId, autorId: authorId, matchId: input.matchId });
	return {
		data: result,
		message: "Sugestão de conciliação rejeitada.",
	};
}
export type TRejectMatchOutput = Awaited<ReturnType<typeof rejectMatch>>;

async function rejectMatchRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session?.membership) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");
	if (!canReconcileFinances(session.membership.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para realizar conciliação bancária.");

	const body = await request.json();
	const input = RejectMatchInputSchema.parse(body);
	const result = await rejectMatch({ input, orgId: session.membership.organizacao.id, authorId: session.user.id });
	return NextResponse.json(result);
}

export const PUT = appApiHandler({ PUT: rejectMatchRoute });
