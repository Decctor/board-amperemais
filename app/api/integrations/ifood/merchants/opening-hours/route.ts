import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { resolveIfoodManagementContext } from "@/lib/integrations/ifood/context";
import { getIfoodOpeningHours, putIfoodOpeningHours } from "@/lib/integrations/ifood/merchant";
import { IFOOD_DAYS_OF_WEEK } from "@/lib/integrations/ifood/merchant-types";
import { canManageIntegrations, canViewIntegrations } from "@/lib/integrations/mask";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

// ---------------------------------------------------------------------------
// GET — horários de funcionamento de uma loja
// ---------------------------------------------------------------------------

const GetIfoodOpeningHoursInputSchema = z.object({
	merchantId: z
		.string({
			required_error: "ID da loja do iFood não informado.",
			invalid_type_error: "Tipo inválido para o ID da loja do iFood.",
		})
		.min(1, "ID da loja do iFood não informado."),
});
export type TGetIfoodOpeningHoursInput = z.infer<typeof GetIfoodOpeningHoursInputSchema>;

async function getIfoodOpeningHoursService({ input, organizacaoId }: { input: TGetIfoodOpeningHoursInput; organizacaoId: string }) {
	const context = await resolveIfoodManagementContext({ organizacaoId, merchantId: input.merchantId });
	const turnos = await getIfoodOpeningHours(context.client, input.merchantId);
	return { data: { turnos }, message: "Horários de funcionamento buscados com sucesso." };
}
export type TGetIfoodOpeningHoursOutput = Awaited<ReturnType<typeof getIfoodOpeningHoursService>>;

async function getIfoodOpeningHoursRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para acessar a integração do iFood.");
	const organizacaoId = session.membership?.organizacao.id;
	if (!organizacaoId) throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização para acessar a integração do iFood.");
	if (!canViewIntegrations(session.membership?.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para visualizar integrações.");

	const searchParams = request.nextUrl.searchParams;
	const input = GetIfoodOpeningHoursInputSchema.parse({ merchantId: searchParams.get("merchantId") });
	const result = await getIfoodOpeningHoursService({ input, organizacaoId });
	return NextResponse.json(result);
}

// ---------------------------------------------------------------------------
// PUT — substitui os horários de funcionamento (a API do iFood troca o conjunto inteiro)
// ---------------------------------------------------------------------------

const IfoodOpeningShiftInputSchema = z.object({
	diaSemana: z.enum(IFOOD_DAYS_OF_WEEK, {
		required_error: "Dia da semana do turno não informado.",
		invalid_type_error: "Tipo inválido para o dia da semana do turno.",
	}),
	inicio: z
		.string({
			required_error: "Horário de início do turno não informado.",
			invalid_type_error: "Tipo inválido para o horário de início do turno.",
		})
		.regex(/^\d{2}:\d{2}:\d{2}$/, { message: "Horário de início do turno deve estar no formato HH:MM:SS." }),
	duracaoMinutos: z
		.number({
			required_error: "Duração do turno não informada.",
			invalid_type_error: "Tipo inválido para a duração do turno.",
		})
		.int({ message: "Duração do turno deve ser um número inteiro de minutos." })
		.min(1, "Duração do turno deve ser de pelo menos 1 minuto.")
		.max(1440, "Duração do turno não pode passar de 24 horas."),
});

const UpdateIfoodOpeningHoursInputSchema = z.object({
	merchantId: z
		.string({
			required_error: "ID da loja do iFood não informado.",
			invalid_type_error: "Tipo inválido para o ID da loja do iFood.",
		})
		.min(1, "ID da loja do iFood não informado."),
	turnos: z.array(IfoodOpeningShiftInputSchema, {
		required_error: "Turnos de funcionamento não informados.",
		invalid_type_error: "Tipo inválido para os turnos de funcionamento.",
	}),
});
export type TUpdateIfoodOpeningHoursInput = z.infer<typeof UpdateIfoodOpeningHoursInputSchema>;

async function updateIfoodOpeningHoursService({ input, session }: { input: TUpdateIfoodOpeningHoursInput; session: TAuthUserSession }) {
	const organizacaoId = session.membership?.organizacao.id as string;
	const context = await resolveIfoodManagementContext({ organizacaoId, merchantId: input.merchantId });
	const turnos = await putIfoodOpeningHours(context.client, input.merchantId, input.turnos);
	return { data: { turnos }, message: "Horários de funcionamento atualizados no iFood." };
}
export type TUpdateIfoodOpeningHoursOutput = Awaited<ReturnType<typeof updateIfoodOpeningHoursService>>;

async function updateIfoodOpeningHoursRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você precisa estar autenticado para gerenciar a integração do iFood.");
	if (!session.membership?.organizacao.id)
		throw new createHttpError.BadRequest("Você precisa estar vinculado a uma organização para gerenciar a integração do iFood.");
	if (!canManageIntegrations(session.membership?.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para gerenciar integrações.");

	const input = UpdateIfoodOpeningHoursInputSchema.parse(await request.json());
	const result = await updateIfoodOpeningHoursService({ input, session });
	return NextResponse.json(result);
}

export const GET = appApiHandler({ GET: getIfoodOpeningHoursRoute });
export const PUT = appApiHandler({ PUT: updateIfoodOpeningHoursRoute });

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
