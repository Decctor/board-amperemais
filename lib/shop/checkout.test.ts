import assert from "node:assert/strict";
import test from "node:test";
import {
	getNextShopCheckoutStep,
	getPreviousShopCheckoutStep,
	getShopBenefitsTitle,
	getShopCashbackCapabilities,
	getShopCheckoutSteps,
} from "./checkout";

test("omits the benefits step when the organization exposes no checkout benefits", () => {
	assert.deepEqual(getShopCheckoutSteps({ cupons: false, descontoCashback: false, recompensas: false }), [
		"CLIENTE",
		"ENTREGA",
		"PAGAMENTO",
		"REVISAO",
	]);
});

test("keeps a rewards-only checkout and labels it as rewards", () => {
	const capabilities = { cupons: false, descontoCashback: false, recompensas: true };
	assert.deepEqual(getShopCheckoutSteps(capabilities), ["CLIENTE", "ENTREGA", "CASHBACK", "PAGAMENTO", "REVISAO"]);
	assert.equal(getShopBenefitsTitle(capabilities), "Recompensas");
});

test("uses the combined benefits label when more than one effect is enabled", () => {
	assert.equal(getShopBenefitsTitle({ cupons: true, descontoCashback: false, recompensas: true }), "Benefícios");
	assert.equal(getShopBenefitsTitle({ cupons: true, descontoCashback: true, recompensas: false }), "Benefícios");
});

test("walks forward and backward through the visible steps", () => {
	const steps = getShopCheckoutSteps({ cupons: true, descontoCashback: false, recompensas: false });
	assert.equal(getNextShopCheckoutStep("ENTREGA", steps), "CASHBACK");
	assert.equal(getNextShopCheckoutStep("CASHBACK", steps), "PAGAMENTO");
	assert.equal(getPreviousShopCheckoutStep("CASHBACK", steps), "ENTREGA");
	assert.equal(getPreviousShopCheckoutStep("PAGAMENTO", steps), "CASHBACK");
});

test("skips the benefits step in both directions when it is not visible", () => {
	const steps = getShopCheckoutSteps({ cupons: false, descontoCashback: false, recompensas: false });
	assert.equal(getNextShopCheckoutStep("ENTREGA", steps), "PAGAMENTO");
	assert.equal(getPreviousShopCheckoutStep("PAGAMENTO", steps), "ENTREGA");
});

test("navigates from a step that vanished from the visible list without restarting the checkout", () => {
	// A etapa CASHBACK some da lista quando o último cupom deixa de valer com o usuário em cima dela.
	const steps = getShopCheckoutSteps({ cupons: false, descontoCashback: false, recompensas: false });
	assert.equal(getNextShopCheckoutStep("CASHBACK", steps), "PAGAMENTO");
	assert.equal(getPreviousShopCheckoutStep("CASHBACK", steps), "ENTREGA");
});

test("clamps at the edges of the visible list", () => {
	const steps = getShopCheckoutSteps({ cupons: true, descontoCashback: true, recompensas: true });
	assert.equal(getNextShopCheckoutStep("REVISAO", steps), "REVISAO");
	assert.equal(getPreviousShopCheckoutStep("CLIENTE", steps), "CLIENTE");
});

test("hides every cashback modality in the shop when the program disallows the digital store surface", () => {
	const program = { modalidadeDescontosPermitida: true, modalidadeRecompensasPermitida: true, resgatePermitirViaLojaDigital: false };
	assert.deepEqual(getShopCashbackCapabilities(program), { descontoCashback: false, recompensas: false });
	assert.deepEqual(getShopCheckoutSteps({ cupons: false, ...getShopCashbackCapabilities(program) }), ["CLIENTE", "ENTREGA", "PAGAMENTO", "REVISAO"]);
});

test("keeps the modality gate when the digital store surface is allowed", () => {
	const program = { modalidadeDescontosPermitida: false, modalidadeRecompensasPermitida: true, resgatePermitirViaLojaDigital: true };
	assert.deepEqual(getShopCashbackCapabilities(program), { descontoCashback: false, recompensas: true });
	assert.deepEqual(getShopCashbackCapabilities(null), { descontoCashback: false, recompensas: false });
});
