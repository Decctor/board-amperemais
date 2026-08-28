import assert from "node:assert/strict";
import test from "node:test";
import { resolveChannelAvailability, resolveChannelPrice } from "./sales-channels";

const product = { ativo: true, vendavel: true, precoVenda: 20, rastreamentoEstoqueAtivo: false, quantidade: 0 };

test("ausência de override herda o padrão do canal, nos dois modos", () => {
	// O caso que justifica a tabela esparsa: sem linha, o modo do canal decide sozinho.
	assert.equal(resolveChannelAvailability({ product, channel: { canal: "POS", catalogoModo: "TODOS" } }), true);
	assert.equal(resolveChannelAvailability({ product, channel: { canal: "POS", catalogoModo: "SELECIONADOS" } }), false);
});

test("override explícito vence o padrão do canal nos dois sentidos", () => {
	assert.equal(resolveChannelAvailability({ product, channel: { canal: "POS", catalogoModo: "TODOS" }, override: { disponivel: false } }), false);
	assert.equal(resolveChannelAvailability({ product, channel: { canal: "POS", catalogoModo: "SELECIONADOS" }, override: { disponivel: true } }), true);
});

test("vendabilidade e atividade bloqueiam antes de qualquer override", () => {
	// Matéria-prima não volta a ser vendável porque alguém marcou disponível no canal.
	assert.equal(
		resolveChannelAvailability({
			product: { ...product, vendavel: false },
			channel: { canal: "POS", catalogoModo: "TODOS" },
			override: { disponivel: true },
		}),
		false,
	);
	assert.equal(
		resolveChannelAvailability({
			product: { ...product, ativo: false },
			channel: { canal: "POS", catalogoModo: "TODOS" },
			override: { disponivel: true },
		}),
		false,
	);
});

test("os gates de preço e estoque valem só para a loja digital", () => {
	const semEstoque = { ...product, rastreamentoEstoqueAtivo: true };
	assert.equal(resolveChannelAvailability({ product: semEstoque, channel: { canal: "SHOP", catalogoModo: "TODOS" } }), false);
	assert.equal(resolveChannelAvailability({ product: semEstoque, channel: { canal: "POS", catalogoModo: "TODOS" } }), true);

	const semPreco = { ...product, precoVenda: 0 };
	assert.equal(resolveChannelAvailability({ product: semPreco, channel: { canal: "SHOP", catalogoModo: "TODOS" } }), false);
	// Um override de preço no canal torna vendável na loja um produto sem preço base.
	assert.equal(
		resolveChannelAvailability({ product: semPreco, channel: { canal: "SHOP", catalogoModo: "TODOS" }, override: { precoVenda: 15 } }),
		true,
	);
});

test("o preço resolve por nó: override, depois variante, depois produto", () => {
	assert.equal(resolveChannelPrice(product, null, { precoVenda: 25 }), 25);
	assert.equal(resolveChannelPrice(product, { ativo: true, precoVenda: 30 }, null), 30);
	assert.equal(resolveChannelPrice(product, null, null), 20);
	// O override do nó vence o preço da própria variante, não o da raiz.
	assert.equal(resolveChannelPrice(product, { ativo: true, precoVenda: 30 }, { precoVenda: 27 }), 27);
});
