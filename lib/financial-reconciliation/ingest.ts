import { db } from "@/services/drizzle";
import { financialStatementTransactions, type TNewFinancialStatementTransaction } from "@/services/drizzle/schema";
import { STATEMENT_OFX_EXTENSIONS } from "./constants";
import { computeStatementLineHash, type TCanonicalStatementLine, type TParsedStatement } from "./normalize";
import { extractStatementFromDocument } from "./parse/document";
import { looksLikeOfx, parseOfxStatement } from "./parse/ofx";
import { parseTabularStatement } from "./parse/tabular";

export type TStatementFileKind = "OFX" | "PLANILHA" | "DOCUMENTO";

/** Decide o parser pelo conteúdo/extensão/mime — OFX chega como octet-stream com frequência. */
export function detectStatementFileKind({ fileName, mimeType, buffer }: { fileName: string; mimeType: string; buffer: Buffer }): TStatementFileKind {
	const lowerName = fileName.toLowerCase();
	if (STATEMENT_OFX_EXTENSIONS.some((extension) => lowerName.endsWith(extension)) || looksLikeOfx(buffer)) return "OFX";
	if (mimeType === "application/pdf" || mimeType.startsWith("image/")) return "DOCUMENTO";
	return "PLANILHA";
}

export async function parseStatementFile({
	fileName,
	mimeType,
	buffer,
}: {
	fileName: string;
	mimeType: string;
	buffer: Buffer;
}): Promise<TParsedStatement & { formato: TStatementFileKind }> {
	const formato = detectStatementFileKind({ fileName, mimeType, buffer });
	if (formato === "OFX") return { ...parseOfxStatement(buffer), formato };
	if (formato === "DOCUMENTO") return { ...(await extractStatementFromDocument({ buffer, mimeType })), formato };
	return { ...(await parseTabularStatement(buffer)), formato };
}

/**
 * Persiste as linhas canônicas com idempotência: os índices únicos (conta, idExterno) e
 * (conta, hash) fazem reimportações do mesmo extrato — ou períodos sobrepostos — pularem as
 * linhas já existentes via ON CONFLICT DO NOTHING.
 */
export async function ingestStatementLines({
	organizacaoId,
	contaFinanceiraId,
	importacaoId,
	linhas,
}: {
	organizacaoId: string;
	contaFinanceiraId: string;
	importacaoId: string;
	linhas: TCanonicalStatementLine[];
}) {
	if (linhas.length === 0) return { inseridas: [] as { id: string }[], duplicadas: 0 };

	// Ocorrência estável por grupo de linhas idênticas sem idExterno (ver computeStatementLineHash).
	const occurrenceByKey = new Map<string, number>();
	const rows: TNewFinancialStatementTransaction[] = linhas.map((linha) => {
		let ocorrencia = 0;
		if (!linha.idExterno) {
			const key = computeStatementLineHash({ contaFinanceiraId, linha: { ...linha, idExterno: null } });
			ocorrencia = occurrenceByKey.get(key) ?? 0;
			occurrenceByKey.set(key, ocorrencia + 1);
		}
		return {
			organizacaoId,
			importacaoId,
			contaFinanceiraId,
			dataTransacao: linha.dataTransacao,
			descricao: linha.descricao,
			tipo: linha.tipo,
			valor: linha.valor,
			metodo: linha.metodo,
			idExterno: linha.idExterno,
			hash: computeStatementLineHash({ contaFinanceiraId, linha, ocorrencia }),
			metadados: linha.metadados,
		};
	});

	const inseridas = await db
		.insert(financialStatementTransactions)
		.values(rows)
		.onConflictDoNothing()
		.returning({ id: financialStatementTransactions.id });

	return { inseridas, duplicadas: rows.length - inseridas.length };
}
