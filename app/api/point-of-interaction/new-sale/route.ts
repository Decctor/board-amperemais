import { DASTJS_TIME_DURATION_UNITS_MAP, getPostponedDateFromReferenceDate } from "@/lib/dates";
import { formatPhoneAsBase } from "@/lib/formatting";
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
				with: {
					usuario: true,
				},
			});

			if (!operator || !operator.usuario) {
				throw new createHttpError.Unauthorized("Operador não encontrado ou não pertence a esta organização.");
			}

			// 2. Get or create client
			let clientId = input.client.id;
			let clientFirstSaleId: string | null = null;
			let clientFirstSaleDate: Date | null = null;

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
			}

			if (!program) {
				throw new createHttpError.NotFound("Programa de cashback não encontrado.");
			}

			// 4. Query campaigns for cashback accumulation trigger
			const campaignsForCashbackAccumulation = await tx.query.campaigns.findMany({
				where: (fields, { and, eq }) => and(eq(fields.organizacaoId, input.orgId), eq(fields.ativo, true), eq(fields.gatilhoTipo, "CASHBACK-ACUMULADO")),
				with: {
					segmentacoes: true,
				},
			});

			// 5. If using cashback: validate balance and create redemption
			let currentBalance = 0;
			if (input.sale.cashback.aplicar && input.sale.cashback.valor > 0) {
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
			if (!clientFirstSaleId && !clientFirstSaleDate) {
				clientFirstSaleId = saleId;
				clientFirstSaleDate = saleDate;
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
					operadorId: operator.usuario.id,
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
					operadorId: operator.usuario.id,
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

						await tx.insert(interactions).values({
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
						});
					}
				}
			}

			// 10. Update client last purchase
			await tx
				.update(clients)
				.set({
					primeiraCompraData: clientFirstSaleDate,
					primeiraCompraId: clientFirstSaleId,
					ultimaCompraData: saleDate,
					ultimaCompraId: saleId,
				})
				.where(eq(clients.id, clientId));

			return {
				saleId,
				cashbackAcumulado: accumulatedBalance,
				newBalance: newOverallAvailableBalance,
			};
		});

		return NextResponse.json(
			{
				data: result,
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
