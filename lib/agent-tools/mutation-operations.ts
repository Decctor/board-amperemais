import { hashAgentOperationInput } from "@/lib/ai/operations/hash";
import { db } from "@/services/drizzle";
import { accessEvents } from "@/services/drizzle/schema";
import { and, eq, sql } from "drizzle-orm";
import createHttpError from "http-errors";

type TOperationMetadata = {
	ferramenta: string;
	chaveIdempotencia: string;
	inputHash: string;
	status: "PROCESSANDO" | "CONCLUIDA" | "FALHA";
	output?: unknown;
	erro?: string;
};

export async function claimMcpMutationOperation({
	principalId,
	credentialId,
	organizationId,
	toolName,
	idempotencyKey,
	input,
}: {
	principalId: string;
	credentialId: string;
	organizationId: string;
	toolName: string;
	idempotencyKey: string;
	input: unknown;
}) {
	const inputHash = hashAgentOperationInput(input);
	const metadata: TOperationMetadata = { ferramenta: toolName, chaveIdempotencia: idempotencyKey, inputHash, status: "PROCESSANDO" };
	const [inserted] = await db
		.insert(accessEvents)
		.values({
			organizacaoId: organizationId,
			principalId,
			credencialId: credentialId,
			tipo: "OPERACAO_AGENTE",
			metadados: metadata,
		})
		.onConflictDoNothing()
		.returning({ id: accessEvents.id });
	if (inserted) return { state: "CLAIMED" as const, operationId: inserted.id };

	const existing = await db.query.accessEvents.findFirst({
		where: and(
			eq(accessEvents.principalId, principalId),
			eq(accessEvents.tipo, "OPERACAO_AGENTE"),
			sql`${accessEvents.metadados}->>'ferramenta' = ${toolName}`,
			sql`${accessEvents.metadados}->>'chaveIdempotencia' = ${idempotencyKey}`,
		),
	});
	if (!existing) throw new createHttpError.Conflict("Não foi possível recuperar a operação idempotente.");
	const existingMetadata = existing.metadados as TOperationMetadata;
	if (existingMetadata.inputHash !== inputHash) throw new createHttpError.Conflict("A chave de idempotência já foi usada com argumentos diferentes.");
	if (existingMetadata.status === "CONCLUIDA") return { state: "REPLAY" as const, output: existingMetadata.output };
	if (existingMetadata.status === "PROCESSANDO") throw new createHttpError.Conflict("A mesma operação já está em processamento.");

	const [reclaimed] = await db
		.update(accessEvents)
		.set({ metadados: metadata, dataInsercao: new Date() })
		.where(and(eq(accessEvents.id, existing.id), sql`${accessEvents.metadados}->>'status' = 'FALHA'`))
		.returning({ id: accessEvents.id });
	if (!reclaimed) throw new createHttpError.Conflict("A mesma operação já foi retomada por outra chamada.");
	return { state: "CLAIMED" as const, operationId: reclaimed.id };
}

export async function completeMcpMutationOperation(operationId: string, output: unknown) {
	await db
		.update(accessEvents)
		.set({ metadados: sql`${accessEvents.metadados} || ${JSON.stringify({ status: "CONCLUIDA", output })}::jsonb` })
		.where(eq(accessEvents.id, operationId));
}

export async function failMcpMutationOperation(operationId: string, error: unknown) {
	await db
		.update(accessEvents)
		.set({
			metadados: sql`${accessEvents.metadados} || ${JSON.stringify({ status: "FALHA", erro: error instanceof Error ? error.message : "Erro desconhecido" })}::jsonb`,
		})
		.where(eq(accessEvents.id, operationId));
}
