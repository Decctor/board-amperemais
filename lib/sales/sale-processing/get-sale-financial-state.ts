import { computeSaleFinancialStatus } from "@/lib/sales/utils";
import { db } from "@/services/drizzle";
import createHttpError from "http-errors";

export async function getSaleFinancialState({ organizationId, saleId }: { organizationId: string; saleId: string }) {
	const sale = await db.query.sales.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.id, saleId), eq(fields.organizacaoId, organizationId)),
		columns: {
			id: true,
			valorTotal: true,
		},
		with: {
			lancamentosContabeis: {
				columns: { id: true },
				with: {
					transacoesFinanceiras: {
						columns: {
							id: true,
							valor: true,
							tipo: true,
							metodo: true,
							contaFinanceiraId: true,
							dataEfetivacao: true,
							dataPrevisao: true,
							provedorStatus: true,
						},
					},
				},
			},
		},
	});

	if (!sale) throw new createHttpError.NotFound("Venda não encontrada.");

	const transactions = sale.lancamentosContabeis.flatMap((entry) => entry.transacoesFinanceiras);
	const status = computeSaleFinancialStatus({ transactions, saleTotal: sale.valorTotal });

	return {
		saleId: sale.id,
		saleTotal: sale.valorTotal,
		status,
		transactions,
		isFullyPaid: status === "RECEBIDA",
	};
}
