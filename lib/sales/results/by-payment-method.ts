import type { TPaymentMethodEnum } from "@/schemas/enums";
import { SALE_CHANGE_TRANSACTION_ORIGIN } from "@/lib/sales/sale-change";
import { db } from "@/services/drizzle";
import { accountingEntries, financialTransactions, sales } from "@/services/drizzle/schema";
import { and, count, countDistinct, eq, inArray, notExists, sql, sum } from "drizzle-orm";
import { computeShare } from "./classify";
import { reconcilePaymentTotals } from "./payment-reconciliation";
import { buildSalesUniverseConditions, buildSalesUniverseIdsSubquery, type TSalesResultsFilters } from "./universe";

/**
 * Recebimentos por método, em regime de competência: a transação é atribuída à data da venda que
 * a originou (`sales.dataVenda`), via `accountingEntries.vendaId` → `financialTransactions`.
 * Uma venda parcelada aparece inteira no método, dividida entre efetivado e pendente. As linhas
 * preservam a composição bruta por método; o total líquido desconta troco e taxas de canal e usa
 * o valor da venda como teto para absorver troco legado ainda sem SAÍDA persistida.
 *
 * O que entrou nas contas no período é pergunta do financeiro (fluxo de caixa por
 * `dataEfetivacao`), não deste relatório.
 */
export async function getSalesResultsByPaymentMethod({ filters }: { filters: TSalesResultsFilters }) {
	const universeIds = buildSalesUniverseIdsSubquery(filters, "CONFIRMADA");

	const [rows, reconciliationRows, [coverageRow], [universeRow]] = await Promise.all([
		db
			.select({
				metodo: financialTransactions.metodo,
				valor: sum(financialTransactions.valor),
				qtdeVendas: countDistinct(accountingEntries.vendaId),
				valorEfetivado: sql<string>`coalesce(sum(case when ${financialTransactions.dataEfetivacao} is not null then ${financialTransactions.valor} else 0 end), 0)`,
				valorPendente: sql<string>`coalesce(sum(case when ${financialTransactions.dataEfetivacao} is null then ${financialTransactions.valor} else 0 end), 0)`,
				valorTaxas: sum(financialTransactions.valorTaxas),
			})
			.from(financialTransactions)
			.innerJoin(accountingEntries, eq(financialTransactions.lancamentoContabilId, accountingEntries.id))
			.where(
				and(
					eq(financialTransactions.organizacaoId, filters.organizacaoId),
					eq(financialTransactions.tipo, "ENTRADA"),
					eq(accountingEntries.origemTipo, "VENDA"),
					inArray(accountingEntries.vendaId, universeIds),
				),
			)
			.groupBy(financialTransactions.metodo),
		db
			.select({
				valorVenda: sales.valorTotal,
				valorEntradas: sql<string>`coalesce(sum(case when ${financialTransactions.tipo} = 'ENTRADA' then ${financialTransactions.valor} else 0 end), 0)`,
				valorDinheiro: sql<string>`coalesce(sum(case when ${financialTransactions.tipo} = 'ENTRADA' and ${financialTransactions.metodo} = 'DINHEIRO' then ${financialTransactions.valor} else 0 end), 0)`,
				trocoRegistrado: sql<string>`coalesce(sum(case when ${financialTransactions.tipo} = 'SAIDA' and ${financialTransactions.modificadoresMetadata}->>'origem' = ${SALE_CHANGE_TRANSACTION_ORIGIN} and coalesce(${financialTransactions.provedorStatus}, '') not in ('CANCELADO', 'ESTORNADO') then ${financialTransactions.valor} else 0 end), 0)`,
				taxasCanal: sql<string>`coalesce(sum(case when ${financialTransactions.tipo} = 'SAIDA' and ${accountingEntries.chaveIdempotencia} like 'taxas-canal:%' and coalesce(${financialTransactions.provedorStatus}, '') not in ('CANCELADO', 'ESTORNADO') then ${financialTransactions.valor} else 0 end), 0)`,
			})
			.from(sales)
			.innerJoin(accountingEntries, eq(accountingEntries.vendaId, sales.id))
			.innerJoin(financialTransactions, eq(financialTransactions.lancamentoContabilId, accountingEntries.id))
			.where(
				and(
					...buildSalesUniverseConditions(filters, "CONFIRMADA"),
					eq(accountingEntries.organizacaoId, filters.organizacaoId),
					eq(accountingEntries.origemTipo, "VENDA"),
					eq(financialTransactions.organizacaoId, filters.organizacaoId),
				),
			)
			.groupBy(sales.id, sales.valorTotal),
		// Vendas do universo SEM nenhuma transação de pagamento (processadas externamente, ou
		// anteriores ao ERP): explicam por que Σ recebimentos difere do faturamento.
		db
			.select({ qtde: count(sales.id), valor: sum(sales.valorTotal) })
			.from(sales)
			.where(
				and(
					...buildSalesUniverseConditions(filters, "CONFIRMADA"),
					notExists(
						db
							.select({ id: financialTransactions.id })
							.from(financialTransactions)
							.innerJoin(accountingEntries, eq(financialTransactions.lancamentoContabilId, accountingEntries.id))
							.where(and(eq(accountingEntries.vendaId, sales.id), eq(accountingEntries.origemTipo, "VENDA"), eq(financialTransactions.tipo, "ENTRADA"))),
					),
				),
			),
		db
			.select({ qtde: count(sales.id) })
			.from(sales)
			.where(and(...buildSalesUniverseConditions(filters, "CONFIRMADA"))),
	]);

	const linhasBase = rows.map((row) => ({
		metodo: row.metodo as TPaymentMethodEnum,
		valor: Number(row.valor ?? 0),
		qtdeVendas: row.qtdeVendas,
		valorEfetivado: Number(row.valorEfetivado ?? 0),
		valorPendente: Number(row.valorPendente ?? 0),
		valorTaxas: Number(row.valorTaxas ?? 0),
	}));
	const reconciliation = reconcilePaymentTotals(
		reconciliationRows.map((row) => ({
			valorVenda: row.valorVenda,
			valorEntradas: Number(row.valorEntradas),
			valorDinheiro: Number(row.valorDinheiro),
			trocoRegistrado: Number(row.trocoRegistrado),
			taxasCanal: Number(row.taxasCanal),
		})),
	);
	const totalRecebido = reconciliation.totalRecebido;
	const linhas = linhasBase
		.map((linha) => ({ ...linha, participacaoPercentual: computeShare(linha.valor, reconciliation.totalBruto) }))
		.sort((a, b) => b.valor - a.valor);

	const vendasSemPagamento = coverageRow.qtde;
	return {
		linhas,
		totalRecebido,
		totalBruto: reconciliation.totalBruto,
		ajustes: reconciliation.ajustes,
		cobertura: {
			vendasComPagamento: universeRow.qtde - vendasSemPagamento,
			vendasSemPagamento,
			valorSemPagamento: Number(coverageRow.valor ?? 0),
		},
	};
}
export type TSalesResultsByPaymentMethod = Awaited<ReturnType<typeof getSalesResultsByPaymentMethod>>;
