import { hashAccessSecret } from "@/lib/access/tokens";
import { type DBTransaction, db } from "@/services/drizzle";
import { poiTransactionIdempotencyRequests } from "@/services/drizzle/schema";
import dayjs from "dayjs";
import { and, eq, lt, or, sql } from "drizzle-orm";
import createHttpError from "http-errors";

const POI_IDEMPOTENCY_LEASE_MINUTES = 2;

export const POI_IDEMPOTENCY_PROCESSING_MESSAGE = "Esta transação ainda está sendo processada. Aguarde alguns segundos e tente novamente.";

function hashIdempotencyPayload(payload: unknown) {
	return hashAccessSecret(JSON.stringify(payload));
}

type TPoiIdempotencyExecution<TResult> = {
	result: TResult;
	afterCommit?: () => void | Promise<void>;
};

type TRunPoiTransactionWithIdempotencyParams<TResult> = {
	organizacaoId: string;
	principalId: string | null;
	idempotencyKey: string;
	payload: unknown;
	execute: (tx: DBTransaction) => Promise<TPoiIdempotencyExecution<TResult>>;
};

export async function runPoiTransactionWithIdempotency<TResult>({
	organizacaoId,
	principalId,
	idempotencyKey,
	payload,
	execute,
}: TRunPoiTransactionWithIdempotencyParams<TResult>): Promise<TResult> {
	const payloadHash = hashIdempotencyPayload(payload);
	const tentativaId = crypto.randomUUID();
	const leaseExpiraEm = dayjs().add(POI_IDEMPOTENCY_LEASE_MINUTES, "minutes").toDate();

	const [insertedReservation] = await db
		.insert(poiTransactionIdempotencyRequests)
		.values({ organizacaoId, principalId, idempotencyKey, payloadHash, tentativaId, leaseExpiraEm })
		.onConflictDoNothing({ target: [poiTransactionIdempotencyRequests.organizacaoId, poiTransactionIdempotencyRequests.idempotencyKey] })
		.returning({ id: poiTransactionIdempotencyRequests.id });

	let reservationId = insertedReservation?.id;

	if (!reservationId) {
		const existing = await db.query.poiTransactionIdempotencyRequests.findFirst({
			where: and(
				eq(poiTransactionIdempotencyRequests.organizacaoId, organizacaoId),
				eq(poiTransactionIdempotencyRequests.idempotencyKey, idempotencyKey),
			),
		});
		if (!existing) throw new createHttpError.Conflict(POI_IDEMPOTENCY_PROCESSING_MESSAGE);
		if (existing.payloadHash !== payloadHash) {
			throw new createHttpError.Conflict("A chave de idempotência já foi usada com outra transação.");
		}
		if (existing.status === "CONCLUIDO") return existing.resposta as TResult;

		const [claimedReservation] = await db
			.update(poiTransactionIdempotencyRequests)
			.set({
				status: "PROCESSANDO",
				tentativaId,
				leaseExpiraEm,
				numeroTentativas: sql`${poiTransactionIdempotencyRequests.numeroTentativas} + 1`,
				erro: null,
			})
			.where(
				and(
					eq(poiTransactionIdempotencyRequests.id, existing.id),
					or(
						eq(poiTransactionIdempotencyRequests.status, "ERRO_REPETIVEL"),
						and(eq(poiTransactionIdempotencyRequests.status, "PROCESSANDO"), lt(poiTransactionIdempotencyRequests.leaseExpiraEm, new Date())),
					),
				),
			)
			.returning({ id: poiTransactionIdempotencyRequests.id });

		reservationId = claimedReservation?.id;
		if (!reservationId) {
			const latest = await db.query.poiTransactionIdempotencyRequests.findFirst({
				where: eq(poiTransactionIdempotencyRequests.id, existing.id),
				columns: { status: true, resposta: true },
			});
			if (latest?.status === "CONCLUIDO") return latest.resposta as TResult;
			throw new createHttpError.Conflict(POI_IDEMPOTENCY_PROCESSING_MESSAGE);
		}
	}

	let execution: TPoiIdempotencyExecution<TResult>;
	try {
		execution = await db.transaction(async (tx) => {
			// O lock cobre toda a transação de negócio. Uma retomada com lease vencida
			// aguarda a tentativa anterior confirmar ou reverter antes de assumir a chave.
			const [lockedReservation] = await tx
				.select({ id: poiTransactionIdempotencyRequests.id })
				.from(poiTransactionIdempotencyRequests)
				.where(
					and(
						eq(poiTransactionIdempotencyRequests.id, reservationId as string),
						eq(poiTransactionIdempotencyRequests.tentativaId, tentativaId),
						eq(poiTransactionIdempotencyRequests.status, "PROCESSANDO"),
					),
				)
				.for("update")
				.limit(1);
			if (!lockedReservation) throw new createHttpError.Conflict(POI_IDEMPOTENCY_PROCESSING_MESSAGE);

			const preparedExecution = await execute(tx);
			const [completedReservation] = await tx
				.update(poiTransactionIdempotencyRequests)
				.set({ status: "CONCLUIDO", resposta: preparedExecution.result, erro: null })
				.where(and(eq(poiTransactionIdempotencyRequests.id, lockedReservation.id), eq(poiTransactionIdempotencyRequests.tentativaId, tentativaId)))
				.returning({ id: poiTransactionIdempotencyRequests.id });
			if (!completedReservation) throw new Error("A tentativa perdeu a posse da reserva de idempotência.");

			return preparedExecution;
		});
	} catch (error) {
		await db
			.update(poiTransactionIdempotencyRequests)
			.set({ status: "ERRO_REPETIVEL", erro: error instanceof Error ? error.message : String(error) })
			.where(
				and(
					eq(poiTransactionIdempotencyRequests.id, reservationId),
					eq(poiTransactionIdempotencyRequests.tentativaId, tentativaId),
					eq(poiTransactionIdempotencyRequests.status, "PROCESSANDO"),
				),
			)
			.catch((updateError) => console.error("[POI IDEMPOTENCY] Erro ao registrar falha repetível", updateError));
		throw error;
	}

	await execution.afterCommit?.();
	return execution.result;
}

type TGetPoiTransactionIdempotencyResultParams = {
	organizacaoId: string;
	idempotencyKey: string;
};

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
