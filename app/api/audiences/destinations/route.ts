import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { canManageIntegrations } from "@/lib/integrations/mask";
import { syncAudienceDestination } from "@/lib/integrations/meta/audiences/sync";
import { db } from "@/services/drizzle";
import { audienceDestinations } from "@/services/drizzle/schema";
import { eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

// ---------------------------------------------------------------------------
// POST — conecta um público a uma integração (cria o destino e sincroniza a Custom Audience)
// ---------------------------------------------------------------------------

const ConnectDestinationInputSchema = z.object({
	audienciaId: z.string({ required_error: "ID do público não informado.", invalid_type_error: "Tipo inválido para o ID do público." }),
	integracaoId: z.string({ required_error: "ID da integração não informado.", invalid_type_error: "Tipo inválido para o ID da integração." }),
});
export type TConnectDestinationInput = z.infer<typeof ConnectDestinationInputSchema>;

async function connectDestination({ input, session }: { input: TConnectDestinationInput; session: TAuthUserSession }) {
	const organizacaoId = session.membership?.organizacao.id as string;

	const audiencia = await db.query.audiences.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.id, input.audienciaId), eq(fields.organizacaoId, organizacaoId)),
	});
	if (!audiencia) throw new createHttpError.NotFound("Público não encontrado.");

	const integracao = await db.query.integrations.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.id, input.integracaoId), eq(fields.organizacaoId, organizacaoId), eq(fields.tipo, "META_ADS")),
	});
	if (!integracao) throw new createHttpError.NotFound("Integração do Meta Ads não encontrada.");

	const existing = await db.query.audienceDestinations.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.audienciaId, input.audienciaId), eq(fields.integracaoId, input.integracaoId)),
	});
	const destino =
		existing ??
		(
			await db.insert(audienceDestinations).values({ audienciaId: input.audienciaId, integracaoId: input.integracaoId, status: "PENDENTE" }).returning()
		)[0];

	// Sincronização inicial (cria a Custom Audience e envia os membros). Não derruba a conexão se falhar.
	try {
		await syncAudienceDestination({ destinationId: destino.id, organizacaoId });
	} catch (error) {
		console.error("[ERROR] [AUDIENCES] Falha na sincronização inicial:", error instanceof Error ? error.message : error);
	}

	const refreshed = await db.query.audienceDestinations.findFirst({ where: (fields, { eq }) => eq(fields.id, destino.id) });
	return { data: refreshed ?? destino, message: "Público conectado ao Meta Ads." };
}
export type TConnectDestinationOutput = Awaited<ReturnType<typeof connectDestination>>;

async function connectDestinationRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para conectar públicos.");
	if (!session.membership?.organizacao.id) throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização.");
	if (!canManageIntegrations(session.membership?.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para gerenciar públicos.");

	const input = ConnectDestinationInputSchema.parse(await request.json());
	const result = await connectDestination({ input, session });
	return NextResponse.json(result);
}

// ---------------------------------------------------------------------------
// DELETE — desconecta um destino (remove localmente; membros caem em cascata)
// ---------------------------------------------------------------------------

const DisconnectDestinationInputSchema = z.object({
	id: z.string({ required_error: "ID do destino não informado.", invalid_type_error: "Tipo inválido para o ID do destino." }),
});

async function disconnectDestination({ id, organizacaoId }: { id: string; organizacaoId: string }) {
	const destino = await db.query.audienceDestinations.findFirst({ where: (fields, { eq }) => eq(fields.id, id) });
	if (!destino) throw new createHttpError.NotFound("Destino não encontrado.");
	const audiencia = await db.query.audiences.findFirst({ where: (fields, { eq }) => eq(fields.id, destino.audienciaId) });
	if (!audiencia || audiencia.organizacaoId !== organizacaoId) throw new createHttpError.NotFound("Destino não encontrado.");

	await db.delete(audienceDestinations).where(eq(audienceDestinations.id, id));
	return { data: { id }, message: "Destino desconectado com sucesso." };
}
export type TDisconnectDestinationOutput = Awaited<ReturnType<typeof disconnectDestination>>;

async function disconnectDestinationRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para desconectar públicos.");
	const organizacaoId = session.membership?.organizacao.id;
	if (!organizacaoId) throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização.");
	if (!canManageIntegrations(session.membership?.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para gerenciar públicos.");

	const input = DisconnectDestinationInputSchema.parse({ id: request.nextUrl.searchParams.get("id") });
	const result = await disconnectDestination({ id: input.id, organizacaoId });
	return NextResponse.json(result);
}

export const POST = appApiHandler({ POST: connectDestinationRoute });
export const DELETE = appApiHandler({ DELETE: disconnectDestinationRoute });
