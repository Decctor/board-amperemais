import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_SHOP_SETTINGS_CONFIGURATION } from "@/schemas/shop";
import { resolveFiscalShopDeliveryFee, resolveShopDeliveryFee } from "./config";

function settingsWithDeliveryFee(taxa: number, gratisAcima: number | null) {
	return {
		...DEFAULT_SHOP_SETTINGS_CONFIGURATION,
		atendimento: {
			...DEFAULT_SHOP_SETTINGS_CONFIGURATION.atendimento,
			entrega: {
				...DEFAULT_SHOP_SETTINGS_CONFIGURATION.atendimento.entrega,
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

test("resolveFiscalShopDeliveryFee cannot exceed the current surcharge", () => {
	const rascunhoMetadados = { shop: { entrega: { taxa: 10 } } };

	assert.equal(resolveFiscalShopDeliveryFee({ rascunhoMetadados, modalidade: "ENTREGA", acrescimosTotal: 5 }), 5);
	assert.equal(resolveFiscalShopDeliveryFee({ rascunhoMetadados, modalidade: "RETIRADA", acrescimosTotal: 10 }), 0);
	assert.equal(resolveFiscalShopDeliveryFee({ rascunhoMetadados, modalidade: "ENTREGA", acrescimosTotal: null }), 0);
});
