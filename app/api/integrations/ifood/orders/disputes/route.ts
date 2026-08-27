import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { runDataCollectingV2 } from "@/lib/data-collecting-v2";
import { resolveIfoodManagementContext } from "@/lib/integrations/ifood/context";
import { acceptIfoodDispute, proposeIfoodDisputeAlternative, rejectIfoodDispute } from "@/lib/integrations/ifood/disputes";
import { canManageIntegrations } from "@/lib/integrations/mask";
import { db } from "@/services/drizzle";
import { waitUntil } from "@vercel/functions";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

/**
 * Resposta às disputas de cancelamento da Plataforma de Negociação (HANDSHAKE_DISPUTE) a partir
 * do painel da integração. A disputa tem prazo — sem resposta o iFood executa a ação de timeout.
 * O desfecho chega como evento HANDSHAKE_SETTLEMENT e encerra a pendência via ingestão.
 */

const IfoodDisputeActionEnum = z.enum(["ACEITAR", "REJEITAR", "CONTRAPROPOSTA"], {
	required_error: "Ação da disputa não informada.",
	invalid_type_error: "Ação de disputa inválida.",
});
export type TIfoodDisputeActionEnum = z.infer<typeof IfoodDisputeActionEnum>;

const IFOOD_DISPUTE_ACTION_MESSAGES: Record<TIfoodDisputeActionEnum, string> = {
	ACEITAR: "Cancelamento aceito na disputa. O pedido será atualizado quando o iFood confirmar o desfecho.",
	REJEITAR: "Disputa rejeitada. O pedido segue em andamento — aguarde o desfecho pelo iFood.",
	CONTRAPROPOSTA: "Contraproposta enviada ao cliente. O desfecho chega pelos eventos do iFood.",
};

const PostIfoodDisputeResponseInputSchema = z
	.object({
		orderId: z
			.string({ required_error: "ID do pedido do iFood não informado.", invalid_type_error: "Tipo inválido para o ID do pedido do iFood." })
			.min(1, "ID do pedido do iFood não informado."),
		disputeId: z
			.string({ required_error: "ID da disputa não informado.", invalid_type_error: "Tipo inválido para o ID da disputa." })
			.min(1, "ID da disputa não informado."),
		action: IfoodDisputeActionEnum,
		reason: z.string({ invalid_type_error: "Tipo inválido para o motivo da resposta." }).optional().nullable(),
		// Contraproposta: valor em centavos como string, no formato do maxAmount recebido no evento.
		counterOffer: z
			.object({
				type: z.string({ required_error: "Tipo da contraproposta não informado." }).min(1, "Tipo da contraproposta não informado."),
				amountValue: z.string({ required_error: "Valor da contraproposta não informado." }).regex(/^\d+$/, "Valor da contraproposta inválido."),
				currency: z.string({ invalid_type_error: "Tipo inválido para a moeda da contraproposta." }).default("BRL"),
			})
			.optional()
			.nullable(),
	})
	.superRefine((value, ctx) => {
		if (value.action === "CONTRAPROPOSTA" && !value.counterOffer) {
			ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Informe a contraproposta a ser enviada." });
		}
	});
export type TPostIfoodDisputeResponseInput = z.infer<typeof PostIfoodDisputeResponseInputSchema>;

async function postIfoodDisputeResponse({ input, organizacaoId }: { input: TPostIfoodDisputeResponseInput; organizacaoId: string }) {
	// Proveniência da venda já ingerida desambigua a conexão quando a org tem N contas iFood.
	const sale = await db.query.sales.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.organizacaoId, organizacaoId), eq(fields.idExterno, input.orderId)),
		columns: { integracaoId: true },
	});
	const context = await resolveIfoodManagementContext({ organizacaoId, integrationId: sale?.integracaoId });

	if (input.action === "ACEITAR") await acceptIfoodDispute(context.client, input.disputeId, input.reason);
	if (input.action === "REJEITAR") await rejectIfoodDispute(context.client, input.disputeId, input.reason);
	if (input.action === "CONTRAPROPOSTA") {
		const counterOffer = input.counterOffer!;
		await proposeIfoodDisputeAlternative(context.client, input.disputeId, {
			type: counterOffer.type,
			amountValue: counterOffer.amountValue,
			currency: counterOffer.currency,
		});
	}

	// A resposta responde 202 no iFood e o desfecho chega como evento (HANDSHAKE_SETTLEMENT /
	// CANCELLED). Disparamos a ingestão em background para refletir o novo estado sem esperar o cron.
	waitUntil(
		runDataCollectingV2({ organizationIds: [organizacaoId] }).catch((error) => {
			console.error("[ERROR] [IFOOD_DISPUTE_RESPONSE] Falha ao atualizar ingestão pós-resposta", error);
		}),
	);

	return {
		data: { orderId: input.orderId, disputeId: input.disputeId, action: input.action },
		message: IFOOD_DISPUTE_ACTION_MESSAGES[input.action],
	};
}
export type TPostIfoodDisputeResponseOutput = Awaited<ReturnType<typeof postIfoodDisputeResponse>>;

async function postIfoodDisputeResponseRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para acessar a integração do iFood.");
	const organizacaoId = session.membership?.organizacao.id;
	if (!organizacaoId) throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização para acessar a integração do iFood.");
	if (!canManageIntegrations(session.membership?.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para gerenciar integrações.");

	const body = await request.json();
	const input = PostIfoodDisputeResponseInputSchema.parse(body);
	const result = await postIfoodDisputeResponse({ input, organizacaoId });
	return NextResponse.json(result);
}

export const POST = appApiHandler({ POST: postIfoodDisputeResponseRoute });

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
