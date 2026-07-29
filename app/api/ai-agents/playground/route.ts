import { createPlaygroundChat, getPlaygroundChat, getPlaygroundState } from "@/lib/ai/agent/playground";
import { ensureOrganizationAgent } from "@/lib/ai/agent/provisioning";
import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { db } from "@/services/drizzle";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";

// ============================================================================
// SERVICES
// ============================================================================

async function getPlayground({ organizacaoId }: { organizacaoId: string }) {
	const chat = await getPlaygroundChat(organizacaoId);
	if (!chat) {
		return { data: { chatId: null, estado: null }, message: "Nenhum chat de teste iniciado." };
	}

	const state = await getPlaygroundState({ organizacaoId, chatId: chat.id });
	return { data: { chatId: chat.id, estado: state }, message: "Estado do playground carregado com sucesso." };
}
export type TGetPlaygroundOutput = Awaited<ReturnType<typeof getPlayground>>;

async function createPlayground({ organizacaoId }: { organizacaoId: string }) {
	const agent = await ensureOrganizationAgent(db, organizacaoId);
	const { chatId } = await createPlaygroundChat({ organizacaoId, agenteId: agent.id });
	const state = await getPlaygroundState({ organizacaoId, chatId });

	return { data: { chatId, estado: state }, message: "Chat de teste criado com sucesso." };
}
export type TCreatePlaygroundOutput = Awaited<ReturnType<typeof createPlayground>>;

// ============================================================================
// HANDLERS
// ============================================================================

function requirePlaygroundAccess(session: Awaited<ReturnType<typeof getCurrentSessionUncached>>) {
	if (!session?.membership) throw new createHttpError.Unauthorized("Sessão não encontrada.");
	if (!session.membership.organizacao.configuracao?.recursos?.iaAtendimento?.acesso) {
		throw new createHttpError.Forbidden("O recurso de atendimento com IA não está disponível no plano da sua organização.");
	}
	if (!session.membership.permissoes.empresa.editar) {
		throw new createHttpError.Forbidden("Você não tem permissão para testar o agente de IA.");
	}
	return session.membership;
}

async function getPlaygroundRoute(_request: NextRequest) {
	const membership = requirePlaygroundAccess(await getCurrentSessionUncached());
	const result = await getPlayground({ organizacaoId: membership.organizacao.id });
	return NextResponse.json(result);
}

async function createPlaygroundRoute(_request: NextRequest) {
	const membership = requirePlaygroundAccess(await getCurrentSessionUncached());
	const result = await createPlayground({ organizacaoId: membership.organizacao.id });
	return NextResponse.json(result);
}

export const GET = appApiHandler({ GET: getPlaygroundRoute });
export const POST = appApiHandler({ POST: createPlaygroundRoute });
