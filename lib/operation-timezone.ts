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
 */
export function inOperationTimezone(column: SQL | unknown): SQL {
	return sql`((${column}) at time zone 'UTC' at time zone ${OPERATION_TIMEZONE})`;
}

/** A data local de um timestamp, como texto `YYYY-MM-DD`. Chave canônica das séries por dia. */
export function localDayKey(column: SQL | unknown): SQL<string> {
	return sql<string>`to_char(${inOperationTimezone(column)}, 'YYYY-MM-DD')`;
}
