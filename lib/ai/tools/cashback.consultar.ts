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
export const cashbackConsultarTool = defineAgentTool({
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
		const visao = input.visao ?? "SALDO";

		const programa = await db.query.cashbackPrograms.findFirst({
			where: and(eq(cashbackPrograms.organizacaoId, organizacaoId), eq(cashbackPrograms.ativo, true)),
		});

		if (!programa) {
			return { success: false, message: "A empresa não possui um programa de cashback ativo no momento." };
		}

		if (visao === "RECOMPENSAS") {
			if (!programa.modalidadeRecompensasPermitida) {
				return {
					success: false,
					message: "O programa de cashback desta empresa não trabalha com recompensas — o saldo é usado como desconto nas compras.",
				};
			}

			const recompensas = await db.query.cashbackProgramPrizes.findMany({
				where: and(eq(cashbackProgramPrizes.programaId, programa.id), eq(cashbackProgramPrizes.ativo, true)),
				orderBy: [asc(cashbackProgramPrizes.valor)],
				limit: input.limite ?? 20,
				columns: { titulo: true, descricao: true, valor: true },
			});

			return {
				success: true,
				message: `${recompensas.length} recompensa(s) disponível(is) no programa "${programa.titulo}".`,
				result: {
					programa: { titulo: programa.titulo, terminologia: programa.terminologia },
					recompensas,
				},
			};
		}

		if (visao === "EXTRATO") {
			const conditions = [
				eq(cashbackProgramTransactions.organizacaoId, organizacaoId),
				eq(cashbackProgramTransactions.clienteId, chat.clienteId),
				eq(cashbackProgramTransactions.programaId, programa.id),
			];
			if (input.dataInicio) conditions.push(gte(cashbackProgramTransactions.dataInsercao, new Date(input.dataInicio)));
			if (input.dataFim) conditions.push(lte(cashbackProgramTransactions.dataInsercao, new Date(input.dataFim)));
			const where = and(...conditions);

			const [totalRow] = await db.select({ total: count() }).from(cashbackProgramTransactions).where(where);
			const totalEncontrado = Number(totalRow?.total ?? 0);

			const movimentacoes = await db.query.cashbackProgramTransactions.findMany({
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
				message: `${movimentacoes.length} de ${totalEncontrado} movimentação(ões) de cashback.`,
				result: {
					programa: { titulo: programa.titulo, terminologia: programa.terminologia },
					totalEncontrado,
					movimentacoes,
				},
			};
		}

		const saldo = await db.query.cashbackProgramBalances.findFirst({
			where: and(
				eq(cashbackProgramBalances.organizacaoId, organizacaoId),
				eq(cashbackProgramBalances.clienteId, chat.clienteId),
				eq(cashbackProgramBalances.programaId, programa.id),
			),
			columns: { saldoValorDisponivel: true, saldoValorAcumuladoTotal: true, saldoValorResgatadoTotal: true },
		});

		return {
			success: true,
			message: saldo
				? `Saldo de cashback do cliente no programa "${programa.titulo}".`
				: `O cliente ainda não possui saldo no programa "${programa.titulo}".`,
			result: {
				programa: {
					titulo: programa.titulo,
					descricao: programa.descricao,
					terminologia: programa.terminologia,
					acumuloTipo: programa.acumuloTipo,
					acumuloValor: programa.acumuloValor,
					acumuloValorMinimoCompra: programa.acumuloRegraValorMinimo,
					validadeDias: programa.expiracaoRegraValidadeValor,
					resgateLimiteTipo: programa.resgateLimiteTipo,
					resgateLimiteValor: programa.resgateLimiteValor,
					usoComoDesconto: programa.modalidadeDescontosPermitida,
					usoComoRecompensa: programa.modalidadeRecompensasPermitida,
				},
				saldo: {
					disponivel: saldo?.saldoValorDisponivel ?? 0,
					acumuladoTotal: saldo?.saldoValorAcumuladoTotal ?? 0,
					resgatadoTotal: saldo?.saldoValorResgatadoTotal ?? 0,
				},
			},
		};
	},
});
