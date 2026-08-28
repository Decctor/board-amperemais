import assert from "node:assert/strict";
import test from "node:test";
import { resolveChannelAvailability, resolveChannelPrice } from "./sales-channels";

const product = { ativo: true, vendavel: true, precoVenda: 20, rastreamentoEstoqueAtivo: false, quantidade: 0 };

test("ausência de override herda o padrão do canal, nos dois modos", () => {
	// O caso que justifica a tabela esparsa: sem linha, o modo do canal decide sozinho.
	assert.equal(resolveChannelAvailability({ product, channel: { canal: "POS", catalogoModo: "TODOS" } }), true);
	assert.equal(resolveChannelAvailability({ product, channel: { canal: "POS", catalogoModo: "SELECIONADOS" } }), false);
});

test("override explícito do produto vence o padrão do canal nos dois sentidos", () => {
	assert.equal(
		resolveChannelAvailability({ product, channel: { canal: "POS", catalogoModo: "TODOS" }, overrides: { product: { disponivel: false } } }),
		false,
	);
	assert.equal(
		resolveChannelAvailability({ product, channel: { canal: "POS", catalogoModo: "SELECIONADOS" }, overrides: { product: { disponivel: true } } }),
		true,
	);
});

test("variante herda a presença do produto e só pode restringir", () => {
	const variant = { ativo: true, precoVenda: 25 };
	// Produto incluído em modo SELECIONADOS: variantes seguem sem precisar de linha própria.
	assert.equal(
		resolveChannelAvailability({
			product,
			variant,
			channel: { canal: "POS", catalogoModo: "SELECIONADOS" },
			overrides: { product: { disponivel: true } },
		}),
		true,
	);
	// Linha da variante restringe dentro de um produto visível.
	assert.equal(
		resolveChannelAvailability({
			product,
			variant,
			channel: { canal: "POS", catalogoModo: "TODOS" },
			overrides: { variant: { disponivel: false } },
		}),
		false,
	);
	// Linha disponivel=true numa variante NÃO ressuscita um produto excluído do canal.
	assert.equal(
		resolveChannelAvailability({
			product,
			variant,
			channel: { canal: "POS", catalogoModo: "TODOS" },
			overrides: { product: { disponivel: false }, variant: { disponivel: true } },
		}),
		false,
	);
});

test("vendabilidade e atividade bloqueiam antes de qualquer override", () => {
	// Matéria-prima não volta a ser vendável porque alguém marcou disponível no canal.
	assert.equal(
		resolveChannelAvailability({
			product: { ...product, vendavel: false },
			channel: { canal: "POS", catalogoModo: "TODOS" },
			overrides: { product: { disponivel: true } },
		}),
		false,
	);
	assert.equal(
		resolveChannelAvailability({
			product: { ...product, ativo: false },
			channel: { canal: "POS", catalogoModo: "TODOS" },
			overrides: { product: { disponivel: true } },
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
		resolveChannelAvailability({ product: semPreco, channel: { canal: "SHOP", catalogoModo: "TODOS" }, overrides: { product: { precoVenda: 15 } } }),
		true,
	);
});

test("o preço resolve por nó: override do nó, senão o preço base do nó", () => {
	assert.equal(resolveChannelPrice(product, null, { product: { precoVenda: 25 } }), 25);
	assert.equal(resolveChannelPrice(product, { ativo: true, precoVenda: 30 }, {}), 30);
	assert.equal(resolveChannelPrice(product, null, {}), 20);
	// O override da variante vence o preço da própria variante.
	assert.equal(resolveChannelPrice(product, { ativo: true, precoVenda: 30 }, { variant: { precoVenda: 27 } }), 27);
	// Override nível-produto NÃO vaza para a venda de uma variante (node-scoped).
	assert.equal(resolveChannelPrice(product, { ativo: true, precoVenda: 30 }, { product: { precoVenda: 27 } }), 30);
});
