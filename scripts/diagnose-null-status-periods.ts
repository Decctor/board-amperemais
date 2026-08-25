import "dotenv/config";
import { connection } from "@/services/drizzle";

// Diagnóstico read-only: período e composição das vendas que o backfill carimbaria.
// Uso: npx tsx ./scripts/diagnose-null-status-periods.ts <orgId> [<orgId> ...]

const STAMP_CONDITION = `
	status_venda is null
	and (
		(natureza = 'SN01' and valor_total > 0)
		or (id_externo like 'POI-%' and integracao_id is null)
	)
`;

async function main() {
	const orgIds = process.argv.slice(2);
	if (orgIds.length === 0) {
		console.error("Uso: tsx scripts/diagnose-null-status-periods.ts <orgId> [<orgId> ...]");
		process.exit(1);
	}

	for (const orgId of orgIds) {
		const [org] = await connection`select id, nome from ampmais_organizations where id = ${orgId}`;
		console.log(`\n===== ${org?.nome ?? "(desconhecida)"} (${orgId}) =====`);

		// 1. Composição por natureza/valor das linhas que seriam carimbadas.
		const composition = await connection.unsafe(
			`
			select natureza,
				(valor_total > 0) as positive_value,
				(id_externo like 'POI-%' and integracao_id is null) as is_poi_internal,
				count(*) as total,
				min(data_venda) as first_sale,
				max(data_venda) as last_sale
			from ampmais_sales
			where organizacao_id = $1 and ${STAMP_CONDITION}
			group by natureza, positive_value, is_poi_internal
			order by total desc`,
			[orgId],
		);
		console.log("--- COMPOSIÇÃO DAS LINHAS A CARIMBAR ---");
		console.table(
			composition.map((row) => ({
				natureza: row.natureza,
				valorPositivo: row.positive_value,
				poiInterno: row.is_poi_internal,
				total: Number(row.total),
				primeiraVenda: row.first_sale,
				ultimaVenda: row.last_sale,
			})),
		);

		// 2. Distribuição por mês — mostra o período coberto.
		const byMonth = await connection.unsafe(
			`
			select to_char(date_trunc('month', data_venda), 'YYYY-MM') as mes,
				count(*) as total,
				sum(valor_total)::numeric(14,2) as receita
			from ampmais_sales
			where organizacao_id = $1 and ${STAMP_CONDITION}
			group by mes
			order by mes asc`,
			[orgId],
		);
		console.log("--- POR MÊS ---");
		console.table(byMonth.map((row) => ({ mes: row.mes, total: Number(row.total), receita: Number(row.receita) })));

		// 3. Comparação: já existem vendas CONFIRMADA nessa org? Em que período?
		const confirmed = await connection.unsafe(
			`
			select count(*) as total, min(data_venda) as first_sale, max(data_venda) as last_sale
			from ampmais_sales
			where organizacao_id = $1 and status_venda = 'CONFIRMADA'`,
			[orgId],
		);
		console.log("--- JÁ CONFIRMADAS (estado atual) ---");
		console.table(
			confirmed.map((row) => ({ total: Number(row.total), primeiraVenda: row.first_sale, ultimaVenda: row.last_sale })),
		);
	}

	await connection.end();
}

main().catch(async (error) => {
	console.error("Falha no diagnóstico:", error);
	await connection.end();
	process.exit(1);
});
