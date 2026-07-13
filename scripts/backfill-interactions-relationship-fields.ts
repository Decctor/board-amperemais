import "dotenv/config";
import { connection, db } from "@/services/drizzle";
import { interactions } from "@/services/drizzle/schema";
import { and, isNull, sql } from "drizzle-orm";

/**
 * Backfill dos campos de relacionamento em `interactions` (docs/seller-routine-hub-design.md §3.2).
 *
 * Toda linha existente pertence à máquina de entrega de campanhas (só há criação automatizada
 * hoje), então: `iniciadoPor='AUTOMACAO'`, `direcao='SAIDA'`, `status='REALIZADA'` quando enviada,
 * `dataInteracao = COALESCE(dataEnvio, dataExecucao)` e `canal` derivado de `metadados.channelsSent`.
 * A partir do backfill, `dataInteracao` é a âncora canônica de cadência/timeline.
 *
 * Dry-run por padrão; passe `--apply` para persistir.
 */
async function main() {
	const apply = process.argv.includes("--apply");

	const pendingWhere = and(isNull(interactions.iniciadoPor), isNull(interactions.dataInteracao));
	const [pending] = await db
		.select({ total: sql<number>`count(*)` })
		.from(interactions)
		.where(pendingWhere);
	console.log(`${pending?.total ?? 0} interação(ões) sem campos de relacionamento.`);

	if (!Number(pending?.total)) {
		console.log("Nenhum backfill pendente.");
		return;
	}

	if (!apply) {
		console.log("Execute novamente com --apply para preencher os campos de relacionamento.");
		return;
	}

	const result = await db.execute(sql`
		update ${interactions}
		set
			iniciado_por = 'AUTOMACAO',
			direcao = 'SAIDA',
			canal = case
				when metadados->'channelsSent' @> '"WHATSAPP"'::jsonb then 'WHATSAPP'::interaction_channel
				when metadados->'channelsSent' @> '"EMAIL"'::jsonb then 'EMAIL'::interaction_channel
				when tipo = 'ENVIO-EMAIL' then 'EMAIL'::interaction_channel
				else 'WHATSAPP'::interaction_channel
			end,
			data_interacao = coalesce(data_envio, data_execucao),
			status = case when coalesce(data_envio, data_execucao) is not null then 'REALIZADA'::interaction_lifecycle_status else null end
		where iniciado_por is null and data_interacao is null
	`);

	console.log(`Backfill aplicado. ${result.count} linha(s) atualizada(s).`);
}

main()
	.catch((error) => {
		console.error("Falha no backfill dos campos de relacionamento de interactions:", error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await connection.end();
	});
