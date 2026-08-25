import "dotenv/config";
import { connection } from "@/services/drizzle";

// Diagnóstico read-only complementar: status_venda das vendas do cliente e distribuição
// de status na organização. Uso: npx tsx ./scripts/diagnose-client-first-purchase-2.ts <clientId>

async function main() {
	const clientId = process.argv[2];
	if (!clientId) {
		console.error("Uso: tsx scripts/diagnose-client-first-purchase-2.ts <clientId>");
		process.exit(1);
	}

	const sales = await connection`
		select id, id_externo, data_venda, valor_total, status_venda
		from ampmais_sales where cliente_id = ${clientId}
		order by data_venda asc`;
	console.log("=== CLIENT SALES STATUS ===");
	console.log(JSON.stringify(sales, null, 2));

	const orgStatus = await connection`
		select s.status_venda, count(*) as total
		from ampmais_sales s
		join ampmais_clients c on c.id = s.cliente_id
		where c.organizacao_id = (select organizacao_id from ampmais_clients where id = ${clientId})
		group by s.status_venda
		order by total desc`;
	console.log("=== ORG SALES STATUS DISTRIBUTION ===");
	console.log(JSON.stringify(orgStatus, null, 2));

	await connection.end();
}

main().catch(async (error) => {
	console.error("Falha no diagnóstico:", error);
	await connection.end();
	process.exit(1);
});
