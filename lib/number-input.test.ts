import assert from "node:assert/strict";
import { test } from "node:test";
import { formatNumberInputValue, parseNumberInputText, sanitizeNumberInputText } from "./number-input";

test("interpreta números formatados em pt-BR e en-US", () => {
	assert.equal(parseNumberInputText("1.234,56"), 1234.56);
	assert.equal(parseNumberInputText("1,234.56"), 1234.56);
});

test("não aceita sinais espalhados pelo valor", () => {
	assert.equal(sanitizeNumberInputText("1-2"), "12");
	assert.equal(parseNumberInputText("-12,5"), -12.5);
});

test("mantém uma representação decimal adequada ao input", () => {
	assert.equal(formatNumberInputValue(12.5), "12,5");
	assert.equal(formatNumberInputValue(null), "");
});
