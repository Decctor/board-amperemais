import type { TExternalEventSourceEnum } from "@/schemas/enums";
import { db } from "@/services/drizzle";
import { externalEvents } from "@/services/drizzle/schema";
import { and, eq } from "drizzle-orm";
import { computeExternalEventIdempotencyKey } from "./payload-hash";

const PROCESSING_ERROR_MAX_LENGTH = 2000;

/**
 * Arquiva um payload de webhook no inbox — chamado após a autenticação e ANTES de qualquer
 * processamento. **Contrato durável**: se o insert falhar, a exceção propaga e o route
 * handler devolve 5xx — o provider reentrega (redelivery inócua: chave de idempotência aqui,
 * índice de wamid e idempotencyKey da fila no processamento). "Catch + 200" seria payload
 * perdido com o provider achando que entregou.
 *
 * Retry com body idêntico colapsa na linha existente (`duplicate: true`) — o processamento
 * roda de novo mesmo assim, preservando o comportamento atual de redeliveries.
 */
export async function archiveExternalEvent({
	origem,
	tipo,
	payload,
}: {
	origem: TExternalEventSourceEnum;
	tipo: string;
	payload: unknown;
}): Promise<{ id: string; duplicate: boolean }> {
	const chaveIdempotencia = computeExternalEventIdempotencyKey(payload);

	const inserted = await db
		.insert(externalEvents)
		.values({ origem, tipo, chaveIdempotencia, payload })
		.onConflictDoNothing({ target: [externalEvents.origem, externalEvents.chaveIdempotencia] })
		.returning({ id: externalEvents.id });
	if (inserted[0]) return { id: inserted[0].id, duplicate: false };

	const existing = await db.query.externalEvents.findFirst({
		where: and(eq(externalEvents.origem, origem), eq(externalEvents.chaveIdempotencia, chaveIdempotencia)),
		columns: { id: true },
	});
	if (!existing) throw new Error("Falha ao arquivar evento externo: conflito no insert e linha não encontrada.");
	return { id: existing.id, duplicate: true };
}

/**
 * Executa o processador de um evento arquivado e registra o desfecho na linha do inbox
 * (status + data + erro truncado + backfill de organização). Nunca lança: é o adapter usado
 * sob `waitUntil` nos webhooks e pelo script de replay — o desfecho volta como retorno.
 *
 * O processador (`run`) DEVE lançar em falha (não suprimir com catch interno), senão o
 * status mente e o replay reporta sucesso falso.
 */
export async function runArchivedEventProcessing({
	eventId,
	run,
	resolveOrganizationId,
}: {
	eventId: string;
	run: () => Promise<void>;
	/** Best-effort: falha na resolução não derruba o processamento, só deixa a org em null. */
	resolveOrganizationId?: () => Promise<string | null>;
}): Promise<"PROCESSADO" | "FALHOU"> {
	let organizacaoId: string | null = null;
	try {
		organizacaoId = (await resolveOrganizationId?.()) ?? null;
	} catch (error) {
		console.error(`[EXTERNAL_EVENTS] Falha ao resolver organização do evento ${eventId}:`, error);
	}

	let status: "PROCESSADO" | "FALHOU" = "PROCESSADO";
	let processingError: string | null = null;
	try {
		await run();
	} catch (error) {
		status = "FALHOU";
		const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
		processingError = message.slice(0, PROCESSING_ERROR_MAX_LENGTH);
		console.error(`[EXTERNAL_EVENTS] Falha no processamento do evento ${eventId}:`, error);
	}

	try {
		await db
			.update(externalEvents)
			.set({
				processamentoStatus: status,
				processamentoData: new Date(),
				processamentoUltimoErro: processingError,
				...(organizacaoId ? { organizacaoId } : {}),
			})
			.where(eq(externalEvents.id, eventId));
	} catch (error) {
		console.error(`[EXTERNAL_EVENTS] Falha ao registrar o desfecho do evento ${eventId}:`, error);
	}

	return status;
}
