import "@/utils/scripts/load-next-env";

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { connection } from "@/services/drizzle";

// Ids das vendas carimbadas por execução — permitem reverter o backfill se necessário.
const SNAPSHOT_DIR = join(process.cwd(), "tmp", "backfill-null-status-sales");

// Backfill do status comercial de vendas legadas com status_venda null.
//
// Contexto: o commit d4d090c6 trocou os filtros de "venda válida" (natureza SN01 + valor > 0)
// por status_venda = 'CONFIRMADA', mas só backfillou os conectores Online Software. Vendas do
// POI e importações antigas de outros conectores ficaram com status null — invisíveis para
// getValidSaleConditions e para o cron enrich-clients, que passou a zerar os contadores de
// compras dos clientes toda noite (e a campanha PRIMEIRA-COMPRA redisparava no POI).
//
// Regra de carimbo (espelha a validade pré-d4d090c6):
//   - natureza = 'SN01' e valor_total > 0            -> CONFIRMADA / ENTREGUE
//   - venda do POI (id_externo 'POI-%', sem conector) -> CONFIRMADA / ENTREGUE (concluída por
//     construção; o insert do POI passou a carimbar isso em novas vendas)
//   - demais nulls (devoluções SN20, CANCELADO, etc.) -> permanecem null (nunca contaram)
//
// Após o carimbo, recomputa contadores e ponteiros de primeira/última compra dos clientes com
// pelo menos uma venda CONFIRMADA (clientes sem nenhuma não são tocados, para não anular
// ponteiros preenchidos pelos fluxos vivos).
//
// Uso: npx tsx ./scripts/backfill-null-status-sales.ts [--org=<organizationId>] [--apply]

type TArgs = { apply: boolean; organizationId: string | null };

function getArgValue(name: string) {
	const prefix = `--${name}=`;
	return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? null;
}

function parseArgs(): TArgs {
	return { apply: process.argv.includes("--apply"), organizationId: getArgValue("org") ?? getArgValue("orgId") };
}

// Recebe o prefixo da tabela ("s." no select com join, "" no update) para evitar ambiguidade.
function buildStampCondition(prefix: string) {
	return `
		${prefix}status_venda is null
		and (
			(${prefix}natureza = 'SN01' and ${prefix}valor_total > 0)
			or (${prefix}id_externo like 'POI-%' and ${prefix}integracao_id is null)
		)
	`;
}

async function main() {
	const args = parseArgs();
	const orgFilter = args.organizationId;
	const aliasedCondition = buildStampCondition("s.");

	const summaryRows = await connection.unsafe(
		`
		select s.organizacao_id, o.nome as organizacao_nome,
			count(*) filter (where ${aliasedCondition}) as rows_to_confirm,
			count(*) filter (where ${aliasedCondition} and s.id_externo like 'POI-%' and s.integracao_id is null) as poi_rows,
			count(*) filter (where s.status_venda is null and not (${aliasedCondition})) as rows_left_null,
			coalesce(sum(s.valor_total) filter (where ${aliasedCondition}), 0)::numeric(14,2) as revenue_to_confirm
		from ampmais_sales s
		left join ampmais_organizations o on o.id = s.organizacao_id
		where s.status_venda is null
			and ($1::varchar is null or s.organizacao_id = $1)
		group by s.organizacao_id, o.nome
		order by rows_to_confirm desc`,
		[orgFilter],
	);

	console.log(`[NULL_STATUS_BACKFILL] Modo: ${args.apply ? "APPLY" : "DRY-RUN"}${orgFilter ? ` | org: ${orgFilter}` : " | todas as orgs"}`);
	console.table(
		summaryRows.map((row) => ({
			organizacao: row.organizacao_nome ?? "(sem nome)",
			organizacaoId: row.organizacao_id,
			rowsToConfirm: Number(row.rows_to_confirm),
			poiRows: Number(row.poi_rows),
			rowsLeftNull: Number(row.rows_left_null),
			revenueToConfirm: Number(row.revenue_to_confirm),
		})),
	);

	const organizationIds = summaryRows.filter((row) => Number(row.rows_to_confirm) > 0).map((row) => row.organizacao_id as string);
	if (organizationIds.length === 0) {
		console.log("[NULL_STATUS_BACKFILL] Nenhuma venda a carimbar.");
		return;
	}
	if (!args.apply) {
		console.log(`[NULL_STATUS_BACKFILL] Dry-run: ${organizationIds.length} organizacao(oes) seriam atualizadas. Rode com --apply para aplicar.`);
		return;
	}

	mkdirSync(SNAPSHOT_DIR, { recursive: true });
	const snapshotStamp = new Date().toISOString().replace(/[:.]/g, "-");

	for (const organizationId of organizationIds) {
		await connection.begin(async (tx) => {
			// Depois do carimbo as linhas ficam indistinguíveis das que já eram CONFIRMADA.
			// Guardamos os ids afetados antes do update para que o backfill seja reversível.
			const affected = await tx.unsafe(
				`select id from ampmais_sales where organizacao_id = $1 and ${buildStampCondition("")} order by id`,
				[organizationId],
			);
			const snapshotPath = join(SNAPSHOT_DIR, `${snapshotStamp}_${organizationId}.json`);
			writeFileSync(snapshotPath, JSON.stringify({ organizationId, stampedAt: snapshotStamp, saleIds: affected.map((row) => row.id) }, null, 2));

			const stamped = await tx.unsafe(
				`
				update ampmais_sales
				set status_venda = 'CONFIRMADA'::sale_status,
					status_atendimento = 'ENTREGUE'::sale_attendance_status
				where organizacao_id = $1 and ${buildStampCondition("")}`,
				[organizationId],
			);

			const recomputed = await tx.unsafe(
				`
				with ranked as (
					select s.cliente_id, s.id, s.data_venda, s.valor_total,
						row_number() over (partition by s.cliente_id order by s.data_venda asc nulls last, s.id asc) as primeira_ordem,
						row_number() over (partition by s.cliente_id order by s.data_venda desc nulls last, s.id desc) as ultima_ordem
					from ampmais_sales s
					where s.organizacao_id = $1
						and s.status_venda = 'CONFIRMADA'
						and s.cliente_id is not null
				), metrics as (
					select cliente_id,
						count(*)::int as total_compras,
						sum(valor_total) as valor_total_compras,
						max(id) filter (where primeira_ordem = 1) as primeira_compra_id,
						max(data_venda) filter (where primeira_ordem = 1) as primeira_compra_data,
						max(id) filter (where ultima_ordem = 1) as ultima_compra_id,
						max(data_venda) filter (where ultima_ordem = 1) as ultima_compra_data
					from ranked
					group by cliente_id
				)
				update ampmais_clients c set
					metadata_total_compras = m.total_compras,
					metadata_valor_total_compras = m.valor_total_compras,
					primeira_compra_id = m.primeira_compra_id,
					primeira_compra_data = m.primeira_compra_data,
					ultima_compra_id = m.ultima_compra_id,
					ultima_compra_data = m.ultima_compra_data,
					metadata_ultima_atualizacao = now()
				from metrics m
				where c.id = m.cliente_id and c.organizacao_id = $1`,
				[organizationId],
			);

			console.log(
				`[NULL_STATUS_BACKFILL] [ORG: ${organizationId}] vendas carimbadas=${stamped.count} | clientes recomputados=${recomputed.count} | snapshot=${snapshotPath}`,
			);
		});
	}

	console.log(`[NULL_STATUS_BACKFILL] Concluido: ${organizationIds.length} organizacao(oes) atualizadas.`);
}

void main()
	.catch((error) => {
		console.error("[NULL_STATUS_BACKFILL] Falha:", error);
		process.exitCode = 1;
	})
	.finally(() => connection.end());
