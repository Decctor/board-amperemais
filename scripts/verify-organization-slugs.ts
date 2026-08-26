import "dotenv/config";
import { connection } from "@/services/drizzle";

/**
 * Verificação da fase 2 do plano de slugs (docs/dev-planning/org-slug-shop-links-plan.md):
 * zero orgs sem slug e zero slugs duplicados. Rodar antes de tornar a coluna NOT NULL + unique
 * (fase 4). Sai com código 1 se alguma condição falhar.
 */
async function main() {
	const [{ nulls }] = await connection`SELECT count(*)::int AS nulls FROM ampmais_organizations WHERE slug IS NULL`;
	const dupes = await connection`SELECT slug, count(*)::int AS n FROM ampmais_organizations WHERE slug IS NOT NULL GROUP BY slug HAVING count(*) > 1`;
	const [{ total }] = await connection`SELECT count(*)::int AS total FROM ampmais_organizations`;

	console.log(`total=${total} sem_slug=${nulls} duplicados=${dupes.length}`);
	for (const dupe of dupes) console.log(`DUPLICADO: ${dupe.slug} (${dupe.n}x)`);

	await connection.end();
	if (nulls > 0 || dupes.length > 0) process.exitCode = 1;
}

main().catch(async (error) => {
	console.error("Falha na verificacao de slugs:", error);
	await connection.end();
	process.exitCode = 1;
});
