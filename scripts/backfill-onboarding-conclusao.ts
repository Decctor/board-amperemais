import "dotenv/config";
import { connection, db } from "@/services/drizzle";
import { organizations } from "@/services/drizzle/schema";
import { isNull, sql } from "drizzle-orm";

/**
 * Backfill `data_onboarding_conclusao` for organizations created before the deep
 * onboarding flow existed. Any organization without a conclusion timestamp is
 * treated as already concluded (set to its `data_insercao`) so existing tenants
 * are never bounced back into the onboarding flow by the new dashboard gating.
 *
 * Dry-run by default; pass `--apply` to persist.
 */
async function main() {
	const apply = process.argv.includes("--apply");

	const pending = await db
		.select({ id: organizations.id })
		.from(organizations)
		.where(isNull(organizations.dataOnboardingConclusao));

	console.log(`${pending.length} organizacao(oes) sem data de conclusao de onboarding.`);

	if (pending.length === 0) {
		console.log("Nenhum backfill pendente.");
		return;
	}

	if (!apply) {
		console.log("Execute novamente com --apply para preencher data_onboarding_conclusao com data_insercao.");
		return;
	}

	const result = await db
		.update(organizations)
		.set({ dataOnboardingConclusao: sql`${organizations.dataInsercao}` })
		.where(isNull(organizations.dataOnboardingConclusao))
		.returning({ id: organizations.id });

	console.log(`${result.length} organizacao(oes) atualizada(s).`);
}

main()
	.catch((error) => {
		console.error("Falha no backfill de conclusao de onboarding:", error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await connection.end();
	});
