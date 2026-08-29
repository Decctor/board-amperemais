import assert from "node:assert/strict";
import test from "node:test";
import dayjs from "dayjs";
import { DEFAULT_PERIOD_DAYS, resolvePeriod } from "./period";

test("sem período, usa a janela padrão terminando hoje", () => {
	// O default precisa ser o mesmo em todo cliente: sem isso, Claude e ChatGPT respondem
	// faturamentos diferentes para a mesma pergunta.
	const period = resolvePeriod(null);
	assert.equal(dayjs(period.before).diff(dayjs(period.after), "days"), DEFAULT_PERIOD_DAYS);
});

test("fim fecha no último instante do dia", () => {
	// "até 31/03" quer dizer o dia 31 inteiro; cortar em 00:00 perderia um dia de vendas calado.
	const period = resolvePeriod({ inicio: "2026-03-01", fim: "2026-03-31" });
	assert.equal(dayjs(period.before).hour(), 23);
	assert.equal(dayjs(period.before).minute(), 59);
	assert.equal(dayjs(period.after).hour(), 0);
});

test("intervalo invertido é normalizado em vez de devolver zero venda", () => {
	const period = resolvePeriod({ inicio: "2026-03-31", fim: "2026-03-01" });
	assert.ok(dayjs(period.after).isBefore(dayjs(period.before)));
	assert.equal(dayjs(period.after).date(), 1);
	assert.equal(dayjs(period.before).date(), 31);
});

test("data inválida cai no default em vez de propagar Invalid Date", () => {
	const period = resolvePeriod({ inicio: "mês passado", fim: null });
	assert.ok(dayjs(period.after).isValid());
	assert.equal(dayjs(period.before).diff(dayjs(period.after), "days"), DEFAULT_PERIOD_DAYS);
});

test("só o início informado estende o período até hoje", () => {
	const period = resolvePeriod({ inicio: "2026-01-01", fim: null });
	assert.equal(dayjs(period.after).year(), 2026);
	assert.equal(dayjs(period.before).format("YYYY-MM-DD"), dayjs().format("YYYY-MM-DD"));
});
