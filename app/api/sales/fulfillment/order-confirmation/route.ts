import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { runDataCollectingV2 } from "@/lib/data-collecting-v2";
import { processSaleCupomAutoPrintIfEligible } from "@/lib/desktop-agent/auto-print";
import { resolveIfoodManagementContext } from "@/lib/integrations/ifood/context";
import { confirmIfoodOrder, getIfoodOrderCancellationReasons, requestIfoodOrderCancellation } from "@/lib/integrations/ifood/orders";
import { getChannelErpPolicy, resolveFulfillmentChannelForSale } from "@/lib/sales/fulfillment-channels";
import { db } from "@/services/drizzle";
import { sales } from "@/services/drizzle/schema";
import { waitUntil } from "@vercel/functions";
import { eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

/**
 * Fila de pedidos a confirmar da esteira de atendimento (canais gerenciados — iFood PLACED).
 * GET: motivos de cancelamento do canal para o fluxo de recusa.
 * POST: confirma ou recusa o pedido no canal. O estado local é promovido na confirmação
 * (a ingestão consolida com o evento); a recusa aguarda o evento CANCELLED do canal.
 */

const GetOrderConfirmationInputSchema = z.object({
	saleId: z
		.string({ required_error: "ID da venda não informado.", invalid_type_error: "Tipo inválido para o ID da venda." })
		.min(1, "ID da venda não informado."),
});

const PostOrderConfirmationInputSchema = z
	.object({
		saleId: z
			.string({ required_error: "ID da venda não informado.", invalid_type_error: "Tipo inválido para o ID da venda." })
			.min(1, "ID da venda não informado."),
		decision: z.enum(["CONFIRMAR", "RECUSAR"], {
			required_error: "Decisão não informada.",
			invalid_type_error: "Decisão inválida.",
		}),
		cancellationCode: z.string({ invalid_type_error: "Tipo inválido para o motivo de recusa." }).optional().nullable(),
	})
	.superRefine((value, ctx) => {
		if (value.decision === "RECUSAR" && !value.cancellationCode) {
			ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Informe o motivo de recusa do pedido." });
		}
	});
export type TPostFulfillmentOrderConfirmationInput = z.infer<typeof PostOrderConfirmationInputSchema>;

async function resolveManagedSaleForConfirmation({ saleId, session }: { saleId: string; session: TAuthUserSession }) {
	const orgId = session.membership!.organizacao.id;
	const sale = await db.query.sales.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.id, saleId), eq(fields.organizacaoId, orgId)),
		columns: { id: true, idExterno: true, integracaoId: true, modelo: true, processamentoOrigem: true, statusVenda: true, statusAtendimento: true },
	});
	if (!sale) throw new createHttpError.NotFound("Venda não encontrada.");

	const policy = getChannelErpPolicy(session.membership!.organizacao.configuracao);
	const channel = resolveFulfillmentChannelForSale(sale, policy);
	if (!channel) throw new createHttpError.BadRequest("Esta venda não pertence a um canal com confirmação de pedidos.");

	return { orgId, sale, channel };
}

async function getOrderConfirmationReasons({ saleId, session }: { saleId: string; session: TAuthUserSession }) {
	const { orgId, sale } = await resolveManagedSaleForConfirmation({ saleId, session });
	const context = await resolveIfoodManagementContext({ organizacaoId: orgId, integrationId: sale.integracaoId });
	const motivos = await getIfoodOrderCancellationReasons(context.client, sale.idExterno);
	return { data: { motivos }, message: "Motivos de recusa carregados com sucesso." };
}
export type TGetFulfillmentOrderConfirmationOutput = Awaited<ReturnType<typeof getOrderConfirmationReasons>>;

async function postOrderConfirmation({ input, session }: { input: TPostFulfillmentOrderConfirmationInput; session: TAuthUserSession }) {
	const { orgId, sale } = await resolveManagedSaleForConfirmation({ saleId: input.saleId, session });
	const context = await resolveIfoodManagementContext({ organizacaoId: orgId, integrationId: sale.integracaoId });

	if (input.decision === "CONFIRMAR") {
		await confirmIfoodOrder(context.client, sale.idExterno);
		// Promoção local imediata (UX): a ingestão consolida quando o evento CONFIRMED chegar —
		// a transição vira no-op e os efeitos de "nova compra" disparam pelo becameValid do sync.
		if (!sale.statusVenda && sale.statusAtendimento === "NAO_INICIADO") {
			await db.update(sales).set({ statusVenda: "CONFIRMADA", statusAtendimento: "EM_PREPARO" }).where(eq(sales.id, sale.id));
		}
		// Cupom automático na hora do aceite, sem esperar o sync. Nunca lança; a chave de
		// idempotência absorve a sobreposição com os hooks da ingestão.
		await processSaleCupomAutoPrintIfEligible({
			organizacaoId: orgId,
			saleId: sale.id,
			configuracao: session.membership!.organizacao.configuracao,
			solicitadoPorId: session.user.id,
		});
	} else {
		await requestIfoodOrderCancellation(context.client, sale.idExterno, input.cancellationCode as string);
		// A recusa é assíncrona: o pedido sai da fila quando o evento CANCELLED chegar.
	}

	waitUntil(
		runDataCollectingV2({ organizationIds: [orgId] }).catch((error) => {
			console.error("[ERROR] [FULFILLMENT_ORDER_CONFIRMATION] Falha ao atualizar ingestão pós-decisão", error);
		}),
	);

	return {
		data: { saleId: sale.id, decision: input.decision },
		message:
			input.decision === "CONFIRMAR"
				? "Pedido confirmado no canal com sucesso."
				: "Recusa enviada ao canal. O pedido será atualizado quando o canal confirmar o cancelamento.",
	};
}
export type TPostFulfillmentOrderConfirmationOutput = Awaited<ReturnType<typeof postOrderConfirmation>>;

function assertSessionForOrderConfirmation(session: Awaited<ReturnType<typeof getCurrentSessionUncached>>) {
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	if (!session.membership) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");
	if (!session.membership.organizacao.configuracao.recursos.erp.acesso) {
		throw new createHttpError.Forbidden("Sua organização não possui acesso ao módulo de ERP.");
	}
	return session;
}

async function getOrderConfirmationRoute(request: NextRequest) {
	const session = assertSessionForOrderConfirmation(await getCurrentSessionUncached());
	const input = GetOrderConfirmationInputSchema.parse({ saleId: request.nextUrl.searchParams.get("saleId") });
	const result = await getOrderConfirmationReasons({ saleId: input.saleId, session });
	return NextResponse.json(result);
}

async function postOrderConfirmationRoute(request: NextRequest) {
	const session = assertSessionForOrderConfirmation(await getCurrentSessionUncached());
	const body = await request.json();
	const input = PostOrderConfirmationInputSchema.parse(body);
	const result = await postOrderConfirmation({ input, session });
	return NextResponse.json(result);
}

export const GET = appApiHandler({ GET: getOrderConfirmationRoute });
export const POST = appApiHandler({ POST: postOrderConfirmationRoute });

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
