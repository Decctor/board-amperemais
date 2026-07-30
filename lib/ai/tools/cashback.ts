import { cashbackProgramBalances, cashbackProgramPrizes, cashbackProgramTransactions, cashbackPrograms } from "@/services/drizzle/schema";
import { and, asc, count, desc, eq, gte, lte } from "drizzle-orm";
import z from "zod";
import { defineAgentTool } from "./define-tool";

/**
 * Consulta o programa de cashback da organização e a posição do cliente nele.
 *
 * Uma organização sem programa ativo devolve `success: false` com mensagem — é informação
 * legítima para o agente comunicar, não um erro de execução.
 */
export const cashbackTool = defineAgentTool({
	name: "cashback.consultar",
	description: `Consulta o programa de cashback da empresa e a situação do cliente com quem
você está conversando.

Use visao="SALDO" (padrão) para o saldo disponível do cliente e as regras do programa
(percentual/valor de acúmulo, valor mínimo de compra, validade, limite de resgate).
Use visao="EXTRATO" para o histórico de movimentações (acúmulos, resgates, expirações),
opcionalmente filtrado por dataInicio/dataFim em ISO 8601.
Use visao="RECOMPENSAS" para os prêmios que o cliente pode resgatar com o saldo.

Sempre consulte esta ferramenta antes de falar sobre saldo, pontos ou cashback — nunca
estime valores nem prometa benefícios que não vieram daqui.`,
	inputSchema: z.object({
		visao: z.enum(["SALDO", "EXTRATO", "RECOMPENSAS"]).optional().describe("O que consultar. Padrão: SALDO."),
		dataInicio: z.string().datetime().optional().describe("Início do período no extrato (ISO 8601)."),
		dataFim: z.string().datetime().optional().describe("Fim do período no extrato (ISO 8601)."),
		limite: z.number().int().min(1).max(50).optional().describe("Máximo de movimentações no extrato. Padrão: 10."),
	}),
	async execute(input, context) {
		const { db, organizacaoId, chat } = context;
		const view = input.visao ?? "SALDO";

		const program = await db.query.cashbackPrograms.findFirst({
			where: and(eq(cashbackPrograms.organizacaoId, organizacaoId), eq(cashbackPrograms.ativo, true)),
		});

		if (!program) {
			return { success: false, message: "A empresa não possui um programa de cashback ativo no momento." };
		}

		if (view === "RECOMPENSAS") {
			if (!program.modalidadeRecompensasPermitida) {
				return {
					success: false,
					message: "O programa de cashback desta empresa não trabalha com recompensas — o saldo é usado como desconto nas compras.",
				};
			}

			const prizes = await db.query.cashbackProgramPrizes.findMany({
				where: and(eq(cashbackProgramPrizes.programaId, program.id), eq(cashbackProgramPrizes.ativo, true)),
				orderBy: [asc(cashbackProgramPrizes.valor)],
				limit: input.limite ?? 20,
				columns: { titulo: true, descricao: true, valor: true },
			});

			return {
				success: true,
				message: `${prizes.length} recompensa(s) disponível(is) no programa "${program.titulo}".`,
				result: {
					programa: { titulo: program.titulo, terminologia: program.terminologia },
					recompensas: prizes,
				},
			};
		}

		if (view === "EXTRATO") {
			const conditions = [
				eq(cashbackProgramTransactions.organizacaoId, organizacaoId),
				eq(cashbackProgramTransactions.clienteId, chat.clienteId),
				eq(cashbackProgramTransactions.programaId, program.id),
			];
			if (input.dataInicio) conditions.push(gte(cashbackProgramTransactions.dataInsercao, new Date(input.dataInicio)));
			if (input.dataFim) conditions.push(lte(cashbackProgramTransactions.dataInsercao, new Date(input.dataFim)));
			const where = and(...conditions);

			const [totalRow] = await db.select({ total: count() }).from(cashbackProgramTransactions).where(where);
			const totalEncontrado = Number(totalRow?.total ?? 0);

			const transactions = await db.query.cashbackProgramTransactions.findMany({
				where,
				orderBy: [desc(cashbackProgramTransactions.dataInsercao)],
				limit: input.limite ?? 10,
				columns: {
					tipo: true,
					status: true,
					valor: true,
					valorRestante: true,
					saldoValorPosterior: true,
					expiracaoData: true,
					dataInsercao: true,
				},
			});

			return {
				success: true,
				message: `${transactions.length} de ${totalEncontrado} movimentação(ões) de cashback.`,
				result: {
					programa: { titulo: program.titulo, terminologia: program.terminologia },
					totalEncontrado,
					movimentacoes: transactions,
				},
			};
		}

		const balance = await db.query.cashbackProgramBalances.findFirst({
			where: and(
				eq(cashbackProgramBalances.organizacaoId, organizacaoId),
				eq(cashbackProgramBalances.clienteId, chat.clienteId),
				eq(cashbackProgramBalances.programaId, program.id),
			),
			columns: { saldoValorDisponivel: true, saldoValorAcumuladoTotal: true, saldoValorResgatadoTotal: true },
		});

		return {
			success: true,
			message: balance
				? `Saldo de cashback do cliente no programa "${program.titulo}".`
				: `O cliente ainda não possui saldo no programa "${program.titulo}".`,
			result: {
				programa: {
					titulo: program.titulo,
					descricao: program.descricao,
					terminologia: program.terminologia,
					acumuloTipo: program.acumuloTipo,
					acumuloValor: program.acumuloValor,
					acumuloValorMinimoCompra: program.acumuloRegraValorMinimo,
					validadeDias: program.expiracaoRegraValidadeValor,
					resgateLimiteTipo: program.resgateLimiteTipo,
					resgateLimiteValor: program.resgateLimiteValor,
					usoComoDesconto: program.modalidadeDescontosPermitida,
					usoComoRecompensa: program.modalidadeRecompensasPermitida,
				},
				saldo: {
					disponivel: balance?.saldoValorDisponivel ?? 0,
					acumuladoTotal: balance?.saldoValorAcumuladoTotal ?? 0,
					resgatadoTotal: balance?.saldoValorResgatadoTotal ?? 0,
				},
			},
		};
	},
});
