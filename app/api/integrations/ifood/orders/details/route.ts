import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { resolveIfoodManagementContext } from "@/lib/integrations/ifood/context";
import { getIfoodOrderCancellationReasons, getIfoodOrderDetails } from "@/lib/integrations/ifood/orders";
import { canViewIntegrations } from "@/lib/integrations/mask";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const GetIfoodOrderDetailsInputSchema = z.object({
	orderId: z
		.string({
			required_error: "ID do pedido do iFood não informado.",
			invalid_type_error: "Tipo inválido para o ID do pedido do iFood.",
		})
		.min(1, "ID do pedido do iFood não informado."),
});
export type TGetIfoodOrderDetailsInput = z.infer<typeof GetIfoodOrderDetailsInputSchema>;

async function getIfoodOrderDetailsService({ input, organizacaoId }: { input: TGetIfoodOrderDetailsInput; organizacaoId: string }) {
	const context = await resolveIfoodManagementContext({ organizacaoId });

	const [pedido, motivosCancelamento] = await Promise.all([
		getIfoodOrderDetails(context.client, input.orderId),
		// Motivos de cancelamento são específicos do pedido/estado; falha aqui não deve
		// derrubar a visualização dos detalhes.
		getIfoodOrderCancellationReasons(context.client, input.orderId).catch(() => []),
	]);

	// Isolamento multi-tenant: o token da organização só acessa os merchants autorizados,
	// mas validamos também contra a lista da config.
	if (pedido.merchant.id && context.merchantIds.length && !context.merchantIds.includes(pedido.merchant.id)) {
		throw new createHttpError.NotFound("Pedido não encontrado para esta organização.");
	}

	return { data: { pedido, motivosCancelamento }, message: "Detalhes do pedido do iFood buscados com sucesso." };
}
export type TGetIfoodOrderDetailsOutput = Awaited<ReturnType<typeof getIfoodOrderDetailsService>>;

async function getIfoodOrderDetailsRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para acessar a integração do iFood.");
	const organizacaoId = session.membership?.organizacao.id;
	if (!organizacaoId) throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização para acessar a integração do iFood.");
	if (!canViewIntegrations(session.membership?.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para visualizar integrações.");

	const searchParams = request.nextUrl.searchParams;
	const input = GetIfoodOrderDetailsInputSchema.parse({ orderId: searchParams.get("orderId") });
	const result = await getIfoodOrderDetailsService({ input, organizacaoId });
	return NextResponse.json(result);
}

export const GET = appApiHandler({ GET: getIfoodOrderDetailsRoute });

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
