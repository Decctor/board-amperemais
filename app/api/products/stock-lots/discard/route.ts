import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import type { TAuthUserSession } from "@/lib/authentication/types";
import { resolveAccountingDefaultAccountIds } from "@/lib/finances/resolve-accounting-default-accounts";
import { applyStockMovement, isStockTrackingActive } from "@/lib/stock/apply-stock-movement";
import { db, type DBTransaction } from "@/services/drizzle";
import { accountingEntries, productStockLots, type TProductStockLot } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const DiscardProductStockLotInputSchema = z.object({
	loteId: z.string({
		required_error: "ID do lote não informado.",
		invalid_type_error: "Tipo inválido para ID do lote.",
	}),
	quantidade: z
		.number({
			required_error: "Quantidade do descarte não informada.",
			invalid_type_error: "Tipo inválido para quantidade do descarte.",
		})
		.positive({ message: "Quantidade do descarte deve ser maior que zero." }),
	motivo: z
		.string({
			required_error: "Motivo do descarte não informado.",
			invalid_type_error: "Tipo inválido para motivo do descarte.",
		})
		.min(1, { message: "Motivo do descarte não informado." }),
});
export type TDiscardProductStockLotInput = z.infer<typeof DiscardProductStockLotInputSchema>;

function getSessionWithOrg(session: TAuthUserSession | null) {
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	if (!session.membership) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");
	return session;
}

/**
 * Custo unitário usado para valorar a perda: o custo médio móvel corrente do produto/variante
 * (mesma base do custeio do sistema) e, quando a organização nunca registrou custo, o custo de
 * origem do lote (item da compra que o criou). Lotes de produção sem custo médio ficam sem valor
 * (as saídas de produção não congelam custo unitário do produto final).
 */
async function resolveDiscardUnitCost({ trx, organizationId, stockLot }: { trx: DBTransaction; organizationId: string; stockLot: TProductStockLot }) {
	if (stockLot.produtoVarianteId) {
		const variant = await trx.query.productVariants.findFirst({
			where: (fields, { and, eq }) => and(eq(fields.id, stockLot.produtoVarianteId ?? ""), eq(fields.organizacaoId, organizationId)),
			columns: { precoCusto: true },
		});
		if (variant?.precoCusto != null) return variant.precoCusto;
	} else {
		const product = await trx.query.products.findFirst({
			where: (fields, { and, eq }) => and(eq(fields.id, stockLot.produtoId), eq(fields.organizacaoId, organizationId)),
			columns: { precoCusto: true },
		});
		if (product?.precoCusto != null) return product.precoCusto;
	}

	if (stockLot.compraItemId) {
		const purchaseItem = await trx.query.purchaseItems.findFirst({
			where: (fields, { and, eq }) => and(eq(fields.id, stockLot.compraItemId ?? ""), eq(fields.organizacaoId, organizationId)),
			columns: { valorUnitarioLiquido: true, valorUnitarioBruto: true },
		});
		if (purchaseItem) return purchaseItem.valorUnitarioLiquido ?? purchaseItem.valorUnitarioBruto ?? null;
	}

	return null;
}

async function discardProductStockLot({ input, session }: { input: TDiscardProductStockLotInput; session: TAuthUserSession }) {
	const organizationId = session.membership?.organizacao.id;
	const userId = session.user.id;
	if (!organizationId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");

	return await db.transaction(async (tx) => {
		const stockLot = await tx.query.productStockLots.findFirst({
			where: (fields, { and, eq }) => and(eq(fields.id, input.loteId), eq(fields.organizacaoId, organizationId)),
		});
		if (!stockLot) throw new createHttpError.NotFound("Lote não encontrado.");
		if (stockLot.status === "DESCARTADO") throw new createHttpError.BadRequest("Lote já descartado.");
		if (stockLot.status === "ESGOTADO") throw new createHttpError.BadRequest("Lote esgotado não pode ser descartado.");
		if (stockLot.quantidadeAtual <= 0) throw new createHttpError.BadRequest("Lote sem saldo disponível para descarte.");
		if (input.quantidade > stockLot.quantidadeAtual) throw new createHttpError.BadRequest("Quantidade de descarte maior que o saldo do lote.");

		const trackingActive = await isStockTrackingActive({
			trx: tx,
			organizationId,
			produtoId: stockLot.produtoId,
			produtoVarianteId: stockLot.produtoVarianteId,
		});
		if (!trackingActive) throw new createHttpError.BadRequest("Produto do lote não possui rastreamento de estoque ativo.");

		const nextQuantity = stockLot.quantidadeAtual - input.quantidade;
		const nextStatus = nextQuantity <= 0 ? "DESCARTADO" : stockLot.status;

		const unitCost = await resolveDiscardUnitCost({ trx: tx, organizationId, stockLot });

		await applyStockMovement({
			trx: tx,
			organizationId,
			userId,
			produtoId: stockLot.produtoId,
			produtoVarianteId: stockLot.produtoVarianteId,
			signedQuantity: -input.quantidade,
			movementType: "DESCARTE",
			reason: input.motivo,
			unitCost,
			links: {
				loteId: stockLot.id,
				producaoId: stockLot.producaoId,
			},
			validateSufficientStock: true,
		});

		const [updatedLot] = await tx
			.update(productStockLots)
			.set({
				quantidadeAtual: Math.max(0, nextQuantity),
				status: nextStatus,
			})
			.where(and(eq(productStockLots.id, stockLot.id), eq(productStockLots.organizacaoId, organizationId)))
			.returning({ id: productStockLots.id });

		if (!updatedLot?.id) throw new createHttpError.InternalServerError("Erro ao descartar lote.");

		// Lançamento contábil da perda: débito em despesa de perdas, crédito baixando o ativo de
		// estoques. Evento não-caixa — nasce sem transações financeiras. Sem custo conhecido não há
		// o que valorar: um lançamento de valor zero é ruído contábil.
		const lossValue = unitCost != null && unitCost > 0 ? Math.round(unitCost * input.quantidade * 100) / 100 : null;
		let lossAccountingEntryId: string | null = null;
		if (lossValue != null && lossValue > 0) {
			const { debitAccountId, creditAccountId } = await resolveAccountingDefaultAccountIds({
				trx: tx,
				orgId: organizationId,
				kind: "perdasEstoque",
				autoProvisionFromSeed: true,
			});
			const [entry] = await tx
				.insert(accountingEntries)
				.values({
					organizacaoId: organizationId,
					loteId: stockLot.id,
					origemTipo: "PERDA_ESTOQUE",
					titulo: `DESCARTE LOTE ${stockLot.codigoLote ?? `#${stockLot.id}`}`,
					anotacoes: input.motivo,
					idContaDebito: debitAccountId,
					idContaCredito: creditAccountId,
					valor: lossValue,
					dataCompetencia: new Date(),
					autorId: userId,
				})
				.returning({ id: accountingEntries.id });
			lossAccountingEntryId = entry?.id ?? null;
			if (!lossAccountingEntryId) throw new createHttpError.InternalServerError("Erro ao criar lançamento contábil da perda.");
		}

		return {
			data: {
				discardedId: updatedLot.id,
				perda: {
					lancamentoContabilId: lossAccountingEntryId,
					valor: lossValue,
					custoUnitario: unitCost,
				},
			},
			message: lossAccountingEntryId
				? "Descarte de lote registrado com sucesso. Lançamento contábil de perda gerado."
				: "Descarte de lote registrado com sucesso. Sem custo conhecido para o produto, nenhum lançamento contábil de perda foi gerado.",
		};
	});
}
export type TDiscardProductStockLotOutput = Awaited<ReturnType<typeof discardProductStockLot>>;

async function discardProductStockLotRoute(request: NextRequest) {
	const session = getSessionWithOrg(await getCurrentSessionUncached());
	const input = DiscardProductStockLotInputSchema.parse(await request.json());
	const result = await discardProductStockLot({ input, session });
	return NextResponse.json(result);
}

export const POST = appApiHandler({ POST: discardProductStockLotRoute });
