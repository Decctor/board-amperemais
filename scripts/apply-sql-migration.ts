import "dotenv/config";
import { readFileSync } from "node:fs";
import { connection } from "@/services/drizzle";

// Aplica um arquivo SQL numerado de drizzle/ diretamente no banco.
// Necessario porque `drizzle-kit push`/`generate` travam em prompts interativos de drift.
// Uso: npx tsx ./scripts/apply-sql-migration.ts drizzle/0045_tabs_service_points.sql

async function main() {
	const filePath = process.argv[2];
	if (!filePath) {
		console.error("Uso: tsx scripts/apply-sql-migration.ts <caminho-do-sql>");
		process.exit(1);
	}

	const sqlContent = readFileSync(filePath, "utf-8");
	console.log(`Aplicando ${filePath}...`);

	await connection.begin(async (tx) => {
		await tx.unsafe(sqlContent);
	});

	console.log("Migracao aplicada com sucesso.");
	await connection.end();
}

main().catch(async (error) => {
	console.error("Falha ao aplicar migracao:", error);
	await connection.end();
	process.exit(1);
});
