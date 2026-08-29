import assert from "node:assert/strict";
import test from "node:test";
import { applyColumnMapping, parseNumericValue, suggestColumnMapping } from "./stock-position-parser";

test("lê número no formato brasileiro e no americano", () => {
	// 1.234,56 e 1,234.56 são o mesmo valor escrito por dois ERPs diferentes.
	assert.equal(parseNumericValue("1.234,56"), 1234.56);
	assert.equal(parseNumericValue("1,234.56"), 1234.56);
	assert.equal(parseNumericValue("230,00"), 230);
	assert.equal(parseNumericValue("R$ 4,83"), 4.83);
	assert.equal(parseNumericValue("-15"), -15);
	assert.equal(parseNumericValue(""), null);
	assert.equal(parseNumericValue(null), null);
});

test("trata separador de milhar sem decimais", () => {
	// "1.234" é mil duzentos e trinta e quatro, não 1,234. Ler errado divide a compra por mil.
	assert.equal(parseNumericValue("1.234"), 1234);
	assert.equal(parseNumericValue("1,234"), 1234);
});

test("reconhece as colunas do relatório de estoque", () => {
	const mapeamento = suggestColumnMapping(["CODIGO", "DESCRIÇÃO", "ESTOQUE", "CUSTO MÉDIO", "PREÇO VENDA", "FORNECEDOR"]);
	assert.equal(mapeamento.codigo, "CODIGO");
	assert.equal(mapeamento.descricao, "DESCRIÇÃO");
	assert.equal(mapeamento.quantidade, "ESTOQUE");
	assert.equal(mapeamento.custoUnitario, "CUSTO MÉDIO");
	assert.equal(mapeamento.precoVenda, "PREÇO VENDA");
	assert.equal(mapeamento.fornecedorNome, "FORNECEDOR");
});

test("não usa a mesma coluna para dois campos", () => {
	// "PREÇO" sozinho poderia servir de custo e de venda; cada coluna só pode ser gasta uma vez.
	const mapeamento = suggestColumnMapping(["COD", "PRODUTO", "SALDO", "PREÇO"]);
	const usadas = Object.values(mapeamento);
	assert.equal(new Set(usadas).size, usadas.length);
});

test("descarta linhas de subtotal e rodapé", () => {
	const { itens, descartadas } = applyColumnMapping({
		linhas: [
			{ CODIGO: "57115038", DESCRIÇÃO: "MODULO TOMADA 20A", ESTOQUE: "230,00" },
			{ CODIGO: null, DESCRIÇÃO: "TOTAL GERAL", ESTOQUE: "1.500,00" },
			{ CODIGO: "57115039", DESCRIÇÃO: "MODULO TOMADA VERM", ESTOQUE: null },
		],
		mapeamento: { codigo: "CODIGO", descricao: "DESCRIÇÃO", quantidade: "ESTOQUE" },
	});
	assert.equal(itens.length, 1);
	assert.equal(descartadas, 2);
	assert.equal(itens[0].quantidade, 230);
});

test("sem código ou sem quantidade mapeados não grava nada", () => {
	const resultado = applyColumnMapping({ linhas: [{ A: "1", B: "2" }], mapeamento: { codigo: "A" } });
	assert.equal(resultado.itens.length, 0);
	assert.equal(resultado.descartadas, 1);
});
