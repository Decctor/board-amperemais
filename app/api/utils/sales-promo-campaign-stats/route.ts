import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { db } from "@/services/drizzle";
import { partners, products, saleItems, sales, sellers } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { and, count, desc, eq, gte, inArray, lte, sql, sum } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

// Input Schema
const GetCampaignStatsInputSchema = z.object({
	campaignId: z.string({ required_error: "ID da campanha não informado.", invalid_type_error: "Tipo não válido para o ID da campanha." }),
});
export type TGetCampaignStatsInput = z.infer<typeof GetCampaignStatsInputSchema>;

// Output Types
export type TCampaignStatsOutput = {
	data: {
		campaign: {
			titulo: string;
			periodo: {
				inicio: string;
				fim: string;
			};
		};
		totalSales: {
			quantidade: number;
			valor: number;
		};
		productsPerformance: Array<{
			produtoId: string;
			produtoNome: string;
			valorBase: number;
			valorPromocional: number;
			quantidadeVendida: number;
			valorVendido: number;
		}>;
		rankingVendedores: Array<{
			vendedorId: string | null;
			vendedorNome: string;
			vendasQtde: number;
			vendasValor: number;
			posicao: number;
		}>;
		rankingParceiros: Array<{
			parceiroId: string | null;
			parceiroNome: string;
			vendasQtde: number;
			vendasValor: number;
			posicao: number;
		}>;
		rankingProdutos: Array<{
			produtoId: string;
			produtoNome: string;
			quantidadeVendida: number;
			valorVendido: number;
			posicao: number;
		}>;
	};
	message: string;
};

async function getCampaignStats({
	input,
	session,
}: { input: TGetCampaignStatsInput; session: TAuthUserSession["user"] }): Promise<TCampaignStatsOutput> {
	// Fetch campaign from utils table
	const campaign = await db.query.utils.findFirst({
		where: (fields, { eq }) => eq(fields.id, input.campaignId),
	});

	if (!campaign) {
		throw new createHttpError.NotFound("Campanha não encontrada.");
	}

	// Validate it's a SALES_PROMO_CAMPAIGN
	if (campaign.identificador !== "SALES_PROMO_CAMPAIGN") {
		throw new createHttpError.BadRequest("O recurso especificado não é uma campanha de promoção de vendas.");
	}

	// Extract campaign data
	const campaignData = campaign.valor as {
		identificador: "SALES_PROMO_CAMPAIGN";
		dados: {
			titulo: string;
			periodoEstatistico: {
				inicio: string;
				fim: string;
			};
			itens: Array<{
				produtoId: string;
				produtoNome: string;
				valorBase: number;
				valorPromocional: number;
			}>;
			rastrearRankingVendedores: boolean;
			rastrearRankingProdutos: boolean;
			rastrearRankingParceiros: boolean;
		};
	};

	const periodStart = dayjs(campaignData.dados.periodoEstatistico.inicio).toDate();
	const periodEnd = dayjs(campaignData.dados.periodoEstatistico.fim).endOf("day").toDate();

	// Calculate total sales
	const totalSalesResult = await db
		.select({
			quantidade: count(sales.id),
			valor: sum(sales.valorTotal),
		})
		.from(sales)
		.where(and(gte(sales.dataVenda, periodStart), lte(sales.dataVenda, periodEnd)));

	const totalSales = {
		quantidade: totalSalesResult[0]?.quantidade || 0,
		valor: totalSalesResult[0]?.valor ? Number(totalSalesResult[0].valor) : 0,
	};

	// Calculate products performance from campaign items
	const productsPerformance = await Promise.all(
		campaignData.dados.itens.map(async (item) => {
			const productSalesResult = await db
				.select({
					quantidadeVendida: sql<number>`COALESCE(SUM(${saleItems.quantidade}), 0)`,
					valorVendido: sql<number>`COALESCE(SUM(${saleItems.valorVendaTotalLiquido}), 0)`,
				})
				.from(saleItems)
				.innerJoin(sales, eq(saleItems.vendaId, sales.id))
				.where(and(eq(saleItems.produtoId, item.produtoId), gte(sales.dataVenda, periodStart), lte(sales.dataVenda, periodEnd)));

			return {
				produtoId: item.produtoId,
				produtoNome: item.produtoNome,
				valorBase: item.valorBase,
				valorPromocional: item.valorPromocional,
				quantidadeVendida: Number(productSalesResult[0]?.quantidadeVendida || 0),
				valorVendido: Number(productSalesResult[0]?.valorVendido || 0),
			};
		}),
	);

	// Calculate seller ranking (top 10)
	const sellerRankingResult = await db
		.select({
			vendedorId: sales.vendedorId,
			vendasQtde: count(sales.id),
			vendasValor: sql<number>`COALESCE(SUM(${sales.valorTotal}), 0)`,
		})
		.from(sales)
		.where(and(gte(sales.dataVenda, periodStart), lte(sales.dataVenda, periodEnd)))
		.groupBy(sales.vendedorId)
		.orderBy(desc(sql`COALESCE(SUM(${sales.valorTotal}), 0)`))
		.limit(5);

	// Get seller IDs and fetch seller details
	const sellerIds = sellerRankingResult.map((s) => s.vendedorId).filter((id): id is string => id !== null);
	const sellersResult =
		sellerIds.length > 0
			? await db.query.sellers.findMany({
					where: inArray(sellers.id, sellerIds),
				})
			: [];

	// Enrich seller ranking with seller details
	const rankingVendedores = sellerRankingResult.map((seller, index) => {
		const sellerDetails = sellersResult.find((s) => s.id === seller.vendedorId);
		return {
			vendedorId: seller.vendedorId || null,
			vendedorNome: sellerDetails?.nome || "N/A",
			vendasQtde: seller.vendasQtde,
			vendasValor: Number(seller.vendasValor),
			posicao: index + 1,
		};
	});

	// Calculate partner ranking (top 10)
	const partnerRankingResult = await db
		.select({
			parceiroId: sales.parceiroId,
			vendasQtde: count(sales.id),
			vendasValor: sql<number>`COALESCE(SUM(${sales.valorTotal}), 0)`,
		})
		.from(sales)
		.where(and(gte(sales.dataVenda, periodStart), lte(sales.dataVenda, periodEnd)))
		.groupBy(sales.parceiroId)
		.orderBy(desc(sql`COALESCE(SUM(${sales.valorTotal}), 0)`))
		.limit(5);

	// Get partner IDs and fetch partner details
	const partnerIds = partnerRankingResult.map((p) => p.parceiroId).filter((id): id is string => id !== null);
	const partnersResult =
		partnerIds.length > 0
			? await db.query.partners.findMany({
					where: inArray(partners.id, partnerIds),
				})
			: [];

	// Enrich partner ranking with partner details
	const rankingParceiros = partnerRankingResult.map((partner, index) => {
		const partnerDetails = partnersResult.find((p) => p.id === partner.parceiroId);
		return {
			parceiroId: partner.parceiroId || null,
			parceiroNome: partnerDetails?.nome || "N/A",
			vendasQtde: partner.vendasQtde,
			vendasValor: Number(partner.vendasValor),
			posicao: index + 1,
		};
	});

	// Calculate product ranking (top 10)
	const productRankingResult = await db
		.select({
			produtoId: saleItems.produtoId,
			produtoNome: products.descricao,
			quantidadeVendida: sql<number>`COALESCE(SUM(${saleItems.quantidade}), 0)`,
			valorVendido: sql<number>`COALESCE(SUM(${saleItems.valorVendaTotalLiquido}), 0)`,
		})
		.from(saleItems)
		.innerJoin(sales, eq(saleItems.vendaId, sales.id))
		.innerJoin(products, eq(saleItems.produtoId, products.id))
		.where(and(gte(sales.dataVenda, periodStart), lte(sales.dataVenda, periodEnd)))
		.groupBy(saleItems.produtoId, products.descricao)
		.orderBy(desc(sql`COALESCE(SUM(${saleItems.valorVendaTotalLiquido}), 0)`))
		.limit(5);

	const rankingProdutos = productRankingResult.map((product, index) => ({
		produtoId: product.produtoId,
		produtoNome: product.produtoNome || "N/A",
		quantidadeVendida: Number(product.quantidadeVendida),
		valorVendido: Number(product.valorVendido),
		posicao: index + 1,
	}));

	return {
		data: {
			campaign: {
				titulo: campaignData.dados.titulo,
				periodo: {
					inicio: campaignData.dados.periodoEstatistico.inicio,
					fim: campaignData.dados.periodoEstatistico.fim,
				},
			},
			totalSales,
			productsPerformance,
			rankingVendedores,
			rankingParceiros,
			rankingProdutos,
		},
		message: "Estatísticas da campanha obtidas com sucesso.",
	};
}

const getCampaignStatsRoute = async (request: NextRequest) => {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");

	const searchParams = request.nextUrl.searchParams;
	const input = GetCampaignStatsInputSchema.parse({
		campaignId: searchParams.get("campaignId") ?? undefined,
	});

	const result = await getCampaignStats({ input, session: session.user });
	return NextResponse.json(result, { status: 200 });
};

export const GET = appApiHandler({
	GET: getCampaignStatsRoute,
});
