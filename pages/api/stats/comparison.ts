import { apiHandler } from "@/lib/api";
import { getCurrentSessionUncached } from "@/lib/authentication/pages-session";
import { getBestNumberOfPointsBetweenDates, getDateBuckets, getDayStringsBetweenDates, getEvenlySpacedDates } from "@/lib/dates";
import { db } from "@/services/drizzle";
import { sales } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { and, gte, inArray, lte, notInArray } from "drizzle-orm";
import createHttpError from "http-errors";
import type { NextApiHandler, NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

const StatsComparisonInputSchema = z.object({
	firstPeriod: z.object({
		after: z
			.string({
				required_error: "Parâmetros do primeiro período não fornecidos ou inválidos.",
				invalid_type_error: "Parâmetros do primeiro período não fornecidos ou inválidos.",
			})
			.datetime({ message: "Tipo inválido para parâmetro de período." }),
		before: z
			.string({
				required_error: "Parâmetros do primeiro período não fornecidos ou inválidos.",
				invalid_type_error: "Parâmetros do primeiro período não fornecidos ou inválidos.",
			})
			.datetime({ message: "Tipo inválido para parâmetro do primeiro período." }),
	}),
	secondPeriod: z.object({
		after: z
			.string({
				required_error: "Parâmetros do segundo período não fornecidos ou inválidos.",
				invalid_type_error: "Parâmetros do segundo período não fornecidos ou inválidos.",
			})
			.datetime({ message: "Tipo inválido para parâmetro de período." }),
		before: z
			.string({
				required_error: "Parâmetros do segundo período não fornecidos ou inválidos.",
				invalid_type_error: "Parâmetros do segundo período não fornecidos ou inválidos.",
			})
			.datetime({ message: "Tipo inválido para parâmetro do segundo período." }),
	}),
	total: z.object({
		min: z.number({ invalid_type_error: "Tipo não válido para valor mínimo da venda." }).optional().nullable(),
		max: z.number({ invalid_type_error: "Tipo não válido para valor máximo da venda." }).optional().nullable(),
	}),
	sellers: z.array(z.string({ required_error: "Nome do vendedor não informado.", invalid_type_error: "Tipo não válido para o nome do vendedor." })),
	saleNatures: z.array(
		z.enum(["SN08", "SN03", "SN11", "SN20", "SN04", "SN09", "SN02", "COND", "SN99", "SN01", "SN05"], {
			required_error: "Natureza de venda não informado.",
			invalid_type_error: "Tipo não válido para natureza de venda.",
		}),
	),
	excludedSalesIds: z.array(z.string({ required_error: "ID da venda não informado.", invalid_type_error: "Tipo não válido para o ID da venda." })),
});
export type TStatsComparisonInput = z.infer<typeof StatsComparisonInputSchema>;

type TStatsComparisonReduced = {
	faturamentoBruto: {
		primeiroPeriodo: number;
		segundoPeriodo: number;
	};
	gastoBruto: {
		primeiroPeriodo: number;
		segundoPeriodo: number;
	};
	qtdeVendas: {
		primeiroPeriodo: number;
		segundoPeriodo: number;
	};
	qtdeItensVendidos: {
		primeiroPeriodo: number;
		segundoPeriodo: number;
	};
	diario: {
		primeiroPeriodo: {
			[key: string]: {
				qtdeVendas: number;
				totalVendido: number;
			};
		};
		segundoPeriodo: {
			[key: string]: {
				qtdeVendas: number;
				totalVendido: number;
			};
		};
	};
	porItem: {
		[key: string]: {
			primeiroPeriodo: {
				qtdeVendas: number;
				totalVendido: number;
			};
			segundoPeriodo: {
				qtdeVendas: number;
				totalVendido: number;
			};
		};
	};
	porVendedor: {
		[key: string]: {
			primeiroPeriodo: {
				qtdeVendas: number;
				totalVendido: number;
			};
			segundoPeriodo: {
				qtdeVendas: number;
				totalVendido: number;
			};
		};
	};
};
export type TStatsComparisonOutput = {
	faturamentoBruto: {
		primeiroPeriodo: number;
		segundoPeriodo: number;
	};
	faturamentoLiquido: {
		primeiroPeriodo: number;
		segundoPeriodo: number;
	};

	qtdeVendas: {
		primeiroPeriodo: number;
		segundoPeriodo: number;
	};
	ticketMedio: {
		primeiroPeriodo: number;
		segundoPeriodo: number;
	};
	qtdeItensVendidos: {
		primeiroPeriodo: number;
		segundoPeriodo: number;
	};
	itensPorVendaMedio: {
		primeiroPeriodo: number;
		segundoPeriodo: number;
	};
	valorDiarioVendido: {
		primeiroPeriodo: number;
		segundoPeriodo: number;
	};
	diario: {
		primeiroPeriodo: {
			titulo: string;
			qtdeVendas: number;
			totalVendido: number;
		}[];
		segundoPeriodo: {
			titulo: string;
			qtdeVendas: number;
			totalVendido: number;
		}[];
	};
	porItem: {
		titulo: string;
		primeiroPeriodo: {
			qtdeVendas: number;
			totalVendido: number;
		};
		segundoPeriodo: {
			qtdeVendas: number;
			totalVendido: number;
		};
	}[];
	porVendedor: {
		titulo: string;
		primeiroPeriodo: {
			qtdeVendas: number;
			totalVendido: number;
		};
		segundoPeriodo: {
			qtdeVendas: number;
			totalVendido: number;
		};
	}[];
};
async function fetchStatsComparison(req: NextApiRequest) {
	const filters = StatsComparisonInputSchema.parse(req.body);

	const firstPeriodAjusted = {
		after: new Date(filters.firstPeriod.after),
		before: new Date(filters.firstPeriod.before),
	};

	const secondPeriodAjusted = {
		after: new Date(filters.secondPeriod.after),
		before: new Date(filters.secondPeriod.before),
	};

	const conditions = [];

	if (filters.total.min) conditions.push(gte(sales.valorTotal, filters.total.min));
	if (filters.total.max) conditions.push(lte(sales.valorTotal, filters.total.max));
	if (filters.saleNatures.length > 0) conditions.push(inArray(sales.natureza, filters.saleNatures));
	if (filters.sellers.length > 0) conditions.push(inArray(sales.vendedorNome, filters.sellers));
	if (filters.excludedSalesIds.length > 0) conditions.push(notInArray(sales.id, filters.excludedSalesIds));

	const { points: bestNumberOfPointsForFirstPeriodDates } = getBestNumberOfPointsBetweenDates({
		startDate: firstPeriodAjusted.after,
		endDate: firstPeriodAjusted.before,
	});
	const firstPeriodDatesStrs = getEvenlySpacedDates({
		startDate: firstPeriodAjusted.after,
		endDate: firstPeriodAjusted.before,
		points: bestNumberOfPointsForFirstPeriodDates,
	});

	const firstPeriodDateBuckets = getDateBuckets(firstPeriodDatesStrs);

	const { points: bestNumberOfPointsForSecondPeriodDates } = getBestNumberOfPointsBetweenDates({
		startDate: secondPeriodAjusted.after,
		endDate: secondPeriodAjusted.before,
	});
	const secondPeriodDatesStrs = getEvenlySpacedDates({
		startDate: secondPeriodAjusted.after,
		endDate: secondPeriodAjusted.before,
		points: bestNumberOfPointsForSecondPeriodDates,
	});
	const secondPeriodDateBuckets = getDateBuckets(secondPeriodDatesStrs);

	const firstPeriodSales = await db.query.sales.findMany({
		where: and(gte(sales.dataVenda, firstPeriodAjusted.after), lte(sales.dataVenda, firstPeriodAjusted.before), ...conditions),
		columns: {
			id: true,
			valorTotal: true,
			custoTotal: true,
			dataVenda: true,
			vendedorNome: true,
		},
		with: {
			itens: {
				columns: {
					quantidade: true,
					valorVendaTotalLiquido: true,
				},
				with: {
					produto: {
						columns: {
							descricao: true,
						},
					},
				},
			},
		},
	});
	const secondPeriodSales = await db.query.sales.findMany({
		where: and(gte(sales.dataVenda, secondPeriodAjusted.after), lte(sales.dataVenda, secondPeriodAjusted.before), ...conditions),
		columns: {
			id: true,
			valorTotal: true,
			custoTotal: true,
			dataVenda: true,
			vendedorNome: true,
		},
		with: {
			itens: {
				columns: {
					quantidade: true,
					valorVendaTotalLiquido: true,
				},
				with: {
					produto: {
						columns: {
							descricao: true,
						},
					},
				},
			},
		},
	});

	const firstPeriodStats = firstPeriodSales.reduce(
		(acc: TStatsComparisonReduced, sale) => {
			acc.faturamentoBruto.primeiroPeriodo += sale.valorTotal || 0;
			acc.gastoBruto.primeiroPeriodo += sale.custoTotal || 0;
			acc.qtdeVendas.primeiroPeriodo += 1;
			acc.qtdeItensVendidos.primeiroPeriodo += sale.itens.reduce((acc, item) => acc + (item.quantidade || 0), 0);

			if (!sale.dataVenda) return acc;
			const saleTime = sale.dataVenda.getTime() || 0;
			// Finding the correct - O(1) in average
			const bucket = firstPeriodDateBuckets.find((b) => saleTime >= b.start && saleTime <= b.end);

			if (bucket) {
				// updating daily statistics
				if (acc.diario.primeiroPeriodo[bucket.key]) {
					if (acc.diario.primeiroPeriodo[bucket.key]) {
						acc.diario.primeiroPeriodo[bucket.key]!.totalVendido += sale.valorTotal;
						acc.diario.primeiroPeriodo[bucket.key]!.qtdeVendas += 1;
					}
				}
			}

			// updating per product statistics
			for (const product of sale.itens) {
				if (!acc.porItem[product.produto.descricao]) {
					acc.porItem[product.produto.descricao] = {
						primeiroPeriodo: {
							qtdeVendas: 0,
							totalVendido: 0,
						},
						segundoPeriodo: {
							qtdeVendas: 0,
							totalVendido: 0,
						},
					};
				}
				acc.porItem[product.produto.descricao].primeiroPeriodo.qtdeVendas += product.quantidade;
				acc.porItem[product.produto.descricao].primeiroPeriodo.totalVendido += product.valorVendaTotalLiquido || 0;
			}
			// updating per seller statistics
			if (!acc.porVendedor[sale.vendedorNome]) {
				acc.porVendedor[sale.vendedorNome] = {
					primeiroPeriodo: {
						qtdeVendas: 0,
						totalVendido: 0,
					},
					segundoPeriodo: {
						qtdeVendas: 0,
						totalVendido: 0,
					},
				};
			}
			acc.porVendedor[sale.vendedorNome].primeiroPeriodo.qtdeVendas += 1;
			acc.porVendedor[sale.vendedorNome].primeiroPeriodo.totalVendido += sale.valorTotal || 0;
			return acc;
		},
		{
			faturamentoBruto: {
				primeiroPeriodo: 0,
				segundoPeriodo: 0,
			},
			gastoBruto: {
				primeiroPeriodo: 0,
				segundoPeriodo: 0,
			},
			qtdeVendas: {
				primeiroPeriodo: 0,
				segundoPeriodo: 0,
			},
			qtdeItensVendidos: {
				primeiroPeriodo: 0,
				segundoPeriodo: 0,
			},
			diario: {
				primeiroPeriodo: Object.fromEntries(
					firstPeriodDatesStrs.map((date) => [
						date.toISOString(),
						{
							qtdeVendas: 0,
							totalVendido: 0,
						},
					]),
				),
				segundoPeriodo: Object.fromEntries(
					secondPeriodDatesStrs.map((date) => [
						date.toISOString(),
						{
							qtdeVendas: 0,
							totalVendido: 0,
						},
					]),
				),
			},
			porItem: {},
			porVendedor: {},
		},
	);
	const secondPeriodStats = secondPeriodSales.reduce((acc: TStatsComparisonReduced, sale) => {
		acc.faturamentoBruto.segundoPeriodo += sale.valorTotal || 0;
		acc.gastoBruto.segundoPeriodo += sale.custoTotal || 0;
		acc.qtdeVendas.segundoPeriodo += 1;
		acc.qtdeItensVendidos.segundoPeriodo += sale.itens.reduce((acc, item) => acc + (item.quantidade || 0), 0);

		if (!sale.dataVenda) return acc;
		const saleTime = sale.dataVenda.getTime() || 0;
		// Encontrar o bucket correto - O(1) em média
		const bucket = secondPeriodDateBuckets.find((b) => saleTime >= b.start && saleTime <= b.end);

		if (bucket) {
			// Atualizar estatísticas gerais
			// Atualizar estatísticas do período
			if (acc.diario.segundoPeriodo[bucket.key]) {
				if (acc.diario.segundoPeriodo[bucket.key]) {
					acc.diario.segundoPeriodo[bucket.key]!.totalVendido += sale.valorTotal;
					acc.diario.segundoPeriodo[bucket.key]!.qtdeVendas += 1;
				}
			}
		}
		// updating per product statistics
		for (const product of sale.itens) {
			if (!acc.porItem[product.produto.descricao]) {
				acc.porItem[product.produto.descricao] = {
					primeiroPeriodo: {
						qtdeVendas: 0,
						totalVendido: 0,
					},
					segundoPeriodo: {
						qtdeVendas: 0,
						totalVendido: 0,
					},
				};
			}
			acc.porItem[product.produto.descricao].segundoPeriodo.qtdeVendas += product.quantidade;
			acc.porItem[product.produto.descricao].segundoPeriodo.totalVendido += product.valorVendaTotalLiquido || 0;
		}
		if (!acc.porVendedor[sale.vendedorNome]) {
			// updating per seller statistics
			acc.porVendedor[sale.vendedorNome] = {
				primeiroPeriodo: {
					qtdeVendas: 0,
					totalVendido: 0,
				},
				segundoPeriodo: {
					qtdeVendas: 0,
					totalVendido: 0,
				},
			};
		}
		acc.porVendedor[sale.vendedorNome].segundoPeriodo.qtdeVendas += 1;
		acc.porVendedor[sale.vendedorNome].segundoPeriodo.totalVendido += sale.valorTotal || 0;
		return acc;
	}, firstPeriodStats);

	const statsComparisonResult: TStatsComparisonOutput = {
		faturamentoBruto: {
			primeiroPeriodo: firstPeriodStats.faturamentoBruto.primeiroPeriodo,
			segundoPeriodo: secondPeriodStats.faturamentoBruto.segundoPeriodo,
		},
		faturamentoLiquido: {
			primeiroPeriodo: firstPeriodStats.faturamentoBruto.primeiroPeriodo - firstPeriodStats.gastoBruto.primeiroPeriodo,
			segundoPeriodo: secondPeriodStats.faturamentoBruto.segundoPeriodo - secondPeriodStats.gastoBruto.segundoPeriodo,
		},
		qtdeVendas: {
			primeiroPeriodo: firstPeriodStats.qtdeVendas.primeiroPeriodo,
			segundoPeriodo: secondPeriodStats.qtdeVendas.segundoPeriodo,
		},
		ticketMedio: {
			primeiroPeriodo: firstPeriodStats.faturamentoBruto.primeiroPeriodo / firstPeriodStats.qtdeVendas.primeiroPeriodo,
			segundoPeriodo: secondPeriodStats.faturamentoBruto.segundoPeriodo / secondPeriodStats.qtdeVendas.segundoPeriodo,
		},
		qtdeItensVendidos: {
			primeiroPeriodo: firstPeriodStats.qtdeItensVendidos.primeiroPeriodo,
			segundoPeriodo: secondPeriodStats.qtdeItensVendidos.segundoPeriodo,
		},
		itensPorVendaMedio: {
			primeiroPeriodo: firstPeriodStats.qtdeItensVendidos.primeiroPeriodo / firstPeriodStats.qtdeVendas.primeiroPeriodo,
			segundoPeriodo: secondPeriodStats.qtdeItensVendidos.segundoPeriodo / secondPeriodStats.qtdeVendas.segundoPeriodo,
		},
		valorDiarioVendido: {
			primeiroPeriodo: firstPeriodStats.faturamentoBruto.primeiroPeriodo / firstPeriodDatesStrs.length,
			segundoPeriodo: secondPeriodStats.faturamentoBruto.segundoPeriodo / secondPeriodDatesStrs.length,
		},
		diario: {
			primeiroPeriodo: Object.entries(firstPeriodStats.diario.primeiroPeriodo).map(([key, value]) => ({
				titulo: key,
				qtdeVendas: value.qtdeVendas,
				totalVendido: value.totalVendido,
			})),
			segundoPeriodo: Object.entries(secondPeriodStats.diario.segundoPeriodo).map(([key, value]) => ({
				titulo: key,
				qtdeVendas: value.qtdeVendas,
				totalVendido: value.totalVendido,
			})),
		},
		porItem: Object.entries(firstPeriodStats.porItem)
			.map(([key, value]) => ({
				titulo: key,
				primeiroPeriodo: {
					qtdeVendas: value.primeiroPeriodo.qtdeVendas,
					totalVendido: value.primeiroPeriodo.totalVendido,
				},
				segundoPeriodo: {
					qtdeVendas: value.segundoPeriodo.qtdeVendas,
					totalVendido: value.segundoPeriodo.totalVendido,
				},
			}))
			.sort((a, b) => b.primeiroPeriodo.totalVendido - a.primeiroPeriodo.totalVendido || b.primeiroPeriodo.qtdeVendas - a.primeiroPeriodo.qtdeVendas)
			.slice(0, 25),
		porVendedor: Object.entries(firstPeriodStats.porVendedor)
			.map(([key, value]) => ({
				titulo: key,
				primeiroPeriodo: {
					qtdeVendas: value.primeiroPeriodo.qtdeVendas,
					totalVendido: value.primeiroPeriodo.totalVendido,
				},
				segundoPeriodo: {
					qtdeVendas: value.segundoPeriodo.qtdeVendas,
					totalVendido: value.segundoPeriodo.totalVendido,
				},
			}))
			.sort((a, b) => b.primeiroPeriodo.totalVendido - a.primeiroPeriodo.totalVendido || b.primeiroPeriodo.qtdeVendas - a.primeiroPeriodo.qtdeVendas)
			.slice(0, 25),
	};

	return statsComparisonResult;
}

const handleGetStatsComparison: NextApiHandler<{
	data: TStatsComparisonOutput;
}> = async (req: NextApiRequest, res: NextApiResponse) => {
	const sessionUser = await getCurrentSessionUncached(req.cookies);
	if (!sessionUser) throw new createHttpError.Unauthorized("Você não está autenticado.");
	const statsComparisonResult = await fetchStatsComparison(req);

	return res.status(200).json({
		data: statsComparisonResult,
	});
};

export default apiHandler({
	POST: handleGetStatsComparison,
});
