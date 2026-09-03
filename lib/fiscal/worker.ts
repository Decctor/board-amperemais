import { db } from "@/services/drizzle";
import { fiscalOutboundDocuments } from "@/services/drizzle/schema";
import { eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { getErrorMessage } from "../errors";
import { emitFiscalDocument, syncFiscalDocument } from "./documents";

const MAX_ATTEMPTS = 6;
// Backoff exponencial (minutos) por tentativa.
const BACKOFF_MINUTES = [1, 5, 15, 60, 180, 360];

function nextAttemptDate(attempts: number): Date {
  const index = Math.min(attempts, BACKOFF_MINUTES.length - 1);
  return new Date(Date.now() + BACKOFF_MINUTES[index] * 60_000);
}

// Reagenda (ou encerra) a proxima tentativa do documento. O lock de envio (bloqueadoEm)
// e adquirido e liberado dentro de emitFiscalDocument, dono unico do claim.
async function scheduleNextAttempt(
  documentId: string,
  proximaTentativaEm: Date | null,
) {
  await db
    .update(fiscalOutboundDocuments)
    .set({ proximaTentativaEm })
    .where(eq(fiscalOutboundDocuments.id, documentId));
}

// Processa a fila de emissao fiscal (outbox). Executado por cron.
// 1) Envia documentos prontos / com erro retentavel cuja proxima tentativa venceu.
// 2) Sincroniza documentos em processamento / cancelamento pendente.
export async function processFiscalQueue({
  limit = 25,
}: { limit?: number } = {}) {
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
    if (doc.presencaConsumidorDeclarada) {
      await scheduleNextAttempt(doc.id, null);
      continue;
    }
    if (doc.tipo !== "NFCE" && doc.tipo !== "NFE") {
      await scheduleNextAttempt(doc.id, null);
      continue;
    }

    try {
      // Repassa o encadeamento de devolucao persistido no documento: sem ele a referencia
      // seria recalculada sem o sufixo ":dev:" e a emissao cairia no documento da venda original.
      await emitFiscalDocument({
        vendaId: doc.vendaId as string,
        tipo: doc.tipo,
        organizacaoId: doc.organizacaoId,
        lancamentoContabilId: doc.lancamentoContabilId,
        origem: "AUTOMATICA",
        documentoOrigemId: doc.documentoOrigemId,
        chaveAcessoReferencia: doc.chaveAcessoReferencia,
      });
      // Sucesso, rejeicao ou processamento: nao reagenda automaticamente.
      await scheduleNextAttempt(doc.id, null);
      results.enviados++;
    } catch (error) {
      // 409: outro processo (emissao manual ou worker concorrente) detem o lock de envio.
      // Nao conta como falha nem reagenda; o dono do lock conclui o envio.
      if (createHttpError.isHttpError(error) && error.statusCode === 409)
        continue;
      const attempts = (doc.tentativasEnvio ?? 0) + 1;
      const proxima =
        attempts < MAX_ATTEMPTS ? nextAttemptDate(attempts) : null;
      await scheduleNextAttempt(doc.id, proxima);
      results.falhas++;
      console.error(
        `[FISCAL_WORKER] Falha ao emitir documento ${doc.id}: ${getErrorMessage(error)}`,
      );
    }
  }

  const toSync = await db.query.fiscalOutboundDocuments.findMany({
    where: (fields, operators) =>
      operators.inArray(fields.statusInterno, [
        "EM_PROCESSAMENTO",
        "CANCELAMENTO_PENDENTE",
      ]),
    orderBy: (fields, operators) =>
      operators.asc(fields.dataUltimaSincronizacao),
    limit,
  });

  for (const doc of toSync) {
    try {
      await syncFiscalDocument({
        organizationId: doc.organizacaoId,
        documentId: doc.id,
        source: "CONSULTA_AUTOMATICA",
      });
      results.sincronizados++;
    } catch (error) {
      console.error(
        `[FISCAL_WORKER] Falha ao sincronizar documento ${doc.id}: ${getErrorMessage(error)}`,
      );
    }
  }

  return results;
}
