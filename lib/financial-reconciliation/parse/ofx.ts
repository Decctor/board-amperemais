import { deriveStatementPeriod, inferPaymentMethodFromDescription, type TCanonicalStatementLine, type TParsedStatement } from "../normalize";

/**
 * Parser determinístico de OFX (Open Financial Exchange) — formato padrão de exportação dos
 * bancos brasileiros. Cobre OFX 1.x (SGML, tags sem fechamento) e 2.x (XML), tanto extrato de
 * conta (STMTTRN) quanto de cartão (CCSTMTRS usa os mesmos blocos STMTTRN).
 *
 * Não usa IA: FITID dá idempotência perfeita e LEDGERBAL/DTSTART/DTEND dão a sanidade do período.
 */

function decodeOfxBuffer(buffer: Buffer) {
	const asUtf8 = buffer.toString("utf-8");
	// Cabeçalhos OFX 1.x declaram charset (CHARSET:1252 / ENCODING:USASCII). Bancos BR costumam
	// exportar windows-1252; o replacement char (U+FFFD) denuncia decodificação errada.
	if (/CHARSET:\s*1252/i.test(asUtf8) || asUtf8.includes("�")) {
		return buffer.toString("latin1");
	}
	return asUtf8;
}

/** Extrai o valor de uma tag OFX (SGML ou XML): `<TAG>valor` até quebra de linha ou próxima tag. */
function readTag(block: string, tag: string): string | null {
	const match = block.match(new RegExp(`<${tag}>([^<\r\n]*)`, "i"));
	const value = match?.[1]?.trim();
	return value ? value : null;
}

/** DTPOSTED/DTASOF: "YYYYMMDD[HHMMSS][.sss][[TZ:...]" — usa apenas a parte de data (UTC). */
function parseOfxDate(raw: string | null): Date | null {
	if (!raw) return null;
	const match = raw.match(/^(\d{4})(\d{2})(\d{2})/);
	if (!match) return null;
	const [, year, month, day] = match;
	const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
	return Number.isNaN(date.getTime()) ? null : date;
}

/** TRNAMT usa ponto decimal por spec, mas alguns emissores mandam vírgula. */
function parseOfxAmount(raw: string | null): number | null {
	if (!raw) return null;
	const normalized = raw.replace(",", ".");
	const parsed = Number(normalized);
	return Number.isFinite(parsed) ? parsed : null;
}

export function parseOfxStatement(buffer: Buffer): TParsedStatement {
	const content = decodeOfxBuffer(buffer);
	const avisos: string[] = [];
	const linhas: TCanonicalStatementLine[] = [];

	const transactionBlocks = content.match(/<STMTTRN>[\s\S]*?(?=<\/STMTTRN>|<STMTTRN>|<\/BANKTRANLIST>|$)/gi) ?? [];
	for (const block of transactionBlocks) {
		const valor = parseOfxAmount(readTag(block, "TRNAMT"));
		const dataTransacao = parseOfxDate(readTag(block, "DTPOSTED"));
		if (valor === null || valor === 0 || !dataTransacao) {
			avisos.push("Uma transação do OFX foi ignorada por não ter valor ou data legíveis.");
			continue;
		}

		const memo = readTag(block, "MEMO");
		const name = readTag(block, "NAME");
		const descricao = name && memo && memo !== name ? `${name} - ${memo}` : (name ?? memo ?? "Transação sem descrição");
		const trnType = readTag(block, "TRNTYPE");

		linhas.push({
			dataTransacao,
			descricao,
			tipo: valor > 0 ? "ENTRADA" : "SAIDA",
			valor: Math.abs(valor),
			metodo: inferPaymentMethodFromDescription(descricao),
			idExterno: readTag(block, "FITID"),
			metadados: { trnType, checkNum: readTag(block, "CHECKNUM"), refNum: readTag(block, "REFNUM") },
		});
	}

	const declaredStart = parseOfxDate(readTag(content, "DTSTART"));
	const declaredEnd = parseOfxDate(readTag(content, "DTEND"));
	const derived = deriveStatementPeriod(linhas);

	// LEDGERBAL é o saldo final do período; OFX não declara saldo inicial.
	const ledgerBlock = content.match(/<LEDGERBAL>[\s\S]*?(?=<\/LEDGERBAL>|<AVAILBAL>|$)/i)?.[0] ?? null;
	const saldoFinal = ledgerBlock ? parseOfxAmount(readTag(ledgerBlock, "BALAMT")) : null;

	return {
		linhas,
		periodoInicio: declaredStart ?? derived.periodoInicio,
		periodoFim: declaredEnd ?? derived.periodoFim,
		saldoInicial: null,
		saldoFinal,
		avisos,
	};
}

/** Heurística de detecção: o conteúdo é um OFX? (cabeçalho OFXHEADER ou tag <OFX>). */
export function looksLikeOfx(buffer: Buffer) {
	const head = buffer.subarray(0, 2048).toString("utf-8");
	return /OFXHEADER/i.test(head) || /<OFX>/i.test(head);
}
