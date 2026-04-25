import { fetchConnectorImportBatch, type TCanonicalImportWindow } from "@/lib/data-connectors";
import { processOrganizationInteractionsBatch, type ImmediateProcessingData } from "@/lib/interactions";
import { db } from "@/services/drizzle";
import { campaigns, organizations } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { and, eq, inArray, or } from "drizzle-orm";
import { resolveCampaignAudiences } from "./campaign-audiences";
import { processDataCollectingV2Effects } from "./effects";
import { syncAuxiliaryEntities } from "./sync-auxiliary-entities";
import { syncSales } from "./sync-sales";
import type { TCampaignWithAudienceRelations, TDataCollectingV2RunError, TDataCollectingV2RunSummary } from "./types";

export type TRunDataCollectingV2Params = {
	organizationIds?: string[];
	window?: TCanonicalImportWindow;
	processImmediateInteractions?: boolean;
};

function getDefaultImportWindow(): TCanonicalImportWindow {
	const referenceDate = dayjs();
	return {
		startDate: referenceDate.startOf("day").toDate(),
		endDate: referenceDate.endOf("day").toDate(),
	};
}

async function loadOrganizations(organizationIds?: string[]) {
	return db.query.organizations.findMany({
		where: organizationIds?.length ? inArray(organizations.id, organizationIds) : undefined,
		columns: {
			id: true,
			integracaoTipo: true,
			integracaoConfiguracao: true,
		},
	});
}

async function loadCampaigns(organizationId: string): Promise<TCampaignWithAudienceRelations[]> {
	const result = await db.query.campaigns.findMany({
		where: and(
			eq(campaigns.organizacaoId, organizationId),
			eq(campaigns.ativo, true),
			or(
				eq(campaigns.gatilhoTipo, "NOVA-COMPRA"),
				eq(campaigns.gatilhoTipo, "PRIMEIRA-COMPRA"),
				eq(campaigns.gatilhoTipo, "CASHBACK-ACUMULADO"),
				eq(campaigns.gatilhoTipo, "QUANTIDADE-TOTAL-COMPRAS"),
				eq(campaigns.gatilhoTipo, "VALOR-TOTAL-COMPRAS"),
			),
		),
		with: {
			whatsappConexaoTelefone: {
				columns: { id: true },
				with: {
					conexao: {
						columns: {
							token: true,
							gatewaySessaoId: true,
						},
					},
				},
			},
			segmentacoes: true,
			whatsappTemplate: true,
		},
	});

	return result as TCampaignWithAudienceRelations[];
}

async function processOrganization({
	organizationId,
	config,
	window,
}: {
	organizationId: string;
	config: NonNullable<Awaited<ReturnType<typeof loadOrganizations>>[number]["integracaoConfiguracao"]>;
	window: TCanonicalImportWindow;
}) {
	const batch = await fetchConnectorImportBatch({ organizationId, config, window });
	const campaignsForOrganization = await loadCampaigns(organizationId);
	let immediateProcessingDataList: ImmediateProcessingData[] = [];

	const summary = await db.transaction(async (tx): Promise<TDataCollectingV2RunSummary> => {
		const auxiliaryContext = await syncAuxiliaryEntities({ tx, batch });
		const persistedSales = await syncSales({ tx, batch, context: auxiliaryContext });
		// Audiences are resolved once from the post-sync state. Keep audience filters independent
		// from client metrics mutated by this batch; per-sale trigger counters live in persistedSales.
		const audiencesByCampaignId = await resolveCampaignAudiences({
			tx,
			organizationId,
			campaigns: campaignsForOrganization,
		});
		const effectsResult = await processDataCollectingV2Effects({
			tx,
			organizationId,
			campaigns: campaignsForOrganization,
			audiencesByCampaignId,
			persistedSales,
		});

		immediateProcessingDataList = effectsResult.immediateProcessingDataList;

		return {
			organizationId,
			source: batch.source,
			importedSalesCount: batch.sales.length,
			createdSalesCount: persistedSales.filter((sale) => sale.isNewSale).length,
			updatedSalesCount: persistedSales.filter((sale) => !sale.isNewSale).length,
			createdClientsCount: auxiliaryContext.createdClientsCount,
			createdProductsCount: auxiliaryContext.createdProductsCount,
			createdSellersCount: auxiliaryContext.createdSellersCount,
			createdPartnersCount: auxiliaryContext.createdPartnersCount,
			resolvedCampaignAudiencesCount: audiencesByCampaignId.size,
			createdInteractionsCount: effectsResult.createdInteractionsCount,
			immediateInteractionsCount: effectsResult.immediateInteractionsCount,
			cashbackTransactionsCount: effectsResult.cashbackTransactionsCount,
			cashbackAccumulatedValue: effectsResult.cashbackAccumulatedValue,
			firstPurchaseInteractionsCount: effectsResult.firstPurchaseInteractionsCount,
			cashbackAccumulationInteractionsCount: effectsResult.cashbackAccumulationInteractionsCount,
		};
	});

	return { summary, immediateProcessingDataList };
}

export async function runDataCollectingV2({
	organizationIds,
	window = getDefaultImportWindow(),
	processImmediateInteractions = true,
}: TRunDataCollectingV2Params = {}) {
	const organizationsForImport = await loadOrganizations(organizationIds);
	const organizationsById = new Map(organizationsForImport.map((organization) => [organization.id, organization]));
	const summaries: TDataCollectingV2RunSummary[] = [];
	const allImmediateProcessingData: ImmediateProcessingData[] = [];
	const errors: TDataCollectingV2RunError[] = [];

	for (const organization of organizationsForImport) {
		if (!organization.integracaoTipo || !organization.integracaoConfiguracao) continue;
		if (organization.integracaoConfiguracao.tipo !== organization.integracaoTipo) continue;

		try {
			const { summary, immediateProcessingDataList } = await processOrganization({
				organizationId: organization.id,
				config: organization.integracaoConfiguracao,
				window,
			});

			summaries.push(summary);
			allImmediateProcessingData.push(...immediateProcessingDataList);
		} catch (error) {
			const message = error instanceof Error ? error.message : "Erro desconhecido ao processar organização.";
			console.error(`[DATA_COLLECTING_V2] [ORG: ${organization.id}] Integration ${organization.integracaoTipo} failed`, error);
			errors.push({
				organizationId: organization.id,
				integrationType: organization.integracaoTipo,
				message,
			});
		}
	}

	if (processImmediateInteractions && allImmediateProcessingData.length > 0) {
		const interactionsByOrganizationId = new Map<string, ImmediateProcessingData[]>();
		for (const interaction of allImmediateProcessingData) {
			const interactions = interactionsByOrganizationId.get(interaction.organizationId) ?? [];
			interactions.push(interaction);
			interactionsByOrganizationId.set(interaction.organizationId, interactions);
		}

		for (const [organizationId, interactions] of interactionsByOrganizationId) {
			const organization = organizationsById.get(organizationId);
			try {
				const processingSummary = await processOrganizationInteractionsBatch({ organizationId, interactions });
				const failedResults = processingSummary.results.filter((result) => !result.success);

				if (failedResults.length > 0) {
					for (const failedResult of failedResults) {
						console.error(
							`[DATA_COLLECTING_V2] [ORG: ${organizationId}] Immediate interaction ${failedResult.interactionId} finished with status ${failedResult.status}`,
							failedResult.error,
						);
					}

					errors.push({
						organizationId,
						integrationType: organization?.integracaoTipo ?? null,
						message: `${failedResults.length} de ${processingSummary.total} interações imediatas não foram processadas com sucesso.`,
					});
				}
			} catch (error) {
				const message = error instanceof Error ? error.message : "Erro desconhecido ao processar interações imediatas.";
				console.error(`[DATA_COLLECTING_V2] [ORG: ${organizationId}] Immediate interactions processing failed`, error);
				errors.push({
					organizationId,
					integrationType: organization?.integracaoTipo ?? null,
					message,
				});
			}
		}
	}

	return {
		summaries,
		immediateProcessingDataList: allImmediateProcessingData,
		errors,
	};
}

export * from "./campaign-audiences";
export * from "./effects";
export * from "./sync-auxiliary-entities";
export * from "./sync-sales";
export * from "./types";
export * from "./validation";
