import { getAvailableCouponsForClient } from "@/lib/coupons/availability";
import { db } from "@/services/drizzle";
import { cashbackProgramBalances, cashbackProgramTransactions, clients, productClientReferences, products, sales } from "@/services/drizzle/schema";
import { and, count, eq, gt, gte, inArray, isNotNull, isNull, lte, max, min, sum } from "drizzle-orm";
import createHttpError from "http-errors";
import z from "zod";

/**
 * Contexto 360 de um cliente, extraído de `app/api/clients/context/route.ts` para que o painel e o
 * agente de IA (`lib/agent-tools/tools/client-context.ts`) leiam a mesma composição.
 *
 * Nada aqui lê sessão ou request: a organização entra por parâmetro, sempre.
 */


const LAST_PURCHASES_LIMIT = 5;

export const GetClientContextInputSchema = z.object({
	clientId: z.string({
		required_error: "ID do cliente não informado.",
		invalid_type_error: "Tipo inválido para ID do cliente.",
	}),
});
export type TGetClientContextInput = z.infer<typeof GetClientContextInputSchema>;

export async function getClientContext({ input, organizacaoId }: { input: TGetClientContextInput; organizacaoId: string }) {

	const client = await db.query.clients.findFirst({
		where: and(eq(clients.id, input.clientId), eq(clients.organizacaoId, organizacaoId)),
		columns: {
			id: true,
			nome: true,
			telefone: true,
			email: true,
			localizacaoCidade: true,
			localizacaoEstado: true,
			dataNascimento: true,
			dataInsercao: true,
			canalAquisicao: true,
			analiseRFMTitulo: true,
			anotacoes: true,
			comunicacaoPausadaAte: true,
			metadataProdutoMaisCompradoId: true,
			metadataProdutoSugeridoId: true,
		},
		with: {
			tagReferencias: {
				columns: {},
				with: {
					tag: {
						columns: { id: true, titulo: true, cor: true, corForeground: true },
					},
				},
			},
		},
	});
	if (!client) throw new createHttpError.NotFound("Cliente não encontrado.");

	const saleWhere = and(eq(sales.organizacaoId, organizacaoId), eq(sales.clienteId, input.clientId), isNotNull(sales.dataVenda));
	const now = new Date();
	const cashbackExpirationLimit = new Date(now);
	cashbackExpirationLimit.setDate(cashbackExpirationLimit.getDate() + 30);
	const highlightedProductIds = [client.metadataProdutoMaisCompradoId, client.metadataProdutoSugeridoId].filter((productId): productId is string =>
		Boolean(productId),
	);

	const [summaryRows, lastPurchasesRaw, favoriteProductsRaw, cashbackRows, expiringCashbackRows, availableCoupons, highlightedProducts] =
		await Promise.all([
			db
				.select({
					qtde: count(sales.id),
					total: sum(sales.valorTotal),
					primeiraCompra: min(sales.dataVenda),
					ultimaCompra: max(sales.dataVenda),
				})
				.from(sales)
				.where(saleWhere),
			db.query.sales.findMany({
				where: saleWhere,
				columns: { id: true, dataVenda: true, valorTotal: true },
				with: {
					itens: {
						columns: { id: true, quantidade: true, valorVendaTotalLiquido: true },
						with: {
							produto: { columns: { id: true, nome: true, imagemCapaUrl: true } },
						},
					},
				},
				orderBy: (fields, { desc: descOrder }) => [descOrder(fields.dataVenda)],
				limit: LAST_PURCHASES_LIMIT,
			}),
			db.query.productClientReferences.findMany({
				where: and(
					eq(productClientReferences.organizacaoId, organizacaoId),
					eq(productClientReferences.clienteId, input.clientId),
					eq(productClientReferences.janela, "GERAL"),
					isNull(productClientReferences.produtoVarianteId),
				),
				columns: {
					totalComprasQuantidade: true,
					totalComprasValor: true,
					primeiraCompraData: true,
					ultimaCompraData: true,
				},
				with: {
					produto: { columns: { id: true, nome: true, imagemCapaUrl: true, grupo: true } },
				},
				orderBy: (fields, { desc: descOrder }) => [descOrder(fields.totalComprasQuantidade), descOrder(fields.totalComprasValor)],
				limit: 3,
			}),
			db
				.select({
					disponivel: sum(cashbackProgramBalances.saldoValorDisponivel),
					acumulado: sum(cashbackProgramBalances.saldoValorAcumuladoTotal),
					resgatado: sum(cashbackProgramBalances.saldoValorResgatadoTotal),
				})
				.from(cashbackProgramBalances)
				.where(and(eq(cashbackProgramBalances.organizacaoId, organizacaoId), eq(cashbackProgramBalances.clienteId, input.clientId))),
			db
				.select({ valor: sum(cashbackProgramTransactions.valorRestante) })
				.from(cashbackProgramTransactions)
				.where(
					and(
						eq(cashbackProgramTransactions.organizacaoId, organizacaoId),
						eq(cashbackProgramTransactions.clienteId, input.clientId),
						eq(cashbackProgramTransactions.status, "ATIVO"),
						eq(cashbackProgramTransactions.tipo, "ACÚMULO"),
						gt(cashbackProgramTransactions.valorRestante, 0),
						isNotNull(cashbackProgramTransactions.expiracaoData),
						gte(cashbackProgramTransactions.expiracaoData, now),
						lte(cashbackProgramTransactions.expiracaoData, cashbackExpirationLimit),
					),
				),
			getAvailableCouponsForClient({ organizacaoId, clienteId: input.clientId, surface: "POS", now }),
			highlightedProductIds.length > 0
				? db.query.products.findMany({
						where: and(eq(products.organizacaoId, organizacaoId), inArray(products.id, highlightedProductIds)),
						columns: { id: true, nome: true, imagemCapaUrl: true, grupo: true },
					})
				: Promise.resolve([]),
		]);

	const summaryRow = summaryRows[0];
	const qtdeCompras = summaryRow?.qtde ?? 0;
	const valorTotalCompras = summaryRow?.total ? Number(summaryRow.total) : 0;
	const ticketMedio = qtdeCompras > 0 ? valorTotalCompras / qtdeCompras : 0;
	const primeiraCompra = summaryRow?.primeiraCompra ?? null;
	const ultimaCompra = summaryRow?.ultimaCompra ?? null;
	const intervaloMedioDias =
		qtdeCompras > 1 && primeiraCompra && ultimaCompra
			? Math.max(1, Math.round((ultimaCompra.getTime() - primeiraCompra.getTime()) / (qtdeCompras - 1) / 86_400_000))
			: null;
	const proximaCompraEstimada = ultimaCompra && intervaloMedioDias ? new Date(ultimaCompra.getTime() + intervaloMedioDias * 86_400_000) : null;

	const lastPurchases = lastPurchasesRaw.map((sale) => ({
		id: sale.id,
		dataVenda: sale.dataVenda,
		valorTotal: sale.valorTotal,
		itens: sale.itens.map((item) => ({
			id: item.id,
			quantidade: item.quantidade,
			valorTotalLiquido: item.valorVendaTotalLiquido,
			produtoId: item.produto?.id ?? null,
			produtoNome: item.produto?.nome ?? "Produto removido",
			produtoImagemUrl: item.produto?.imagemCapaUrl ?? null,
		})),
	}));

	const productById = new Map(highlightedProducts.map((product) => [product.id, product]));
	const { tagReferencias, metadataProdutoMaisCompradoId, metadataProdutoSugeridoId, ...clientContext } = client;
	const favoriteProducts = favoriteProductsRaw.flatMap((reference) =>
		reference.produto
			? [
					{
						...reference.produto,
						quantidadeComprada: reference.totalComprasQuantidade,
						valorComprado: reference.totalComprasValor,
						primeiraCompraData: reference.primeiraCompraData,
						ultimaCompraData: reference.ultimaCompraData,
					},
				]
			: [],
	);

	return {
		data: {
			cliente: {
				...clientContext,
				tags: tagReferencias.map((reference) => reference.tag),
			},
			cashback: {
				saldoDisponivel: cashbackRows[0]?.disponivel ? Number(cashbackRows[0].disponivel) : 0,
				totalAcumulado: cashbackRows[0]?.acumulado ? Number(cashbackRows[0].acumulado) : 0,
				totalResgatado: cashbackRows[0]?.resgatado ? Number(cashbackRows[0].resgatado) : 0,
				expirandoEm30Dias: expiringCashbackRows[0]?.valor ? Number(expiringCashbackRows[0].valor) : 0,
			},
			historico: {
				qtdeCompras,
				valorTotalCompras,
				ticketMedio,
				primeiraCompraData: primeiraCompra,
				ultimaCompraData: ultimaCompra,
				intervaloMedioDias,
				proximaCompraEstimada,
			},
			oportunidades: {
				produtoMaisComprado: metadataProdutoMaisCompradoId ? (productById.get(metadataProdutoMaisCompradoId) ?? null) : null,
				produtoSugerido: metadataProdutoSugeridoId ? (productById.get(metadataProdutoSugeridoId) ?? null) : null,
			},
			produtosPreferidos: favoriteProducts,
			cuponsDisponiveis: availableCoupons.map((coupon) => ({
				id: coupon.id,
				titulo: coupon.titulo,
				codigo: coupon.codigo,
				beneficioTipo: coupon.beneficioTipo,
				beneficioValor: coupon.beneficioValor,
				vigenciaFim: coupon.atribuicaoVigente?.expiracaoData ?? coupon.vigenciaFim,
			})),
			ultimasCompras: lastPurchases,
		},
		message: "Contexto do cliente carregado com sucesso.",
	};
}
export type TGetClientContextOutput = Awaited<ReturnType<typeof getClientContext>>;
