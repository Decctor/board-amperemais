import "dotenv/config";
import { connection } from "@/services/drizzle";

// Diagnóstico read-only: distribuição das vendas com status_venda null em todas as orgs.
// Uso: npx tsx ./scripts/diagnose-null-status-sales.ts

async function main() {
	const distribution = await connection`
		select s.organizacao_id, o.nome as organizacao_nome, s.natureza, s.processamento_origem,
			(s.id_externo like 'POI-%') as is_poi,
			(s.integracao_id is not null) as has_integration,
			(s.valor_total > 0) as positive_value,
			count(*) as total
		from ampmais_sales s
		left join ampmais_organizations o on o.id = s.organizacao_id
		where s.status_venda is null
		group by s.organizacao_id, o.nome, s.natureza, s.processamento_origem, is_poi, has_integration, positive_value
		order by total desc`;
	console.log("=== NULL STATUS_VENDA DISTRIBUTION ===");
	console.log(JSON.stringify(distribution, null, 2));

	await connection.end();
}

main().catch(async (error) => {
	console.error("Falha no diagnóstico:", error);
	await connection.end();
	process.exit(1);
});
