import { appApiHandler } from "@/lib/app-api";
import { getActionApprovalExpirationDate, getActionApprovalHandler } from "@/lib/action-approvals";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { ActionApprovalPayloadSchema } from "@/schemas/action-approvals";
import { ActionApprovalTypeEnum } from "@/schemas/enums";
import { db } from "@/services/drizzle";
import { actionApprovalRequests } from "@/services/drizzle/schema";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

/**
 * Fluxo síncrono de aprovação no terminal (UX de supermercado): um aprovador presente digita o
 * identificador + senha de operador do SEU vendedor vinculado e a solicitação nasce e é decidida
 * no mesmo request (metodoDecisao = SENHA_PDV) — mas fica registrada como auditoria. Restrição
 * implícita: aprovador por PIN precisa ser membro com vendedor vinculado; gestor sem vendedor
 * vinculado aprova pelo painel.
 */
const DecideActionApprovalWithPinInputSchema = z.object({
	tipo: ActionApprovalTypeEnum,
	payload: ActionApprovalPayloadSchema,
	identificador: z.string({
		required_error: "Identificador do aprovador não informado.",
		invalid_type_error: "Tipo não válido para o identificador do aprovador.",
	}),
	senhaOperador: z.string({
		required_error: "Senha do operador não informada.",
		invalid_type_error: "Tipo não válido para a senha do operador.",
	}),
});
export type TDecideActionApprovalWithPinInput = z.infer<typeof DecideActionApprovalWithPinInputSchema>;

async function decideActionApprovalWithPin({ input, session }: { input: TDecideActionApprovalWithPinInput; session: TAuthUserSession }) {
	const orgId = session.membership!.organizacao.id;
	if (input.tipo !== input.payload.tipo) throw new createHttpError.BadRequest("O tipo da solicitação não corresponde ao payload.");

	const handler = getActionApprovalHandler(input.tipo);
	handler.validarCriacao({ payload: input.payload, permissoes: session.membership!.permissoes });

	// O identificador desambigua o vendedor; a senha confirma. Não confiar em unicidade da senha na org.
	const aprovadorVendedor = await db.query.sellers.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.identificador, input.identificador), eq(fields.organizacaoId, orgId), eq(fields.ativo, true)),
		columns: { id: true, senhaOperador: true },
	});
	if (!aprovadorVendedor || aprovadorVendedor.senhaOperador !== input.senhaOperador) {
		throw new createHttpError.Unauthorized("Identificador ou senha do aprovador inválidos.");
	}

	const aprovadorMembership = await db.query.organizationMembers.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.organizacaoId, orgId), eq(fields.usuarioVendedorId, aprovadorVendedor.id)),
		columns: { usuarioId: true, permissoes: true },
	});
	if (!aprovadorMembership) {
		throw new createHttpError.Forbidden("O vendedor informado não possui usuário vinculado nesta organização.");
	}
	if (!handler.autorizaDecisao(aprovadorMembership.permissoes)) {
		throw new createHttpError.Forbidden("O aprovador informado não tem permissão para aprovar solicitações deste tipo.");
	}

	const now = new Date();
	const [request] = await db
		.insert(actionApprovalRequests)
		.values({
			organizacaoId: orgId,
			tipo: input.tipo,
			status: "APROVADA",
			payload: input.payload,
			resumo: handler.montarResumo(input.payload),
			solicitanteId: session.user.id,
			decididaPorId: aprovadorMembership.usuarioId,
			metodoDecisao: "SENHA_PDV",
			dataDecisao: now,
			dataExpiracao: getActionApprovalExpirationDate(now),
		})
		.returning();
	if (!request) throw new createHttpError.InternalServerError("Erro ao registrar a aprovação.");

	return {
		data: { request },
		message: "Aprovação registrada com sucesso.",
	};
}
export type TDecideActionApprovalWithPinOutput = Awaited<ReturnType<typeof decideActionApprovalWithPin>>;

async function decideActionApprovalWithPinRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	if (!session.membership) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");

	const body = await request.json();
	const input = DecideActionApprovalWithPinInputSchema.parse(body);
	const result = await decideActionApprovalWithPin({ input, session });
	return NextResponse.json(result);
}

export const POST = appApiHandler({ POST: decideActionApprovalWithPinRoute });
