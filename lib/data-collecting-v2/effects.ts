import { accumulateCashbackForClient } from "@/lib/cashback/accumulation";
import { generateCashbackForCampaign } from "@/lib/cashback/generate-campaign-cashback";
import { reverseSaleCashback } from "@/lib/cashback/reverse-sale-cashback";
import { processConversionAttribution } from "@/lib/conversions/attribution";
import { DASTJS_TIME_DURATION_UNITS_MAP, getPostponedDateFromReferenceDate } from "@/lib/dates";
import type { ImmediateProcessingData } from "@/lib/interactions";
import type { TTimeDurationUnitsEnum } from "@/schemas/enums";
import { cashbackProgramBalances, cashbackPrograms, clients, interactions } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { and, eq, gt } from "drizzle-orm";
import { campaignAudienceHasClient } from "./campaign-audiences";
import type { TCampaignWithAudienceRelations, TDataCollectingV2Executor, TPersistedSaleForEffects } from "./types";

type TProcessEffectsResult = {
	createdInteractionsCount: number;
	immediateInteractionsCount: number;
	cashbackTransactionsCount: number;
	cashbackAccumulatedValue: number;
	firstPurchaseInteractionsCount: number;
	cashbackAccumulationInteractionsCount: number;
	immediateProcessingDataList: ImmediateProcessingData[];
};

type TBalanceCacheEntry = {
	programaId: string;
	clienteId: string;
	saldoValorDisponivel: number;
	saldoValorAcumuladoTotal: number;
};

type TSaleCashbackAccumulation = {
	buyerAccumulatedValue: number;
	buyerAvailableBalance: number;
	buyerAccumulatedTotal: number;
	partnerAccumulatedValue: number;
	partnerClientId: string | null;
};

async function canScheduleCampaignForClient({
	tx,
	clientId,
	campaign,
}: {
	tx: TDataCollectingV2Executor;
	clientId: string;
	campaign: TCampaignWithAudienceRelations;
}) {
	if (!campaign.permitirRecorrencia) {
		const previousInteraction = await tx.query.interactions.findFirst({
			where: and(eq(interactions.clienteId, clientId), eq(interactions.campanhaId, campaign.id)),
			columns: { id: true },
		});
		return !previousInteraction;
	}

	if (!campaign.frequenciaIntervaloValor || campaign.frequenciaIntervaloValor <= 0 || !campaign.frequenciaIntervaloMedida) {
		return true;
	}

	const dayjsUnit = DASTJS_TIME_DURATION_UNITS_MAP[campaign.frequenciaIntervaloMedida as TTimeDurationUnitsEnum] || "day";
	const cutoffDate = dayjs().subtract(campaign.frequenciaIntervaloValor, dayjsUnit).toDate();
	const recentInteraction = await tx.query.interactions.findFirst({
		where: and(eq(interactions.clienteId, clientId), eq(interactions.campanhaId, campaign.id), gt(interactions.dataInsercao, cutoffDate)),
		columns: { id: true },
	});

	return !recentInteraction;
}

function getCampaignsForSale({
	campaigns,
	audiencesByCampaignId,
	persistedSale,
}: {
	campaigns: TCampaignWithAudienceRelations[];
	audiencesByCampaignId: Map<string, Set<string>>;
	persistedSale: TPersistedSaleForEffects;
}) {
	const { sale, clientId, isNewSale, isFirstPurchase, newTotalPurchaseCount, newTotalPurchaseValue } = persistedSale;
	if (!isNewSale || !sale.isValidSale || !clientId) return [];

	return campaigns.filter((campaign) => {
		if (!campaignAudienceHasClient(audiencesByCampaignId, campaign.id, clientId)) return false;

		if (campaign.gatilhoTipo === "PRIMEIRA-COMPRA") return isFirstPurchase;
		if (campaign.gatilhoTipo === "NOVA-COMPRA") {
			const meetsValue = campaign.gatilhoNovaCompraValorMinimo == null || sale.totalValue >= campaign.gatilhoNovaCompraValorMinimo;
			return !isFirstPurchase && meetsValue;
		}
		if (campaign.gatilhoTipo === "QUANTIDADE-TOTAL-COMPRAS") {
			return campaign.gatilhoQuantidadeTotalCompras != null && newTotalPurchaseCount === campaign.gatilhoQuantidadeTotalCompras;
		}
		if (campaign.gatilhoTipo === "VALOR-TOTAL-COMPRAS") {
			return campaign.gatilhoValorTotalCompras != null && newTotalPurchaseValue === campaign.gatilhoValorTotalCompras;
		}
		if (campaign.gatilhoTipo === "CASHBACK-ACUMULADO") return false;

		return false;
	});
}

function buildInteractionDescription(campaign: TCampaignWithAudienceRelations, persistedSale: TPersistedSaleForEffects) {
	if (campaign.gatilhoTipo === "PRIMEIRA-COMPRA") return "Cliente realizou sua primeira compra.";
	if (campaign.gatilhoTipo === "NOVA-COMPRA") return `Cliente realizou nova compra via ${persistedSale.sale.channel ?? "integração"}.`;
	if (campaign.gatilhoTipo === "QUANTIDADE-TOTAL-COMPRAS") {
		return `Cliente atingiu ${persistedSale.newTotalPurchaseCount} compras totais.`;
	}
	if (campaign.gatilhoTipo === "VALOR-TOTAL-COMPRAS") {
		return `Cliente atingiu R$ ${persistedSale.newTotalPurchaseValue} em compras totais.`;
	}
	return `Cliente se enquadrou no gatilho ${campaign.gatilhoTipo}.`;
}

function buildCashbackAccumulationDescription(campaign: TCampaignWithAudienceRelations, accumulation: TSaleCashbackAccumulation) {
	return `Cliente acumulou R$ ${accumulation.buyerAccumulatedValue.toFixed(2)} em cashback. Total acumulado: R$ ${accumulation.buyerAccumulatedTotal.toFixed(2)} via campanha ${campaign.titulo}.`;
}

async function pushImmediateProcessingDataIfNeeded({
	tx,
	campaign,
	insertedInteractionId,
	organizationId,
	clientId,
	metadata,
	immediateProcessingDataList,
}: {
	tx: TDataCollectingV2Executor;
	campaign: TCampaignWithAudienceRelations;
	insertedInteractionId: string;
	organizationId: string;
	clientId: string;
	metadata: Record<string, unknown>;
	immediateProcessingDataList: ImmediateProcessingData[];
}) {
	if (
		campaign.execucaoAgendadaValor !== 0 ||
		!campaign.whatsappTemplate
	) {
		return false;
	}

	const clientData = await tx.query.clients.findFirst({
		where: eq(clients.id, clientId),
		columns: {
			id: true,
			nome: true,
			telefone: true,
			email: true,
			analiseRFMTitulo: true,
			metadataProdutoMaisCompradoId: true,
			metadataGrupoProdutoMaisComprado: true,
		},
	});

	if (!clientData) return false;

	immediateProcessingDataList.push({
		interactionId: insertedInteractionId,
		organizationId,
		client: clientData,
		campaign: {
			autorId: campaign.autorId,
			whatsappConexaoTelefoneId: campaign.whatsappConexaoTelefoneId,
			whatsappTemplate: campaign.whatsappTemplate,
		},
		whatsappToken: campaign.whatsappConexaoTelefone?.conexao?.token ?? undefined,
		whatsappSessionId: campaign.whatsappConexaoTelefone?.conexao?.gatewaySessaoId ?? undefined,
		contextMetadados: metadata,
	});

	return true;
}

async function ensureBalance({
	tx,
	organizationId,
	programId,
	clientId,
	balancesByClientId,
}: {
	tx: TDataCollectingV2Executor;
	organizationId: string;
	programId: string;
	clientId: string;
	balancesByClientId: Map<string, TBalanceCacheEntry>;
}) {
	const existing = balancesByClientId.get(clientId);
	if (existing) return existing;

	await tx.insert(cashbackProgramBalances).values({
		organizacaoId: organizationId,
		programaId: programId,
		clienteId: clientId,
		saldoValorDisponivel: 0,
		saldoValorAcumuladoTotal: 0,
	});

	const balance = { programaId: programId, clienteId: clientId, saldoValorDisponivel: 0, saldoValorAcumuladoTotal: 0 };
	balancesByClientId.set(clientId, balance);
	return balance;
}

function updateBalanceCache({
	balancesByClientId,
	programId,
	clientId,
	availableBalance,
	accumulatedTotal,
}: {
	balancesByClientId: Map<string, TBalanceCacheEntry>;
	programId: string;
	clientId: string;
	availableBalance: number;
	accumulatedTotal: number;
}) {
	balancesByClientId.set(clientId, {
		programaId: programId,
		clienteId: clientId,
		saldoValorDisponivel: availableBalance,
		saldoValorAcumuladoTotal: accumulatedTotal,
	});
}

export async function processDataCollectingV2Effects({
	tx,
	organizationId,
	campaigns,
	audiencesByCampaignId,
	persistedSales,
}: {
	tx: TDataCollectingV2Executor;
	organizationId: string;
	campaigns: TCampaignWithAudienceRelations[];
	audiencesByCampaignId: Map<string, Set<string>>;
	persistedSales: TPersistedSaleForEffects[];
}): Promise<TProcessEffectsResult> {
	const immediateProcessingDataList: ImmediateProcessingData[] = [];
	let createdInteractionsCount = 0;
	let immediateInteractionsCount = 0;
	let cashbackTransactionsCount = 0;
	let cashbackAccumulatedValue = 0;
	let firstPurchaseInteractionsCount = 0;
	let cashbackAccumulationInteractionsCount = 0;

	const cashbackProgram = await tx.query.cashbackPrograms.findFirst({
		where: eq(cashbackPrograms.organizacaoId, organizationId),
		columns: {
			id: true,
			ativo: true,
			acumuloTipo: true,
			acumuloValor: true,
			acumuloValorParceiro: true,
			acumuloRegraValorMinimo: true,
			expiracaoRegraValidadeValor: true,
			acumuloPermitirViaIntegracao: true,
		},
	});
	const existingBalances = cashbackProgram
		? await tx.query.cashbackProgramBalances.findMany({
				where: and(eq(cashbackProgramBalances.organizacaoId, organizationId), eq(cashbackProgramBalances.programaId, cashbackProgram.id)),
				columns: {
					programaId: true,
					clienteId: true,
					saldoValorDisponivel: true,
					saldoValorAcumuladoTotal: true,
				},
			})
		: [];
	const balancesByClientId = new Map(existingBalances.map((balance) => [balance.clienteId, balance]));

	for (const persistedSale of persistedSales) {
		let saleCashbackAccumulation: TSaleCashbackAccumulation | null = null;

		if (persistedSale.isNewSale && persistedSale.sale.isValidSale && persistedSale.clientId) {
			await processConversionAttribution(tx, {
				vendaId: persistedSale.id,
				clienteId: persistedSale.clientId,
				organizacaoId: organizationId,
				valorVenda: persistedSale.sale.totalValue,
				dataVenda: persistedSale.sale.occurredAt,
			});
		}

		if (persistedSale.previouslyValid && persistedSale.nowCanceled && persistedSale.clientId) {
			await reverseSaleCashback({
				tx,
				saleId: persistedSale.id,
				clientId: persistedSale.clientId,
				organizationId,
				reason: "VENDA_CANCELADA",
			});
		}

		if (
			cashbackProgram?.ativo &&
			cashbackProgram.acumuloPermitirViaIntegracao &&
			persistedSale.isNewSale &&
			persistedSale.sale.isValidSale &&
			persistedSale.clientId
		) {
			const buyerAccumulation = await accumulateCashbackForClient({
				tx,
				orgId: organizationId,
				clientId: persistedSale.clientId,
				saleId: persistedSale.id,
				saleValue: persistedSale.sale.totalValue,
				program: cashbackProgram,
				createdAt: persistedSale.sale.occurredAt,
			});

			if (buyerAccumulation.transactionId) {
				cashbackTransactionsCount += 1;
				cashbackAccumulatedValue += buyerAccumulation.accumulatedValue;
			}

			updateBalanceCache({
				balancesByClientId,
				programId: cashbackProgram.id,
				clientId: persistedSale.clientId,
				availableBalance: buyerAccumulation.newAvailableBalance,
				accumulatedTotal: buyerAccumulation.newAccumulatedBalance,
			});

			saleCashbackAccumulation = {
				buyerAccumulatedValue: buyerAccumulation.accumulatedValue,
				buyerAvailableBalance: buyerAccumulation.newAvailableBalance,
				buyerAccumulatedTotal: buyerAccumulation.newAccumulatedBalance,
				partnerAccumulatedValue: 0,
				partnerClientId: null,
			};

			if (persistedSale.partnerClientId && persistedSale.partnerClientId !== persistedSale.clientId && cashbackProgram.acumuloValorParceiro > 0) {
				const partnerAccumulation = await accumulateCashbackForClient({
					tx,
					orgId: organizationId,
					clientId: persistedSale.partnerClientId,
					saleId: persistedSale.id,
					saleValue: persistedSale.sale.totalValue,
					program: cashbackProgram,
					accumulationValueOverride: cashbackProgram.acumuloValorParceiro,
					createdAt: persistedSale.sale.occurredAt,
					metadata: {
						ator: "PARCEIRO",
						clienteCompradorId: persistedSale.clientId,
					},
				});

				if (partnerAccumulation.transactionId) {
					cashbackTransactionsCount += 1;
					cashbackAccumulatedValue += partnerAccumulation.accumulatedValue;
				}

				updateBalanceCache({
					balancesByClientId,
					programId: cashbackProgram.id,
					clientId: persistedSale.partnerClientId,
					availableBalance: partnerAccumulation.newAvailableBalance,
					accumulatedTotal: partnerAccumulation.newAccumulatedBalance,
				});

				saleCashbackAccumulation.partnerAccumulatedValue = partnerAccumulation.accumulatedValue;
				saleCashbackAccumulation.partnerClientId = persistedSale.partnerClientId;
			}
		}

		const applicableCampaigns = getCampaignsForSale({ campaigns, audiencesByCampaignId, persistedSale });
		for (const campaign of applicableCampaigns) {
			if (!persistedSale.clientId) continue;
			const canSchedule = await canScheduleCampaignForClient({ tx, clientId: persistedSale.clientId, campaign });
			if (!canSchedule) continue;

			const interactionScheduleDate = getPostponedDateFromReferenceDate({
				date: dayjs().toDate(),
				unit: campaign.execucaoAgendadaMedida,
				value: campaign.execucaoAgendadaValor,
			});
			const metadata = {
				compraValor: persistedSale.sale.totalValue,
				compraVendedorNome: persistedSale.sale.sellerName,
				compraQuantidadeTotal: persistedSale.newTotalPurchaseCount,
				compraValorTotalAcumulado: persistedSale.newTotalPurchaseValue,
				cashbackSaldoDisponivel: balancesByClientId.get(persistedSale.clientId)?.saldoValorDisponivel,
				cashbackTotalAcumuladoVida: balancesByClientId.get(persistedSale.clientId)?.saldoValorAcumuladoTotal,
			};

			const [insertedInteraction] = await tx
				.insert(interactions)
				.values({
					clienteId: persistedSale.clientId,
					campanhaId: campaign.id,
					organizacaoId: organizationId,
					titulo: `Envio de mensagem automática via campanha ${campaign.titulo}`,
					tipo: "ENVIO-MENSAGEM",
					descricao: buildInteractionDescription(campaign, persistedSale),
					agendamentoDataReferencia: dayjs(interactionScheduleDate).format("YYYY-MM-DD"),
					agendamentoBlocoReferencia: campaign.execucaoAgendadaBloco,
					metadados: metadata,
				})
				.returning({ id: interactions.id });

			createdInteractionsCount += 1;
			if (campaign.gatilhoTipo === "PRIMEIRA-COMPRA") firstPurchaseInteractionsCount += 1;
			const pushedImmediate = await pushImmediateProcessingDataIfNeeded({
				tx,
				campaign,
				insertedInteractionId: insertedInteraction.id,
				organizationId,
				clientId: persistedSale.clientId,
				metadata,
				immediateProcessingDataList,
			});
			if (pushedImmediate) immediateInteractionsCount += 1;

			if (cashbackProgram?.ativo && campaign.cashbackGeracaoAtivo && campaign.cashbackGeracaoTipo && campaign.cashbackGeracaoValor) {
				await ensureBalance({ tx, organizationId, programId: cashbackProgram.id, clientId: persistedSale.clientId, balancesByClientId });
				const result = await generateCashbackForCampaign({
					tx,
					organizationId,
					clientId: persistedSale.clientId,
					campaignId: campaign.id,
					cashbackType: campaign.cashbackGeracaoTipo,
					cashbackValue: campaign.cashbackGeracaoValor,
					saleId: persistedSale.id,
					saleValue: persistedSale.sale.totalValue,
					expirationMeasure: campaign.cashbackGeracaoExpiracaoMedida,
					expirationValue: campaign.cashbackGeracaoExpiracaoValor,
				});

				if (result) {
					cashbackTransactionsCount += 1;
					cashbackAccumulatedValue += result.cashbackAmount;
					updateBalanceCache({
						balancesByClientId,
						programId: cashbackProgram.id,
						clientId: persistedSale.clientId,
						availableBalance: result.clientNewAvailableBalance,
						accumulatedTotal: result.clientNewAccumulatedTotal,
					});
				}
			}
		}

		if (saleCashbackAccumulation && saleCashbackAccumulation.buyerAccumulatedValue > 0 && persistedSale.clientId) {
			const cashbackAccumulationCampaigns = campaigns.filter((campaign) => {
				if (campaign.gatilhoTipo !== "CASHBACK-ACUMULADO") return false;
				if (!campaignAudienceHasClient(audiencesByCampaignId, campaign.id, persistedSale.clientId)) return false;

				const meetsNewCashbackThreshold =
					campaign.gatilhoNovoCashbackAcumuladoValorMinimo == null ||
					saleCashbackAccumulation.buyerAccumulatedValue >= campaign.gatilhoNovoCashbackAcumuladoValorMinimo;
				const meetsTotalCashbackThreshold =
					campaign.gatilhoTotalCashbackAcumuladoValorMinimo == null ||
					saleCashbackAccumulation.buyerAvailableBalance >= campaign.gatilhoTotalCashbackAcumuladoValorMinimo;

				return meetsNewCashbackThreshold && meetsTotalCashbackThreshold;
			});

			for (const campaign of cashbackAccumulationCampaigns) {
				const canSchedule = await canScheduleCampaignForClient({ tx, clientId: persistedSale.clientId, campaign });
				if (!canSchedule) continue;

				const interactionScheduleDate = getPostponedDateFromReferenceDate({
					date: dayjs().toDate(),
					unit: campaign.execucaoAgendadaMedida,
					value: campaign.execucaoAgendadaValor,
				});
				const metadata = {
					cashbackAcumuladoValor: saleCashbackAccumulation.buyerAccumulatedValue,
					compraValor: persistedSale.sale.totalValue,
					compraCashbackAcumulado: saleCashbackAccumulation.buyerAccumulatedValue,
					compraCashbackNovoSaldo: saleCashbackAccumulation.buyerAvailableBalance,
					cashbackSaldoDisponivel: saleCashbackAccumulation.buyerAvailableBalance,
					cashbackTotalAcumuladoVida: saleCashbackAccumulation.buyerAccumulatedTotal,
				};

				const [insertedInteraction] = await tx
					.insert(interactions)
					.values({
						clienteId: persistedSale.clientId,
						campanhaId: campaign.id,
						organizacaoId: organizationId,
						titulo: `Envio de mensagem automática via campanha ${campaign.titulo}`,
						tipo: "ENVIO-MENSAGEM",
						descricao: buildCashbackAccumulationDescription(campaign, saleCashbackAccumulation),
						agendamentoDataReferencia: dayjs(interactionScheduleDate).format("YYYY-MM-DD"),
						agendamentoBlocoReferencia: campaign.execucaoAgendadaBloco,
						metadados: metadata,
					})
					.returning({ id: interactions.id });

				createdInteractionsCount += 1;
				cashbackAccumulationInteractionsCount += 1;
				const pushedImmediate = await pushImmediateProcessingDataIfNeeded({
					tx,
					campaign,
					insertedInteractionId: insertedInteraction.id,
					organizationId,
					clientId: persistedSale.clientId,
					metadata,
					immediateProcessingDataList,
				});
				if (pushedImmediate) immediateInteractionsCount += 1;

				if (cashbackProgram?.ativo && campaign.cashbackGeracaoAtivo && campaign.cashbackGeracaoTipo && campaign.cashbackGeracaoValor) {
					await ensureBalance({ tx, organizationId, programId: cashbackProgram.id, clientId: persistedSale.clientId, balancesByClientId });
					const result = await generateCashbackForCampaign({
						tx,
						organizationId,
						clientId: persistedSale.clientId,
						campaignId: campaign.id,
						cashbackType: campaign.cashbackGeracaoTipo,
						cashbackValue: campaign.cashbackGeracaoValor,
						saleId: persistedSale.id,
						saleValue: persistedSale.sale.totalValue,
						expirationMeasure: campaign.cashbackGeracaoExpiracaoMedida,
						expirationValue: campaign.cashbackGeracaoExpiracaoValor,
					});

					if (result) {
						cashbackTransactionsCount += 1;
						cashbackAccumulatedValue += result.cashbackAmount;
						updateBalanceCache({
							balancesByClientId,
							programId: cashbackProgram.id,
							clientId: persistedSale.clientId,
							availableBalance: result.clientNewAvailableBalance,
							accumulatedTotal: result.clientNewAccumulatedTotal,
						});
					}
				}
			}
		}
	}

	return {
		createdInteractionsCount,
		immediateInteractionsCount,
		cashbackTransactionsCount,
		cashbackAccumulatedValue,
		firstPurchaseInteractionsCount,
		cashbackAccumulationInteractionsCount,
		immediateProcessingDataList,
	};
}
