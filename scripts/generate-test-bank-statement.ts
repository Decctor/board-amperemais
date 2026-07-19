import "@/utils/scripts/load-next-env";

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { connection, db } from "@/services/drizzle";
import { financialAccounts, financialTransactions, type TFinancialTransaction } from "@/services/drizzle/schema";
import { and, eq, gte, lte, or } from "drizzle-orm";

/**
 * Gera um arquivo OFX que emula um extrato bancário de N meses para uma organização, para validar
 * ponta a ponta os recursos de conciliação (docs/bank-reconciliation-design.md).
 *
 * O extrato é montado a partir de transações REAIS da org (para exercitar o matching) MAIS linhas de
 * ruído propositais que não correspondem a nenhuma transação (para exercitar o caso "não identificado"):
 *  - EXATAS: espelham a transação (mesmo valor/tipo/data) → esperado AUTOMATICO (confiança 1.0) quando único.
 *  - FUZZY: valor igual, data deslocada ±1..2 dias e descrição reescrita → esperado HEURISTICO/IA.
 *  - COMPOSIÇÃO: uma linha = soma de 2 transações próximas → esperado grupo HEURISTICO (1 linha ↔ N transações).
 *  - RUÍDO: valor/descrição estranhos (valor garantidamente fora da tolerância dos reais) → esperado NÃO identificado.
 *
 * O FITID de cada linha é determinístico (mesma seed ⇒ mesmo arquivo), então reimportar exercita a
 * idempotência (dedup por idExterno) sem gerar linhas duplicadas.
 *
 * Uso:
 *   npm run test:bank-statement -- --org=<id> [--account=<id>] [--start=2026-06-01] [--months=2]
 *                                  [--noise=0.35] [--seed=42] [--out=<path.ofx>]
 */

const DEFAULT_ORGANIZATION_ID = "59c2b238-bc21-4710-b47b-db6e2a380079";
const DEFAULT_START = "2026-06-01";
const DEFAULT_MONTHS = 2;
const DEFAULT_NOISE_RATIO = 0.35;
const DEFAULT_SEED = 42;
const VALUE_TOLERANCE = 0.02; // mesma de RECONCILIATION_VALUE_TOLERANCE

function getArg(name: string) {
	const prefix = `--${name}=`;
	const arg = process.argv.find((value) => value.startsWith(prefix));
	return arg ? arg.slice(prefix.length) : null;
}

// PRNG determinístico (mulberry32) — reprodutibilidade entre execuções com a mesma seed.
function makeRng(seed: number) {
	let state = seed >>> 0;
	return () => {
		state |= 0;
		state = (state + 0x6d2b79f5) | 0;
		let t = Math.imul(state ^ (state >>> 15), 1 | state);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function shuffle<T>(items: T[], rng: () => number) {
	const result = [...items];
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}

type TStatementLine = {
	fitid: string;
	data: Date;
	tipo: "ENTRADA" | "SAIDA";
	valor: number; // sempre positivo
	memo: string;
	categoria: "EXATA" | "FUZZY" | "COMPOSICAO" | "RUIDO";
	origemTransacaoIds: string[]; // ids das transações reais espelhadas (vazio p/ ruído)
};

const NOISE_DESCRIPTIONS = [
	"TAR PACOTE DE SERVICOS",
	"IOF SOBRE OPERACAO",
	"PIX ENVIADO 48213 J. PEREIRA",
	"COMPRA CARTAO POSTO SHELL BR",
	"REND PAGO APLIC AUT MAIS",
	"SISPAG FORNECEDOR ALPHA LTDA",
	"TARIFA DOC/TED",
	"DEB CONVENIO ENERGIA ELETRICA",
	"COMPRA CARTAO SUPERMERCADO ABC",
	"ANUIDADE DIFERENCIADA",
	"PIX RECEBIDO 90124 M. SOUZA",
	"ESTORNO PARCIAL COMPRA",
	"SAQUE CANAL ELETRONICO",
	"PAGTO BOLETO CONCESSIONARIA",
];

function sanitizeMemo(text: string) {
	return text
		.replace(/[<>\r\n]/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.toUpperCase()
		.slice(0, 60);
}

function rewordMemo(text: string, rng: () => number) {
	// Simula como o banco reescreve o histórico: prefixo + trecho da descrição original.
	const prefixes = ["TED", "PIX", "PAGTO", "TRANSF", "DEB AUT", "LIQ"];
	const prefix = prefixes[Math.floor(rng() * prefixes.length)];
	const words = sanitizeMemo(text).split(" ").slice(0, 3).join(" ");
	return sanitizeMemo(`${prefix} ${words}`);
}

function effectiveDate(transaction: Pick<TFinancialTransaction, "dataPrevisao" | "dataEfetivacao">) {
	return transaction.dataEfetivacao ?? transaction.dataPrevisao;
}

function shiftDays(date: Date, days: number) {
	return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function formatOfxDate(date: Date) {
	const y = date.getUTCFullYear();
	const m = String(date.getUTCMonth() + 1).padStart(2, "0");
	const d = String(date.getUTCDate()).padStart(2, "0");
	return `${y}${m}${d}120000[-3:BRT]`;
}

function formatOfxAmount(valor: number, tipo: "ENTRADA" | "SAIDA") {
	const signed = tipo === "ENTRADA" ? valor : -valor;
	return signed.toFixed(2);
}

function buildOfx({
	lines,
	dtStart,
	dtEnd,
	saldoFinal,
	account,
}: {
	lines: TStatementLine[];
	dtStart: Date;
	dtEnd: Date;
	saldoFinal: number;
	account: { banco: string; agencia: string; conta: string };
}) {
	const transacoes = lines
		.map((line) =>
			[
				"<STMTTRN>",
				`<TRNTYPE>${line.tipo === "ENTRADA" ? "CREDIT" : "DEBIT"}`,
				`<DTPOSTED>${formatOfxDate(line.data)}`,
				`<TRNAMT>${formatOfxAmount(line.valor, line.tipo)}`,
				`<FITID>${line.fitid}`,
				`<MEMO>${line.memo}`,
				"</STMTTRN>",
			].join("\n"),
		)
		.join("\n");

	return [
		"OFXHEADER:100",
		"DATA:OFXSGML",
		"VERSION:102",
		"SECURITY:NONE",
		"ENCODING:USASCII",
		"CHARSET:1252",
		"COMPRESSION:NONE",
		"OLDFILEUID:NONE",
		"NEWFILEUID:NONE",
		"",
		"<OFX>",
		"<SIGNONMSGSRSV1><SONRS>",
		"<STATUS><CODE>0<SEVERITY>INFO</STATUS>",
		`<DTSERVER>${formatOfxDate(dtEnd)}`,
		"<LANGUAGE>POR",
		`<FI><ORG>BANCO TESTE CONCILIACAO<FID>${account.banco}</FI>`,
		"</SONRS></SIGNONMSGSRSV1>",
		"<BANKMSGSRSV1><STMTTRNRS>",
		"<TRNUID>1",
		"<STATUS><CODE>0<SEVERITY>INFO</STATUS>",
		"<STMTRS>",
		"<CURDEF>BRL",
		`<BANKACCTFROM><BANKID>${account.banco}<BRANCHID>${account.agencia}<ACCTID>${account.conta}<ACCTTYPE>CHECKING</BANKACCTFROM>`,
		"<BANKTRANLIST>",
		`<DTSTART>${formatOfxDate(dtStart)}`,
		`<DTEND>${formatOfxDate(dtEnd)}`,
		transacoes,
		"</BANKTRANLIST>",
		`<LEDGERBAL><BALAMT>${saldoFinal.toFixed(2)}<DTASOF>${formatOfxDate(dtEnd)}</LEDGERBAL>`,
		"</STMTRS>",
		"</STMTTRNRS></BANKMSGSRSV1>",
		"</OFX>",
		"",
	].join("\n");
}

async function main() {
	const organizacaoId = getArg("org") ?? DEFAULT_ORGANIZATION_ID;
	const startStr = getArg("start") ?? DEFAULT_START;
	const months = Number(getArg("months") ?? DEFAULT_MONTHS);
	const noiseRatio = Number(getArg("noise") ?? DEFAULT_NOISE_RATIO);
	const seed = Number(getArg("seed") ?? DEFAULT_SEED);
	const accountArg = getArg("account");

	const dtStart = new Date(`${startStr}T00:00:00.000Z`);
	if (Number.isNaN(dtStart.getTime())) throw new Error(`Data de início inválida: ${startStr}`);
	const dtEnd = new Date(Date.UTC(dtStart.getUTCFullYear(), dtStart.getUTCMonth() + months, dtStart.getUTCDate()) - 24 * 60 * 60 * 1000);
	const windowEndExclusive = new Date(dtEnd.getTime() + 24 * 60 * 60 * 1000);

	const rng = makeRng(seed);
	const runTag = `S${seed}`;

	console.log(
		`\n[extrato-teste] org=${organizacaoId} periodo=${dtStart.toISOString().slice(0, 10)}..${dtEnd.toISOString().slice(0, 10)} seed=${seed}`,
	);

	// --- Contas financeiras da org ---
	const accounts = await db.query.financialAccounts.findMany({
		where: eq(financialAccounts.organizacaoId, organizacaoId),
		columns: { id: true, nome: true, tipo: true, codigoBanco: true, agencia: true, numeroConta: true },
	});
	if (accounts.length === 0) {
		console.warn("[extrato-teste] AVISO: a org não possui contas financeiras. O arquivo será gerado, mas a importação exige selecionar uma conta.");
	}

	// --- Transações candidatas no período (mesma conta escolhida OU sem conta) ---
	const allInWindow = await db.query.financialTransactions.findMany({
		where: and(
			eq(financialTransactions.organizacaoId, organizacaoId),
			or(
				and(gte(financialTransactions.dataPrevisao, dtStart), lte(financialTransactions.dataPrevisao, windowEndExclusive)),
				and(gte(financialTransactions.dataEfetivacao, dtStart), lte(financialTransactions.dataEfetivacao, windowEndExclusive)),
			),
		),
		columns: {
			id: true,
			titulo: true,
			tipo: true,
			valor: true,
			metodo: true,
			contaFinanceiraId: true,
			dataPrevisao: true,
			dataEfetivacao: true,
		},
	});
	const windowTransactions = allInWindow.filter((transaction) => {
		const date = effectiveDate(transaction);
		return date >= dtStart && date < windowEndExclusive && transaction.valor > 0;
	});

	// --- Escolha da conta a emular ---
	const ownCountByAccount = new Map<string, number>();
	for (const transaction of windowTransactions) {
		if (transaction.contaFinanceiraId)
			ownCountByAccount.set(transaction.contaFinanceiraId, (ownCountByAccount.get(transaction.contaFinanceiraId) ?? 0) + 1);
	}
	const bankLike = accounts.filter((account) => account.tipo === "BANCO" || account.tipo === "CARTEIRA_DIGITAL");
	const chosenAccount =
		(accountArg ? accounts.find((account) => account.id === accountArg) : null) ??
		[...bankLike].sort((a, b) => (ownCountByAccount.get(b.id) ?? 0) - (ownCountByAccount.get(a.id) ?? 0))[0] ??
		accounts[0] ??
		null;
	if (accountArg && !chosenAccount) throw new Error(`Conta ${accountArg} não encontrada na org.`);

	// Candidatas de matching = transações da conta escolhida + as sem conta (o motor considera ambas).
	const candidates = windowTransactions.filter(
		(transaction) => !transaction.contaFinanceiraId || (chosenAccount && transaction.contaFinanceiraId === chosenAccount.id),
	);

	console.log(
		`[extrato-teste] conta emulada: ${chosenAccount ? `${chosenAccount.nome} (${chosenAccount.tipo}) [${chosenAccount.id}]` : "NENHUMA"} | transações candidatas no período: ${candidates.length}`,
	);

	// --- Montagem das linhas ---
	const lines: TStatementLine[] = [];
	const realValues = candidates.map((transaction) => Number(transaction.valor.toFixed(2)));
	let counter = 0;
	const nextFitid = () => `AMP${runTag}${String(counter++).padStart(4, "0")}`;

	const pool = shuffle(candidates, rng);

	// Composição: até 2 pares do mesmo tipo e datas próximas (≤5 dias); membros saem do pool individual.
	const usedInComposition = new Set<string>();
	const compositionLines: TStatementLine[] = [];
	for (let i = 0; i < pool.length && compositionLines.length < 2; i++) {
		const a = pool[i];
		if (usedInComposition.has(a.id)) continue;
		const b = pool.find(
			(candidate) =>
				candidate.id !== a.id &&
				!usedInComposition.has(candidate.id) &&
				candidate.tipo === a.tipo &&
				Math.abs(effectiveDate(candidate).getTime() - effectiveDate(a).getTime()) <= 5 * 24 * 60 * 60 * 1000,
		);
		if (!b) continue;
		usedInComposition.add(a.id);
		usedInComposition.add(b.id);
		const soma = Number((a.valor + b.valor).toFixed(2));
		compositionLines.push({
			fitid: nextFitid(),
			data: effectiveDate(a),
			tipo: a.tipo,
			valor: soma,
			memo: sanitizeMemo(`REPASSE AGRUPADO ${a.metodo}`),
			categoria: "COMPOSICAO",
			origemTransacaoIds: [a.id, b.id],
		});
	}

	const mirrorPool = pool.filter((transaction) => !usedInComposition.has(transaction.id));
	// Espelha ~70% do pool restante; o resto fica sem linha (transação que "ainda não caiu no extrato").
	const mirrorCount = Math.ceil(mirrorPool.length * 0.7);
	const toMirror = mirrorPool.slice(0, mirrorCount);
	const fuzzyCount = Math.floor(mirrorCount * 0.3);

	toMirror.forEach((transaction, index) => {
		const isFuzzy = index < fuzzyCount;
		const baseDate = effectiveDate(transaction);
		lines.push({
			fitid: nextFitid(),
			data: isFuzzy ? shiftDays(baseDate, (Math.floor(rng() * 2) + 1) * (rng() < 0.5 ? -1 : 1)) : baseDate,
			tipo: transaction.tipo,
			valor: Number(transaction.valor.toFixed(2)),
			memo: isFuzzy ? rewordMemo(transaction.titulo, rng) : sanitizeMemo(transaction.titulo),
			categoria: isFuzzy ? "FUZZY" : "EXATA",
			origemTransacaoIds: [transaction.id],
		});
	});

	lines.push(...compositionLines);

	// Ruído: valor garantidamente fora da tolerância de qualquer transação real → não identificado.
	const noiseCount = Math.max(4, Math.round((mirrorCount + compositionLines.length) * (noiseRatio / (1 - noiseRatio))));
	const collidesWithReal = (valor: number) => realValues.some((real) => Math.abs(real - valor) <= VALUE_TOLERANCE);
	for (let i = 0; i < noiseCount; i++) {
		let valor = Number((5 + rng() * 4000).toFixed(2));
		let guard = 0;
		while (collidesWithReal(valor) && guard++ < 50) valor = Number((5 + rng() * 4000).toFixed(2));
		const dayOffset = Math.floor(rng() * months * 30);
		lines.push({
			fitid: nextFitid(),
			data: shiftDays(dtStart, dayOffset),
			tipo: rng() < 0.5 ? "ENTRADA" : "SAIDA",
			valor,
			memo: sanitizeMemo(NOISE_DESCRIPTIONS[Math.floor(rng() * NOISE_DESCRIPTIONS.length)]),
			categoria: "RUIDO",
			origemTransacaoIds: [],
		});
	}

	// Ordena por data (como um extrato real) e recalcula um saldo final plausível.
	lines.sort((a, b) => a.data.getTime() - b.data.getTime());
	const saldoInicial = 10000;
	const saldoFinal = lines.reduce((total, line) => total + (line.tipo === "ENTRADA" ? line.valor : -line.valor), saldoInicial);

	const account = {
		banco: chosenAccount?.codigoBanco ?? "999",
		agencia: chosenAccount?.agencia ?? "0001",
		conta: chosenAccount?.numeroConta ?? "0000123",
	};
	const ofx = buildOfx({ lines, dtStart, dtEnd, saldoFinal, account });

	const outDir = resolve(process.cwd(), "scripts", "output");
	mkdirSync(outDir, { recursive: true });
	const baseName = `extrato-teste-${organizacaoId.slice(0, 8)}-${startStr}-${months}m-seed${seed}`;
	const ofxPath = getArg("out") ? resolve(getArg("out") as string) : resolve(outDir, `${baseName}.ofx`);
	// OFX 1.x com CHARSET:1252 → grava em latin1 para preservar acentos ao decodificar no parser.
	writeFileSync(ofxPath, Buffer.from(ofx, "latin1"));

	const counts = {
		exatas: lines.filter((line) => line.categoria === "EXATA").length,
		fuzzy: lines.filter((line) => line.categoria === "FUZZY").length,
		composicao: lines.filter((line) => line.categoria === "COMPOSICAO").length,
		ruido: lines.filter((line) => line.categoria === "RUIDO").length,
		total: lines.length,
	};
	const expected = {
		organizacaoId,
		contaFinanceiraEmulada: chosenAccount ? { id: chosenAccount.id, nome: chosenAccount.nome, tipo: chosenAccount.tipo } : null,
		periodo: { inicio: dtStart.toISOString().slice(0, 10), fim: dtEnd.toISOString().slice(0, 10) },
		seed,
		saldoInicial,
		saldoFinal: Number(saldoFinal.toFixed(2)),
		counts,
		esperado: {
			EXATA: "match AUTOMATICO (confiança 1.0) quando a transação for única na janela de ±2 dias",
			FUZZY: "match HEURISTICO ou IA (valor igual, data/descrição divergentes)",
			COMPOSICAO: "grupo HEURISTICO — 1 linha ↔ 2 transações somadas",
			RUIDO: "NÃO identificado — candidato a 'criar lançamento' ou 'ignorar'",
		},
		linhas: lines.map((line) => ({
			fitid: line.fitid,
			data: line.data.toISOString().slice(0, 10),
			tipo: line.tipo,
			valor: line.valor,
			memo: line.memo,
			categoria: line.categoria,
			origemTransacaoIds: line.origemTransacaoIds,
		})),
	};
	const expectedPath = ofxPath.replace(/\.ofx$/, ".expected.json");
	writeFileSync(expectedPath, JSON.stringify(expected, null, 2));

	console.log(
		`[extrato-teste] linhas: ${counts.total} (exatas=${counts.exatas}, fuzzy=${counts.fuzzy}, composição=${counts.composicao}, ruído=${counts.ruido})`,
	);
	console.log(`[extrato-teste] OFX:      ${ofxPath}`);
	console.log(`[extrato-teste] esperado: ${expectedPath}`);
	if (candidates.length === 0) {
		console.warn("[extrato-teste] AVISO: nenhuma transação real no período — o arquivo é 100% ruído (só testa o caminho 'não identificado').");
	}
	console.log(
		`\nPróximo passo: no app, aba Financeiro → Conciliação, selecione ${chosenAccount ? `a conta "${chosenAccount.nome}"` : "uma conta"} e importe o .ofx.\n`,
	);

	await connection.end();
}

main().catch(async (error) => {
	console.error("[extrato-teste] ERRO:", error);
	await connection.end().catch(() => {});
	process.exit(1);
});
