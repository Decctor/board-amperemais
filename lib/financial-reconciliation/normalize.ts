import { createHash } from "node:crypto";
import type { TFinancialTransactionTypeEnum, TPaymentMethodEnum } from "@/schemas/enums";

/**
 * Linha canônica de extrato — saída comum de todos os parsers (OFX, planilha, documento IA,
 * OpenFinance). `valor` é sempre positivo; o sentido fica em `tipo`.
 */
export type TCanonicalStatementLine = {
	dataTransacao: Date;
	descricao: string;
	tipo: TFinancialTransactionTypeEnum;
	valor: number;
	metodo: TPaymentMethodEnum | null;
	idExterno: string | null;
	metadados: Record<string, unknown> | null;
};

/** Resultado comum dos parsers: linhas + dados de sanidade detectados do extrato. */
export type TParsedStatement = {
	linhas: TCanonicalStatementLine[];
	periodoInicio: Date | null;
	periodoFim: Date | null;
	saldoInicial: number | null;
	saldoFinal: number | null;
	avisos: string[];
};

/** Normaliza descrição para hash/regras: sem acentos, minúsculas, dígitos longos e espaços colapsados. */
export function normalizeStatementDescription(descricao: string) {
	return (
		descricao
			.normalize("NFD")
			.replace(/[̀-ͯ]/g, "")
			.toLowerCase()
			// Sequências numéricas longas variam por transação (ids, protocolos) e não identificam o padrão.
			.replace(/\d{5,}/g, "#")
			.replace(/[^\p{L}\p{N}#]+/gu, " ")
			.trim()
	);
}

/**
 * Hash de deduplicação: identifica a mesma linha em reimportações. Quando a linha tem idExterno
 * (FITID/agregador), ele entra no hash — transações idênticas com FITIDs distintos não colidem.
 * Sem idExterno, `ocorrencia` desambigua duplicatas legítimas dentro do mesmo extrato (dois PIX
 * iguais no mesmo dia): a N-ésima linha idêntica recebe ocorrencia N, estável entre reimportações.
 */
export function computeStatementLineHash({
	contaFinanceiraId,
	linha,
	ocorrencia = 0,
}: {
	contaFinanceiraId: string;
	linha: Pick<TCanonicalStatementLine, "dataTransacao" | "descricao" | "tipo" | "valor" | "idExterno">;
	ocorrencia?: number;
}) {
	const dia = linha.dataTransacao.toISOString().slice(0, 10);
	const payload = [
		contaFinanceiraId,
		dia,
		linha.tipo,
		linha.valor.toFixed(2),
		normalizeStatementDescription(linha.descricao),
		linha.idExterno ?? `#${ocorrencia}`,
	].join("|");
	return createHash("sha256").update(payload).digest("hex");
}

const METHOD_PATTERNS: Array<{ pattern: RegExp; metodo: TPaymentMethodEnum }> = [
	{ pattern: /\bpix\b/i, metodo: "PIX" },
	{ pattern: /\bboleto\b|\bbol\b|\btit(ulo)?\b/i, metodo: "BOLETO" },
	{ pattern: /\bted\b|\bdoc\b|\btransf(erencia)?\b/i, metodo: "TRANSFERENCIA" },
	{ pattern: /\bcart(ao|ão)?\s*(de)?\s*cr[eé]d/i, metodo: "CARTAO_CREDITO" },
	{ pattern: /\bcart(ao|ão)?\s*(de)?\s*d[eé]b/i, metodo: "CARTAO_DEBITO" },
	{ pattern: /\bsaque\b|\bdep(osito)?\s*(em)?\s*dinheiro\b/i, metodo: "DINHEIRO" },
];

/** Inferência conservadora do método de pagamento a partir da descrição da linha. */
export function inferPaymentMethodFromDescription(descricao: string): TPaymentMethodEnum | null {
	for (const { pattern, metodo } of METHOD_PATTERNS) {
		if (pattern.test(descricao)) return metodo;
	}
	return null;
}

/**
 * Converte valores monetários em formatos comuns de extrato BR para número.
 * Aceita: "1.234,56", "1234.56", "R$ 1.234,56", "-150,00", "(150,00)" (negativo contábil).
 */
export function parseStatementAmount(raw: unknown): number | null {
	if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
	if (typeof raw !== "string") return null;

	let value = raw.trim();
	if (!value) return null;

	let negative = false;
	if (/^\(.*\)$/.test(value)) {
		negative = true;
		value = value.slice(1, -1);
	}
	if (value.startsWith("-")) {
		negative = true;
	}
	if (/\b[dD]\b$/.test(value)) negative = true; // sufixo D/C de alguns extratos

	value = value.replace(/[^\d.,]/g, "");
	if (!value) return null;

	const lastComma = value.lastIndexOf(",");
	const lastDot = value.lastIndexOf(".");
	if (lastComma > lastDot) {
		// Formato BR: "." milhar, "," decimal.
		value = value.replace(/\./g, "").replace(",", ".");
	} else if (lastDot > lastComma) {
		// Formato US: "," milhar, "." decimal.
		value = value.replace(/,/g, "");
	}

	const parsed = Number(value);
	if (!Number.isFinite(parsed)) return null;
	return negative ? -Math.abs(parsed) : parsed;
}

/**
 * Converte datas em formatos comuns de extrato BR para Date (UTC, meia-noite).
 * Aceita: "dd/mm/aaaa", "dd/mm/aa", "aaaa-mm-dd", serial numérico do Excel e Date nativo.
 */
export function parseStatementDate(raw: unknown): Date | null {
	if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? null : raw;
	if (typeof raw === "number" && Number.isFinite(raw)) {
		// Serial de data do Excel (dias desde 1900) — mesmo cálculo de getFixedDateFromExcel.
		if (raw > 20000 && raw < 80000) return new Date(Math.round((raw - 25569) * 86400 * 1000));
		return null;
	}
	if (typeof raw !== "string") return null;

	const value = raw.trim();
	if (!value) return null;

	const brMatch = value.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
	if (brMatch) {
		const [, dayStr, monthStr, yearStr] = brMatch;
		const year = yearStr.length === 2 ? 2000 + Number(yearStr) : Number(yearStr);
		const date = new Date(Date.UTC(year, Number(monthStr) - 1, Number(dayStr)));
		return Number.isNaN(date.getTime()) ? null : date;
	}

	const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
	if (isoMatch) {
		const [, yearStr, monthStr, dayStr] = isoMatch;
		const date = new Date(Date.UTC(Number(yearStr), Number(monthStr) - 1, Number(dayStr)));
		return Number.isNaN(date.getTime()) ? null : date;
	}

	return null;
}

/** Deriva período (min/max das linhas) quando o extrato não declara DTSTART/DTEND. */
export function deriveStatementPeriod(linhas: TCanonicalStatementLine[]) {
	if (linhas.length === 0) return { periodoInicio: null, periodoFim: null };
	let min = linhas[0].dataTransacao;
	let max = linhas[0].dataTransacao;
	for (const linha of linhas) {
		if (linha.dataTransacao < min) min = linha.dataTransacao;
		if (linha.dataTransacao > max) max = linha.dataTransacao;
	}
	return { periodoInicio: min, periodoFim: max };
}
