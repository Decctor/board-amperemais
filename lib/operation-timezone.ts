import { sql, type SQL } from "drizzle-orm";

/**
 * Fuso da operação para agregações por dia, dia da semana e hora.
 *
 * Fixo até existir fuso por organização. Todo módulo que agrupa por unidade de calendário precisa
 * passar por aqui: uma venda das 21h em São Paulo é 00h do dia seguinte em UTC, e é assim que a
 * coluna está gravada.
 */
export const OPERATION_TIMEZONE = "America/Sao_Paulo";

/**
 * O fuso como **literal** SQL, nunca como parâmetro vinculado.
 *
 * O postgres casa as expressões do `GROUP BY` com as do `SELECT` por texto. Um `${OPERATION_TIMEZONE}`
 * num template do drizzle vira um placeholder, e cada uso gera um número novo — o mesmo
 * `at time zone` aparecia como `$1` no select e `$6` no group by, expressões diferentes aos olhos do
 * planejador, e a query morria com "column must appear in the GROUP BY clause".
 *
 * Interpolação crua é segura aqui porque o valor é uma constante do módulo, jamais entrada de
 * usuário. A validação abaixo existe para que continue assim se alguém trocar a constante.
 */
if (!/^[A-Za-z]+\/[A-Za-z_]+$/.test(OPERATION_TIMEZONE)) throw new Error(`Fuso da operação inválido: ${OPERATION_TIMEZONE}`);
const OPERATION_TIMEZONE_LITERAL = sql.raw(`'${OPERATION_TIMEZONE}'`);

/**
 * Converte um `timestamp` (sem fuso, guardando UTC) para o horário local da operação.
 *
 * A dupla conversão não é redundância. As colunas de data do produto são `timestamp without time
 * zone` alimentadas sob `TimeZone = UTC`, ou seja: valores UTC sem fuso declarado. Um
 * `AT TIME ZONE 'America/Sao_Paulo'` sozinho **interpretaria** o valor como horário de São Paulo e
 * o deslocaria para o lado errado — uma venda das 21h UTC (18h local) cairia às 00h do dia
 * seguinte em vez de às 18h, jogando o movimento do fim da tarde para a madrugada do dia errado.
 *
 * O primeiro `AT TIME ZONE 'UTC'` declara o fuso que o valor já tem; o segundo converte para o
 * fuso da operação.
 *
 * A expressão devolvida não carrega nenhum parâmetro, de propósito: ela precisa render texto
 * idêntico no `SELECT` e no `GROUP BY`. Ver `OPERATION_TIMEZONE_LITERAL`.
 */
export function inOperationTimezone(column: SQL | unknown): SQL {
	return sql`((${column}) at time zone 'UTC' at time zone ${OPERATION_TIMEZONE_LITERAL})`;
}

/** A data local de um timestamp, como texto `YYYY-MM-DD`. Chave canônica das séries por dia. */
export function localDayKey(column: SQL | unknown): SQL<string> {
	return sql<string>`to_char(${inOperationTimezone(column)}, 'YYYY-MM-DD')`;
}

/**
 * Formatador de data/hora no fuso da operação, para texto que vai impresso ou enviado.
 *
 * `formatDateAsLocale` formata no fuso do processo. No navegador isso acerta, porque o processo é a
 * máquina do lojista. No servidor não: o Vercel roda em UTC, e um cupom emitido às 18h28 em São
 * Paulo saía do papel marcado como 21h28 — três horas no futuro, no documento que o cliente usa para
 * conferir o pedido. Todo texto renderizado no servidor com hora do dia precisa passar por aqui.
 *
 * Cuidado ao aplicar em data sem hora (validade, fabricação): esses valores são gravados à
 * meia-noite UTC, e convertê-los para São Paulo os joga para o dia anterior.
 */
const OPERATION_DATE_TIME_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
	timeZone: OPERATION_TIMEZONE,
	day: "2-digit",
	month: "2-digit",
	year: "numeric",
	hour: "2-digit",
	minute: "2-digit",
	// h23 e não `hour12: false`: em parte das versões do ICU o segundo devolve "24" à meia-noite.
	hourCycle: "h23",
});

/** `DD/MM/YYYY HH:mm` no fuso da operação. `null` para entrada ausente ou inválida. */
export function formatDateTimeInOperationTimezone(date?: string | Date | null) {
	if (!date) return null;

	const parsed = date instanceof Date ? date : new Date(date);
	if (Number.isNaN(parsed.getTime())) return null;

	const parts: Record<string, string> = {};
	for (const part of OPERATION_DATE_TIME_FORMATTER.formatToParts(parsed)) parts[part.type] = part.value;

	return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}`;
}
