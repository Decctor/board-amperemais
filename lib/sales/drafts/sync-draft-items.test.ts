import assert from "node:assert/strict";
import { test } from "node:test";
import { buildDraftItemSnapshot, modifierIdentityKey } from "./sync-draft-items";

test("a mesma escolha de adicionais em ordens diferentes é a mesma identidade", () => {
	const a = modifierIdentityKey([
		{ opcaoId: "bacon", quantidade: 2 },
		{ opcaoId: "queijo", quantidade: 1 },
	]);
	const b = modifierIdentityKey([
		{ opcaoId: "queijo", quantidade: 1 },
		{ opcaoId: "bacon", quantidade: 2 },
	]);
	assert.equal(a, b);
});

test("mudar a quantidade de um adicional muda a identidade", () => {
	const antes = modifierIdentityKey([{ opcaoId: "bacon", quantidade: 1 }]);
	const depois = modifierIdentityKey([{ opcaoId: "bacon", quantidade: 2 }]);
	assert.notEqual(antes, depois);
});

test("remover todos os adicionais muda a identidade", () => {
	assert.notEqual(modifierIdentityKey([{ opcaoId: "bacon", quantidade: 1 }]), modifierIdentityKey([]));
});

test("o snapshot preserva a decomposição base + adicionais, que a coluna de unitário não expressa", () => {
	const snapshot = buildDraftItemSnapshot({
		produtoId: "p1",
		nome: "X-Burger",
		codigo: "XB",
		quantidade: 2,
		valorUnitarioBase: 40,
		valorModificadores: 8,
		valorUnitarioFinal: 48,
		valorTotalBruto: 96,
		valorDesconto: 0,
		valorTotalLiquido: 96,
		modificadores: [{ opcaoId: "bacon", nome: "Bacon", quantidade: 1, valorUnitario: 8, valorTotal: 8 }],
	});

	assert.equal(snapshot.valorUnitarioBase, 40);
	assert.equal(snapshot.valorModificadores, 8);
	assert.equal(snapshot.modificadores.length, 1);
	// 48 sozinho não permite reconstruir 40 + 8; é por isso que o snapshot existe.
	assert.equal(snapshot.valorUnitarioBase + snapshot.valorModificadores, 48);
});

test("o snapshot normaliza ausências em null em vez de undefined", () => {
	const snapshot = buildDraftItemSnapshot({
		produtoId: "p1",
		nome: "Café",
		codigo: "CF",
		quantidade: 1,
		valorUnitarioBase: 5,
		valorModificadores: 0,
		valorUnitarioFinal: 5,
		valorTotalBruto: 5,
		valorDesconto: 0,
		valorTotalLiquido: 5,
		modificadores: [],
	});

	assert.equal(snapshot.imagemUrl, null);
	assert.equal(snapshot.produtoVarianteId, null);
});
