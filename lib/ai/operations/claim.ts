import type { TAiAgentOperationTypeEnum } from "@/schemas/enums";
import type { DB, DBTransaction } from "@/services/drizzle";
import { aiAgentOperations } from "@/services/drizzle/schema";
import { and, eq, lte, or } from "drizzle-orm";
import { hashAgentOperationInput } from "./hash";

type TDb = DB | DBTransaction;

type TClaimInput = {
	db: TDb;
	organizacaoId: string;
	agenteId: string;
	runId: string;
	tipo: TAiAgentOperationTypeEnum;
	chave: string;
	input: unknown;
	leaseMs: number;
};

export type TAgentOperationClaim =
	| { state: "CLAIMED"; operation: typeof aiAgentOperations.$inferSelect }
	| { state: "REPLAY"; operation: typeof aiAgentOperations.$inferSelect }
	| { state: "IN_PROGRESS"; operation: typeof aiAgentOperations.$inferSelect }
	| { state: "FINAL_FAILURE"; operation: typeof aiAgentOperations.$inferSelect }
	| { state: "CONFLICT"; operation: typeof aiAgentOperations.$inferSelect };

export async function claimAgentOperation(input: TClaimInput): Promise<TAgentOperationClaim> {
	const now = new Date();
	const leaseAte = new Date(now.getTime() + input.leaseMs);
	const inputHash = hashAgentOperationInput(input.input);

	const [inserted] = await input.db
		.insert(aiAgentOperations)
		.values({
			organizacaoId: input.organizacaoId,
			agenteId: input.agenteId,
			runId: input.runId,
			tipo: input.tipo,
			chave: input.chave,
			inputHash,
			status: "PROCESSANDO",
			input: input.input,
			leaseAte,
			dataInicio: now,
		})
		.onConflictDoNothing()
		.returning();

	if (inserted) return { state: "CLAIMED", operation: inserted };

	const existing = await input.db.query.aiAgentOperations.findFirst({
		where: and(
			eq(aiAgentOperations.organizacaoId, input.organizacaoId),
			eq(aiAgentOperations.tipo, input.tipo),
			eq(aiAgentOperations.chave, input.chave),
		),
	});
	if (!existing) throw new Error("Operação do agente não encontrada após conflito de idempotência.");
	if (existing.inputHash !== inputHash) return { state: "CONFLICT", operation: existing };
	if (existing.status === "CONCLUIDA") return { state: "REPLAY", operation: existing };
	if (existing.status === "FALHA_FINAL") return { state: "FINAL_FAILURE", operation: existing };
	if (existing.status === "PROCESSANDO" && existing.leaseAte > now) return { state: "IN_PROGRESS", operation: existing };

	const [reclaimed] = await input.db
		.update(aiAgentOperations)
		.set({
			agenteId: input.agenteId,
			runId: input.runId,
			status: "PROCESSANDO",
			erro: null,
			leaseAte,
			dataInicio: now,
			dataFim: null,
		})
		.where(
			and(
				eq(aiAgentOperations.id, existing.id),
				or(
					eq(aiAgentOperations.status, "FALHA_REPETIVEL"),
					and(eq(aiAgentOperations.status, "PROCESSANDO"), lte(aiAgentOperations.leaseAte, now)),
				),
			),
		)
		.returning();

	if (reclaimed) return { state: "CLAIMED", operation: reclaimed };

	const current = await input.db.query.aiAgentOperations.findFirst({ where: eq(aiAgentOperations.id, existing.id) });
	if (!current) throw new Error("Operação do agente removida durante o claim.");
	if (current.status === "CONCLUIDA") return { state: "REPLAY", operation: current };
	if (current.status === "FALHA_FINAL") return { state: "FINAL_FAILURE", operation: current };
	return { state: "IN_PROGRESS", operation: current };
}
