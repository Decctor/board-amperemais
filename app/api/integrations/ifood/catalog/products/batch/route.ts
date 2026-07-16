import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { batchUpdateIfoodProductsPrice, batchUpdateIfoodProductsStatus, getIfoodBatch } from "@/lib/integrations/ifood/catalog";
import { resolveIfoodManagementContext } from "@/lib/integrations/ifood/context";
import { canManageIntegrations, canViewIntegrations } from "@/lib/integrations/mask";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

// ---------------------------------------------------------------------------
// PATCH — atualização em lote de preço ou status de produtos (por código externo)
// ---------------------------------------------------------------------------

const BatchUpdateIfoodProductsInputSchema = z.object({
	merchantId: z
		.string({
			required_error: "ID da loja do iFood não informado.",
			invalid_type_error: "Tipo inválido para o ID da loja do iFood.",
		})
		.min(1, "ID da loja do iFood não informado."),
	tipo: z.enum(["PRECO", "STATUS"], {
		required_error: "Tipo da atualização em lote não informado.",
		invalid_type_error: "Tipo inválido para a atualização em lote.",
	}),
	itens: z
		.array(
			z.object({
				codigoExterno: z
					.string({
						required_error: "Código externo do produto não informado.",
						invalid_type_error: "Tipo inválido para o código externo do produto.",
					})
					.min(1, "Código externo do produto não informado."),
				preco: z.number({ invalid_type_error: "Tipo inválido para o preço do produto." }).min(0).optional().nullable(),
				status: z.string({ invalid_type_error: "Tipo inválido para o status do produto." }).optional().nullable(),
			}),
			{
				required_error: "Itens da atualização em lote não informados.",
				invalid_type_error: "Tipo inválido para os itens da atualização em lote.",
			},
		)
		.min(1, "Informe ao menos um item para atualizar."),
});
export type TBatchUpdateIfoodProductsInput = z.infer<typeof BatchUpdateIfoodProductsInputSchema>;

async function batchUpdateIfoodProductsService({ input, session }: { input: TBatchUpdateIfoodProductsInput; session: TAuthUserSession }) {
	const organizacaoId = session.membership?.organizacao.id as string;
	const context = await resolveIfoodManagementContext({ organizacaoId, merchantId: input.merchantId });

	if (input.tipo === "PRECO") {
		const itens = input.itens
			.filter((item) => item.preco != null)
			.map((item) => ({ externalCode: item.codigoExterno, price: { value: item.preco as number } }));
		if (!itens.length) throw new createHttpError.BadRequest("Nenhum item com preço informado.");
		const batch = await batchUpdateIfoodProductsPrice(context.client, input.merchantId, itens);
		return { data: batch, message: "Atualização de preços enviada ao iFood." };
	}

	const itens = input.itens
		.filter((item) => item.status != null)
		.map((item) => ({ externalCode: item.codigoExterno, status: item.status as string }));
	if (!itens.length) throw new createHttpError.BadRequest("Nenhum item com status informado.");
	const batch = await batchUpdateIfoodProductsStatus(context.client, input.merchantId, itens);
	return { data: batch, message: "Atualização de status enviada ao iFood." };
}
export type TBatchUpdateIfoodProductsOutput = Awaited<ReturnType<typeof batchUpdateIfoodProductsService>>;

async function batchUpdateIfoodProductsRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para gerenciar a integração do iFood.");
	if (!session.membership?.organizacao.id)
		throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização para gerenciar a integração do iFood.");
	if (!canManageIntegrations(session.membership?.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para gerenciar integrações.");

	const input = BatchUpdateIfoodProductsInputSchema.parse(await request.json());
	const result = await batchUpdateIfoodProductsService({ input, session });
	return NextResponse.json(result);
}

// ---------------------------------------------------------------------------
// GET — consulta o status de um lote enviado
// ---------------------------------------------------------------------------

const GetIfoodBatchInputSchema = z.object({
	merchantId: z
		.string({
			required_error: "ID da loja do iFood não informado.",
			invalid_type_error: "Tipo inválido para o ID da loja do iFood.",
		})
		.min(1, "ID da loja do iFood não informado."),
	batchId: z
		.string({
			required_error: "ID do lote não informado.",
			invalid_type_error: "Tipo inválido para o ID do lote.",
		})
		.min(1, "ID do lote não informado."),
});
export type TGetIfoodBatchInput = z.infer<typeof GetIfoodBatchInputSchema>;

async function getIfoodBatchService({ input, organizacaoId }: { input: TGetIfoodBatchInput; organizacaoId: string }) {
	const context = await resolveIfoodManagementContext({ organizacaoId, merchantId: input.merchantId });
	const batch = await getIfoodBatch(context.client, input.merchantId, input.batchId);
	return { data: batch, message: "Status do lote buscado com sucesso." };
}
export type TGetIfoodBatchOutput = Awaited<ReturnType<typeof getIfoodBatchService>>;

async function getIfoodBatchRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para acessar a integração do iFood.");
	const organizacaoId = session.membership?.organizacao.id;
	if (!organizacaoId) throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização para acessar a integração do iFood.");
	if (!canViewIntegrations(session.membership?.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para visualizar integrações.");

	const searchParams = request.nextUrl.searchParams;
	const input = GetIfoodBatchInputSchema.parse({
		merchantId: searchParams.get("merchantId"),
		batchId: searchParams.get("batchId"),
	});
	const result = await getIfoodBatchService({ input, organizacaoId });
	return NextResponse.json(result);
}

export const PATCH = appApiHandler({ PATCH: batchUpdateIfoodProductsRoute });
export const GET = appApiHandler({ GET: getIfoodBatchRoute });

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
