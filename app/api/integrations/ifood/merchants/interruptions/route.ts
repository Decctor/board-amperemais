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

/**
 * As pausas do iFood viajam como horário LOCAL DA LOJA, sem fuso: a API descarta qualquer offset e
 * lê o wall-clock literal — mandar `16:00` em UTC (`19:00Z`) agenda a pausa para as 19:00 na loja.
 *
 * Por isso o valor não é convertido em nenhum ponto do caminho: o que o lojista digita no
 * `datetime-local` é exatamente o que o iFood grava, e é exatamente o que ele devolve no GET.
 */
const IFOOD_LOCAL_DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;

function IfoodLocalDateTimeSchema(campo: string) {
	return z
		.string({
			required_error: `Data de ${campo} da pausa não informada.`,
			invalid_type_error: `Tipo inválido para a data de ${campo} da pausa.`,
		})
		.regex(IFOOD_LOCAL_DATETIME_PATTERN, {
			message: `Data de ${campo} da pausa deve ser um horário local no formato AAAA-MM-DDTHH:MM.`,
		})
		// O input `datetime-local` omite os segundos; o iFood sempre os devolve.
		.transform((value) => (value.length === 16 ? `${value}:00` : value));
}

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
		inicio: IfoodLocalDateTimeSchema("início"),
		fim: IfoodLocalDateTimeSchema("fim"),
	})
	// Comparação textual: o formato tem largura fixa, então a ordem lexicográfica é a cronológica —
	// e evita reintroduzir um `new Date()`, que traria de volta a semântica de fuso que não queremos.
	.refine((value) => value.fim > value.inicio, {
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

	// O ZodError não carrega o valor recusado, e sem ele um 400 de formato em produção é indiagnosticável:
	// não dá para saber se o cliente mandou UTC, milissegundos ou lixo. O log guarda o que chegou.
	const body = await request.json();
	const parsed = CreateIfoodInterruptionInputSchema.safeParse(body);
	if (!parsed.success) {
		console.error("[IFOOD] Payload de pausa recusado:", {
			inicio: body?.inicio,
			fim: body?.fim,
			issues: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
		});
		throw new createHttpError.BadRequest(parsed.error.issues[0].message);
	}

	const result = await createIfoodInterruptionService({ input: parsed.data, session });
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
