import "@/utils/scripts/load-next-env";

import { connection, db } from "@/services/drizzle";
import { integrations, sales } from "@/services/drizzle/schema";
import { and, eq, inArray, sql } from "drizzle-orm";

type TArgs = { apply: boolean; organizationId: string };
const VALUE_TOLERANCE = 0.011;

function getArgValue(name: string) {
	const prefix = `--${name}=`;
	return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? null;
}

function parseArgs(): TArgs {
	const organizationId = getArgValue("org") ?? getArgValue("orgId");
	if (!organizationId) throw new Error("Informe --org=<organizationId>.");
	return { apply: process.argv.includes("--apply"), organizationId };
}

function getItemTotal(sale: { itens: Array<{ quantidade: number; valorVendaUnitario: number; valorTotalDesconto: number }> }) {
	return sale.itens.reduce((total, item) => total + item.valorVendaUnitario * item.quantidade - item.valorTotalDesconto, 0);
}

async function recomputeClientPurchaseMetadata(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], organizationId: string) {
	await tx.execute(sql`
		with ranked as (
			select s.cliente_id, s.id, s.data_venda, s.valor_total,
				row_number() over (partition by s.cliente_id order by s.data_venda asc nulls last, s.id asc) as primeira_ordem,
				row_number() over (partition by s.cliente_id order by s.data_venda desc nulls last, s.id desc) as ultima_ordem
			from ampmais_sales s
			where s.organizacao_id = ${organizationId}
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
			metadata_total_compras = coalesce(m.total_compras, 0),
			metadata_valor_total_compras = coalesce(m.valor_total_compras, 0),
			primeira_compra_id = m.primeira_compra_id,
			primeira_compra_data = m.primeira_compra_data,
			ultima_compra_id = m.ultima_compra_id,
			ultima_compra_data = m.ultima_compra_data,
			metadata_ultima_atualizacao = now()
		from (select c2.id, m2.* from ampmais_clients c2 left join metrics m2 on m2.cliente_id = c2.id where c2.organizacao_id = ${organizationId}) m
		where c.id = m.id
	`);
}

async function main() {
	const args = parseArgs();
	const onlineIntegrations = await db.query.integrations.findMany({
		where: and(eq(integrations.organizacaoId, args.organizationId), eq(integrations.tipo, "ONLINE-SOFTWARE")),
		columns: { id: true },
	});
	const integrationIds = onlineIntegrations.map((integration) => integration.id);
	if (integrationIds.length === 0) throw new Error("Organizacao sem integracao Online Software.");

	const importedSales = await db.query.sales.findMany({
		where: and(eq(sales.organizacaoId, args.organizationId), inArray(sales.integracaoId, integrationIds)),
		columns: {
			id: true,
			integracaoId: true,
			idExterno: true,
			natureza: true,
			valorTotal: true,
			statusVenda: true,
			statusAtendimento: true,
			tipo: true,
			situacao: true,
		},
		with: { itens: { columns: { quantidade: true, valorVendaUnitario: true, valorTotalDesconto: true } } },
	});

	const groups = new Map<string, typeof importedSales>();
	for (const sale of importedSales) {
		const key = `${sale.integracaoId}:${sale.idExterno}`;
		groups.set(key, [...(groups.get(key) ?? []), sale]);
	}

	const duplicateGroups = [...groups.values()].filter((group) => group.length > 1);
	const loserIds: string[] = [];
	const survivorIds: string[] = [];
	const correctedValuesById = new Map<string, number>();
	const ambiguousGroups: Array<{
		integrationId: string | null;
		externalId: string;
		occurrences: number;
		matches: number;
		values?: string;
		itemTotals?: string;
	}> = [];
	for (const group of duplicateGroups) {
		const itemTotals = group.map(getItemTotal);
		if (itemTotals.some((total) => Math.abs(total - itemTotals[0]) >= VALUE_TOLERANCE)) {
			const canceledCandidates = group.filter(
				(sale) =>
					(sale.natureza === "SN01" || sale.natureza === "NFCE") &&
					(sale.valorTotal <= 0 || sale.situacao === "02") &&
					Math.abs(sale.valorTotal - getItemTotal(sale)) < VALUE_TOLERANCE,
			);
			if (canceledCandidates.length === 1) {
				const survivor = canceledCandidates[0];
				survivorIds.push(survivor.id);
				correctedValuesById.set(survivor.id, getItemTotal(survivor));
				loserIds.push(...group.filter((sale) => sale.id !== survivor.id).map((sale) => sale.id));
				continue;
			}
			ambiguousGroups.push({
				integrationId: group[0].integracaoId,
				externalId: group[0].idExterno,
				occurrences: group.length,
				matches: 0,
				values: group.map((sale) => sale.valorTotal.toFixed(2)).join(","),
				itemTotals: itemTotals.map((total) => total.toFixed(2)).join(","),
			});
			continue;
		}
		const itemTotalMatches = group.filter((sale) => Math.abs(sale.valorTotal - getItemTotal(sale)) < VALUE_TOLERANCE);
		const emptyTypeMatches = group.filter((sale) => sale.tipo.trim() === "");
		const matches = itemTotalMatches.length > 0 ? itemTotalMatches : emptyTypeMatches.length > 0 ? emptyTypeMatches : group;
		const survivor = [...matches].sort((left, right) => left.id.localeCompare(right.id))[0];
		survivorIds.push(survivor.id);
		correctedValuesById.set(survivor.id, itemTotals[0]);
		loserIds.push(...group.filter((sale) => sale.id !== survivor.id).map((sale) => sale.id));
	}

	const loserIdSet = new Set(loserIds);
	const projectedSurvivors = importedSales
		.filter((sale) => !loserIdSet.has(sale.id))
		.map((sale) => ({ ...sale, valorTotal: correctedValuesById.get(sale.id) ?? sale.valorTotal }));
	const validSales = projectedSurvivors.filter(
		(sale) => (sale.natureza === "SN01" || sale.natureza === "NFCE") && sale.valorTotal > 0,
	);
	const canceledSales = projectedSurvivors.filter(
		(sale) => (sale.natureza === "SN01" || sale.natureza === "NFCE") && sale.valorTotal <= 0,
	);
	const neutralSales = projectedSurvivors.filter((sale) => sale.natureza !== "SN01" && sale.natureza !== "NFCE");

	console.log(`[ONLINE_SOFTWARE_BACKFILL] Modo: ${args.apply ? "APPLY" : "DRY-RUN"}`);
	console.table({
		integrations: integrationIds.length,
		storedRows: importedSales.length,
		duplicateGroups: duplicateGroups.length,
		rowsToDelete: loserIds.length,
		ambiguousGroups: ambiguousGroups.length,
		validSales: validSales.length,
		canceledSales: canceledSales.length,
		neutralSales: neutralSales.length,
		validRevenue: Number(validSales.reduce((total, sale) => total + sale.valorTotal, 0).toFixed(2)),
	});
	if (ambiguousGroups.length > 0) {
		console.table(ambiguousGroups.slice(0, 20));
		throw new Error("Existem grupos duplicados ambiguos; nenhuma alteracao foi realizada.");
	}
	if (!args.apply) return;

	await db.transaction(async (tx) => {
		if (loserIds.length > 0) await tx.delete(sales).where(inArray(sales.id, loserIds));
		if (survivorIds.length > 0) {
			await tx
				.update(sales)
				.set({
					valorTotal: sql`(select coalesce(sum(si.valor_unitario * si.quantidade - si.valor_total_desconto), 0) from ampmais_sale_items si where si.venda_id = ampmais_sales.id)`,
					tipo: "",
				})
				.where(inArray(sales.id, survivorIds));
		}
		const remainingIds = projectedSurvivors.map((sale) => sale.id);
		if (remainingIds.length > 0) {
			await tx
				.update(sales)
				.set({
					statusVenda: sql`case when natureza in ('SN01', 'NFCE') and valor_total > 0 then 'CONFIRMADA'::sale_status when natureza in ('SN01', 'NFCE') then 'CANCELADA'::sale_status else null end`,
					statusAtendimento: sql`case when natureza in ('SN01', 'NFCE') and valor_total > 0 then 'ENTREGUE'::sale_attendance_status when natureza in ('SN01', 'NFCE') then 'CANCELADO'::sale_attendance_status else 'NAO_INICIADO'::sale_attendance_status end`,
					assinaturaExterna: null,
				})
				.where(inArray(sales.id, remainingIds));
		}
		await recomputeClientPurchaseMetadata(tx, args.organizationId);
	});

	console.log("[ONLINE_SOFTWARE_BACKFILL] Backfill concluido. As assinaturas serao recalculadas no proximo sync.");
}

void main()
	.catch((error) => {
		console.error("[ONLINE_SOFTWARE_BACKFILL] Falha:", error);
		process.exitCode = 1;
	})
	.finally(() => connection.end());
