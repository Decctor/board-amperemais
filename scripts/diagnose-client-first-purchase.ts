import "dotenv/config";
import { connection } from "@/services/drizzle";

// Diagnóstico read-only: por que uma campanha PRIMEIRA-COMPRA disparou para um cliente
// que já tinha compras. Uso: npx tsx ./scripts/diagnose-client-first-purchase.ts <clientId>

async function main() {
	const clientId = process.argv[2];
	if (!clientId) {
		console.error("Uso: tsx scripts/diagnose-client-first-purchase.ts <clientId>");
		process.exit(1);
	}

	const clientRows = await connection`
		select id, nome, organizacao_id, data_insercao, canal_aquisicao,
			primeira_compra_data, primeira_compra_id, ultima_compra_data, ultima_compra_id,
			metadata_total_compras, metadata_valor_total_compras, metadata_ultima_atualizacao
		from ampmais_clients where id = ${clientId}`;
	console.log("=== CLIENT ===");
	console.log(JSON.stringify(clientRows, null, 2));

	const sales = await connection`
		select id, id_externo, integracao_id, data_venda, valor_total, natureza, situacao, canal
		from ampmais_sales where cliente_id = ${clientId}
		order by data_venda asc`;
	console.log(`=== SALES (${sales.length}) ===`);
	console.log(JSON.stringify(sales, null, 2));

	const inters = await connection`
		select i.id, i.campanha_id, c.titulo as campanha_titulo, c.gatilho_tipo, i.tipo,
			i.descricao, i.data_insercao
		from ampmais_interactions i
		left join ampmais_campaigns c on c.id = i.campanha_id
		where i.cliente_id = ${clientId}
		order by i.data_insercao asc`;
	console.log(`=== INTERACTIONS (${inters.length}) ===`);
	console.log(JSON.stringify(inters, null, 2));

	await connection.end();
}

main().catch(async (error) => {
	console.error("Falha no diagnóstico:", error);
	await connection.end();
	process.exit(1);
});
