import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { createOpenFinanceConnection, setOpenFinanceConnectionActive, syncOpenFinanceConnection } from "@/lib/integrations/openfinance";
import { canReconcileFinances, canViewFinances } from "@/lib/permissions/finances";
import { db } from "@/services/drizzle";
import { financialOpenFinanceConnections } from "@/services/drizzle/schema";
import { eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

// Sincronização sob demanda pode buscar transações no agregador — tempo estendido.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

async function getOpenFinanceConnections({ session }: { session: TAuthUserSession }) {
	const orgId = session.membership?.organizacao.id;
	if (!orgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const connections = await db.query.financialOpenFinanceConnections.findMany({
		where: eq(financialOpenFinanceConnections.organizacaoId, orgId),
		with: {
			contaFinanceira: { columns: { id: true, nome: true, tipo: true } },
		},
		orderBy: (fields, { desc }) => desc(fields.dataInsercao),
	});

	return { data: { connections }, message: "Conexões OpenFinance listadas com sucesso." };
}
export type TGetOpenFinanceConnectionsOutput = Awaited<ReturnType<typeof getOpenFinanceConnections>>;

async function getOpenFinanceConnectionsRoute(_request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session?.membership) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");
	if (!canViewFinances(session.membership.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para acessar o módulo financeiro.");

	const result = await getOpenFinanceConnections({ session });
	return NextResponse.json(result);
}

export const GET = appApiHandler({ GET: getOpenFinanceConnectionsRoute });

const CreateOpenFinanceConnectionInputSchema = z.object({
	contaFinanceiraId: z.string({ required_error: "ID da conta financeira não informado." }),
	provedor: z.string({ required_error: "Provedor OpenFinance não informado." }),
	provedorItemId: z.string({ invalid_type_error: "Tipo inválido para o item do provedor." }).optional().nullable(),
	provedorContaId: z.string({ invalid_type_error: "Tipo inválido para a conta do provedor." }).optional().nullable(),
});
export type TCreateOpenFinanceConnectionInput = z.infer<typeof CreateOpenFinanceConnectionInputSchema>;

async function createOpenFinanceConnectionService({
	input,
	orgId,
	authorId,
}: {
	input: TCreateOpenFinanceConnectionInput;
	orgId: string;
	authorId: string;
}) {
	const result = await createOpenFinanceConnection({
		organizacaoId: orgId,
		autorId: authorId,
		contaFinanceiraId: input.contaFinanceiraId,
		provedor: input.provedor,
		provedorItemId: input.provedorItemId,
		provedorContaId: input.provedorContaId,
	});
	return { data: result, message: "Conexão OpenFinance criada com sucesso." };
}
export type TCreateOpenFinanceConnectionOutput = Awaited<ReturnType<typeof createOpenFinanceConnectionService>>;

async function createOpenFinanceConnectionRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session?.membership) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");
	if (!canReconcileFinances(session.membership.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para realizar conciliação bancária.");

	const body = await request.json();
	const input = CreateOpenFinanceConnectionInputSchema.parse(body);
	const result = await createOpenFinanceConnectionService({ input, orgId: session.membership.organizacao.id, authorId: session.user.id });
	return NextResponse.json(result);
}

export const POST = appApiHandler({ POST: createOpenFinanceConnectionRoute });

const UpdateOpenFinanceConnectionInputSchema = z.object({
	conexaoId: z.string({ required_error: "ID da conexão não informado." }),
	acao: z.enum(["ATIVAR", "DESATIVAR", "SINCRONIZAR"], { required_error: "Ação não informada." }),
});
export type TUpdateOpenFinanceConnectionInput = z.infer<typeof UpdateOpenFinanceConnectionInputSchema>;

async function updateOpenFinanceConnection({ input, orgId }: { input: TUpdateOpenFinanceConnectionInput; orgId: string }) {
	if (input.acao === "SINCRONIZAR") {
		const result = await syncOpenFinanceConnection({ organizacaoId: orgId, conexaoId: input.conexaoId });
		return {
			data: result,
			message:
				result.importadas > 0
					? `Sincronização concluída: ${result.importadas} transação(ões) nova(s), ${result.sugeridas} sugestão(ões).`
					: "Sincronização concluída: nenhuma transação nova.",
		};
	}

	const result = await setOpenFinanceConnectionActive({ organizacaoId: orgId, conexaoId: input.conexaoId, ativo: input.acao === "ATIVAR" });
	return { data: result, message: input.acao === "ATIVAR" ? "Conexão ativada." : "Conexão desativada." };
}
export type TUpdateOpenFinanceConnectionOutput = Awaited<ReturnType<typeof updateOpenFinanceConnection>>;

async function updateOpenFinanceConnectionRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session?.membership) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");
	if (!canReconcileFinances(session.membership.permissoes))
		throw new createHttpError.Forbidden("Você não possui permissão para realizar conciliação bancária.");

	const body = await request.json();
	const input = UpdateOpenFinanceConnectionInputSchema.parse(body);
	const result = await updateOpenFinanceConnection({ input, orgId: session.membership.organizacao.id });
	return NextResponse.json(result);
}

export const PUT = appApiHandler({ PUT: updateOpenFinanceConnectionRoute });
