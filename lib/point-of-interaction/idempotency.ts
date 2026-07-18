import { hashAccessSecret } from "@/lib/access/tokens";
import { db } from "@/services/drizzle";
import { poiTransactionIdempotencyRequests } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";
import createHttpError from "http-errors";

// Mensagem retryável: o dispositivo distingue "em processamento" (repetir com a mesma chave)
// de rejeição definitiva. Nunca deve ser interpretada como falha da transação (plano §11/§12).
export const POI_IDEMPOTENCY_PROCESSING_MESSAGE = "Esta transação ainda está sendo processada. Aguarde alguns segundos e tente novamente.";

function hashIdempotencyPayload(payload: unknown) {
	return hashAccessSecret(JSON.stringify(payload));
}

type TRunPoiTransactionWithIdempotencyParams<TResult> = {
	organizacaoId: string;
	principalId: string | null;
	idempotencyKey: string;
	payload: unknown;
	execute: () => Promise<TResult>;
};
export async function runPoiTransactionWithIdempotency<TResult>({
	organizacaoId,
	principalId,
	idempotencyKey,
	payload,
	execute,
}: TRunPoiTransactionWithIdempotencyParams<TResult>): Promise<TResult> {
	const payloadHash = hashIdempotencyPayload(payload);

	const existing = await db.query.poiTransactionIdempotencyRequests.findFirst({
		where: and(
			eq(poiTransactionIdempotencyRequests.organizacaoId, organizacaoId),
			eq(poiTransactionIdempotencyRequests.idempotencyKey, idempotencyKey),
		),
	});
	if (existing) {
		if (existing.payloadHash !== payloadHash)
			throw new createHttpError.Conflict("A chave de idempotência já foi usada com outra transação.");
		if (existing.status === "CONCLUIDO" && existing.resposta) return existing.resposta as TResult;
		if (existing.status === "ERRO") {
			// Tentativa anterior falhou sem efeitos persistidos — libera a chave para a repetição.
			await db.delete(poiTransactionIdempotencyRequests).where(eq(poiTransactionIdempotencyRequests.id, existing.id));
		} else {
			throw new createHttpError.Conflict(POI_IDEMPOTENCY_PROCESSING_MESSAGE);
		}
	}

	// Reserva concorrente: a constraint única decide quem processa; o perdedor recebe "em processamento".
	const [reservation] = await db
		.insert(poiTransactionIdempotencyRequests)
		.values({ organizacaoId, principalId, idempotencyKey, payloadHash })
		.onConflictDoNothing({ target: [poiTransactionIdempotencyRequests.organizacaoId, poiTransactionIdempotencyRequests.idempotencyKey] })
		.returning({ id: poiTransactionIdempotencyRequests.id });
	if (!reservation) throw new createHttpError.Conflict(POI_IDEMPOTENCY_PROCESSING_MESSAGE);

	try {
		const result = await execute();
		await db
			.update(poiTransactionIdempotencyRequests)
			.set({ status: "CONCLUIDO", resposta: result })
			.where(eq(poiTransactionIdempotencyRequests.id, reservation.id));
		return result;
	} catch (error) {
		await db
			.update(poiTransactionIdempotencyRequests)
			.set({ status: "ERRO", erro: error instanceof Error ? error.message : String(error) })
			.where(eq(poiTransactionIdempotencyRequests.id, reservation.id))
			.catch((updateError) => console.error("[POI IDEMPOTENCY] Erro ao registrar falha", updateError));
		throw error;
	}
}

type TGetPoiTransactionIdempotencyResultParams = {
	organizacaoId: string;
	idempotencyKey: string;
};
// Consulta do resultado de uma submissão incerta (queda de rede após o envio): o dispositivo
// pergunta pelo desfecho antes de decidir repetir ou apresentar a conclusão.
export async function getPoiTransactionIdempotencyResult({ organizacaoId, idempotencyKey }: TGetPoiTransactionIdempotencyResultParams) {
	const request = await db.query.poiTransactionIdempotencyRequests.findFirst({
		where: and(
			eq(poiTransactionIdempotencyRequests.organizacaoId, organizacaoId),
			eq(poiTransactionIdempotencyRequests.idempotencyKey, idempotencyKey),
		),
		columns: { status: true, resposta: true, erro: true, dataInsercao: true, dataAtualizacao: true },
	});
	return request ?? null;
}
