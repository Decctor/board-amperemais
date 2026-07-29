import { ensureOrganizationAgent } from "@/lib/ai/agent/provisioning";
import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { handleSimpleChildRowsProcessing } from "@/lib/db-utils";
import { UpdateAiAgentKnowledgeSchema, UpdateAiAgentSchema } from "@/schemas/ai-agents";
import { db } from "@/services/drizzle";
import { aiAgentKnowledge, aiAgents } from "@/services/drizzle/schema";
import { and, asc, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

const UpdateAiAgentInputSchema = z.object({
	agente: UpdateAiAgentSchema,
	conhecimento: z.array(UpdateAiAgentKnowledgeSchema),
});
export type TUpdateAiAgentInput = z.infer<typeof UpdateAiAgentInputSchema>;

// ============================================================================
// SERVICES
// ============================================================================

async function getAiAgent({ organizacaoId }: { organizacaoId: string }) {
	// Provisionamento lazy: o primeiro acesso à tela cria o agente da organização.
	const agente = await ensureOrganizationAgent(db, organizacaoId);

	const conhecimento = await db.query.aiAgentKnowledge.findMany({
		where: eq(aiAgentKnowledge.agenteId, agente.id),
		orderBy: [asc(aiAgentKnowledge.ordem), asc(aiAgentKnowledge.dataInsercao)],
	});

	return {
		data: { agente, conhecimento },
		message: "Agente de IA carregado com sucesso.",
	};
}
export type TGetAiAgentOutput = Awaited<ReturnType<typeof getAiAgent>>;

async function updateAiAgent({ input, organizacaoId }: { input: TUpdateAiAgentInput; organizacaoId: string }) {
	const agente = await ensureOrganizationAgent(db, organizacaoId);

	await db.transaction(async (tx) => {
		await tx
			.update(aiAgents)
			.set({
				nome: input.agente.nome,
				status: input.agente.status,
				instrucoes: input.agente.instrucoes,
				modeloConfig: input.agente.modeloConfig,
				capacidades: input.agente.capacidades,
			})
			.where(and(eq(aiAgents.id, agente.id), eq(aiAgents.organizacaoId, organizacaoId)));

		await handleSimpleChildRowsProcessing({
			trx: tx,
			table: aiAgentKnowledge,
			entities: input.conhecimento,
			fatherEntityKey: "agenteId",
			fatherEntityId: agente.id,
			organizacaoId,
		});
	});

	return {
		data: { agenteId: agente.id },
		message: "Agente de IA atualizado com sucesso.",
	};
}
export type TUpdateAiAgentOutput = Awaited<ReturnType<typeof updateAiAgent>>;

// ============================================================================
// HANDLERS
// ============================================================================

/**
 * Recurso gateado pela capability de plano `iaAtendimento.acesso` — a mesma que os webhooks
 * checam antes de executar o agente. Sem ela, configurar não teria efeito.
 */
function requireAiAgentAccess(session: Awaited<ReturnType<typeof getCurrentSessionUncached>>) {
	if (!session?.membership) throw new createHttpError.Unauthorized("Sessão não encontrada.");
	if (!session.membership.organizacao.configuracao?.recursos?.iaAtendimento?.acesso) {
		throw new createHttpError.Forbidden("O recurso de atendimento com IA não está disponível no plano da sua organização.");
	}
	return session.membership;
}

async function getAiAgentRoute(_request: NextRequest) {
	const session = await getCurrentSessionUncached();
	const membership = requireAiAgentAccess(session);
	if (!membership.permissoes.empresa.visualizar) throw new createHttpError.Forbidden("Você não tem permissão para visualizar o agente de IA.");

	const result = await getAiAgent({ organizacaoId: membership.organizacao.id });
	return NextResponse.json(result);
}

async function updateAiAgentRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	const membership = requireAiAgentAccess(session);
	if (!membership.permissoes.empresa.editar) throw new createHttpError.Forbidden("Você não tem permissão para editar o agente de IA.");

	const input = UpdateAiAgentInputSchema.parse(await request.json());
	const result = await updateAiAgent({ input, organizacaoId: membership.organizacao.id });
	return NextResponse.json(result);
}

export const GET = appApiHandler({ GET: getAiAgentRoute });
export const PUT = appApiHandler({ PUT: updateAiAgentRoute });
