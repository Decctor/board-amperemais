import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { createIfoodCategory, deleteIfoodCategory, listIfoodCategories, updateIfoodCategory } from "@/lib/integrations/ifood/catalog";
import { resolveIfoodManagementContext } from "@/lib/integrations/ifood/context";
import { canManageIntegrations, canViewIntegrations } from "@/lib/integrations/mask";
import { IFOOD_CATALOG_TITLE_MAX_LENGTH, IfoodCatalogStatusEnum } from "@/schemas/enums";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const GetIfoodCategoriesInputSchema = z.object({
	merchantId: z
		.string({
			required_error: "ID da loja do iFood não informado.",
			invalid_type_error: "Tipo inválido para o ID da loja do iFood.",
		})
		.min(1, "ID da loja do iFood não informado."),
	catalogId: z
		.string({
			required_error: "ID do catálogo não informado.",
			invalid_type_error: "Tipo inválido para o ID do catálogo.",
		})
		.min(1, "ID do catálogo não informado."),
});
export type TGetIfoodCategoriesInput = z.infer<typeof GetIfoodCategoriesInputSchema>;

async function getIfoodCategories({ input, organizacaoId }: { input: TGetIfoodCategoriesInput; organizacaoId: string }) {
	const context = await resolveIfoodManagementContext({ organizacaoId, merchantId: input.merchantId });
	const categorias = await listIfoodCategories(context.client, input.merchantId, { catalogId: input.catalogId });
	return { data: { categorias }, message: "Categorias do catálogo buscadas com sucesso." };
}
export type TGetIfoodCategoriesOutput = Awaited<ReturnType<typeof getIfoodCategories>>;

async function getIfoodCategoriesRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para acessar a integração do iFood.");
	const organizacaoId = session.membership?.organizacao.id;
	if (!organizacaoId) throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização para acessar a integração do iFood.");
	if (!canViewIntegrations(session.membership?.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para visualizar integrações.");

	const searchParams = request.nextUrl.searchParams;
	const input = GetIfoodCategoriesInputSchema.parse({
		merchantId: searchParams.get("merchantId"),
		catalogId: searchParams.get("catalogId"),
	});
	const result = await getIfoodCategories({ input, organizacaoId });
	return NextResponse.json(result);
}

// ---------------------------------------------------------------------------
// POST — cria uma categoria no catálogo
// ---------------------------------------------------------------------------

const IfoodCategoryPayloadSchema = z.object({
	nome: z
		.string({
			required_error: "Nome da categoria não informado.",
			invalid_type_error: "Tipo inválido para o nome da categoria.",
		})
		.trim()
		.min(1, "Nome da categoria não informado.")
		.max(IFOOD_CATALOG_TITLE_MAX_LENGTH, `O nome da categoria não pode passar de ${IFOOD_CATALOG_TITLE_MAX_LENGTH} caracteres.`),
	codigoExterno: z.string({ invalid_type_error: "Tipo inválido para o código externo da categoria." }).optional().nullable(),
	status: IfoodCatalogStatusEnum.optional().nullable(),
	template: z.string({ invalid_type_error: "Tipo inválido para o template da categoria." }).optional().nullable(),
});

const CreateIfoodCategoryInputSchema = z.object({
	merchantId: z
		.string({
			required_error: "ID da loja do iFood não informado.",
			invalid_type_error: "Tipo inválido para o ID da loja do iFood.",
		})
		.min(1, "ID da loja do iFood não informado."),
	catalogId: z
		.string({
			required_error: "ID do catálogo não informado.",
			invalid_type_error: "Tipo inválido para o ID do catálogo.",
		})
		.min(1, "ID do catálogo não informado."),
	categoria: IfoodCategoryPayloadSchema,
});
export type TCreateIfoodCategoryInput = z.infer<typeof CreateIfoodCategoryInputSchema>;

async function createIfoodCategoryService({ input, session }: { input: TCreateIfoodCategoryInput; session: TAuthUserSession }) {
	const organizacaoId = session.membership?.organizacao.id as string;
	const context = await resolveIfoodManagementContext({ organizacaoId, merchantId: input.merchantId });
	const categoria = await createIfoodCategory(context.client, input.merchantId, { catalogId: input.catalogId, categoria: input.categoria });
	return { data: categoria, message: "Categoria criada com sucesso no iFood." };
}
export type TCreateIfoodCategoryOutput = Awaited<ReturnType<typeof createIfoodCategoryService>>;

async function createIfoodCategoryRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para gerenciar a integração do iFood.");
	if (!session.membership?.organizacao.id)
		throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização para gerenciar a integração do iFood.");
	if (!canManageIntegrations(session.membership?.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para gerenciar integrações.");

	const input = CreateIfoodCategoryInputSchema.parse(await request.json());
	const result = await createIfoodCategoryService({ input, session });
	return NextResponse.json(result);
}

// ---------------------------------------------------------------------------
// PATCH — edita uma categoria
// ---------------------------------------------------------------------------

const UpdateIfoodCategoryInputSchema = CreateIfoodCategoryInputSchema.extend({
	categoryId: z
		.string({
			required_error: "ID da categoria não informado.",
			invalid_type_error: "Tipo inválido para o ID da categoria.",
		})
		.min(1, "ID da categoria não informado."),
});
export type TUpdateIfoodCategoryInput = z.infer<typeof UpdateIfoodCategoryInputSchema>;

async function updateIfoodCategoryService({ input, session }: { input: TUpdateIfoodCategoryInput; session: TAuthUserSession }) {
	const organizacaoId = session.membership?.organizacao.id as string;
	const context = await resolveIfoodManagementContext({ organizacaoId, merchantId: input.merchantId });
	const categoria = await updateIfoodCategory(context.client, input.merchantId, {
		catalogId: input.catalogId,
		categoryId: input.categoryId,
		categoria: input.categoria,
	});
	return { data: categoria, message: "Categoria atualizada com sucesso no iFood." };
}
export type TUpdateIfoodCategoryOutput = Awaited<ReturnType<typeof updateIfoodCategoryService>>;

async function updateIfoodCategoryRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para gerenciar a integração do iFood.");
	if (!session.membership?.organizacao.id)
		throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização para gerenciar a integração do iFood.");
	if (!canManageIntegrations(session.membership?.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para gerenciar integrações.");

	const input = UpdateIfoodCategoryInputSchema.parse(await request.json());
	const result = await updateIfoodCategoryService({ input, session });
	return NextResponse.json(result);
}

// ---------------------------------------------------------------------------
// DELETE — remove uma categoria
// ---------------------------------------------------------------------------

const DeleteIfoodCategoryInputSchema = z.object({
	merchantId: z
		.string({
			required_error: "ID da loja do iFood não informado.",
			invalid_type_error: "Tipo inválido para o ID da loja do iFood.",
		})
		.min(1, "ID da loja do iFood não informado."),
	categoryId: z
		.string({
			required_error: "ID da categoria não informado.",
			invalid_type_error: "Tipo inválido para o ID da categoria.",
		})
		.min(1, "ID da categoria não informado."),
});
export type TDeleteIfoodCategoryInput = z.infer<typeof DeleteIfoodCategoryInputSchema>;

async function deleteIfoodCategoryService({ input, session }: { input: TDeleteIfoodCategoryInput; session: TAuthUserSession }) {
	const organizacaoId = session.membership?.organizacao.id as string;
	const context = await resolveIfoodManagementContext({ organizacaoId, merchantId: input.merchantId });
	await deleteIfoodCategory(context.client, input.merchantId, input.categoryId);
	return { data: { id: input.categoryId }, message: "Categoria removida com sucesso do iFood." };
}
export type TDeleteIfoodCategoryOutput = Awaited<ReturnType<typeof deleteIfoodCategoryService>>;

async function deleteIfoodCategoryRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para gerenciar a integração do iFood.");
	if (!session.membership?.organizacao.id)
		throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização para gerenciar a integração do iFood.");
	if (!canManageIntegrations(session.membership?.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para gerenciar integrações.");

	const searchParams = request.nextUrl.searchParams;
	const input = DeleteIfoodCategoryInputSchema.parse({
		merchantId: searchParams.get("merchantId"),
		categoryId: searchParams.get("categoryId"),
	});
	const result = await deleteIfoodCategoryService({ input, session });
	return NextResponse.json(result);
}

export const GET = appApiHandler({ GET: getIfoodCategoriesRoute });
export const POST = appApiHandler({ POST: createIfoodCategoryRoute });
export const PATCH = appApiHandler({ PATCH: updateIfoodCategoryRoute });
export const DELETE = appApiHandler({ DELETE: deleteIfoodCategoryRoute });

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
