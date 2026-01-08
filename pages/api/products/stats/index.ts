import { apiHandler } from "@/lib/api";
import { getCurrentSessionUncached } from "@/lib/authentication/pages-session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { ProductSchema } from "@/schemas/products";
import { db } from "@/services/drizzle";
import { clients, partners, products, saleItems, sales, sellers } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { and, count, countDistinct, desc, eq, gte, inArray, isNotNull, lte, ne, sql, sum } from "drizzle-orm";
import createHttpError from "http-errors";
import type { NextApiHandler } from "next";
import { z } from "zod";

const GetProductStatsInputSchema = z.object({
	productId: z.string({
		required_error: "ID do produto não informado.",
		invalid_type_error: "Tipo inválido para ID do produto.",
	}),
	periodAfter: z
		.string({
			required_error: "Período não informado.",
			invalid_type_error: "Tipo inválido para período.",
		})
		.optional()
		.nullable(),
	periodBefore: z
		.string({
			required_error: "Período não informado.",
			invalid_type_error: "Tipo inválido para período.",
		})
		.optional()
		.nullable(),
	sellerId: z
		.string({
			required_error: "ID do vendedor não informado.",
			invalid_type_error: "Tipo inválido para ID do vendedor.",
		})
		.optional()
		.nullable(),
	partnerId: z
		.string({
			required_error: "ID do parceiro não informado.",
			invalid_type_error: "Tipo inválido para ID do parceiro.",
		})
		.optional()
		.nullable(),
	saleNatures: z.array(z.string()).optional().nullable(),
});
export type TGetProductStatsInput = z.infer<typeof GetProductStatsInputSchema>;

type GetProductStatsParams = {
	user: TAuthUserSession["user"];
	input: TGetProductStatsInput;
};

async function getProductStats({ user, input }: GetProductStatsParams) {
	const userOrgId = user.organizacaoId;
	if (!userOrgId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para acessar esse recurso.");

	const product = await db.query.products.findFirst({
		where: and(eq(products.id, input.productId), eq(products.organizacaoId, userOrgId)),
	});
	if (!product) throw new createHttpError.NotFound("Produto não encontrado.");

	const periodAfterDate = input.periodAfter ? new Date(input.periodAfter) : undefined;
	const periodBeforeDate = input.periodBefore ? new Date(input.periodBefore) : undefined;

	// Build where conditions for saleItems and sales
	const saleItemWhereConditions = [eq(saleItems.organizacaoId, userOrgId), eq(saleItems.produtoId, input.productId)] as const;
	const saleWhereConditions = [eq(sales.organizacaoId, userOrgId), isNotNull(sales.dataVenda)] as const;

	const saleWhere = and(
		...saleWhereConditions,
		periodAfterDate ? gte(sales.dataVenda, periodAfterDate) : undefined,
		periodBeforeDate ? lte(sales.dataVenda, periodBeforeDate) : undefined,
		input.sellerId ? eq(sales.vendedorId, input.sellerId) : undefined,
		input.partnerId ? eq(sales.parceiroId, input.partnerId) : undefined,
		input.saleNatures && input.saleNatures.length > 0 ? inArray(sales.natureza, input.saleNatures) : undefined,
	);

	const saleItemWhere = and(...saleItemWhereConditions, inArray(saleItems.vendaId, db.select({ id: sales.id }).from(sales).where(saleWhere)));

	const allTimeStatsResult = await db
		.select({
			quantidadeTotal: sum(saleItems.quantidade),
			vendasQtdeTotal: countDistinct(saleItems.vendaId),
			faturamentoBrutoTotal: sum(saleItems.valorVendaTotalBruto),
			faturamentoLiquidoTotal: sum(saleItems.valorVendaTotalLiquido),
		})
		.from(saleItems)
		.innerJoin(sales, eq(saleItems.vendaId, sales.id))
		.where(
			and(
				eq(saleItems.organizacaoId, userOrgId),
				eq(sales.organizacaoId, userOrgId),
				...saleWhereConditions,
				eq(saleItems.produtoId, input.productId),
				input.sellerId ? eq(sales.vendedorId, input.sellerId) : undefined,
				input.partnerId ? eq(sales.parceiroId, input.partnerId) : undefined,
				input.saleNatures && input.saleNatures.length > 0 ? inArray(sales.natureza, input.saleNatures) : undefined,
			),
		);
	// Quantitative: Basic metrics
	const totalStatsResult = await db
		.select({
			quantidadeTotal: sum(saleItems.quantidade),
			vendasCount: countDistinct(saleItems.vendaId),
			faturamentoBrutoTotal: sum(saleItems.valorVendaTotalBruto),
			faturamentoLiquidoTotal: sum(saleItems.valorVendaTotalLiquido),
			custoTotal: sum(saleItems.valorCustoTotal),
			descontoTotal: sum(saleItems.valorTotalDesconto),
		})
		.from(saleItems)
		.innerJoin(sales, eq(saleItems.vendaId, sales.id))
		.where(and(eq(saleItems.organizacaoId, userOrgId), eq(sales.organizacaoId, userOrgId), saleItemWhere));

	const totalStats = totalStatsResult[0];
	const quantidadeTotal = totalStats?.quantidadeTotal ? Number(totalStats.quantidadeTotal) : 0;
	const vendasCount = Number(totalStats?.vendasCount ?? 0);
	const faturamentoBrutoTotal = totalStats?.faturamentoBrutoTotal ? Number(totalStats.faturamentoBrutoTotal) : 0;
	const faturamentoLiquidoTotal = totalStats?.faturamentoLiquidoTotal ? Number(totalStats.faturamentoLiquidoTotal) : 0;
	const custoTotal = totalStats?.custoTotal ? Number(totalStats.custoTotal) : 0;
	const descontoTotal = totalStats?.descontoTotal ? Number(totalStats.descontoTotal) : 0;

	const margemBrutaTotal = faturamentoLiquidoTotal - custoTotal;
	const margemBrutaPercentual = faturamentoLiquidoTotal > 0 ? (margemBrutaTotal / faturamentoLiquidoTotal) * 100 : 0;
	const valorMedioPorUnidade = quantidadeTotal > 0 ? faturamentoLiquidoTotal / quantidadeTotal : 0;
	const ticketMedio = vendasCount > 0 ? faturamentoLiquidoTotal / vendasCount : 0;
	const percentualDescontoMedio = faturamentoBrutoTotal > 0 ? (descontoTotal / faturamentoBrutoTotal) * 100 : 0;

	// First and last sale dates
	const firstSaleResult = await db
		.select({ data: sales.dataVenda })
		.from(saleItems)
		.innerJoin(sales, eq(saleItems.vendaId, sales.id))
		.where(and(eq(saleItems.organizacaoId, userOrgId), eq(sales.organizacaoId, userOrgId), eq(saleItems.produtoId, input.productId)))
		.orderBy(sql`${sales.dataVenda} asc`)
		.limit(1);
	const lastSaleResult = await db
		.select({ data: sales.dataVenda })
		.from(saleItems)
		.innerJoin(sales, eq(saleItems.vendaId, sales.id))
		.where(and(eq(saleItems.organizacaoId, userOrgId), eq(sales.organizacaoId, userOrgId), eq(saleItems.produtoId, input.productId)))
		.orderBy(sql`${sales.dataVenda} desc`)
		.limit(1);

	const firstSaleDate = firstSaleResult[0]?.data ?? null;
	const lastSaleDate = lastSaleResult[0]?.data ?? null;

	const daysDiff = firstSaleDate && lastSaleDate ? dayjs(lastSaleDate).diff(dayjs(firstSaleDate), "days") + 1 : 1;
	const faturamentoPorDia = faturamentoLiquidoTotal / daysDiff;

	// Unique clients count
	const uniqueClientsResult = await db
		.select({ count: countDistinct(saleItems.clienteId) })
		.from(saleItems)
		.innerJoin(sales, eq(saleItems.vendaId, sales.id))
		.where(and(eq(saleItems.organizacaoId, userOrgId), eq(sales.organizacaoId, userOrgId), saleItemWhere));
	const clientesUnicos = Number(uniqueClientsResult[0]?.count ?? 0);

	// Seasonality: by day of month
	const dayExpr = sql<number>`extract(day from ${sales.dataVenda})`;
	const byDayOfMonthRaw = await db
		.select({
			dia: dayExpr,
			quantidade: sum(saleItems.quantidade),
			total: sum(saleItems.valorVendaTotalLiquido),
		})
		.from(saleItems)
		.innerJoin(sales, eq(saleItems.vendaId, sales.id))
		.where(and(eq(saleItems.organizacaoId, userOrgId), eq(sales.organizacaoId, userOrgId), saleItemWhere))
		.groupBy(dayExpr)
		.orderBy(dayExpr);

	// Seasonality: by month
	const monthExpr = sql<number>`extract(month from ${sales.dataVenda})`;
	const byMonthRaw = await db
		.select({
			mes: monthExpr,
			quantidade: sum(saleItems.quantidade),
			total: sum(saleItems.valorVendaTotalLiquido),
		})
		.from(saleItems)
		.innerJoin(sales, eq(saleItems.vendaId, sales.id))
		.where(and(eq(saleItems.organizacaoId, userOrgId), eq(sales.organizacaoId, userOrgId), saleItemWhere))
		.groupBy(monthExpr)
		.orderBy(monthExpr);

	// Seasonality: by week day
	const weekDayExpr = sql<number>`extract(dow from ${sales.dataVenda})`;
	const byWeekDayRaw = await db
		.select({
			diaSemana: weekDayExpr,
			quantidade: sum(saleItems.quantidade),
			total: sum(saleItems.valorVendaTotalLiquido),
		})
		.from(saleItems)
		.innerJoin(sales, eq(saleItems.vendaId, sales.id))
		.where(and(eq(saleItems.organizacaoId, userOrgId), eq(sales.organizacaoId, userOrgId), saleItemWhere))
		.groupBy(weekDayExpr)
		.orderBy(weekDayExpr);

	// Top 10 clients
	const byClientTop10Raw = await db
		.select({
			clienteId: saleItems.clienteId,
			clienteNome: clients.nome,
			quantidade: sum(saleItems.quantidade),
			total: sum(saleItems.valorVendaTotalLiquido),
		})
		.from(saleItems)
		.innerJoin(sales, eq(saleItems.vendaId, sales.id))
		.leftJoin(clients, eq(saleItems.clienteId, clients.id))
		.where(and(eq(saleItems.organizacaoId, userOrgId), eq(sales.organizacaoId, userOrgId), eq(clients.organizacaoId, userOrgId), saleItemWhere))
		.groupBy(saleItems.clienteId, clients.nome)
		.orderBy(desc(sql`sum(${saleItems.valorVendaTotalLiquido})`))
		.limit(10);

	// Top 10 sellers
	const bySellerTop10Raw = await db
		.select({
			vendedorId: sales.vendedorId,
			vendedorNome: sellers.nome,
			quantidade: sum(saleItems.quantidade),
			total: sum(saleItems.valorVendaTotalLiquido),
		})
		.from(saleItems)
		.innerJoin(sales, eq(saleItems.vendaId, sales.id))
		.leftJoin(sellers, eq(sales.vendedorId, sellers.id))
		.where(and(eq(saleItems.organizacaoId, userOrgId), eq(sales.organizacaoId, userOrgId), eq(sellers.organizacaoId, userOrgId), saleItemWhere))
		.groupBy(sales.vendedorId, sellers.nome)
		.orderBy(desc(sql`sum(${saleItems.valorVendaTotalLiquido})`))
		.limit(10);

	// Top 10 partners
	const byPartnerTop10Raw = await db
		.select({
			parceiroId: sales.parceiroId,
			parceiroNome: partners.nome,
			quantidade: sum(saleItems.quantidade),
			total: sum(saleItems.valorVendaTotalLiquido),
		})
		.from(saleItems)
		.innerJoin(sales, eq(saleItems.vendaId, sales.id))
		.leftJoin(partners, eq(sales.parceiroId, partners.id))
		.where(and(eq(saleItems.organizacaoId, userOrgId), eq(sales.organizacaoId, userOrgId), eq(partners.organizacaoId, userOrgId), saleItemWhere))
		.groupBy(sales.parceiroId, partners.nome)
		.orderBy(desc(sql`sum(${saleItems.valorVendaTotalLiquido})`))
		.limit(10);

	// Related products (basket analysis) - products sold together
	const relatedProductsRaw = await db
		.select({
			produtoId: saleItems.produtoId,
			produtoDescricao: products.descricao,
			produtoCodigo: products.codigo,
			produtoGrupo: products.grupo,
			frequencia: count(saleItems.id),
			quantidade: sum(saleItems.quantidade),
			total: sum(saleItems.valorVendaTotalLiquido),
		})
		.from(saleItems)
		.innerJoin(
			db
				.select({ vendaId: saleItems.vendaId })
				.from(saleItems)
				.innerJoin(sales, eq(saleItems.vendaId, sales.id))
				.where(and(eq(saleItems.organizacaoId, userOrgId), eq(sales.organizacaoId, userOrgId), saleItemWhere))
				.as("vendas_com_produto"),
			sql`${saleItems.vendaId} = vendas_com_produto.venda_id`,
		)
		.leftJoin(products, eq(saleItems.produtoId, products.id))
		.where(and(eq(saleItems.organizacaoId, userOrgId), eq(products.organizacaoId, userOrgId), ne(saleItems.produtoId, input.productId)))
		.groupBy(saleItems.produtoId, products.descricao, products.codigo, products.grupo)
		.orderBy(desc(sql`count(${saleItems.id})`))
		.limit(10);

	// Margin analysis by seller
	const marginBySellerRaw = await db
		.select({
			vendedorId: sales.vendedorId,
			vendedorNome: sellers.nome,
			faturamentoLiquido: sum(saleItems.valorVendaTotalLiquido),
			custo: sum(saleItems.valorCustoTotal),
		})
		.from(saleItems)
		.innerJoin(sales, eq(saleItems.vendaId, sales.id))
		.leftJoin(sellers, eq(sales.vendedorId, sellers.id))
		.where(and(eq(saleItems.organizacaoId, userOrgId), eq(sales.organizacaoId, userOrgId), eq(sellers.organizacaoId, userOrgId), saleItemWhere))
		.groupBy(sales.vendedorId, sellers.nome)
		.orderBy(desc(sql`sum(${saleItems.valorVendaTotalLiquido}) - sum(${saleItems.valorCustoTotal})`))
		.limit(10);

	// Margin analysis by client
	const marginByClientRaw = await db
		.select({
			clienteId: saleItems.clienteId,
			clienteNome: clients.nome,
			faturamentoLiquido: sum(saleItems.valorVendaTotalLiquido),
			custo: sum(saleItems.valorCustoTotal),
		})
		.from(saleItems)
		.innerJoin(sales, eq(saleItems.vendaId, sales.id))
		.leftJoin(clients, eq(saleItems.clienteId, clients.id))
		.where(and(eq(saleItems.organizacaoId, userOrgId), eq(sales.organizacaoId, userOrgId), eq(clients.organizacaoId, userOrgId), saleItemWhere))
		.groupBy(saleItems.clienteId, clients.nome)
		.orderBy(desc(sql`sum(${saleItems.valorVendaTotalLiquido}) - sum(${saleItems.valorCustoTotal})`))
		.limit(10);

	// Margin analysis by partner
	const marginByPartnerRaw = await db
		.select({
			parceiroId: sales.parceiroId,
			parceiroNome: partners.nome,
			faturamentoLiquido: sum(saleItems.valorVendaTotalLiquido),
			custo: sum(saleItems.valorCustoTotal),
		})
		.from(saleItems)
		.innerJoin(sales, eq(saleItems.vendaId, sales.id))
		.leftJoin(partners, eq(sales.parceiroId, partners.id))
		.where(and(eq(saleItems.organizacaoId, userOrgId), eq(sales.organizacaoId, userOrgId), eq(partners.organizacaoId, userOrgId), saleItemWhere))
		.groupBy(sales.parceiroId, partners.nome)
		.orderBy(desc(sql`sum(${saleItems.valorVendaTotalLiquido}) - sum(${saleItems.valorCustoTotal})`))
		.limit(10);

	// Margin evolution over time (monthly)
	const marginByMonthRaw = await db
		.select({
			mes: monthExpr,
			faturamentoLiquido: sum(saleItems.valorVendaTotalLiquido),
			custo: sum(saleItems.valorCustoTotal),
		})
		.from(saleItems)
		.innerJoin(sales, eq(saleItems.vendaId, sales.id))
		.where(and(eq(saleItems.organizacaoId, userOrgId), eq(sales.organizacaoId, userOrgId), saleItemWhere))
		.groupBy(monthExpr)
		.orderBy(monthExpr);

	return {
		data: {
			produto: {
				id: product.id,
				descricao: product.descricao,
				codigo: product.codigo,
				unidade: product.unidade,
				ncm: product.ncm,
				tipo: product.tipo,
				grupo: product.grupo,
				quantidade: product.quantidade,
				precoVenda: product.precoVenda,
			},
			geral: {
				quantidadeTotal: allTimeStatsResult[0]?.quantidadeTotal ? Number(allTimeStatsResult[0].quantidadeTotal) : 0,
				vendasQtdeTotal: allTimeStatsResult[0]?.vendasQtdeTotal ? Number(allTimeStatsResult[0].vendasQtdeTotal) : 0,
				faturamentoBrutoTotal: allTimeStatsResult[0]?.faturamentoBrutoTotal ? Number(allTimeStatsResult[0].faturamentoBrutoTotal) : 0,
				faturamentoLiquidoTotal: allTimeStatsResult[0]?.faturamentoLiquidoTotal ? Number(allTimeStatsResult[0].faturamentoLiquidoTotal) : 0,
			},
			dataPrimeiraVenda: firstSaleDate,
			dataUltimaVenda: lastSaleDate,
			quantidadeTotal,
			vendasQtdeTotal: vendasCount,
			clientesUnicos,
			faturamentoBrutoTotal,
			faturamentoLiquidoTotal,
			custoTotal,
			margemBrutaTotal,
			margemBrutaPercentual,
			valorMedioPorUnidade,
			ticketMedio,
			descontoTotal,
			percentualDescontoMedio,
			faturamentoPorDia,
			resultadosAgrupados: {
				dia: byDayOfMonthRaw.map((row) => ({
					dia: Number(row.dia),
					quantidade: row.quantidade ? Number(row.quantidade) : 0,
					total: row.total ? Number(row.total) : 0,
				})),
				mes: byMonthRaw.map((row) => ({
					mes: Number(row.mes),
					quantidade: row.quantidade ? Number(row.quantidade) : 0,
					total: row.total ? Number(row.total) : 0,
				})),
				diaSemana: byWeekDayRaw.map((row) => ({
					diaSemana: Number(row.diaSemana),
					quantidade: row.quantidade ? Number(row.quantidade) : 0,
					total: row.total ? Number(row.total) : 0,
				})),
				cliente: byClientTop10Raw.map((row) => ({
					clienteId: row.clienteId,
					clienteNome: row.clienteNome ?? null,
					quantidade: row.quantidade ? Number(row.quantidade) : 0,
					total: row.total ? Number(row.total) : 0,
				})),
				vendedor: bySellerTop10Raw.map((row) => ({
					vendedorId: row.vendedorId,
					vendedorNome: row.vendedorNome ?? null,
					quantidade: row.quantidade ? Number(row.quantidade) : 0,
					total: row.total ? Number(row.total) : 0,
				})),
				parceiro: byPartnerTop10Raw.map((row) => ({
					parceiroId: row.parceiroId,
					parceiroNome: row.parceiroNome ?? null,
					quantidade: row.quantidade ? Number(row.quantidade) : 0,
					total: row.total ? Number(row.total) : 0,
				})),
				produtosRelacionados: relatedProductsRaw.map((row) => ({
					produtoId: row.produtoId,
					produtoDescricao: row.produtoDescricao ?? "",
					produtoCodigo: row.produtoCodigo ?? "",
					produtoGrupo: row.produtoGrupo ?? null,
					frequencia: Number(row.frequencia ?? 0),
					quantidade: row.quantidade ? Number(row.quantidade) : 0,
					total: row.total ? Number(row.total) : 0,
				})),
			},
			analiseMargem: {
				porVendedor: marginBySellerRaw.map((row) => ({
					vendedorId: row.vendedorId,
					vendedorNome: row.vendedorNome ?? null,
					faturamentoLiquido: row.faturamentoLiquido ? Number(row.faturamentoLiquido) : 0,
					custo: row.custo ? Number(row.custo) : 0,
					margem: row.faturamentoLiquido && row.custo ? Number(row.faturamentoLiquido) - Number(row.custo) : 0,
					margemPercentual:
						row.faturamentoLiquido && Number(row.faturamentoLiquido) > 0
							? ((Number(row.faturamentoLiquido) - Number(row.custo ?? 0)) / Number(row.faturamentoLiquido)) * 100
							: 0,
				})),
				porCliente: marginByClientRaw.map((row) => ({
					clienteId: row.clienteId,
					clienteNome: row.clienteNome ?? null,
					faturamentoLiquido: row.faturamentoLiquido ? Number(row.faturamentoLiquido) : 0,
					custo: row.custo ? Number(row.custo) : 0,
					margem: row.faturamentoLiquido && row.custo ? Number(row.faturamentoLiquido) - Number(row.custo) : 0,
					margemPercentual:
						row.faturamentoLiquido && Number(row.faturamentoLiquido) > 0
							? ((Number(row.faturamentoLiquido) - Number(row.custo ?? 0)) / Number(row.faturamentoLiquido)) * 100
							: 0,
				})),
				porParceiro: marginByPartnerRaw.map((row) => ({
					parceiroId: row.parceiroId,
					parceiroNome: row.parceiroNome ?? null,
					faturamentoLiquido: row.faturamentoLiquido ? Number(row.faturamentoLiquido) : 0,
					custo: row.custo ? Number(row.custo) : 0,
					margem: row.faturamentoLiquido && row.custo ? Number(row.faturamentoLiquido) - Number(row.custo) : 0,
					margemPercentual:
						row.faturamentoLiquido && Number(row.faturamentoLiquido) > 0
							? ((Number(row.faturamentoLiquido) - Number(row.custo ?? 0)) / Number(row.faturamentoLiquido)) * 100
							: 0,
				})),
				evolucaoMensal: marginByMonthRaw.map((row) => ({
					mes: Number(row.mes),
					faturamentoLiquido: row.faturamentoLiquido ? Number(row.faturamentoLiquido) : 0,
					custo: row.custo ? Number(row.custo) : 0,
					margem: row.faturamentoLiquido && row.custo ? Number(row.faturamentoLiquido) - Number(row.custo) : 0,
					margemPercentual:
						row.faturamentoLiquido && Number(row.faturamentoLiquido) > 0
							? ((Number(row.faturamentoLiquido) - Number(row.custo ?? 0)) / Number(row.faturamentoLiquido)) * 100
							: 0,
				})),
			},
		},
	};
}

export type TGetProductStatsOutput = Awaited<ReturnType<typeof getProductStats>>;

const getProductStatsHandler: NextApiHandler<TGetProductStatsOutput> = async (req, res) => {
	const sessionUser = await getCurrentSessionUncached(req.cookies);
	if (!sessionUser) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const input = GetProductStatsInputSchema.parse({
		productId: req.query.productId as string,
		periodAfter: (req.query.periodAfter as string | undefined) ?? null,
		periodBefore: (req.query.periodBefore as string | undefined) ?? null,
		sellerId: (req.query.sellerId as string | undefined) ?? null,
		partnerId: (req.query.partnerId as string | undefined) ?? null,
		saleNatures: req.query.saleNatures ? JSON.parse(req.query.saleNatures as string) : null,
	});
	const data = await getProductStats({ user: sessionUser.user, input });
	return res.status(200).json(data);
};

export default apiHandler({ GET: getProductStatsHandler });
