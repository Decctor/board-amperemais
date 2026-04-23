import { formatDurationMs } from "@/lib/formatting";
import { type DBTransaction, db } from "@/services/drizzle";
import { productClientReferences, saleItems, sales } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { eq, sql } from "drizzle-orm";
import type { NextApiHandler } from "next";

// export const config = {
// 	maxDuration: 300,
// };

const PRODUCT_REFERENCE_WINDOWS = [
	{ label: "GERAL" as const, startDate: null },
	{ label: "30_DIAS" as const, startDate: dayjs().subtract(30, "day").startOf("day").toDate() },
	{ label: "90_DIAS" as const, startDate: dayjs().subtract(90, "day").startOf("day").toDate() },
];

const VALID_SALE_NATURE = "SN01";

type TOrganizationSyncSummary = {
	organizationId: string;
	rowsGenerated: number;
	durationMs: number;
};

async function insertWindowReferences({
	tx,
	organizationId,
	windowLabel,
	startDate,
}: {
	tx: DBTransaction;
	organizationId: string;
	windowLabel: (typeof PRODUCT_REFERENCE_WINDOWS)[number]["label"];
	startDate: Date | null;
}) {
	const startDateIso = startDate?.toISOString() ?? null;
	const dateFilter = startDateIso ? sql`and ${sales.dataVenda} >= ${startDateIso}::timestamp` : sql``;

	await tx.execute(sql`
		insert into ${productClientReferences} (
			id,
			organizacao_id,
			produto_id,
			produto_variante_id,
			cliente_id,
			total_compras_quantidade,
			total_compras_valor,
			ranking_valor,
			janela,
			primeira_compra_data,
			ultima_compra_data,
			data_ultima_atualizacao
		)
		select
			gen_random_uuid()::varchar as id,
			${organizationId}::varchar as organizacao_id,
			${saleItems.produtoId} as produto_id,
			null::varchar as produto_variante_id,
			${saleItems.clienteId} as cliente_id,
			cast(round(coalesce(sum(${saleItems.quantidade}), 0)) as integer) as total_compras_quantidade,
			coalesce(sum(${saleItems.valorVendaTotalLiquido}), 0)::double precision as total_compras_valor,
			0::integer as ranking_valor,
			${windowLabel}::product_client_reference_window as janela,
			min(${sales.dataVenda}) as primeira_compra_data,
			max(${sales.dataVenda}) as ultima_compra_data,
			now()::timestamp as data_ultima_atualizacao
		from ${saleItems}
		inner join ${sales}
			on ${saleItems.vendaId} = ${sales.id}
		where ${saleItems.organizacaoId} = ${organizationId}
			and ${sales.organizacaoId} = ${organizationId}
			and ${saleItems.clienteId} is not null
			and ${sales.natureza} = ${VALID_SALE_NATURE}
			${dateFilter}
		group by ${saleItems.produtoId}, ${saleItems.clienteId}
		having coalesce(sum(${saleItems.quantidade}), 0) > 0
			or coalesce(sum(${saleItems.valorVendaTotalLiquido}), 0) > 0
	`);
}

async function recomputeRankingsForOrganization({ tx, organizationId }: { tx: DBTransaction; organizationId: string }) {
	await tx.execute(sql`
		update ${productClientReferences} as refs
		set ranking_valor = ranked.ranking_valor
		from (
			select
				${productClientReferences.id} as id,
				row_number() over (
					partition by ${productClientReferences.organizacaoId}, ${productClientReferences.produtoId}, ${productClientReferences.janela}
					order by
						${productClientReferences.totalComprasValor} desc,
						${productClientReferences.totalComprasQuantidade} desc,
						${productClientReferences.ultimaCompraData} desc nulls last,
						${productClientReferences.clienteId} asc
				)::integer as ranking_valor
			from ${productClientReferences}
			where ${productClientReferences.organizacaoId} = ${organizationId}
		) as ranked
		where refs.id = ranked.id
	`);
}

async function syncProductClientReferencesForOrganization(organizationId: string): Promise<TOrganizationSyncSummary> {
	const startedAt = Date.now();

	await db.transaction(async (tx) => {
		await tx.delete(productClientReferences).where(eq(productClientReferences.organizacaoId, organizationId));

		for (const windowConfig of PRODUCT_REFERENCE_WINDOWS) {
			await insertWindowReferences({
				tx,
				organizationId,
				windowLabel: windowConfig.label,
				startDate: windowConfig.startDate,
			});
		}

		await recomputeRankingsForOrganization({ tx, organizationId });
	});

	const [countResult] = await db
		.select({
			value: sql<number>`count(*)`,
		})
		.from(productClientReferences)
		.where(eq(productClientReferences.organizacaoId, organizationId));

	return {
		organizationId,
		rowsGenerated: Number(countResult?.value ?? 0),
		durationMs: Date.now() - startedAt,
	};
}

const handleProductClientReferencesCron: NextApiHandler = async (req, res) => {
	const authHeader = req.headers.authorization;
	if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
		return res.status(401).json("Unauthorized");
	}

	const startedAt = Date.now();
	console.log("[INFO] [PRODUCT_CLIENT_REFERENCES] Starting product client references sync cron job");

	const organizations = await db.query.organizations.findMany({
		columns: { id: true },
	});

	let processedOrganizations = 0;
	let failedOrganizations = 0;
	let totalRowsGenerated = 0;
	const organizationsSummary: TOrganizationSyncSummary[] = [];

	for (const organization of organizations) {
		try {
			console.log(`[ORG: ${organization.id}] [PRODUCT_CLIENT_REFERENCES] Recomputing product client references...`);
			const summary = await syncProductClientReferencesForOrganization(organization.id);
			organizationsSummary.push(summary);
			processedOrganizations += 1;
			totalRowsGenerated += summary.rowsGenerated;
			console.log(
				`[ORG: ${organization.id}] [PRODUCT_CLIENT_REFERENCES] Sync completed in ${formatDurationMs(summary.durationMs)} | rows=${summary.rowsGenerated}`,
			);
		} catch (error) {
			failedOrganizations += 1;
			console.error(`[ORG: ${organization.id}] [PRODUCT_CLIENT_REFERENCES] Failed to recompute references`, error);
		}
	}

	const durationMs = Date.now() - startedAt;
	console.log(
		`[INFO] [PRODUCT_CLIENT_REFERENCES] Finished in ${formatDurationMs(durationMs)} | organizations=${processedOrganizations}/${organizations.length} | failed=${failedOrganizations} | rows=${totalRowsGenerated}`,
	);

	return res.status(200).json({
		message: "Referências de produto por cliente sincronizadas com sucesso.",
		data: {
			organizationsCount: organizations.length,
			processedOrganizations,
			failedOrganizations,
			totalRowsGenerated,
			durationMs,
			organizationsSummary,
		},
	});
};

export default handleProductClientReferencesCron;
