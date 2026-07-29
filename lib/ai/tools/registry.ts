import type { TAiAgentToolNameEnum } from "@/schemas/enums";
import { aiAgentToolCalls } from "@/services/drizzle/schema";
import { eq } from "drizzle-orm";
import { atendimentoTransferirParaHumanoTool } from "./atendimento.transferir-para-humano";
import { cashbackConsultarTool } from "./cashback.consultar";
import { clientesConsultarComprasTool } from "./clientes.consultar-compras";
import { produtosConsultarTool } from "./produtos.consultar";
import { assertToolEnabled, isToolEnabled } from "./guards";
import type { TAgentToolContext, TAgentToolDefinitionErased, TAgentToolOutput } from "./types";
import { cuponsConsultarTool } from "./cupons.consultar";

/**
 * Registro único de ferramentas. Adicionar uma ferramenta são 3 passos:
 *  1. criar `lib/ai/tools/<dominio>.<acao>.ts` com `defineAgentTool`;
 *  2. adicionar o nome em `AiAgentToolNameEnum` (`schemas/enums.ts`) — o que já a inclui em
 *     `AiAgentFerramentasConfigSchema`;
 *  3. registrar aqui.
 */
export const AGENT_TOOL_REGISTRY: Record<TAiAgentToolNameEnum, TAgentToolDefinitionErased> = {
	"clientes.consultar_compras": clientesConsultarComprasTool,
	"produtos.consultar": produtosConsultarTool,
	"cashback.consultar": cashbackConsultarTool,
	"cupons.consultar": cuponsConsultarTool,
	"atendimento.transferir_para_humano": atendimentoTransferirParaHumanoTool,
};

/** O AI SDK não aceita `.` em nome de ferramenta. */
export function toAISdkToolName(name: TAiAgentToolNameEnum): string {
	return name.replace(/\./g, "_");
}

export function getEnabledAgentTools(capacidades: TAgentToolContext["capacidades"]): TAgentToolDefinitionErased[] {
	return Object.values(AGENT_TOOL_REGISTRY).filter((definition) => isToolEnabled(capacidades, definition.name));
}

function normalizeToolOutput(raw: unknown, fallbackMessage: string): TAgentToolOutput {
	if (raw && typeof raw === "object" && "success" in raw && "message" in raw) return raw as TAgentToolOutput;
	return { success: true, message: fallbackMessage, result: raw };
}

/**
 * Pipeline de execução com auditoria embutida — a peça central do módulo.
 *
 * A linha em `ai_agent_tool_calls` nasce **antes** do `execute`, para que uma ferramenta que
 * trave, estoure timeout ou derrube o processo ainda deixe rastro do que foi tentado e com
 * quais argumentos.
 *
 * O erro é persistido e **relançado**: o AI SDK o devolve ao modelo, que pode se recuperar
 * (refinar o filtro, tentar outra ferramenta) dentro da mesma execução.
 */
export async function executeAgentTool({
	context,
	definition,
	input,
}: {
	context: TAgentToolContext;
	definition: TAgentToolDefinitionErased;
	input: unknown;
}): Promise<TAgentToolOutput> {
	const parsedInput = definition.inputSchema.parse(input);

	const [toolCall] = await context.db
		.insert(aiAgentToolCalls)
		.values({
			organizacaoId: context.organizacaoId,
			runId: context.run.id,
			agenteId: context.agent.id,
			ferramentaNome: definition.name,
			status: "EXECUTANDO",
			input: parsedInput,
			dataExecucao: new Date(),
		})
		.returning({ id: aiAgentToolCalls.id });

	if (!toolCall) throw new Error("Erro ao registrar a chamada de ferramenta.");

	try {
		assertToolEnabled(context.capacidades, definition.name);
		// Cast único do input apagado: `parsedInput` já passou pelo `inputSchema` da ferramenta.
		const execute = definition.execute as (input: unknown, context: TAgentToolContext) => Promise<TAgentToolOutput>;
		const rawOutput = await execute(parsedInput, context);
		const output = normalizeToolOutput(rawOutput, `Ferramenta ${definition.name} executada com sucesso.`);
		await context.db.update(aiAgentToolCalls).set({ status: "CONCLUIDO", output }).where(eq(aiAgentToolCalls.id, toolCall.id));
		return output;
	} catch (error) {
		await context.db
			.update(aiAgentToolCalls)
			.set({ status: "FALHA", erro: error instanceof Error ? error.message : String(error) })
			.where(eq(aiAgentToolCalls.id, toolCall.id));
		throw error;
	}
}

/**
 * Adapta as ferramentas habilitadas para o formato do AI SDK. O contexto viaja por closure —
 * nunca pelo modelo.
 */
export function toAISdkTools(context: TAgentToolContext) {
	const entries = getEnabledAgentTools(context.capacidades).map((definition) => [
		toAISdkToolName(definition.name),
		{
			description: definition.description,
			inputSchema: definition.inputSchema,
			execute: async (input: unknown) => executeAgentTool({ context, definition, input }),
		},
	]);
	return Object.fromEntries(entries);
}
