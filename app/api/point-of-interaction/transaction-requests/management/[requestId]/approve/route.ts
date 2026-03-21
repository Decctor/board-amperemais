import {
	CreatePointOfInteractionTransactionRequestInputSchema,
	processPointOfInteractionTransaction,
} from "@/app/api/point-of-interaction/new-transaction/route";
import { errorHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { getErrorMessage } from "@/lib/errors";
import { withPoiTransactionProcessingResult } from "@/lib/point-of-interaction/transaction-requests";
import { db } from "@/services/drizzle";
import { poiTransactionRequests } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { NextRequest, NextResponse } from "next/server";

async function approvePoiTransactionRequest({ requestId }: { requestId: string }) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	if (!session.membership) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");
	if (!session.membership.usuarioVendedorId) throw new createHttpError.BadRequest("Seu usuário não possui vendedor vinculado para aprovar esta solicitação.");

	const orgId = session.membership.organizacao.id;
	const poiRequest = await db.query.poiTransactionRequests.findFirst({
		where: and(eq(poiTransactionRequests.id, requestId), eq(poiTransactionRequests.organizacaoId, orgId)),
	});

	if (!poiRequest) throw new createHttpError.NotFound("Solicitação não encontrada.");
	if (poiRequest.status !== "PENDENTE") throw new createHttpError.BadRequest("A solicitação não está pendente de aprovação.");

	await db
		.update(poiTransactionRequests)
		.set({
			status: "PROCESSANDO",
			operadorAprovadorId: session.membership.id,
			operadorAprovadorVendedorId: session.membership.usuarioVendedorId,
			dataAtualizacao: new Date(),
		})
		.where(eq(poiTransactionRequests.id, requestId));

	try {
		const input = CreatePointOfInteractionTransactionRequestInputSchema.parse(poiRequest.payloadSolicitacao);
		const result = await processPointOfInteractionTransaction({
			input,
			operatorContext: {
				operatorSellerId: session.membership.usuarioVendedorId,
				operatorUserId: session.user.id,
			},
		});

		await db
			.update(poiTransactionRequests)
			.set({
				status: "APROVADO",
				operadorAprovadorId: session.membership.id,
				operadorAprovadorVendedorId: session.membership.usuarioVendedorId,
				vendaId: result.data.saleId,
				transacaoAcumuloId: result.data.transactionAccumulationId ?? null,
				transacaoResgateId: result.data.transactionRedemptionId ?? null,
				resumoSolicitacao: withPoiTransactionProcessingResult({
					resumo: (poiRequest.resumoSolicitacao as never) ?? null,
					resultado: result.data,
					status: "APROVADO",
				}),
				dataAprovacao: new Date(),
				dataAtualizacao: new Date(),
				erroProcessamento: null,
			})
			.where(eq(poiTransactionRequests.id, requestId));

		return {
			data: result.data,
			message: "Solicitação aprovada com sucesso.",
		};
	} catch (error) {
		const errorMessage = getErrorMessage(error);
		await db
			.update(poiTransactionRequests)
			.set({
				status: "ERRO",
				resumoSolicitacao: withPoiTransactionProcessingResult({
					resumo: (poiRequest.resumoSolicitacao as never) ?? null,
					resultado: null,
					status: "ERRO",
				}),
				erroProcessamento: errorMessage,
				dataAtualizacao: new Date(),
			})
			.where(eq(poiTransactionRequests.id, requestId));
		throw error;
	}
}

export async function POST(_request: NextRequest, { params }: { params: Promise<{ requestId: string }> }) {
	try {
		const { requestId } = await params;
		const result = await approvePoiTransactionRequest({ requestId });
		return NextResponse.json(result);
	} catch (error) {
		return errorHandler(error);
	}
}
