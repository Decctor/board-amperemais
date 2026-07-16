import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { listIfoodCategories } from "@/lib/integrations/ifood/catalog";
import { resolveIfoodManagementContext } from "@/lib/integrations/ifood/context";
import { canViewIntegrations } from "@/lib/integrations/mask";
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

export const GET = appApiHandler({ GET: getIfoodCategoriesRoute });

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
