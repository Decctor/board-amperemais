/**
 * Importa a tabela IBPT (Lei 12.741 — "De Olho no Imposto") para `fiscal_ibpt_rates`.
 *
 * Uso:
 *   tsx scripts/import-ibpt.ts ./ibpt-data
 *
 * Convencao dos arquivos: um CSV por UF nomeado `<UF>.csv` (ex.: `SP.csv`, `MG.csv`),
 * codificacao latin1, delimitado por `;`, com o cabecalho padrao da tabela:
 *   codigo;ex;tipo;descricao;nacionalfederal;importadosfederal;estadual;municipal;vigenciainicio;vigenciafim;chave;versao;fonte
 *
 * Fontes dos arquivos: https://deolhonoimposto.ibpt.org.br  ou  https://github.com/nfe/ibpt
 */
import { db } from "@/services/drizzle";
import { fiscalIbptRates } from "@/services/drizzle/schema";
import { eq } from "drizzle-orm";
import { readFileSync, readdirSync } from "node:fs";
import { basename, extname, join } from "node:path";

function parseNumber(value: string | undefined): number {
	if (!value) return 0;

	const raw = value.trim();
	const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
	const parsed = Number(normalized);
	if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
		throw new Error(`Alíquota IBPT inválida: ${value}`);
	}

	return parsed;
}

function parseBrDate(value: string | undefined): Date | null {
	if (!value) return null;
	const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
	if (!match) return null;
	const [, dd, mm, yyyy] = match;
	return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
}

type IbptRow = typeof fiscalIbptRates.$inferInsert;

function parseUfFile(filePath: string, uf: string): IbptRow[] {
	const content = readFileSync(filePath, { encoding: "latin1" });
	const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
	if (lines.length === 0) return [];

	const header = lines[0].toLowerCase();
	const startIndex = header.includes("codigo") ? 1 : 0;
	const rows: IbptRow[] = [];

	for (let i = startIndex; i < lines.length; i++) {
		const cols = lines[i].split(";");
		const [codigo, _ex, tipo, descricao, nacionalfederal, importadosfederal, estadual, municipal, vigenciainicio, vigenciafim, chave, versao, fonte] =
			cols;
		// tipo 0 = NCM (ignoramos NBS/LC116)
		if (tipo !== undefined && tipo.trim() !== "0") continue;
		if (!codigo?.trim()) continue;

		rows.push({
			ncm: codigo.trim(),
			uf,
			exTipi: _ex?.trim() || null,
			descricao: descricao?.trim() || null,
			aliqNacionalFederal: parseNumber(nacionalfederal),
			aliqImportadosFederal: parseNumber(importadosfederal),
			aliqEstadual: parseNumber(estadual),
			aliqMunicipal: parseNumber(municipal),
			versao: versao?.trim() || null,
			vigenciaInicio: parseBrDate(vigenciainicio),
			vigenciaFim: parseBrDate(vigenciafim),
			chave: chave?.trim() || null,
			fonte: fonte?.trim() || null,
		});
	}

	return rows;
}

async function insertInChunks(rows: IbptRow[], chunkSize = 1000) {
	for (let i = 0; i < rows.length; i += chunkSize) {
		await db.insert(fiscalIbptRates).values(rows.slice(i, i + chunkSize));
	}
}

async function main() {
	const dir = process.argv[2] ?? "./ibpt-data";
	const files = readdirSync(dir).filter((file) => extname(file).toLowerCase() === ".csv");
	if (files.length === 0) {
		console.error(`Nenhum arquivo .csv encontrado em ${dir}.`);
		process.exit(1);
	}

	for (const file of files) {
		const uf = basename(file, extname(file)).toUpperCase();
		const rows = parseUfFile(join(dir, file), uf);
		// Estrategia de refresh por UF: remove o que existe e reinsere.
		await db.delete(fiscalIbptRates).where(eq(fiscalIbptRates.uf, uf));
		await insertInChunks(rows);
		console.log(`IBPT ${uf}: ${rows.length} NCMs importados.`);
	}

	console.log("Importacao IBPT concluida.");
	process.exit(0);
}

main().catch((error) => {
	console.error("Falha na importacao IBPT:", error);
	process.exit(1);
});
