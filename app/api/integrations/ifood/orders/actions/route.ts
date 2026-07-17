import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { runDataCollectingV2 } from "@/lib/data-collecting-v2";
import { resolveIfoodManagementContext } from "@/lib/integrations/ifood/context";
import { IFOOD_ORDER_ACTION_LABELS, IfoodOrderActionEnum } from "@/lib/integrations/ifood/order-types";
import {
	confirmIfoodOrder,
	dispatchIfoodOrder,
	requestIfoodOrderCancellation,
	setIfoodOrderReadyToPickup,
	startIfoodOrderPreparation,
} from "@/lib/integrations/ifood/orders";
import { canManageIntegrations } from "@/lib/integrations/mask";
import { waitUntil } from "@vercel/functions";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const PostIfoodOrderActionInputSchema = z
	.object({
		orderId: z
			.string({
				required_error: "ID do pedido do iFood não informado.",
				invalid_type_error: "Tipo inválido para o ID do pedido do iFood.",
			})
			.min(1, "ID do pedido do iFood não informado."),
		action: IfoodOrderActionEnum,
		cancellationCode: z.string({ invalid_type_error: "Tipo inválido para o motivo de cancelamento." }).optional().nullable(),
	})
	.superRefine((value, ctx) => {
		if (value.action === "requestCancellation" && !value.cancellationCode) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Informe o motivo de cancelamento do pedido.",
			});
		}
	});
export type TPostIfoodOrderActionInput = z.infer<typeof PostIfoodOrderActionInputSchema>;

async function postIfoodOrderAction({ input, organizacaoId }: { input: TPostIfoodOrderActionInput; organizacaoId: string }) {
	const context = await resolveIfoodManagementContext({ organizacaoId });

	if (input.action === "confirm") await confirmIfoodOrder(context.client, input.orderId);
	if (input.action === "startPreparation") await startIfoodOrderPreparation(context.client, input.orderId);
	if (input.action === "readyToPickup") await setIfoodOrderReadyToPickup(context.client, input.orderId);
	if (input.action === "dispatch") await dispatchIfoodOrder(context.client, input.orderId);
	if (input.action === "requestCancellation") await requestIfoodOrderCancellation(context.client, input.orderId, input.cancellationCode as string);

	// A ação responde 202 no iFood e o estado definitivo chega como evento. Disparamos o
	// pipeline de ingestão da organização em background para refletir o novo estado na
	// listagem sem esperar o próximo cron.
	waitUntil(
		runDataCollectingV2({ organizationIds: [organizacaoId] }).catch((error) => {
			console.error("[ERROR] [IFOOD_ORDER_ACTION] Falha ao atualizar ingestão pós-ação", error);
		}),
	);

	return {
		data: { orderId: input.orderId, action: input.action },
		message: `Pedido ${IFOOD_ORDER_ACTION_LABELS[input.action]} no iFood com sucesso.`,
	};
}
export type TPostIfoodOrderActionOutput = Awaited<ReturnType<typeof postIfoodOrderAction>>;

async function postIfoodOrderActionRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para acessar a integração do iFood.");
	const organizacaoId = session.membership?.organizacao.id;
	if (!organizacaoId) throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização para acessar a integração do iFood.");
	if (!canManageIntegrations(session.membership?.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para gerenciar integrações.");

	const body = await request.json();
	const input = PostIfoodOrderActionInputSchema.parse(body);
	const result = await postIfoodOrderAction({ input, organizacaoId });
	return NextResponse.json(result);
}

export const POST = appApiHandler({ POST: postIfoodOrderActionRoute });

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
