import { appApiHandler } from "@/lib/app-api";
import { db } from "@/services/drizzle";
import { cashbackProgramBalances, cashbackProgramTransactions, cashbackPrograms, organizations } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const RedemptionInputSchema = z.object({
	orgId: z.string({
		required_error: "ID da organização não informado.",
		invalid_type_error: "Tipo não válido para ID da organização.",
	}),
	clienteId: z.string({
		required_error: "ID do cliente não informado.",
		invalid_type_error: "Tipo não válido para ID do cliente.",
	}),
	valor: z
		.number({
			required_error: "Valor não informado.",
			invalid_type_error: "Tipo não válido para valor.",
		})
		.refine((val) => [10, 20, 30, 50].includes(val), {
			message: "Valor deve ser 10, 20, 30 ou 50.",
		}),
	senhaOperador: z
		.string({
			required_error: "Senha do operador não informada.",
			invalid_type_error: "Tipo não válido para senha do operador.",
		})
		.length(4, "Senha deve ter 4 dígitos."),
});

type RedemptionResponse = {
	data: {
		transactionId: string;
		newBalance: number;
		newResgatadoTotal: number;
	};
	message: string;
};

async function processRedemption(input: z.infer<typeof RedemptionInputSchema>): Promise<RedemptionResponse> {
	return await db.transaction(async (tx) => {
		// 1. Get organization and validate password
		const org = await tx.query.organizations.findFirst({
			where: eq(organizations.id, input.orgId),
			columns: { cnpj: true, nome: true },
		});

		if (!org) {
			throw new createHttpError.NotFound("Organização não encontrada.");
		}

		const cnpjFirst4Digits = org.cnpj.replace(/\D/g, "").substring(0, 4);
		if (input.senhaOperador !== cnpjFirst4Digits) {
			throw new createHttpError.Unauthorized("Senha inválida.");
		}

		// 2. Get cashback program
		const program = await tx.query.cashbackPrograms.findFirst({
			where: eq(cashbackPrograms.organizacaoId, input.orgId),
		});

		if (!program) {
			throw new createHttpError.NotFound("Programa de cashback não encontrado.");
		}

		// 3. Get balance
		const balance = await tx.query.cashbackProgramBalances.findFirst({
			where: and(eq(cashbackProgramBalances.clienteId, input.clienteId), eq(cashbackProgramBalances.organizacaoId, input.orgId)),
		});

		if (!balance) {
			throw new createHttpError.NotFound("Saldo de cashback não encontrado para este cliente.");
		}

		if (balance.saldoValorDisponivel < input.valor) {
			throw new createHttpError.BadRequest("Saldo insuficiente.");
		}

		// 4. Calculate new balances
		const previousBalance = balance.saldoValorDisponivel;
		const newBalance = previousBalance - input.valor;
		const newResgatadoTotal = balance.saldoValorResgatadoTotal + input.valor;

		// 5. Create redemption transaction
		const transactionResult = await tx
			.insert(cashbackProgramTransactions)
			.values({
				organizacaoId: input.orgId,
				clienteId: input.clienteId,
				programaId: program.id,
				vendaId: null, // No associated sale for quick redemptions
				tipo: "RESGATE",
				status: "ATIVO",
				valor: input.valor,
				valorRestante: 0, // Fully consumed
				saldoValorAnterior: previousBalance,
				saldoValorPosterior: newBalance,
				expiracaoData: null,
			})
			.returning({ id: cashbackProgramTransactions.id });

		const transactionId = transactionResult[0]?.id;

		if (!transactionId) {
			throw new createHttpError.InternalServerError("Erro ao criar transação de resgate.");
		}

		// 6. Update balance
		await tx
			.update(cashbackProgramBalances)
			.set({
				saldoValorDisponivel: newBalance,
				saldoValorResgatadoTotal: newResgatadoTotal,
				dataAtualizacao: new Date(),
			})
			.where(eq(cashbackProgramBalances.id, balance.id));

		return {
			data: {
				transactionId,
				newBalance,
				newResgatadoTotal,
			},
			message: "Resgate realizado com sucesso.",
		};
	});
}

const redemptionRoute = async (request: NextRequest) => {
	const payload = await request.json();
	const input = RedemptionInputSchema.parse(payload);
	const result = await processRedemption(input);
	return NextResponse.json(result, { status: 200 });
};

export const POST = appApiHandler({
	POST: redemptionRoute,
});
