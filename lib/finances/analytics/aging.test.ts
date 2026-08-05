import assert from "node:assert/strict";
import test from "node:test";
import { bucketPendingByDueDate } from "./aging";

const reference = new Date("2026-08-05T12:00:00.000Z");
const daysFromReference = (days: number) => new Date(new Date("2026-08-05T00:00:00.000Z").getTime() + days * 24 * 60 * 60 * 1000);

test("buckets pending transactions by days until due and accumulates totals", () => {
	const result = bucketPendingByDueDate(
		[
			{ tipo: "ENTRADA", valor: 100, dataPrevisao: daysFromReference(-70) }, // VENCIDO +60
			{ tipo: "ENTRADA", valor: 50, dataPrevisao: daysFromReference(-10) }, // VENCIDO 1-30
			{ tipo: "ENTRADA", valor: 200, dataPrevisao: daysFromReference(15) }, // A VENCER 0-30
			{ tipo: "SAIDA", valor: 80, dataPrevisao: daysFromReference(-40) }, // VENCIDO 31-60
			{ tipo: "SAIDA", valor: 120, dataPrevisao: daysFromReference(45) }, // A VENCER 31-60
			{ tipo: "SAIDA", valor: 30, dataPrevisao: null }, // sem previsão → A VENCER 0-30
		],
		reference,
	);

	assert.equal(result.totalAReceber, 350);
	assert.equal(result.totalAPagar, 230);
	assert.equal(result.vencidoAReceber, 150);
	assert.equal(result.vencidoAPagar, 80);

	const byKey = Object.fromEntries(result.vencimentos.map((bucket) => [bucket.chave, bucket]));
	assert.equal(byKey["vencido-60-plus"].receber, 100);
	assert.equal(byKey["vencido-1-30"].receber, 50);
	assert.equal(byKey["a-vencer-0-30"].receber, 200);
	assert.equal(byKey["vencido-31-60"].pagar, 80);
	assert.equal(byKey["a-vencer-31-60"].pagar, 120);
	assert.equal(byKey["a-vencer-0-30"].pagar, 30);
});

test("due today counts as a vencer, not vencido", () => {
	const result = bucketPendingByDueDate([{ tipo: "ENTRADA", valor: 10, dataPrevisao: daysFromReference(0) }], reference);
	assert.equal(result.vencidoAReceber, 0);
	assert.equal(result.vencimentos.find((bucket) => bucket.chave === "a-vencer-0-30")?.receber, 10);
});
