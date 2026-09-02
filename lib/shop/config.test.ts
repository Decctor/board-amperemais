import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_SHOP_SETTINGS_CONFIGURATION } from "@/schemas/shop";
import { resolveFiscalShopDeliveryFee, resolveShopDeliveryFee } from "./config";

function settingsWithDeliveryFee(taxa: number, gratisAcima: number | null, ativo = true) {
	return {
		...DEFAULT_SHOP_SETTINGS_CONFIGURATION,
		atendimento: {
			...DEFAULT_SHOP_SETTINGS_CONFIGURATION.atendimento,
			entrega: {
				...DEFAULT_SHOP_SETTINGS_CONFIGURATION.atendimento.entrega,
				ativo,
				taxa,
				gratisAcima,
			},
		},
	};
}

test("resolveShopDeliveryFee follows delivery mode and the free-delivery threshold", () => {
	const configuracoes = settingsWithDeliveryFee(8.5, 50);

	assert.equal(resolveShopDeliveryFee({ configuracoes, modalidade: "RETIRADA", subtotalItens: 20 }), 0);
	assert.equal(resolveShopDeliveryFee({ configuracoes, modalidade: "ENTREGA", subtotalItens: 49.99 }), 8.5);
	assert.equal(resolveShopDeliveryFee({ configuracoes, modalidade: "ENTREGA", subtotalItens: 50 }), 0);
});

test("resolveShopDeliveryFee charges nothing while delivery is switched off", () => {
	// Com a entrega desligada o painel nem exibe o campo da taxa: o valor guardado é resíduo e o PDV,
	// que usa esta mesma regra, não pode cobrá-lo.
	const configuracoes = settingsWithDeliveryFee(8.5, null, false);

	assert.equal(resolveShopDeliveryFee({ configuracoes, modalidade: "ENTREGA", subtotalItens: 20 }), 0);
});

test("resolveFiscalShopDeliveryFee cannot exceed the current surcharge", () => {
	const rascunhoMetadados = { shop: { entrega: { taxa: 10 } } };

	assert.equal(resolveFiscalShopDeliveryFee({ rascunhoMetadados, modalidade: "ENTREGA", acrescimosTotal: 5 }), 5);
	assert.equal(resolveFiscalShopDeliveryFee({ rascunhoMetadados, modalidade: "RETIRADA", acrescimosTotal: 10 }), 0);
	assert.equal(resolveFiscalShopDeliveryFee({ rascunhoMetadados, modalidade: "ENTREGA", acrescimosTotal: null }), 0);
});

test("resolveFiscalShopDeliveryFee reads the POS marker, not only the shop snapshot", () => {
	// Sem isto a taxa do PDV fica fora do vFrete e a NFC-e ganha um vTroco fantasma do tamanho dela.
	assert.equal(resolveFiscalShopDeliveryFee({ rascunhoMetadados: { taxaEntrega: 7 }, modalidade: "ENTREGA", acrescimosTotal: 7 }), 7);
	// A raiz é reescrita a cada edição: um pedido da loja editado no PDV vale pela versão corrente.
	assert.equal(
		resolveFiscalShopDeliveryFee({
			rascunhoMetadados: { taxaEntrega: 0, shop: { entrega: { taxa: 10 } } },
			modalidade: "ENTREGA",
			acrescimosTotal: 10,
		}),
		0,
	);
});
