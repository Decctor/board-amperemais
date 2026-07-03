/**
 * Atualiza a tabela IBPT (Lei 12.741) a partir da API JSON por UF.
 *
 * Uso seguro (somente valida e mostra resumo):
 *   npm run import:ibpt:api -- --uf=MG
 *
 * Aplicar no banco:
 *   npm run import:ibpt:api -- --uf=MG --apply
 *   npm run import:ibpt:api -- --all --apply
 */
import "dotenv/config";

import { db } from "@/services/drizzle";
import { fiscalIbptRates } from "@/services/drizzle/schema";
import { eq } from "drizzle-orm";

const API_BASE_URL = "https://api-ibpt.seunegocionanuvem.com.br/api_ibpt_json.php";
const UFS = [
	"AC",
	"AL",
	"AP",
	"AM",
	"BA",
	"CE",
	"DF",
	"ES",
	"GO",
	"MA",
	"MT",
	"MS",
	"MG",
	"PA",
	"PB",
	"PR",
	"PE",
	"PI",
	"RJ",
	"RN",
	"RS",
	"RO",
	"RR",
	"SC",
	"SP",
	"SE",
	"TO",
] as const;

type TUf = (typeof UFS)[number];
type IbptInsert = typeof fiscalIbptRates.$inferInsert;

type TIbptApiItem = {
	codigo?: unknown;
	ex?: unknown;
	tipo?: unknown;
	descricao?: unknown;
	nacionalfederal?: unknown;
	importadosfederal?: unknown;
	estadual?: unknown;
	municipal?: unknown;
	vigenciainicio?: unknown;
	vigenciafim?: unknown;
	chave?: unknown;
	versao?: unknown;
	fonte?: unknown;
	uf?: unknown;
};

type TIbptApiPayload = {
	versao?: unknown;
	uf?: unknown;
	total?: unknown;
	ncm?: unknown;
};

function getArg(name: string) {
	const prefix = `--${name}=`;
	return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function hasFlag(name: string) {
	return process.argv.includes(`--${name}`);
}

function normalizeUf(value: string | undefined): TUf {
	const uf = value?.trim().toUpperCase();
	if (!uf || !UFS.includes(uf as TUf)) {
		throw new Error(`UF invalida. Use --uf=<UF> com uma destas: ${UFS.join(", ")}.`);
	}

	return uf as TUf;
}

function parseNumber(value: unknown): number {
	if (value === null || value === undefined || value === "") return 0;
	const raw = String(value).trim();
	const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
	const parsed = Number(normalized);
	if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
		throw new Error(`Aliquota IBPT invalida: ${String(value)}`);
	}

	return parsed;
}

function parseIsoDate(value: unknown): Date | null {
	if (!value) return null;
	const raw = String(value).trim();
	const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
	if (!match) return null;
	const [, yyyy, mm, dd] = match;
	return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
}

function parseString(value: unknown): string | null {
	if (value === null || value === undefined) return null;
	const parsed = String(value).trim();
	return parsed.length > 0 ? parsed : null;
}

async function fetchIbptPayload(uf: TUf): Promise<TIbptApiPayload> {
	const url = new URL(API_BASE_URL);
	url.searchParams.set("uf", uf);

	const response = await fetch(url, {
		headers: {
			accept: "application/json",
		},
	});

	if (!response.ok) {
		throw new Error(`API IBPT retornou HTTP ${response.status} para ${uf}.`);
	}

	return (await response.json()) as TIbptApiPayload;
}

function mapPayloadToRows(payload: TIbptApiPayload, fallbackUf: TUf): IbptInsert[] {
	const items = Array.isArray(payload.ncm) ? (payload.ncm as TIbptApiItem[]) : [];
	const uf = normalizeUf(parseString(payload.uf) ?? fallbackUf);
	const payloadVersion = parseString(payload.versao);

	return items
		.filter((item) => Number(item.tipo) === 0)
		.map((item) => {
			const ncm = parseString(item.codigo);
			if (!ncm) throw new Error(`Registro IBPT sem codigo para ${uf}.`);

			return {
				ncm,
				uf,
				exTipi: parseString(item.ex),
				descricao: parseString(item.descricao),
				aliqNacionalFederal: parseNumber(item.nacionalfederal),
				aliqImportadosFederal: parseNumber(item.importadosfederal),
				aliqEstadual: parseNumber(item.estadual),
				aliqMunicipal: parseNumber(item.municipal),
				versao: parseString(item.versao) ?? payloadVersion,
				vigenciaInicio: parseIsoDate(item.vigenciainicio),
				vigenciaFim: parseIsoDate(item.vigenciafim),
				chave: parseString(item.chave),
				fonte: parseString(item.fonte),
			};
		});
}

async function refreshUf(uf: TUf, apply: boolean) {
	const payload = await fetchIbptPayload(uf);
	const rows = mapPayloadToRows(payload, uf);
	const versions = [...new Set(rows.map((row) => row.versao).filter(Boolean))].join(", ") || "sem versao";
	const vigenciaInicio = rows[0]?.vigenciaInicio?.toISOString().slice(0, 10) ?? "sem inicio";
	const vigenciaFim = rows[0]?.vigenciaFim?.toISOString().slice(0, 10) ?? "sem fim";

	console.log(`IBPT ${uf}: ${rows.length} NCMs, versao ${versions}, vigencia ${vigenciaInicio} a ${vigenciaFim}.`);

	if (!apply) return;

	await db.transaction(async (tx) => {
		await tx.delete(fiscalIbptRates).where(eq(fiscalIbptRates.uf, uf));
		for (let i = 0; i < rows.length; i += 1000) {
			await tx.insert(fiscalIbptRates).values(rows.slice(i, i + 1000));
		}
	});

	console.log(`IBPT ${uf}: tabela atualizada.`);
}

async function main() {
	const apply = hasFlag("apply");
	const ufs = hasFlag("all") ? [...UFS] : [normalizeUf(getArg("uf"))];

	if (!apply) {
		console.log("Modo validacao: nenhuma alteracao sera feita. Use --apply para atualizar o banco.");
	}

	for (const uf of ufs) {
		await refreshUf(uf, apply);
	}

	console.log(apply ? "Atualizacao IBPT concluida." : "Validacao IBPT concluida.");
	process.exit(0);
}

main().catch((error) => {
	console.error("Falha na importacao IBPT via API:", error);
	process.exit(1);
});
