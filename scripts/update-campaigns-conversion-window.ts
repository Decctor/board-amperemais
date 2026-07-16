import "dotenv/config";
import { connection, db } from "@/services/drizzle";
import { campaigns } from "@/services/drizzle/schema";
import { ne, sql } from "drizzle-orm";

/**
 * Atualiza a janela de conversão (atribuicao_janela_dias) de todas as campanhas
 * para 7 dias (o padrão anterior era 14).
 *
 * Dry-run por padrão; passe `--apply` para persistir.
 */
const NEW_WINDOW_DAYS = 7;

async function main() {
	const apply = process.argv.includes("--apply");

	const distribution = await db
		.select({
			janelaDias: campaigns.atribuicaoJanelaDias,
			total: sql<number>`count(*)::int`,
		})
		.from(campaigns)
		.groupBy(campaigns.atribuicaoJanelaDias)
		.orderBy(campaigns.atribuicaoJanelaDias);

	console.log("Distribuição atual de janela de conversão:");
	for (const row of distribution) {
		console.log(`  ${row.janelaDias} dia(s): ${row.total} campanha(s)`);
	}

	const pendingTotal = distribution
		.filter((row) => row.janelaDias !== NEW_WINDOW_DAYS)
		.reduce((acc, row) => acc + row.total, 0);

	if (pendingTotal === 0) {
		console.log(`Todas as campanhas já usam janela de ${NEW_WINDOW_DAYS} dias. Nada a fazer.`);
		return;
	}

	if (!apply) {
		console.log(`${pendingTotal} campanha(s) seriam atualizadas para ${NEW_WINDOW_DAYS} dias.`);
		console.log("Execute novamente com --apply para persistir.");
		return;
	}

	const result = await db
		.update(campaigns)
		.set({ atribuicaoJanelaDias: NEW_WINDOW_DAYS })
		.where(ne(campaigns.atribuicaoJanelaDias, NEW_WINDOW_DAYS))
		.returning({ id: campaigns.id });

	console.log(`${result.length} campanha(s) atualizada(s) para janela de ${NEW_WINDOW_DAYS} dias.`);
}

main()
	.catch((error) => {
		console.error("Falha ao atualizar janela de conversão das campanhas:", error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await connection.end();
	});
