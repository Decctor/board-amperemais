import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { resolveIfoodManagementContext } from "@/lib/integrations/ifood/context";
import { createIfoodInterruption, deleteIfoodInterruption, listIfoodInterruptions } from "@/lib/integrations/ifood/merchant";
import { canManageIntegrations, canViewIntegrations } from "@/lib/integrations/mask";
import type { TAuthUserSession } from "@/lib/authentication/types";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

// ---------------------------------------------------------------------------
// GET — lista as pausas programadas de uma loja
// ---------------------------------------------------------------------------

const GetIfoodInterruptionsInputSchema = z.object({
	merchantId: z
		.string({
			required_error: "ID da loja do iFood não informado.",
			invalid_type_error: "Tipo inválido para o ID da loja do iFood.",
		})
		.min(1, "ID da loja do iFood não informado."),
});
export type TGetIfoodInterruptionsInput = z.infer<typeof GetIfoodInterruptionsInputSchema>;

async function getIfoodInterruptions({ input, organizacaoId }: { input: TGetIfoodInterruptionsInput; organizacaoId: string }) {
	const context = await resolveIfoodManagementContext({ organizacaoId, merchantId: input.merchantId });
	const interrupcoes = await listIfoodInterruptions(context.client, input.merchantId);
	return { data: { interrupcoes }, message: "Pausas da loja do iFood buscadas com sucesso." };
}
export type TGetIfoodInterruptionsOutput = Awaited<ReturnType<typeof getIfoodInterruptions>>;

async function getIfoodInterruptionsRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para acessar a integração do iFood.");
	const organizacaoId = session.membership?.organizacao.id;
	if (!organizacaoId) throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização para acessar a integração do iFood.");
	if (!canViewIntegrations(session.membership?.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para visualizar integrações.");

	const searchParams = request.nextUrl.searchParams;
	const input = GetIfoodInterruptionsInputSchema.parse({ merchantId: searchParams.get("merchantId") });
	const result = await getIfoodInterruptions({ input, organizacaoId });
	return NextResponse.json(result);
}

// ---------------------------------------------------------------------------
// POST — cria uma pausa programada (fecha a loja temporariamente)
// ---------------------------------------------------------------------------

const CreateIfoodInterruptionInputSchema = z
	.object({
		merchantId: z
			.string({
				required_error: "ID da loja do iFood não informado.",
				invalid_type_error: "Tipo inválido para o ID da loja do iFood.",
			})
			.min(1, "ID da loja do iFood não informado."),
		descricao: z
			.string({
				required_error: "Descrição da pausa não informada.",
				invalid_type_error: "Tipo inválido para a descrição da pausa.",
			})
			.trim()
			.min(1, "Descrição da pausa não informada."),
		inicio: z
			.string({
				required_error: "Data de início da pausa não informada.",
				invalid_type_error: "Tipo inválido para a data de início da pausa.",
			})
			.datetime({ message: "Formato inválido para a data de início da pausa." }),
		fim: z
			.string({
				required_error: "Data de fim da pausa não informada.",
				invalid_type_error: "Tipo inválido para a data de fim da pausa.",
			})
			.datetime({ message: "Formato inválido para a data de fim da pausa." }),
	})
	.refine((value) => new Date(value.fim) > new Date(value.inicio), {
		message: "A data de fim da pausa deve ser posterior à data de início.",
		path: ["fim"],
	});
export type TCreateIfoodInterruptionInput = z.infer<typeof CreateIfoodInterruptionInputSchema>;

async function createIfoodInterruptionService({ input, session }: { input: TCreateIfoodInterruptionInput; session: TAuthUserSession }) {
	const organizacaoId = session.membership?.organizacao.id as string;
	const context = await resolveIfoodManagementContext({ organizacaoId, merchantId: input.merchantId });
	const interrupcao = await createIfoodInterruption(context.client, input.merchantId, {
		descricao: input.descricao,
		inicio: input.inicio,
		fim: input.fim,
	});
	return { data: interrupcao, message: "Loja pausada com sucesso no iFood." };
}
export type TCreateIfoodInterruptionOutput = Awaited<ReturnType<typeof createIfoodInterruptionService>>;

async function createIfoodInterruptionRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para gerenciar a integração do iFood.");
	if (!session.membership?.organizacao.id)
		throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização para gerenciar a integração do iFood.");
	if (!canManageIntegrations(session.membership?.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para gerenciar integrações.");

	const input = CreateIfoodInterruptionInputSchema.parse(await request.json());
	const result = await createIfoodInterruptionService({ input, session });
	return NextResponse.json(result);
}

// ---------------------------------------------------------------------------
// DELETE — remove uma pausa programada (reabre a loja)
// ---------------------------------------------------------------------------

const DeleteIfoodInterruptionInputSchema = z.object({
	merchantId: z
		.string({
			required_error: "ID da loja do iFood não informado.",
			invalid_type_error: "Tipo inválido para o ID da loja do iFood.",
		})
		.min(1, "ID da loja do iFood não informado."),
	interruptionId: z
		.string({
			required_error: "ID da pausa não informado.",
			invalid_type_error: "Tipo inválido para o ID da pausa.",
		})
		.min(1, "ID da pausa não informado."),
});
export type TDeleteIfoodInterruptionInput = z.infer<typeof DeleteIfoodInterruptionInputSchema>;

async function deleteIfoodInterruptionService({ input, session }: { input: TDeleteIfoodInterruptionInput; session: TAuthUserSession }) {
	const organizacaoId = session.membership?.organizacao.id as string;
	const context = await resolveIfoodManagementContext({ organizacaoId, merchantId: input.merchantId });
	await deleteIfoodInterruption(context.client, input.merchantId, input.interruptionId);
	return { data: { id: input.interruptionId }, message: "Pausa removida com sucesso. A loja voltará a operar no iFood." };
}
export type TDeleteIfoodInterruptionOutput = Awaited<ReturnType<typeof deleteIfoodInterruptionService>>;

async function deleteIfoodInterruptionRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para gerenciar a integração do iFood.");
	if (!session.membership?.organizacao.id)
		throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização para gerenciar a integração do iFood.");
	if (!canManageIntegrations(session.membership?.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para gerenciar integrações.");

	const searchParams = request.nextUrl.searchParams;
	const input = DeleteIfoodInterruptionInputSchema.parse({
		merchantId: searchParams.get("merchantId"),
		interruptionId: searchParams.get("interruptionId"),
	});
	const result = await deleteIfoodInterruptionService({ input, session });
	return NextResponse.json(result);
}

export const GET = appApiHandler({ GET: getIfoodInterruptionsRoute });
export const POST = appApiHandler({ POST: createIfoodInterruptionRoute });
export const DELETE = appApiHandler({ DELETE: deleteIfoodInterruptionRoute });

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
