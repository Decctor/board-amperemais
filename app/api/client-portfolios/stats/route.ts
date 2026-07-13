import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { resolveRoutineSeller } from "@/lib/routine/resolve-seller";
import { db } from "@/services/drizzle";
import { goals, goalsSellers, interactions, sales } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { and, count, eq, gte, inArray, isNotNull, lte, sql, sum } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const VALID_SALE_NATURE = "SN01";

// Janela da métrica de influência (docs/seller-routine-hub-design.md §7): venda do vendedor
// com interação manual dele para o mesmo cliente nos N dias anteriores. Não toca na
// atribuição de campanhas — são lentes paralelas, com sobreposição explícita.
const INFLUENCE_WINDOW_DAYS = 14;
// Tolerância para o anti-gaming: a interação precisa ter sido REGISTRADA antes da venda
// (com folga para atrasos de sync do ERP).
const INFLUENCE_INSERTION_TOLERANCE_HOURS = 6;

const GetRoutineStatsInputSchema = z.object({
	vendedorId: z
		.string({ invalid_type_error: "Tipo inválido para o ID do vendedor." })
		.optional()
		.nullable()
		.transform((v) => v || null),
});
export type TGetRoutineStatsInput = z.infer<typeof GetRoutineStatsInputSchema>;

/** Meta do dia: metas do vendedor vigentes hoje, pró-rateadas por dia do período. */
async function getSellerDailyGoal({ organizacaoId, vendedorId }: { organizacaoId: string; vendedorId: string }) {
	const startOfDay = dayjs().startOf("day").toDate();
	const endOfDay = dayjs().endOf("day").toDate();

	const sellerGoals = await db.query.goalsSellers.findMany({
		where: and(
			eq(goalsSellers.vendedorId, vendedorId),
			inArray(
				goalsSellers.metaId,
				db
					.select({ id: goals.id })
					.from(goals)
					.where(and(eq(goals.organizacaoId, organizacaoId), lte(goals.dataInicio, endOfDay), gte(goals.dataFim, startOfDay))),
			),
		),
		with: { meta: { columns: { dataInicio: true, dataFim: true } } },
	});

	return sellerGoals.reduce((acc, goal) => {
		const totalDays = Math.abs(dayjs(goal.meta.dataFim).diff(dayjs(goal.meta.dataInicio), "day")) + 1;
		if (totalDays <= 0) return acc;
		return acc + goal.objetivoValor / totalDays;
	}, 0);
}

/** Condição de influência: interação manual REALIZADA do próprio vendedor na janela antes da venda,
 * registrada antes da venda (anti-retroativo) e não marcada como registro retroativo. */
function influencedSaleExistsCondition() {
	return sql`exists (
		select 1 from ${interactions} i
		where i.organizacao_id = ${sales.organizacaoId}
			and i.cliente_id = ${sales.clienteId}
			and i.vendedor_id = ${sales.vendedorId}
			and i.status = 'REALIZADA'
			and i.iniciado_por = 'USUARIO'
			and i.data_interacao >= ${sales.dataVenda} - make_interval(days => ${INFLUENCE_WINDOW_DAYS})
			and i.data_interacao <= ${sales.dataVenda}
			and i.data_insercao <= ${sales.dataVenda} + make_interval(hours => ${INFLUENCE_INSERTION_TOLERANCE_HOURS})
			and coalesce((i.metadados->>'registroRetroativo')::boolean, false) = false
	)`;
}

async function getRoutineStats({ input, session }: { input: TGetRoutineStatsInput; session: TAuthUserSession }) {
	const { organizacaoId, seller } = await resolveRoutineSeller({ session, explicitSellerId: input.vendedorId });

	const startOfDay = dayjs().startOf("day").toDate();
	const startOfMonth = dayjs().startOf("month").toDate();

	// Vendas de hoje.
	const [todaySales] = await db
		.select({ qtde: count(sales.id), total: sum(sales.valorTotal) })
		.from(sales)
		.where(
			and(
				eq(sales.organizacaoId, organizacaoId),
				eq(sales.vendedorId, seller.id),
				eq(sales.natureza, VALID_SALE_NATURE),
				isNotNull(sales.dataVenda),
				gte(sales.dataVenda, startOfDay),
			),
		);
	const vendasHojeQtde = Number(todaySales?.qtde ?? 0);
	const vendasHojeValor = todaySales?.total ? Number(todaySales.total) : 0;

	// Abordagens de hoje (interações manuais realizadas pelo vendedor).
	const [todayApproaches] = await db
		.select({ qtde: count(interactions.id) })
		.from(interactions)
		.where(
			and(
				eq(interactions.organizacaoId, organizacaoId),
				eq(interactions.vendedorId, seller.id),
				eq(interactions.status, "REALIZADA"),
				eq(interactions.iniciadoPor, "USUARIO"),
				gte(interactions.dataInteracao, startOfDay),
			),
		);
	const abordagensHoje = Number(todayApproaches?.qtde ?? 0);

	// Vendas influenciadas no mês (lente do vendedor; §7). `assistidas` = sobreposição
	// explícita com conversão de campanha — contada nas duas lentes, nunca dividida.
	const influencedWhere = and(
		eq(sales.organizacaoId, organizacaoId),
		eq(sales.vendedorId, seller.id),
		eq(sales.natureza, VALID_SALE_NATURE),
		isNotNull(sales.dataVenda),
		gte(sales.dataVenda, startOfMonth),
		influencedSaleExistsCondition(),
	);
	const [influencedResult] = await db
		.select({
			qtde: count(sales.id),
			total: sum(sales.valorTotal),
			assistidas: sql<number>`count(*) filter (where ${sales.atribuicaoCampanhaConversaoId} is not null)`,
		})
		.from(sales)
		.where(influencedWhere);

	const metaDia = await getSellerDailyGoal({ organizacaoId, vendedorId: seller.id });

	return {
		data: {
			vendedor: seller,
			metaDia,
			vendasHoje: {
				qtde: vendasHojeQtde,
				valor: vendasHojeValor,
				ticketMedio: vendasHojeQtde > 0 ? vendasHojeValor / vendasHojeQtde : 0,
			},
			abordagensHoje,
			influenciadasMes: {
				qtde: Number(influencedResult?.qtde ?? 0),
				valor: influencedResult?.total ? Number(influencedResult.total) : 0,
				assistidasPorCampanha: Number(influencedResult?.assistidas ?? 0),
			},
		},
		message: "Indicadores da rotina carregados com sucesso.",
	};
}
export type TGetRoutineStatsOutput = Awaited<ReturnType<typeof getRoutineStats>>;

async function getRoutineStatsRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	if (!session.membership) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");

	const { searchParams } = new URL(request.url);
	const input = GetRoutineStatsInputSchema.parse({ vendedorId: searchParams.get("vendedorId") });
	const result = await getRoutineStats({ input, session });
	return NextResponse.json(result, { status: 200 });
}

export const GET = appApiHandler({ GET: getRoutineStatsRoute });
