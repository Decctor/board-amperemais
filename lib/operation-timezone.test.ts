import assert from "node:assert/strict";
import { test } from "node:test";
import { PgDialect } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { inOperationTimezone, localDayKey, OPERATION_TIMEZONE } from "./operation-timezone";

/**
 * O contrato destas expressões é textual, não semântico.
 *
 * O postgres casa `GROUP BY` com `SELECT` comparando o texto das expressões depois do parse. Enquanto
 * o fuso viajava como parâmetro vinculado, cada uso ganhava um placeholder diferente — `$1` no select,
 * `$6` no group by — e o planejador via duas expressões distintas, derrubando toda query agrupada por
 * dia com "column must appear in the GROUP BY clause".
 *
 * Um teste de valor de retorno nunca pegaria isso: as duas chamadas devolvem objetos equivalentes. O
 * que precisa ser verificado é o SQL gerado.
 */

const dialect = new PgDialect();

function serialize(expression: ReturnType<typeof inOperationTimezone>) {
	return dialect.sqlToQuery(expression);
}

test("a conversão de fuso não gera parâmetro vinculado", () => {
	const { params } = serialize(inOperationTimezone(sql`"vendas"."data_venda"`));
	assert.deepEqual(params, []);
});

test("o fuso aparece como literal dentro do SQL", () => {
	const { sql: text } = serialize(inOperationTimezone(sql`"vendas"."data_venda"`));
	assert.ok(text.includes(`at time zone '${OPERATION_TIMEZONE}'`), text);
	assert.ok(text.includes("at time zone 'UTC'"), text);
});

test("duas chamadas produzem texto idêntico, que é o que o GROUP BY exige", () => {
	const noSelect = serialize(sql`to_char(${inOperationTimezone(sql`"vendas"."data_venda"`)}, 'YYYY-MM-DD')`);
	const noGroupBy = serialize(sql`to_char(${inOperationTimezone(sql`"vendas"."data_venda"`)}, 'YYYY-MM-DD')`);

	assert.equal(noSelect.sql, noGroupBy.sql);
	assert.deepEqual(noSelect.params, []);
	assert.deepEqual(noGroupBy.params, []);
});

test("select e group by de uma query real saem com a mesma expressão", () => {
	// A query real tem parâmetros próprios (organização, natureza, datas). Eles podem existir; o que
	// não pode é a expressão de fuso consumir um deles e mudar de texto entre o select e o group by.
	const dayExpression = () => localDayKey(sql`"vendas"."data_venda"`);
	const query = sql`select ${dayExpression()}, sum("valor") from "vendas" where "org" = ${"org-1"} and "nat" = ${"SN01"} group by ${dayExpression()}`;
	const { sql: text, params } = serialize(query);

	// Os parâmetros da query são só os dela: a expressão de fuso não entra na numeração.
	assert.deepEqual(params, ["org-1", "SN01"]);

	const expected = `to_char((("vendas"."data_venda") at time zone 'UTC' at time zone '${OPERATION_TIMEZONE}'), 'YYYY-MM-DD')`;
	// Duas ocorrências textualmente idênticas — a condição exata que o postgres cobra do GROUP BY.
	assert.equal(text.split(expected).length - 1, 2, text);
});

test("a chave de dia local usa to_char sobre a data convertida", () => {
	const { sql: text, params } = serialize(localDayKey(sql`"vendas"."data_venda"`));
	assert.ok(text.startsWith("to_char("), text);
	assert.ok(text.includes("'YYYY-MM-DD'"), text);
	assert.deepEqual(params, []);
});
