import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { getActiveDataSourceIntegrations } from "@/lib/integrations/data-sources";
import { resolveIfoodManagementContext } from "@/lib/integrations/ifood/context";
import { getIfoodMerchantDetails, getIfoodMerchantsList } from "@/lib/integrations/ifood/merchant";
import type { TIfoodMerchantDetailsDTO, TIfoodMerchantSummaryDTO } from "@/lib/integrations/ifood/merchant-types";
import { canViewIntegrations } from "@/lib/integrations/mask";
import { db } from "@/services/drizzle";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const GetIfoodMerchantsInputSchema = z.object({
	merchantId: z
		.string({ invalid_type_error: "Tipo inválido para o ID da loja do iFood." })
		.optional()
		.nullable()
		.transform((v) => v || null),
});
export type TGetIfoodMerchantsInput = z.infer<typeof GetIfoodMerchantsInputSchema>;

async function getIfoodMerchants({ input, organizacaoId }: { input: TGetIfoodMerchantsInput; organizacaoId: string }) {
	if (input.merchantId) {
		const context = await resolveIfoodManagementContext({ organizacaoId, merchantId: input.merchantId });
		const byId = await getIfoodMerchantDetails(context.client, input.merchantId);
		return {
			data: { byId, default: null as TIfoodMerchantSummaryDTO[] | null },
			message: "Detalhes da loja do iFood buscados com sucesso.",
		};
	}

	// Listagem agrega as lojas de TODAS as conexões iFood ativas da organização (N contas → N
	// token sets). As demais rotas do módulo resolvem a conexão certa pelo merchantId.
	const rows = await getActiveDataSourceIntegrations({ executor: db, organizationId: organizacaoId, types: ["IFOOD"] });
	if (!rows.length) {
		throw new createHttpError.NotFound("Integração do iFood não encontrada. Conecte sua loja iFood para gerenciar seus recursos.");
	}

	const merchants: TIfoodMerchantSummaryDTO[] = [];
	const seenMerchantIds = new Set<string>();
	for (const row of rows) {
		const context = await resolveIfoodManagementContext({ organizacaoId, integrationId: row.id });
		const rowMerchants = context.merchants ?? (await getIfoodMerchantsList(context.client));
		for (const merchant of rowMerchants) {
			if (seenMerchantIds.has(merchant.id)) continue;
			seenMerchantIds.add(merchant.id);
			merchants.push(merchant);
		}
	}

	return {
		data: { byId: null as TIfoodMerchantDetailsDTO | null, default: merchants },
		message: "Lojas do iFood buscadas com sucesso.",
	};
}
export type TGetIfoodMerchantsOutput = Awaited<ReturnType<typeof getIfoodMerchants>>;

async function getIfoodMerchantsRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para acessar a integração do iFood.");
	const organizacaoId = session.membership?.organizacao.id;
	if (!organizacaoId) throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização para acessar a integração do iFood.");
	if (!canViewIntegrations(session.membership?.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para visualizar integrações.");

	const searchParams = request.nextUrl.searchParams;
	const input = GetIfoodMerchantsInputSchema.parse({ merchantId: searchParams.get("merchantId") });
	const result = await getIfoodMerchants({ input, organizacaoId });
	return NextResponse.json(result);
}

export const GET = appApiHandler({ GET: getIfoodMerchantsRoute });

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
