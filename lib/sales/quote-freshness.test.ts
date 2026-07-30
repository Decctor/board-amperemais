import assert from "node:assert/strict";
import { test } from "node:test";
import { QUOTE_STALE_AFTER_DAYS, resolveQuoteCreationDate, resolveQuoteFreshness } from "./quote-freshness";

test("data de criação vem do carimbo do rascunho", () => {
	const criadoEm = resolveQuoteCreationDate({
		rascunhoMetadados: { origem: { tipo: "HUB" }, criadoEm: "2026-07-20T12:00:00.000Z" },
		idExterno: "HUB-abc",
	});
	assert.equal(criadoEm?.toISOString(), "2026-07-20T12:00:00.000Z");
});

test("carimbo do rascunho prevalece sobre o epoch do idExterno legado", () => {
	const criadoEm = resolveQuoteCreationDate({
		rascunhoMetadados: { criadoEm: "2026-07-20T12:00:00.000Z" },
		idExterno: "POS-1700000000000",
	});
	assert.equal(criadoEm?.toISOString(), "2026-07-20T12:00:00.000Z");
});

test("rascunho legado do POS tem a data reconstruída do epoch no idExterno", () => {
	const criadoEm = resolveQuoteCreationDate({ rascunhoMetadados: null, idExterno: "POS-1700000000000" });
	assert.equal(criadoEm?.getTime(), 1_700_000_000_000);
});

test("orçamento sem carimbo e sem epoch não recebe data inventada", () => {
	assert.equal(resolveQuoteCreationDate({ rascunhoMetadados: null, idExterno: "AI-op-123" }), null);
	assert.equal(resolveQuoteCreationDate({ rascunhoMetadados: {}, idExterno: null }), null);
});

test("carimbo inválido não vira data", () => {
	assert.equal(resolveQuoteCreationDate({ rascunhoMetadados: { criadoEm: "ontem" }, idExterno: null }), null);
	assert.equal(resolveQuoteCreationDate({ rascunhoMetadados: { criadoEm: 1700000000000 }, idExterno: null }), null);
});

test("idExterno do hub não é confundido com epoch do POS", () => {
	assert.equal(resolveQuoteCreationDate({ rascunhoMetadados: null, idExterno: "HUB-1700000000000" }), null);
});

test("frescor é nulo quando a data de criação é desconhecida", () => {
	assert.equal(resolveQuoteFreshness(null), null);
});

test("orçamento recente não é marcado como envelhecido", () => {
	const now = new Date("2026-07-20T12:00:00.000Z");
	const frescor = resolveQuoteFreshness(new Date("2026-07-19T12:00:00.000Z"), now);
	assert.deepEqual(frescor, { dias: 1, envelhecido: false });
});

test("orçamento envelhece exatamente no limite configurado", () => {
	const now = new Date("2026-07-20T12:00:00.000Z");
	const limite = new Date(now.getTime() - QUOTE_STALE_AFTER_DAYS * 86_400_000);
	assert.deepEqual(resolveQuoteFreshness(limite, now), { dias: QUOTE_STALE_AFTER_DAYS, envelhecido: true });

	const umDiaAntes = new Date(now.getTime() - (QUOTE_STALE_AFTER_DAYS - 1) * 86_400_000);
	assert.equal(resolveQuoteFreshness(umDiaAntes, now)?.envelhecido, false);
});

test("data futura não produz idade negativa", () => {
	const now = new Date("2026-07-20T12:00:00.000Z");
	assert.deepEqual(resolveQuoteFreshness(new Date("2026-07-25T12:00:00.000Z"), now), { dias: 0, envelhecido: false });
});
