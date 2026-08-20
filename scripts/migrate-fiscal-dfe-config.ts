import "dotenv/config";
import { connection, db } from "@/services/drizzle";
import { organizations } from "@/services/drizzle/schema";
import { eq, isNotNull } from "drizzle-orm";

/**
 * Script temporário (one-shot) do redesign do fiscal inbound: move a flag solta
 * `dfeAutoCiencia` do JSON de configuração fiscal para o novo bloco
 * `dfe: { habilitado, dataInicio, autoCiencia }`. Organizações que nunca tiveram a flag
 * recebem os defaults (`habilitado: false`, `autoCiencia: true`).
 *
 * Descartar este script após rodar. Dry-run por padrão; passe `--apply` para persistir.
 */
async function main() {
	const apply = process.argv.includes("--apply");

	const orgs = await db
		.select({ id: organizations.id, nome: organizations.nome, fiscalConfiguracao: organizations.fiscalConfiguracao })
		.from(organizations)
		.where(isNotNull(organizations.fiscalConfiguracao));

	console.log(`${orgs.length} organizacao(oes) com configuracao fiscal.`);

	let migrated = 0;
	for (const org of orgs) {
		const config = org.fiscalConfiguracao as Record<string, unknown> | null;
		if (!config) continue;
		const legacyAutoCiencia = config.dfeAutoCiencia;
		const alreadyMigrated = typeof config.dfe === "object" && config.dfe !== null;
		if (alreadyMigrated && legacyAutoCiencia === undefined) continue;

		const existingDfe = alreadyMigrated ? (config.dfe as Record<string, unknown>) : {};
		const nextConfig: Record<string, unknown> = {
			...config,
			dfe: {
				habilitado: typeof existingDfe.habilitado === "boolean" ? existingDfe.habilitado : false,
				dataInicio: typeof existingDfe.dataInicio === "string" ? existingDfe.dataInicio : null,
				autoCiencia:
					typeof existingDfe.autoCiencia === "boolean" ? existingDfe.autoCiencia : typeof legacyAutoCiencia === "boolean" ? legacyAutoCiencia : true,
			},
		};
		delete nextConfig.dfeAutoCiencia;

		console.log(`- ${org.nome} (${org.id}): dfeAutoCiencia=${String(legacyAutoCiencia)} -> dfe=${JSON.stringify(nextConfig.dfe)}`);
		if (apply) {
			// Script de transicao: o JSON legado nao valida no schema novo antes desta escrita.
			await db
				.update(organizations)
				.set({ fiscalConfiguracao: nextConfig as (typeof organizations.$inferInsert)["fiscalConfiguracao"] })
				.where(eq(organizations.id, org.id));
		}
		migrated++;
	}

	console.log(apply ? `${migrated} organizacao(oes) migrada(s).` : `${migrated} organizacao(oes) a migrar. Execute novamente com --apply.`);
}

main()
	.catch((error) => {
		console.error("Falha na migracao da configuracao DF-e:", error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await connection.end();
	});
