import { appApiHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { processConfirmedSaleCancellation } from "@/lib/sale-processing";
import { db } from "@/services/drizzle";
import { sales } from "@/services/drizzle/schema";
import { eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

// ============================================================================
// INPUT SCHEMA
// ============================================================================

const CancelSaleInputSchema = z.object({
	id: z.string({ required_error: "ID da venda não informado." }),
	reason: z
		.string({ invalid_type_error: "Tipo não válido para motivo do cancelamento." })
		.trim()
		.min(3)
		.optional()
		.default("Cancelamento solicitado pelo usuário."),
});

// ============================================================================
// HANDLER
// ============================================================================

async function cancelSale(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	if (!session.membership) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");

	const { searchParams } = new URL(request.url);
	const input = CancelSaleInputSchema.parse({ id: searchParams.get("id"), reason: searchParams.get("reason") ?? undefined });

	const orgId = session.membership.organizacao.id;

	// Verify the sale exists, belongs to the org, and is in ORCAMENTO status
	const existing = await db.query.sales.findFirst({
		where: (fields, { and, eq }) => and(eq(fields.id, input.id), eq(fields.organizacaoId, orgId)),
		columns: { id: true, statusVenda: true },
	});

	if (!existing) throw new createHttpError.NotFound("Venda não encontrada.");
	if (existing.statusVenda === "CONFIRMADA") {
		if (!session.membership.permissoes.vendas.excluir)
			throw new createHttpError.Forbidden("Você não possui permissão para cancelar vendas confirmadas.");
		const result = await processConfirmedSaleCancellation({
			organizationId: orgId,
			saleId: input.id,
			authorId: session.user.id,
			reason: input.reason,
		});
		return NextResponse.json({ data: result, message: "Venda cancelada com sucesso." });
	}
	if (existing.statusVenda !== "ORCAMENTO") {
		throw new createHttpError.BadRequest("A venda não pode ser cancelada no status atual.");
	}

	await db.update(sales).set({ statusVenda: "CANCELADA", statusAtendimento: "CANCELADO" }).where(eq(sales.id, input.id));

	return NextResponse.json({
		data: { saleId: input.id },
		message: "Rascunho de venda cancelado com sucesso.",
	});
}

export const POST = appApiHandler({ POST: cancelSale });
