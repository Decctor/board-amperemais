import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { getIfoodOptionGroup, listIfoodOptionGroups } from "@/lib/integrations/ifood/catalog";
import type { TIfoodOptionGroupDTO } from "@/lib/integrations/ifood/catalog-types";
import { resolveIfoodManagementContext } from "@/lib/integrations/ifood/context";
import { canViewIntegrations } from "@/lib/integrations/mask";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const GetIfoodOptionGroupsInputSchema = z.object({
	merchantId: z
		.string({
			required_error: "ID da loja do iFood não informado.",
			invalid_type_error: "Tipo inválido para o ID da loja do iFood.",
		})
		.min(1, "ID da loja do iFood não informado."),
	optionGroupId: z
		.string({ invalid_type_error: "Tipo inválido para o ID do grupo de complementos." })
		.optional()
		.nullable()
		.transform((v) => v || null),
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
export type TGetIfoodOptionGroupsInput = z.infer<typeof GetIfoodOptionGroupsInputSchema>;

async function getIfoodOptionGroups({ input, organizacaoId }: { input: TGetIfoodOptionGroupsInput; organizacaoId: string }) {
	const context = await resolveIfoodManagementContext({ organizacaoId, merchantId: input.merchantId });

	if (input.optionGroupId) {
		const byId = await getIfoodOptionGroup(context.client, input.merchantId, input.optionGroupId);
		return {
			data: { byId, default: null as TIfoodOptionGroupDTO[] | null },
			message: "Grupo de complementos buscado com sucesso.",
		};
	}

	const grupos = await listIfoodOptionGroups(context.client, input.merchantId, { page: input.page, limit: input.limit });
	return {
		data: { byId: null as TIfoodOptionGroupDTO | null, default: grupos },
		message: "Grupos de complementos buscados com sucesso.",
	};
}
export type TGetIfoodOptionGroupsOutput = Awaited<ReturnType<typeof getIfoodOptionGroups>>;

async function getIfoodOptionGroupsRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para acessar a integração do iFood.");
	const organizacaoId = session.membership?.organizacao.id;
	if (!organizacaoId) throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização para acessar a integração do iFood.");
	if (!canViewIntegrations(session.membership?.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para visualizar integrações.");

	const searchParams = request.nextUrl.searchParams;
	const input = GetIfoodOptionGroupsInputSchema.parse({
		merchantId: searchParams.get("merchantId"),
		optionGroupId: searchParams.get("optionGroupId"),
		page: searchParams.get("page"),
		limit: searchParams.get("limit"),
	});
	const result = await getIfoodOptionGroups({ input, organizacaoId });
	return NextResponse.json(result);
}

export const GET = appApiHandler({ GET: getIfoodOptionGroupsRoute });

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
