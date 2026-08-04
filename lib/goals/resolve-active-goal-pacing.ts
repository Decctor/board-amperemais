import {
	buildGoalPacingCurve,
	buildGoalPacingSeries,
	countPeriodDays,
	indexDailyAchievement,
	resolveGoalPacing,
	type TGoalObjectives,
	type TGoalPacingCurve,
} from "./pacing";
import { getGoalDailyAchievement, getGoalDailyAchievementBySeller, getWeekdayRevenueWeights } from "./sales-distribution";

/**
 * Costura as leituras de banco com a matemática pura e devolve o bloco `ritmo` que vai no payload.
 *
 * Só metas **ativas** passam por aqui. Uma meta encerrada não tem "meta de hoje" nem está
 * adiantada ou atrasada — o percentual do período já diz tudo que há para dizer sobre ela — e uma
 * meta futura ainda não começou. Calcular ritmo para as doze metas do histórico custaria três
 * queries por meta para produzir números sem leitura possível.
 */

type TSellerGoal = {
	vendedorId: string;
	objetivoValor: number;
	objetivoQtdeVendas?: number | null;
	objetivoNovosClientes?: number | null;
};

export async function resolveActiveGoalPacing({
	organizacaoId,
	goal,
	goalSellers,
	agora,
}: {
	organizacaoId: string;
	goal: { dataInicio: Date; dataFim: Date } & TGoalObjectives;
	goalSellers: TSellerGoal[];
	agora: Date;
}) {
	const [weekdayWeights, dailyAchievement, achievementBySeller] = await Promise.all([
		getWeekdayRevenueWeights({ organizacaoId, referencia: agora }),
		getGoalDailyAchievement({ organizacaoId, dataInicio: goal.dataInicio, dataFim: goal.dataFim }),
		goalSellers.length > 0
			? getGoalDailyAchievementBySeller({ organizacaoId, dataInicio: goal.dataInicio, dataFim: goal.dataFim })
			: Promise.resolve(new Map()),
	]);

	const curva = buildGoalPacingCurve({
		dataInicio: goal.dataInicio,
		dataFim: goal.dataFim,
		pesosPorDiaSemana: weekdayWeights.pesosPorDiaSemana,
		totalVendasHistorico: weekdayWeights.totalVendas,
	});

	const objetivos: TGoalObjectives = {
		objetivoValor: goal.objetivoValor,
		objetivoQtdeVendas: goal.objetivoQtdeVendas,
		objetivoNovosClientes: goal.objetivoNovosClientes,
	};

	const realizadoPorDia = indexDailyAchievement(dailyAchievement);
	const pacing = resolveGoalPacing({ curva, objetivos, realizadoPorDia, agora });

	// Os vendedores usam a curva da organização escalada pelo objetivo de cada um, e não uma curva
	// própria: um vendedor que trabalha só terça e quinta teria ~12 amostras por dia da semana, o
	// que produz ruído, não sinal.
	const vendedores = goalSellers.map((goalSeller) => {
		const sellerPacing = resolveGoalPacing({
			curva,
			objetivos: {
				objetivoValor: goalSeller.objetivoValor,
				objetivoQtdeVendas: goalSeller.objetivoQtdeVendas,
				objetivoNovosClientes: goalSeller.objetivoNovosClientes,
			},
			realizadoPorDia: indexDailyAchievement(achievementBySeller.get(goalSeller.vendedorId) ?? []),
			agora,
		});

		return {
			vendedorId: goalSeller.vendedorId,
			metaDia: sellerPacing.metaDia,
			metaSemana: sellerPacing.metaSemana,
			realizadoDia: sellerPacing.realizadoDia,
			realizadoSemana: sellerPacing.realizadoSemana,
			esperadoAcumulado: sellerPacing.esperadoAcumulado,
			diferenca: sellerPacing.diferenca,
			situacao: sellerPacing.situacao,
		};
	});

	return {
		...pacing,
		totalDias: countPeriodDays({ dataInicio: goal.dataInicio, dataFim: goal.dataFim }),
		diaAtualDoPeriodo: curva.dias.filter((item) => item.dia.getTime() <= agora.getTime()).length,
		curva: buildGoalPacingSeries({ curva, objetivos, realizadoPorDia, agora }),
		vendedores,
	};
}

export type TGoalPacingPayload = Awaited<ReturnType<typeof resolveActiveGoalPacing>>;

/**
 * Curva de uma organização sem meta atrelada, para reponderar uma janela arbitrária.
 *
 * É o que o gráfico de vendas precisa: a linha de meta de um filtro que não coincide com o período
 * da meta deixa de ser regra de três por dias corridos e passa a respeitar a distribuição real.
 */
export async function buildOrganizationPacingCurve({
	organizacaoId,
	dataInicio,
	dataFim,
	agora,
}: {
	organizacaoId: string;
	dataInicio: Date;
	dataFim: Date;
	agora: Date;
}): Promise<TGoalPacingCurve> {
	const weekdayWeights = await getWeekdayRevenueWeights({ organizacaoId, referencia: agora });
	return buildGoalPacingCurve({
		dataInicio,
		dataFim,
		pesosPorDiaSemana: weekdayWeights.pesosPorDiaSemana,
		totalVendasHistorico: weekdayWeights.totalVendas,
	});
}
