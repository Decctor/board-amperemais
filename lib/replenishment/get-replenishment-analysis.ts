import { assignAbcClasses, type TProductAbcClass } from "@/lib/products/portfolio-analysis";
import type { TReplenishmentSettings } from "@/schemas/replenishment";
import type { TReplenishmentStatusEnum, TStockPositionSourceEnum } from "@/schemas/enums";
import { db } from "@/services/drizzle";
import {
	productReplenishmentSettings,
	products,
	purchaseItems,
	purchases,
	saleItems,
	sales,
	stockPositionImportItems,
	stockPositionImports,
	supplierProductMappings,
	suppliers,
} from "@/services/drizzle/schema";
import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { buildDemandProfile, calculateCoverageDays } from "./demand";
import {
	calculatePotentialLoss,
	calculatePriorityIndex,
	classifyReplenishmentStatus,
	isReplenishmentStatusActionable,
	projectStockoutDate,
} from "./classify";
import { buildReplenishmentPlan } from "./policy";
import type { TDemandBucket, TReplenishmentItem, TReplenishmentPolicy, TReplenishmentSummary } from "./types";

const BUCKET_DAYS = 30;

// Acima deste número de produtos filtrados paramos de enviar a lista de IDs nas agregações e
// passamos a agregar a organização inteira, filtrando na memória. Uma cláusula IN com dezenas de
// milhares de parâmetros custa mais para o Postgres planejar do que a varredura que ela evita.
const MAX_PRODUCT_IDS_IN_QUERY = 1000;

// Compras já confirmadas mas ainda não recebidas por completo: a mercadoria está a caminho e conta
// contra a próxima sugestão. Ignorar isso é a causa número um de compra duplicada.
const IN_TRANSIT_PURCHASE_STATUSES = ["CONFIRMADA", "RECEBIMENTO_PARCIAL"] as const;

export type TReplenishmentOrderByField = "prioridade" | "cobertura" | "perdaPotencial" | "valorSugestao" | "nome" | "codigo" | "estoque" | "demanda";

export type TGetReplenishmentAnalysisInput = {
	search: string;
	groups: string[];
	productIds: string[];
	supplierIds: string[];
	status: TReplenishmentStatusEnum[];
	abcClasses: TProductAbcClass[];
	coberturaMaximaDias: number | null;
	coberturaMinimaDias: number | null;
	apenasSugestoes: boolean;
	incluirSobressalentes: boolean;
	incluirDescontinuados: boolean;
	orderByField: TReplenishmentOrderByField;
	orderByDirection: "asc" | "desc";
	page: number;
	// null desliga a paginação: é o modo usado pela exportação, que precisa de todas as linhas.
	pageSize: number | null;
};

type ProductRow = {
	id: string;
	codigo: string;
	nome: string;
	unidade: string;
	grupo: string;
	imagemCapaUrl: string | null;
	quantidade: number | null;
	precoVenda: number | null;
	precoCusto: number | null;
};

function buildProductScopeCondition(productIds: string[]) {
	if (productIds.length === 0 || productIds.length > MAX_PRODUCT_IDS_IN_QUERY) return undefined;
	return productIds;
}

// Vendas por produto, fatiadas em janelas de 30 dias contadas para trás a partir de hoje. O índice
// do balde é o que permite ponderar o mês corrente acima dos anteriores.
async function fetchDemandBuckets({
	organizationId,
	windowStart,
	productIds,
}: {
	organizationId: string;
	windowStart: Date;
	productIds: string[] | undefined;
}) {
	// A expressão do balde não pode carregar nenhum parâmetro: ela aparece no SELECT e no GROUP BY, e
	// o Postgres trata dois placeholders em posições diferentes como expressões distintas — o que faria
	// a consulta falhar com "column must appear in the GROUP BY clause". Por isso LOCALTIMESTAMP e o
	// tamanho do balde entram como literais, e o recorte da janela fica só no WHERE.
	const bucketExpression = sql<number>`FLOOR(EXTRACT(EPOCH FROM (LOCALTIMESTAMP - ${sales.dataVenda})) / 86400 / ${sql.raw(String(BUCKET_DAYS))})`;

	const conditions = [
		eq(saleItems.organizacaoId, organizationId),
		eq(sales.organizacaoId, organizationId),
		eq(sales.statusVenda, "CONFIRMADA"),
		gte(sales.dataVenda, windowStart),
	];
	if (productIds) conditions.push(inArray(saleItems.produtoId, productIds));

	return db
		.select({
			produtoId: saleItems.produtoId,
			bucket: bucketExpression,
			quantidade: sql<number>`COALESCE(SUM(${saleItems.quantidade}), 0)`,
			receita: sql<number>`COALESCE(SUM(${saleItems.valorVendaTotalLiquido}), 0)`,
			custo: sql<number>`COALESCE(SUM(${saleItems.valorCustoTotal}), 0)`,
			vendas: sql<number>`COUNT(DISTINCT ${saleItems.vendaId})`,
		})
		.from(saleItems)
		.innerJoin(sales, eq(saleItems.vendaId, sales.id))
		.where(and(...conditions))
		.groupBy(saleItems.produtoId, bucketExpression);
}

// Dias em que o produto esteve zerado dentro da janela, reconstruídos a partir do saldo posterior
// de cada movimentação. LEAD dá o instante em que aquele saldo deixou de valer; a soma dos trechos
// com saldo <= 0 é o tempo em que não havia o que vender. Organizações cujo estoque é mantido fora
// do RecompraCRM simplesmente não têm movimentações e caem no caso "nenhuma ruptura conhecida".
async function fetchStockoutDaysByProduct({
	organizationId,
	windowStart,
	referenceDate,
}: {
	organizationId: string;
	windowStart: Date;
	referenceDate: Date;
}) {
	const rows = await db.execute<{ produto_id: string; dias_sem_estoque: string | number | null }>(sql`
		WITH movimentos AS (
			SELECT
				produto_id,
				data_insercao AS momento,
				COALESCE(saldo_posterior, 0) AS saldo,
				LEAD(data_insercao) OVER (PARTITION BY produto_id ORDER BY data_insercao) AS proximo
			FROM ampmais_product_stock_transactions
			WHERE organizacao_id = ${organizationId}
				AND data_insercao >= ${windowStart}
		)
		SELECT
			produto_id,
			COALESCE(SUM(
				GREATEST(
					EXTRACT(EPOCH FROM (
						LEAST(COALESCE(proximo, CAST(${referenceDate} AS timestamp)), CAST(${referenceDate} AS timestamp))
						- GREATEST(momento, CAST(${windowStart} AS timestamp))
					)) / 86400,
					0
				)
			) FILTER (WHERE saldo <= 0), 0) AS dias_sem_estoque
		FROM movimentos
		GROUP BY produto_id
	`);

	const map = new Map<string, number>();
	for (const row of rows) {
		map.set(row.produto_id, Number(row.dias_sem_estoque ?? 0) || 0);
	}
	return map;
}

async function fetchInTransitByProduct({ organizationId, productIds }: { organizationId: string; productIds: string[] | undefined }) {
	const conditions = [eq(purchaseItems.organizacaoId, organizationId), inArray(purchases.status, [...IN_TRANSIT_PURCHASE_STATUSES])];
	if (productIds) conditions.push(inArray(purchaseItems.produtoId, productIds));

	const rows = await db
		.select({
			produtoId: purchaseItems.produtoId,
			quantidade: sql<number>`COALESCE(SUM(${purchaseItems.quantidade}), 0)`,
		})
		.from(purchaseItems)
		.innerJoin(purchases, eq(purchaseItems.compraId, purchases.id))
		.where(and(...conditions))
		.groupBy(purchaseItems.produtoId);

	const map = new Map<string, number>();
	for (const row of rows) map.set(row.produtoId, Number(row.quantidade) || 0);
	return map;
}

// Preço de compra praticado: média ponderada pela quantidade sobre as compras recebidas da janela,
// mais o preço e a data da última entrada. A média mostra o patamar; a última entrada mostra para
// onde o fornecedor está andando — e é a que a compradora usa para dizer "isso subiu".
async function fetchPurchasePricingByProduct({
	organizationId,
	windowStart,
	productIds,
}: {
	organizationId: string;
	windowStart: Date;
	productIds: string[] | undefined;
}) {
	const conditions = [
		eq(purchaseItems.organizacaoId, organizationId),
		inArray(purchases.status, ["RECEBIDA", "RECEBIMENTO_PARCIAL"]),
		gte(purchases.dataInsercao, windowStart),
	];
	if (productIds) conditions.push(inArray(purchaseItems.produtoId, productIds));

	const rows = await db
		.select({
			produtoId: purchaseItems.produtoId,
			quantidadeTotal: sql<number>`COALESCE(SUM(${purchaseItems.quantidade}), 0)`,
			custoTotal: sql<number>`COALESCE(SUM(COALESCE(${purchaseItems.valorTotalCusto}, ${purchaseItems.valorTotalLiquido}, ${purchaseItems.valorTotalBruto}, 0)), 0)`,
			dataUltimaCompra: sql<Date | null>`MAX(${purchases.dataInsercao})`,
		})
		.from(purchaseItems)
		.innerJoin(purchases, eq(purchaseItems.compraId, purchases.id))
		.where(and(...conditions))
		.groupBy(purchaseItems.produtoId);

	const map = new Map<string, { precoMedioCompra: number | null; dataUltimaCompra: Date | null }>();
	for (const row of rows) {
		const quantidade = Number(row.quantidadeTotal) || 0;
		const custo = Number(row.custoTotal) || 0;
		map.set(row.produtoId, {
			precoMedioCompra: quantidade > 0 ? custo / quantidade : null,
			dataUltimaCompra: row.dataUltimaCompra ? new Date(row.dataUltimaCompra) : null,
		});
	}
	return map;
}

// Último preço unitário efetivamente pago, por produto. Separado da média porque a query da média
// agrega e aqui interessa a linha mais recente.
async function fetchLastPurchasePriceByProduct({ organizationId, productIds }: { organizationId: string; productIds: string[] | undefined }) {
	const rows = await db.execute<{ produto_id: string; valor_unitario: string | number | null }>(sql`
		SELECT DISTINCT ON (pi.produto_id)
			pi.produto_id,
			COALESCE(pi.valor_unitario_custo, pi.valor_unitario_liquido, pi.valor_unitario_bruto) AS valor_unitario
		FROM ampmais_purchase_items pi
		JOIN ampmais_purchases p ON p.id = pi.compra_id
		WHERE pi.organizacao_id = ${organizationId}
			AND p.status IN ('RECEBIDA', 'RECEBIMENTO_PARCIAL')
			${
				productIds
					? sql`AND pi.produto_id IN (${sql.join(
							productIds.map((id) => sql`${id}`),
							sql`, `,
						)})`
					: sql``
			}
		ORDER BY pi.produto_id, p.data_insercao DESC
	`);

	const map = new Map<string, number>();
	for (const row of rows) {
		const value = Number(row.valor_unitario);
		if (Number.isFinite(value) && value > 0) map.set(row.produto_id, value);
	}
	return map;
}

// Fornecedor do produto e o prazo que ele realmente pratica. O lead time medido bate mais do que o
// prometido: usa a diferença entre a data do pedido e a do recebimento efetivo das últimas compras.
async function fetchSupplierByProduct({ organizationId }: { organizationId: string }) {
	const rows = await db.execute<{
		produto_id: string;
		fornecedor_id: string | null;
		fornecedor_nome: string | null;
		lead_time_medio: string | number | null;
	}>(sql`
		WITH entradas AS (
			SELECT
				pi.produto_id,
				p.fornecedor_id,
				p.data_insercao,
				CASE
					WHEN p.pedido_data IS NOT NULL AND p.entrega_data_recebimento_efetivacao IS NOT NULL
					THEN EXTRACT(EPOCH FROM (p.entrega_data_recebimento_efetivacao - p.pedido_data)) / 86400
					ELSE NULL
				END AS lead_time_dias
			FROM ampmais_purchase_items pi
			JOIN ampmais_purchases p ON p.id = pi.compra_id
			WHERE pi.organizacao_id = ${organizationId}
				AND p.fornecedor_id IS NOT NULL
				AND p.status <> 'CANCELADA'
		), ultimo AS (
			SELECT DISTINCT ON (produto_id) produto_id, fornecedor_id
			FROM entradas
			ORDER BY produto_id, data_insercao DESC
		), lead_time AS (
			SELECT fornecedor_id, AVG(lead_time_dias) AS lead_time_medio
			FROM entradas
			WHERE lead_time_dias IS NOT NULL AND lead_time_dias >= 0
			GROUP BY fornecedor_id
		)
		SELECT u.produto_id, u.fornecedor_id, s.nome AS fornecedor_nome, lt.lead_time_medio
		FROM ultimo u
		LEFT JOIN ampmais_suppliers s ON s.id = u.fornecedor_id
		LEFT JOIN lead_time lt ON lt.fornecedor_id = u.fornecedor_id
	`);

	const map = new Map<string, { id: string; nome: string | null; leadTimeMedioDias: number | null }>();
	for (const row of rows) {
		if (!row.fornecedor_id) continue;
		const leadTime = row.lead_time_medio == null ? null : Number(row.lead_time_medio);
		map.set(row.produto_id, {
			id: row.fornecedor_id,
			nome: row.fornecedor_nome,
			leadTimeMedioDias: leadTime != null && Number.isFinite(leadTime) ? leadTime : null,
		});
	}
	return map;
}

// Snapshot de estoque mais recente. Vira a fonte do saldo quando o ERP externo é quem mantém o
// estoque — caso da integração da Online Sistemas, que entrega vendas mas não posição de estoque.
async function fetchLatestStockPosition({ organizationId }: { organizationId: string }) {
	const latestImport = await db.query.stockPositionImports.findFirst({
		where: and(eq(stockPositionImports.organizacaoId, organizationId), eq(stockPositionImports.status, "CONCLUIDA")),
		orderBy: [desc(stockPositionImports.dataPosicao), desc(stockPositionImports.dataInsercao)],
	});
	if (!latestImport) return null;

	const items = await db
		.select({
			produtoId: stockPositionImportItems.produtoId,
			quantidade: stockPositionImportItems.quantidade,
			custoUnitario: stockPositionImportItems.custoUnitario,
			precoVenda: stockPositionImportItems.precoVenda,
			quantidadeEmTransito: stockPositionImportItems.quantidadeEmTransito,
			fornecedorNome: stockPositionImportItems.fornecedorNome,
		})
		.from(stockPositionImportItems)
		.where(eq(stockPositionImportItems.importacaoId, latestImport.id));

	const map = new Map<string, (typeof items)[number]>();
	for (const item of items) {
		if (item.produtoId) map.set(item.produtoId, item);
	}
	return { importacao: latestImport, itensPorProduto: map };
}

// Grupos existentes no catálogo ativo. Vão junto da análise porque são as opções do próprio filtro
// da tela — uma chamada separada só para preencher um select duplicaria a varredura de produtos.
async function fetchProductGroups({ organizationId }: { organizationId: string }) {
	const rows = await db
		.selectDistinct({ grupo: products.grupo })
		.from(products)
		.where(and(eq(products.organizacaoId, organizationId), eq(products.ativo, true)))
		.orderBy(asc(products.grupo));
	return rows.map((row) => row.grupo).filter((grupo) => grupo != null && grupo.trim().length > 0);
}

// Fornecedores ativos da loja, para o filtro da tela. Vêm daqui e não do endpoint de fornecedores
// porque aquele pagina em 25 registros — uma loja de material de construção passa disso e a
// compradora não encontraria no filtro justamente o fornecedor que quer cotar.
async function fetchSupplierOptions({ organizationId }: { organizationId: string }) {
	return db
		.select({ id: suppliers.id, nome: suppliers.nome })
		.from(suppliers)
		.where(and(eq(suppliers.organizacaoId, organizationId), eq(suppliers.ativo, true)))
		.orderBy(asc(suppliers.nome));
}

function buildProductConditions({ input, organizationId }: { input: TGetReplenishmentAnalysisInput; organizationId: string }) {
	const conditions = [eq(products.organizacaoId, organizationId), eq(products.ativo, true)];

	if (input.search) {
		conditions.push(
			sql`(unaccent(${products.nome}) ILIKE unaccent('%' || ${input.search} || '%') OR unaccent(${products.codigo}) ILIKE unaccent('%' || ${input.search} || '%'))`,
		);
	}
	if (input.groups.length > 0) conditions.push(inArray(products.grupo, input.groups));
	if (input.productIds.length > 0) conditions.push(inArray(products.id, input.productIds));

	// Fornecedor tem três origens possíveis: o preferencial marcado à mão, o de-para do fornecedor e
	// o histórico de compras. Qualquer uma delas vincula o produto ao fornecedor filtrado.
	if (input.supplierIds.length > 0) {
		const supplierIdsSql = sql.join(
			input.supplierIds.map((id) => sql`${id}`),
			sql`, `,
		);
		conditions.push(sql`(
			EXISTS (
				SELECT 1 FROM ${productReplenishmentSettings}
				WHERE ${productReplenishmentSettings.produtoId} = ${products.id}
					AND ${productReplenishmentSettings.fornecedorPreferencialId} IN (${supplierIdsSql})
			)
			OR EXISTS (
				SELECT 1 FROM ${supplierProductMappings}
				WHERE ${supplierProductMappings.produtoId} = ${products.id}
					AND ${supplierProductMappings.fornecedorId} IN (${supplierIdsSql})
			)
			OR EXISTS (
				SELECT 1 FROM ${purchaseItems}
				JOIN ${purchases} ON ${purchases.id} = ${purchaseItems.compraId}
				WHERE ${purchaseItems.produtoId} = ${products.id}
					AND ${purchases.fornecedorId} IN (${supplierIdsSql})
			)
		)`);
	}

	return conditions;
}

function resolveItemPolicy({
	settings,
	override,
	supplierLeadTime,
}: {
	settings: TReplenishmentSettings;
	override: typeof productReplenishmentSettings.$inferSelect | undefined;
	supplierLeadTime: number | null;
}): TReplenishmentPolicy {
	// Precedência do prazo: o que foi digitado para o produto, depois o medido no histórico daquele
	// fornecedor, e só então o padrão da loja. O medido ganha do padrão porque é o único dos três
	// que descreve o fornecedor real, e não uma média de todos eles.
	const leadTimeDias = override?.leadTimeDias ?? (supplierLeadTime != null ? Math.round(supplierLeadTime) : settings.leadTimeDiasPadrao);
	const hasManualStockBounds = (override?.estoqueMinimo ?? null) != null || (override?.estoqueMaximo ?? null) != null;

	return {
		leadTimeDias,
		cicloRevisaoDias: settings.cicloRevisaoDias,
		diasCoberturaAlvo: settings.diasCoberturaAlvo,
		nivelServico: settings.nivelServico,
		multiploCompra: override?.multiploCompra ?? null,
		quantidadeMinimaCompra: override?.quantidadeMinimaCompra ?? null,
		origemParametros: hasManualStockBounds
			? (override?.estoqueMinimo ?? null) != null && (override?.estoqueMaximo ?? null) != null
				? "MANUAL"
				: "MISTO"
			: "CALCULADO",
	};
}

export async function getReplenishmentAnalysis({
	input,
	organizationId,
	settings,
}: {
	input: TGetReplenishmentAnalysisInput;
	organizationId: string;
	settings: TReplenishmentSettings;
}) {
	const referenceDate = new Date();
	const bucketCount = Math.max(Math.ceil(settings.janelaAnaliseDias / BUCKET_DAYS), 1);
	const windowStart = new Date(referenceDate.getTime() - bucketCount * BUCKET_DAYS * 86_400_000);

	const productRows = (await db
		.select({
			id: products.id,
			codigo: products.codigo,
			nome: products.nome,
			unidade: products.unidade,
			grupo: products.grupo,
			imagemCapaUrl: products.imagemCapaUrl,
			quantidade: products.quantidade,
			precoVenda: products.precoVenda,
			precoCusto: products.precoCusto,
		})
		.from(products)
		.where(and(...buildProductConditions({ input, organizationId })))
		.orderBy(asc(products.nome))) as ProductRow[];

	const productIds = productRows.map((product) => product.id);
	const scopedProductIds = buildProductScopeCondition(productIds);

	const [
		demandRows,
		stockoutDays,
		inTransit,
		purchasePricing,
		lastPurchasePrice,
		supplierByProduct,
		stockPosition,
		overrideRows,
		grupos,
		fornecedoresDisponiveis,
	] = await Promise.all([
		fetchDemandBuckets({ organizationId, windowStart, productIds: scopedProductIds }),
		settings.ajustarDemandaPorRuptura
			? fetchStockoutDaysByProduct({ organizationId, windowStart, referenceDate })
			: Promise.resolve(new Map<string, number>()),
		fetchInTransitByProduct({ organizationId, productIds: scopedProductIds }),
		fetchPurchasePricingByProduct({ organizationId, windowStart, productIds: scopedProductIds }),
		fetchLastPurchasePriceByProduct({ organizationId, productIds: scopedProductIds }),
		fetchSupplierByProduct({ organizationId }),
		// Quem decide a origem do saldo é a política efetiva (já com o override da requisição aplicado),
		// não um campo solto do filtro: assim a mesma escolha vale para a tela, para a exportação e para
		// qualquer outra leitura, em vez de depender de quem lembrou de passar o parâmetro.
		settings.origemEstoquePadrao === "SISTEMA" ? Promise.resolve(null) : fetchLatestStockPosition({ organizationId }),
		db.select().from(productReplenishmentSettings).where(eq(productReplenishmentSettings.organizacaoId, organizationId)),
		fetchProductGroups({ organizationId }),
		fetchSupplierOptions({ organizationId }),
	]);

	const overrideByProduct = new Map(overrideRows.map((row) => [row.produtoId, row]));

	// Um balde por índice, mesmo sem venda: a ausência de saída em um mês é informação (puxa a média
	// para baixo), enquanto um balde faltante seria descartado do cálculo.
	const bucketsByProduct = new Map<string, TDemandBucket[]>();
	const windowTotalsByProduct = new Map<string, { receita: number; custo: number; quantidade: number; vendas: number }>();
	for (const row of demandRows) {
		// Vendas exatamente na borda da janela podem cair um balde além do último; grudamos no último em
		// vez de descartar, senão a quantidade sumiria da média sem deixar rastro.
		const bucketIndex = Math.min(Math.max(Math.trunc(Number(row.bucket) || 0), 0), bucketCount - 1);
		const existing = bucketsByProduct.get(row.produtoId) ?? [];
		const bucket = existing.find((entry) => entry.indice === bucketIndex);
		if (bucket) bucket.quantidade += Number(row.quantidade) || 0;
		else existing.push({ indice: bucketIndex, dias: BUCKET_DAYS, quantidade: Number(row.quantidade) || 0, diasSemEstoque: 0 });
		bucketsByProduct.set(row.produtoId, existing);

		const totals = windowTotalsByProduct.get(row.produtoId) ?? { receita: 0, custo: 0, quantidade: 0, vendas: 0 };
		totals.receita += Number(row.receita) || 0;
		totals.custo += Number(row.custo) || 0;
		totals.quantidade += Number(row.quantidade) || 0;
		totals.vendas += Number(row.vendas) || 0;
		windowTotalsByProduct.set(row.produtoId, totals);
	}

	// ABC calculado sobre o mesmo recorte da análise: a classe precisa refletir o faturamento da
	// janela que está na tela, não uma classificação global de outro período.
	const abcByProduct = new Map<string, TProductAbcClass>();
	const abcInput = productRows.map((product) => {
		const totals = windowTotalsByProduct.get(product.id);
		return {
			productId: product.id,
			revenue: totals?.receita ?? 0,
			cost: totals?.custo ?? 0,
			quantity: totals?.quantidade ?? 0,
			saleCount: totals?.vendas ?? 0,
		};
	});
	for (const classified of assignAbcClasses(abcInput)) {
		abcByProduct.set(classified.productId, classified.abcClass);
	}

	const usingImportedPosition = stockPosition != null;
	const items: TReplenishmentItem[] = productRows.map((product) => {
		const override = overrideByProduct.get(product.id);
		const importedItem = stockPosition?.itensPorProduto.get(product.id);
		const supplierFromHistory = supplierByProduct.get(product.id) ?? null;

		const origemEstoque: TStockPositionSourceEnum = importedItem ? "IMPORTACAO" : "SISTEMA";
		const estoqueAtual = importedItem ? importedItem.quantidade : (product.quantidade ?? 0);
		const estoqueEmTransito = importedItem?.quantidadeEmTransito ?? inTransit.get(product.id) ?? 0;
		const estoqueReservado = 0;
		const posicaoEstoque = estoqueAtual + estoqueEmTransito - estoqueReservado;

		// A ruptura medida cobre a janela inteira; ratear pelos baldes proporcionalmente é o mais
		// próximo que se chega sem reconstruir o saldo dia a dia por produto.
		const stockoutTotal = stockoutDays.get(product.id) ?? 0;
		const rawBuckets = bucketsByProduct.get(product.id) ?? [];
		const buckets: TDemandBucket[] = Array.from({ length: bucketCount }, (_, index) => {
			const found = rawBuckets.find((bucket) => bucket.indice === index);
			return {
				indice: index,
				dias: BUCKET_DAYS,
				quantidade: found?.quantidade ?? 0,
				diasSemEstoque: stockoutTotal > 0 ? stockoutTotal / bucketCount : 0,
			};
		});

		const demanda = buildDemandProfile({ buckets, adjustForStockouts: settings.ajustarDemandaPorRuptura });
		const politica = resolveItemPolicy({ settings, override, supplierLeadTime: supplierFromHistory?.leadTimeMedioDias ?? null });
		const plano = buildReplenishmentPlan({
			demandaDiaria: demanda.demandaDiaria,
			desvioPadraoDiario: demanda.desvioPadraoDiario,
			posicaoEstoque,
			politica,
			estoqueMinimo: override?.estoqueMinimo,
			estoqueMaximo: override?.estoqueMaximo,
		});

		const coberturaDias = calculateCoverageDays({ estoqueAtual, demandaDiaria: demanda.demandaDiaria });
		const classeAbc = abcByProduct.get(product.id) ?? "C";
		const status = classifyReplenishmentStatus({
			estoqueAtual,
			posicaoEstoque,
			demandaDiaria: demanda.demandaDiaria,
			coberturaDias,
			leadTimeDias: politica.leadTimeDias,
			pontoPedido: plano.pontoPedido,
			diasExcessoLimite: settings.diasExcessoLimite,
		});

		const precoVenda = importedItem?.precoVenda ?? product.precoVenda ?? null;
		const custoMedio = importedItem?.custoUnitario ?? product.precoCusto ?? null;
		const pricing = purchasePricing.get(product.id);
		const precoUltimaCompra = lastPurchasePrice.get(product.id) ?? null;
		// O custo de referência para a margem é o melhor dado disponível, nessa ordem: custo médio do
		// cadastro, média das compras da janela, última compra. Trocar a ordem inverteria o sentido
		// da margem em lojas que mantêm o custo médio móvel corretamente.
		const custoReferencia = custoMedio ?? pricing?.precoMedioCompra ?? precoUltimaCompra ?? null;
		const margemUnitaria = precoVenda != null && custoReferencia != null ? precoVenda - custoReferencia : null;
		const margemPercentual = margemUnitaria != null && precoVenda ? (margemUnitaria / precoVenda) * 100 : null;
		const markupPercentual = margemUnitaria != null && custoReferencia ? (margemUnitaria / custoReferencia) * 100 : null;

		const custoSugestao = custoReferencia ?? 0;
		const perdaPotencial = calculatePotentialLoss({
			demandaDiaria: demanda.demandaDiaria,
			coberturaDias,
			leadTimeDias: politica.leadTimeDias,
			margemUnitaria,
		});

		return {
			produtoId: product.id,
			codigo: product.codigo,
			nome: product.nome,
			unidade: product.unidade,
			grupo: product.grupo,
			imagemCapaUrl: product.imagemCapaUrl,
			estoqueAtual,
			estoqueEmTransito,
			estoqueReservado,
			posicaoEstoque,
			origemEstoque,
			dataPosicaoEstoque: importedItem ? (stockPosition?.importacao.dataPosicao ?? null) : null,
			coberturaDias,
			dataRupturaPrevista: projectStockoutDate({ coberturaDias, referencia: referenceDate }),
			status,
			classeAbc,
			sobressalente: override?.sobressalente ?? false,
			naoPromover: override?.naoPromover ?? false,
			descontinuado: override?.descontinuado ?? false,
			demanda,
			politica,
			plano,
			valores: {
				precoVenda,
				custoMedio,
				precoUltimaCompra,
				precoMedioCompra: pricing?.precoMedioCompra ?? null,
				dataUltimaCompra: pricing?.dataUltimaCompra ?? null,
				margemUnitaria,
				margemPercentual,
				markupPercentual,
				valorImobilizado: estoqueAtual * (custoReferencia ?? 0),
				valorSugestao: plano.quantidadeSugerida > 0 ? plano.quantidadeSugerida * custoSugestao : null,
			},
			fornecedor: {
				id: override?.fornecedorPreferencialId ?? supplierFromHistory?.id ?? null,
				nome: importedItem?.fornecedorNome ?? supplierFromHistory?.nome ?? null,
				leadTimeMedioDias: supplierFromHistory?.leadTimeMedioDias ?? null,
				origem: override?.fornecedorPreferencialId
					? "PREFERENCIAL"
					: supplierFromHistory
						? "HISTORICO"
						: importedItem?.fornecedorNome
							? "IMPORTACAO"
							: "DESCONHECIDO",
			},
			perdaPotencial,
			indicePrioridade: calculatePriorityIndex({
				coberturaDias,
				leadTimeDias: politica.leadTimeDias,
				cicloRevisaoDias: politica.cicloRevisaoDias,
				classeAbc,
				demandaDiaria: demanda.demandaDiaria,
			}),
		};
	});

	// Filtros que dependem do resultado do cálculo. Ficam aqui, e não no SQL, porque cobertura,
	// status e classe ABC só existem depois de a demanda ser estimada.
	const filtered = items.filter((item) => {
		if (item.descontinuado && !input.incluirDescontinuados) return false;
		if (item.sobressalente && !input.incluirSobressalentes) return false;
		if (input.status.length > 0 && !input.status.includes(item.status)) return false;
		if (input.abcClasses.length > 0 && !input.abcClasses.includes(item.classeAbc)) return false;
		if (input.apenasSugestoes && item.plano.quantidadeSugerida <= 0) return false;
		// Um item sem demanda tem cobertura nula (infinita). O filtro "até N dias de cobertura"
		// procura quem vai faltar, então ele não pode arrastar junto o catálogo inteiro parado.
		if (input.coberturaMaximaDias != null) {
			if (item.coberturaDias == null || item.coberturaDias > input.coberturaMaximaDias) return false;
		}
		if (input.coberturaMinimaDias != null) {
			if (item.coberturaDias != null && item.coberturaDias < input.coberturaMinimaDias) return false;
		}
		return true;
	});

	const direction = input.orderByDirection === "asc" ? 1 : -1;
	const sorted = [...filtered].sort((a, b) => {
		switch (input.orderByField) {
			case "cobertura": {
				// Sem cobertura calculável o item vai para o fim da fila em qualquer direção: ele não é
				// nem o mais urgente nem o mais folgado, é o que não tem a informação.
				if (a.coberturaDias == null && b.coberturaDias == null) return 0;
				if (a.coberturaDias == null) return 1;
				if (b.coberturaDias == null) return -1;
				return (a.coberturaDias - b.coberturaDias) * direction;
			}
			case "perdaPotencial":
				return (a.perdaPotencial - b.perdaPotencial) * direction;
			case "valorSugestao":
				return ((a.valores.valorSugestao ?? 0) - (b.valores.valorSugestao ?? 0)) * direction;
			case "estoque":
				return (a.estoqueAtual - b.estoqueAtual) * direction;
			case "demanda":
				return (a.demanda.demandaDiaria - b.demanda.demandaDiaria) * direction;
			case "codigo":
				return a.codigo.localeCompare(b.codigo, "pt-BR") * direction;
			case "nome":
				return a.nome.localeCompare(b.nome, "pt-BR") * direction;
			default:
				return (a.indicePrioridade - b.indicePrioridade) * direction || (a.perdaPotencial - b.perdaPotencial) * direction;
		}
	});

	const resumo: TReplenishmentSummary = {
		produtosAnalisados: sorted.length,
		produtosParaComprar: sorted.filter((item) => item.plano.quantidadeSugerida > 0 && isReplenishmentStatusActionable(item.status)).length,
		produtosEmRuptura: sorted.filter((item) => item.status === "RUPTURA").length,
		produtosCriticos: sorted.filter((item) => item.status === "CRITICO").length,
		produtosEmExcesso: sorted.filter((item) => item.status === "EXCESSO").length,
		produtosSemGiro: sorted.filter((item) => item.status === "SEM_GIRO").length,
		valorSugestaoTotal: sorted.reduce((acc, item) => acc + (item.valores.valorSugestao ?? 0), 0),
		valorImobilizadoTotal: sorted.reduce((acc, item) => acc + item.valores.valorImobilizado, 0),
		valorImobilizadoExcesso: sorted
			.filter((item) => item.status === "EXCESSO" || item.status === "SEM_GIRO")
			.reduce((acc, item) => acc + item.valores.valorImobilizado, 0),
		perdaPotencialTotal: sorted.reduce((acc, item) => acc + item.perdaPotencial, 0),
		coberturaMediaDias: (() => {
			const withCoverage = sorted.filter((item) => item.coberturaDias != null);
			if (withCoverage.length === 0) return null;
			return withCoverage.reduce((acc, item) => acc + (item.coberturaDias ?? 0), 0) / withCoverage.length;
		})(),
	};

	const pageSize = input.pageSize;
	const paginated = pageSize == null ? sorted : sorted.slice((input.page - 1) * pageSize, input.page * pageSize);

	return {
		items: paginated,
		resumo,
		totalPages: pageSize == null ? 1 : Math.ceil(sorted.length / pageSize),
		periodo: { inicio: windowStart, fim: referenceDate, janelaDias: bucketCount * BUCKET_DAYS },
		configuracao: settings,
		filtros: { grupos, fornecedores: fornecedoresDisponiveis },
		posicaoEstoque: usingImportedPosition
			? {
					origem: "IMPORTACAO" as const,
					importacaoId: stockPosition.importacao.id,
					dataPosicao: stockPosition.importacao.dataPosicao,
					arquivoNome: stockPosition.importacao.arquivoNome,
					produtosCobertos: stockPosition.itensPorProduto.size,
				}
			: { origem: "SISTEMA" as const, importacaoId: null, dataPosicao: null, arquivoNome: null, produtosCobertos: 0 },
	};
}

export type TGetReplenishmentAnalysisResult = Awaited<ReturnType<typeof getReplenishmentAnalysis>>;
