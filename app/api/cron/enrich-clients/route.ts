import { appApiHandler } from "@/lib/app-api";
import { assertCronAuthorized } from "@/lib/cron/assert-cron-authorized";
import { db } from "@/services/drizzle";
import { clients, products, saleItems, sales } from "@/services/drizzle/schema";
import { and, eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

type TProcessingListEntry = {
	organizationId: string;
	clientId: string;
	metadata: {
		metadataTotalPurchasesCount: number;
		metadataTotalPurchasesValue: number;
		metadataMostPurchasedProductId: string | null;
		metadataMostPurchasedProductGroup: string | null;
		metadataLastUpdate: Date;
	};
};

const ORGANIZATION_CONCURRENCY = 3;
const UPDATE_BATCH_SIZE = 100;

async function getEnrichClientsRoute(req: NextRequest) {
	try {
		void req;
		const startedAt = Date.now();

		const organizationsList = await db.query.organizations.findMany({
			columns: { id: true },
		});

		console.log(
			`[INFO] [ENRICH_CLIENTS] Starting clients enrichment for ${organizationsList.length} organizations with concurrency=${ORGANIZATION_CONCURRENCY} and updateBatchSize=${UPDATE_BATCH_SIZE}`,
		);

		let updatedClientsCount = 0;
		let discoveredClientsCount = 0;
		let processedOrganizationsCount = 0;
		let failedOrganizationsCount = 0;
		const organizationBatches = chunkArray(organizationsList, ORGANIZATION_CONCURRENCY);

		for (const [batchIndex, organizationsBatch] of organizationBatches.entries()) {
			const organizationBatchStartedAt = Date.now();

			console.log(
				`[INFO] [ENRICH_CLIENTS] Processing organization batch ${batchIndex + 1}/${organizationBatches.length} (${organizationsBatch.length} organizations)`,
			);

			const batchResults = await Promise.allSettled(
				organizationsBatch.map(async (organization) => {
					const organizationStartedAt = Date.now();
					console.log(`[ORG: ${organization.id}] [INFO] [ENRICH_CLIENTS] Starting organization processing`);

					const processingList = await handleIndividualOrgEnrichment({
						organizationId: organization.id,
					});

					const updatesSummary = await processClientMetadataUpdatesInBatches({
						organizationId: organization.id,
						processingList,
						batchSize: UPDATE_BATCH_SIZE,
					});

					return {
						organizationId: organization.id,
						discoveredClientsCount: processingList.length,
						updatedClientsCount: processingList.length,
						processedUpdateBatchesCount: updatesSummary.processedBatchesCount,
						updateDurationMs: updatesSummary.durationMs,
						organizationDurationMs: Date.now() - organizationStartedAt,
					};
				}),
			);

			for (const result of batchResults) {
				if (result.status === "fulfilled") {
					processedOrganizationsCount += 1;
					discoveredClientsCount += result.value.discoveredClientsCount;
					updatedClientsCount += result.value.updatedClientsCount;
					console.log(
						`[ORG: ${result.value.organizationId}] [INFO] [ENRICH_CLIENTS] Finished organization processing: clients=${result.value.updatedClientsCount}, updateBatches=${result.value.processedUpdateBatchesCount}, updateDuration=${formatDurationMs(result.value.updateDurationMs)}, totalDuration=${formatDurationMs(result.value.organizationDurationMs)}`,
					);
					continue;
				}

				failedOrganizationsCount += 1;
				console.error(`[ERROR] [ENRICH_CLIENTS] Failed to process organization batch item:`, result.reason);
			}

			console.log(
				`[INFO] [ENRICH_CLIENTS] Finished organization batch ${batchIndex + 1}/${organizationBatches.length} in ${formatDurationMs(Date.now() - organizationBatchStartedAt)} | processedOrganizations=${processedOrganizationsCount}/${organizationsList.length} | failedOrganizations=${failedOrganizationsCount} | discoveredClients=${discoveredClientsCount} | updatedClients=${updatedClientsCount}`,
			);
		}

		const durationMs = Date.now() - startedAt;
		console.log(
			`[INFO] [ENRICH_CLIENTS] Completed clients enrichment in ${formatDurationMs(durationMs)} | organizations=${processedOrganizationsCount}/${organizationsList.length} | failedOrganizations=${failedOrganizationsCount} | discoveredClients=${discoveredClientsCount} | updatedClients=${updatedClientsCount}`,
		);

		return NextResponse.json({
			message: "Metadados dos clientes atualizados com sucesso.",
			data: {
				organizationsCount: organizationsList.length,
				processedOrganizationsCount,
				failedOrganizationsCount,
				discoveredClientsCount,
				updatedClientsCount,
				durationMs,
			},
		}, { status: 200 });
	} catch (error) {
		console.error("[ERROR] [ENRICH_CLIENTS] Error processing clients metadata:", error);
		return NextResponse.json({
			message: "Erro ao atualizar metadados dos clientes.",
		}, { status: 500 });
	}
}

type HandleIndividualOrgEnrichmentProps = {
	organizationId: string;
};
async function handleIndividualOrgEnrichment({ organizationId }: HandleIndividualOrgEnrichmentProps): Promise<TProcessingListEntry[]> {
	const startedAt = Date.now();
	const metadataLastUpdate = new Date();

	const [allTimeTotalsByClient, mostPurchasedProductByClient] = await Promise.all([
		db
			.select({
				clientId: clients.id,
				allTimeTotalPurchases: sql<number>`COALESCE(sum(${sales.valorTotal}), 0)`,
				allTimePurchaseCount: sql<number>`COALESCE(count(${sales.id}), 0)`,
			})
			.from(clients)
			.leftJoin(sales, and(eq(sales.clienteId, clients.id), eq(sales.organizacaoId, organizationId), eq(sales.statusVenda, "CONFIRMADA")))
			.where(eq(clients.organizacaoId, organizationId))
			.groupBy(clients.id),
		db
			.select({
				clientId: saleItems.clienteId,
				produtoId: saleItems.produtoId,
				produtoGrupo: products.grupo,
				totalQuantity: sql<number>`sum(${saleItems.quantidade})`,
			})
			.from(saleItems)
			.innerJoin(products, eq(products.id, saleItems.produtoId))
			.innerJoin(sales, and(eq(sales.id, saleItems.vendaId), eq(sales.statusVenda, "CONFIRMADA")))
			.where(eq(saleItems.organizacaoId, organizationId))
			.groupBy(saleItems.clienteId, saleItems.produtoId, products.grupo)
			.orderBy(sql`sum(${saleItems.quantidade}) DESC`),
	]);

	const allTimeTotalsMap = new Map(allTimeTotalsByClient.map((result) => [result.clientId, result]));

	const mostPurchasedProductByClientMap = new Map<string, { produtoId: string | null; produtoGrupo: string | null; totalQuantity: number }>();
	for (const row of mostPurchasedProductByClient) {
		if (row.clientId && !mostPurchasedProductByClientMap.has(row.clientId)) {
			mostPurchasedProductByClientMap.set(row.clientId, row);
		}
	}

	const clientIds = [...allTimeTotalsMap.keys(), ...mostPurchasedProductByClientMap.keys()].filter(Boolean) as string[];
	const uniqueClientIds = [...new Set(clientIds)];

	console.log(
		`[ORG: ${organizationId}] [INFO] [ENRICH_CLIENTS] Computed metadata payload for ${uniqueClientIds.length} clients in ${formatDurationMs(Date.now() - startedAt)} | totalsRows=${allTimeTotalsByClient.length} | productRows=${mostPurchasedProductByClient.length}`,
	);

	return uniqueClientIds.map((clientId) => {
		const allTimeData = allTimeTotalsMap.get(clientId);
		const mostPurchasedData = mostPurchasedProductByClientMap.get(clientId);

		return {
			organizationId,
			clientId,
			metadata: {
				metadataTotalPurchasesCount: allTimeData?.allTimePurchaseCount ?? 0,
				metadataTotalPurchasesValue: allTimeData?.allTimeTotalPurchases ?? 0,
				metadataMostPurchasedProductId: mostPurchasedData?.produtoId ?? null,
				metadataMostPurchasedProductGroup: mostPurchasedData?.produtoGrupo ?? null,
				metadataLastUpdate,
			},
		};
	});
}

type ProcessClientMetadataUpdatesInBatchesProps = {
	organizationId: string;
	processingList: TProcessingListEntry[];
	batchSize: number;
};

async function processClientMetadataUpdatesInBatches({ organizationId, processingList, batchSize }: ProcessClientMetadataUpdatesInBatchesProps) {
	const startedAt = Date.now();
	const processingBatches = chunkArray(processingList, batchSize);

	console.log(
		`[ORG: ${organizationId}] [INFO] [ENRICH_CLIENTS] Starting updates for ${processingList.length} clients across ${processingBatches.length} batches`,
	);

	for (const [batchIndex, processingBatch] of processingBatches.entries()) {
		if (processingBatch.length === 0) continue;
		const batchStartedAt = Date.now();

		await db.execute(sql`
			update ${clients} as c
			set
				metadata_total_compras = v.metadata_total_compras::integer,
				metadata_valor_total_compras = v.metadata_valor_total_compras::double precision,
				metadata_produto_mais_comprado_id = v.metadata_produto_mais_comprado_id::varchar(255),
				metadata_grupo_produto_mais_comprado = v.metadata_grupo_produto_mais_comprado::text,
				metadata_ultima_atualizacao = v.metadata_ultima_atualizacao::timestamp
			from (
				values
					${sql.join(
						processingBatch.map(
							(entry) => sql`(
								${entry.clientId},
								${organizationId},
								${entry.metadata.metadataTotalPurchasesCount},
								${entry.metadata.metadataTotalPurchasesValue},
								${entry.metadata.metadataMostPurchasedProductId},
								${entry.metadata.metadataMostPurchasedProductGroup},
								${entry.metadata.metadataLastUpdate.toISOString()}
							)`,
						),
						sql`, `,
					)}
			) as v(
				client_id,
				organization_id,
				metadata_total_compras,
				metadata_valor_total_compras,
				metadata_produto_mais_comprado_id,
				metadata_grupo_produto_mais_comprado,
				metadata_ultima_atualizacao
			)
			where c.id = v.client_id
				and c.organizacao_id = v.organization_id
		`);

		console.log(
			`[ORG: ${organizationId}] [INFO] [ENRICH_CLIENTS] Processed update batch ${batchIndex + 1}/${processingBatches.length} (${processingBatch.length} clients) in ${formatDurationMs(Date.now() - batchStartedAt)}`,
		);
	}

	const durationMs = Date.now() - startedAt;
	console.log(`[ORG: ${organizationId}] [INFO] [ENRICH_CLIENTS] Finished all update batches in ${formatDurationMs(durationMs)}`);

	return {
		processedBatchesCount: processingBatches.length,
		durationMs,
	};
}

function chunkArray<T>(array: T[], size: number): T[][] {
	if (size <= 0) return [array];

	const chunks: T[][] = [];
	for (let index = 0; index < array.length; index += size) {
		chunks.push(array.slice(index, index + size));
	}

	return chunks;
}

function formatDurationMs(durationMs: number) {
	if (durationMs < 1000) return `${durationMs}ms`;

	const seconds = durationMs / 1000;
	if (seconds < 60) return `${seconds.toFixed(2)}s`;

	return `${(seconds / 60).toFixed(2)}min`;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export const GET = appApiHandler({
	GET: async (req) => {
		assertCronAuthorized(req);
		return getEnrichClientsRoute(req);
	},
});
