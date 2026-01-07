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
	saleNatures: z
		.array(
			z.string({
				invalid_type_error: "Tipo inválido para natureza de venda.",
			}),
		)
		.optional()
		.nullable(),
	excludedSalesIds: z
		.array(
			z.string({
				invalid_type_error: "Tipo inválido para ID da venda.",
			}),
		)
		.optional()
		.nullable(),
	totalMin: z
		.number({
			invalid_type_error: "Tipo inválido para valor mínimo da venda.",
		})
		.optional()
		.nullable(),
	totalMax: z
		.number({
			invalid_type_error: "Tipo inválido para valor máximo da venda.",
		})
		.optional()
		.nullable(),
	rankingBy: z.enum(["purchases-total-qty", "purchases-total-value"]).optional().nullable(),
});
export type TGetClientsRankingInput = z.infer<typeof GetClientsRankingInputSchema>;

async function getClientsRanking({ input, session }: { input: TGetClientsRankingInput; session: TAuthUserSession["user"] }) {
	const userOrgId = session.organizacaoId;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	console.log("[INFO] [GET CLIENTS RANKING] Starting:", {
		userOrg: userOrgId,
		input,
	});

	const { periodAfter, periodBefore, saleNatures, excludedSalesIds, totalMin, totalMax, rankingBy } = input;

	// Build sale conditions
	const saleConditions = [eq(sales.organizacaoId, userOrgId)];
	if (periodAfter) saleConditions.push(gte(sales.dataVenda, periodAfter));
	if (periodBefore) saleConditions.push(lte(sales.dataVenda, periodBefore));
	if (saleNatures && saleNatures.length > 0) saleConditions.push(inArray(sales.natureza, saleNatures));
	if (excludedSalesIds && excludedSalesIds.length > 0) saleConditions.push(notInArray(sales.id, excludedSalesIds));
	if (totalMin) saleConditions.push(gte(sales.valorTotal, totalMin));
	if (totalMax) saleConditions.push(lte(sales.valorTotal, totalMax));

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

	const formattedRanking = ranking.map((item, index) => ({
		rank: index + 1,
		clienteId: item.clienteId,
		nome: item.clienteNome,
		telefone: item.clienteTelefone,
		email: item.clienteEmail,
		totalPurchases: Number(item.totalPurchases),
		totalValue: Number(item.totalValue ?? 0),
	}));

	return {
		data: formattedRanking,
	};
}

export type TGetClientsRankingOutput = Awaited<ReturnType<typeof getClientsRanking>>;

const getClientsRankingRoute: NextApiHandler<TGetClientsRankingOutput> = async (req, res) => {
	const sessionUser = await getCurrentSessionUncached(req.cookies);
	if (!sessionUser) throw new createHttpError.Unauthorized("Você não está autenticado.");

	const input = GetClientsRankingInputSchema.parse({
		periodAfter: (req.query.periodAfter as string | undefined) ?? null,
		periodBefore: (req.query.periodBefore as string | undefined) ?? null,
		saleNatures: req.query.saleNatures ? (req.query.saleNatures as string).split(",") : null,
		excludedSalesIds: req.query.excludedSalesIds ? (req.query.excludedSalesIds as string).split(",") : null,
		totalMin: req.query.totalMin ? Number(req.query.totalMin) : null,
		totalMax: req.query.totalMax ? Number(req.query.totalMax) : null,
		rankingBy: (req.query.rankingBy as "purchases-total-qty" | "purchases-total-value" | undefined) ?? "purchases-total-value",
	});

	const data = await getClientsRanking({ input, session: sessionUser.user });
	return res.status(200).json(data);
};

export default apiHandler({
	GET: getClientsRankingRoute,
});
