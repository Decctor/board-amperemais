import { errorHandler } from "@/lib/app-api";
import { getCurrentSessionUncached } from "@/lib/authentication/session";
import { withPoiTransactionProcessingResult } from "@/lib/point-of-interaction/transaction-requests";
import { db } from "@/services/drizzle";
import { poiTransactionRequests } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";

const RejectPoiTransactionRequestInputSchema = z.object({
	motivoInternoRejeicao: z.string({ invalid_type_error: "Tipo não válido para motivo interno." }).optional().nullable(),
});
export type TRejectPoiTransactionRequestInput = z.infer<typeof RejectPoiTransactionRequestInputSchema>;

async function rejectPoiTransactionRequest({ requestId, input }: { requestId: string; input: TRejectPoiTransactionRequestInput }) {
	const session = await getCurrentSessionUncached();
	if (!session) throw new createHttpError.Unauthorized("Você não está autenticado.");
	if (!session.membership) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");

	const orgId = session.membership.organizacao.id;
	const poiRequest = await db.query.poiTransactionRequests.findFirst({
		where: and(eq(poiTransactionRequests.id, requestId), eq(poiTransactionRequests.organizacaoId, orgId)),
	});

	if (!poiRequest) throw new createHttpError.NotFound("Solicitação não encontrada.");
	if (poiRequest.status !== "PENDENTE") throw new createHttpError.BadRequest("A solicitação não está pendente de aprovação.");

	await db
		.update(poiTransactionRequests)
		.set({
			status: "REJEITADO",
			operadorAprovadorId: session.membership.id,
			operadorAprovadorVendedorId: session.membership.usuarioVendedorId,
			motivoInternoRejeicao: input.motivoInternoRejeicao ?? null,
			resumoSolicitacao: withPoiTransactionProcessingResult({
				resumo: (poiRequest.resumoSolicitacao as never) ?? null,
				resultado: null,
				status: "REJEITADO",
			}),
			dataRejeicao: new Date(),
			dataAtualizacao: new Date(),
		})
		.where(eq(poiTransactionRequests.id, requestId));

	return {
		data: { id: requestId },
		message: "Solicitação rejeitada com sucesso.",
	};
}
export type TRejectPoiTransactionRequestOutput = Awaited<ReturnType<typeof rejectPoiTransactionRequest>>;

export async function POST(request: NextRequest, { params }: { params: Promise<{ requestId: string }> }) {
	try {
		const { requestId } = await params;
		const body = await request.json().catch(() => ({}));
		const input = RejectPoiTransactionRequestInputSchema.parse(body);
		const result = await rejectPoiTransactionRequest({ requestId, input });
		return NextResponse.json(result);
	} catch (error) {
		return errorHandler(error);
	}
}
