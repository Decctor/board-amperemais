import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { validateActiveSeller } from "@/lib/sellers/validate-active-seller";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { OpenSalesSessionInputSchema, type TOpenSalesSessionInput } from "@/schemas/sales-sessions";
import { db } from "@/services/drizzle";
import { salesSessions } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";

async function openSalesSession({ input, session }: { input: TOpenSalesSessionInput; session: TAuthUserSession }) {
	const orgId = session.membership?.organizacao.id;
	if (!orgId) throw new createHttpError.Unauthorized("Voce precisa estar vinculado a uma organizacao.");

	const organization = await db.query.organizations.findFirst({ where: (fields, { eq }) => eq(fields.id, orgId) });
	if (!organization) throw new createHttpError.NotFound("Organizacao nao encontrada.");

	const sessoesVendaConfig = organization.configuracao.preferencias.sessoesVenda;
	if (!sessoesVendaConfig?.habilitado) throw new createHttpError.BadRequest("As sessoes de venda nao estao habilitadas para esta organizacao.");
	if (sessoesVendaConfig.exigirFundoTroco && input.saldoInicial <= 0) {
		throw new createHttpError.BadRequest("Informe o fundo de troco (saldo inicial) para abrir o caixa.");
	}

	// Escopo OPERADOR: a chave de escopo é o vendedor responsável.
	await validateActiveSeller({ orgId, sellerId: input.responsavelVendedorId });
	const escopoChave = input.responsavelVendedorId;

	// Garante no máximo uma sessão aberta por escopo (o índice parcial reforça; aqui damos erro amigável).
	const existingOpen = await db.query.salesSessions.findFirst({
		where: and(eq(salesSessions.organizacaoId, orgId), eq(salesSessions.escopoChave, escopoChave), eq(salesSessions.status, "ABERTA")),
		columns: { id: true },
	});
	if (existingOpen) throw new createHttpError.Conflict("Ja existe uma sessao de venda aberta para este responsavel.");

	const [created] = await db
		.insert(salesSessions)
		.values({
			organizacaoId: orgId,
			contaFinanceiraId: input.contaFinanceiraId ?? null,
			responsavelVendedorId: input.responsavelVendedorId,
			escopoChave,
			abertaPorUsuarioId: session.user.id,
			status: "ABERTA",
			saldoInicial: input.saldoInicial,
			observacoesAbertura: input.observacoesAbertura ?? null,
		})
		.returning({ id: salesSessions.id });

	if (!created?.id) throw new createHttpError.InternalServerError("Erro ao abrir sessao de venda.");

	return {
		data: { createdId: created.id },
		message: "Sessao de venda aberta com sucesso.",
	};
}
export type TOpenSalesSessionOutput = Awaited<ReturnType<typeof openSalesSession>>;

async function openSalesSessionRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Voce nao esta autenticado.");
	if (!session.membership) throw new createHttpError.Unauthorized("Voce precisa estar vinculado a uma organizacao.");

	const body = await request.json();
	const input = OpenSalesSessionInputSchema.parse(body);
	const result = await openSalesSession({ input, session });
	return NextResponse.json(result);
}

export const POST = appApiHandler({ POST: openSalesSessionRoute });
