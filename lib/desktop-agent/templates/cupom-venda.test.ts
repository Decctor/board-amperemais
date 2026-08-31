import assert from "node:assert/strict";
import test from "node:test";
import { renderCupomVendaHtml, type TCupomVendaDados } from "./cupom-venda";

function buildData(pagamentos: TCupomVendaDados["venda"]["pagamentos"]): TCupomVendaDados {
	return {
		organizacao: { nome: "Loja Teste" },
		venda: {
			data: new Date("2026-08-31T13:30:00Z"),
			subtotal: 27,
			valorFinal: 27,
			pagamentos,
		},
		cliente: null,
		cupom: null,
		recompensa: null,
		cashback: null,
	};
}

test("destaca pagamento online do iFood no cupom", () => {
	const html = renderCupomVendaHtml(buildData([{ metodo: "PIX", valor: 27, parcelas: null, pago: true, descricao: null, situacao: "PAGO_CANAL" }]));
	assert.match(html, /PIX \(PAGO PELO IFOOD\)/);
});

test("destaca pagamento que deve ser cobrado na entrega", () => {
	const html = renderCupomVendaHtml(
		buildData([{ metodo: "DINHEIRO", valor: 27, parcelas: null, pago: false, descricao: "CASH", situacao: "COBRAR" }]),
	);
	assert.match(html, /Dinheiro · CASH \(COBRAR NA ENTREGA\)/);
});

test("reforça a legibilidade dos textos operacionais na impressão térmica", () => {
	const html = renderCupomVendaHtml(buildData([]));
	assert.match(html, /\.fraco \{ color: #000; \}/);
	assert.match(html, /\.mini \{ font-size: 7\.5pt; font-weight: 700; \}/);
	assert.match(html, /\.bloco \{ font-weight: 700; \}/);
	assert.match(html, /\.itens \{[^}]*font-weight: 700; \}/);
	assert.match(html, /\.rodape \{[^}]*font-weight: 700; \}/);
});
