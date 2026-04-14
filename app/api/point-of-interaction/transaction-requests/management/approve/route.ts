import {
	CreatePointOfInteractionTransactionRequestInputSchema,
	processPointOfInteractionTransaction,
} from "@/app/api/point-of-interaction/new-transaction/route";
import { appApiHandler, errorHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { getErrorMessage } from "@/lib/errors";
import { withPoiTransactionProcessingResult } from "@/lib/point-of-interaction/transaction-requests";
import { db } from "@/services/drizzle";
import { poiTransactionRequests } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { TAuthUserSession } from "@/lib/authentication/types";

const ApprovePoiTransactionRequestInputSchema = z.object({
	requestId: z.string({ invalid_type_error: "Tipo não válido para ID da solicitação." }),
	operatorIdentifier: z.string({ invalid_type_error: "Tipo não válido para identificador do operador." }).optional().nullable(),
});
export type TApprovePoiTransactionRequestInput = z.infer<typeof ApprovePoiTransactionRequestInputSchema>;
async function approvePoiTransactionRequest({ session, input }: { session: TAuthUserSession; input: TApprovePoiTransactionRequestInput }) {
	const membership = session.membership;
	if (!membership) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização para aprovar esta solicitação.");

	const orgId = membership.organizacao.id;
	const operatorUserId = session.user.id;
	const operatorMembershipId = membership.id;
	let operatorSellerId: string | null = null;

	const { requestId, operatorIdentifier } = input;
	if (operatorIdentifier) {
		const operator = await db.query.sellers.findFirst({
			where: (fields, { and, eq }) => and(eq(fields.senhaOperador, operatorIdentifier), eq(fields.organizacaoId, orgId)),
		});
		if (!operator) throw new createHttpError.Unauthorized("Operador não encontrado para a senha informada.");
		operatorSellerId = operator.id;
	} else {
		if (!membership.usuarioVendedorId) throw new createHttpError.BadRequest("Seu usuário não possui vendedor vinculado para aprovar esta solicitação.");
		operatorSellerId = membership.usuarioVendedorId;
	}
	const poiRequest = await db.query.poiTransactionRequests.findFirst({
		where: and(eq(poiTransactionRequests.id, requestId), eq(poiTransactionRequests.organizacaoId, orgId)),
	});

	if (!poiRequest) throw new createHttpError.NotFound("Solicitação não encontrada.");
	if (poiRequest.status !== "PENDENTE") throw new createHttpError.BadRequest("A solicitação não está pendente de aprovação.");

	await db
		.update(poiTransactionRequests)
		.set({
			status: "PROCESSANDO",
			operadorAprovadorId: operatorMembershipId,
			operadorAprovadorVendedorId: operatorSellerId,
			dataAtualizacao: new Date(),
		})
		.where(eq(poiTransactionRequests.id, requestId));

	try {
		const input = CreatePointOfInteractionTransactionRequestInputSchema.parse(poiRequest.payloadSolicitacao);
		const result = await processPointOfInteractionTransaction({
			input,
			operatorContext: {
				operatorSellerId: operatorSellerId,
				operatorUserId: operatorUserId,
			},
		});

		await db
			.update(poiTransactionRequests)
			.set({
				status: "APROVADO",
				operadorAprovadorId: operatorMembershipId,
				operadorAprovadorVendedorId: operatorSellerId,
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
export type TApprovePoiTransactionRequestOutput = Awaited<ReturnType<typeof approvePoiTransactionRequest>>;
async function approvePoiTransactionRequestHandler(request: NextRequest) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	if (!session.membership) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");

	const payload = await request.json();
	const input = ApprovePoiTransactionRequestInputSchema.parse(payload);
	const result = await approvePoiTransactionRequest({
		session,
		input,
	});
	return NextResponse.json(result);
}
export const POST = appApiHandler({ POST: approvePoiTransactionRequestHandler });
