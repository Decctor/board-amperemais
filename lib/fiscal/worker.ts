import { db } from "@/services/drizzle";
import { fiscalOutboundDocuments } from "@/services/drizzle/schema";
import { and, eq, isNull, lte, or } from "drizzle-orm";
import { getErrorMessage } from "../errors";
import { emitFiscalDocument, syncFiscalDocument } from "./documents";

const MAX_ATTEMPTS = 6;
// Backoff exponencial (minutos) por tentativa.
const BACKOFF_MINUTES = [1, 5, 15, 60, 180, 360];
// Apos esse tempo, um lock e considerado obsoleto (processo anterior morreu) e pode ser reclamado.
const STALE_LOCK_MINUTES = 15;

function nextAttemptDate(attempts: number): Date {
	const index = Math.min(attempts, BACKOFF_MINUTES.length - 1);
	return new Date(Date.now() + BACKOFF_MINUTES[index] * 60_000);
}

// Claim atomico do documento: marca bloqueadoEm somente se estiver livre ou com lock obsoleto.
async function claimDocument(documentId: string): Promise<boolean> {
	const staleThreshold = new Date(Date.now() - STALE_LOCK_MINUTES * 60_000);
	const claimed = await db
		.update(fiscalOutboundDocuments)
		.set({ bloqueadoEm: new Date() })
		.where(and(eq(fiscalOutboundDocuments.id, documentId), or(isNull(fiscalOutboundDocuments.bloqueadoEm), lte(fiscalOutboundDocuments.bloqueadoEm, staleThreshold))))
		.returning({ id: fiscalOutboundDocuments.id });
	return claimed.length > 0;
}

async function releaseDocument(documentId: string, proximaTentativaEm: Date | null) {
	await db.update(fiscalOutboundDocuments).set({ bloqueadoEm: null, proximaTentativaEm }).where(eq(fiscalOutboundDocuments.id, documentId));
}

// Processa a fila de emissao fiscal (outbox). Executado por cron.
// 1) Envia documentos prontos / com erro retentavel cuja proxima tentativa venceu.
// 2) Sincroniza documentos em processamento / cancelamento pendente.
export async function processFiscalQueue({ limit = 25 }: { limit?: number } = {}) {
	const now = new Date();
	const results = { enviados: 0, falhas: 0, sincronizados: 0 };

	const toSend = await db.query.fiscalOutboundDocuments.findMany({
		where: (fields, operators) =>
			operators.and(
				operators.inArray(fields.statusInterno, ["PRONTO_PARA_ENVIO", "ERRO"]),
				operators.lt(fields.tentativasEnvio, MAX_ATTEMPTS),
				operators.isNotNull(fields.proximaTentativaEm),
				operators.lte(fields.proximaTentativaEm, now),
				operators.isNotNull(fields.vendaId),
			),
		orderBy: (fields, operators) => operators.asc(fields.proximaTentativaEm),
		limit,
	});

	for (const doc of toSend) {
		if (!(await claimDocument(doc.id))) continue;

		if (doc.tipo !== "NFCE" && doc.tipo !== "NFE") {
			await releaseDocument(doc.id, null);
			continue;
		}

		try {
			await emitFiscalDocument({
				vendaId: doc.vendaId as string,
				tipo: doc.tipo,
				organizacaoId: doc.organizacaoId,
				lancamentoContabilId: doc.lancamentoContabilId,
				origem: "AUTOMATICA",
			});
			// Sucesso, rejeicao ou processamento: nao reagenda automaticamente.
			await releaseDocument(doc.id, null);
			results.enviados++;
		} catch (error) {
			const attempts = (doc.tentativasEnvio ?? 0) + 1;
			const proxima = attempts < MAX_ATTEMPTS ? nextAttemptDate(attempts) : null;
			await releaseDocument(doc.id, proxima);
			results.falhas++;
			console.error(`[FISCAL_WORKER] Falha ao emitir documento ${doc.id}: ${getErrorMessage(error)}`);
		}
	}

	const toSync = await db.query.fiscalOutboundDocuments.findMany({
		where: (fields, operators) => operators.inArray(fields.statusInterno, ["EM_PROCESSAMENTO", "CANCELAMENTO_PENDENTE"]),
		orderBy: (fields, operators) => operators.asc(fields.dataUltimaSincronizacao),
		limit,
	});

	for (const doc of toSync) {
		try {
			await syncFiscalDocument({ organizationId: doc.organizacaoId, documentId: doc.id });
			results.sincronizados++;
		} catch (error) {
			console.error(`[FISCAL_WORKER] Falha ao sincronizar documento ${doc.id}: ${getErrorMessage(error)}`);
		}
	}

	return results;
}
