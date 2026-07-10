import { appApiHandler } from "@/lib/app-api";
import { getActionApprovalExpirationDate, getActionApprovalHandler, isActionApprovalExpired } from "@/lib/action-approvals";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { ActionApprovalTypeEnum } from "@/schemas/enums";
import { db } from "@/services/drizzle";
import { actionApprovalRequests } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const DecideActionApprovalInputSchema = z.object({
	id: z.string({ required_error: "ID da solicitação não informado.", invalid_type_error: "Tipo não válido para o ID da solicitação." }),
	decisao: z.enum(["APROVAR", "REJEITAR", "CANCELAR"], {
		required_error: "Decisão não informada.",
		invalid_type_error: "Tipo não válido para a decisão.",
	}),
	motivo: z.string({ invalid_type_error: "Tipo não válido para o motivo da decisão." }).optional().nullable(),
});
export type TDecideActionApprovalInput = z.infer<typeof DecideActionApprovalInputSchema>;

async function decideActionApproval({ input, session }: { input: TDecideActionApprovalInput; session: TAuthUserSession }) {
	const orgId = session.membership!.organizacao.id;

	const request = await db.query.actionApprovalRequests.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.id, input.id), eq(fields.organizacaoId, orgId)),
	});
	if (!request) throw new createHttpError.NotFound("Solicitação de aprovação não encontrada.");
	if (request.status !== "PENDENTE") throw new createHttpError.BadRequest("A solicitação não está mais pendente.");

	if (isActionApprovalExpired(request)) {
		await db
			.update(actionApprovalRequests)
			.set({ status: "EXPIRADA" })
			.where(and(eq(actionApprovalRequests.id, request.id), eq(actionApprovalRequests.status, "PENDENTE")));
		throw new createHttpError.BadRequest("A solicitação expirou. Peça uma nova solicitação ao operador.");
	}

	const tipo = ActionApprovalTypeEnum.parse(request.tipo);

	if (input.decisao === "CANCELAR") {
		// Desistência: somente o próprio solicitante cancela.
		if (request.solicitanteId !== session.user.id) throw new createHttpError.Forbidden("Somente o solicitante pode cancelar a solicitação.");
	} else {
		const handler = getActionApprovalHandler(tipo);
		if (!handler.autorizaDecisao(session.membership!.permissoes)) {
			throw new createHttpError.Forbidden("Você não tem permissão para decidir solicitações deste tipo.");
		}
	}

	const now = new Date();
	const nextStatus = input.decisao === "APROVAR" ? "APROVADA" : input.decisao === "REJEITAR" ? "REJEITADA" : "CANCELADA";
	// Update condicionado a PENDENTE: decide exatamente uma vez mesmo sob corrida entre aprovadores.
	const [updated] = await db
		.update(actionApprovalRequests)
		.set({
			status: nextStatus,
			decididaPorId: input.decisao === "CANCELAR" ? null : session.user.id,
			metodoDecisao: input.decisao === "CANCELAR" ? null : "PLATAFORMA",
			motivoDecisao: input.motivo ?? null,
			dataDecisao: now,
			// Aprovação vale por uma nova janela a partir da decisão — dá tempo do PDV consumir.
			dataExpiracao: input.decisao === "APROVAR" ? getActionApprovalExpirationDate(now) : request.dataExpiracao,
		})
		.where(and(eq(actionApprovalRequests.id, request.id), eq(actionApprovalRequests.status, "PENDENTE")))
		.returning();
	if (!updated) throw new createHttpError.Conflict("A solicitação já foi decidida por outro usuário.");

	const message =
		nextStatus === "APROVADA" ? "Solicitação aprovada com sucesso." : nextStatus === "REJEITADA" ? "Solicitação rejeitada." : "Solicitação cancelada.";
	return { data: { request: updated }, message };
}
export type TDecideActionApprovalOutput = Awaited<ReturnType<typeof decideActionApproval>>;

async function decideActionApprovalRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	if (!session.membership) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");

	const body = await request.json();
	const input = DecideActionApprovalInputSchema.parse(body);
	const result = await decideActionApproval({ input, session });
	return NextResponse.json(result);
}

export const POST = appApiHandler({ POST: decideActionApprovalRoute });
