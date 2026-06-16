import { reverseSaleCashback } from "@/lib/cashback/reverse-sale-cashback";
import { db } from "@/services/drizzle";
import {
	accountingEntries,
	financialTransactions,
	productStockTransactions,
	productVariants,
	products,
	sales,
} from "@/services/drizzle/schema";
import { and, eq, sql } from "drizzle-orm";
import createHttpError from "http-errors";

export async function processConfirmedSaleCancellation({
	organizationId,
	saleId,
	authorId,
	reason,
}: {
	organizationId: string;
	saleId: string;
	authorId: string;
	reason: string;
}) {
	const sale = await db.query.sales.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.id, saleId), eq(fields.organizacaoId, organizationId)),
		with: {
			documentosFiscais: { columns: { id: true, statusInterno: true } },
			lancamentosContabeis: {
				columns: { id: true, idContaDebito: true, idContaCredito: true, valor: true },
				with: { transacoesFinanceiras: true },
			},
			movimentacoesEstoque: true,
		},
	});
	if (!sale) throw new createHttpError.NotFound("Venda não encontrada.");
	if (sale.statusVenda !== "CONFIRMADA") throw new createHttpError.BadRequest("Somente vendas confirmadas podem ser canceladas por este processo.");
	if (sale.documentosFiscais.some((document) => !["CANCELADO", "INUTILIZADO"].includes(document.statusInterno ?? ""))) {
		throw new createHttpError.BadRequest("Cancele o documento fiscal da venda antes de cancelar o pedido.");
	}

	await db.transaction(async (tx) => {
		if (sale.clienteId) {
			await reverseSaleCashback({ tx, saleId, clientId: sale.clienteId, organizationId, reason });
		}

		for (const transaction of sale.lancamentosContabeis.flatMap((entry) => entry.transacoesFinanceiras)) {
			await tx
				.update(financialTransactions)
				.set({ provedorStatus: transaction.dataEfetivacao ? "ESTORNADO" : "CANCELADO" })
				.where(eq(financialTransactions.id, transaction.id));
		}
		const originalEntry = sale.lancamentosContabeis[0];
		if (originalEntry) {
			await tx.insert(accountingEntries).values({
				organizacaoId: organizationId,
				vendaId: saleId,
				origemTipo: "VENDA",
				titulo: `ESTORNO VENDA #${saleId}`,
				anotacoes: reason,
				idContaDebito: originalEntry.idContaCredito,
				idContaCredito: originalEntry.idContaDebito,
				valor: originalEntry.valor,
				dataCompetencia: new Date(),
				autorId: authorId,
			});
		}

		for (const movement of sale.movimentacoesEstoque.filter((item) => item.tipo === "SAIDA")) {
			if (movement.produtoVarianteId) {
				await tx
					.update(productVariants)
					.set({ quantidade: sql`${productVariants.quantidade} + ${movement.quantidade}` })
					.where(and(eq(productVariants.id, movement.produtoVarianteId), eq(productVariants.organizacaoId, organizationId)));
			} else {
				await tx
					.update(products)
					.set({ quantidade: sql`${products.quantidade} + ${movement.quantidade}` })
					.where(and(eq(products.id, movement.produtoId), eq(products.organizacaoId, organizationId)));
			}
			await tx.insert(productStockTransactions).values({
				organizacaoId: organizationId,
				produtoId: movement.produtoId,
				produtoVarianteId: movement.produtoVarianteId,
				tipo: "ENTRADA_DEVOLUCAO",
				quantidade: movement.quantidade,
				motivo: `Estorno de venda cancelada: ${reason}`,
				vendaId: saleId,
				vendaItemId: movement.vendaItemId,
				operadorId: authorId,
			});
		}

		await tx
			.update(sales)
			.set({
				statusVenda: "CANCELADA",
				statusAtendimento: "CANCELADO",
				observacoes: [sale.observacoes, `Cancelamento: ${reason}`].filter(Boolean).join("\n"),
			})
			.where(and(eq(sales.id, saleId), eq(sales.organizacaoId, organizationId)));
	});

	return { saleId, statusVenda: "CANCELADA" as const, statusAtendimento: "CANCELADO" as const };
}
