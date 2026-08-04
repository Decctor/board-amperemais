import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { assertDataSourceIdentityAvailable, connectDataSourceIntegration, isDataSourceIntegrationType } from "@/lib/integrations/data-sources";
import { canManageIntegrations, canViewIntegrations, maskIntegrationConfig } from "@/lib/integrations/mask";
import { IntegrationTipoEnum } from "@/schemas/enums";
import { DataSourceIntegrationConfigSchema, MetaAdsCapiConfigPatchSchema } from "@/schemas/integrations";
import { db } from "@/services/drizzle";
import { integrations } from "@/services/drizzle/schema";
import type { TIntegrationEntity } from "@/services/drizzle/schema";
import { and, desc, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

/**
 * Integrations — CRUD base (criar credencial manual/listar/atualizar/desconectar).
 *
 * Conexões OAuth (Meta Ads, Bling, iFood, Nuvemshop) são CRIADAS pelos fluxos específicos em
 * `/api/integrations/<provedor>/auth/*`, não por esta rota. O POST cobre os tipos de credencial
 * manual (ONLINE-SOFTWARE, CARDAPIO-WEB). Segredos nunca voltam crus: tudo passa por
 * `maskIntegrationConfig`. N conexões ativas do mesmo tipo por organização são permitidas; a
 * mesma conta externa não duplica (D5).
 */

// ---------------------------------------------------------------------------
// GET — lista (opcionalmente por tipo) ou uma integração por id, com config mascarada
// ---------------------------------------------------------------------------

const GetIntegrationsInputSchema = z.object({
	id: z
		.string({ invalid_type_error: "Tipo inválido para o ID da integração." })
		.optional()
		.nullable()
		.transform((v) => v || null),
	tipo: IntegrationTipoEnum.optional().nullable(),
});
export type TGetIntegrationsInput = z.infer<typeof GetIntegrationsInputSchema>;

function toMaskedIntegration(integration: TIntegrationEntity) {
	return { ...integration, configuracao: maskIntegrationConfig(integration.configuracao) };
}
export type TIntegrationMasked = ReturnType<typeof toMaskedIntegration>;

async function getIntegrations({ input, organizacaoId }: { input: TGetIntegrationsInput; organizacaoId: string }) {
	if (input.id) {
		const found = await db.query.integrations.findFirst({
			where: (fields, { and, eq }) => and(eq(fields.id, input.id as string), eq(fields.organizacaoId, organizacaoId)),
		});
		const byId = found ? toMaskedIntegration(found) : null;
		return { data: { byId, default: null as TIntegrationMasked[] | null }, message: "Integração buscada com sucesso." };
	}

	const conditions = [eq(integrations.organizacaoId, organizacaoId)];
	if (input.tipo) conditions.push(eq(integrations.tipo, input.tipo));
	const rows = await db
		.select()
		.from(integrations)
		.where(and(...conditions))
		.orderBy(desc(integrations.dataInsercao));

	return { data: { byId: null as TIntegrationMasked | null, default: rows.map(toMaskedIntegration) }, message: "Integrações buscadas com sucesso." };
}
export type TGetIntegrationsOutput = Awaited<ReturnType<typeof getIntegrations>>;
export type TGetIntegrationsOutputById = Exclude<TGetIntegrationsOutput["data"]["byId"], null>;
export type TGetIntegrationsOutputDefault = Exclude<TGetIntegrationsOutput["data"]["default"], null>;

async function getIntegrationsRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para acessar as integrações.");
	const organizacaoId = session.membership?.organizacao.id;
	if (!organizacaoId) throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização para acessar as integrações.");
	if (!canViewIntegrations(session.membership?.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para visualizar integrações.");

	const searchParams = request.nextUrl.searchParams;
	const input = GetIntegrationsInputSchema.parse({
		id: searchParams.get("id"),
		tipo: searchParams.get("tipo"),
	});
	const result = await getIntegrations({ input, organizacaoId });
	return NextResponse.json(result);
}

// ---------------------------------------------------------------------------
// POST — criar conexão de fonte de dados com credencial manual
// ---------------------------------------------------------------------------

const CreateIntegrationInputSchema = z.object({
	apelido: z.string({ invalid_type_error: "Tipo inválido para o apelido." }).optional().nullable(),
	configuracao: DataSourceIntegrationConfigSchema,
	// Reconexão explícita (D9): id da linha a reativar com credenciais novas.
	reconnectIntegrationId: z.string({ invalid_type_error: "Tipo inválido para o ID da conexão a reconectar." }).optional().nullable(),
});
export type TCreateIntegrationInput = z.infer<typeof CreateIntegrationInputSchema>;

async function createIntegration({ input, session }: { input: TCreateIntegrationInput; session: TAuthUserSession }) {
	const organizacaoId = session.membership?.organizacao.id as string;

	try {
		const { integration } = await connectDataSourceIntegration({
			executor: db,
			organizationId: organizacaoId,
			config: input.configuracao,
			apelido: input.apelido,
			autorId: session.user.id,
			reconnectIntegrationId: input.reconnectIntegrationId,
		});
		return { data: toMaskedIntegration(integration), message: "Integração conectada com sucesso." };
	} catch (error) {
		throw new createHttpError.BadRequest(error instanceof Error ? error.message : "Não foi possível conectar a integração.");
	}
}
export type TCreateIntegrationOutput = Awaited<ReturnType<typeof createIntegration>>;

async function createIntegrationRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para conectar integrações.");
	if (!session.membership?.organizacao.id) throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização.");
	if (!canManageIntegrations(session.membership?.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para gerenciar integrações.");

	const input = CreateIntegrationInputSchema.parse(await request.json());
	const result = await createIntegration({ input, session });
	return NextResponse.json(result);
}

// ---------------------------------------------------------------------------
// PATCH — atualizar toggle (ativo), apelido e settings de CAPI da conexão Meta Ads
// ---------------------------------------------------------------------------

const UpdateIntegrationInputSchema = z.object({
	id: z.string({ required_error: "ID da integração não informado.", invalid_type_error: "Tipo inválido para o ID da integração." }),
	ativo: z.boolean({ invalid_type_error: "Tipo inválido para o status ativo." }).optional(),
	apelido: z.string({ invalid_type_error: "Tipo inválido para o apelido." }).optional().nullable(),
	// Settings de CAPI (só aplicável a integrações META_ADS).
	capiConfig: MetaAdsCapiConfigPatchSchema.optional(),
});
export type TUpdateIntegrationInput = z.infer<typeof UpdateIntegrationInputSchema>;

async function updateIntegration({ input, session }: { input: TUpdateIntegrationInput; session: TAuthUserSession }) {
	const organizacaoId = session.membership?.organizacao.id as string;

	const existing = await db.query.integrations.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.id, input.id), eq(fields.organizacaoId, organizacaoId)),
	});
	if (!existing) throw new createHttpError.NotFound("Integração não encontrada.");

	const patch: Partial<TIntegrationEntity> = {};
	if (input.ativo !== undefined) {
		patch.ativo = input.ativo;
		// Fontes de dados carregam as invariantes do soft delete (D9) e do guard de identidade
		// (D5) também pelo toggle — não só pelo DELETE/reconexão.
		if (isDataSourceIntegrationType(existing.tipo)) {
			if (input.ativo && !existing.ativo) {
				if (!existing.configuracao || existing.configuracao.tipo !== existing.tipo) {
					throw new createHttpError.BadRequest("Configuração inválida — reconecte a integração em vez de reativá-la.");
				}
				try {
					await assertDataSourceIdentityAvailable({
						executor: db,
						organizationId: organizacaoId,
						config: existing.configuracao,
						ignoreIntegrationId: existing.id,
					});
				} catch (error) {
					throw new createHttpError.BadRequest(error instanceof Error ? error.message : "Conexão duplicada.");
				}
				patch.dataDesativacao = null;
			}
			if (!input.ativo && existing.ativo) {
				patch.dataDesativacao = new Date();
			}
		}
	}
	if (input.apelido !== undefined) patch.apelido = input.apelido;

	if (input.capiConfig) {
		if (existing.configuracao?.tipo !== "META_ADS") {
			throw new createHttpError.BadRequest("Configuração de CAPI só é aplicável a integrações do Meta Ads.");
		}
		const current = existing.configuracao;
		patch.configuracao = {
			...current,
			// null limpa o campo; undefined mantém o valor atual.
			pixelId: input.capiConfig.pixelId === undefined ? current.pixelId : (input.capiConfig.pixelId ?? undefined),
			capiDatasetId: input.capiConfig.capiDatasetId === undefined ? current.capiDatasetId : (input.capiConfig.capiDatasetId ?? undefined),
			capiTestEventCode:
				input.capiConfig.capiTestEventCode === undefined ? current.capiTestEventCode : (input.capiConfig.capiTestEventCode ?? undefined),
			eventosCapi: input.capiConfig.eventosCapi === undefined ? current.eventosCapi : (input.capiConfig.eventosCapi ?? undefined),
		};
	}

	if (Object.keys(patch).length === 0) throw new createHttpError.BadRequest("Nenhuma alteração informada.");

	const [updated] = await db.update(integrations).set(patch).where(eq(integrations.id, input.id)).returning();
	return { data: toMaskedIntegration(updated), message: "Integração atualizada com sucesso." };
}
export type TUpdateIntegrationOutput = Awaited<ReturnType<typeof updateIntegration>>;

async function updateIntegrationRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para atualizar integrações.");
	if (!session.membership?.organizacao.id) throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização.");
	if (!canManageIntegrations(session.membership?.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para gerenciar integrações.");

	const input = UpdateIntegrationInputSchema.parse(await request.json());
	const result = await updateIntegration({ input, session });
	return NextResponse.json(result);
}

// ---------------------------------------------------------------------------
// DELETE — desconectar/remover uma integração
// ---------------------------------------------------------------------------

const DeleteIntegrationInputSchema = z.object({
	id: z.string({ required_error: "ID da integração não informado.", invalid_type_error: "Tipo inválido para o ID da integração." }),
});
export type TDeleteIntegrationInput = z.infer<typeof DeleteIntegrationInputSchema>;

async function deleteIntegration({ input, session }: { input: TDeleteIntegrationInput; session: TAuthUserSession }) {
	const organizacaoId = session.membership?.organizacao.id as string;
	const existing = await db.query.integrations.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.id, input.id), eq(fields.organizacaoId, organizacaoId)),
	});
	if (!existing) throw new createHttpError.NotFound("Integração não encontrada.");

	// Fontes de dados usam soft delete (D9): a linha é a identidade histórica da conta externa e a
	// proveniência de `sales.integracaoId` (FK RESTRICT) — nunca some pelo fluxo normal.
	if (isDataSourceIntegrationType(existing.tipo)) {
		await db.update(integrations).set({ ativo: false, dataDesativacao: new Date() }).where(eq(integrations.id, input.id));
		return { data: { id: input.id }, message: "Integração desconectada com sucesso." };
	}

	await db.delete(integrations).where(eq(integrations.id, input.id));
	return { data: { id: input.id }, message: "Integração desconectada com sucesso." };
}
export type TDeleteIntegrationOutput = Awaited<ReturnType<typeof deleteIntegration>>;

async function deleteIntegrationRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para desconectar integrações.");
	if (!session.membership?.organizacao.id) throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização.");
	if (!canManageIntegrations(session.membership?.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para gerenciar integrações.");

	const input = DeleteIntegrationInputSchema.parse({ id: request.nextUrl.searchParams.get("id") });
	const result = await deleteIntegration({ input, session });
	return NextResponse.json(result);
}

export const GET = appApiHandler({ GET: getIntegrationsRoute });
export const POST = appApiHandler({ POST: createIntegrationRoute });
export const PATCH = appApiHandler({ PATCH: updateIntegrationRoute });
export const DELETE = appApiHandler({ DELETE: deleteIntegrationRoute });
