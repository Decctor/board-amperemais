import { and, eq } from "drizzle-orm";
import { db } from "@/services/drizzle";
import { financialRecurringRules } from "@/services/drizzle/schema";
import { computeRecurringMonthlyCommitments } from "./recurring";

/** Compromissos recorrentes mensais (entradas/saídas normalizadas) das regras ativas da organização. */
export async function getRecurringMonthlyCommitmentsForOrganization(organizationId: string) {
	const activeRules = await db.query.financialRecurringRules.findMany({
		where: and(eq(financialRecurringRules.organizacaoId, organizationId), eq(financialRecurringRules.status, "ATIVA")),
		columns: { config: true, templateTransacoes: true },
	});
	return computeRecurringMonthlyCommitments(activeRules);
}
