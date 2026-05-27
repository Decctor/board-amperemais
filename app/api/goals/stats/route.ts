import { appApiHandler } from "@/lib/app-api";
import { runPagesRouteHandler, type PagesRouteHandler, type PagesRouteRequest, type PagesRouteResponse } from "@/lib/pages-route-compat";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { db } from "@/services/drizzle";
import { clients, goals, sales } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { and, count, eq, gte, isNotNull, lte, sum } from "drizzle-orm";
import createHttpError from "http-errors";

async function computeAchievementForPeriod({
	organizacaoId,
	dataInicio,
	dataFim,
}: {
	organizacaoId: string;
	dataInicio: Date;
	dataFim: Date;
}) {
	const saleConditions = [
		eq(sales.organizacaoId, organizacaoId),
		isNotNull(sales.dataVenda),
		eq(sales.natureza, "SN01"),
		gte(sales.dataVenda, dataInicio),
		lte(sales.dataVenda, dataFim),
	];

	const [salesResult, clientsResult] = await Promise.all([
		db.select({ totalValor: sum(sales.valorTotal), totalQtde: count(sales.id) }).from(sales).where(and(...saleConditions)),
		db
			.select({ totalNovosClientes: count(clients.id) })
			.from(clients)
			.where(
				and(
					eq(clients.organizacaoId, organizacaoId),
					isNotNull(clients.primeiraCompraData),
					gte(clients.primeiraCompraData, dataInicio),
					lte(clients.primeiraCompraData, dataFim),
				),
			),
	]);

	return {
		realizadoValor: Number(salesResult[0]?.totalValor ?? 0),
		realizadoQtdeVendas: Number(salesResult[0]?.totalQtde ?? 0),
		realizadoNovosClientes: Number(clientsResult[0]?.totalNovosClientes ?? 0),
	};
}

async function getGoalsStats({ session }: { session: TAuthUserSession }) {
	const userOrgId = session.membership?.organizacao.id;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const allGoals = await db.query.goals.findMany({
		where: (fields, { eq }) => eq(fields.organizacaoId, userOrgId),
		orderBy: (fields, { desc }) => desc(fields.dataInicio),
	});

	const now = dayjs();

	// Compute achievement for each goal in parallel
	const goalsWithAchievement = await Promise.all(
		allGoals.map(async (goal) => {
			const achievement = await computeAchievementForPeriod({
				organizacaoId: userOrgId,
				dataInicio: goal.dataInicio,
				dataFim: goal.dataFim,
			});

			const percentualValor = goal.objetivoValor > 0 ? (achievement.realizadoValor / goal.objetivoValor) * 100 : 0;
			const percentualQtde =
				goal.objetivoQtdeVendas && goal.objetivoQtdeVendas > 0 ? (achievement.realizadoQtdeVendas / goal.objetivoQtdeVendas) * 100 : null;
			const percentualClientes =
				goal.objetivoNovosClientes && goal.objetivoNovosClientes > 0 ? (achievement.realizadoNovosClientes / goal.objetivoNovosClientes) * 100 : null;

			const isActive = dayjs(goal.dataInicio).isBefore(now) && dayjs(goal.dataFim).isAfter(now);

			const label = `${dayjs(goal.dataInicio).format("DD/MM/YY")} - ${dayjs(goal.dataFim).format("DD/MM/YY")}`;

			return {
				...goal,
				...achievement,
				percentualValor,
				percentualQtde,
				percentualClientes,
				isActive,
				label,
			};
		}),
	);

	// Find the currently active goal
	const activeGoal = goalsWithAchievement.find((g) => g.isActive) ?? null;

	// Compute aggregate KPIs
	const totalMetas = goalsWithAchievement.length;
	const metasConcluidas = goalsWithAchievement.filter((g) => g.percentualValor >= 100).length;
	const mediaPercentualConclusiaoValor =
		totalMetas > 0 ? goalsWithAchievement.reduce((acc, g) => acc + g.percentualValor, 0) / totalMetas : 0;

	// Build historico for chart (most recent 12 goals, chronological order for chart)
	const historico = goalsWithAchievement.slice(0, 12).reverse();

	return {
		data: {
			activeGoal,
			historico,
			totalMetas,
			metasConcluidas,
			mediaPercentualConclusiaoValor,
		},
	};
}

export type TGetGoalsStatsOutput = Awaited<ReturnType<typeof getGoalsStats>>;
export type TGetGoalsStatsActiveGoal = Exclude<TGetGoalsStatsOutput["data"]["activeGoal"], null>;
export type TGetGoalsStatsHistoricoItem = TGetGoalsStatsOutput["data"]["historico"][number];

const getGoalsStatsHandler: PagesRouteHandler<TGetGoalsStatsOutput> = async (req, res) => {
	const sessionUser = await getCurrentSessionUncached();
	if (!sessionUser) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const data = await getGoalsStats({ session: sessionUser });
	return res.status(200).json(data);
};

const routeHandlers = {
	GET: getGoalsStatsHandler,
} satisfies Partial<Record<"GET" | "POST" | "PUT" | "PATCH" | "DELETE", PagesRouteHandler<any>>>;

export const GET = appApiHandler({
	GET: (request) => runPagesRouteHandler({ request, handler: routeHandlers.GET! }),
});
