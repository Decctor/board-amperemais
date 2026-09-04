import assert from "node:assert/strict";
import test from "node:test";
import { reconcilePaymentTotals } from "./payment-reconciliation";

test("desconta troco registrado dos recebimentos brutos", () => {
	const result = reconcilePaymentTotals([{ valorVenda: 37, valorEntradas: 50, valorDinheiro: 50, trocoRegistrado: 13, taxasCanal: 0 }]);

	assert.deepEqual(result, {
		totalBruto: 50,
		totalRecebido: 37,
		ajustes: { total: 13, troco: 13, trocoRegistrado: 13, trocoInferido: 0, taxasCanal: 0, naoClassificado: 0 },
	});
});

test("infere troco legado somente quando o excesso esta coberto por dinheiro", () => {
	const result = reconcilePaymentTotals([
		{ valorVenda: 67, valorEntradas: 100, valorDinheiro: 100, trocoRegistrado: 0, taxasCanal: 0 },
		{ valorVenda: 40, valorEntradas: 50, valorDinheiro: 0, trocoRegistrado: 0, taxasCanal: 0 },
	]);

	assert.equal(result.totalRecebido, 107);
	assert.deepEqual(result.ajustes, { total: 43, troco: 33, trocoRegistrado: 0, trocoInferido: 33, taxasCanal: 0, naoClassificado: 10 });
});

test("classifica taxas do canal antes de inferir troco", () => {
	const result = reconcilePaymentTotals([
		{ valorVenda: 50, valorEntradas: 50.99, valorDinheiro: 48.99, trocoRegistrado: 0, taxasCanal: 0.99 },
		{ valorVenda: 75, valorEntradas: 76.6, valorDinheiro: 0, trocoRegistrado: 0, taxasCanal: 1.6 },
	]);

	assert.equal(result.totalBruto, 127.59);
	assert.equal(result.totalRecebido, 125);
	assert.deepEqual(result.ajustes, { total: 2.59, troco: 0, trocoRegistrado: 0, trocoInferido: 0, taxasCanal: 2.59, naoClassificado: 0 });
});

test("nao transforma pagamento parcial em ajuste", () => {
	const result = reconcilePaymentTotals([{ valorVenda: 100, valorEntradas: 60, valorDinheiro: 0, trocoRegistrado: 0, taxasCanal: 0 }]);

	assert.equal(result.totalBruto, 60);
	assert.equal(result.totalRecebido, 60);
	assert.equal(result.ajustes.total, 0);
});
