import assert from "node:assert/strict";
import test from "node:test";
import { findProductGroupByName } from "./product-groups";

const groups = [
	{ grupo: "Bebidas", quantidadeProdutos: 42 },
	{ grupo: "Padaria", quantidadeProdutos: 17 },
	{ grupo: "Açaí e Sorvetes", quantidadeProdutos: 8 },
];

test("encontra grupo ignorando caixa", () => {
	assert.equal(findProductGroupByName(groups, "BEBIDAS")?.grupo, "Bebidas");
	assert.equal(findProductGroupByName(groups, "bebidas")?.grupo, "Bebidas");
});

test("encontra grupo ignorando acentos", () => {
	assert.equal(findProductGroupByName(groups, "acai e sorvetes")?.grupo, "Açaí e Sorvetes");
});

test("ignora espaços nas pontas", () => {
	assert.equal(findProductGroupByName(groups, "  Padaria ")?.grupo, "Padaria");
});

test("grupo inexistente devolve null", () => {
	assert.equal(findProductGroupByName(groups, "Bebida"), null);
	assert.equal(findProductGroupByName(groups, "Eletrônicos"), null);
});
