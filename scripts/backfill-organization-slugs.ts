import "dotenv/config";
import { buildOrganizationSlugBase } from "@/lib/organizations/slug";
import { connection, db } from "@/services/drizzle";
import { organizations } from "@/services/drizzle/schema";
import { asc, eq, isNotNull, isNull } from "drizzle-orm";

/**
 * Backfill de `slug` para organizações criadas antes do endereço público da loja existir
 * (docs/dev-planning/org-slug-shop-links-plan.md, fase 2). Gera o slug a partir do nome e
 * resolve colisões com sufixo numérico, em ordem determinística de `data_insercao` para que
 * reexecuções produzam o mesmo resultado.
 *
 * Dry-run por padrão; passe `--apply` para persistir.
 */
async function main() {
	const apply = process.argv.includes("--apply");

	const existing = await db.select({ slug: organizations.slug }).from(organizations).where(isNotNull(organizations.slug));
	const usedSlugs = new Set(existing.map((row) => row.slug).filter((slug): slug is string => Boolean(slug)));

	const pending = await db
		.select({ id: organizations.id, nome: organizations.nome })
		.from(organizations)
		.where(isNull(organizations.slug))
		.orderBy(asc(organizations.dataInsercao));

	console.log(`${pending.length} organizacao(oes) sem slug; ${usedSlugs.size} slug(s) ja em uso.`);

	if (pending.length === 0) {
		console.log("Nenhum backfill pendente.");
		return;
	}

	const assignments: { id: string; nome: string; slug: string }[] = [];
	for (const org of pending) {
		const baseSlug = buildOrganizationSlugBase(org.nome);
		let candidate = baseSlug;
		let suffix = 1;
		while (usedSlugs.has(candidate)) {
			suffix += 1;
			const suffixPart = `-${suffix}`;
			candidate = `${baseSlug.slice(0, 48 - suffixPart.length)}${suffixPart}`;
		}
		usedSlugs.add(candidate);
		assignments.push({ id: org.id, nome: org.nome, slug: candidate });
		console.log(`${org.nome} (${org.id}) -> ${candidate}`);
	}

	if (!apply) {
		console.log("Dry-run: execute novamente com --apply para persistir os slugs acima.");
		return;
	}

	let updated = 0;
	for (const assignment of assignments) {
		await db.update(organizations).set({ slug: assignment.slug }).where(eq(organizations.id, assignment.id));
		updated += 1;
	}
	console.log(`${updated} organizacao(oes) atualizada(s).`);
}

main()
	.catch((error) => {
		console.error("Falha no backfill de slugs de organizacoes:", error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await connection.end();
	});
