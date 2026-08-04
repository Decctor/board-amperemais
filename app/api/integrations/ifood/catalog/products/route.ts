import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { createIfoodProduct, deleteIfoodProduct, listIfoodProducts, updateIfoodProduct } from "@/lib/integrations/ifood/catalog";
import { resolveIfoodManagementContext } from "@/lib/integrations/ifood/context";
import { canManageIntegrations, canViewIntegrations } from "@/lib/integrations/mask";
import { IFOOD_CATALOG_DESCRIPTION_MAX_LENGTH, IFOOD_CATALOG_TITLE_MAX_LENGTH } from "@/schemas/enums";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const GetIfoodProductsInputSchema = z.object({
	merchantId: z
		.string({
			required_error: "ID da loja do iFood não informado.",
			invalid_type_error: "Tipo inválido para o ID da loja do iFood.",
		})
		.min(1, "ID da loja do iFood não informado."),
	page: z
		.string({ invalid_type_error: "Tipo inválido para a página." })
		.optional()
		.nullable()
		.transform((v) => (v ? Number(v) : 1)),
	limit: z
		.string({ invalid_type_error: "Tipo inválido para o limite." })
		.optional()
		.nullable()
		.transform((v) => (v ? Math.min(Number(v), 100) : 50)),
});
export type TGetIfoodProductsInput = z.infer<typeof GetIfoodProductsInputSchema>;

async function getIfoodProducts({ input, organizacaoId }: { input: TGetIfoodProductsInput; organizacaoId: string }) {
	const context = await resolveIfoodManagementContext({ organizacaoId, merchantId: input.merchantId });
	const pagina = await listIfoodProducts(context.client, input.merchantId, { page: input.page, limit: input.limit });
	return { data: pagina, message: "Produtos do catálogo buscados com sucesso." };
}
export type TGetIfoodProductsOutput = Awaited<ReturnType<typeof getIfoodProducts>>;

async function getIfoodProductsRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para acessar a integração do iFood.");
	const organizacaoId = session.membership?.organizacao.id;
	if (!organizacaoId) throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização para acessar a integração do iFood.");
	if (!canViewIntegrations(session.membership?.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para visualizar integrações.");

	const searchParams = request.nextUrl.searchParams;
	const input = GetIfoodProductsInputSchema.parse({
		merchantId: searchParams.get("merchantId"),
		page: searchParams.get("page"),
		limit: searchParams.get("limit"),
	});
	const result = await getIfoodProducts({ input, organizacaoId });
	return NextResponse.json(result);
}

// ---------------------------------------------------------------------------
// POST — cria um produto base
// ---------------------------------------------------------------------------

const IfoodProductPayloadSchema = z.object({
	nome: z
		.string({
			required_error: "Nome do produto não informado.",
			invalid_type_error: "Tipo inválido para o nome do produto.",
		})
		.trim()
		.min(1, "Nome do produto não informado.")
		.max(IFOOD_CATALOG_TITLE_MAX_LENGTH, `O nome do produto não pode passar de ${IFOOD_CATALOG_TITLE_MAX_LENGTH} caracteres.`),
	descricao: z
		.string({ invalid_type_error: "Tipo inválido para a descrição do produto." })
		.max(IFOOD_CATALOG_DESCRIPTION_MAX_LENGTH, `A descrição do produto não pode passar de ${IFOOD_CATALOG_DESCRIPTION_MAX_LENGTH} caracteres.`)
		.optional()
		.nullable(),
	codigoExterno: z.string({ invalid_type_error: "Tipo inválido para o código externo do produto." }).optional().nullable(),
	imagemPath: z.string({ invalid_type_error: "Tipo inválido para a imagem do produto." }).optional().nullable(),
});

const CreateIfoodProductInputSchema = z.object({
	merchantId: z
		.string({
			required_error: "ID da loja do iFood não informado.",
			invalid_type_error: "Tipo inválido para o ID da loja do iFood.",
		})
		.min(1, "ID da loja do iFood não informado."),
	produto: IfoodProductPayloadSchema,
});
export type TCreateIfoodProductInput = z.infer<typeof CreateIfoodProductInputSchema>;

async function createIfoodProductService({ input, session }: { input: TCreateIfoodProductInput; session: TAuthUserSession }) {
	const organizacaoId = session.membership?.organizacao.id as string;
	const context = await resolveIfoodManagementContext({ organizacaoId, merchantId: input.merchantId });
	const produto = await createIfoodProduct(context.client, input.merchantId, input.produto);
	return { data: produto, message: "Produto criado com sucesso no iFood." };
}
export type TCreateIfoodProductOutput = Awaited<ReturnType<typeof createIfoodProductService>>;

async function createIfoodProductRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para gerenciar a integração do iFood.");
	if (!session.membership?.organizacao.id)
		throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização para gerenciar a integração do iFood.");
	if (!canManageIntegrations(session.membership?.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para gerenciar integrações.");

	const input = CreateIfoodProductInputSchema.parse(await request.json());
	const result = await createIfoodProductService({ input, session });
	return NextResponse.json(result);
}

// ---------------------------------------------------------------------------
// PUT — atualiza um produto base
// ---------------------------------------------------------------------------

const UpdateIfoodProductInputSchema = CreateIfoodProductInputSchema.extend({
	productId: z
		.string({
			required_error: "ID do produto não informado.",
			invalid_type_error: "Tipo inválido para o ID do produto.",
		})
		.min(1, "ID do produto não informado."),
});
export type TUpdateIfoodProductInput = z.infer<typeof UpdateIfoodProductInputSchema>;

async function updateIfoodProductService({ input, session }: { input: TUpdateIfoodProductInput; session: TAuthUserSession }) {
	const organizacaoId = session.membership?.organizacao.id as string;
	const context = await resolveIfoodManagementContext({ organizacaoId, merchantId: input.merchantId });
	const produto = await updateIfoodProduct(context.client, input.merchantId, input.productId, input.produto);
	return { data: produto, message: "Produto atualizado com sucesso no iFood." };
}
export type TUpdateIfoodProductOutput = Awaited<ReturnType<typeof updateIfoodProductService>>;

async function updateIfoodProductRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para gerenciar a integração do iFood.");
	if (!session.membership?.organizacao.id)
		throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização para gerenciar a integração do iFood.");
	if (!canManageIntegrations(session.membership?.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para gerenciar integrações.");

	const input = UpdateIfoodProductInputSchema.parse(await request.json());
	const result = await updateIfoodProductService({ input, session });
	return NextResponse.json(result);
}

// ---------------------------------------------------------------------------
// DELETE — remove um produto base
// ---------------------------------------------------------------------------

const DeleteIfoodProductInputSchema = z.object({
	merchantId: z
		.string({
			required_error: "ID da loja do iFood não informado.",
			invalid_type_error: "Tipo inválido para o ID da loja do iFood.",
		})
		.min(1, "ID da loja do iFood não informado."),
	productId: z
		.string({
			required_error: "ID do produto não informado.",
			invalid_type_error: "Tipo inválido para o ID do produto.",
		})
		.min(1, "ID do produto não informado."),
});
export type TDeleteIfoodProductInput = z.infer<typeof DeleteIfoodProductInputSchema>;

async function deleteIfoodProductService({ input, session }: { input: TDeleteIfoodProductInput; session: TAuthUserSession }) {
	const organizacaoId = session.membership?.organizacao.id as string;
	const context = await resolveIfoodManagementContext({ organizacaoId, merchantId: input.merchantId });
	await deleteIfoodProduct(context.client, input.merchantId, input.productId);
	return { data: { id: input.productId }, message: "Produto removido com sucesso do iFood." };
}
export type TDeleteIfoodProductOutput = Awaited<ReturnType<typeof deleteIfoodProductService>>;

async function deleteIfoodProductRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para gerenciar a integração do iFood.");
	if (!session.membership?.organizacao.id)
		throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização para gerenciar a integração do iFood.");
	if (!canManageIntegrations(session.membership?.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para gerenciar integrações.");

	const searchParams = request.nextUrl.searchParams;
	const input = DeleteIfoodProductInputSchema.parse({
		merchantId: searchParams.get("merchantId"),
		productId: searchParams.get("productId"),
	});
	const result = await deleteIfoodProductService({ input, session });
	return NextResponse.json(result);
}

export const GET = appApiHandler({ GET: getIfoodProductsRoute });
export const POST = appApiHandler({ POST: createIfoodProductRoute });
export const PUT = appApiHandler({ PUT: updateIfoodProductRoute });
export const DELETE = appApiHandler({ DELETE: deleteIfoodProductRoute });

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
