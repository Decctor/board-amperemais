import { accumulateCashbackForClient } from "@/lib/cashback/accumulation";
import { db } from "@/services/drizzle";
import { cashbackProgramTransactions, cashbackPrograms } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { getSaleFinancialState } from "./get-sale-financial-state";

export async function processSaleCashbackAccumulationIfEligible({
	organizationId,
	saleId,
	authorId,
}: {
	organizationId: string;
	saleId: string;
	authorId?: string | null;
}) {
	const [sale, financialState] = await Promise.all([
		db.query.sales.findFirst({
			where: (fields, { and, eq }) => and(eq(fields.id, saleId), eq(fields.organizacaoId, organizationId)),
			columns: {
				id: true,
				clienteId: true,
				valorTotal: true,
				vendedorId: true,
				canal: true,
				processamentoOrigem: true,
				statusVenda: true,
			},
		}),
		getSaleFinancialState({ organizationId, saleId }),
	]);

	if (!sale) throw new createHttpError.NotFound("Venda não encontrada.");
	if (!sale.clienteId || sale.statusVenda !== "CONFIRMADA" || !financialState.isFullyPaid) return null;

	return db.transaction(async (tx) => {
		const existing = await tx.query.cashbackProgramTransactions.findFirst({
			where: and(
				eq(cashbackProgramTransactions.organizacaoId, organizationId),
				eq(cashbackProgramTransactions.vendaId, saleId),
				eq(cashbackProgramTransactions.tipo, "ACÚMULO"),
			),
			columns: { id: true },
		});
		if (existing) return { transactionId: existing.id, alreadyProcessed: true };

		const program = await tx.query.cashbackPrograms.findFirst({
			where: and(eq(cashbackPrograms.organizacaoId, organizationId), eq(cashbackPrograms.ativo, true)),
		});
		if (!program) return null;

		const result = await accumulateCashbackForClient({
			tx,
			orgId: organizationId,
			clientId: sale.clienteId!,
			saleId,
			saleValue: sale.valorTotal,
			operatorId: authorId ?? null,
			operatorSellerId: sale.vendedorId,
			program,
			metadata: {
				origem: sale.canal ?? "INTERNO",
				processamentoOrigem: sale.processamentoOrigem,
			},
		});

		return { ...result, alreadyProcessed: false };
	});
}
