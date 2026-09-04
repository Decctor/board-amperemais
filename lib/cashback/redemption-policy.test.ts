import assert from "node:assert/strict";
import test from "node:test";
import { getCashbackRedemptionBlockReason, hasAnyCashbackRedemptionSurface, isCashbackRedemptionAllowedOnSurface } from "./redemption-policy";

const allOn = { resgatePermitirViaPos: true, resgatePermitirViaPontoIntegracao: true, resgatePermitirViaLojaDigital: true };

test("allows every surface when all flags are on (the default for existing programs)", () => {
	assert.equal(isCashbackRedemptionAllowedOnSurface(allOn, "POS"), true);
	assert.equal(isCashbackRedemptionAllowedOnSurface(allOn, "PONTO_INTERACAO"), true);
	assert.equal(isCashbackRedemptionAllowedOnSurface(allOn, "LOJA_DIGITAL"), true);
	assert.equal(getCashbackRedemptionBlockReason({ program: allOn, surface: "LOJA_DIGITAL" }), null);
});

test("blocks only the surface whose flag is off", () => {
	const program = { ...allOn, resgatePermitirViaLojaDigital: false };
	assert.equal(isCashbackRedemptionAllowedOnSurface(program, "LOJA_DIGITAL"), false);
	assert.equal(isCashbackRedemptionAllowedOnSurface(program, "POS"), true);
	assert.equal(isCashbackRedemptionAllowedOnSurface(program, "PONTO_INTERACAO"), true);
	assert.match(getCashbackRedemptionBlockReason({ program, surface: "LOJA_DIGITAL" }) ?? "", /loja digital/);
});

test("maps each surface to its own flag", () => {
	assert.equal(isCashbackRedemptionAllowedOnSurface({ ...allOn, resgatePermitirViaPos: false }, "POS"), false);
	assert.equal(isCashbackRedemptionAllowedOnSurface({ ...allOn, resgatePermitirViaPontoIntegracao: false }, "PONTO_INTERACAO"), false);
	assert.match(getCashbackRedemptionBlockReason({ program: { ...allOn, resgatePermitirViaPos: false }, surface: "POS" }) ?? "", /PDV/);
});

test("requires at least one redemption surface", () => {
	assert.equal(hasAnyCashbackRedemptionSurface(allOn), true);
	assert.equal(hasAnyCashbackRedemptionSurface({ ...allOn, resgatePermitirViaPos: false, resgatePermitirViaLojaDigital: false }), true);
	assert.equal(
		hasAnyCashbackRedemptionSurface({ resgatePermitirViaPos: false, resgatePermitirViaPontoIntegracao: false, resgatePermitirViaLojaDigital: false }),
		false,
	);
});
