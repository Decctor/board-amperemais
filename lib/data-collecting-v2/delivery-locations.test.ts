import assert from "node:assert/strict";
import test from "node:test";
import { getDeliveryLocationFingerprint, normalizeCanonicalDeliveryLocation } from "./delivery-locations";

test("normaliza endereço canônico antes da persistência", () => {
	assert.deepEqual(
		normalizeCanonicalDeliveryLocation({
			cep: " 38305-526 ",
			state: "Minas Gerais",
			city: "ituiutaba",
			neighborhood: " Baduy ",
			street: " R. Jorge André Andraus ",
			number: " 109 ",
			complement: " ",
		}),
		{
			localizacaoCep: "38305-526",
			localizacaoEstado: "MG",
			localizacaoCidade: "ITUIUTABA",
			localizacaoBairro: "Baduy",
			localizacaoLogradouro: "R. Jorge André Andraus",
			localizacaoNumero: "109",
			localizacaoComplemento: null,
			localizacaoLatitude: null,
			localizacaoLongitude: null,
		},
	);
});

test("deduplica diferenças irrelevantes de CEP, caixa, acento e espaços", () => {
	const first = normalizeCanonicalDeliveryLocation({
		cep: "38305-526",
		state: "MG",
		city: "ITUIUTABA",
		neighborhood: "Baduy",
		street: "R. Jorge André Andraus",
		number: "109",
		complement: null,
	});
	const second = normalizeCanonicalDeliveryLocation({
		cep: "38305526",
		state: "mg",
		city: "Ituiutaba",
		neighborhood: " BADUY ",
		street: "r. jorge andre  andraus",
		number: " 109 ",
		complement: "",
		latitude: "-18.9700",
		longitude: "-49.4600",
	});

	assert.equal(getDeliveryLocationFingerprint(first), getDeliveryLocationFingerprint(second));
});

test("mantém complementos diferentes como localizações distintas", () => {
	const base = normalizeCanonicalDeliveryLocation({ street: "Rua A", number: "10", complement: "Apto 1" });
	const otherApartment = normalizeCanonicalDeliveryLocation({ street: "Rua A", number: "10", complement: "Apto 2" });

	assert.notEqual(getDeliveryLocationFingerprint(base), getDeliveryLocationFingerprint(otherApartment));
});
