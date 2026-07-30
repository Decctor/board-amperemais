import assert from "node:assert/strict";
import test from "node:test";
import { extractSearchTokens } from "./search";

test("tokeniza frase livre separando por não alfanuméricos", () => {
	assert.deepEqual(extractSearchTokens("coca-cola 2l gelada"), ["coca", "cola", "2l", "gelada"]);
});

test("descarta tokens curtos demais para discriminar", () => {
	assert.deepEqual(extractSearchTokens("pão de queijo"), ["pão", "de", "queijo"]);
	assert.deepEqual(extractSearchTokens("a b vinho"), ["vinho"]);
});

test("limita a quantidade de tokens", () => {
	assert.deepEqual(extractSearchTokens("um dois tres quatro cinco seis sete"), ["um", "dois", "tres", "quatro", "cinco"]);
});

test("frase sem token aproveitável devolve lista vazia", () => {
	assert.deepEqual(extractSearchTokens("a e i"), []);
});
