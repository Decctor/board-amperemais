import { getActionApprovalExpirationDate, getActionApprovalHandler, isActionApprovalExpired } from "@/lib/action-approvals";
import type { TActionApprovalPayload } from "@/schemas/action-approvals";
import { db, type DBTransaction } from "@/services/drizzle";
import { actionApprovalRequests } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";

export async function createAgentMutationApproval({
	organizationId,
	requesterId,
	payload,
}: {
	organizationId: string;
	requesterId: string;
	payload: Exclude<TActionApprovalPayload, { tipo: "VENDA_DESCONTO" }>;
}) {
	const handler = getActionApprovalHandler(payload.tipo);
	const [request] = await db
		.insert(actionApprovalRequests)
		.values({
			organizacaoId: organizationId,
			tipo: payload.tipo,
			status: "PENDENTE",
			payload,
			resumo: handler.montarResumo(payload),
			solicitanteId: requesterId,
			dataExpiracao: getActionApprovalExpirationDate(),
		})
		.returning();
	if (!request) throw new createHttpError.InternalServerError("Não foi possível criar a solicitação de aprovação.");
	return request;
}

export async function requireAgentMutationApproval({
	tx,
	approvalId,
	organizationId,
	type,
	principalId,
	configurationHash,
}: {
	tx: DBTransaction;
	approvalId: string;
	organizationId: string;
	type: "AGENTE_ATIVAR_CAMPANHA" | "AGENTE_SUBMETER_TEMPLATE";
	principalId: string;
	configurationHash: string;
}) {
	const approval = await tx.query.actionApprovalRequests.findFirst({
		where: and(eq(actionApprovalRequests.id, approvalId), eq(actionApprovalRequests.organizacaoId, organizationId)),
	});
	if (!approval || approval.tipo !== type || approval.payload.tipo !== type)
		throw new createHttpError.Forbidden("Aprovação não encontrada para esta operação.");
	if (approval.status !== "APROVADA") throw new createHttpError.Forbidden("A solicitação ainda não foi aprovada ou já foi consumida.");
	if (isActionApprovalExpired(approval)) throw new createHttpError.Forbidden("A aprovação expirou. Solicite uma nova aprovação.");
	if (approval.payload.principalId !== principalId) throw new createHttpError.Forbidden("A aprovação pertence a outra conexão MCP.");
	if (approval.payload.configuracaoHash !== configurationHash)
		throw new createHttpError.Conflict("A configuração mudou depois da aprovação. Solicite uma nova aprovação.");
	return approval;
}

export async function consumeAgentMutationApproval({
	tx,
	approvalId,
	consumption,
}: {
	tx: DBTransaction;
	approvalId: string;
	consumption: { campanhaId?: string; messageTemplateId?: string };
}) {
	const [consumed] = await tx
		.update(actionApprovalRequests)
		.set({ status: "CONSUMIDA", consumo: consumption, dataConsumo: new Date() })
		.where(and(eq(actionApprovalRequests.id, approvalId), eq(actionApprovalRequests.status, "APROVADA")))
		.returning({ id: actionApprovalRequests.id });
	if (!consumed) throw new createHttpError.Conflict("A aprovação já foi consumida.");
}
