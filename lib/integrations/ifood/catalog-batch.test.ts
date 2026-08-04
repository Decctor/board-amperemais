import assert from "node:assert/strict";
import test from "node:test";
import { describeIfoodUpdatePlan, planIfoodItemUpdates } from "./catalog-batch";

test("itens com código externo viram duas chamadas de lote, não N chamadas", () => {
	const plan = planIfoodItemUpdates([
		{ itemId: "i1", codigoExterno: "BURGER_001", preco: 27 },
		{ itemId: "i2", codigoExterno: "COKE_001", preco: 8 },
		{ itemId: "i3", codigoExterno: "FRIES_001", status: "UNAVAILABLE" },
	]);

	assert.equal(plan.lotePreco.length, 2);
	assert.equal(plan.loteStatus.length, 1);
	assert.equal(plan.individuais.length, 0);
	assert.equal(plan.totalChamadas, 2);
});

test("item sem código externo cai no PATCH individual — o lote o ignoraria em silêncio", () => {
	const plan = planIfoodItemUpdates([
		{ itemId: "i1", codigoExterno: null, preco: 27 },
		{ itemId: "i2", codigoExterno: "   ", status: "UNAVAILABLE" },
	]);

	assert.equal(plan.lotePreco.length, 0);
	assert.equal(plan.loteStatus.length, 0);
	assert.deepEqual(plan.individuais, [
		{ itemId: "i1", preco: 27 },
		{ itemId: "i2", status: "UNAVAILABLE" },
	]);
	assert.equal(plan.totalChamadas, 2);
});

test("preço e status do mesmo item entram nos dois lotes", () => {
	const plan = planIfoodItemUpdates([{ itemId: "i1", codigoExterno: "BURGER_001", preco: 27, status: "AVAILABLE" }]);
	assert.equal(plan.lotePreco.length, 1);
	assert.equal(plan.loteStatus.length, 1);
	assert.equal(plan.totalChamadas, 2);
});

test("mudança vazia não gera chamada", () => {
	const plan = planIfoodItemUpdates([{ itemId: "i1", codigoExterno: "BURGER_001" }]);
	assert.equal(plan.totalChamadas, 0);
	assert.equal(describeIfoodUpdatePlan(plan), "Nenhuma alteração para enviar.");
});

test("resumo conta itens distintos, não chamadas", () => {
	const plan = planIfoodItemUpdates([
		{ itemId: "i1", codigoExterno: "BURGER_001", preco: 27, status: "AVAILABLE" },
		{ itemId: "i2", codigoExterno: "COKE_001", preco: 8 },
	]);
	assert.equal(describeIfoodUpdatePlan(plan), "2 itens serão atualizados no iFood. Pode levar alguns segundos para aparecer no app.");
});

test("singular quando é um item só", () => {
	const plan = planIfoodItemUpdates([{ itemId: "i1", codigoExterno: "BURGER_001", preco: 27 }]);
	assert.equal(describeIfoodUpdatePlan(plan), "1 item será atualizado no iFood. Pode levar alguns segundos para aparecer no app.");
});
