import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { canViewIntegrations } from "@/lib/integrations/mask";
import { resolveMetaAdsIntegration } from "@/lib/integrations/meta/ads/config";
import { fetchMetaAdsAccountDailySpend } from "@/lib/integrations/meta/ads/insights";
import dayjs from "dayjs";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const MetaAdsSpendSeriesInputSchema = z.object({
	integrationId: z.string({ invalid_type_error: "Tipo inválido para o ID da integração." }).optional().nullable(),
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
export type TGetMetaAdsSpendSeriesInput = z.infer<typeof MetaAdsSpendSeriesInputSchema>;

async function getMetaAdsSpendSeries({ input, organizacaoId }: { input: TGetMetaAdsSpendSeriesInput; organizacaoId: string }) {
	const { config } = await resolveMetaAdsIntegration({ organizacaoId, integrationId: input.integrationId });
	const series = await fetchMetaAdsAccountDailySpend({ config, since: input.since, until: input.until });
	return { data: { series }, message: "Série de investimento buscada com sucesso." };
}
export type TGetMetaAdsSpendSeriesOutput = Awaited<ReturnType<typeof getMetaAdsSpendSeries>>;

async function getMetaAdsSpendSeriesRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para acessar o investimento do Meta Ads.");
	const organizacaoId = session.membership?.organizacao.id;
	if (!organizacaoId) throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização.");
	if (!canViewIntegrations(session.membership?.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para visualizar integrações.");

	const searchParams = request.nextUrl.searchParams;
	const input = MetaAdsSpendSeriesInputSchema.parse({
		integrationId: searchParams.get("integrationId"),
		since: searchParams.get("since"),
		until: searchParams.get("until"),
	});
	const result = await getMetaAdsSpendSeries({ input, organizacaoId });
	return NextResponse.json(result);
}

export const GET = appApiHandler({ GET: getMetaAdsSpendSeriesRoute });
