import assert from "node:assert/strict";
import test from "node:test";
import { resolveSaleItemCost } from "./resolve-sale-items";

test("custo da variante prevalece sobre o custo do produto", () => {
	assert.equal(resolveSaleItemCost(10, 7), 7);
});

test("custo do produto é usado quando a variante não possui custo", () => {
	assert.equal(resolveSaleItemCost(10, null), 10);
});

test("custo ausente é normalizado para zero", () => {
	assert.equal(resolveSaleItemCost(null, null), 0);
});

test("custo explicitamente zero continua válido", () => {
	assert.equal(resolveSaleItemCost(10, 0), 0);
});
