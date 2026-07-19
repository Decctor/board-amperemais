import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { runStatementMatching } from "@/lib/financial-reconciliation";
import { canReconcileFinances } from "@/lib/permissions/finances";
import { db } from "@/services/drizzle";
import { financialAccounts } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

// Re-execução do motor de matching pode chamar IA — tempo estendido.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const RematchInputSchema = z.object({
	contaFinanceiraId: z.string({ required_error: "ID da conta financeira não informado." }),
});
export type TRematchInput = z.infer<typeof RematchInputSchema>;

async function rematchStatementLines({ input, orgId }: { input: TRematchInput; orgId: string }) {
	const account = await db.query.financialAccounts.findFirst({
		where: and(eq(financialAccounts.id, input.contaFinanceiraId), eq(financialAccounts.organizacaoId, orgId)),
		columns: { id: true },
	});
	if (!account) throw new createHttpError.NotFound("Conta financeira não encontrada para esta organização.");

	const result = await runStatementMatching({ organizacaoId: orgId, contaFinanceiraId: input.contaFinanceiraId });
	return {
		data: result,
		message:
			result.sugeridas > 0
				? `${result.sugeridas} nova(s) sugestão(ões) de conciliação encontrada(s).`
				: "Nenhuma nova sugestão encontrada para as linhas pendentes.",
	};
}
export type TRematchOutput = Awaited<ReturnType<typeof rematchStatementLines>>;

async function rematchRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session?.membership) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");
	if (!canReconcileFinances(session.membership.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para realizar conciliação bancária.");

	const body = await request.json();
	const input = RematchInputSchema.parse(body);
	const result = await rematchStatementLines({ input, orgId: session.membership.organizacao.id });
	return NextResponse.json(result);
}

export const POST = appApiHandler({ POST: rematchRoute });
