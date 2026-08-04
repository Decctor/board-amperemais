import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getIfoodItemFlat } from "@/lib/integrations/ifood/catalog";
import { patchIfoodItem, upsertIfoodItem } from "@/lib/integrations/ifood/catalog-items";
import { resolveIfoodManagementContext } from "@/lib/integrations/ifood/context";
import { canManageIntegrations, canViewIntegrations } from "@/lib/integrations/mask";
import {
	IFOOD_CATALOG_DESCRIPTION_MAX_LENGTH,
	IFOOD_CATALOG_TITLE_MAX_LENGTH,
	IfoodCatalogContextEnum,
	IfoodCatalogStatusEnum,
	IfoodOptionGroupTypeEnum,
} from "@/schemas/enums";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

// ---------------------------------------------------------------------------
// GET — item completo (produto + grupos de complementos + opções) via /flat
// ---------------------------------------------------------------------------

const GetIfoodItemInputSchema = z.object({
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
});
export type TGetIfoodItemInput = z.infer<typeof GetIfoodItemInputSchema>;

async function getIfoodItem({ input, organizacaoId }: { input: TGetIfoodItemInput; organizacaoId: string }) {
	const context = await resolveIfoodManagementContext({ organizacaoId, merchantId: input.merchantId });
	const item = await getIfoodItemFlat(context.client, input.merchantId, input.itemId);
	return { data: { byId: item }, message: "Item do catálogo buscado com sucesso." };
}
export type TGetIfoodItemOutput = Awaited<ReturnType<typeof getIfoodItem>>;

async function getIfoodItemRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para acessar a integração do iFood.");
	const organizacaoId = session.membership?.organizacao.id;
	if (!organizacaoId) throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização para acessar a integração do iFood.");
	if (!canViewIntegrations(session.membership?.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para visualizar integrações.");

	const searchParams = request.nextUrl.searchParams;
	const input = GetIfoodItemInputSchema.parse({
		merchantId: searchParams.get("merchantId"),
		itemId: searchParams.get("itemId"),
	});
	const result = await getIfoodItem({ input, organizacaoId });
	return NextResponse.json(result);
}

// ---------------------------------------------------------------------------
// PUT — cria/atualiza um item (produto vendável dentro de uma categoria)
// ---------------------------------------------------------------------------

const IfoodItemOptionInputSchema = z.object({
	id: z.string({ invalid_type_error: "Tipo inválido para o ID da opção." }).optional().nullable(),
	produtoId: z.string({ invalid_type_error: "Tipo inválido para o ID do produto da opção." }).optional().nullable(),
	nome: z
		.string({
			required_error: "Nome da opção não informado.",
			invalid_type_error: "Tipo inválido para o nome da opção.",
		})
		.trim()
		.min(1, "Nome da opção não informado.")
		.max(IFOOD_CATALOG_TITLE_MAX_LENGTH, `O nome da opção não pode passar de ${IFOOD_CATALOG_TITLE_MAX_LENGTH} caracteres.`),
	descricao: z
		.string({ invalid_type_error: "Tipo inválido para a descrição da opção." })
		.max(IFOOD_CATALOG_DESCRIPTION_MAX_LENGTH, `A descrição da opção não pode passar de ${IFOOD_CATALOG_DESCRIPTION_MAX_LENGTH} caracteres.`)
		.optional()
		.nullable(),
	preco: z
		.number({ invalid_type_error: "Tipo inválido para o preço da opção." })
		.min(0, "Preço da opção não pode ser negativo.")
		.optional()
		.nullable(),
	codigoExterno: z.string({ invalid_type_error: "Tipo inválido para o código externo da opção." }).optional().nullable(),
	status: IfoodCatalogStatusEnum.optional().nullable(),
});

const IfoodItemOptionGroupInputSchema = z
	.object({
		id: z.string({ invalid_type_error: "Tipo inválido para o ID do grupo de complementos." }).optional().nullable(),
		nome: z
			.string({
				required_error: "Nome do grupo de complementos não informado.",
				invalid_type_error: "Tipo inválido para o nome do grupo de complementos.",
			})
			.trim()
			.min(1, "Nome do grupo de complementos não informado.")
			.max(IFOOD_CATALOG_TITLE_MAX_LENGTH, `O nome do grupo não pode passar de ${IFOOD_CATALOG_TITLE_MAX_LENGTH} caracteres.`),
		tipo: IfoodOptionGroupTypeEnum,
		min: z
			.number({
				required_error: "Mínimo de escolhas não informado.",
				invalid_type_error: "Tipo inválido para o mínimo de escolhas.",
			})
			.int("O mínimo de escolhas precisa ser um número inteiro.")
			.min(0, "O mínimo de escolhas não pode ser negativo."),
		max: z
			.number({
				required_error: "Máximo de escolhas não informado.",
				invalid_type_error: "Tipo inválido para o máximo de escolhas.",
			})
			.int("O máximo de escolhas precisa ser um número inteiro.")
			.min(1, "O máximo de escolhas precisa ser ao menos 1."),
		opcoes: z.array(IfoodItemOptionInputSchema).min(1, "Um grupo de complementos precisa de ao menos uma opção."),
	})
	.refine((grupo) => grupo.min <= grupo.max, {
		message: "O mínimo de escolhas não pode ser maior que o máximo.",
		path: ["min"],
	})
	// Um grupo obrigatório que pede mais escolhas do que tem opções trava o checkout do cliente: o
	// iFood aceita o cadastro e o item vira "não vendível" depois, o que é péssimo de diagnosticar.
	.refine((grupo) => grupo.max <= grupo.opcoes.length, {
		message: "O máximo de escolhas não pode ser maior que a quantidade de opções do grupo.",
		path: ["max"],
	});

const IfoodItemContextModifierInputSchema = z.object({
	contexto: IfoodCatalogContextEnum,
	preco: z
		.number({ invalid_type_error: "Tipo inválido para o preço no canal." })
		.min(0, "Preço no canal não pode ser negativo.")
		.optional()
		.nullable(),
	status: IfoodCatalogStatusEnum.optional().nullable(),
	codigoExterno: z.string({ invalid_type_error: "Tipo inválido para o código externo no canal." }).optional().nullable(),
});

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
		status: IfoodCatalogStatusEnum.optional()
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
					.min(1, "Nome do produto não informado.")
					.max(IFOOD_CATALOG_TITLE_MAX_LENGTH, `O nome do produto não pode passar de ${IFOOD_CATALOG_TITLE_MAX_LENGTH} caracteres.`),
				descricao: z
					.string({ invalid_type_error: "Tipo inválido para a descrição do produto." })
					.max(IFOOD_CATALOG_DESCRIPTION_MAX_LENGTH, `A descrição do produto não pode passar de ${IFOOD_CATALOG_DESCRIPTION_MAX_LENGTH} caracteres.`)
					.optional()
					.nullable(),
				imagemPath: z.string({ invalid_type_error: "Tipo inválido para a imagem do produto." }).optional().nullable(),
			})
			.optional()
			.nullable(),
		gruposComplementos: z.array(IfoodItemOptionGroupInputSchema).optional().nullable(),
		contextModifiers: z.array(IfoodItemContextModifierInputSchema).optional().nullable(),
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
			preco: z
				.number({ invalid_type_error: "Tipo inválido para o preço do item." })
				.min(0, "Preço do item não pode ser negativo.")
				.optional()
				.nullable(),
			precoOriginal: z.number({ invalid_type_error: "Tipo inválido para o preço original do item." }).optional().nullable(),
			status: IfoodCatalogStatusEnum.optional().nullable(),
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

export const GET = appApiHandler({ GET: getIfoodItemRoute });
export const PUT = appApiHandler({ PUT: upsertIfoodItemRoute });
export const PATCH = appApiHandler({ PATCH: patchIfoodItemRoute });

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
