import { buildContextVariablesMap } from "@/lib/interactions/process-single-interaction";
import { createCampaignWeeklyLimitCache, reserveCampaignWeeklyQuotaBatch } from "@/lib/interactions/campaign-weekly-limits";
import { sendTemplateWhatsappMessage } from "@/lib/whatsapp";
import { parseTemplatePayloadToGatewayContent, sendMessage } from "@/lib/whatsapp/internal-gateway";
import type { TInteractionContextMetadados, TWhatsappTemplateVariables } from "@/lib/whatsapp/template-variables";
import { getWhatsappTemplatePayload } from "@/lib/whatsapp/templates";
import { formatPhoneForInternalGateway } from "@/lib/whatsapp/utils";
import type { TInteractionsCronJobTimeBlocksEnum } from "@/schemas/enums";
import { db } from "@/services/drizzle";
import { chatMessages, chats, interactions } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import type { NextApiHandler } from "next";

dayjs.extend(utc);
dayjs.extend(timezone);

const TIME_BLOCKS = ["00:00", "03:00", "06:00", "09:00", "12:00", "15:00", "18:00", "21:00"] as const;
const INTERACTIONS_CRON_TIMEZONE = process.env.INTERACTIONS_CRON_TIMEZONE ?? "America/Sao_Paulo";
const INTERACTIONS_PAGE_SIZE = 250;
const CLAIM_BATCH_SIZE = 100;
const SEND_CONCURRENCY = 10;
const RUNTIME_BUDGET_MS = 295000;

export const config = {
	maxDuration: 300,
};

type TOrganizationProcessingSummary = {
	pagesProcessed: number;
	interactionsRead: number;
	interactionsClaimed: number;
	interactionsBlocked: number;
	interactionsSent: number;
	interactionsQueued: number;
	interactionsFailed: number;
	interactionsSkippedAlreadyReserved: number;
	stoppedByTimeBudget: boolean;
};

type TProcessingSummary = TOrganizationProcessingSummary & {
	organizationsCount: number;
	processedOrganizationsCount: number;
	failedOrganizationsCount: number;
};

type TProcessClaimedInteractionStatus = "SENT" | "QUEUED" | "FAILED";
type TChatPromiseCache = Map<string, Promise<string | null>>;

function createEmptyOrganizationSummary(): TOrganizationProcessingSummary {
	return {
		pagesProcessed: 0,
		interactionsRead: 0,
		interactionsClaimed: 0,
		interactionsBlocked: 0,
		interactionsSent: 0,
		interactionsQueued: 0,
		interactionsFailed: 0,
		interactionsSkippedAlreadyReserved: 0,
		stoppedByTimeBudget: false,
	};
}

function mergeOrganizationSummary(target: TProcessingSummary, source: TOrganizationProcessingSummary) {
	target.pagesProcessed += source.pagesProcessed;
	target.interactionsRead += source.interactionsRead;
	target.interactionsClaimed += source.interactionsClaimed;
	target.interactionsBlocked += source.interactionsBlocked;
	target.interactionsSent += source.interactionsSent;
	target.interactionsQueued += source.interactionsQueued;
	target.interactionsFailed += source.interactionsFailed;
	target.interactionsSkippedAlreadyReserved += source.interactionsSkippedAlreadyReserved;
	target.stoppedByTimeBudget = target.stoppedByTimeBudget || source.stoppedByTimeBudget;
}

function chunkArray<T>(array: T[], size: number): T[][] {
	if (size <= 0) return [array];

	const chunks: T[][] = [];
	for (let index = 0; index < array.length; index += size) {
		chunks.push(array.slice(index, index + size));
	}

	return chunks;
}

function shouldContinueProcessing(startedAt: number) {
	return Date.now() - startedAt < RUNTIME_BUDGET_MS;
}

function getCurrentTimeBlock(currentTime = dayjs()): (typeof TIME_BLOCKS)[number] {
	const currentHour = currentTime.hour();
	const currentMinute = currentTime.minute();
	const currentTotalMinutes = currentHour * 60 + currentMinute;

	let closestBlock: (typeof TIME_BLOCKS)[number] = TIME_BLOCKS[0];
	for (const block of TIME_BLOCKS) {
		const [hour, minute] = block.split(":").map(Number);
		const blockMinutes = hour * 60 + minute;
		if (blockMinutes <= currentTotalMinutes) {
			closestBlock = block;
			continue;
		}
		break;
	}

	return closestBlock;
}

async function fetchPendingInteractionsPage({
	organizationId,
	currentDateAsISO8601,
	currentTimeBlock,
	excludedInteractionIds,
}: {
	organizationId: string;
	currentDateAsISO8601: string;
	currentTimeBlock: (typeof TIME_BLOCKS)[number];
	excludedInteractionIds: Set<string>;
}) {
	const excludedIds = Array.from(excludedInteractionIds);

	return db.query.interactions.findMany({
		where: (fields, { and, eq, isNull, isNotNull }) => {
			const conditions = [
				eq(fields.organizacaoId, organizationId),
				eq(fields.agendamentoDataReferencia, currentDateAsISO8601),
				eq(fields.agendamentoBlocoReferencia, currentTimeBlock as TInteractionsCronJobTimeBlocksEnum),
				isNotNull(fields.campanhaId),
				isNull(fields.dataExecucao),
				sql`${fields.statusEnvio} IS DISTINCT FROM 'BLOQUEADA'`,
			];

			if (excludedIds.length > 0) {
				conditions.push(notInArray(fields.id, excludedIds));
			}

			return and(...conditions);
		},
		columns: {
			id: true,
			clienteId: true,
			campanhaId: true,
			dataExecucao: true,
			metadados: true,
		},
		with: {
			cliente: {
				columns: {
					id: true,
					nome: true,
					telefone: true,
					email: true,
					analiseRFMTitulo: true,
				},
			},
			campanha: {
				columns: {
					whatsappConexaoTelefoneId: true,
				},
				with: {
					whatsappConexaoTelefone: {
						columns: {
							id: true,
							whatsappTelefoneId: true,
						},
						with: {
							conexao: {
								columns: {
									tipoConexao: true,
									token: true,
									gatewaySessaoId: true,
								},
							},
						},
					},
				},
			},
		},
		orderBy: (fields, { asc }) => [asc(fields.dataInsercao), asc(fields.id)],
		limit: INTERACTIONS_PAGE_SIZE,
	});
}

type TPendingInteraction = Awaited<ReturnType<typeof fetchPendingInteractionsPage>>[number];

async function fetchCampaignsForOrganization({ organizationId, campaignIds }: { organizationId: string; campaignIds: string[] }) {
	if (campaignIds.length === 0) return [];

	return db.query.campaigns.findMany({
		where: (fields, { and, inArray }) => and(eq(fields.organizacaoId, organizationId), inArray(fields.id, campaignIds)),
		columns: {
			id: true,
			autorId: true,
		},
		with: {
			whatsappTemplate: true,
		},
	});
}

type TProcessingCampaign = Awaited<ReturnType<typeof fetchCampaignsForOrganization>>[number];

function groupInteractionsByCampaign(interactionsPage: TPendingInteraction[]) {
	const interactionsByCampaign = new Map<string, TPendingInteraction[]>();

	for (const interaction of interactionsPage) {
		if (!interaction.campanhaId) continue;

		const existingCampaignInteractions = interactionsByCampaign.get(interaction.campanhaId);
		if (existingCampaignInteractions) {
			existingCampaignInteractions.push(interaction);
			continue;
		}

		interactionsByCampaign.set(interaction.campanhaId, [interaction]);
	}

	return interactionsByCampaign;
}

async function markInteractionsAsBlocked({
	organizationId,
	interactionIds,
	errorMessage,
}: {
	organizationId: string;
	interactionIds: string[];
	errorMessage: string;
}) {
	if (interactionIds.length === 0) return;

	await db
		.update(interactions)
		.set({
			statusEnvio: "BLOQUEADA",
			erroEnvio: errorMessage,
		})
		.where(and(eq(interactions.organizacaoId, organizationId), inArray(interactions.id, interactionIds)));
}

async function markInteractionsAsFailed({
	organizationId,
	interactionIds,
	errorMessage,
}: {
	organizationId: string;
	interactionIds: string[];
	errorMessage: string;
}) {
	if (interactionIds.length === 0) return;

	await db
		.update(interactions)
		.set({
			statusEnvio: "FALHOU",
			erroEnvio: errorMessage,
		})
		.where(and(eq(interactions.organizacaoId, organizationId), inArray(interactions.id, interactionIds)));
}

function getCampaignConfigurationError(campaign: TProcessingCampaign, sampleInteraction: TPendingInteraction): string | null {
	if (!sampleInteraction.campanha) {
		return "Campanha não encontrada para processar a interação.";
	}

	if (!campaign.whatsappTemplate) {
		return "Campanha sem template de WhatsApp configurado.";
	}

	const whatsappConnectionPhone = sampleInteraction.campanha.whatsappConexaoTelefone;
	if (!whatsappConnectionPhone) {
		return "Campanha sem telefone de conexão do WhatsApp configurado.";
	}

	const whatsappConnection = whatsappConnectionPhone.conexao;
	if (!whatsappConnection) {
		return "Campanha sem conexão de WhatsApp disponível.";
	}

	if (whatsappConnection.tipoConexao === "META_CLOUD_API" && (!whatsappConnection.token || !whatsappConnectionPhone.whatsappTelefoneId)) {
		return "Configuração da Cloud API do WhatsApp está incompleta.";
	}

	if (whatsappConnection.tipoConexao === "INTERNAL_GATEWAY" && !whatsappConnection.gatewaySessaoId) {
		return "Configuração do Gateway Interno do WhatsApp está incompleta.";
	}

	return null;
}

async function getOrCreateChatId({
	organizationId,
	clientId,
	whatsappConnectionPhoneId,
	whatsappPhoneId,
	chatIdCache,
}: {
	organizationId: string;
	clientId: string;
	whatsappConnectionPhoneId: string;
	whatsappPhoneId: string | null;
	chatIdCache: TChatPromiseCache;
}) {
	const cacheKey = `${organizationId}:${clientId}:${whatsappConnectionPhoneId}`;
	const cachedChatPromise = chatIdCache.get(cacheKey);
	if (cachedChatPromise) {
		return cachedChatPromise;
	}

	const chatIdPromise = (async () => {
		const existingChat = await db.query.chats.findFirst({
			where: (fields, { and, eq }) =>
				and(eq(fields.organizacaoId, organizationId), eq(fields.clienteId, clientId), eq(fields.whatsappConexaoTelefoneId, whatsappConnectionPhoneId)),
			columns: {
				id: true,
			},
		});

		if (existingChat) {
			return existingChat.id;
		}

		const [newChat] = await db
			.insert(chats)
			.values({
				organizacaoId: organizationId,
				clienteId: clientId,
				whatsappTelefoneId: whatsappPhoneId,
				whatsappConexaoTelefoneId: whatsappConnectionPhoneId,
				ultimaMensagemData: new Date(),
				ultimaMensagemConteudoTipo: "TEXTO",
			})
			.returning({ id: chats.id });

		return newChat?.id ?? null;
	})();

	chatIdCache.set(cacheKey, chatIdPromise);

	try {
		const chatId = await chatIdPromise;
		if (!chatId) {
			chatIdCache.delete(cacheKey);
		}
		return chatId;
	} catch (error) {
		chatIdCache.delete(cacheKey);
		throw error;
	}
}

async function processClaimedInteraction({
	organizationId,
	interaction,
	campaign,
	hasHubAccess,
	chatIdCache,
}: {
	organizationId: string;
	interaction: TPendingInteraction;
	campaign: TProcessingCampaign;
	hasHubAccess: boolean;
	chatIdCache: TChatPromiseCache;
}): Promise<TProcessClaimedInteractionStatus> {
	if (!interaction.cliente.telefone) {
		await markInteractionsAsFailed({
			organizationId,
			interactionIds: [interaction.id],
			errorMessage: "Cliente não tem telefone válido.",
		});
		return "FAILED";
	}

	const interactionCampaign = interaction.campanha;
	if (!interactionCampaign?.whatsappConexaoTelefone?.conexao || !campaign.whatsappTemplate) {
		await markInteractionsAsFailed({
			organizationId,
			interactionIds: [interaction.id],
			errorMessage: "Configuração da campanha indisponível para envio.",
		});
		return "FAILED";
	}

	const interactionMetadata = (interaction.metadados ?? {}) as Record<string, unknown>;
	const interactionMetadados = (interaction.metadados ?? {}) as TInteractionContextMetadados & Record<string, unknown>;
	const contextVars = buildContextVariablesMap(interactionMetadados);
	const whatsappConnectionPhone = interactionCampaign.whatsappConexaoTelefone;
	const whatsappConnection = whatsappConnectionPhone.conexao;

	const whatsappTemplateVariablesValuesMap: Record<keyof TWhatsappTemplateVariables, string> = {
		clientEmail: interaction.cliente.email ?? "",
		clientName: interaction.cliente.nome,
		clientPhoneNumber: interaction.cliente.telefone,
		clientSegmentation: interaction.cliente.analiseRFMTitulo ?? "",
		clientFavoriteProduct: "",
		clientFavoriteProductGroup: "",
		clientSuggestedProduct: "",
		...contextVars,
	};

	const payload = getWhatsappTemplatePayload({
		template: {
			name: campaign.whatsappTemplate.nome,
			content: campaign.whatsappTemplate.componentes.corpo.conteudo,
			components: campaign.whatsappTemplate.componentes,
		},
		variables: whatsappTemplateVariablesValuesMap,
		toPhoneNumber: interaction.cliente.telefone,
	});

	let insertedChatMessageId: string | null = null;

	try {
		if (hasHubAccess) {
			const chatId = await getOrCreateChatId({
				organizationId,
				clientId: interaction.clienteId,
				whatsappConnectionPhoneId: whatsappConnectionPhone.id,
				whatsappPhoneId: whatsappConnectionPhone.whatsappTelefoneId,
				chatIdCache,
			});

			if (!chatId) {
				throw new Error("Falha ao resolver o chat da interação.");
			}

			const insertedChatMessageResponse = await db
				.insert(chatMessages)
				.values({
					organizacaoId: organizationId,
					chatId: chatId,
					autorTipo: "USUÁRIO",
					autorUsuarioId: campaign.autorId,
					conteudoTexto: payload.content,
					conteudoMidiaTipo: "TEXTO",
				})
				.returning({ id: chatMessages.id });

			insertedChatMessageId = insertedChatMessageResponse[0]?.id ?? null;
			if (!insertedChatMessageId) {
				throw new Error("Falha ao inserir a mensagem no chat.");
			}
		}

		let whatsappMessageId: string | undefined;
		let interactionStatusEnvio: "PENDENTE" | "ENVIADO" = "ENVIADO";
		let interactionClientMessageId: string | undefined;
		let interactionJobId: string | undefined;

		if (whatsappConnection.tipoConexao === "META_CLOUD_API") {
			if (!whatsappConnection.token || !whatsappConnectionPhone.whatsappTelefoneId) {
				throw new Error("Configuração da Cloud API do WhatsApp está incompleta.");
			}

			const sentWhatsappTemplateResponse = await sendTemplateWhatsappMessage({
				fromPhoneNumberId: whatsappConnectionPhone.whatsappTelefoneId,
				templatePayload: payload.data,
				whatsappToken: whatsappConnection.token,
			});

			whatsappMessageId = sentWhatsappTemplateResponse.whatsappMessageId;
		} else if (whatsappConnection.tipoConexao === "INTERNAL_GATEWAY") {
			if (!whatsappConnection.gatewaySessaoId) {
				throw new Error("Configuração do Gateway Interno do WhatsApp está incompleta.");
			}

			const gatewayPayload = {
				...payload.data,
				to: formatPhoneForInternalGateway(interaction.cliente.telefone),
			};
			const templateContent = parseTemplatePayloadToGatewayContent(gatewayPayload, {
				fallbackText: payload.content,
			});
			const sentWhatsappTemplateResponse = await sendMessage(
				whatsappConnection.gatewaySessaoId,
				formatPhoneForInternalGateway(interaction.cliente.telefone),
				templateContent,
				{ clientMessageId: interaction.id },
			);

			if (!sentWhatsappTemplateResponse.success) {
				throw new Error(sentWhatsappTemplateResponse.error || "Falha ao enfileirar mensagem no Gateway Interno.");
			}

			interactionStatusEnvio = "PENDENTE";
			interactionClientMessageId = interaction.id;
			interactionJobId = sentWhatsappTemplateResponse.jobId;
		} else {
			throw new Error(`Tipo de conexão do WhatsApp desconhecido: ${whatsappConnection.tipoConexao}`);
		}

		if (hasHubAccess && insertedChatMessageId) {
			await db
				.update(chatMessages)
				.set({
					...(whatsappMessageId != null && { whatsappMessageId }),
					whatsappMessageStatus: interactionStatusEnvio === "PENDENTE" ? "PENDENTE" : "ENVIADO",
				})
				.where(eq(chatMessages.id, insertedChatMessageId));
		}

		await db
			.update(interactions)
			.set({
				statusEnvio: interactionStatusEnvio,
				erroEnvio: null,
				metadados: {
					...interactionMetadata,
					...(interactionClientMessageId != null && { clientMessageId: interactionClientMessageId }),
					...(interactionJobId != null && { jobId: interactionJobId }),
					...(insertedChatMessageId != null && { chatMessageId: insertedChatMessageId }),
					...(whatsappMessageId != null && { whatsappMessageId }),
					whatsappTemplateId: campaign.whatsappTemplate.id,
				},
			})
			.where(and(eq(interactions.id, interaction.id), eq(interactions.organizacaoId, organizationId)));

		return interactionStatusEnvio === "PENDENTE" ? "QUEUED" : "SENT";
	} catch (error) {
		console.error(`[ORG: ${organizationId}] [ERROR] [PROCESS_INTERACTIONS] Falha ao enviar interação ${interaction.id}:`, error);

		if (hasHubAccess && insertedChatMessageId) {
			await db
				.update(chatMessages)
				.set({
					whatsappMessageStatus: "FALHOU",
				})
				.where(eq(chatMessages.id, insertedChatMessageId));
		}

		await db
			.update(interactions)
			.set({
				statusEnvio: "FALHOU",
				erroEnvio: "Houve uma falha ao enviar a mensagem via WhatsApp.",
				dataExecucao: null,
			})
			.where(and(eq(interactions.id, interaction.id), eq(interactions.organizacaoId, organizationId)));

		return "FAILED";
	}
}

const processInteractionsHandler: NextApiHandler = async (req, res) => {
	void req;
	const startedAt = Date.now();

	try {
		const nowInCronTimezone = dayjs().tz(INTERACTIONS_CRON_TIMEZONE);
		const currentDateAsISO8601 = nowInCronTimezone.format("YYYY-MM-DD");
		const currentTimeBlock = getCurrentTimeBlock(nowInCronTimezone);

		console.log("[INFO] [PROCESS_INTERACTIONS] Iniciando processamento de interações", {
			timezone: INTERACTIONS_CRON_TIMEZONE,
			nowInTimezone: nowInCronTimezone.format(),
			currentDate: currentDateAsISO8601,
			currentTimeBlock,
			pageSize: INTERACTIONS_PAGE_SIZE,
			claimBatchSize: CLAIM_BATCH_SIZE,
			sendConcurrency: SEND_CONCURRENCY,
			runtimeBudgetMs: RUNTIME_BUDGET_MS,
		});

		const organizationsList = await db.query.organizations.findMany({
			columns: { id: true, configuracao: true },
		});

		const overallSummary: TProcessingSummary = {
			organizationsCount: organizationsList.length,
			processedOrganizationsCount: 0,
			failedOrganizationsCount: 0,
			...createEmptyOrganizationSummary(),
		};

		for (const organization of organizationsList) {
			if (!shouldContinueProcessing(startedAt)) {
				overallSummary.stoppedByTimeBudget = true;
				break;
			}

			try {
				const organizationStartedAt = Date.now();
				const organizationSummary = createEmptyOrganizationSummary();
				const attemptedInteractionIds = new Set<string>();
				const blockedCampaignMessages = new Map<string, string>();
				const chatIdCache: TChatPromiseCache = new Map();
				const weeklyLimitCache = createCampaignWeeklyLimitCache();
				const hasHubAccess = organization.configuracao?.recursos?.hubAtendimentos?.acesso ?? false;

				console.log(`[ORG: ${organization.id}] [INFO] [PROCESS_INTERACTIONS] Iniciando processamento da organização`);

				while (shouldContinueProcessing(startedAt)) {
					const pendingInteractionsPage = await fetchPendingInteractionsPage({
						organizationId: organization.id,
						currentDateAsISO8601,
						currentTimeBlock,
						excludedInteractionIds: attemptedInteractionIds,
					});

					if (pendingInteractionsPage.length === 0) {
						break;
					}

					organizationSummary.pagesProcessed += 1;
					organizationSummary.interactionsRead += pendingInteractionsPage.length;

					const interactionsByCampaign = groupInteractionsByCampaign(pendingInteractionsPage);
					const campaignIds = [...interactionsByCampaign.keys()];
					const campaigns = await fetchCampaignsForOrganization({
						organizationId: organization.id,
						campaignIds,
					});
					const campaignsById = new Map(campaigns.map((campaign) => [campaign.id, campaign]));

					for (const [campaignId, campaignInteractions] of interactionsByCampaign) {
						if (!shouldContinueProcessing(startedAt)) {
							organizationSummary.stoppedByTimeBudget = true;
							break;
						}

						const blockedCampaignMessage = blockedCampaignMessages.get(campaignId);
						if (blockedCampaignMessage) {
							await markInteractionsAsBlocked({
								organizationId: organization.id,
								interactionIds: campaignInteractions.map((interaction) => interaction.id),
								errorMessage: blockedCampaignMessage,
							});

							for (const interaction of campaignInteractions) {
								attemptedInteractionIds.add(interaction.id);
							}

							organizationSummary.interactionsBlocked += campaignInteractions.length;
							continue;
						}

						const campaign = campaignsById.get(campaignId);
						if (!campaign) {
							await markInteractionsAsFailed({
								organizationId: organization.id,
								interactionIds: campaignInteractions.map((interaction) => interaction.id),
								errorMessage: "Campanha não encontrada para processar a interação.",
							});

							for (const interaction of campaignInteractions) {
								attemptedInteractionIds.add(interaction.id);
							}

							organizationSummary.interactionsFailed += campaignInteractions.length;
							continue;
						}

						const campaignConfigurationError = getCampaignConfigurationError(campaign, campaignInteractions[0]);
						if (campaignConfigurationError) {
							await markInteractionsAsFailed({
								organizationId: organization.id,
								interactionIds: campaignInteractions.map((interaction) => interaction.id),
								errorMessage: campaignConfigurationError,
							});

							for (const interaction of campaignInteractions) {
								attemptedInteractionIds.add(interaction.id);
							}

							organizationSummary.interactionsFailed += campaignInteractions.length;
							continue;
						}

						const claimBatches = chunkArray(campaignInteractions, CLAIM_BATCH_SIZE);

						for (const claimBatch of claimBatches) {
							if (!shouldContinueProcessing(startedAt)) {
								organizationSummary.stoppedByTimeBudget = true;
								break;
							}

							const claimResult = await reserveCampaignWeeklyQuotaBatch({
								organizationId: organization.id,
								campaignId,
								interactionIds: claimBatch.map((interaction) => interaction.id),
								cache: weeklyLimitCache,
							});

							for (const interactionId of claimResult.claimedInteractionIds) {
								attemptedInteractionIds.add(interactionId);
							}
							for (const interactionId of claimResult.blockedInteractionIds) {
								attemptedInteractionIds.add(interactionId);
							}
							for (const interactionId of claimResult.alreadyReservedInteractionIds) {
								attemptedInteractionIds.add(interactionId);
							}
							for (const interactionId of claimResult.missingInteractionIds) {
								attemptedInteractionIds.add(interactionId);
							}

							organizationSummary.interactionsClaimed += claimResult.claimedInteractionIds.length;
							organizationSummary.interactionsBlocked += claimResult.blockedInteractionIds.length;
							organizationSummary.interactionsSkippedAlreadyReserved += claimResult.alreadyReservedInteractionIds.length;

							if (claimResult.missingInteractionIds.length > 0) {
								console.warn(`[ORG: ${organization.id}] [WARN] [PROCESS_INTERACTIONS] Interações não encontradas durante o claim em lote`, {
									campaignId,
									missingInteractionIds: claimResult.missingInteractionIds,
								});
								organizationSummary.interactionsFailed += claimResult.missingInteractionIds.length;
							}

							if (claimResult.blockedInteractionIds.length > 0 && claimResult.message) {
								blockedCampaignMessages.set(campaignId, claimResult.message);
							}

							if (claimResult.claimedInteractionIds.length === 0) {
								continue;
							}

							const claimedInteractionIds = new Set(claimResult.claimedInteractionIds);
							const claimedInteractions = claimBatch.filter((interaction) => claimedInteractionIds.has(interaction.id));
							const sendBatches = chunkArray(claimedInteractions, SEND_CONCURRENCY);

							for (const sendBatch of sendBatches) {
								const sendResults = await Promise.allSettled(
									sendBatch.map((interaction) =>
										processClaimedInteraction({
											organizationId: organization.id,
											interaction,
											campaign,
											hasHubAccess,
											chatIdCache,
										}),
									),
								);

								for (const sendResult of sendResults) {
									if (sendResult.status !== "fulfilled") {
										organizationSummary.interactionsFailed += 1;
										continue;
									}

									if (sendResult.value === "SENT") {
										organizationSummary.interactionsSent += 1;
										continue;
									}

									if (sendResult.value === "QUEUED") {
										organizationSummary.interactionsQueued += 1;
										continue;
									}

									organizationSummary.interactionsFailed += 1;
								}
							}
						}

						if (organizationSummary.stoppedByTimeBudget) {
							break;
						}
					}

					console.log(`[ORG: ${organization.id}] [INFO] [PROCESS_INTERACTIONS] Página processada`, {
						pageNumber: organizationSummary.pagesProcessed,
						interactionsRead: organizationSummary.interactionsRead,
						interactionsClaimed: organizationSummary.interactionsClaimed,
						interactionsBlocked: organizationSummary.interactionsBlocked,
						interactionsSent: organizationSummary.interactionsSent,
						interactionsQueued: organizationSummary.interactionsQueued,
						interactionsFailed: organizationSummary.interactionsFailed,
						interactionsSkippedAlreadyReserved: organizationSummary.interactionsSkippedAlreadyReserved,
					});

					if (organizationSummary.stoppedByTimeBudget) {
						break;
					}
				}

				overallSummary.processedOrganizationsCount += 1;
				mergeOrganizationSummary(overallSummary, organizationSummary);

				console.log(`[ORG: ${organization.id}] [INFO] [PROCESS_INTERACTIONS] Organização processada`, {
					durationMs: Date.now() - organizationStartedAt,
					...organizationSummary,
				});

				if (organizationSummary.stoppedByTimeBudget) {
					break;
				}
			} catch (error) {
				overallSummary.failedOrganizationsCount += 1;
				console.error(`[ORG: ${organization.id}] [ERROR] [PROCESS_INTERACTIONS] Erro ao processar organização:`, error);
			}
		}

		console.log("[INFO] [PROCESS_INTERACTIONS] Processamento finalizado", overallSummary);

		return res.status(200).json({
			message: overallSummary.stoppedByTimeBudget
				? "Interações processadas parcialmente devido ao limite de execução."
				: "Interações processadas com sucesso.",
			data: overallSummary,
		});
	} catch (error) {
		console.error("[ERROR] [PROCESS_INTERACTIONS] Erro fatal:", error);
		return res.status(500).json({
			error: "Falha ao processar interações.",
			message: error instanceof Error ? error.message : "Erro desconhecido.",
		});
	}
};

export default processInteractionsHandler;
