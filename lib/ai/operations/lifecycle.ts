import type { TAiAgentOperationResourceTypeEnum } from "@/schemas/enums";
import type { DB, DBTransaction } from "@/services/drizzle";
import { aiAgentOperations } from "@/services/drizzle/schema";
import { eq } from "drizzle-orm";

type TDb = DB | DBTransaction;

export async function completeAgentOperation({
	db,
	operationId,
	output,
	resource,
}: {
	db: TDb;
	operationId: string;
	output: unknown;
	resource?: { tipo: TAiAgentOperationResourceTypeEnum; id: string } | null;
}) {
	const [operation] = await db
		.update(aiAgentOperations)
		.set({
			status: "CONCLUIDA",
			output,
			...(resource ? { recursoTipo: resource.tipo, recursoId: resource.id } : {}),
			erro: null,
			dataFim: new Date(),
		})
		.where(eq(aiAgentOperations.id, operationId))
		.returning();
	if (!operation) throw new Error("Operação do agente não encontrada para conclusão.");
	return operation;
}

export async function failAgentOperation({
	db,
	operationId,
	error,
	retryable,
}: {
	db: TDb;
	operationId: string;
	error: unknown;
	retryable: boolean;
}) {
	await db
		.update(aiAgentOperations)
		.set({
			status: retryable ? "FALHA_REPETIVEL" : "FALHA_FINAL",
			erro: error instanceof Error ? error.message : String(error),
			dataFim: new Date(),
		})
		.where(eq(aiAgentOperations.id, operationId));
}
