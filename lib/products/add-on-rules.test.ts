import assert from "node:assert/strict";
import test from "node:test";
import { resolveAddOnReferenceRules, resolveAddOnReferencesRules } from "./add-on-rules";
import { channelAddOnReferences } from "./sales-channels";

const grupo = { minOpcoes: 1, maxOpcoes: 2, nome: "Sabores", opcoes: [] };

test("sem override, o vínculo entrega a regra do grupo intacta", () => {
	const reference = { minOpcoes: null, maxOpcoes: null, grupo };
	const resolved = resolveAddOnReferenceRules(reference);
	assert.equal(resolved.grupo.minOpcoes, 1);
	assert.equal(resolved.grupo.maxOpcoes, 2);
	// Sem override não há motivo para clonar: preserva a identidade e evita rerender à toa.
	assert.equal(resolved, reference);
});

test("override do vínculo vence o padrão do grupo, campo a campo", () => {
	// O caso que justifica a coluna: mesma lista de sabores, máximo por tamanho do gelato.
	assert.equal(resolveAddOnReferenceRules({ minOpcoes: null, maxOpcoes: 3, grupo }).grupo.maxOpcoes, 3);
	assert.equal(resolveAddOnReferenceRules({ minOpcoes: null, maxOpcoes: 3, grupo }).grupo.minOpcoes, 1);
	assert.equal(resolveAddOnReferenceRules({ minOpcoes: 0, maxOpcoes: null, grupo }).grupo.minOpcoes, 0);
	assert.equal(resolveAddOnReferenceRules({ minOpcoes: 0, maxOpcoes: null, grupo }).grupo.maxOpcoes, 2);
});

test("override de zero é respeitado (não confundir com ausência)", () => {
	assert.equal(resolveAddOnReferenceRules({ minOpcoes: 0, maxOpcoes: null, grupo: { ...grupo, minOpcoes: 2 } }).grupo.minOpcoes, 0);
});

test("resolver não muta o grupo compartilhado entre vínculos", () => {
	const shared = { ...grupo };
	const references = [
		{ minOpcoes: null, maxOpcoes: 1, grupo: shared },
		{ minOpcoes: null, maxOpcoes: 3, grupo: shared },
	];
	const resolved = resolveAddOnReferencesRules(references);
	assert.equal(resolved[0].grupo.maxOpcoes, 1);
	assert.equal(resolved[1].grupo.maxOpcoes, 3);
	assert.equal(shared.maxOpcoes, 2, "o grupo original não pode ser alterado por nenhum vínculo");
});

test("política de canal roda depois do override e só zera o mínimo", () => {
	// Ordem real das rotas: resolver o vínculo primeiro, canal depois. O máximo do vínculo
	// precisa sobreviver ao relaxamento de mínimos do balcão.
	const [resolved] = channelAddOnReferences(
		{ exigirAdicionaisMinimos: false },
		resolveAddOnReferencesRules([{ minOpcoes: null, maxOpcoes: 3, grupo }]),
	);
	assert.equal(resolved.grupo.minOpcoes, 0);
	assert.equal(resolved.grupo.maxOpcoes, 3);
});
