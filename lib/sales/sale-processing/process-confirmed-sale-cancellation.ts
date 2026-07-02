import { reverseSaleCashback } from "@/lib/cashback/reverse-sale-cashback";
import { cancelCouponRedemption } from "@/lib/coupons/redemption";
import { applyStockMovement } from "@/lib/stock/apply-stock-movement";
import { db } from "@/services/drizzle";
import { accountingEntries, couponRedemptions, financialTransactions, productStockLots, sales } from "@/services/drizzle/schema";
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

		// Devolve o uso de cupons da venda: marca o resgate como CANCELADO e reincrementa a atribuição.
		const saleCouponRedemptions = await tx.query.couponRedemptions.findMany({
			where: and(eq(couponRedemptions.vendaId, saleId), eq(couponRedemptions.organizacaoId, organizationId), eq(couponRedemptions.status, "UTILIZADO")),
			columns: { id: true },
		});
		for (const redemption of saleCouponRedemptions) {
			await cancelCouponRedemption({ trx: tx, organizacaoId: organizationId, redemptionId: redemption.id });
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
			await applyStockMovement({
				trx: tx,
				organizationId,
				userId: authorId,
				produtoId: movement.produtoId,
				produtoVarianteId: movement.produtoVarianteId,
				signedQuantity: movement.quantidade,
				movementType: "ENTRADA_DEVOLUCAO",
				reason: `Estorno de venda cancelada: ${reason}`,
				unitCost: movement.custoUnitarioMovimentado,
				links: {
					loteId: movement.loteId,
					vendaId: saleId,
					vendaItemId: movement.vendaItemId,
				},
			});

			if (movement.loteId) {
				const stockLot = await tx.query.productStockLots.findFirst({
					where: and(eq(productStockLots.id, movement.loteId), eq(productStockLots.organizacaoId, organizationId)),
					columns: { id: true, dataValidade: true, status: true },
				});

				if (stockLot) {
					const nextStatus =
						stockLot.status === "DESCARTADO" ? "DESCARTADO" : stockLot.dataValidade && stockLot.dataValidade < new Date() ? "VENCIDO" : "ATIVO";
					await tx
						.update(productStockLots)
						.set({
							quantidadeAtual: sql`${productStockLots.quantidadeAtual} + ${movement.quantidade}`,
							status: nextStatus,
						})
						.where(and(eq(productStockLots.id, movement.loteId), eq(productStockLots.organizacaoId, organizationId)));
				}
			}
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
