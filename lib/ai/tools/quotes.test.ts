import assert from "node:assert/strict";
import test from "node:test";
import { QuoteInputSchema } from "./quotes";

test("input de orçamento aceita somente referências e quantidades", () => {
	const result = QuoteInputSchema.parse({
		itens: [{ produtoId: "produto-1", produtoVarianteId: "variante-1", quantidade: 2 }],
		observacoes: "Entregar pela manhã.",
	});

	assert.deepEqual(result, {
		itens: [{ produtoId: "produto-1", produtoVarianteId: "variante-1", quantidade: 2 }],
		observacoes: "Entregar pela manhã.",
	});
});

test("input de orçamento recusa valores monetários enviados pelo modelo", () => {
	assert.throws(() =>
		QuoteInputSchema.parse({
			itens: [{ produtoId: "produto-1", quantidade: 1, preco: 10, custo: 5 }],
			valorTotal: 10,
		}),
	);
});
