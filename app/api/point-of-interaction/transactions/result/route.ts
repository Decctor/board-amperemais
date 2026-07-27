import type { TCreatePointOfInteractionTransactionOutput } from "@/app/api/point-of-interaction/new-transaction/route";
import { resolvePoiActorContext } from "@/lib/access/poi-actor";
import { appApiHandler } from "@/lib/app-api";
import { getPoiTransactionIdempotencyResult } from "@/lib/point-of-interaction/idempotency";
import createHttpError from "http-errors";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const GetPoiTransactionResultInputSchema = z.object({
	idempotencyKey: z.string({
		required_error: "Chave de idempotência não informada.",
		invalid_type_error: "Tipo não válido para a chave de idempotência.",
	}),
	// Opcional para dispositivos autenticados (a organização deriva do principal); obrigatório no modo legado.
	orgId: z
		.string({ invalid_type_error: "Tipo não válido para o ID da organização." })
		.optional()
		.nullable(),
});
export type TGetPoiTransactionResultInput = z.infer<typeof GetPoiTransactionResultInputSchema>;

// Resolução de submissão incerta (plano §11/§12): após timeout ou queda de rede, o dispositivo
// consulta o desfecho pela chave antes de decidir entre repetir e apresentar a conclusão.
async function getPoiTransactionResult({ organizacaoId, idempotencyKey }: { organizacaoId: string; idempotencyKey: string }) {
	const request = await getPoiTransactionIdempotencyResult({ organizacaoId, idempotencyKey });
	if (!request) throw new createHttpError.NotFound("Nenhuma transação encontrada para esta chave de idempotência.");

	return {
		data: {
			status: request.status,
			resposta: (request.resposta as TCreatePointOfInteractionTransactionOutput | null) ?? null,
			erro: request.erro,
			dataInsercao: request.dataInsercao,
			dataAtualizacao: request.dataAtualizacao,
		},
		message: "Resultado consultado com sucesso.",
	};
}
export type TGetPoiTransactionResultOutput = Awaited<ReturnType<typeof getPoiTransactionResult>>;

async function getPoiTransactionResultRoute(request: NextRequest) {
	const input = GetPoiTransactionResultInputSchema.parse({
		idempotencyKey: request.nextUrl.searchParams.get("idempotencyKey") ?? undefined,
		orgId: request.nextUrl.searchParams.get("orgId") ?? undefined,
	});
	const resolution = await resolvePoiActorContext({ request, requiredScope: "poi:transactions:create", payloadOrgId: input.orgId });
	const result = await getPoiTransactionResult({ organizacaoId: resolution.organizationId, idempotencyKey: input.idempotencyKey });
	return NextResponse.json(result, { status: 200 });
}

export const GET = appApiHandler({ GET: getPoiTransactionResultRoute });
