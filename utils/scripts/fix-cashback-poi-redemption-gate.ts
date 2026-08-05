import "dotenv/config";
import { connection, db } from "@/services/drizzle";
import { cashbackPrograms } from "@/services/drizzle/schema";
import { eq, sql } from "drizzle-orm";

/**
 * TEMPORÁRIO / ONE-OFF — reparo pontual, remover depois de rodado.
 *
 * A migração 0069 nasceu com um backfill que desligava `resgate_permitir_via_ponto_integracao`
 * para as organizações no tier ERP. O backfill estava errado: antes do gate existir, o resgate
 * pelo Ponto de Interação era SEMPRE permitido, então o estado que preserva o comportamento é
 * `true` para todo mundo — quem opera pelo ERP desliga o gate na configuração do programa.
 *
 * Este script devolve TODAS as linhas para `true`, reparando os bancos onde a 0069 original
 * já rodou.
 *
 * Uso: npx tsx ./utils/scripts/fix-cashback-poi-redemption-gate.ts
 */

async function main() {
	const [pending] = await db
		.select({ total: sql<number>`count(*)::int` })
		.from(cashbackPrograms)
		.where(eq(cashbackPrograms.resgatePermitirViaPontoIntegracao, false));

	console.log(`${pending?.total ?? 0} programa(s) de cashback com resgate pelo Ponto de Interação bloqueado.`);

	const updated = await db
		.update(cashbackPrograms)
		.set({ resgatePermitirViaPontoIntegracao: true })
		.returning({ id: cashbackPrograms.id });

	console.log(`${updated.length} programa(s) atualizado(s) para resgate pelo Ponto de Interação permitido.`);
}

main()
	.then(async () => {
		await connection.end();
	})
	.catch(async (error) => {
		console.error("Falha ao reparar o gate de resgate pelo Ponto de Interação:", error);
		await connection.end();
		process.exit(1);
	});
