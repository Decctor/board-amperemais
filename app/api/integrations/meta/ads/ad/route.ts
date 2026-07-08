import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { canViewIntegrations } from "@/lib/integrations/mask";
import { resolveMetaAdsIntegration } from "@/lib/integrations/meta/ads/config";
import { fetchMetaAdsAdDetail } from "@/lib/integrations/meta/ads/insights";
import dayjs from "dayjs";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const MetaAdsAdDetailInputSchema = z.object({
	id: z.string({ required_error: "ID do anúncio não informado.", invalid_type_error: "Tipo inválido para o ID do anúncio." }),
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
export type TGetMetaAdsAdDetailInput = z.infer<typeof MetaAdsAdDetailInputSchema>;

async function getMetaAdsAdDetail({ input, organizacaoId }: { input: TGetMetaAdsAdDetailInput; organizacaoId: string }) {
	const { config } = await resolveMetaAdsIntegration({ organizacaoId, integrationId: input.integrationId });
	const detail = await fetchMetaAdsAdDetail({ config, adId: input.id, since: input.since, until: input.until });
	return { data: { byId: detail }, message: "Detalhe do anúncio buscado com sucesso." };
}
export type TGetMetaAdsAdDetailOutput = Awaited<ReturnType<typeof getMetaAdsAdDetail>>;

async function getMetaAdsAdDetailRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para acessar o detalhe do anúncio.");
	const organizacaoId = session.membership?.organizacao.id;
	if (!organizacaoId) throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização.");
	if (!canViewIntegrations(session.membership?.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para visualizar integrações.");

	const searchParams = request.nextUrl.searchParams;
	const input = MetaAdsAdDetailInputSchema.parse({
		id: searchParams.get("id"),
		integrationId: searchParams.get("integrationId"),
		since: searchParams.get("since"),
		until: searchParams.get("until"),
	});
	const result = await getMetaAdsAdDetail({ input, organizacaoId });
	return NextResponse.json(result);
}

export const GET = appApiHandler({ GET: getMetaAdsAdDetailRoute });
