import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveAutoEmissionException } from "./auto-emission-policy";

test("venda paga somente com método excluído suprime a emissão", () => {
	const exception = resolveAutoEmissionException({
		metodos: ["DINHEIRO"],
		excecoes: { pagamentoExclusivo: ["DINHEIRO"] },
	});
	assert.equal(exception, "PAGAMENTO_EXCLUSIVO");
});

test("mix com método fora da lista emite normalmente", () => {
	const exception = resolveAutoEmissionException({
		metodos: ["DINHEIRO", "PIX"],
		excecoes: { pagamentoExclusivo: ["DINHEIRO"] },
	});
	assert.equal(exception, null);
});

test("mix coberto integralmente pela lista suprime a emissão", () => {
	const exception = resolveAutoEmissionException({
		metodos: ["DINHEIRO", "CASHBACK"],
		excecoes: { pagamentoExclusivo: ["DINHEIRO", "CASHBACK"] },
	});
	assert.equal(exception, "PAGAMENTO_EXCLUSIVO");
});

test("mix parcialmente coberto pela lista emite normalmente", () => {
	const exception = resolveAutoEmissionException({
		metodos: ["DINHEIRO", "CASHBACK"],
		excecoes: { pagamentoExclusivo: ["DINHEIRO"] },
	});
	assert.equal(exception, null);
});

test("lista de exceções vazia nunca suprime", () => {
	const exception = resolveAutoEmissionException({
		metodos: ["DINHEIRO"],
		excecoes: { pagamentoExclusivo: [] },
	});
	assert.equal(exception, null);
});

test("configuração ausente (jsonb legado) nunca suprime", () => {
	const exception = resolveAutoEmissionException({
		metodos: ["DINHEIRO"],
		excecoes: null,
	});
	assert.equal(exception, null);
});

test("venda sem métodos apurados não suprime", () => {
	const exception = resolveAutoEmissionException({
		metodos: [],
		excecoes: { pagamentoExclusivo: ["DINHEIRO"] },
	});
	assert.equal(exception, null);
});

test("métodos repetidos contam uma vez só", () => {
	const exception = resolveAutoEmissionException({
		metodos: ["DINHEIRO", "DINHEIRO", "DINHEIRO"],
		excecoes: { pagamentoExclusivo: ["DINHEIRO"] },
	});
	assert.equal(exception, "PAGAMENTO_EXCLUSIVO");
});
