import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { canViewIntegrations } from "@/lib/integrations/mask";
import { resolveMetaAdsIntegration } from "@/lib/integrations/meta/ads/config";
import { fetchMetaAdsAccountInsights, fetchMetaAdsAdLevelInsights, fetchMetaAdsCampaignInsights } from "@/lib/integrations/meta/ads/insights";
import dayjs from "dayjs";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const MetaAdsInsightsInputSchema = z.object({
	integrationId: z.string({ invalid_type_error: "Tipo inválido para o ID da integração." }).optional().nullable(),
	level: z
		.enum(["account", "campaign", "ad"])
		.optional()
		.nullable()
		.transform((v) => v ?? "account"),
	since: z
		.string({ invalid_type_error: "Tipo inválido para a data inicial." })
		.optional()
		.nullable()
		.transform((v) => v || dayjs().subtract(30, "day").format("YYYY-MM-DD")),
	until: z
		.string({ invalid_type_error: "Tipo inválido para a data final." })
		.optional()
		.nullable()
		.transform((v) => v || dayjs().format("YYYY-MM-DD")),
});
export type TGetMetaAdsInsightsInput = z.infer<typeof MetaAdsInsightsInputSchema>;

async function getMetaAdsInsights({ input, organizacaoId }: { input: TGetMetaAdsInsightsInput; organizacaoId: string }) {
	const { integrationId, config } = await resolveMetaAdsIntegration({ organizacaoId, integrationId: input.integrationId });
	const base = { config, integrationId, since: input.since, until: input.until };
	console.log("[getMetaAdsInsights] input", input);
	if (input.level === "campaign") {
		const campaigns = await fetchMetaAdsCampaignInsights(base);
		return { data: { account: null, campaigns, ads: null }, message: "Métricas por campanha buscadas com sucesso." };
	}
	if (input.level === "ad") {
		const ads = await fetchMetaAdsAdLevelInsights(base);
		return { data: { account: null, campaigns: null, ads }, message: "Métricas por anúncio buscadas com sucesso." };
	}
	const account = await fetchMetaAdsAccountInsights(base);
	return { data: { account, campaigns: null, ads: null }, message: "Métricas da conta buscadas com sucesso." };
}
export type TGetMetaAdsInsightsOutput = Awaited<ReturnType<typeof getMetaAdsInsights>>;

async function getMetaAdsInsightsRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para acessar as métricas do Meta Ads.");
	const organizacaoId = session.membership?.organizacao.id;
	if (!organizacaoId) throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização.");
	if (!canViewIntegrations(session.membership?.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para visualizar integrações.");

	const searchParams = request.nextUrl.searchParams;
	const input = MetaAdsInsightsInputSchema.parse({
		integrationId: searchParams.get("integrationId"),
		level: searchParams.get("level"),
		since: searchParams.get("since"),
		until: searchParams.get("until"),
	});
	const result = await getMetaAdsInsights({ input, organizacaoId });
	return NextResponse.json(result);
}

export const GET = appApiHandler({ GET: getMetaAdsInsightsRoute });
