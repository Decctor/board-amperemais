import { fetchConnectorImportBatch, type TCanonicalImportWindow } from "@/lib/data-connectors";
import { processSaleCupomAutoPrintIfEligible } from "@/lib/desktop-agent/auto-print";
import { getActiveDataSourceIntegrations, type TDataSourceIntegration } from "@/lib/integrations/data-sources";
import { resolveIfoodManagementContext } from "@/lib/integrations/ifood/context";
import { confirmIfoodOrder } from "@/lib/integrations/ifood/orders";
import { getChannelErpPolicy } from "@/lib/sales/fulfillment-channels/policy";
import { processSaleAutomaticFiscalEmissionIfEligible } from "@/lib/sales/sale-processing/process-sale-automatic-fiscal-emission";
import { processOrganizationInteractionsBatch, type ImmediateProcessingData } from "@/lib/interactions";
import { db } from "@/services/drizzle";
import { integrations, organizations } from "@/services/drizzle/schema";
import { isAxiosError } from "axios";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { and, eq, inArray, ne } from "drizzle-orm";
import { z } from "zod";
import { resolveCampaignAudiences } from "./campaign-audiences";
import { processDataCollectingV2Effects } from "./effects";
import { loadPurchaseEffectCampaigns } from "./purchase-effect-campaigns";
import { syncAuxiliaryEntities } from "./sync-auxiliary-entities";
import { syncSales, type TSyncSalesErpOptions } from "./sync-sales";
import type {
	TDataCollectingV2EffectsOptions,
	TDataCollectingV2RawBatch,
	TDataCollectingV2RunError,
	TDataCollectingV2RunSummary,
	TPersistedSaleForEffects,
} from "./types";

dayjs.extend(utc);
dayjs.extend(timezone);

export type TRunDataCollectingV2Params = {
	organizationIds?: string[];
	/**
	 * Restringe o run a conexões específicas (ex.: webhook que já resolveu o merchant → linha).
	 * Sem isso, um evento de uma loja iFood dispararia polling/refresh de TODAS as fontes da org.
	 */
	integrationIds?: string[];
	window?: TCanonicalImportWindow;
	processImmediateInteractions?: boolean;
	effects?: Partial<TDataCollectingV2EffectsOptions>;
	includeRawInResult?: boolean;
};

const DEFAULT_EFFECTS_OPTIONS: TDataCollectingV2EffectsOptions = {
	processCashback: true,
	processCampaigns: true,
	processConversionAttribution: true,
};

const DATA_COLLECTING_TIMEZONE = process.env.DATA_COLLECTING_TIMEZONE ?? "America/Sao_Paulo";

function getDefaultImportWindow(): TCanonicalImportWindow {
	const referenceDate = dayjs().tz(DATA_COLLECTING_TIMEZONE);
	return {
		startDate: referenceDate.startOf("day").toDate(),
		endDate: referenceDate.endOf("day").toDate(),
	};
}

function serializeDataCollectingError(error: unknown) {
	if (error instanceof z.ZodError) {
		return {
			type: "ZodError",
			message: error.message,
			issues: error.issues.map((issue) => ({
				path: issue.path.join("."),
				message: issue.message,
				code: issue.code,
				expected: "expected" in issue ? issue.expected : undefined,
				received: "received" in issue ? issue.received : undefined,
			})),
		};
	}

	if (isAxiosError(error)) {
		return {
			type: "AxiosError",
			message: error.message,
			code: error.code,
			status: error.response?.status,
			statusText: error.response?.statusText,
			url: error.config?.url,
			method: error.config?.method,
			params: error.config?.params,
			responseData: error.response?.data,
		};
	}

	if (error instanceof Error) {
		return {
			type: error.name,
			message: error.message,
			stack: error.stack,
		};
	}

	return {
		type: typeof error,
		value: String(error),
	};
}

async function loadDataSourceIntegrations(organizationIds?: string[], integrationIds?: string[]) {
	const rows = await getActiveDataSourceIntegrations({ executor: db });
	const organizationIdSet = organizationIds?.length ? new Set(organizationIds) : null;
	const integrationIdSet = integrationIds?.length ? new Set(integrationIds) : null;
	return rows.filter(
		(integration) =>
			(!organizationIdSet || organizationIdSet.has(integration.organizacaoId)) && (!integrationIdSet || integrationIdSet.has(integration.id)),
	);
}

async function loadOrganizationConfigurations(organizationIds: string[]) {
	if (organizationIds.length === 0) return new Map<string, TOrganizationConfigurationRow>();
	const rows = await db.query.organizations.findMany({
		where: inArray(organizations.id, organizationIds),
		columns: { id: true, configuracao: true },
	});
	return new Map(rows.map((row) => [row.id, row]));
}
type TOrganizationConfigurationRow = { id: string; configuracao: (typeof organizations.$inferSelect)["configuracao"] };

async function processIntegration({
	integration,
	organizationConfiguration,
	window,
	effects,
	includeRawInResult,
}: {
	integration: TDataSourceIntegration;
	organizationConfiguration: (typeof organizations.$inferSelect)["configuracao"] | null;
	window: TCanonicalImportWindow;
	effects: TDataCollectingV2EffectsOptions;
	includeRawInResult?: boolean;
}) {
	const organizationId = integration.organizacaoId;
	const erp: TSyncSalesErpOptions = {
		policy: getChannelErpPolicy(organizationConfiguration),
		stockTrackingEnabled: organizationConfiguration?.preferencias?.rastreamentoEstoque ?? false,
		organizationConfiguration,
	};
	const batch = await fetchConnectorImportBatch({
		organizationId,
		integrationId: integration.id,
		config: integration.configuracao,
		window,
	});
	const campaignsForOrganization = effects.processCampaigns ? await loadPurchaseEffectCampaigns(db, organizationId) : [];
	let immediateProcessingDataList: ImmediateProcessingData[] = [];
	let fiscalEmissionCandidateSaleIds: string[] = [];
	// Hoisted para os hooks pós-commit (aceite automático iFood + cupom automático no becameValid).
	let persistedSalesForPostCommit: TPersistedSaleForEffects[] = [];

	const summary = await db.transaction(async (tx): Promise<TDataCollectingV2RunSummary> => {
		const auxiliaryContext = await syncAuxiliaryEntities({ tx, batch });
		const { persistedSales, saleIdCollisions } = await syncSales({ tx, batch, context: auxiliaryContext, erp });
		persistedSalesForPostCommit = persistedSales;
		fiscalEmissionCandidateSaleIds = persistedSales.filter((sale) => sale.managedFiscalEmissionCandidate).map((sale) => sale.id);
		// Audiences are resolved once from the post-sync state. Keep audience filters independent
		// from client metrics mutated by this batch; per-sale trigger counters live in persistedSales.
		const audiencesByCampaignId = effects.processCampaigns
			? await resolveCampaignAudiences({
					tx,
					organizationId,
					campaigns: campaignsForOrganization,
				})
			: new Map<string, Set<string>>();
		const effectsResult = await processDataCollectingV2Effects({
			tx,
			organizationId,
			campaigns: campaignsForOrganization,
			audiencesByCampaignId,
			persistedSales,
			options: effects,
		});

		immediateProcessingDataList = effectsResult.immediateProcessingDataList;

		return {
			organizationId,
			integrationId: integration.id,
			source: batch.source,
			importedSalesCount: batch.sales.length,
			saleIdCollisionsCount: saleIdCollisions.length,
			createdSalesCount: persistedSales.filter((sale) => sale.isNewSale).length,
			updatedSalesCount: persistedSales.filter((sale) => !sale.isNewSale && !sale.skipped).length,
			unchangedSalesCount: persistedSales.filter((sale) => sale.skipped).length,
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

	await batch.postProcess?.();

	// Aceite automático iFood (pós-commit): pedidos ainda não válidos e não cancelados = PLACED
	// (único estado pré-confirmação do ciclo). `skipped` NÃO filtra de propósito: um confirm que
	// falhou em run anterior deve ser retentado mesmo sem mudança no payload. Confirm repetido
	// enquanto o evento CONFIRMED não chega pelo polling é benigno (Order API responde 202; erro
	// é capturado por pedido). Sem promoção local de status — a consolidação fica com o próximo
	// sync, para que becameValid dispare os efeitos de nova compra pelo caminho canônico.
	const ifoodConfig = integration.configuracao.tipo === "IFOOD" ? integration.configuracao : null;
	if (ifoodConfig?.aceiteAutomaticoPedidos) {
		const pendingAcceptance = persistedSalesForPostCommit.filter((sale) => !sale.previouslyValid && !sale.becameValid && !sale.nowCanceled);
		if (pendingAcceptance.length > 0) {
			try {
				const context = await resolveIfoodManagementContext({ organizacaoId: organizationId, integrationId: integration.id });
				for (const persisted of pendingAcceptance) {
					try {
						await confirmIfoodOrder(context.client, persisted.sourceSaleId);
						console.log(`[DATA_COLLECTING_V2] [ORG: ${organizationId}] Pedido iFood ${persisted.sourceSaleId} aceito automaticamente.`);
						// Cupom direto no aceite: não espera o polling consolidar a confirmação. Nunca
						// lança; a chave de idempotência absorve a sobreposição com o hook do becameValid.
						await processSaleCupomAutoPrintIfEligible({
							organizacaoId: organizationId,
							saleId: persisted.id,
							configuracao: organizationConfiguration,
						});
					} catch (error) {
						console.error(
							`[DATA_COLLECTING_V2] [ORG: ${organizationId}] Falha no aceite automático do pedido iFood ${persisted.sourceSaleId}.`,
							serializeDataCollectingError(error),
						);
					}
				}
			} catch (error) {
				console.error(
					`[DATA_COLLECTING_V2] [ORG: ${organizationId}] Falha ao resolver contexto iFood para aceite automático.`,
					serializeDataCollectingError(error),
				);
			}
		}
	}

	// Cupom automático na confirmação consolidada pelo sync — cobre aceite no dispositivo do
	// iFood, aceite na plataforma e o automático do run anterior. becameValid é exactly-once por
	// venda, então não se paga chamada por venda a cada polling; a allowlist de canais
	// (INTEGRACAO-<canal>) decide se a venda imprime.
	for (const persisted of persistedSalesForPostCommit) {
		if (!persisted.becameValid || persisted.nowCanceled) continue;
		await processSaleCupomAutoPrintIfEligible({
			organizacaoId: organizationId,
			saleId: persisted.id,
			configuracao: organizationConfiguration,
		});
	}

	// Emissão fiscal de vendas gerenciadas entregues (policy.fiscal): roda APÓS o commit — o
	// processo de emissão lê via `db` e dentro da transação enxergaria o estado pré-commit.
	// A elegibilidade completa (entregue, pago, sem documento vigente) é re-checada; idempotente.
	if (fiscalEmissionCandidateSaleIds.length > 0) {
		const organizationEntity = await db.query.organizations.findFirst({
			where: eq(organizations.id, organizationId),
		});
		if (organizationEntity) {
			for (const saleId of fiscalEmissionCandidateSaleIds) {
				try {
					const emission = await processSaleAutomaticFiscalEmissionIfEligible({
						organization: organizationEntity,
						saleId,
						authorId: null,
					});
					if (emission.status === "SOLICITADO") {
						console.log(`[DATA_COLLECTING_V2] [ORG: ${organizationId}] Emissão fiscal solicitada para venda gerenciada ${saleId}.`);
					}
				} catch (error) {
					console.error(`[DATA_COLLECTING_V2] [ORG: ${organizationId}] Falha na emissão fiscal da venda gerenciada ${saleId}.`, error);
				}
			}
		}
	}

	return {
		summary,
		immediateProcessingDataList,
		raw: includeRawInResult ? batch.raw : undefined,
	};
}

export async function runDataCollectingV2({
	organizationIds,
	integrationIds,
	window = getDefaultImportWindow(),
	processImmediateInteractions = true,
	effects: effectsOverrides,
	includeRawInResult = false,
}: TRunDataCollectingV2Params = {}) {
	const effects = { ...DEFAULT_EFFECTS_OPTIONS, ...effectsOverrides };
	// Loop POR INTEGRAÇÃO, não por org: uma organização com N fontes ativas roda N batches (uma
	// linha só tem um tipo — o gate antigo de coerência tipo↔config.tipo vive no filtro de
	// getActiveDataSourceIntegrations).
	const integrationsForImport = await loadDataSourceIntegrations(organizationIds, integrationIds);
	const organizationConfigurationsById = await loadOrganizationConfigurations(
		Array.from(new Set(integrationsForImport.map((integration) => integration.organizacaoId))),
	);
	const summaries: TDataCollectingV2RunSummary[] = [];
	const rawBatches: TDataCollectingV2RawBatch[] = [];
	const allImmediateProcessingData: ImmediateProcessingData[] = [];
	const errors: TDataCollectingV2RunError[] = [];

	for (const integration of integrationsForImport) {
		try {
			const { summary, immediateProcessingDataList, raw } = await processIntegration({
				integration,
				organizationConfiguration: organizationConfigurationsById.get(integration.organizacaoId)?.configuracao ?? null,
				window,
				effects,
				includeRawInResult,
			});
			console.log(`[DATA_COLLECTING_V2] [ORG: ${integration.organizacaoId}] [INTEGRATION: ${integration.id}] Summary`, summary);
			summaries.push(summary);
			if (summary.saleIdCollisionsCount > 0) {
				errors.push({
					organizationId: integration.organizacaoId,
					integrationId: integration.id,
					integrationType: integration.tipo,
					message: `${summary.saleIdCollisionsCount} colisão(ões) de idExterno com vendas de outra origem — itens ignorados (fail-closed).`,
				});
			}
			if (raw !== undefined) {
				rawBatches.push({
					organizationId: integration.organizacaoId,
					integrationId: integration.id,
					source: summary.source,
					window,
					raw,
				});
			}
			allImmediateProcessingData.push(...immediateProcessingDataList);

			// "Última sincronização" finalmente mantida: a linha da conexão registra o fim de cada
			// run bem-sucedido. Colisões fail-closed não derrubam o status (a conexão funciona),
			// mas ficam visíveis em `ultimoErro` até um run limpo — senão a ocorrência só existiria
			// no log do cron.
			await db
				.update(integrations)
				.set({
					dataUltimaSincronizacao: new Date(),
					status: "CONECTADO",
					ultimoErro:
						summary.saleIdCollisionsCount > 0
							? `${summary.saleIdCollisionsCount} colisão(ões) de idExterno com vendas de outra origem no último run — itens ignorados (fail-closed).`
							: null,
				})
				.where(eq(integrations.id, integration.id));
		} catch (error) {
			const message = error instanceof Error ? error.message : "Erro desconhecido ao processar integração.";
			console.error(
				`[DATA_COLLECTING_V2] [ORG: ${integration.organizacaoId}] [INTEGRATION: ${integration.id}] Integration ${integration.tipo} failed`,
				serializeDataCollectingError(error),
			);
			errors.push({
				organizationId: integration.organizacaoId,
				integrationId: integration.id,
				integrationType: integration.tipo,
				message,
			});
			// EXPIRADO (gravado pelo refresh de token que falhou) não é rebaixado para ERRO.
			await db
				.update(integrations)
				.set({ status: "ERRO", ultimoErro: message })
				.where(and(eq(integrations.id, integration.id), ne(integrations.status, "EXPIRADO")));
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
			try {
				const processingSummary = await processOrganizationInteractionsBatch({ organizationId, interactions });
				const failedResults = processingSummary.results.filter((result) => !result.success);

				if (failedResults.length > 0) {
					for (const failedResult of failedResults) {
						console.error(
							`[DATA_COLLECTING_V2] [ORG: ${organizationId}] Immediate interaction ${failedResult.interactionId} finished with status ${failedResult.status}`,
							serializeDataCollectingError(failedResult.error),
						);
					}

					errors.push({
						organizationId,
						integrationId: null,
						integrationType: null,
						message: `${failedResults.length} de ${processingSummary.total} interações imediatas não foram processadas com sucesso.`,
					});
				}
			} catch (error) {
				const message = error instanceof Error ? error.message : "Erro desconhecido ao processar interações imediatas.";
				console.error(`[DATA_COLLECTING_V2] [ORG: ${organizationId}] Immediate interactions processing failed`, serializeDataCollectingError(error));
				errors.push({
					organizationId,
					integrationId: null,
					integrationType: null,
					message,
				});
			}
		}
	}

	return {
		summaries,
		immediateProcessingDataList: allImmediateProcessingData,
		errors,
		...(includeRawInResult ? { rawBatches } : {}),
	};
}

export * from "./campaign-audiences";
export * from "./effects";
export * from "./sync-auxiliary-entities";
export * from "./sync-sales";
export * from "./types";
export * from "./validation";
