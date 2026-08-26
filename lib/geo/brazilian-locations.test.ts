import assert from "node:assert/strict";
import { test } from "node:test";
import { isKnownCityForUf, normalizeCityName, normalizeLocation, normalizeUf } from "./brazilian-locations";

/**
 * O caso que motivou estes helpers é o da NuvemShop: `billing_province` chega `"Paraná"` e era
 * gravado cru, fazendo `buildSaleScenario` comparar `"PR"` com `"PARANÁ"`, classificar uma venda
 * interna como interestadual e emitir CFOP 6102 no lugar de 5102. Os testes fixam justamente o
 * contrato de que qualquer grafia de entrada converge para a sigla.
 */

test("normalizeUf converte nome por extenso em sigla", () => {
	assert.equal(normalizeUf("Paraná"), "PR");
	assert.equal(normalizeUf("parana"), "PR");
	assert.equal(normalizeUf("SÃO PAULO"), "SP");
	assert.equal(normalizeUf("Rio de Janeiro"), "RJ");
	assert.equal(normalizeUf("Espírito Santo"), "ES");
});

test("normalizeUf aceita a sigla em qualquer caixa", () => {
	assert.equal(normalizeUf("PR"), "PR");
	assert.equal(normalizeUf("pr"), "PR");
	assert.equal(normalizeUf(" sc "), "SC");
});

test("normalizeUf devolve null em vez de palpite quando não reconhece", () => {
	// Uma UF errada corrompe o cálculo fiscal em silêncio; ausente ao menos é detectável.
	assert.equal(normalizeUf(null), null);
	assert.equal(normalizeUf(""), null);
	assert.equal(normalizeUf("   "), null);
	assert.equal(normalizeUf("Portugal"), null);
	assert.equal(normalizeUf("XX"), null);
});

test("normalizeCityName devolve a grafia canônica quando a UF é conhecida", () => {
	assert.equal(normalizeCityName("ponta grossa", "PR"), "PONTA GROSSA");
	// Corrige acentuação a partir da lista oficial, não apenas a caixa.
	assert.equal(normalizeCityName("sao paulo", "SP"), "SÃO PAULO");
	assert.equal(normalizeCityName("Florianopolis", "Santa Catarina"), "FLORIANÓPOLIS");
});

test("normalizeCityName preserva o município mesmo fora da lista oficial", () => {
	// Melhor manter o dado do cliente saneado do que descartá-lo por não constar da lista.
	assert.equal(normalizeCityName("vila qualquer", "PR"), "VILA QUALQUER");
	assert.equal(normalizeCityName("ponta grossa", null), "PONTA GROSSA");
	assert.equal(normalizeCityName(null, "PR"), null);
});

test("isKnownCityForUf separa município oficial de texto livre", () => {
	assert.equal(isKnownCityForUf("Ponta Grossa", "Paraná"), true);
	assert.equal(isKnownCityForUf("PONTA GROSSA", "PR"), true);
	// Município existe, mas não nessa UF.
	assert.equal(isKnownCityForUf("Ponta Grossa", "SP"), false);
	assert.equal(isKnownCityForUf("Vila Qualquer", "PR"), false);
	assert.equal(isKnownCityForUf("Ponta Grossa", null), false);
});

test("normalizeLocation resolve o par completo", () => {
	assert.deepEqual(normalizeLocation({ estado: "Paraná", cidade: "ponta grossa" }), { estado: "PR", cidade: "PONTA GROSSA" });
	assert.deepEqual(normalizeLocation({ estado: null, cidade: "ponta grossa" }), { estado: null, cidade: "PONTA GROSSA" });
	assert.deepEqual(normalizeLocation({ estado: "Paraná", cidade: null }), { estado: "PR", cidade: null });
	assert.deepEqual(normalizeLocation({}), { estado: null, cidade: null });
});

test("normalizeUf é idempotente", () => {
	// O backfill roda sobre dados já parcialmente normalizados; reaplicar não pode alterar nada.
	for (const value of ["Paraná", "PR", "pr"]) {
		const once = normalizeUf(value);
		assert.equal(normalizeUf(once), once);
	}
	const cidade = normalizeCityName("sao paulo", "SP");
	assert.equal(normalizeCityName(cidade, "SP"), cidade);
});
