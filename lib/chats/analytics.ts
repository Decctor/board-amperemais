import { OPERATION_TIMEZONE } from "@/lib/operation-timezone";
import { sql, type SQL } from "drizzle-orm";

/**
 * Peças compartilhadas das estatísticas de atendimento.
 *
 * Duas convenções atravessam o módulo inteiro e explicam quase todas as decisões abaixo:
 *
 * **A abertura de um atendimento é `dataInsercao`, nunca `dataAtribuicao`.** Assumir,
 * atribuir e transferir reescrevem `dataAtribuicao` (ver `lib/chats/attendance-state.ts`),
 * então ela significa "o dono atual é dono desde" — usá-la como abertura produziria tempos
 * de resposta artificialmente curtos justamente nos atendimentos que mais trocaram de mão.
 *
 * **Cada métrica declara sua coorte.** Volume e primeira resposta são da coorte de
 * *abertura* (atendimentos que nasceram no período); encerramento e resolução são das
 * coortes de *fechamento* e *resolução*. Misturar as três — contar "tempo de resolução" dos
 * abertos no período — é o erro clássico: descarta justamente os casos longos, que ainda
 * não fecharam, e faz a operação parecer mais rápida do que é.
 */

/** Fuso das agregações por dia e do heatmap. Fixo até existir fuso por organização. */
export const CHAT_ANALYTICS_TIMEZONE = OPERATION_TIMEZONE;

/** Meta de primeira resposta. Constante única — vira configuração da organização depois. */
export const CHAT_FIRST_RESPONSE_TARGET_MINUTES = 15;

/** Abaixo desta amostra o p90 é ruído: a UI o omite em vez de exibir um número frágil. */
export const CHAT_ANALYTICS_MIN_SAMPLE_FOR_P90 = 10;

/** Faixas do histograma de primeira resposta, em segundos (limite superior exclusivo). */
export const CHAT_FIRST_RESPONSE_BUCKETS = [
	{ id: "ATE_5_MIN", label: "Até 5 min", limiteSegundos: 5 * 60 },
	{ id: "DE_5_A_15_MIN", label: "5–15 min", limiteSegundos: 15 * 60 },
	{ id: "DE_15_A_60_MIN", label: "15–60 min", limiteSegundos: 60 * 60 },
	{ id: "DE_1_A_4_H", label: "1–4 h", limiteSegundos: 4 * 60 * 60 },
	{ id: "ACIMA_DE_4_H", label: "Acima de 4 h", limiteSegundos: null },
] as const;

export type TChatDurationStats = {
	media: number | null;
	mediana: number | null;
	p90: number | null;
	/** Quantos atendimentos entraram no cálculo. Sem isso, um p90 sobre 3 casos parece um fato. */
	amostra: number;
};

/** Duração em segundos entre dois timestamps. Nula quando qualquer ponta é nula. */
export function secondsBetween(from: SQL | unknown, to: SQL | unknown): SQL<number | null> {
	return sql<number | null>`extract(epoch from (${to} - ${from}))::float8`;
}

/**
 * Média, mediana e p90 de uma duração, mais o tamanho da amostra.
 *
 * Mediana e p90 não são luxo: fila de atendimento tem cauda longa, e a média sozinha
 * esconde exatamente o pior caso — que é o que a gestão precisa ver. As agregações ignoram
 * nulos, então `amostra` já conta só quem tem a duração definida.
 */
export function durationStatsSelection(seconds: SQL<number | null>) {
	return {
		media: sql<number | null>`avg(${seconds})::float8`,
		mediana: sql<number | null>`(percentile_cont(0.5) within group (order by ${seconds}))::float8`,
		p90: sql<number | null>`(percentile_cont(0.9) within group (order by ${seconds}))::float8`,
		amostra: sql<number>`count(${seconds})::int`,
	};
}

/** Normaliza a linha crua do driver: nulos preservados, números garantidos. */
export function toDurationStats(row: { media: number | null; mediana: number | null; p90: number | null; amostra: number }): TChatDurationStats {
	return {
		media: row.media === null ? null : Number(row.media),
		mediana: row.mediana === null ? null : Number(row.mediana),
		p90: row.p90 === null ? null : Number(row.p90),
		amostra: Number(row.amostra ?? 0),
	};
}

/** Divisão que devolve 0 em vez de NaN/Infinity — todo denominador aqui pode ser zero. */
export function safeRatio(numerator: number, denominator: number) {
	if (!denominator) return 0;
	return numerator / denominator;
}

export { inOperationTimezone } from "@/lib/operation-timezone";

/** `now()` como `timestamp` UTC sem fuso, para comparar com as colunas do módulo. */
export function nowAsNaiveUtc(): SQL {
	return sql`(now() at time zone 'UTC')`;
}

/**
 * Uma data como parâmetro de um template `sql` cru.
 *
 * **Nunca interpole um `Date` direto em `sql\`\``.** Operadores como `between(coluna, a, b)`
 * funcionam porque conhecem a coluna e aplicam o `mapToDriverValue` dela; num template cru
 * não há coluna, o `Date` chega inteiro ao postgres-js e o driver estoura com
 * `The "string" argument must be of type string ... Received an instance of Date`. O erro é
 * de execução, não de tipo — o TypeScript aceita `${data}` sem reclamar, e a rota só quebra
 * em produção.
 *
 * `toISOString()` produz UTC, e o `::timestamp` descarta o designador de fuso: o resultado é
 * exatamente o UTC-sem-fuso que as colunas do módulo guardam.
 */
export function naiveUtcParam(date: Date): SQL {
	return sql`${date.toISOString()}::timestamp`;
}

/** Períodos longos em barras diárias viram serrilha ilegível; acima de 90 dias, semana. */
export function resolveGranularity({ startDate, endDate }: { startDate: Date; endDate: Date }): "DIA" | "SEMANA" {
	const days = (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000);
	return days > 90 ? "SEMANA" : "DIA";
}
