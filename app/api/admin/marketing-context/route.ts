import { appApiHandler } from "@/lib/app-api";
import { getCampaignsPerformanceContext } from "@/lib/ai/ai-agent/marketing/context";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { buildDiscreteHistogram, buildHistogram, summarizeMetric } from "@/utils/analytics";
import { getRFMConfigByLabel, RFMLabels } from "@/utils/rfm";
import { db } from "@/services/drizzle";
import { cashbackProgramTransactions, cashbackPrograms, clients, products, saleItems, sales } from "@/services/drizzle/schema";
import { and, asc, count, countDistinct, desc, eq, gte, isNotNull, lte, sql, sum } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const ExportMarketingContextInputSchema = z.object({
	organizationId: z.string({
		required_error: "ID da organização não informado.",
		invalid_type_error: "Tipo inválido para ID da organização.",
	}),
	periodAfter: z
		.string({
			required_error: "Período inicial não informado.",
			invalid_type_error: "Tipo inválido para período inicial.",
		})
		.datetime({ message: "Tipo inválido para período inicial." })
		.transform((value) => new Date(value)),
	periodBefore: z
		.string({
			required_error: "Período final não informado.",
			invalid_type_error: "Tipo inválido para período final.",
		})
		.datetime({ message: "Tipo inválido para período final." })
		.transform((value) => new Date(value)),
});
export type TExportMarketingContextInput = z.infer<typeof ExportMarketingContextInputSchema>;

function toNumber(value: unknown) {
	if (value === null || value === undefined) return 0;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
}

function safeDivide(numerator: number, denominator: number) {
	return denominator > 0 ? numerator / denominator : 0;
}

function buildOpenEndedDiscreteHistogram(values: number[], buckets: { label: string; min: number; max: number | null }[]) {
	return buckets.map((bucket) => ({
		label: bucket.label,
		min: bucket.min,
		max: bucket.max,
		count: values.filter((value) => value >= bucket.min && (bucket.max === null || value <= bucket.max)).length,
	}));
}

function getPreviousPeriod(periodAfter: Date, periodBefore: Date) {
	const durationMs = periodBefore.getTime() - periodAfter.getTime();
	const previousBefore = new Date(periodAfter.getTime() - 1);
	const previousAfter = new Date(previousBefore.getTime() - durationMs);

	return { previousAfter, previousBefore };
}

async function getSalesSummaryForPeriod({ organizationId, periodAfter, periodBefore }: { organizationId: string; periodAfter: Date; periodBefore: Date }) {
	const saleRows = await db
		.select({
			quantidadeVendas: count(sales.id),
			faturamento: sum(sales.valorTotal),
			custo: sum(sales.custoTotal),
			descontos: sum(sales.descontosTotal),
			acrescimos: sum(sales.acrescimosTotal),
			clientesIdentificadosCompradores: countDistinct(sales.clienteId),
		})
		.from(sales)
		.where(and(eq(sales.organizacaoId, organizationId), gte(sales.dataVenda, periodAfter), lte(sales.dataVenda, periodBefore)));

	const itemRows = await db
		.select({
			quantidadeItens: sum(saleItems.quantidade),
			faturamentoItens: sum(saleItems.valorVendaTotalLiquido),
			custoItens: sum(saleItems.valorCustoTotal),
			vendasComItens: countDistinct(saleItems.vendaId),
			produtosVendidos: countDistinct(saleItems.produtoId),
		})
		.from(saleItems)
		.innerJoin(sales, eq(saleItems.vendaId, sales.id))
		.where(and(eq(saleItems.organizacaoId, organizationId), eq(sales.organizacaoId, organizationId), gte(sales.dataVenda, periodAfter), lte(sales.dataVenda, periodBefore)));

	const saleStats = saleRows[0];
	const itemStats = itemRows[0];
	const faturamento = toNumber(saleStats?.faturamento);
	const custo = toNumber(saleStats?.custo);
	const quantidadeVendas = toNumber(saleStats?.quantidadeVendas);
	const quantidadeItens = toNumber(itemStats?.quantidadeItens);
	const margemBruta = faturamento - custo;

	return {
		quantidadeVendas,
		faturamento,
		custo,
		margemBruta,
		margemBrutaPercentual: safeDivide(margemBruta, faturamento) * 100,
		ticketMedio: safeDivide(faturamento, quantidadeVendas),
		quantidadeItensVendidos: quantidadeItens,
		itensPorVenda: safeDivide(quantidadeItens, quantidadeVendas),
		descontos: toNumber(saleStats?.descontos),
		acrescimos: toNumber(saleStats?.acrescimos),
		clientesIdentificadosCompradores: toNumber(saleStats?.clientesIdentificadosCompradores),
		vendasComItens: toNumber(itemStats?.vendasComItens),
		produtosVendidos: toNumber(itemStats?.produtosVendidos),
	};
}

async function getCashbackContextForPeriod({ organizationId, periodAfter, periodBefore }: { organizationId: string; periodAfter: Date; periodBefore: Date }) {
	const [programRows, transactionSummaryRows] = await Promise.all([
		db
			.select({
				id: cashbackPrograms.id,
				ativo: cashbackPrograms.ativo,
				titulo: cashbackPrograms.titulo,
				descricao: cashbackPrograms.descricao,
				terminologia: cashbackPrograms.terminologia,
				modalidadeDescontosPermitida: cashbackPrograms.modalidadeDescontosPermitida,
				modalidadeRecompensasPermitida: cashbackPrograms.modalidadeRecompensasPermitida,
				acumuloTipo: cashbackPrograms.acumuloTipo,
				acumuloValor: cashbackPrograms.acumuloValor,
				acumuloValorParceiro: cashbackPrograms.acumuloValorParceiro,
				acumuloRegraValorMinimo: cashbackPrograms.acumuloRegraValorMinimo,
				acumuloPermitirViaIntegracao: cashbackPrograms.acumuloPermitirViaIntegracao,
				acumuloPermitirViaPontoIntegracao: cashbackPrograms.acumuloPermitirViaPontoIntegracao,
				expiracaoRegraValidadeValor: cashbackPrograms.expiracaoRegraValidadeValor,
				resgateLimiteTipo: cashbackPrograms.resgateLimiteTipo,
				resgateLimiteValor: cashbackPrograms.resgateLimiteValor,
				dataInsercao: cashbackPrograms.dataInsercao,
				dataAtualizacao: cashbackPrograms.dataAtualizacao,
			})
			.from(cashbackPrograms)
			.where(eq(cashbackPrograms.organizacaoId, organizationId))
			.orderBy(desc(cashbackPrograms.ativo), asc(cashbackPrograms.titulo)),
		db
			.select({
				programaId: cashbackProgramTransactions.programaId,
				tipo: cashbackProgramTransactions.tipo,
				quantidade: count(cashbackProgramTransactions.id),
				valorTotal: sum(cashbackProgramTransactions.valor),
			})
			.from(cashbackProgramTransactions)
			.where(
				and(
					eq(cashbackProgramTransactions.organizacaoId, organizationId),
					gte(cashbackProgramTransactions.dataInsercao, periodAfter),
					lte(cashbackProgramTransactions.dataInsercao, periodBefore),
				),
			)
			.groupBy(cashbackProgramTransactions.programaId, cashbackProgramTransactions.tipo),
	]);

	const metricsByProgramId = new Map<string, { distribuido: number; resgatado: number; acumulacoes: number; resgates: number }>();
	for (const row of transactionSummaryRows) {
		const current = metricsByProgramId.get(row.programaId) ?? {
			distribuido: 0,
			resgatado: 0,
			acumulacoes: 0,
			resgates: 0,
		};

		if (row.tipo === "ACÚMULO") {
			current.distribuido += toNumber(row.valorTotal);
			current.acumulacoes += toNumber(row.quantidade);
		}
		if (row.tipo === "RESGATE") {
			current.resgatado += Math.abs(toNumber(row.valorTotal));
			current.resgates += toNumber(row.quantidade);
		}

		metricsByProgramId.set(row.programaId, current);
	}

	let totalDistribuidoNoPeriodo = 0;
	let totalResgatadoNoPeriodo = 0;
	let quantidadeAcumulosNoPeriodo = 0;
	let quantidadeResgatesNoPeriodo = 0;

	const programas = programRows.map((program) => {
		const metrics = metricsByProgramId.get(program.id) ?? {
			distribuido: 0,
			resgatado: 0,
			acumulacoes: 0,
			resgates: 0,
		};
		totalDistribuidoNoPeriodo += metrics.distribuido;
		totalResgatadoNoPeriodo += metrics.resgatado;
		quantidadeAcumulosNoPeriodo += metrics.acumulacoes;
		quantidadeResgatesNoPeriodo += metrics.resgates;

		return {
			id: program.id,
			ativo: program.ativo,
			titulo: program.titulo,
			descricao: program.descricao,
			terminologia: program.terminologia,
			modalidadesPermitidas: {
				descontos: program.modalidadeDescontosPermitida,
				recompensas: program.modalidadeRecompensasPermitida,
			},
			regras: {
				acumulo: {
					tipo: program.acumuloTipo,
					valor: program.acumuloValor,
					valorParceiro: program.acumuloValorParceiro,
					valorMinimoParaAcumulo: program.acumuloRegraValorMinimo,
					permitirViaIntegracao: program.acumuloPermitirViaIntegracao,
					permitirViaPontoIntegracao: program.acumuloPermitirViaPontoIntegracao,
				},
				expiracao: {
					validadeEmDias: program.expiracaoRegraValidadeValor,
				},
				resgate: {
					limiteTipo: program.resgateLimiteTipo,
					limiteValor: program.resgateLimiteValor,
				},
			},
			metricasPeriodo: {
				totalDistribuido: metrics.distribuido,
				totalResgatado: metrics.resgatado,
				taxaResgatePercentual: safeDivide(metrics.resgatado, metrics.distribuido) * 100,
				quantidadeAcumulos: metrics.acumulacoes,
				quantidadeResgates: metrics.resgates,
			},
			dataInsercao: program.dataInsercao,
			dataAtualizacao: program.dataAtualizacao,
		};
	});

	return {
		observacoes: [
			"Total distribuído considera transações agregadas do tipo ACÚMULO no período.",
			"Total resgatado considera o valor absoluto de transações agregadas do tipo RESGATE no período.",
			"Não inclui saldos individuais nem lista de transações de clientes.",
		],
		metricasGeraisPeriodo: {
			totalDistribuido: totalDistribuidoNoPeriodo,
			totalResgatado: totalResgatadoNoPeriodo,
			taxaResgatePercentual: safeDivide(totalResgatadoNoPeriodo, totalDistribuidoNoPeriodo) * 100,
			quantidadeAcumulos: quantidadeAcumulosNoPeriodo,
			quantidadeResgates: quantidadeResgatesNoPeriodo,
		},
		programas,
	};
}

async function exportMarketingContext({ input }: { input: TExportMarketingContextInput }) {
	if (input.periodAfter > input.periodBefore) throw new createHttpError.BadRequest("Período inicial deve ser anterior ao período final.");

	const organization = await db.query.organizations.findFirst({
		where: (fields, { eq }) => eq(fields.id, input.organizationId),
		columns: {
			id: true,
			nome: true,
			cnpj: true,
			telefone: true,
			email: true,
			atuacaoNicho: true,
			atuacaoCanais: true,
			tamanhoBaseClientes: true,
			plataformasUtilizadas: true,
			dadosViaERP: true,
			dadosViaPDI: true,
			dadosViaIntegracoes: true,
			integracaoTipo: true,
			integracaoDataUltimaSincronizacao: true,
			dataInsercao: true,
		},
	});
	if (!organization) throw new createHttpError.NotFound("Organização não encontrada.");

	const { previousAfter, previousBefore } = getPreviousPeriod(input.periodAfter, input.periodBefore);

	const [
		periodSummary,
		previousPeriodSummary,
		clientBaseRows,
		newClientsRows,
		rfmClientRows,
		rfmSalesRows,
		clientPurchaseRows,
		basketRows,
		monthlyRows,
		productRankingRows,
		productGroupRows,
		channelRows,
		sellerRows,
		clientCityRows,
		acquisitionRows,
		natureRows,
		campaignsPerformanceContext,
		cashbackContext,
	] = await Promise.all([
		getSalesSummaryForPeriod({ organizationId: input.organizationId, periodAfter: input.periodAfter, periodBefore: input.periodBefore }),
		getSalesSummaryForPeriod({ organizationId: input.organizationId, periodAfter: previousAfter, periodBefore: previousBefore }),
		db
			.select({
				totalClientes: count(clients.id),
				clientesComTelefone: sql<number>`count(*) filter (where ${clients.telefone} is not null and ${clients.telefone} <> '')::int`,
				clientesComEmail: sql<number>`count(*) filter (where ${clients.email} is not null and ${clients.email} <> '')::int`,
				clientesComCidade: sql<number>`count(*) filter (where ${clients.localizacaoCidade} is not null and ${clients.localizacaoCidade} <> '')::int`,
				clientesComRFM: sql<number>`count(*) filter (where ${clients.analiseRFMTitulo} is not null)::int`,
			})
			.from(clients)
			.where(eq(clients.organizacaoId, input.organizationId)),
		db
			.select({ total: count(clients.id) })
			.from(clients)
			.where(and(eq(clients.organizacaoId, input.organizationId), gte(clients.primeiraCompraData, input.periodAfter), lte(clients.primeiraCompraData, input.periodBefore))),
		db
			.select({
				label: clients.analiseRFMTitulo,
				clientes: count(clients.id),
			})
			.from(clients)
			.where(eq(clients.organizacaoId, input.organizationId))
			.groupBy(clients.analiseRFMTitulo),
		db
			.select({
				label: clients.analiseRFMTitulo,
				faturamento: sum(sales.valorTotal),
				vendas: count(sales.id),
				clientesCompradores: countDistinct(sales.clienteId),
			})
			.from(sales)
			.innerJoin(clients, eq(sales.clienteId, clients.id))
			.where(and(eq(sales.organizacaoId, input.organizationId), eq(clients.organizacaoId, input.organizationId), gte(sales.dataVenda, input.periodAfter), lte(sales.dataVenda, input.periodBefore)))
			.groupBy(clients.analiseRFMTitulo),
		db
			.select({
				clienteId: sales.clienteId,
				quantidadeCompras: count(sales.id),
				valorGasto: sum(sales.valorTotal),
				primeiraCompraNoPeriodo: sql<string>`min(${sales.dataVenda})::text`,
				ultimaCompraNoPeriodo: sql<string>`max(${sales.dataVenda})::text`,
			})
			.from(sales)
			.where(and(eq(sales.organizacaoId, input.organizationId), gte(sales.dataVenda, input.periodAfter), lte(sales.dataVenda, input.periodBefore), isNotNull(sales.clienteId)))
			.groupBy(sales.clienteId),
		db
			.select({
				vendaId: saleItems.vendaId,
				quantidadeItens: sum(saleItems.quantidade),
				valorItens: sum(saleItems.valorVendaTotalLiquido),
			})
			.from(saleItems)
			.innerJoin(sales, eq(saleItems.vendaId, sales.id))
			.where(and(eq(saleItems.organizacaoId, input.organizationId), eq(sales.organizacaoId, input.organizationId), gte(sales.dataVenda, input.periodAfter), lte(sales.dataVenda, input.periodBefore)))
			.groupBy(saleItems.vendaId),
		db
			.select({
				mes: sql<string>`date_trunc('month', ${sales.dataVenda})::date::text`,
				vendas: count(sales.id),
				faturamento: sum(sales.valorTotal),
				clientesIdentificados: countDistinct(sales.clienteId),
			})
			.from(sales)
			.where(and(eq(sales.organizacaoId, input.organizationId), gte(sales.dataVenda, input.periodAfter), lte(sales.dataVenda, input.periodBefore)))
			.groupBy(sql`date_trunc('month', ${sales.dataVenda})`)
			.orderBy(asc(sql`date_trunc('month', ${sales.dataVenda})`)),
		db
			.select({
				produtoId: saleItems.produtoId,
				nome: products.nome,
				codigo: products.codigo,
				grupo: products.grupo,
				quantidade: sum(saleItems.quantidade),
				faturamento: sum(saleItems.valorVendaTotalLiquido),
				custo: sum(saleItems.valorCustoTotal),
				vendas: countDistinct(saleItems.vendaId),
				clientes: countDistinct(saleItems.clienteId),
			})
			.from(saleItems)
			.innerJoin(sales, eq(saleItems.vendaId, sales.id))
			.innerJoin(products, eq(saleItems.produtoId, products.id))
			.where(and(eq(saleItems.organizacaoId, input.organizationId), eq(sales.organizacaoId, input.organizationId), gte(sales.dataVenda, input.periodAfter), lte(sales.dataVenda, input.periodBefore)))
			.groupBy(saleItems.produtoId, products.nome, products.codigo, products.grupo)
			.orderBy(desc(sql`sum(${saleItems.valorVendaTotalLiquido})`))
			.limit(30),
		db
			.select({
				grupo: products.grupo,
				quantidade: sum(saleItems.quantidade),
				faturamento: sum(saleItems.valorVendaTotalLiquido),
				vendas: countDistinct(saleItems.vendaId),
				clientes: countDistinct(saleItems.clienteId),
			})
			.from(saleItems)
			.innerJoin(sales, eq(saleItems.vendaId, sales.id))
			.innerJoin(products, eq(saleItems.produtoId, products.id))
			.where(and(eq(saleItems.organizacaoId, input.organizationId), eq(sales.organizacaoId, input.organizationId), gte(sales.dataVenda, input.periodAfter), lte(sales.dataVenda, input.periodBefore)))
			.groupBy(products.grupo)
			.orderBy(desc(sql`sum(${saleItems.valorVendaTotalLiquido})`))
			.limit(30),
		db
			.select({ canal: sales.canal, vendas: count(sales.id), faturamento: sum(sales.valorTotal) })
			.from(sales)
			.where(and(eq(sales.organizacaoId, input.organizationId), gte(sales.dataVenda, input.periodAfter), lte(sales.dataVenda, input.periodBefore)))
			.groupBy(sales.canal)
			.orderBy(desc(sql`sum(${sales.valorTotal})`))
			.limit(20),
		db
			.select({ vendedorNome: sales.vendedorNome, vendas: count(sales.id), faturamento: sum(sales.valorTotal) })
			.from(sales)
			.where(and(eq(sales.organizacaoId, input.organizationId), gte(sales.dataVenda, input.periodAfter), lte(sales.dataVenda, input.periodBefore)))
			.groupBy(sales.vendedorNome)
			.orderBy(desc(sql`sum(${sales.valorTotal})`))
			.limit(20),
		db
			.select({ cidade: clients.localizacaoCidade, estado: clients.localizacaoEstado, clientes: count(clients.id) })
			.from(clients)
			.where(eq(clients.organizacaoId, input.organizationId))
			.groupBy(clients.localizacaoCidade, clients.localizacaoEstado)
			.orderBy(desc(count(clients.id)))
			.limit(20),
		db
			.select({ canalAquisicao: clients.canalAquisicao, clientes: count(clients.id) })
			.from(clients)
			.where(eq(clients.organizacaoId, input.organizationId))
			.groupBy(clients.canalAquisicao)
			.orderBy(desc(count(clients.id)))
			.limit(20),
		db
			.select({ natureza: sales.natureza, vendas: count(sales.id), faturamento: sum(sales.valorTotal) })
			.from(sales)
			.where(and(eq(sales.organizacaoId, input.organizationId), gte(sales.dataVenda, input.periodAfter), lte(sales.dataVenda, input.periodBefore)))
			.groupBy(sales.natureza)
			.orderBy(desc(sql`sum(${sales.valorTotal})`)),
		getCampaignsPerformanceContext(input.organizationId, {
			start: input.periodAfter,
			end: input.periodBefore,
		}),
		getCashbackContextForPeriod({ organizationId: input.organizationId, periodAfter: input.periodAfter, periodBefore: input.periodBefore }),
	]);

	const clientBase = clientBaseRows[0];
	const clientPurchaseFrequencies = clientPurchaseRows.map((row) => toNumber(row.quantidadeCompras));
	const clientPurchaseValues = clientPurchaseRows.map((row) => toNumber(row.valorGasto));
	const basketItemQuantities = basketRows.map((row) => toNumber(row.quantidadeItens));
	const basketValues = basketRows.map((row) => toNumber(row.valorItens));

	const rfmSalesMap = new Map(
		rfmSalesRows.map((row) => [
			row.label ?? "SEM CLASSIFICAÇÃO",
			{
				faturamento: toNumber(row.faturamento),
				vendas: toNumber(row.vendas),
				clientesCompradores: toNumber(row.clientesCompradores),
			},
		]),
	);
	const rfmLabels = [...RFMLabels.map((label) => label.text), "SEM CLASSIFICAÇÃO"];
	const rfmMatrix = rfmLabels.map((label) => {
		const clientRow = rfmClientRows.find((row) => (row.label ?? "SEM CLASSIFICAÇÃO") === label);
		const salesStats = rfmSalesMap.get(label) ?? { faturamento: 0, vendas: 0, clientesCompradores: 0 };
		const config = label === "SEM CLASSIFICAÇÃO" ? null : getRFMConfigByLabel(label);

		return {
			label,
			clientesNaBase: toNumber(clientRow?.clientes),
			clientesCompradoresNoPeriodo: salesStats.clientesCompradores,
			vendasNoPeriodo: salesStats.vendas,
			faturamentoNoPeriodo: salesStats.faturamento,
			ticketMedioNoPeriodo: safeDivide(salesStats.faturamento, salesStats.vendas),
			rfmScoresReferencia: config?.combinations ?? null,
		};
	});

	const topProducts = productRankingRows.map((row, index) => {
		const faturamento = toNumber(row.faturamento);
		const custo = toNumber(row.custo);
		const margem = faturamento - custo;
		return {
			rank: index + 1,
			produtoId: row.produtoId,
			nome: row.nome,
			codigo: row.codigo,
			grupo: row.grupo,
			quantidade: toNumber(row.quantidade),
			faturamento,
			custo,
			margem,
			margemPercentual: safeDivide(margem, faturamento) * 100,
			vendas: toNumber(row.vendas),
			clientes: toNumber(row.clientes),
		};
	});

	return {
		data: {
			metadata: {
				tipo: "marketing-context-export",
				versao: 1,
				geradoEm: new Date().toISOString(),
				observacoes: [
					"Exportação agregada para apoiar análise estratégica e geração de campanhas por IA.",
					"Não inclui nomes, telefones, e-mails ou documentos de clientes.",
					"Valores monetários estão na unidade monetária registrada no banco da organização.",
				],
			},
			organizacao: {
				...organization,
				canaisAtuacao: organization.atuacaoCanais?.split(",").map((item) => item.trim()).filter(Boolean) ?? [],
				plataformas: organization.plataformasUtilizadas?.split(",").map((item) => item.trim()).filter(Boolean) ?? [],
			},
			periodo: {
				inicio: input.periodAfter.toISOString(),
				fim: input.periodBefore.toISOString(),
				comparacaoAnterior: {
					inicio: previousAfter.toISOString(),
					fim: previousBefore.toISOString(),
				},
			},
			resultadosComerciais: {
				periodoAtual: periodSummary,
				periodoAnteriorEquivalente: previousPeriodSummary,
				variacoesPercentuais: {
					faturamento: safeDivide(periodSummary.faturamento - previousPeriodSummary.faturamento, previousPeriodSummary.faturamento) * 100,
					quantidadeVendas: safeDivide(periodSummary.quantidadeVendas - previousPeriodSummary.quantidadeVendas, previousPeriodSummary.quantidadeVendas) * 100,
					ticketMedio: safeDivide(periodSummary.ticketMedio - previousPeriodSummary.ticketMedio, previousPeriodSummary.ticketMedio) * 100,
					margemBruta: safeDivide(periodSummary.margemBruta - previousPeriodSummary.margemBruta, previousPeriodSummary.margemBruta) * 100,
				},
				porMes: monthlyRows.map((row) => ({
					mes: row.mes,
					vendas: toNumber(row.vendas),
					faturamento: toNumber(row.faturamento),
					clientesIdentificados: toNumber(row.clientesIdentificados),
				})),
				porNatureza: natureRows.map((row) => ({
					natureza: row.natureza || "NÃO INFORMADA",
					vendas: toNumber(row.vendas),
					faturamento: toNumber(row.faturamento),
				})),
			},
			baseClientes: {
				totalClientes: toNumber(clientBase?.totalClientes),
				clientesNovosNoPeriodo: toNumber(newClientsRows[0]?.total),
				clientesCompradoresIdentificadosNoPeriodo: clientPurchaseRows.length,
				coberturaCadastro: {
					comTelefone: toNumber(clientBase?.clientesComTelefone),
					comEmail: toNumber(clientBase?.clientesComEmail),
					comCidade: toNumber(clientBase?.clientesComCidade),
					comRFM: toNumber(clientBase?.clientesComRFM),
				},
				distribuicaoRFM: rfmMatrix,
				distribuicaoGeografica: clientCityRows.map((row) => ({
					cidade: row.cidade || "NÃO INFORMADA",
					estado: row.estado || "NÃO INFORMADO",
					clientes: toNumber(row.clientes),
				})),
				canaisAquisicao: acquisitionRows.map((row) => ({
					canalAquisicao: row.canalAquisicao || "NÃO INFORMADO",
					clientes: toNumber(row.clientes),
				})),
			},
			distribuicoes: {
				frequenciaComprasPorClienteNoPeriodo: {
					resumo: summarizeMetric(clientPurchaseFrequencies),
					buckets: buildOpenEndedDiscreteHistogram(clientPurchaseFrequencies, [
						{ label: "1 compra", min: 1, max: 1 },
						{ label: "2 compras", min: 2, max: 2 },
						{ label: "3 a 5 compras", min: 3, max: 5 },
						{ label: "6 a 10 compras", min: 6, max: 10 },
						{ label: "11+ compras", min: 11, max: null },
					]),
				},
				valorGastoPorClienteNoPeriodo: {
					resumo: summarizeMetric(clientPurchaseValues),
					histograma: buildHistogram(clientPurchaseValues, 8, { clipToPercentile: 95 }),
				},
				kitItensPorVendaNoPeriodo: {
					resumo: summarizeMetric(basketItemQuantities),
					buckets: buildDiscreteHistogram(basketItemQuantities, [
						{ label: "1 item", min: 1, max: 1 },
						{ label: "2 itens", min: 2, max: 2 },
						{ label: "3 a 5 itens", min: 3, max: 5 },
						{ label: "6 a 10 itens", min: 6, max: 10 },
						{ label: "11+ itens", min: 11, max: Number.MAX_SAFE_INTEGER },
					]),
				},
				valorKitPorVendaNoPeriodo: {
					resumo: summarizeMetric(basketValues),
					histograma: buildHistogram(basketValues, 8, { clipToPercentile: 95 }),
				},
			},
			produtos: {
				maisVendidos: topProducts,
				porGrupo: productGroupRows.map((row, index) => ({
					rank: index + 1,
					grupo: row.grupo || "NÃO INFORMADO",
					quantidade: toNumber(row.quantidade),
					faturamento: toNumber(row.faturamento),
					vendas: toNumber(row.vendas),
					clientes: toNumber(row.clientes),
				})),
			},
			canaisEVendedores: {
				porCanal: channelRows.map((row) => ({
					canal: row.canal || "NÃO INFORMADO",
					vendas: toNumber(row.vendas),
					faturamento: toNumber(row.faturamento),
				})),
				porVendedor: sellerRows.map((row) => ({
					vendedorNome: row.vendedorNome || "NÃO INFORMADO",
					vendas: toNumber(row.vendas),
					faturamento: toNumber(row.faturamento),
				})),
			},
			campanhasMarketing: campaignsPerformanceContext,
			cashback: cashbackContext,
		},
		message: "Contexto de marketing exportado com sucesso.",
	};
}
export type TExportMarketingContextOutput = Awaited<ReturnType<typeof exportMarketingContext>>;

async function exportMarketingContextRoute(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	if (!session.user.admin) throw new createHttpError.Forbidden("Acesso restrito a administradores.");

	const payload = await request.json();
	const input = ExportMarketingContextInputSchema.parse(payload);
	const result = await exportMarketingContext({ input });

	return NextResponse.json(result);
}

export const POST = appApiHandler({
	POST: exportMarketingContextRoute,
});
