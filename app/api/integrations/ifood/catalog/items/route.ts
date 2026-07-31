import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { patchIfoodItem, upsertIfoodItem } from "@/lib/integrations/ifood/catalog-items";
import { resolveIfoodManagementContext } from "@/lib/integrations/ifood/context";
import { canManageIntegrations } from "@/lib/integrations/mask";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

// ---------------------------------------------------------------------------
// PUT — cria/atualiza um item (produto vendável dentro de uma categoria)
// ---------------------------------------------------------------------------

const UpsertIfoodItemInputSchema = z.object({
	merchantId: z
		.string({
			required_error: "ID da loja do iFood não informado.",
			invalid_type_error: "Tipo inválido para o ID da loja do iFood.",
		})
		.min(1, "ID da loja do iFood não informado."),
	item: z.object({
		itemId: z.string({ invalid_type_error: "Tipo inválido para o ID do item." }).optional().nullable(),
		produtoId: z.string({ invalid_type_error: "Tipo inválido para o ID do produto." }).optional().nullable(),
		categoriaId: z
			.string({
				required_error: "ID da categoria não informado.",
				invalid_type_error: "Tipo inválido para o ID da categoria.",
			})
			.min(1, "ID da categoria não informado."),
		status: z
			.string({ invalid_type_error: "Tipo inválido para o status do item." })
			.optional()
			.nullable()
			.transform((v) => v ?? "AVAILABLE"),
		preco: z
			.number({
				required_error: "Preço do item não informado.",
				invalid_type_error: "Tipo inválido para o preço do item.",
			})
			.min(0, "Preço do item não pode ser negativo."),
		precoOriginal: z.number({ invalid_type_error: "Tipo inválido para o preço original do item." }).optional().nullable(),
		codigoExterno: z.string({ invalid_type_error: "Tipo inválido para o código externo do item." }).optional().nullable(),
		produto: z
			.object({
				nome: z
					.string({
						required_error: "Nome do produto não informado.",
						invalid_type_error: "Tipo inválido para o nome do produto.",
					})
					.trim()
					.min(1, "Nome do produto não informado."),
				descricao: z.string({ invalid_type_error: "Tipo inválido para a descrição do produto." }).optional().nullable(),
				imagemPath: z.string({ invalid_type_error: "Tipo inválido para a imagem do produto." }).optional().nullable(),
			})
			.optional()
			.nullable(),
	}),
});
export type TUpsertIfoodItemInput = z.infer<typeof UpsertIfoodItemInputSchema>;

async function upsertIfoodItemService({ input, session }: { input: TUpsertIfoodItemInput; session: TAuthUserSession }) {
	const organizacaoId = session.membership?.organizacao.id as string;
	const context = await resolveIfoodManagementContext({ organizacaoId, merchantId: input.merchantId });
	const result = await upsertIfoodItem(context.client, input.merchantId, input.item);
	return { data: result, message: "Item salvo com sucesso no iFood." };
}
export type TUpsertIfoodItemOutput = Awaited<ReturnType<typeof upsertIfoodItemService>>;

async function upsertIfoodItemRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para gerenciar a integração do iFood.");
	if (!session.membership?.organizacao.id)
		throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização para gerenciar a integração do iFood.");
	if (!canManageIntegrations(session.membership?.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para gerenciar integrações.");

	const input = UpsertIfoodItemInputSchema.parse(await request.json());
	const result = await upsertIfoodItemService({ input, session });
	return NextResponse.json(result);
}

// ---------------------------------------------------------------------------
// PATCH — atualização parcial de um item (preço/status/código externo)
// ---------------------------------------------------------------------------

const PatchIfoodItemInputSchema = z.object({
	merchantId: z
		.string({
			required_error: "ID da loja do iFood não informado.",
			invalid_type_error: "Tipo inválido para o ID da loja do iFood.",
		})
		.min(1, "ID da loja do iFood não informado."),
	itemId: z
		.string({
			required_error: "ID do item não informado.",
			invalid_type_error: "Tipo inválido para o ID do item.",
		})
		.min(1, "ID do item não informado."),
	patch: z
		.object({
			preco: z.number({ invalid_type_error: "Tipo inválido para o preço do item." }).min(0, "Preço do item não pode ser negativo.").optional().nullable(),
			precoOriginal: z.number({ invalid_type_error: "Tipo inválido para o preço original do item." }).optional().nullable(),
			status: z.string({ invalid_type_error: "Tipo inválido para o status do item." }).optional().nullable(),
			codigoExterno: z.string({ invalid_type_error: "Tipo inválido para o código externo do item." }).optional().nullable(),
		})
		.refine((value) => value.preco != null || value.status != null || value.codigoExterno != null, {
			message: "Nenhuma alteração informada para o item.",
		}),
});
export type TPatchIfoodItemInput = z.infer<typeof PatchIfoodItemInputSchema>;

async function patchIfoodItemService({ input, session }: { input: TPatchIfoodItemInput; session: TAuthUserSession }) {
	const organizacaoId = session.membership?.organizacao.id as string;
	const context = await resolveIfoodManagementContext({ organizacaoId, merchantId: input.merchantId });
	await patchIfoodItem(context.client, input.merchantId, input.itemId, input.patch);
	return { data: { id: input.itemId }, message: "Item atualizado com sucesso no iFood." };
}
export type TPatchIfoodItemOutput = Awaited<ReturnType<typeof patchIfoodItemService>>;

async function patchIfoodItemRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para gerenciar a integração do iFood.");
	if (!session.membership?.organizacao.id)
		throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização para gerenciar a integração do iFood.");
	if (!canManageIntegrations(session.membership?.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para gerenciar integrações.");

	const input = PatchIfoodItemInputSchema.parse(await request.json());
	const result = await patchIfoodItemService({ input, session });
	return NextResponse.json(result);
}

export const PUT = appApiHandler({ PUT: upsertIfoodItemRoute });
export const PATCH = appApiHandler({ PATCH: patchIfoodItemRoute });

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
