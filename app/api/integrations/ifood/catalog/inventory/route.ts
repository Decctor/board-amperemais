import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { resolveIfoodManagementContext } from "@/lib/integrations/ifood/context";
import { deleteIfoodProductsInventory, getIfoodProductInventory, setIfoodProductInventory } from "@/lib/integrations/ifood/inventory";
import { canManageIntegrations, canViewIntegrations } from "@/lib/integrations/mask";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

// ---------------------------------------------------------------------------
// GET — estoque atual de um produto
// ---------------------------------------------------------------------------

const GetIfoodInventoryInputSchema = z.object({
	merchantId: z
		.string({
			required_error: "ID da loja do iFood não informado.",
			invalid_type_error: "Tipo inválido para o ID da loja do iFood.",
		})
		.min(1, "ID da loja do iFood não informado."),
	produtoId: z
		.string({
			required_error: "ID do produto não informado.",
			invalid_type_error: "Tipo inválido para o ID do produto.",
		})
		.min(1, "ID do produto não informado."),
});
export type TGetIfoodInventoryInput = z.infer<typeof GetIfoodInventoryInputSchema>;

async function getIfoodInventory({ input, organizacaoId }: { input: TGetIfoodInventoryInput; organizacaoId: string }) {
	const context = await resolveIfoodManagementContext({ organizacaoId, merchantId: input.merchantId });
	const estoque = await getIfoodProductInventory(context.client, input.merchantId, input.produtoId);
	return { data: estoque, message: "Estoque do produto buscado com sucesso." };
}
export type TGetIfoodInventoryOutput = Awaited<ReturnType<typeof getIfoodInventory>>;

async function getIfoodInventoryRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para acessar a integração do iFood.");
	const organizacaoId = session.membership?.organizacao.id;
	if (!organizacaoId) throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização para acessar a integração do iFood.");
	if (!canViewIntegrations(session.membership?.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para visualizar integrações.");

	const searchParams = request.nextUrl.searchParams;
	const input = GetIfoodInventoryInputSchema.parse({
		merchantId: searchParams.get("merchantId"),
		produtoId: searchParams.get("produtoId"),
	});
	const result = await getIfoodInventory({ input, organizacaoId });
	return NextResponse.json(result);
}

// ---------------------------------------------------------------------------
// PUT — define o estoque, ou o remove quando a quantidade vem nula
// ---------------------------------------------------------------------------

const SetIfoodInventoryInputSchema = z.object({
	merchantId: z
		.string({
			required_error: "ID da loja do iFood não informado.",
			invalid_type_error: "Tipo inválido para o ID da loja do iFood.",
		})
		.min(1, "ID da loja do iFood não informado."),
	produtoId: z
		.string({
			required_error: "ID do produto não informado.",
			invalid_type_error: "Tipo inválido para o ID do produto.",
		})
		.min(1, "ID do produto não informado."),
	/** `null` remove a restrição — o produto volta a vender sem limite. */
	quantidade: z
		.number({ invalid_type_error: "Tipo inválido para a quantidade em estoque." })
		.int("A quantidade em estoque precisa ser um número inteiro.")
		.min(0, "A quantidade em estoque não pode ser negativa.")
		.optional()
		.nullable(),
});
export type TSetIfoodInventoryInput = z.infer<typeof SetIfoodInventoryInputSchema>;

async function setIfoodInventory({ input, session }: { input: TSetIfoodInventoryInput; session: TAuthUserSession }) {
	const organizacaoId = session.membership?.organizacao.id as string;
	const context = await resolveIfoodManagementContext({ organizacaoId, merchantId: input.merchantId });

	if (input.quantidade == null) {
		await deleteIfoodProductsInventory(context.client, input.merchantId, [input.produtoId]);
		return { data: { produtoId: input.produtoId, quantidade: null }, message: "Controle de estoque removido: o produto volta a vender sem limite." };
	}

	await setIfoodProductInventory(context.client, input.merchantId, { produtoId: input.produtoId, quantidade: input.quantidade });
	return { data: { produtoId: input.produtoId, quantidade: input.quantidade }, message: "Estoque atualizado no iFood." };
}
export type TSetIfoodInventoryOutput = Awaited<ReturnType<typeof setIfoodInventory>>;

async function setIfoodInventoryRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para gerenciar a integração do iFood.");
	if (!session.membership?.organizacao.id)
		throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização para gerenciar a integração do iFood.");
	if (!canManageIntegrations(session.membership?.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para gerenciar integrações.");

	const input = SetIfoodInventoryInputSchema.parse(await request.json());
	const result = await setIfoodInventory({ input, session });
	return NextResponse.json(result);
}

export const GET = appApiHandler({ GET: getIfoodInventoryRoute });
export const PUT = appApiHandler({ PUT: setIfoodInventoryRoute });

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
