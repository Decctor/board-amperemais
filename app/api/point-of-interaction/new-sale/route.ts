import { generateCashbackForCampaign } from "@/lib/cashback/generate-campaign-cashback";
import { DASTJS_TIME_DURATION_UNITS_MAP, getPostponedDateFromReferenceDate } from "@/lib/dates";
import { formatPhoneAsBase } from "@/lib/formatting";
import { type ImmediateProcessingData, processSingleInteractionImmediately } from "@/lib/interactions";
import type { TTimeDurationUnitsEnum } from "@/schemas/enums";
import { db } from "@/services/drizzle";
import type { DBTransaction } from "@/services/drizzle";
import {
	cashbackProgramBalances,
	cashbackProgramTransactions,
	cashbackPrograms,
	clients,
	interactions,
	organizations,
	sales,
	users,
} from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { NextResponse } from "next/server";
import z from "zod";

const CreatePointOfInteractionNewSaleInputSchema = z.object({
	orgId: z.string({
		required_error: "ID da organização não informado.",
		invalid_type_error: "Tipo não válido para ID da organização.",
	}),
	client: z.object({
		id: z
			.string({
				invalid_type_error: "Tipo não válido para ID do cliente.",
			})
			.optional()
			.nullable(),
		nome: z.string({
			required_error: "Nome do cliente não informado.",
			invalid_type_error: "Tipo não válido para nome do cliente.",
		}),
		cpfCnpj: z
			.string({
				invalid_type_error: "Tipo não válido para CPF/CNPJ.",
			})
			.optional()
			.nullable(),
		telefone: z.string({
			required_error: "Telefone não informado.",
			invalid_type_error: "Tipo não válido para telefone.",
		}),
	}),
	sale: z.object({
		valor: z
			.number({
				required_error: "Valor não informado.",
				invalid_type_error: "Tipo não válido para valor.",
			})
			.positive("Valor deve ser positivo."),
		cashback: z.object({
			aplicar: z
				.boolean({
					required_error: "Se deve aplicar cashback não informado.",
					invalid_type_error: "Tipo não válido para se deve aplicar cashback.",
				})
				.default(false),
			valor: z
				.number({
					required_error: "Valor do cashback não informado.",
					invalid_type_error: "Tipo não válido para valor do cashback.",
				})
				.nonnegative()
				.default(0),
		}),
	}),
	operatorIdentifier: z.string({
		required_error: "Identificador do operador não informado.",
		invalid_type_error: "Tipo não válido para identificador do operador.",
	}),
});
export type TCreatePointOfInteractionNewSaleInput = z.infer<typeof CreatePointOfInteractionNewSaleInputSchema>;

export type TCreatePointOfInteractionNewSaleOutput = {
	data: {
		saleId: string;
		cashbackAcumulado: number;
		newBalance: number;
	};
	message: string;
};

/**
 * Helper function to check if a campaign can be scheduled for a client based on frequency rules
 */
async function canScheduleCampaignForClient(
	tx: DBTransaction,
	clienteId: string,
	campanhaId: string,
	permitirRecorrencia: boolean,
	frequenciaIntervaloValor: number | null,
	frequenciaIntervaloMedida: string | null,
): Promise<boolean> {
	if (!permitirRecorrencia) {
		const previousInteraction = await tx.query.interactions.findFirst({
			where: (fields, { and, eq }) => and(eq(fields.clienteId, clienteId), eq(fields.campanhaId, campanhaId)),
		});
		if (previousInteraction) {
			console.log(`[CAMPAIGN_FREQUENCY] Campaign ${campanhaId} does not allow recurrence. Skipping for client ${clienteId}.`);
			return false;
		}
	}

	if (permitirRecorrencia && frequenciaIntervaloValor && frequenciaIntervaloValor > 0 && frequenciaIntervaloMedida) {
		const dayjsUnit = DASTJS_TIME_DURATION_UNITS_MAP[frequenciaIntervaloMedida as TTimeDurationUnitsEnum] || "day";
		const cutoffDate = dayjs().subtract(frequenciaIntervaloValor, dayjsUnit).toDate();

		const recentInteraction = await tx.query.interactions.findFirst({
			where: (fields, { and, eq, gt }) => and(eq(fields.clienteId, clienteId), eq(fields.campanhaId, campanhaId), gt(fields.dataInsercao, cutoffDate)),
		});

		if (recentInteraction) {
			console.log(
				`[CAMPAIGN_FREQUENCY] Campaign ${campanhaId} frequency limit reached for client ${clienteId}. Last interaction was at ${recentInteraction.dataInsercao}.`,
			);
			return false;
		}
	}

	return true;
}

export async function POST(req: Request) {
	try {
		const body = await req.json();
		const input = CreatePointOfInteractionNewSaleInputSchema.parse(body);

		const result = await db.transaction(async (tx) => {
			const program = await tx.query.cashbackPrograms.findFirst({
				where: eq(cashbackPrograms.organizacaoId, input.orgId),
			});
			if (!program) {
				throw new createHttpError.NotFound("Programa de cashback não encontrado.");
			}
			if (!program.acumuloPermitirViaPontoIntegracao) {
				throw new createHttpError.BadRequest("Programa de cashback não permite acumulação via Ponto de Interação.");
			}
			// 1. Validate operator
			const operator = await tx.query.sellers.findFirst({
				where: (fields, { and, eq }) => and(eq(fields.senhaOperador, input.operatorIdentifier), eq(fields.organizacaoId, input.orgId)),
			});
			if (!operator) throw new createHttpError.Unauthorized("Operador não encontrado.");
			const membershipForSeller = await tx.query.organizationMembers.findFirst({
				where: (fields, { and, eq }) => and(eq(fields.usuarioVendedorId, operator.id), eq(fields.organizacaoId, input.orgId)),
				with: {
					usuario: true,
				},
			});
			if (!membershipForSeller || !membershipForSeller.usuario) {
				throw new createHttpError.Unauthorized("Operador não encontrado ou não pertence a esta organização.");
			}

			// 2. Get or create client
			let clientId = input.client.id;
			let clientFirstSaleId: string | null = null;
			let clientFirstSaleDate: Date | null = null;
			let isNewClient = false;
			let clientRfmTitle: string | null = "CLIENTES RECENTES";
			let clientCurrentPurchaseCount = 0; // Client's current all-time purchase count (from metadata)
			let clientCurrentPurchaseValue = 0; // Client's current all-time purchase value (from metadata)

			if (!clientId) {
				// Create new client
				const phoneBase = formatPhoneAsBase(input.client.telefone);

				const existingClientForPhone = await tx.query.clients.findFirst({
					where: (fields, { and, eq }) => and(eq(fields.telefoneBase, phoneBase), eq(fields.organizacaoId, input.orgId)),
				});

				if (existingClientForPhone) throw new createHttpError.BadRequest("Cliente já existe para este telefone.");

				const insertedClientResponse = await tx
					.insert(clients)
					.values({
						organizacaoId: input.orgId,
						nome: input.client.nome,
						telefone: input.client.telefone,
						telefoneBase: phoneBase,
						canalAquisicao: "PONTO DE INTERAÇÃO",
					})
					.returning({ id: clients.id });

				const insertedClientId = insertedClientResponse[0]?.id;
				if (!insertedClientId) {
					throw new createHttpError.InternalServerError("Erro ao criar cliente.");
				}

				clientId = insertedClientId;
				isNewClient = true;
				clientRfmTitle = "CLIENTES RECENTES";

				// Initialize cashback balance for new client

				if (program) {
					await tx.insert(cashbackProgramBalances).values({
						clienteId: insertedClientId,
						programaId: program.id,
						organizacaoId: input.orgId,
						saldoValorDisponivel: 0,
						saldoValorAcumuladoTotal: 0,
						saldoValorResgatadoTotal: 0,
					});
				}
			} else {
				const client = await tx.query.clients.findFirst({
					where: (fields, { and, eq }) => and(eq(fields.id, clientId as string), eq(fields.organizacaoId, input.orgId)),
				});
				if (!client) throw new createHttpError.NotFound("Cliente não encontrado.");
				clientFirstSaleId = client.primeiraCompraId;
				clientFirstSaleDate = client.primeiraCompraData;
				clientRfmTitle = client.analiseRFMTitulo ?? "CLIENTES RECENTES";
				// Store current metadata for trigger evaluation
				clientCurrentPurchaseCount = client.metadataTotalCompras ?? 0;
				clientCurrentPurchaseValue = client.metadataValorTotalCompras ?? 0;
			}

			if (!program) {
				throw new createHttpError.NotFound("Programa de cashback não encontrado.");
			}

			// 4. Query campaigns for triggers (NOVA-COMPRA, PRIMEIRA-COMPRA, CASHBACK-ACUMULADO, QUANTIDADE-TOTAL-COMPRAS, VALOR-TOTAL-COMPRAS)
			const campaigns = await tx.query.campaigns.findMany({
				where: (fields, { and, or, eq }) =>
					and(
						eq(fields.organizacaoId, input.orgId),
						eq(fields.ativo, true),
						or(
							eq(fields.gatilhoTipo, "NOVA-COMPRA"),
							eq(fields.gatilhoTipo, "PRIMEIRA-COMPRA"),
							eq(fields.gatilhoTipo, "CASHBACK-ACUMULADO"),
							eq(fields.gatilhoTipo, "QUANTIDADE-TOTAL-COMPRAS"),
							eq(fields.gatilhoTipo, "VALOR-TOTAL-COMPRAS"),
						),
					),
				with: {
					segmentacoes: true,
					whatsappTemplate: true,
				},
			});
			const campaignsForNewPurchase = campaigns.filter((campaign) => campaign.gatilhoTipo === "NOVA-COMPRA");
			const campaignsForFirstPurchase = campaigns.filter((campaign) => campaign.gatilhoTipo === "PRIMEIRA-COMPRA");
			const campaignsForCashbackAccumulation = campaigns.filter((campaign) => campaign.gatilhoTipo === "CASHBACK-ACUMULADO");
			const campaignsForTotalPurchaseCount = campaigns.filter((campaign) => campaign.gatilhoTipo === "QUANTIDADE-TOTAL-COMPRAS");
			const campaignsForTotalPurchaseValue = campaigns.filter((campaign) => campaign.gatilhoTipo === "VALOR-TOTAL-COMPRAS");

			console.log(`[POI] [ORG: ${input.orgId}] [CAMPAIGNS] Total campaigns found: ${campaigns.length}`);
			console.log(
				`[POI] [ORG: ${input.orgId}] [CAMPAIGNS] NOVA-COMPRA: ${campaignsForNewPurchase.length}, PRIMEIRA-COMPRA: ${campaignsForFirstPurchase.length}, CASHBACK-ACUMULADO: ${campaignsForCashbackAccumulation.length}, QUANTIDADE-TOTAL-COMPRAS: ${campaignsForTotalPurchaseCount.length}, VALOR-TOTAL-COMPRAS: ${campaignsForTotalPurchaseValue.length}`,
			);
			console.log(`[POI] [ORG: ${input.orgId}] [CLIENT] isNewClient: ${isNewClient}, clientRfmTitle: ${clientRfmTitle}, clientId: ${clientId}`);

			// Query whatsappConnection for immediate processing
			const whatsappConnection = await tx.query.whatsappConnections.findFirst({
				where: (fields, { eq }) => eq(fields.organizacaoId, input.orgId),
			});

			console.log(
				`[POI] [ORG: ${input.orgId}] [WHATSAPP] Connection found: ${!!whatsappConnection}, token: ${whatsappConnection?.token ? "present" : "missing"}`,
			);

			// 5. If using cashback: validate balance, redemption limit, and create redemption
			let currentBalance = 0;
			if (input.sale.cashback.aplicar && input.sale.cashback.valor > 0) {
				// 5.1 Validate redemption limit
				if (program.resgateLimiteTipo && program.resgateLimiteValor !== null) {
					let maxAllowedRedemption: number;

					if (program.resgateLimiteTipo === "FIXO") {
						maxAllowedRedemption = program.resgateLimiteValor;
					} else if (program.resgateLimiteTipo === "PERCENTUAL") {
						maxAllowedRedemption = (input.sale.valor * program.resgateLimiteValor) / 100;
					} else {
						maxAllowedRedemption = Number.MAX_SAFE_INTEGER;
					}

					if (input.sale.cashback.valor > maxAllowedRedemption) {
						throw new createHttpError.BadRequest(`Valor de resgate excede o limite permitido. Máximo: R$ ${maxAllowedRedemption.toFixed(2)}`);
					}
				}

				const balance = await tx.query.cashbackProgramBalances.findFirst({
					where: and(eq(cashbackProgramBalances.clienteId, clientId), eq(cashbackProgramBalances.organizacaoId, input.orgId)),
				});

				if (!balance) {
					throw new createHttpError.NotFound("Saldo de cashback não encontrado para este cliente.");
				}

				if (balance.saldoValorDisponivel < input.sale.cashback.valor) {
					throw new createHttpError.BadRequest("Saldo insuficiente.");
				}

				currentBalance = balance.saldoValorDisponivel;

				const previousBalance = balance.saldoValorDisponivel;
				const newBalanceAfterRedemption = previousBalance - input.sale.cashback.valor;

				// Update balance (debit)
				await tx
					.update(cashbackProgramBalances)
					.set({
						saldoValorDisponivel: newBalanceAfterRedemption,
						saldoValorResgatadoTotal: balance.saldoValorResgatadoTotal + input.sale.cashback.valor,
						dataAtualizacao: new Date(),
					})
					.where(eq(cashbackProgramBalances.id, balance.id));

				currentBalance = newBalanceAfterRedemption;
			}

			// 6. Create sale record
			const valorFinalVenda = input.sale.valor - input.sale.cashback.valor;
			const saleDate = new Date();
			const insertedSaleResponse = await tx
				.insert(sales)
				.values({
					organizacaoId: input.orgId,
					clienteId: clientId,
					idExterno: `POI-${Date.now()}-${Math.random().toString(36).substring(7)}`,
					valorTotal: valorFinalVenda,
					custoTotal: 0,
					vendedorNome: operator.nome,
					vendedorId: operator.id,
					parceiro: "N/A",
					parceiroId: null,
					chave: "N/A",
					documento: "N/A",
					modelo: "DV",
					movimento: "RECEITAS",
					natureza: "SN01",
					serie: "0",
					situacao: "00",
					tipo: "Venda de produtos",
					dataVenda: saleDate,
				})
				.returning({ id: sales.id });

			const saleId = insertedSaleResponse[0]?.id;
			if (!saleId) {
				throw new createHttpError.InternalServerError("Erro ao criar venda.");
			}
			const isFirstPurchase = !clientFirstSaleId && !clientFirstSaleDate;
			if (isFirstPurchase) {
				clientFirstSaleId = saleId;
				clientFirstSaleDate = saleDate;
			}

			// Collect data for immediate processing
			const immediateProcessingDataList: ImmediateProcessingData[] = [];

			// 6.1. Process PRIMEIRA-COMPRA campaigns for new clients
			console.log(
				`[POI] [ORG: ${input.orgId}] [PRIMEIRA-COMPRA] Checking conditions: isNewClient=${isNewClient}, campaignsCount=${campaignsForFirstPurchase.length}`,
			);

			if (isNewClient && campaignsForFirstPurchase.length > 0) {
				const applicableCampaigns = campaignsForFirstPurchase.filter((campaign) =>
					campaign.segmentacoes.some((s) => s.segmentacao === "CLIENTES RECENTES"),
				);

				console.log(
					`[POI] [ORG: ${input.orgId}] [PRIMEIRA-COMPRA] ${applicableCampaigns.length} applicable campaigns after filtering for "CLIENTES RECENTES"`,
				);

				if (applicableCampaigns.length > 0) {
					console.log(
						`[ORG: ${input.orgId}] ${applicableCampaigns.length} campanhas de primeira compra aplicáveis encontradas para o cliente ${clientId}.`,
					);

					for (const campaign of applicableCampaigns) {
						console.log(`[POI] [ORG: ${input.orgId}] [PRIMEIRA-COMPRA] Processing campaign "${campaign.titulo}"`);

						// Validate campaign frequency before scheduling
						const canSchedule = await canScheduleCampaignForClient(
							tx,
							clientId,
							campaign.id,
							campaign.permitirRecorrencia,
							campaign.frequenciaIntervaloValor,
							campaign.frequenciaIntervaloMedida,
						);

						if (!canSchedule) {
							console.log(`[ORG: ${input.orgId}] [CAMPAIGN_FREQUENCY] Skipping campaign ${campaign.titulo} for client ${clientId} due to frequency limits.`);
							continue;
						}

						const interactionScheduleDate = getPostponedDateFromReferenceDate({
							date: dayjs().toDate(),
							unit: campaign.execucaoAgendadaMedida,
							value: campaign.execucaoAgendadaValor,
						});

						const [insertedInteraction] = await tx
							.insert(interactions)
							.values({
								clienteId: clientId,
								campanhaId: campaign.id,
								organizacaoId: input.orgId,
								titulo: `Envio de mensagem automática via campanha ${campaign.titulo}`,
								tipo: "ENVIO-MENSAGEM",
								descricao: "Cliente realizou sua primeira compra.",
								agendamentoDataReferencia: dayjs(interactionScheduleDate).format("YYYY-MM-DD"),
								agendamentoBlocoReferencia: campaign.execucaoAgendadaBloco,
							})
							.returning({ id: interactions.id });

						console.log(`[POI] [ORG: ${input.orgId}] [PRIMEIRA-COMPRA] Interaction created: ${insertedInteraction.id}`);

						// Check for immediate processing (execucaoAgendadaValor === 0 or null/undefined means immediate)
						const shouldProcessImmediately =
							campaign.execucaoAgendadaValor === 0 || campaign.execucaoAgendadaValor === null || campaign.execucaoAgendadaValor === undefined;

						console.log(`[POI] [ORG: ${input.orgId}] [PRIMEIRA-COMPRA] Immediate processing check:`);
						console.log(`  - shouldProcessImmediately: ${shouldProcessImmediately} (execucaoAgendadaValor: ${campaign.execucaoAgendadaValor})`);
						console.log(`  - whatsappTemplate: ${!!campaign.whatsappTemplate}`);
						console.log(`  - whatsappConnection: ${!!whatsappConnection}`);

						console.log(`[POI] [ORG: ${input.orgId}] [PRIMEIRA-COMPRA] SHOULD PROCESS IMMEDIATELY PARAMS:`, {
							SHOULD_PROCESS_IMMEDIATELY: shouldProcessImmediately,
							HAS_WHATSAPP_TEMPLATE: !!campaign.whatsappTemplate,
							HAS_WHATSAPP_CONNECTION: !!whatsappConnection,
						});
						if (shouldProcessImmediately && campaign.whatsappTemplate && whatsappConnection) {
							console.log(`[POI] [ORG: ${input.orgId}] [PRIMEIRA-COMPRA] Adding to immediate processing list`);
							immediateProcessingDataList.push({
								interactionId: insertedInteraction.id,
								organizationId: input.orgId,
								client: {
									id: clientId,
									nome: input.client.nome,
									telefone: input.client.telefone,
									email: null,
									analiseRFMTitulo: clientRfmTitle,
								},
								campaign: {
									autorId: campaign.autorId,
									whatsappTelefoneId: campaign.whatsappTelefoneId,
									whatsappTemplate: campaign.whatsappTemplate,
								},
								whatsappToken: whatsappConnection.token ?? undefined,
								whatsappSessionId: whatsappConnection.gatewaySessaoId ?? undefined,
							});
						} else {
							console.log(`[POI] [ORG: ${input.orgId}] [PRIMEIRA-COMPRA] NOT adding to immediate processing - conditions not met`);
						}

						// Generate campaign cashback for PRIMEIRA-COMPRA trigger
						if (campaign.cashbackGeracaoAtivo && campaign.cashbackGeracaoTipo && campaign.cashbackGeracaoValor) {
							console.log(`[POI] [ORG: ${input.orgId}] [PRIMEIRA-COMPRA] Generating campaign cashback`);
							await generateCashbackForCampaign({
								tx,
								organizationId: input.orgId,
								clientId: clientId,
								campaignId: campaign.id,
								cashbackType: campaign.cashbackGeracaoTipo,
								cashbackValue: campaign.cashbackGeracaoValor,
								saleId: saleId,
								saleValue: input.sale.valor,
								expirationMeasure: campaign.cashbackGeracaoExpiracaoMedida,
								expirationValue: campaign.cashbackGeracaoExpiracaoValor,
							});
						}
					}
				}
			}

			// 6.2. Process NOVA-COMPRA campaigns for existing clients
			console.log(
				`[POI] [ORG: ${input.orgId}] [NOVA-COMPRA] Checking conditions: isNewClient=${isNewClient}, campaignsCount=${campaignsForNewPurchase.length}`,
			);

			if (!isNewClient && campaignsForNewPurchase.length > 0) {
				console.log(`[POI] [ORG: ${input.orgId}] [NOVA-COMPRA] Processing ${campaignsForNewPurchase.length} campaigns for existing client`);

				// Log each campaign's evaluation
				for (const campaign of campaignsForNewPurchase) {
					const meetsNewPurchaseValueTrigger =
						campaign.gatilhoNovaCompraValorMinimo === null ||
						campaign.gatilhoNovaCompraValorMinimo === undefined ||
						input.sale.valor >= campaign.gatilhoNovaCompraValorMinimo;

					const matchingSegmentation = campaign.segmentacoes.find((s) => s.segmentacao === clientRfmTitle);
					const meetsSegmentationTrigger = !!matchingSegmentation;

					console.log(`[POI] [ORG: ${input.orgId}] [NOVA-COMPRA] Campaign "${campaign.titulo}" (${campaign.id}):`);
					console.log(
						`  - gatilhoNovaCompraValorMinimo: ${campaign.gatilhoNovaCompraValorMinimo}, saleValue: ${input.sale.valor}, meetsValueTrigger: ${meetsNewPurchaseValueTrigger}`,
					);
					console.log(
						`  - clientRfmTitle: "${clientRfmTitle}", segmentacoes: [${campaign.segmentacoes.map((s) => s.segmentacao).join(", ")}], meetsSegmentation: ${meetsSegmentationTrigger}`,
					);
					console.log(
						`  - execucaoAgendadaValor: ${campaign.execucaoAgendadaValor} (type: ${typeof campaign.execucaoAgendadaValor}), execucaoAgendadaMedida: ${campaign.execucaoAgendadaMedida}`,
					);
					console.log(`  - whatsappTemplate: ${campaign.whatsappTemplate ? "present" : "missing"}, whatsappTemplateId: ${campaign.whatsappTemplateId}`);
				}

				const applicableCampaigns = campaignsForNewPurchase.filter((campaign) => {
					// Validate campaign trigger for new purchase
					const meetsNewPurchaseValueTrigger =
						campaign.gatilhoNovaCompraValorMinimo === null ||
						campaign.gatilhoNovaCompraValorMinimo === undefined ||
						input.sale.valor >= campaign.gatilhoNovaCompraValorMinimo;

					const meetsSegmentationTrigger = campaign.segmentacoes.some((s) => s.segmentacao === clientRfmTitle);

					return meetsNewPurchaseValueTrigger && meetsSegmentationTrigger;
				});

				console.log(`[POI] [ORG: ${input.orgId}] [NOVA-COMPRA] ${applicableCampaigns.length} applicable campaigns after filtering`);

				if (applicableCampaigns.length > 0) {
					console.log(`[ORG: ${input.orgId}] ${applicableCampaigns.length} campanhas de nova compra aplicáveis encontradas para o cliente ${clientId}.`);

					// Query client data for immediate processing
					const clientData = await tx.query.clients.findFirst({
						where: (fields, { eq }) => eq(fields.id, clientId),
						columns: {
							id: true,
							nome: true,
							telefone: true,
							email: true,
							analiseRFMTitulo: true,
						},
					});

					console.log(
						`[POI] [ORG: ${input.orgId}] [NOVA-COMPRA] Client data for immediate processing: ${clientData ? `found (telefone: ${clientData.telefone})` : "NOT FOUND"}`,
					);

					for (const campaign of applicableCampaigns) {
						console.log(`[POI] [ORG: ${input.orgId}] [NOVA-COMPRA] Processing campaign "${campaign.titulo}"`);

						// Validate campaign frequency before scheduling
						const canSchedule = await canScheduleCampaignForClient(
							tx,
							clientId,
							campaign.id,
							campaign.permitirRecorrencia,
							campaign.frequenciaIntervaloValor,
							campaign.frequenciaIntervaloMedida,
						);

						if (!canSchedule) {
							console.log(`[ORG: ${input.orgId}] [CAMPAIGN_FREQUENCY] Skipping campaign ${campaign.titulo} for client ${clientId} due to frequency limits.`);
							continue;
						}

						const interactionScheduleDate = getPostponedDateFromReferenceDate({
							date: dayjs().toDate(),
							unit: campaign.execucaoAgendadaMedida,
							value: campaign.execucaoAgendadaValor,
						});

						console.log(
							`[POI] [ORG: ${input.orgId}] [NOVA-COMPRA] Creating interaction with schedule date: ${dayjs(interactionScheduleDate).format("YYYY-MM-DD")}`,
						);

						const [insertedInteraction] = await tx
							.insert(interactions)
							.values({
								clienteId: clientId,
								campanhaId: campaign.id,
								organizacaoId: input.orgId,
								titulo: `Envio de mensagem automática via campanha ${campaign.titulo}`,
								tipo: "ENVIO-MENSAGEM",
								descricao: `Cliente se enquadrou no parâmetro de nova compra ${clientRfmTitle}.`,
								agendamentoDataReferencia: dayjs(interactionScheduleDate).format("YYYY-MM-DD"),
								agendamentoBlocoReferencia: campaign.execucaoAgendadaBloco,
							})
							.returning({ id: interactions.id });

						console.log(`[POI] [ORG: ${input.orgId}] [NOVA-COMPRA] Interaction created: ${insertedInteraction.id}`);

						// Check for immediate processing (execucaoAgendadaValor === 0 or null/undefined means immediate)
						const shouldProcessImmediately =
							campaign.execucaoAgendadaValor === 0 || campaign.execucaoAgendadaValor === null || campaign.execucaoAgendadaValor === undefined;

						console.log(`[POI] [ORG: ${input.orgId}] [NOVA-COMPRA] Immediate processing check:`);
						console.log(`  - shouldProcessImmediately: ${shouldProcessImmediately} (execucaoAgendadaValor: ${campaign.execucaoAgendadaValor})`);
						console.log(`  - whatsappTemplate: ${!!campaign.whatsappTemplate}`);
						console.log(`  - whatsappConnection: ${!!whatsappConnection}`);
						console.log(`  - clientData: ${!!clientData}`);
						console.log(`[POI] [ORG: ${input.orgId}] [NOVA-COMPRA] SHOULD PROCESS IMMEDIATELY PARAMS:`, {
							SHOULD_PROCESS_IMMEDIATELY: shouldProcessImmediately,
							HAS_WHATSAPP_TEMPLATE: !!campaign.whatsappTemplate,
							HAS_WHATSAPP_CONNECTION: !!whatsappConnection,
							HAS_CLIENT_DATA: !!clientData,
						});
						if (shouldProcessImmediately && campaign.whatsappTemplate && whatsappConnection && clientData) {
							console.log(`[POI] [ORG: ${input.orgId}] [NOVA-COMPRA] Adding to immediate processing list`);
							immediateProcessingDataList.push({
								interactionId: insertedInteraction.id,
								organizationId: input.orgId,
								client: {
									id: clientData.id,
									nome: clientData.nome,
									telefone: clientData.telefone,
									email: clientData.email,
									analiseRFMTitulo: clientData.analiseRFMTitulo,
								},
								campaign: {
									autorId: campaign.autorId,
									whatsappTelefoneId: campaign.whatsappTelefoneId,
									whatsappTemplate: campaign.whatsappTemplate,
								},
								whatsappToken: whatsappConnection.token ?? undefined,
								whatsappSessionId: whatsappConnection.gatewaySessaoId ?? undefined,
							});
						} else {
							console.log(`[POI] [ORG: ${input.orgId}] [NOVA-COMPRA] NOT adding to immediate processing - conditions not met`);
						}

						// Generate campaign cashback for NOVA-COMPRA trigger
						if (campaign.cashbackGeracaoAtivo && campaign.cashbackGeracaoTipo && campaign.cashbackGeracaoValor) {
							console.log(`[POI] [ORG: ${input.orgId}] [NOVA-COMPRA] Generating campaign cashback`);
							await generateCashbackForCampaign({
								tx,
								organizationId: input.orgId,
								clientId: clientId,
								campaignId: campaign.id,
								cashbackType: campaign.cashbackGeracaoTipo,
								cashbackValue: campaign.cashbackGeracaoValor,
								saleId: saleId,
								saleValue: input.sale.valor,
								expirationMeasure: campaign.cashbackGeracaoExpiracaoMedida,
								expirationValue: campaign.cashbackGeracaoExpiracaoValor,
							});
						}
					}
				} else {
					console.log(`[POI] [ORG: ${input.orgId}] [NOVA-COMPRA] No applicable campaigns found after filtering`);
				}
			} else {
				console.log(`[POI] [ORG: ${input.orgId}] [NOVA-COMPRA] Skipping: isNewClient=${isNewClient}, campaignsCount=${campaignsForNewPurchase.length}`);
			}

			// 7. If cashback was used, create the redemption transaction
			if (input.sale.cashback.aplicar && input.sale.cashback.valor > 0) {
				await tx.insert(cashbackProgramTransactions).values({
					organizacaoId: input.orgId,
					clienteId: clientId,
					vendaId: saleId,
					vendaValor: input.sale.valor,
					programaId: program.id,
					tipo: "RESGATE",
					status: "ATIVO",
					valor: input.sale.cashback.valor,
					valorRestante: 0,
					saldoValorAnterior: currentBalance + input.sale.cashback.valor,
					saldoValorPosterior: currentBalance,
					expiracaoData: null,
					operadorId: membershipForSeller.usuario.id,
				});
			}

			// 8. Calculate and accumulate new cashback
			let accumulatedBalance = 0;
			const balance = await tx.query.cashbackProgramBalances.findFirst({
				where: and(eq(cashbackProgramBalances.clienteId, clientId), eq(cashbackProgramBalances.organizacaoId, input.orgId)),
			});

			if (!balance) {
				throw new createHttpError.NotFound("Saldo de cashback não encontrado.");
			}

			if (program.acumuloTipo === "FIXO") {
				if (input.sale.valor >= program.acumuloRegraValorMinimo) {
					accumulatedBalance = program.acumuloValor;
				}
			} else if (program.acumuloTipo === "PERCENTUAL") {
				if (input.sale.valor >= program.acumuloRegraValorMinimo) {
					accumulatedBalance = (input.sale.valor * program.acumuloValor) / 100;
				}
			}

			const previousOverallAvailableBalance = balance.saldoValorDisponivel;
			const previousOverallAccumulatedBalance = balance.saldoValorAcumuladoTotal;
			const newOverallAvailableBalance = previousOverallAvailableBalance + accumulatedBalance;
			const newOverallAccumulatedBalance = previousOverallAccumulatedBalance + accumulatedBalance;

			if (accumulatedBalance > 0) {
				// Update balance (credit)
				await tx
					.update(cashbackProgramBalances)
					.set({
						saldoValorDisponivel: newOverallAvailableBalance,
						saldoValorAcumuladoTotal: newOverallAccumulatedBalance,
						dataAtualizacao: new Date(),
					})
					.where(eq(cashbackProgramBalances.id, balance.id));

				// Create accumulation transaction
				await tx.insert(cashbackProgramTransactions).values({
					organizacaoId: input.orgId,
					clienteId: clientId,
					vendaId: saleId,
					vendaValor: input.sale.valor,
					programaId: program.id,
					tipo: "ACÚMULO",
					status: "ATIVO",
					valor: accumulatedBalance,
					valorRestante: accumulatedBalance,
					saldoValorAnterior: previousOverallAvailableBalance,
					saldoValorPosterior: newOverallAvailableBalance,
					expiracaoData: dayjs().add(program.expiracaoRegraValidadeValor, "day").toDate(),
					dataInsercao: saleDate,
					operadorId: membershipForSeller.usuario.id,
				});

				// 9. Check for applicable cashback accumulation campaigns

				if (campaignsForCashbackAccumulation.length > 0) {
					const applicableCampaigns = campaignsForCashbackAccumulation.filter((campaign) => {
						const meetsNewCashbackThreshold =
							campaign.gatilhoNovoCashbackAcumuladoValorMinimo === null ||
							campaign.gatilhoNovoCashbackAcumuladoValorMinimo === undefined ||
							accumulatedBalance >= campaign.gatilhoNovoCashbackAcumuladoValorMinimo;

						const meetsTotalCashbackThreshold =
							campaign.gatilhoTotalCashbackAcumuladoValorMinimo === null ||
							campaign.gatilhoTotalCashbackAcumuladoValorMinimo === undefined ||
							newOverallAvailableBalance >= campaign.gatilhoTotalCashbackAcumuladoValorMinimo;

						return meetsNewCashbackThreshold && meetsTotalCashbackThreshold;
					});

					if (applicableCampaigns.length > 0) {
						console.log(
							`[ORG: ${input.orgId}] ${applicableCampaigns.length} campanhas de cashback acumulado aplicáveis encontradas para o cliente ${clientId}.`,
						);
					}

					// Query client data for immediate processing
					const clientData = await tx.query.clients.findFirst({
						where: (fields, { eq }) => eq(fields.id, clientId),
						columns: {
							id: true,
							nome: true,
							telefone: true,
							email: true,
							analiseRFMTitulo: true,
						},
					});

					for (const campaign of applicableCampaigns) {
						const canSchedule = await canScheduleCampaignForClient(
							tx,
							clientId,
							campaign.id,
							campaign.permitirRecorrencia,
							campaign.frequenciaIntervaloValor,
							campaign.frequenciaIntervaloMedida,
						);

						if (!canSchedule) {
							console.log(`[ORG: ${input.orgId}] [CAMPAIGN_FREQUENCY] Skipping campaign ${campaign.titulo} for client ${clientId} due to frequency limits.`);
							continue;
						}

						const interactionScheduleDate = getPostponedDateFromReferenceDate({
							date: dayjs().toDate(),
							unit: campaign.execucaoAgendadaMedida,
							value: campaign.execucaoAgendadaValor,
						});

						const [insertedInteraction] = await tx
							.insert(interactions)
							.values({
								clienteId: clientId,
								campanhaId: campaign.id,
								organizacaoId: input.orgId,
								titulo: `Envio de mensagem automática via campanha ${campaign.titulo}`,
								tipo: "ENVIO-MENSAGEM",
								descricao: `Cliente acumulou R$ ${(accumulatedBalance / 100).toFixed(2)} em cashback. Total acumulado: R$ ${(newOverallAccumulatedBalance / 100).toFixed(2)}.`,
								agendamentoDataReferencia: dayjs(interactionScheduleDate).format("YYYY-MM-DD"),
								agendamentoBlocoReferencia: campaign.execucaoAgendadaBloco,
								metadados: {
									cashbackAcumuladoValor: accumulatedBalance,
									whatsappMensagemId: null,
									whatsappTemplateId: null,
								},
							})
							.returning({ id: interactions.id });

						// Check for immediate processing (execucaoAgendadaValor === 0 or null/undefined means immediate)
						const shouldProcessImmediately =
							campaign.execucaoAgendadaValor === 0 || campaign.execucaoAgendadaValor === null || campaign.execucaoAgendadaValor === undefined;

						console.log(`[POI] [ORG: ${input.orgId}] [CASHBACK-ACUMULADO] SHOULD PROCESS IMMEDIATELY PARAMS:`, {
							SHOULD_PROCESS_IMMEDIATELY: shouldProcessImmediately,
							HAS_WHATSAPP_TEMPLATE: !!campaign.whatsappTemplate,
							HAS_WHATSAPP_CONNECTION: !!whatsappConnection,
							HAS_CLIENT_DATA: !!clientData,
						});
						if (shouldProcessImmediately && campaign.whatsappTemplate && whatsappConnection && clientData) {
							console.log(`[POI] [ORG: ${input.orgId}] [CASHBACK-ACUMULADO] Adding to immediate processing list`);
							immediateProcessingDataList.push({
								interactionId: insertedInteraction.id,
								organizationId: input.orgId,
								client: {
									id: clientData.id,
									nome: clientData.nome,
									telefone: clientData.telefone,
									email: clientData.email,
									analiseRFMTitulo: clientData.analiseRFMTitulo,
								},
								campaign: {
									autorId: campaign.autorId,
									whatsappTelefoneId: campaign.whatsappTelefoneId,
									whatsappTemplate: campaign.whatsappTemplate,
								},
								whatsappToken: whatsappConnection.token ?? undefined,
								whatsappSessionId: whatsappConnection.gatewaySessaoId ?? undefined,
							});
						}
					}
				}
			}

			// 9.1 Process QUANTIDADE-TOTAL-COMPRAS and VALOR-TOTAL-COMPRAS campaigns
			const newTotalPurchaseCount = clientCurrentPurchaseCount + 1;
			const newTotalPurchaseValue = clientCurrentPurchaseValue + input.sale.valor;

			console.log(
				`[POI] [ORG: ${input.orgId}] [PURCHASE-TOTALS] Previous: count=${clientCurrentPurchaseCount}, value=${clientCurrentPurchaseValue}. New: count=${newTotalPurchaseCount}, value=${newTotalPurchaseValue}`,
			);

			// Process QUANTIDADE-TOTAL-COMPRAS campaigns
			if (campaignsForTotalPurchaseCount.length > 0) {
				const applicableCampaigns = campaignsForTotalPurchaseCount.filter((campaign) => {
					// Check if the client has reached or exceeded the threshold
					const meetsThreshold =
						campaign.gatilhoQuantidadeTotalCompras !== null &&
						campaign.gatilhoQuantidadeTotalCompras !== undefined &&
						newTotalPurchaseCount >= campaign.gatilhoQuantidadeTotalCompras;

					// Check segmentation match
					const meetsSegmentation = campaign.segmentacoes.length === 0 || campaign.segmentacoes.some((s) => s.segmentacao === clientRfmTitle);

					return meetsThreshold && meetsSegmentation;
				});

				if (applicableCampaigns.length > 0) {
					console.log(
						`[POI] [ORG: ${input.orgId}] [QUANTIDADE-TOTAL-COMPRAS] ${applicableCampaigns.length} applicable campaigns found for client ${clientId}.`,
					);

					const clientData = await tx.query.clients.findFirst({
						where: (fields, { eq }) => eq(fields.id, clientId),
						columns: { id: true, nome: true, telefone: true, email: true, analiseRFMTitulo: true },
					});

					for (const campaign of applicableCampaigns) {
						const canSchedule = await canScheduleCampaignForClient(
							tx,
							clientId,
							campaign.id,
							campaign.permitirRecorrencia,
							campaign.frequenciaIntervaloValor,
							campaign.frequenciaIntervaloMedida,
						);

						if (!canSchedule) {
							console.log(
								`[POI] [ORG: ${input.orgId}] [CAMPAIGN_FREQUENCY] Skipping campaign ${campaign.titulo} for client ${clientId} due to frequency limits.`,
							);
							continue;
						}

						const interactionScheduleDate = getPostponedDateFromReferenceDate({
							date: dayjs().toDate(),
							unit: campaign.execucaoAgendadaMedida,
							value: campaign.execucaoAgendadaValor,
						});

						const [insertedInteraction] = await tx
							.insert(interactions)
							.values({
								clienteId: clientId,
								campanhaId: campaign.id,
								organizacaoId: input.orgId,
								titulo: `Envio de mensagem automática via campanha ${campaign.titulo}`,
								tipo: "ENVIO-MENSAGEM",
								descricao: `Cliente atingiu ${newTotalPurchaseCount} compras totais (gatilho: ${campaign.gatilhoQuantidadeTotalCompras}).`,
								agendamentoDataReferencia: dayjs(interactionScheduleDate).format("YYYY-MM-DD"),
								agendamentoBlocoReferencia: campaign.execucaoAgendadaBloco,
							})
							.returning({ id: interactions.id });

						const shouldProcessImmediately =
							campaign.execucaoAgendadaValor === 0 || campaign.execucaoAgendadaValor === null || campaign.execucaoAgendadaValor === undefined;

						if (shouldProcessImmediately && campaign.whatsappTemplate && whatsappConnection && clientData) {
							immediateProcessingDataList.push({
								interactionId: insertedInteraction.id,
								organizationId: input.orgId,
								client: {
									id: clientData.id,
									nome: clientData.nome,
									telefone: clientData.telefone,
									email: clientData.email,
									analiseRFMTitulo: clientData.analiseRFMTitulo,
								},
								campaign: {
									autorId: campaign.autorId,
									whatsappTelefoneId: campaign.whatsappTelefoneId,
									whatsappTemplate: campaign.whatsappTemplate,
								},
								whatsappToken: whatsappConnection.token ?? undefined,
								whatsappSessionId: whatsappConnection.gatewaySessaoId ?? undefined,
							});
						}

						// Generate campaign cashback if configured
						if (campaign.cashbackGeracaoAtivo && campaign.cashbackGeracaoTipo && campaign.cashbackGeracaoValor) {
							await generateCashbackForCampaign({
								tx,
								organizationId: input.orgId,
								clientId: clientId,
								campaignId: campaign.id,
								cashbackType: campaign.cashbackGeracaoTipo,
								cashbackValue: campaign.cashbackGeracaoValor,
								saleId: saleId,
								saleValue: input.sale.valor,
								expirationMeasure: campaign.cashbackGeracaoExpiracaoMedida,
								expirationValue: campaign.cashbackGeracaoExpiracaoValor,
							});
						}
					}
				}
			}

			// Process VALOR-TOTAL-COMPRAS campaigns
			if (campaignsForTotalPurchaseValue.length > 0) {
				const applicableCampaigns = campaignsForTotalPurchaseValue.filter((campaign) => {
					// Check if the client has reached or exceeded the threshold
					const meetsThreshold =
						campaign.gatilhoValorTotalCompras !== null &&
						campaign.gatilhoValorTotalCompras !== undefined &&
						newTotalPurchaseValue >= campaign.gatilhoValorTotalCompras;

					// Check segmentation match
					const meetsSegmentation = campaign.segmentacoes.length === 0 || campaign.segmentacoes.some((s) => s.segmentacao === clientRfmTitle);

					return meetsThreshold && meetsSegmentation;
				});

				if (applicableCampaigns.length > 0) {
					console.log(
						`[POI] [ORG: ${input.orgId}] [VALOR-TOTAL-COMPRAS] ${applicableCampaigns.length} applicable campaigns found for client ${clientId}.`,
					);

					const clientData = await tx.query.clients.findFirst({
						where: (fields, { eq }) => eq(fields.id, clientId),
						columns: { id: true, nome: true, telefone: true, email: true, analiseRFMTitulo: true },
					});

					for (const campaign of applicableCampaigns) {
						const canSchedule = await canScheduleCampaignForClient(
							tx,
							clientId,
							campaign.id,
							campaign.permitirRecorrencia,
							campaign.frequenciaIntervaloValor,
							campaign.frequenciaIntervaloMedida,
						);

						if (!canSchedule) {
							console.log(
								`[POI] [ORG: ${input.orgId}] [CAMPAIGN_FREQUENCY] Skipping campaign ${campaign.titulo} for client ${clientId} due to frequency limits.`,
							);
							continue;
						}

						const interactionScheduleDate = getPostponedDateFromReferenceDate({
							date: dayjs().toDate(),
							unit: campaign.execucaoAgendadaMedida,
							value: campaign.execucaoAgendadaValor,
						});

						const [insertedInteraction] = await tx
							.insert(interactions)
							.values({
								clienteId: clientId,
								campanhaId: campaign.id,
								organizacaoId: input.orgId,
								titulo: `Envio de mensagem automática via campanha ${campaign.titulo}`,
								tipo: "ENVIO-MENSAGEM",
								descricao: `Cliente atingiu R$ ${newTotalPurchaseValue.toFixed(2)} em compras totais (gatilho: R$ ${campaign.gatilhoValorTotalCompras?.toFixed(2)}).`,
								agendamentoDataReferencia: dayjs(interactionScheduleDate).format("YYYY-MM-DD"),
								agendamentoBlocoReferencia: campaign.execucaoAgendadaBloco,
							})
							.returning({ id: interactions.id });

						const shouldProcessImmediately =
							campaign.execucaoAgendadaValor === 0 || campaign.execucaoAgendadaValor === null || campaign.execucaoAgendadaValor === undefined;

						if (shouldProcessImmediately && campaign.whatsappTemplate && whatsappConnection && clientData) {
							immediateProcessingDataList.push({
								interactionId: insertedInteraction.id,
								organizationId: input.orgId,
								client: {
									id: clientData.id,
									nome: clientData.nome,
									telefone: clientData.telefone,
									email: clientData.email,
									analiseRFMTitulo: clientData.analiseRFMTitulo,
								},
								campaign: {
									autorId: campaign.autorId,
									whatsappTelefoneId: campaign.whatsappTelefoneId,
									whatsappTemplate: campaign.whatsappTemplate,
								},
								whatsappToken: whatsappConnection.token ?? undefined,
								whatsappSessionId: whatsappConnection.gatewaySessaoId ?? undefined,
							});
						}

						// Generate campaign cashback if configured
						if (campaign.cashbackGeracaoAtivo && campaign.cashbackGeracaoTipo && campaign.cashbackGeracaoValor) {
							await generateCashbackForCampaign({
								tx,
								organizationId: input.orgId,
								clientId: clientId,
								campaignId: campaign.id,
								cashbackType: campaign.cashbackGeracaoTipo,
								cashbackValue: campaign.cashbackGeracaoValor,
								saleId: saleId,
								saleValue: input.sale.valor,
								expirationMeasure: campaign.cashbackGeracaoExpiracaoMedida,
								expirationValue: campaign.cashbackGeracaoExpiracaoValor,
							});
						}
					}
				}
			}

			console.log(`[POI] [ORG: ${input.orgId}] [SUMMARY] Total immediate processing items: ${immediateProcessingDataList.length}`);

			// 10. Update client last purchase and metadata
			await tx
				.update(clients)
				.set({
					primeiraCompraData: clientFirstSaleDate,
					primeiraCompraId: clientFirstSaleId,
					ultimaCompraData: saleDate,
					ultimaCompraId: saleId,
					// Update client metadata with new totals (optimistic update until next RFM cron run)
					metadataTotalCompras: newTotalPurchaseCount,
					metadataValorTotalCompras: newTotalPurchaseValue,
				})
				.where(eq(clients.id, clientId));

			return {
				saleId,
				cashbackAcumulado: accumulatedBalance,
				newBalance: newOverallAvailableBalance,
				immediateProcessingDataList,
			};
		});

		// Process interactions immediately after transaction (fire-and-forget)
		console.log(`[POI] [IMMEDIATE_PROCESS] Interactions to process immediately: ${result.immediateProcessingDataList?.length || 0}`);

		if (result.immediateProcessingDataList && result.immediateProcessingDataList.length > 0) {
			for (const processingData of result.immediateProcessingDataList) {
				console.log(`[POI] [IMMEDIATE_PROCESS] Processing interaction ${processingData.interactionId} for client ${processingData.client.id}`);
				console.log(
					`[POI] [IMMEDIATE_PROCESS] Client phone: ${processingData.client.telefone}, Template: ${processingData.campaign.whatsappTemplate?.nome || "unknown"}`,
				);

				processSingleInteractionImmediately(processingData)
					.then(() => {
						console.log(`[POI] [IMMEDIATE_PROCESS] Successfully processed interaction ${processingData.interactionId}`);
					})
					.catch((err) => {
						console.error(`[IMMEDIATE_PROCESS] Failed to process interaction ${processingData.interactionId}:`, err);
					});
			}
		} else {
			console.log("[POI] [IMMEDIATE_PROCESS] No interactions to process immediately");
		}

		return NextResponse.json(
			{
				data: {
					saleId: result.saleId,
					cashbackAcumulado: result.cashbackAcumulado,
					newBalance: result.newBalance,
				},
				message: "Venda criada com sucesso.",
			},
			{ status: 201 },
		);
	} catch (error) {
		console.error("[POI] Error creating sale:", error);

		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{
					message: "Dados inválidos.",
					errors: error.errors,
				},
				{ status: 400 },
			);
		}

		if (createHttpError.isHttpError(error)) {
			return NextResponse.json(
				{
					message: error.message,
				},
				{ status: error.statusCode },
			);
		}

		return NextResponse.json(
			{
				message: "Erro ao criar venda.",
			},
			{ status: 500 },
		);
	}
}
