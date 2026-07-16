import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getIfoodCatalogVersion, getIfoodCatalogs, upgradeIfoodCatalogVersion } from "@/lib/integrations/ifood/catalog";
import { resolveIfoodManagementContext } from "@/lib/integrations/ifood/context";
import { canManageIntegrations, canViewIntegrations } from "@/lib/integrations/mask";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

// ---------------------------------------------------------------------------
// GET — catálogos da loja + versão do catálogo (V1 exige upgrade para gestão)
// ---------------------------------------------------------------------------

const GetIfoodCatalogsInputSchema = z.object({
	merchantId: z
		.string({
			required_error: "ID da loja do iFood não informado.",
			invalid_type_error: "Tipo inválido para o ID da loja do iFood.",
		})
		.min(1, "ID da loja do iFood não informado."),
});
export type TGetIfoodCatalogsInput = z.infer<typeof GetIfoodCatalogsInputSchema>;

async function getIfoodCatalogsService({ input, organizacaoId }: { input: TGetIfoodCatalogsInput; organizacaoId: string }) {
	const context = await resolveIfoodManagementContext({ organizacaoId, merchantId: input.merchantId });
	// A checagem de versão é auxiliar — se falhar (formato inesperado, loja sem versão), não bloqueia a listagem.
	const [catalogos, versao] = await Promise.all([
		getIfoodCatalogs(context.client, input.merchantId),
		getIfoodCatalogVersion(context.client, input.merchantId).catch((error) => {
			console.error("[ERROR] [IFOOD] Falha ao consultar a versão do catálogo (seguindo sem versão):", error);
			return null;
		}),
	]);
	return { data: { catalogos, versao }, message: "Catálogos da loja do iFood buscados com sucesso." };
}
export type TGetIfoodCatalogsOutput = Awaited<ReturnType<typeof getIfoodCatalogsService>>;

async function getIfoodCatalogsRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para acessar a integração do iFood.");
	const organizacaoId = session.membership?.organizacao.id;
	if (!organizacaoId) throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização para acessar a integração do iFood.");
	if (!canViewIntegrations(session.membership?.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para visualizar integrações.");

	const searchParams = request.nextUrl.searchParams;
	const input = GetIfoodCatalogsInputSchema.parse({ merchantId: searchParams.get("merchantId") });
	const result = await getIfoodCatalogsService({ input, organizacaoId });
	return NextResponse.json(result);
}

// ---------------------------------------------------------------------------
// POST — ações do catálogo (upgrade de versão V1 → V2)
// ---------------------------------------------------------------------------

const CatalogActionInputSchema = z.object({
	merchantId: z
		.string({
			required_error: "ID da loja do iFood não informado.",
			invalid_type_error: "Tipo inválido para o ID da loja do iFood.",
		})
		.min(1, "ID da loja do iFood não informado."),
	acao: z.enum(["UPGRADE"], {
		required_error: "Ação do catálogo não informada.",
		invalid_type_error: "Tipo inválido para a ação do catálogo.",
	}),
});
export type TCatalogActionInput = z.infer<typeof CatalogActionInputSchema>;

async function executeCatalogAction({ input, session }: { input: TCatalogActionInput; session: TAuthUserSession }) {
	const organizacaoId = session.membership?.organizacao.id as string;
	const context = await resolveIfoodManagementContext({ organizacaoId, merchantId: input.merchantId });
	await upgradeIfoodCatalogVersion(context.client, input.merchantId);
	return { data: { acao: input.acao }, message: "Catálogo atualizado para a versão 2 com sucesso." };
}
export type TCatalogActionOutput = Awaited<ReturnType<typeof executeCatalogAction>>;

async function catalogActionRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para gerenciar a integração do iFood.");
	if (!session.membership?.organizacao.id)
		throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização para gerenciar a integração do iFood.");
	if (!canManageIntegrations(session.membership?.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para gerenciar integrações.");

	const input = CatalogActionInputSchema.parse(await request.json());
	const result = await executeCatalogAction({ input, session });
	return NextResponse.json(result);
}

export const GET = appApiHandler({ GET: getIfoodCatalogsRoute });
export const POST = appApiHandler({ POST: catalogActionRoute });

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
