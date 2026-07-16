import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { getIfoodOptionGroup, listIfoodOptionGroups } from "@/lib/integrations/ifood/catalog";
import { deleteIfoodOptionGroup, patchIfoodOptionGroupStatus, updateIfoodOptionGroup } from "@/lib/integrations/ifood/catalog-items";
import type { TIfoodOptionGroupDTO } from "@/lib/integrations/ifood/catalog-types";
import { resolveIfoodManagementContext } from "@/lib/integrations/ifood/context";
import { canManageIntegrations, canViewIntegrations } from "@/lib/integrations/mask";
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

// ---------------------------------------------------------------------------
// PATCH — atualiza um grupo de complementos (nome ou status)
// ---------------------------------------------------------------------------

const UpdateIfoodOptionGroupInputSchema = z
	.object({
		merchantId: z
			.string({
				required_error: "ID da loja do iFood não informado.",
				invalid_type_error: "Tipo inválido para o ID da loja do iFood.",
			})
			.min(1, "ID da loja do iFood não informado."),
		optionGroupId: z
			.string({
				required_error: "ID do grupo de complementos não informado.",
				invalid_type_error: "Tipo inválido para o ID do grupo de complementos.",
			})
			.min(1, "ID do grupo de complementos não informado."),
		nome: z.string({ invalid_type_error: "Tipo inválido para o nome do grupo de complementos." }).trim().optional().nullable(),
		status: z.string({ invalid_type_error: "Tipo inválido para o status do grupo de complementos." }).optional().nullable(),
	})
	.refine((value) => value.nome || value.status, { message: "Nenhuma alteração informada para o grupo de complementos." });
export type TUpdateIfoodOptionGroupInput = z.infer<typeof UpdateIfoodOptionGroupInputSchema>;

async function updateIfoodOptionGroupService({ input, session }: { input: TUpdateIfoodOptionGroupInput; session: TAuthUserSession }) {
	const organizacaoId = session.membership?.organizacao.id as string;
	const context = await resolveIfoodManagementContext({ organizacaoId, merchantId: input.merchantId });

	if (input.nome) await updateIfoodOptionGroup(context.client, input.merchantId, input.optionGroupId, { nome: input.nome });
	if (input.status) await patchIfoodOptionGroupStatus(context.client, input.merchantId, input.optionGroupId, input.status);

	return { data: { id: input.optionGroupId }, message: "Grupo de complementos atualizado com sucesso no iFood." };
}
export type TUpdateIfoodOptionGroupOutput = Awaited<ReturnType<typeof updateIfoodOptionGroupService>>;

async function updateIfoodOptionGroupRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para gerenciar a integração do iFood.");
	if (!session.membership?.organizacao.id)
		throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização para gerenciar a integração do iFood.");
	if (!canManageIntegrations(session.membership?.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para gerenciar integrações.");

	const input = UpdateIfoodOptionGroupInputSchema.parse(await request.json());
	const result = await updateIfoodOptionGroupService({ input, session });
	return NextResponse.json(result);
}

// ---------------------------------------------------------------------------
// DELETE — remove um grupo de complementos
// ---------------------------------------------------------------------------

const DeleteIfoodOptionGroupInputSchema = z.object({
	merchantId: z
		.string({
			required_error: "ID da loja do iFood não informado.",
			invalid_type_error: "Tipo inválido para o ID da loja do iFood.",
		})
		.min(1, "ID da loja do iFood não informado."),
	optionGroupId: z
		.string({
			required_error: "ID do grupo de complementos não informado.",
			invalid_type_error: "Tipo inválido para o ID do grupo de complementos.",
		})
		.min(1, "ID do grupo de complementos não informado."),
});
export type TDeleteIfoodOptionGroupInput = z.infer<typeof DeleteIfoodOptionGroupInputSchema>;

async function deleteIfoodOptionGroupService({ input, session }: { input: TDeleteIfoodOptionGroupInput; session: TAuthUserSession }) {
	const organizacaoId = session.membership?.organizacao.id as string;
	const context = await resolveIfoodManagementContext({ organizacaoId, merchantId: input.merchantId });
	await deleteIfoodOptionGroup(context.client, input.merchantId, input.optionGroupId);
	return { data: { id: input.optionGroupId }, message: "Grupo de complementos removido com sucesso do iFood." };
}
export type TDeleteIfoodOptionGroupOutput = Awaited<ReturnType<typeof deleteIfoodOptionGroupService>>;

async function deleteIfoodOptionGroupRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para gerenciar a integração do iFood.");
	if (!session.membership?.organizacao.id)
		throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização para gerenciar a integração do iFood.");
	if (!canManageIntegrations(session.membership?.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para gerenciar integrações.");

	const searchParams = request.nextUrl.searchParams;
	const input = DeleteIfoodOptionGroupInputSchema.parse({
		merchantId: searchParams.get("merchantId"),
		optionGroupId: searchParams.get("optionGroupId"),
	});
	const result = await deleteIfoodOptionGroupService({ input, session });
	return NextResponse.json(result);
}

export const GET = appApiHandler({ GET: getIfoodOptionGroupsRoute });
export const PATCH = appApiHandler({ PATCH: updateIfoodOptionGroupRoute });
export const DELETE = appApiHandler({ DELETE: deleteIfoodOptionGroupRoute });

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
