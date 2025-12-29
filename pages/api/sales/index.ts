import { apiHandler } from "@/lib/api";
import { getCurrentSessionUncached } from "@/lib/authentication/pages-session";
import type { TSale } from "@/schemas/sales";
import { db } from "@/services/drizzle";
import { cashbackProgramBalances, cashbackProgramTransactions, cashbackPrograms, clients, organizations, sales } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { and, eq, gte, lte } from "drizzle-orm";
import createHttpError from "http-errors";
import type { NextApiHandler } from "next";
import z from "zod";

type GetResponse = {
	data: TSale | TSale[];
};

const getSalesRoute: NextApiHandler<GetResponse> = async (req, res) => {
	const sessionUser = await getCurrentSessionUncached(req.cookies);
	if (!sessionUser) throw new createHttpError.Unauthorized("Você não está autenticado.");

	const userOrgId = sessionUser.user.organizacaoId;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const { id, after, before } = req.query;

	const conditions = [eq(sales.organizacaoId, userOrgId)];
	if (id && typeof id === "string") conditions.push(eq(sales.id, id));
	if (after && typeof after === "string") conditions.push(gte(sales.dataVenda, new Date(after)));
	if (before && typeof before === "string") conditions.push(lte(sales.dataVenda, new Date(before)));
	const salesResult = await db.query.sales.findMany({
		where: and(...conditions),
	});

	return res.status(200).json({
		data: salesResult,
	});
};

// POST handler for creating sales from point-of-interaction
const CreateSaleInputSchema = z.object({
	orgId: z.string({
		required_error: "ID da organização não informado.",
		invalid_type_error: "Tipo não válido para ID da organização.",
	}),
	clientId: z.string({
		required_error: "ID do cliente não informado.",
		invalid_type_error: "Tipo não válido para ID do cliente.",
	}),
	saleValue: z
		.number({
			required_error: "Valor total não informado.",
			invalid_type_error: "Tipo não válido para valor total.",
		})
		.positive("Valor total deve ser positivo."),
	cashbackApplied: z.boolean().default(false),
	cashbackAppliedAmount: z.number().nonnegative().default(0),
	password: z
		.string({
			required_error: "Senha do operador não informada.",
			invalid_type_error: "Tipo não válido para senha do operador.",
		})
		.length(4, "Senha deve ter 4 dígitos."),
});
export type TCreateSaleInput = z.infer<typeof CreateSaleInputSchema>;
export type TCreateSaleOutput = {
	data: {
		saleId: string;
		cashbackAcumulado: number;
		newBalance: number;
	};
	message: string;
};

const createSaleRoute: NextApiHandler<TCreateSaleOutput> = async (req, res) => {
	const input = CreateSaleInputSchema.parse(req.body);

	const result = await db.transaction(async (tx) => {
		// 1. Validate operator password
		const org = await tx.query.organizations.findFirst({
			where: eq(organizations.id, input.orgId),
			columns: { cnpj: true },
		});

		if (!org) {
			throw new createHttpError.NotFound("Organização não encontrada.");
		}

		const cnpjFirst4Digits = org.cnpj.replace(/\D/g, "").substring(0, 4);
		if (input.password !== cnpjFirst4Digits) {
			throw new createHttpError.Unauthorized("Senha inválida.");
		}

		// 2. Get cashback program
		const program = await tx.query.cashbackPrograms.findFirst({
			where: eq(cashbackPrograms.organizacaoId, input.orgId),
		});

		if (!program) {
			throw new createHttpError.NotFound("Programa de cashback não encontrado.");
		}

		// 3. If using cashback: validate balance and create redemption
		let currentBalance = 0;
		if (input.cashbackApplied && input.cashbackAppliedAmount > 0) {
			const balance = await tx.query.cashbackProgramBalances.findFirst({
				where: and(eq(cashbackProgramBalances.clienteId, input.clientId), eq(cashbackProgramBalances.organizacaoId, input.orgId)),
			});

			if (!balance) {
				throw new createHttpError.NotFound("Saldo de cashback não encontrado para este cliente.");
			}

			if (balance.saldoValorDisponivel < input.cashbackAppliedAmount) {
				throw new createHttpError.BadRequest("Saldo insuficiente.");
			}

			currentBalance = balance.saldoValorDisponivel;

			// Create redemption transaction (will be associated with sale after sale creation)
			const previousBalance = balance.saldoValorDisponivel;
			const newBalanceAfterRedemption = previousBalance - input.cashbackAppliedAmount;

			// Update balance (debit)
			await tx
				.update(cashbackProgramBalances)
				.set({
					saldoValorDisponivel: newBalanceAfterRedemption,
					saldoValorResgatadoTotal: balance.saldoValorResgatadoTotal + input.cashbackAppliedAmount,
					dataAtualizacao: new Date(),
				})
				.where(eq(cashbackProgramBalances.id, balance.id));

			currentBalance = newBalanceAfterRedemption;
		}

		// 4. Create sale record
		const valorFinalVenda = input.saleValue - input.cashbackAppliedAmount;
		const saleDate = new Date();
		const insertedSaleResponse = await tx
			.insert(sales)
			.values({
				organizacaoId: input.orgId,
				clienteId: input.clientId,
				idExterno: `POI-${Date.now()}-${Math.random().toString(36).substring(7)}`,
				valorTotal: valorFinalVenda,
				custoTotal: 0,
				vendedorNome: "PONTO DE INTERAÇÃO",
				vendedorId: null,
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

		// 5. If cashback was used, create the redemption transaction linked to this sale
		if (input.cashbackApplied && input.cashbackAppliedAmount > 0) {
			await tx.insert(cashbackProgramTransactions).values({
				organizacaoId: input.orgId,
				clienteId: input.clientId,
				vendaId: saleId,
				programaId: program.id,
				tipo: "RESGATE",
				status: "ATIVO",
				valor: input.cashbackAppliedAmount,
				valorRestante: 0,
				saldoValorAnterior: currentBalance + input.cashbackAppliedAmount,
				saldoValorPosterior: currentBalance,
				expiracaoData: null,
			});
		}

		// 6. Calculate and accumulate new cashback based on ORIGINAL sale value (before cashback discount)
		let accumulatedBalance = 0;
		const balance = await tx.query.cashbackProgramBalances.findFirst({
			where: and(eq(cashbackProgramBalances.clienteId, input.clientId), eq(cashbackProgramBalances.organizacaoId, input.orgId)),
		});

		if (!balance) {
			throw new createHttpError.NotFound("Saldo de cashback não encontrado.");
		}

		if (program.acumuloTipo === "FIXO") {
			if (input.saleValue >= program.acumuloRegraValorMinimo) {
				accumulatedBalance = program.acumuloValor;
			}
		} else if (program.acumuloTipo === "PERCENTUAL") {
			if (input.saleValue >= program.acumuloRegraValorMinimo) {
				accumulatedBalance = (input.saleValue * program.acumuloValor) / 100;
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
				clienteId: input.clientId,
				vendaId: saleId,
				programaId: program.id,
				tipo: "ACÚMULO",
				status: "ATIVO",
				valor: accumulatedBalance,
				valorRestante: accumulatedBalance,
				saldoValorAnterior: previousOverallAvailableBalance,
				saldoValorPosterior: newOverallAvailableBalance,
				expiracaoData: dayjs().add(program.expiracaoRegraValidadeValor, "day").toDate(),
				dataInsercao: saleDate,
			});
		}

		// 7. Update client last purchase
		await tx
			.update(clients)
			.set({
				ultimaCompraData: saleDate,
				ultimaCompraId: saleId,
			})
			.where(eq(clients.id, input.clientId));

		return {
			saleId,
			cashbackAcumulado: accumulatedBalance,
			newBalance: newOverallAvailableBalance,
		};
	});

	return res.status(201).json({
		data: result,
		message: "Venda criada com sucesso.",
	});
};

export default apiHandler({ GET: getSalesRoute, POST: createSaleRoute });
