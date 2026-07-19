import { gateway, generateText, Output } from "ai";
import { z } from "zod";
import * as XLSX from "xlsx";
import { COLUMN_MAP_MODEL } from "../constants";
import {
	deriveStatementPeriod,
	inferPaymentMethodFromDescription,
	parseStatementAmount,
	parseStatementDate,
	type TCanonicalStatementLine,
	type TParsedStatement,
} from "../normalize";

/**
 * Parser de extratos em planilha (CSV/XLS/XLSX). As células são lidas deterministicamente
 * (SheetJS); apenas a identificação das colunas usa heurística de cabeçalho com fallback de IA
 * (enviando SOMENTE cabeçalhos + amostra de linhas — nunca a planilha inteira), no mesmo molde
 * de app/api/sales/bulk/map/route.ts.
 */

const StatementCanonicalFieldSchema = z.enum(["data", "descricao", "valor", "entrada", "saida", "tipo"]);
type TStatementCanonicalField = z.infer<typeof StatementCanonicalFieldSchema>;

const StatementColumnMapSchema = z.object({
	mappingDefinitions: z.array(
		z.object({
			field: StatementCanonicalFieldSchema,
			sourceColumn: z.string().nullable(),
			confidence: z.number().min(0).max(1).nullable(),
		}),
	),
});
type TStatementColumnMap = z.infer<typeof StatementColumnMapSchema>;

const FIELD_SYNONYMS: Record<TStatementCanonicalField, string[]> = {
	data: ["data", "dt", "dia", "date"],
	descricao: ["descricao", "historico", "hist", "lancamento", "memo", "detalhe", "identificacao", "title"],
	valor: ["valor", "vlr", "quantia", "amount", "montante"],
	entrada: ["credito", "entrada", "deposito", "receb"],
	saida: ["debito", "saida", "pagamento", "retirada"],
	tipo: ["tipo", "natureza", "d/c", "dc", "operacao"],
};

function normalizeHeader(value: string) {
	return value
		.trim()
		.toLowerCase()
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "");
}

function runHeuristicColumnMapping(headers: string[]): TStatementColumnMap {
	const normalized = headers.map((header) => ({ original: header, normalized: normalizeHeader(header) }));
	const used = new Set<string>();
	const mappingDefinitions = StatementCanonicalFieldSchema.options.map((field) => {
		const matched = normalized.find(
			(header) => !used.has(header.original) && FIELD_SYNONYMS[field].some((synonym) => header.normalized.includes(synonym)),
		);
		if (matched) used.add(matched.original);
		return { field, sourceColumn: matched?.original ?? null, confidence: matched ? 0.55 : null };
	});
	return { mappingDefinitions };
}

function isUsableMapping(mapping: TStatementColumnMap) {
	const byField = new Map(mapping.mappingDefinitions.map((definition) => [definition.field, definition.sourceColumn]));
	const hasValue =
		!!byField.get("valor") || (!!byField.get("entrada") && !!byField.get("saida")) || !!byField.get("entrada") || !!byField.get("saida");
	return !!byField.get("data") && !!byField.get("descricao") && hasValue;
}

async function mapStatementColumns({ headers, sampleRows }: { headers: string[]; sampleRows: Record<string, unknown>[] }) {
	const heuristic = runHeuristicColumnMapping(headers);
	if (isUsableMapping(heuristic)) return { mapping: heuristic, origem: "HEURISTICA" as const };

	try {
		const { output } = await generateText({
			model: gateway(COLUMN_MAP_MODEL),
			output: Output.object({ schema: StatementColumnMapSchema }),
			system:
				"Você é um especialista em identificar colunas de extratos bancários brasileiros exportados como planilha. " +
				"Campos canônicos: data (data da transação), descricao (histórico/lançamento), valor (valor com sinal ou absoluto), " +
				"entrada (coluna só de créditos), saida (coluna só de débitos), tipo (coluna D/C ou débito/crédito). " +
				"Use 'valor' quando houver uma única coluna de valores; use 'entrada'/'saida' quando forem colunas separadas. " +
				"Escolha apenas colunas existentes. Se não tiver certeza, retorne sourceColumn = null.",
			prompt: `Cabeçalhos da planilha:\n${JSON.stringify(headers)}\n\nLinhas de amostra:\n${JSON.stringify(sampleRows.slice(0, 15))}`,
		});
		const parsed = StatementColumnMapSchema.parse(output);
		const headerSet = new Set(headers);
		parsed.mappingDefinitions = parsed.mappingDefinitions.map((definition) =>
			definition.sourceColumn && !headerSet.has(definition.sourceColumn) ? { ...definition, sourceColumn: null, confidence: null } : definition,
		);
		if (isUsableMapping(parsed)) return { mapping: parsed, origem: "IA" as const };
	} catch (error) {
		console.error("[RECONCILIATION_IMPORT] Erro no mapeamento IA de colunas, usando heurística.", error);
	}

	return { mapping: heuristic, origem: "HEURISTICA" as const };
}

/**
 * Lê a planilha como matriz, encontra a linha de cabeçalho (extratos costumam ter linhas de
 * título/saldo antes da tabela) e devolve linhas como objetos coluna→valor.
 */
function readSheetRows(buffer: Buffer) {
	const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
	const sheet = workbook.Sheets[workbook.SheetNames[0]];
	if (!sheet) return { headers: [] as string[], rows: [] as Record<string, unknown>[] };

	const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: null });

	// Linha de cabeçalho: a primeira com 3+ células de texto não vazias.
	let headerIndex = -1;
	for (let index = 0; index < Math.min(matrix.length, 25); index++) {
		const textCells = (matrix[index] ?? []).filter((cell) => typeof cell === "string" && cell.trim().length > 0);
		if (textCells.length >= 3) {
			headerIndex = index;
			break;
		}
	}
	if (headerIndex === -1) return { headers: [], rows: [] };

	const headers = (matrix[headerIndex] ?? []).map((cell, index) => (typeof cell === "string" && cell.trim() ? cell.trim() : `COLUNA_${index + 1}`));
	const rows: Record<string, unknown>[] = [];
	for (const cells of matrix.slice(headerIndex + 1)) {
		if (!cells || cells.every((cell) => cell === null || cell === "")) continue;
		const row: Record<string, unknown> = {};
		headers.forEach((header, index) => {
			row[header] = cells[index] ?? null;
		});
		rows.push(row);
	}
	return { headers, rows };
}

export async function parseTabularStatement(buffer: Buffer): Promise<TParsedStatement> {
	const avisos: string[] = [];
	const { headers, rows } = readSheetRows(buffer);
	if (headers.length === 0 || rows.length === 0) {
		return {
			linhas: [],
			periodoInicio: null,
			periodoFim: null,
			saldoInicial: null,
			saldoFinal: null,
			avisos: ["Nenhuma tabela de transações foi encontrada na planilha."],
		};
	}

	const { mapping, origem } = await mapStatementColumns({ headers, sampleRows: rows.slice(0, 15) });
	if (origem === "IA") avisos.push("As colunas da planilha foram identificadas com auxílio de IA — revise as linhas importadas.");

	const byField = new Map(mapping.mappingDefinitions.map((definition) => [definition.field, definition.sourceColumn]));
	const dataColumn = byField.get("data");
	const descricaoColumn = byField.get("descricao");
	const valorColumn = byField.get("valor");
	const entradaColumn = byField.get("entrada");
	const saidaColumn = byField.get("saida");
	const tipoColumn = byField.get("tipo");

	if (!dataColumn || !descricaoColumn || (!valorColumn && !entradaColumn && !saidaColumn)) {
		return {
			linhas: [],
			periodoInicio: null,
			periodoFim: null,
			saldoInicial: null,
			saldoFinal: null,
			avisos: ["Não foi possível identificar as colunas de data, descrição e valor da planilha."],
		};
	}

	const linhas: TCanonicalStatementLine[] = [];
	let ignoradas = 0;
	for (const row of rows) {
		const dataTransacao = parseStatementDate(row[dataColumn]);
		const descricaoRaw = row[descricaoColumn];
		const descricao = typeof descricaoRaw === "string" ? descricaoRaw.trim() : descricaoRaw != null ? String(descricaoRaw) : "";

		let valor: number | null = null;
		let tipo: TCanonicalStatementLine["tipo"] | null = null;
		if (valorColumn) {
			valor = parseStatementAmount(row[valorColumn]);
			if (valor !== null) {
				if (tipoColumn && typeof row[tipoColumn] === "string") {
					const tipoRaw = normalizeHeader(row[tipoColumn] as string);
					if (/^d|deb|saida/.test(tipoRaw)) tipo = "SAIDA";
					else if (/^c|cred|entrada/.test(tipoRaw)) tipo = "ENTRADA";
				}
				tipo = tipo ?? (valor < 0 ? "SAIDA" : "ENTRADA");
			}
		} else {
			const entrada = entradaColumn ? parseStatementAmount(row[entradaColumn]) : null;
			const saida = saidaColumn ? parseStatementAmount(row[saidaColumn]) : null;
			if (entrada && entrada !== 0) {
				valor = entrada;
				tipo = "ENTRADA";
			} else if (saida && saida !== 0) {
				valor = saida;
				tipo = "SAIDA";
			}
		}

		// Linhas de saldo/subtotal não têm valor de movimento ou descrição — ignoradas silenciosamente
		// (contadas no aviso agregado).
		if (!dataTransacao || !descricao || valor === null || valor === 0 || !tipo) {
			ignoradas++;
			continue;
		}
		if (/\bsaldo\b/i.test(descricao)) {
			ignoradas++;
			continue;
		}

		linhas.push({
			dataTransacao,
			descricao,
			tipo,
			valor: Math.abs(valor),
			metodo: inferPaymentMethodFromDescription(descricao),
			idExterno: null,
			metadados: { row },
		});
	}

	if (ignoradas > 0) avisos.push(`${ignoradas} linha(s) da planilha foram ignoradas (sem data, descrição ou valor de movimento).`);

	const { periodoInicio, periodoFim } = deriveStatementPeriod(linhas);
	return { linhas, periodoInicio, periodoFim, saldoInicial: null, saldoFinal: null, avisos };
}
