import assert from "node:assert/strict";
import test from "node:test";
import type { TOnlineSoftwareSaleImportation } from "./types";
import { mapOnlineSoftwareSale, reconcileOnlineSoftwareSales } from "./mappers";

function buildSale(overrides: Partial<TOnlineSoftwareSaleImportation> = {}): TOnlineSoftwareSaleImportation {
	return {
		cliente: "AO CONSUMIDOR",
		documento: "1",
		modelo: "65",
		serie: "001",
		valor: "10.00",
		id: "sale-1",
		movimento: "RECEITAS",
		datahora: "17/08/2026 10:00:00",
		data: "17/08/2026",
		vendedor: "N/A",
		natureza: "NFCE",
		tipo: "",
		parceiro: null,
		situacao: "00",
		chave: "key-1",
		itens: [
			{
				codigo: "P1",
				descricao: "Produto",
				unidade: "UN",
				qtde: "1",
				valorunit: "10.00",
				vprod: "10.00",
				vdesc: "0.00",
				vcusto: 4,
				baseicms: "0",
				percent: "0",
				icms: "0",
				cst_icms: "",
				csosn: "",
				cst_pis: "",
				cfop: "",
				tipo: "",
				vfrete: "0",
				vseg: "0",
				voutro: "0",
				vipi: "0",
				vicmsst: "0",
				vicms_desonera: "0",
				ncm: "",
				cest: "",
				grupo: "",
			},
		],
		...overrides,
	};
}

test("accepts positive SN01 and NFCE sales only", () => {
	assert.equal(mapOnlineSoftwareSale(buildSale({ natureza: "SN01" })).isValidSale, true);
	assert.equal(mapOnlineSoftwareSale(buildSale({ natureza: "NFCE" })).isValidSale, true);
	assert.equal(mapOnlineSoftwareSale(buildSale({ natureza: "S09" })).isValidSale, false);
	assert.equal(mapOnlineSoftwareSale(buildSale({ natureza: "NFCE", valor: "0" })).isCanceled, true);
	assert.equal(mapOnlineSoftwareSale(buildSale({ natureza: "S09", valor: "0" })).isCanceled, false);
});

test("selects the repeated occurrence whose value closes with its items", () => {
	const sale = buildSale();
	const cashMovement = buildSale({ valor: "90.00", tipo: "CAIXA 1" });
	const result = reconcileOnlineSoftwareSales([cashMovement, sale]);

	assert.equal(result.sales.length, 1);
	assert.equal(result.sales[0].valor, "10.00");
	assert.equal(result.duplicateGroupsCount, 1);
	assert.equal(result.discardedOccurrencesCount, 1);
});

test("fails closed when no repeated occurrence closes with its items", () => {
	assert.throws(
		() => reconcileOnlineSoftwareSales([buildSale({ valor: "4" }), buildSale({ valor: "6" })]),
		/sem ocorrencia cujo valor corresponda aos itens/,
	);
});

test("prefers an explicit zero-value cancellation over the previous valid occurrence", () => {
	const canceled = buildSale({ valor: "0", situacao: "02", itens: [] });
	const result = reconcileOnlineSoftwareSales([buildSale(), canceled]);

	assert.equal(result.sales[0].valor, "0");
	assert.equal(result.sales[0].situacao, "02");
});
