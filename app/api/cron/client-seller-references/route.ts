import { appApiHandler } from "@/lib/app-api";
import { assertCronAuthorized } from "@/lib/cron/assert-cron-authorized";
import { formatDurationMs } from "@/lib/formatting";
import { type DBTransaction, db } from "@/services/drizzle";
import { clientSellerReferences, sales } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

const VALID_SALE_STATUS = "CONFIRMADA";

// Carteira derivada vendedor × cliente (docs/seller-routine-hub-design.md).
// Vínculo = frequência de vendas com decay exponencial de recência: uma venda de hoje
// vale 1.0, uma de 6 meses atrás vale 0.5, uma de 1 ano vale 0.25. Quem soma mais
// vira o "dono" do vínculo (ranking_vinculo = 1). Janela limitada para não ressuscitar
// relações mortas.
const RECENCY_HALF_LIFE_DAYS = 180;
const LOOKBACK_MONTHS = 24;

type TOrganizationSyncSummary = {
	organizationId: string;
	rowsGenerated: number;
	durationMs: number;
};

async function insertClientSellerReferences({ tx, organizationId }: { tx: DBTransaction; organizationId: string }) {
	const lookbackStartIso = dayjs().subtract(LOOKBACK_MONTHS, "month").startOf("day").toDate().toISOString();

	await tx.execute(sql`
		insert into ${clientSellerReferences} (
			id,
			organizacao_id,
			cliente_id,
			vendedor_id,
			total_vendas,
			valor_total_vendas,
			score_vinculo,
			ranking_vinculo,
			primeira_venda_data,
			ultima_venda_data,
			data_ultima_atualizacao
		)
		select
			gen_random_uuid()::varchar as id,
			${organizationId}::varchar as organizacao_id,
			${sales.clienteId} as cliente_id,
			${sales.vendedorId} as vendedor_id,
			count(*)::integer as total_vendas,
			coalesce(sum(${sales.valorTotal}), 0)::double precision as valor_total_vendas,
			coalesce(sum(power(0.5, extract(epoch from (now() - ${sales.dataVenda})) / 86400.0 / ${RECENCY_HALF_LIFE_DAYS})), 0)::double precision as score_vinculo,
			0::integer as ranking_vinculo,
			min(${sales.dataVenda}) as primeira_venda_data,
			max(${sales.dataVenda}) as ultima_venda_data,
			now()::timestamp as data_ultima_atualizacao
		from ${sales}
		where ${sales.organizacaoId} = ${organizationId}
			and ${sales.clienteId} is not null
			and ${sales.vendedorId} is not null
			and ${sales.statusVenda} = ${VALID_SALE_STATUS}
			and ${sales.dataVenda} >= ${lookbackStartIso}::timestamp
		group by ${sales.clienteId}, ${sales.vendedorId}
	`);
}

async function recomputeRankingsForOrganization({ tx, organizationId }: { tx: DBTransaction; organizationId: string }) {
	await tx.execute(sql`
		update ${clientSellerReferences} as refs
		set ranking_vinculo = ranked.ranking_vinculo
		from (
			select
				${clientSellerReferences.id} as id,
				row_number() over (
					partition by ${clientSellerReferences.organizacaoId}, ${clientSellerReferences.clienteId}
					order by
						${clientSellerReferences.scoreVinculo} desc,
						${clientSellerReferences.totalVendas} desc,
						${clientSellerReferences.ultimaVendaData} desc nulls last,
						${clientSellerReferences.vendedorId} asc
				)::integer as ranking_vinculo
			from ${clientSellerReferences}
			where ${clientSellerReferences.organizacaoId} = ${organizationId}
		) as ranked
		where refs.id = ranked.id
	`);
}

async function syncClientSellerReferencesForOrganization(organizationId: string): Promise<TOrganizationSyncSummary> {
	const startedAt = Date.now();

	await db.transaction(async (tx) => {
		await tx.delete(clientSellerReferences).where(eq(clientSellerReferences.organizacaoId, organizationId));
		await insertClientSellerReferences({ tx, organizationId });
		await recomputeRankingsForOrganization({ tx, organizationId });
	});

	const [countResult] = await db
		.select({ value: sql<number>`count(*)` })
		.from(clientSellerReferences)
		.where(eq(clientSellerReferences.organizacaoId, organizationId));

	return {
		organizationId,
		rowsGenerated: Number(countResult?.value ?? 0),
		durationMs: Date.now() - startedAt,
	};
}

async function getClientSellerReferencesRoute(_req: NextRequest) {
	const startedAt = Date.now();
	console.log("[INFO] [CLIENT_SELLER_REFERENCES] Starting client seller references sync cron job");

	const organizations = await db.query.organizations.findMany({
		columns: { id: true },
	});

	let processedOrganizations = 0;
	let failedOrganizations = 0;
	let totalRowsGenerated = 0;
	const organizationsSummary: TOrganizationSyncSummary[] = [];

	for (const organization of organizations) {
		try {
			console.log(`[ORG: ${organization.id}] [CLIENT_SELLER_REFERENCES] Recomputing client seller references...`);
			const summary = await syncClientSellerReferencesForOrganization(organization.id);
			organizationsSummary.push(summary);
			processedOrganizations += 1;
			totalRowsGenerated += summary.rowsGenerated;
			console.log(
				`[ORG: ${organization.id}] [CLIENT_SELLER_REFERENCES] Sync completed in ${formatDurationMs(summary.durationMs)} | rows=${summary.rowsGenerated}`,
			);
		} catch (error) {
			failedOrganizations += 1;
			console.error(`[ORG: ${organization.id}] [CLIENT_SELLER_REFERENCES] Failed to recompute references`, error);
		}
	}

	const durationMs = Date.now() - startedAt;
	console.log(
		`[INFO] [CLIENT_SELLER_REFERENCES] Finished in ${formatDurationMs(durationMs)} | organizations=${processedOrganizations}/${organizations.length} | failed=${failedOrganizations} | rows=${totalRowsGenerated}`,
	);

	return NextResponse.json({
		message: "Referências de vendedor por cliente sincronizadas com sucesso.",
		data: {
			organizationsCount: organizations.length,
			processedOrganizations,
			failedOrganizations,
			totalRowsGenerated,
			durationMs,
			organizationsSummary,
		},
	});
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export const GET = appApiHandler({
	GET: async (req) => {
		assertCronAuthorized(req);
		return getClientSellerReferencesRoute(req);
	},
});
