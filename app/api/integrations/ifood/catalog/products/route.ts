import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { listIfoodProducts } from "@/lib/integrations/ifood/catalog";
import { resolveIfoodManagementContext } from "@/lib/integrations/ifood/context";
import { canViewIntegrations } from "@/lib/integrations/mask";
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

export const GET = appApiHandler({ GET: getIfoodProductsRoute });

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
