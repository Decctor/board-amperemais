import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { canViewIntegrations } from "@/lib/integrations/mask";
import { resolveMetaAdsIntegration } from "@/lib/integrations/meta/ads/config";
import { fetchMetaAdsLibrary } from "@/lib/integrations/meta/ads/library";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const MetaAdsLibraryInputSchema = z.object({
	integrationId: z.string({ invalid_type_error: "Tipo inválido para o ID da integração." }).optional().nullable(),
	status: z
		.enum(["all", "active", "paused"])
		.optional()
		.nullable()
		.transform((v) => v ?? "all"),
	limit: z
		.string({ invalid_type_error: "Tipo inválido para o limite." })
		.optional()
		.nullable()
		.transform((v) => (v ? Math.min(Number(v) || 100, 200) : 100)),
});
export type TGetMetaAdsLibraryInput = z.infer<typeof MetaAdsLibraryInputSchema>;

async function getMetaAdsLibrary({ input, organizacaoId }: { input: TGetMetaAdsLibraryInput; organizacaoId: string }) {
	const { config } = await resolveMetaAdsIntegration({ organizacaoId, integrationId: input.integrationId });
	const ads = await fetchMetaAdsLibrary({ config, status: input.status, limit: input.limit });
	return { data: { ads }, message: "Biblioteca de anúncios buscada com sucesso." };
}
export type TGetMetaAdsLibraryOutput = Awaited<ReturnType<typeof getMetaAdsLibrary>>;

async function getMetaAdsLibraryRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para acessar a biblioteca de anúncios.");
	const organizacaoId = session.membership?.organizacao.id;
	if (!organizacaoId) throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização.");
	if (!canViewIntegrations(session.membership?.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para visualizar integrações.");

	const searchParams = request.nextUrl.searchParams;
	const input = MetaAdsLibraryInputSchema.parse({
		integrationId: searchParams.get("integrationId"),
		status: searchParams.get("status"),
		limit: searchParams.get("limit"),
	});
	const result = await getMetaAdsLibrary({ input, organizacaoId });
	return NextResponse.json(result);
}

export const GET = appApiHandler({ GET: getMetaAdsLibraryRoute });
