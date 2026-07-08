import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { previewCampaignAudience } from "@/lib/campaigns/filters";
import { canViewIntegrations } from "@/lib/integrations/mask";
import { CampaignFiltersSchema } from "@/schemas/campaigns";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const PreviewAudienceInputSchema = z.object({
	filtros: CampaignFiltersSchema.optional().nullable(),
	segmentacoes: z
		.array(z.string({ invalid_type_error: "Tipo não válido para a segmentação." }))
		.optional()
		.default([]),
});
export type TPreviewAudienceInput = z.infer<typeof PreviewAudienceInputSchema>;

async function previewAudience({ input, organizacaoId }: { input: TPreviewAudienceInput; organizacaoId: string }) {
	const preview = await previewCampaignAudience({
		organizationId: organizacaoId,
		segmentations: input.segmentacoes ?? [],
		filters: input.filtros ?? undefined,
	});
	return {
		data: { totalClients: preview.totalClients, bySegment: preview.bySegment, clientsWithoutRfm: preview.clientsWithoutRfm },
		message: "Prévia do público calculada.",
	};
}
export type TPreviewAudienceOutput = Awaited<ReturnType<typeof previewAudience>>;

async function previewAudienceRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para prever públicos.");
	const organizacaoId = session.membership?.organizacao.id;
	if (!organizacaoId) throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização.");
	if (!canViewIntegrations(session.membership?.permissoes)) throw new createHttpError.Forbidden("Você não possui permissão para visualizar públicos.");

	const input = PreviewAudienceInputSchema.parse(await request.json());
	const result = await previewAudience({ input, organizacaoId });
	return NextResponse.json(result);
}

export const POST = appApiHandler({ POST: previewAudienceRoute });
