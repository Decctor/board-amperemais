import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { runDataCollectingV2 } from "@/lib/data-collecting-v2";
import { acceptIfoodDispute, rejectIfoodDispute } from "@/lib/integrations/ifood/disputes";
import { resolveIfoodManagementContext } from "@/lib/integrations/ifood/context";
import { getChannelErpPolicy, resolveFulfillmentChannelForSale } from "@/lib/sales/fulfillment-channels";
import { db } from "@/services/drizzle";
import { waitUntil } from "@vercel/functions";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

/**
 * Resposta rápida às disputas de cancelamento (HANDSHAKE_DISPUTE) a partir da esteira de
 * atendimento. Aceitar encerra o pedido (o CANCELLED chega pelo canal); rejeitar mantém o pedido
 * em andamento. A contraproposta fica no painel da integração iFood, que tem o contexto completo.
 */

const PostDisputeResponseInputSchema = z.object({
	saleId: z
		.string({ required_error: "ID da venda não informado.", invalid_type_error: "Tipo inválido para o ID da venda." })
		.min(1, "ID da venda não informado."),
	disputeId: z
		.string({ required_error: "ID da disputa não informado.", invalid_type_error: "Tipo inválido para o ID da disputa." })
		.min(1, "ID da disputa não informado."),
	decision: z.enum(["ACEITAR", "REJEITAR"], {
		required_error: "Decisão não informada.",
		invalid_type_error: "Decisão inválida.",
	}),
	reason: z.string({ invalid_type_error: "Tipo inválido para o motivo da resposta." }).optional().nullable(),
});
export type TPostFulfillmentDisputeResponseInput = z.infer<typeof PostDisputeResponseInputSchema>;

async function postDisputeResponse({ input, session }: { input: TPostFulfillmentDisputeResponseInput; session: TAuthUserSession }) {
	const orgId = session.membership!.organizacao.id;
	const sale = await db.query.sales.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.id, input.saleId), eq(fields.organizacaoId, orgId)),
		columns: { id: true, idExterno: true, integracaoId: true, modelo: true, processamentoOrigem: true, statusVenda: true, statusAtendimento: true },
	});
	if (!sale) throw new createHttpError.NotFound("Venda não encontrada.");

	const policy = getChannelErpPolicy(session.membership!.organizacao.configuracao);
	const channel = resolveFulfillmentChannelForSale(sale, policy);
	if (!channel) throw new createHttpError.BadRequest("Esta venda não pertence a um canal com disputas de cancelamento.");

	const context = await resolveIfoodManagementContext({ organizacaoId: orgId, integrationId: sale.integracaoId });
	if (input.decision === "ACEITAR") await acceptIfoodDispute(context.client, input.disputeId, input.reason);
	else await rejectIfoodDispute(context.client, input.disputeId, input.reason);

	// A resposta é assíncrona no canal: o desfecho chega como evento (HANDSHAKE_SETTLEMENT /
	// CANCELLED) e a ingestão encerra a pendência. Disparo em background para refletir mais cedo.
	waitUntil(
		runDataCollectingV2({ organizationIds: [orgId] }).catch((error) => {
			console.error("[ERROR] [FULFILLMENT_DISPUTE_RESPONSE] Falha ao atualizar ingestão pós-resposta", error);
		}),
	);

	return {
		data: { saleId: sale.id, disputeId: input.disputeId, decision: input.decision },
		message:
			input.decision === "ACEITAR"
				? "Cancelamento aceito na disputa. O pedido será atualizado quando o canal confirmar o desfecho."
				: "Disputa rejeitada. O pedido segue em andamento.",
	};
}
export type TPostFulfillmentDisputeResponseOutput = Awaited<ReturnType<typeof postDisputeResponse>>;

async function postDisputeResponseRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	if (!session.membership) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");
	if (!session.membership.organizacao.configuracao.recursos.erp.acesso) {
		throw new createHttpError.Forbidden("Sua organização não possui acesso ao módulo de ERP.");
	}

	const body = await request.json();
	const input = PostDisputeResponseInputSchema.parse(body);
	const result = await postDisputeResponse({ input, session });
	return NextResponse.json(result);
}

export const POST = appApiHandler({ POST: postDisputeResponseRoute });

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
