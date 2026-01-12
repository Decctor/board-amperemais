import { apiHandler } from "@/lib/api";
import { getCurrentSessionUncached } from "@/lib/authentication/pages-session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { db } from "@/services/drizzle";
import { clients, sales } from "@/services/drizzle/schema";
import { and, count, desc, eq, gte, inArray, lte, notInArray, sql, sum } from "drizzle-orm";
import createHttpError from "http-errors";
import type { NextApiHandler } from "next";
import { z } from "zod";

const GetClientsRankingInputSchema = z.object({
	periodAfter: z
		.string({
			required_error: "Período não informado.",
			invalid_type_error: "Tipo inválido para período.",
		})
		.datetime({ message: "Tipo inválido para período." })
		.optional()
		.nullable()
		.transform((val) => (val ? new Date(val) : null)),
	periodBefore: z
		.string({
			required_error: "Período não informado.",
			invalid_type_error: "Tipo inválido para período.",
		})
		.datetime({ message: "Tipo inválido para período." })
		.optional()
		.nullable()
		.transform((val) => (val ? new Date(val) : null)),
	comparingPeriodAfter: z
		.string({
			required_error: "Período de comparação não informado.",
			invalid_type_error: "Tipo inválido para período de comparação.",
		})
		.datetime({ message: "Tipo inválido para período de comparação." })
		.optional()
		.nullable()
		.transform((val) => (val ? new Date(val) : null)),
	comparingPeriodBefore: z
		.string({
			required_error: "Período de comparação não informado.",
			invalid_type_error: "Tipo inválido para período de comparação.",
		})
		.datetime({ message: "Tipo inválido para período de comparação." })
		.optional()
		.nullable()
		.transform((val) => (val ? new Date(val) : null)),
	rankingBy: z.enum(["purchases-total-qty", "purchases-total-value"]).optional().nullable(),
});
export type TGetClientsRankingInput = z.infer<typeof GetClientsRankingInputSchema>;

async function fetchRankingForPeriod({
	periodAfter,
	periodBefore,
	rankingBy,
	userOrgId,
}: {
	periodAfter: Date | null;
	periodBefore: Date | null;
	rankingBy: "purchases-total-qty" | "purchases-total-value" | null | undefined;
	userOrgId: string;
}) {
	// Build sale conditions (org and valid sales only (SNO1))
	const saleConditions = [eq(sales.organizacaoId, userOrgId), eq(sales.natureza, "SN01")];
	if (periodAfter) saleConditions.push(gte(sales.dataVenda, periodAfter));
	if (periodBefore) saleConditions.push(lte(sales.dataVenda, periodBefore));

	// Get top clients based on ranking criteria
	const ranking = await db
		.select({
			clienteId: sales.clienteId,
			clienteNome: clients.nome,
			clienteTelefone: clients.telefone,
			clienteEmail: clients.email,
			totalPurchases: count(sales.id),
			totalValue: sum(sales.valorTotal),
		})
		.from(sales)
		.innerJoin(clients, eq(sales.clienteId, clients.id))
		.where(and(...saleConditions, eq(clients.organizacaoId, userOrgId)))
		.groupBy(sales.clienteId, clients.nome, clients.telefone, clients.email)
		.orderBy(desc(rankingBy === "purchases-total-value" ? sum(sales.valorTotal) : count(sales.id)))
		.limit(10);

	return ranking.map((item, index) => ({
		rank: index + 1,
		clienteId: item.clienteId,
		nome: item.clienteNome,
		telefone: item.clienteTelefone,
		email: item.clienteEmail,
		totalPurchases: Number(item.totalPurchases),
		totalValue: Number(item.totalValue ?? 0),
	}));
}

async function getClientsRanking({ input, session }: { input: TGetClientsRankingInput; session: TAuthUserSession["user"] }) {
	const userOrgId = session.organizacaoId;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	console.log("[INFO] [GET CLIENTS RANKING] Starting:", {
		userOrg: userOrgId,
		input,
	});

	const { periodAfter, periodBefore, comparingPeriodAfter, comparingPeriodBefore, rankingBy } = input;

	// Fetch current period ranking
	const currentRanking = await fetchRankingForPeriod({
		periodAfter,
		periodBefore,
		rankingBy,
		userOrgId,
	});

	// If no comparison period, return current ranking without comparison fields
	if (!comparingPeriodAfter || !comparingPeriodBefore) {
		return {
			data: currentRanking.map((item) => ({
				...item,
				rankComparison: null,
				rankDelta: null,
				totalPurchasesComparison: null,
				totalValueComparison: null,
			})),
		};
	}

	// Fetch comparison period ranking
	const comparisonRanking = await fetchRankingForPeriod({
		periodAfter: comparingPeriodAfter,
		periodBefore: comparingPeriodBefore,
		rankingBy,
		userOrgId,
	});

	// Create a map of clientId -> comparison data for quick lookup
	const comparisonMap = new Map(
		comparisonRanking.map((item) => [
			item.clienteId,
			{
				rank: item.rank,
				totalPurchases: item.totalPurchases,
				totalValue: item.totalValue,
			},
		]),
	);

	// Merge current ranking with comparison data
	const enrichedRanking = currentRanking.map((item) => {
		const comparisonData = comparisonMap.get(item.clienteId);
		const rankComparison = comparisonData?.rank ?? null;
		const rankDelta = rankComparison !== null ? rankComparison - item.rank : null;

		return {
			...item,
			rankComparison,
			rankDelta,
			totalPurchasesComparison: comparisonData?.totalPurchases ?? null,
			totalValueComparison: comparisonData?.totalValue ?? null,
		};
	});

	return {
		data: enrichedRanking,
	};
}

export type TGetClientsRankingOutput = Awaited<ReturnType<typeof getClientsRanking>>;

const getClientsRankingRoute: NextApiHandler<TGetClientsRankingOutput> = async (req, res) => {
	const sessionUser = await getCurrentSessionUncached(req.cookies);
	if (!sessionUser) throw new createHttpError.Unauthorized("Você não está autenticado.");

	const input = GetClientsRankingInputSchema.parse({
		periodAfter: (req.query.periodAfter as string | undefined) ?? null,
		periodBefore: (req.query.periodBefore as string | undefined) ?? null,
		comparingPeriodAfter: (req.query.comparingPeriodAfter as string | undefined) ?? null,
		comparingPeriodBefore: (req.query.comparingPeriodBefore as string | undefined) ?? null,
		rankingBy: (req.query.rankingBy as "purchases-total-qty" | "purchases-total-value" | undefined) ?? "purchases-total-value",
	});

	const data = await getClientsRanking({ input, session: sessionUser.user });
	return res.status(200).json(data);
};

export default apiHandler({
	GET: getClientsRankingRoute,
});
