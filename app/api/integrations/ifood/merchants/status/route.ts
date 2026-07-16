import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { resolveIfoodManagementContext } from "@/lib/integrations/ifood/context";
import { getIfoodMerchantStatus } from "@/lib/integrations/ifood/merchant";
import { canViewIntegrations } from "@/lib/integrations/mask";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const GetIfoodMerchantStatusInputSchema = z.object({
	merchantId: z
		.string({
			required_error: "ID da loja do iFood não informado.",
			invalid_type_error: "Tipo inválido para o ID da loja do iFood.",
		})
		.min(1, "ID da loja do iFood não informado."),
});
export type TGetIfoodMerchantStatusInput = z.infer<typeof GetIfoodMerchantStatusInputSchema>;

async function getIfoodMerchantStatusService({ input, organizacaoId }: { input: TGetIfoodMerchantStatusInput; organizacaoId: string }) {
	const context = await resolveIfoodManagementContext({ organizacaoId, merchantId: input.merchantId });
	const operacoes = await getIfoodMerchantStatus(context.client, input.merchantId);
	return { data: { operacoes }, message: "Status da loja do iFood buscado com sucesso." };
}
export type TGetIfoodMerchantStatusOutput = Awaited<ReturnType<typeof getIfoodMerchantStatusService>>;

async function getIfoodMerchantStatusRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para acessar a integração do iFood.");
	const organizacaoId = session.membership?.organizacao.id;
	if (!organizacaoId) throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização para acessar a integração do iFood.");
	if (!canViewIntegrations(session.membership?.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para visualizar integrações.");

	const searchParams = request.nextUrl.searchParams;
	const input = GetIfoodMerchantStatusInputSchema.parse({ merchantId: searchParams.get("merchantId") });
	const result = await getIfoodMerchantStatusService({ input, organizacaoId });
	return NextResponse.json(result);
}

export const GET = appApiHandler({ GET: getIfoodMerchantStatusRoute });

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
