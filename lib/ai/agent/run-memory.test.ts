import assert from "node:assert/strict";
import test from "node:test";
import { extractCatalogMemory, mergeRunSummary } from "./run-memory";

const catalogToolResult = {
	toolName: "produtos_consultar",
	output: {
		success: true,
		result: {
			produtos: [
				{
					produtoId: "produto-1",
					nome: "Maxi Ducha",
					preco: 80,
					variacoes: [{ produtoVarianteId: "variante-1", nome: "127V 5500W", preco: 87.3 }],
				},
			],
		},
	},
};

test("anexa referências canônicas do catálogo ao resumo interno", () => {
	const summary = mergeRunSummary({ modelSummary: "Cliente escolhe um chuveiro.", previousSummary: null, toolResults: [catalogToolResult] });
	assert.match(summary, /produtoId=produto-1/);
	assert.match(summary, /produtoVarianteId=variante-1/);
	assert.match(summary, /Maxi Ducha/);
});

test("preserva a memória anterior quando a run não consulta o catálogo", () => {
	const previousSummary = mergeRunSummary({ modelSummary: "Busca concluída.", previousSummary: null, toolResults: [catalogToolResult] });
	const nextSummary = mergeRunSummary({ modelSummary: "Aguardando quantidade.", previousSummary, toolResults: [] });
	assert.equal(extractCatalogMemory(nextSummary), extractCatalogMemory(previousSummary));
});

test("remove a memória após criar o orçamento", () => {
	const previousSummary = mergeRunSummary({ modelSummary: "Busca concluída.", previousSummary: null, toolResults: [catalogToolResult] });
	const nextSummary = mergeRunSummary({
		modelSummary: "Orçamento criado.",
		previousSummary,
		toolResults: [{ toolName: "orcamentos_criar", output: { success: true, result: { orcamentoId: "orcamento-1" } } }],
	});
	assert.equal(extractCatalogMemory(nextSummary), null);
});
