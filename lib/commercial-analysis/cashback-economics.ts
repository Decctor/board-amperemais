import { db } from "@/services/drizzle";
import { cashbackProgramBalances, cashbackProgramTransactions, cashbackPrograms } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { type TAnalysisSufficiency, buildSufficiency } from "./types";

export type TCashbackEconomicsAnalysis = {
	periodoMeses: number;
	programasAtivos: number;
	valorAcumulado: number;
	valorResgatado: number;
	valorExpirado: number;
	// Taxa de resgate = resgatado / acumulado. Mede se o benefício está de fato
	// puxando o cliente de volta. Baixa => cashback não percebido/usado.
	taxaResgate: number; // 0-100
	// Taxa de expiração (breakage) = expirado / acumulado. Alta pode significar
	// margem retida, mas também frustração de quem perdeu o saldo.
	taxaExpiracao: number; // 0-100
	// Passivo em aberto: saldo disponível que a empresa ainda deve aos clientes.
	passivoDisponivel: number;
	clientesComSaldo: number;
	alertas: string[];
	suficiencia: TAnalysisSufficiency;
};

/**
 * Economia do programa de cashback no período: acúmulo vs. resgate vs. expiração,
 * taxa de resgate e de expiração (breakage) e passivo em aberto. Não estima o
 * incremento real (deadweight) do benefício — isso exigiria grupo de controle
 * (holdout), que não existe nesta base; a taxa de resgate é o melhor proxy
 * disponível de engajamento com o programa.
 */
export async function getCashbackEconomics({
	organizacaoId,
	months = 12,
}: {
	organizacaoId: string;
	months?: number;
}): Promise<TCashbackEconomicsAnalysis> {
	const intervalStart = dayjs().subtract(months, "month").startOf("day").toDate();
	const intervalEnd = dayjs().endOf("day").toDate();

	const [programsRow, txRows, balanceRow] = await Promise.all([
		db
			.select({ programasAtivos: sql<number>`count(*) filter (where ${cashbackPrograms.ativo} = true)` })
			.from(cashbackPrograms)
			.where(eq(cashbackPrograms.organizacaoId, organizacaoId)),
		db
			.select({
				tipo: cashbackProgramTransactions.tipo,
				valorTotal: sql<number>`coalesce(sum(abs(${cashbackProgramTransactions.valor})), 0)`,
				quantidade: sql<number>`count(*)`,
			})
			.from(cashbackProgramTransactions)
			.where(
				and(
					eq(cashbackProgramTransactions.organizacaoId, organizacaoId),
					gte(cashbackProgramTransactions.dataInsercao, intervalStart),
					lte(cashbackProgramTransactions.dataInsercao, intervalEnd),
				),
			)
			.groupBy(cashbackProgramTransactions.tipo),
		db
			.select({
				passivoDisponivel: sql<number>`coalesce(sum(${cashbackProgramBalances.saldoValorDisponivel}), 0)`,
				clientesComSaldo: sql<number>`count(*) filter (where ${cashbackProgramBalances.saldoValorDisponivel} > 0)`,
			})
			.from(cashbackProgramBalances)
			.where(eq(cashbackProgramBalances.organizacaoId, organizacaoId)),
	]);

	const valorByTipo = new Map(txRows.map((row) => [row.tipo, Number(row.valorTotal ?? 0)]));
	const quantidadeByTipo = new Map(txRows.map((row) => [row.tipo, Number(row.quantidade ?? 0)]));

	const valorAcumulado = valorByTipo.get("ACÚMULO") ?? 0;
	const valorResgatado = valorByTipo.get("RESGATE") ?? 0;
	const valorExpirado = valorByTipo.get("EXPIRAÇÃO") ?? 0;
	const quantidadeAcumulos = quantidadeByTipo.get("ACÚMULO") ?? 0;

	const taxaResgate = valorAcumulado > 0 ? (valorResgatado / valorAcumulado) * 100 : 0;
	const taxaExpiracao = valorAcumulado > 0 ? (valorExpirado / valorAcumulado) * 100 : 0;

	const programasAtivos = Number(programsRow[0]?.programasAtivos ?? 0);
	const passivoDisponivel = Number(balanceRow[0]?.passivoDisponivel ?? 0);
	const clientesComSaldo = Number(balanceRow[0]?.clientesComSaldo ?? 0);

	const alertas: string[] = [];
	if (programasAtivos === 0) {
		alertas.push("Nenhum programa de cashback ativo. A economia de cashback não se aplica até existir um programa configurado.");
	}
	if (quantidadeAcumulos > 0 && taxaResgate < 20) {
		alertas.push(
			"Taxa de resgate abaixo de 20%: o cashback está sendo acumulado mas pouco usado. O benefício pode não estar visível/comunicado o suficiente para trazer o cliente de volta.",
		);
	}
	if (quantidadeAcumulos > 0 && taxaExpiracao >= 40) {
		alertas.push(
			"Taxa de expiração alta (40%+): boa parte do cashback expira sem uso. Avalie a validade configurada e a comunicação de saldo expirando — pode estar gerando frustração.",
		);
	}

	return {
		periodoMeses: months,
		programasAtivos,
		valorAcumulado: Math.round(valorAcumulado * 100) / 100,
		valorResgatado: Math.round(valorResgatado * 100) / 100,
		valorExpirado: Math.round(valorExpirado * 100) / 100,
		taxaResgate: Math.round(taxaResgate * 100) / 100,
		taxaExpiracao: Math.round(taxaExpiracao * 100) / 100,
		passivoDisponivel: Math.round(passivoDisponivel * 100) / 100,
		clientesComSaldo,
		alertas,
		suficiencia: buildSufficiency(quantidadeAcumulos),
	};
}
