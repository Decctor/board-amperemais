import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { canManageIntegrations, canViewIntegrations } from "@/lib/integrations/mask";
import { CreateAudienceInputSchema, UpdateAudienceInputSchema } from "@/schemas/audiences";
import { db } from "@/services/drizzle";
import { audienceDestinations, audiences } from "@/services/drizzle/schema";
import { and, desc, eq, inArray } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

// ---------------------------------------------------------------------------
// GET — lista os públicos (com seus destinos) ou um por id
// ---------------------------------------------------------------------------

const GetAudiencesInputSchema = z.object({
	id: z
		.string({ invalid_type_error: "Tipo inválido para o ID do público." })
		.optional()
		.nullable()
		.transform((v) => v || null),
});
export type TGetAudiencesInput = z.infer<typeof GetAudiencesInputSchema>;

async function attachDestinations<T extends { id: string }>(rows: T[]) {
	if (rows.length === 0) return rows.map((row) => ({ ...row, destinos: [] as (typeof audienceDestinations.$inferSelect)[] }));
	const destinos = await db
		.select()
		.from(audienceDestinations)
		.where(
			inArray(
				audienceDestinations.audienciaId,
				rows.map((row) => row.id),
			),
		);
	const byAudience = new Map<string, (typeof audienceDestinations.$inferSelect)[]>();
	for (const destino of destinos) {
		const list = byAudience.get(destino.audienciaId) ?? [];
		list.push(destino);
		byAudience.set(destino.audienciaId, list);
	}
	return rows.map((row) => ({ ...row, destinos: byAudience.get(row.id) ?? [] }));
}

async function getAudiences({ input, organizacaoId }: { input: TGetAudiencesInput; organizacaoId: string }) {
	if (input.id) {
		const found = await db.query.audiences.findFirst({
			where: (fields, { and, eq }) => and(eq(fields.id, input.id as string), eq(fields.organizacaoId, organizacaoId)),
		});
		const byId = found ? (await attachDestinations([found]))[0] : null;
		return { data: { byId, default: null as Awaited<ReturnType<typeof attachDestinations>> | null }, message: "Público buscado com sucesso." };
	}
	const rows = await db.select().from(audiences).where(eq(audiences.organizacaoId, organizacaoId)).orderBy(desc(audiences.dataInsercao));
	const withDestinations = await attachDestinations(rows);
	return { data: { byId: null as (typeof withDestinations)[number] | null, default: withDestinations }, message: "Públicos buscados com sucesso." };
}
export type TGetAudiencesOutput = Awaited<ReturnType<typeof getAudiences>>;
export type TGetAudiencesOutputById = Exclude<TGetAudiencesOutput["data"]["byId"], null>;
export type TGetAudiencesOutputDefault = Exclude<TGetAudiencesOutput["data"]["default"], null>;

async function getAudiencesRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para acessar os públicos.");
	const organizacaoId = session.membership?.organizacao.id;
	if (!organizacaoId) throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização.");
	if (!canViewIntegrations(session.membership?.permissoes)) throw new createHttpError.Forbidden("Você não possui permissão para visualizar públicos.");

	const input = GetAudiencesInputSchema.parse({ id: request.nextUrl.searchParams.get("id") });
	const result = await getAudiences({ input, organizacaoId });
	return NextResponse.json(result);
}

// ---------------------------------------------------------------------------
// POST — cria um público
// ---------------------------------------------------------------------------

async function createAudience({ input, session }: { input: z.infer<typeof CreateAudienceInputSchema>; session: TAuthUserSession }) {
	const organizacaoId = session.membership?.organizacao.id as string;
	const [created] = await db
		.insert(audiences)
		.values({
			organizacaoId,
			nome: input.nome,
			descricao: input.descricao ?? null,
			filtros: input.filtros ?? null,
			segmentacoes: input.segmentacoes ?? [],
			autorId: session.user.id,
		})
		.returning();
	return { data: created, message: "Público criado com sucesso." };
}
export type TCreateAudienceOutput = Awaited<ReturnType<typeof createAudience>>;

async function createAudienceRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para criar públicos.");
	if (!session.membership?.organizacao.id) throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização.");
	if (!canManageIntegrations(session.membership?.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para gerenciar públicos.");

	const input = CreateAudienceInputSchema.parse(await request.json());
	const result = await createAudience({ input, session });
	return NextResponse.json(result);
}

// ---------------------------------------------------------------------------
// PUT — atualiza um público
// ---------------------------------------------------------------------------

async function updateAudience({ input, session }: { input: z.infer<typeof UpdateAudienceInputSchema>; session: TAuthUserSession }) {
	const organizacaoId = session.membership?.organizacao.id as string;
	const existing = await db.query.audiences.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.id, input.id), eq(fields.organizacaoId, organizacaoId)),
	});
	if (!existing) throw new createHttpError.NotFound("Público não encontrado.");

	const [updated] = await db
		.update(audiences)
		.set({ nome: input.nome, descricao: input.descricao ?? null, filtros: input.filtros ?? null, segmentacoes: input.segmentacoes ?? [] })
		.where(eq(audiences.id, input.id))
		.returning();
	return { data: updated, message: "Público atualizado com sucesso." };
}
export type TUpdateAudienceOutput = Awaited<ReturnType<typeof updateAudience>>;

async function updateAudienceRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para atualizar públicos.");
	if (!session.membership?.organizacao.id) throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização.");
	if (!canManageIntegrations(session.membership?.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para gerenciar públicos.");

	const input = UpdateAudienceInputSchema.parse(await request.json());
	const result = await updateAudience({ input, session });
	return NextResponse.json(result);
}

// ---------------------------------------------------------------------------
// DELETE — remove um público (destinos e membros caem em cascata)
// ---------------------------------------------------------------------------

const DeleteAudienceInputSchema = z.object({
	id: z.string({ required_error: "ID do público não informado.", invalid_type_error: "Tipo inválido para o ID do público." }),
});

async function deleteAudience({ id, organizacaoId }: { id: string; organizacaoId: string }) {
	const existing = await db.query.audiences.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.id, id), eq(fields.organizacaoId, organizacaoId)),
	});
	if (!existing) throw new createHttpError.NotFound("Público não encontrado.");
	await db.delete(audiences).where(and(eq(audiences.id, id), eq(audiences.organizacaoId, organizacaoId)));
	return { data: { id }, message: "Público removido com sucesso." };
}
export type TDeleteAudienceOutput = Awaited<ReturnType<typeof deleteAudience>>;

async function deleteAudienceRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para remover públicos.");
	const organizacaoId = session.membership?.organizacao.id;
	if (!organizacaoId) throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização.");
	if (!canManageIntegrations(session.membership?.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para gerenciar públicos.");

	const input = DeleteAudienceInputSchema.parse({ id: request.nextUrl.searchParams.get("id") });
	const result = await deleteAudience({ id: input.id, organizacaoId });
	return NextResponse.json(result);
}

export const GET = appApiHandler({ GET: getAudiencesRoute });
export const POST = appApiHandler({ POST: createAudienceRoute });
export const PUT = appApiHandler({ PUT: updateAudienceRoute });
export const DELETE = appApiHandler({ DELETE: deleteAudienceRoute });
