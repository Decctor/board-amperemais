import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { canManageIntegrations } from "@/lib/integrations/mask";
import { syncAudienceDestination } from "@/lib/integrations/meta/audiences/sync";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const SyncDestinationInputSchema = z.object({
	id: z.string({ required_error: "ID do destino não informado.", invalid_type_error: "Tipo inválido para o ID do destino." }),
});
export type TSyncDestinationInput = z.infer<typeof SyncDestinationInputSchema>;

async function syncDestinationRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para sincronizar públicos.");
	const organizacaoId = session.membership?.organizacao.id;
	if (!organizacaoId) throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização.");
	if (!canManageIntegrations(session.membership?.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para gerenciar públicos.");

	const input = SyncDestinationInputSchema.parse(await request.json());
	const result = await syncAudienceDestination({ destinationId: input.id, organizacaoId });
	return NextResponse.json({ data: result, message: `Público sincronizado: +${result.added} / -${result.removed} (total ${result.total}).` });
}
export type TSyncDestinationOutput = { data: Awaited<ReturnType<typeof syncAudienceDestination>>; message: string };

export const POST = appApiHandler({ POST: syncDestinationRoute });
