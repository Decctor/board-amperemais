import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { db } from "@/services/drizzle";
import { partners, saleItems, sales } from "@/services/drizzle/schema";
import { and, count, eq, gte, inArray, isNotNull, lte, notInArray, sql, sum } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const GetPartnersRankingInputSchema = z.object({
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
	rankingBy: z.enum(["sales-total-value", "sales-total-qty", "average-ticket", "margin"]).optional().nullable(),
});

export type TGetPartnersRankingInput = z.infer<typeof GetPartnersRankingInputSchema>;

async function getPartnersRanking({ input, session }: { input: TGetPartnersRankingInput; session: TAuthUserSession["user"] }) {
	const userOrgId = session.organizacaoId;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	console.log("[INFO] [GET PARTNERS RANKING] Starting:", {
		userOrg: userOrgId,
		input,
	});

	const { periodAfter, periodBefore, rankingBy } = input;

	// Build sale conditions
	const saleConditions = [eq(sales.organizacaoId, userOrgId), isNotNull(sales.dataVenda), isNotNull(sales.parceiroId), eq(sales.natureza, "SN01")];
	if (periodAfter) saleConditions.push(gte(sales.dataVenda, periodAfter));
	if (periodBefore) saleConditions.push(lte(sales.dataVenda, periodBefore));

	// Get partners with sales and margin data
	const partnersWithMargin = await db
		.select({
			parceiroId: sales.parceiroId,
			totalRevenue: sum(saleItems.valorVendaTotalLiquido),
			totalCost: sum(saleItems.valorCustoTotal),
			totalSalesQty: count(sales.id),
		})
		.from(sales)
		.innerJoin(saleItems, eq(sales.id, saleItems.vendaId))
		.where(and(...saleConditions, eq(saleItems.organizacaoId, userOrgId)))
		.groupBy(sales.parceiroId);

	// Get partner details
	const partnerIds = partnersWithMargin.map((p) => p.parceiroId).filter((id): id is string => id !== null);
	const partnersDetails = await db.query.partners.findMany({
		where: and(eq(partners.organizacaoId, userOrgId), inArray(partners.id, partnerIds)),
		columns: {
			id: true,
			nome: true,
			avatarUrl: true,
			cpfCnpj: true,
			telefone: true,
		},
	});

	const partnersMap = new Map(partnersDetails.map((partner) => [partner.id, partner]));

	// Calculate metrics for each partner
	const partnersWithMetrics = partnersWithMargin.map((partnerData) => {
		const partnerId = partnerData.parceiroId as string;
		const partnerInfo = partnersMap.get(partnerId);
		const totalRevenue = Number(partnerData.totalRevenue ?? 0);
		const totalCost = Number(partnerData.totalCost ?? 0);
		const totalMargin = totalRevenue - totalCost;
		const marginPercentage = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;
		const totalSalesQty = Number(partnerData.totalSalesQty ?? 0);
		const averageTicket = totalSalesQty > 0 ? totalRevenue / totalSalesQty : 0;

		return {
			parceiroId: partnerId,
			parceiroNome: partnerInfo?.nome || "N/A",
			parceiroAvatarUrl: partnerInfo?.avatarUrl || null,
			parceiroCpfCnpj: partnerInfo?.cpfCnpj || null,
			parceiroTelefone: partnerInfo?.telefone || null,
			totalRevenue,
			totalCost,
			totalMargin,
			marginPercentage,
			totalSalesQty,
			averageTicket,
		};
	});

	// Sort by ranking criteria
	const sortedPartners = partnersWithMetrics.sort((a, b) => {
		if (rankingBy === "sales-total-value") {
			return b.totalRevenue - a.totalRevenue;
		}
		if (rankingBy === "sales-total-qty") {
			return b.totalSalesQty - a.totalSalesQty;
		}
		if (rankingBy === "average-ticket") {
			return b.averageTicket - a.averageTicket;
		}
		if (rankingBy === "margin") {
			return b.totalMargin - a.totalMargin;
		}
		// Default: sales-total-value
		return b.totalRevenue - a.totalRevenue;
	});

	// Get top 10 and add rank
	const top10Partners = sortedPartners.slice(0, 10).map((partner, index) => ({
		rank: index + 1,
		parceiroId: partner.parceiroId,
		parceiroNome: partner.parceiroNome,
		parceiroAvatarUrl: partner.parceiroAvatarUrl,
		parceiroCpfCnpj: partner.parceiroCpfCnpj,
		parceiroTelefone: partner.parceiroTelefone,
		totalRevenue: partner.totalRevenue,
		totalCost: partner.totalCost,
		totalMargin: partner.totalMargin,
		marginPercentage: partner.marginPercentage,
		totalSalesQty: partner.totalSalesQty,
		averageTicket: partner.averageTicket,
	}));

	return {
		data: top10Partners,
	};
}

export type TGetPartnersRankingOutput = Awaited<ReturnType<typeof getPartnersRanking>>;

const getPartnersRankingRoute = async (request: NextRequest) => {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");

	const searchParams = await request.nextUrl.searchParams;
	const input = GetPartnersRankingInputSchema.parse({
		periodAfter: searchParams.get("periodAfter") ?? null,
		periodBefore: searchParams.get("periodBefore") ?? null,
		saleNatures: searchParams.get("saleNatures") ? (searchParams.get("saleNatures") as string).split(",") : null,
		excludedSalesIds: searchParams.get("excludedSalesIds") ? (searchParams.get("excludedSalesIds") as string).split(",") : null,
		totalMin: searchParams.get("totalMin") ? Number(searchParams.get("totalMin")) : null,
		totalMax: searchParams.get("totalMax") ? Number(searchParams.get("totalMax")) : null,
		rankingBy:
			(searchParams.get("rankingBy") as "sales-total-value" | "sales-total-qty" | "average-ticket" | "margin" | undefined) ?? "sales-total-value",
	});

	const data = await getPartnersRanking({ input, session: session.user });
	return NextResponse.json(data);
};

export const GET = appApiHandler({
	GET: getPartnersRankingRoute,
});
