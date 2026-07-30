import type { TAiAgentToolNameEnum } from "@/schemas/enums";
import { aiAgentOperations, aiAgentToolCalls } from "@/services/drizzle/schema";
import { eq } from "drizzle-orm";
import { claimAgentOperation } from "../operations/claim";
import { hashAgentOperationInput } from "../operations/hash";
import { completeAgentOperation, failAgentOperation } from "../operations/lifecycle";
import { cashbackTool } from "./cashback";
import { couponsTool } from "./coupons";
import { customerPurchasesTool } from "./customer-purchases";
import { assertToolEnabled, isToolEnabled } from "./guards";
import { humanHandoffTool } from "./human-handoff";
import { productsTool } from "./products";
import { quotesTool } from "./quotes";
import { createAgentToolExecutionGuard } from "./tool-execution-guard";
import type { TAgentToolContext, TAgentToolDefinitionErased, TAgentToolOutput } from "./types";

/**
 * Registro único de ferramentas. Adicionar uma ferramenta são 3 passos:
 *  1. criar `lib/ai/tools/<dominio-em-ingles>.ts` com `defineAgentTool`;
 *  2. adicionar o nome em `AiAgentToolNameEnum` (`schemas/enums.ts`) — o que já a inclui em
 *     `AiAgentFerramentasConfigSchema`;
 *  3. registrar aqui.
 *
 * O arquivo e a const são inglês (código); o `name` da ferramenta é português porque viaja
 * como dado — vai para o modelo e é persistido em `ai_agent_tool_calls.ferramentaNome`.
 */
export const AGENT_TOOL_REGISTRY: Record<TAiAgentToolNameEnum, TAgentToolDefinitionErased> = {
	"clientes.consultar_compras": customerPurchasesTool,
	"produtos.consultar": productsTool,
	"orcamentos.criar": quotesTool,
	"cashback.consultar": cashbackTool,
	"cupons.consultar": couponsTool,
	"atendimento.transferir_para_humano": humanHandoffTool,
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

	let claimedOperationId: string | null = null;
	try {
		assertToolEnabled(context.capacidades, definition.name);
		let executionContext: TAgentToolContext = { ...context, toolCall: { id: toolCall.id } };

		if (definition.operation) {
			const claim = await claimAgentOperation({
				db: context.db,
				organizacaoId: context.organizacaoId,
				agenteId: context.agent.id,
				runId: context.run.id,
				tipo: definition.operation.tipo,
				chave: context.run.mensagemGatilhoId ?? context.run.id,
				input: parsedInput,
				leaseMs: definition.operation.leaseMs,
			});
			await context.db.update(aiAgentToolCalls).set({ operacaoId: claim.operation.id }).where(eq(aiAgentToolCalls.id, toolCall.id));

			if (claim.state !== "CLAIMED") {
				const output: TAgentToolOutput =
					claim.state === "REPLAY"
						? normalizeToolOutput(claim.operation.output, "Resultado idempotente recuperado.")
						: claim.state === "IN_PROGRESS"
							? {
									success: false,
									message: "Essa operação já está em processamento.",
									result: { codigo: "OPERACAO_EM_ANDAMENTO" },
								}
							: claim.state === "CONFLICT"
								? {
										success: false,
										message: "A mesma solicitação já foi usada com dados diferentes.",
										result: { codigo: "CHAVE_IDEMPOTENCIA_DIVERGENTE" },
									}
								: {
										success: false,
										message: "A operação não pode ser repetida.",
										result: {
											codigo: "OPERACAO_FALHOU",
											...(claim.operation.output === null ? {} : { detalhe: claim.operation.output }),
										},
									};
				await context.db.update(aiAgentToolCalls).set({ status: "CONCLUIDO", output }).where(eq(aiAgentToolCalls.id, toolCall.id));
				return output;
			}

			claimedOperationId = claim.operation.id;
			executionContext = { ...executionContext, operation: { id: claim.operation.id, tipo: claim.operation.tipo } };
		}

		// Cast único do input apagado: `parsedInput` já passou pelo `inputSchema` da ferramenta.
		const execute = definition.execute as (input: unknown, context: TAgentToolContext) => Promise<TAgentToolOutput>;
		const rawOutput = await execute(parsedInput, executionContext);
		const output = normalizeToolOutput(rawOutput, `Ferramenta ${definition.name} executada com sucesso.`);
		if (claimedOperationId) {
			const operation = await context.db.query.aiAgentOperations.findFirst({ where: eq(aiAgentOperations.id, claimedOperationId) });
			if (operation?.status === "PROCESSANDO") {
				await completeAgentOperation({ db: context.db, operationId: claimedOperationId, output });
			}
		}
		await context.db.update(aiAgentToolCalls).set({ status: "CONCLUIDO", output }).where(eq(aiAgentToolCalls.id, toolCall.id));
		return output;
	} catch (error) {
		if (claimedOperationId) {
			try {
				await failAgentOperation({ db: context.db, operationId: claimedOperationId, error, retryable: true });
			} catch {
				// A falha original continua sendo a causa da tool call; a operação expirada poderá ser retomada pelo lease.
			}
		}
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
	const executeGuarded = createAgentToolExecutionGuard(context.capacidades.limites.maxChamadasFerramentasPorRun);
	const entries = getEnabledAgentTools(context.capacidades).map((definition) => [
		toAISdkToolName(definition.name),
		{
			description: definition.description,
			inputSchema: definition.inputSchema,
			execute: async (input: unknown) => {
				const parsedInput = definition.inputSchema.parse(input);
				const key = `${definition.name}:${hashAgentOperationInput(parsedInput)}`;
				return executeGuarded(key, () => executeAgentTool({ context, definition, input: parsedInput }));
			},
		},
	]);
	return Object.fromEntries(entries);
}
