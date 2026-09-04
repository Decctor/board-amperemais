import assert from "node:assert/strict";
import test from "node:test";
import createHttpError from "http-errors";
import { z } from "zod";
import { FiscalReadinessError } from "./fiscal/errors";
import { getErrorMessage } from "./errors";

const UNKNOWN_ERROR_MESSAGE = "Houve um erro desconhecido, por favor, comunique o setor de tecnologia.";

test("preserva a mensagem de um erro de dominio", () => {
	const error = new FiscalReadinessError("Nenhum perfil fiscal de produto encontrado para a venda.");

	assert.equal(getErrorMessage(error), error.message);
});

test("preserva a mensagem de um Error comum", () => {
	assert.equal(getErrorMessage(new Error("Falha acionavel.")), "Falha acionavel.");
});

test("nao expoe a mensagem de um erro HTTP interno", () => {
	assert.equal(getErrorMessage(new createHttpError.InternalServerError("Detalhe interno.")), UNKNOWN_ERROR_MESSAGE);
});

test("preserva a mensagem de um erro HTTP exposto", () => {
	assert.equal(getErrorMessage(new createHttpError.BadRequest("Requisicao invalida.")), "Requisicao invalida.");
});

test("preserva a primeira mensagem de validacao Zod", () => {
	const result = z.object({ nome: z.string() }).safeParse({ nome: 1 });
	assert.equal(result.success, false);
	if (result.success) return;

	assert.equal(getErrorMessage(result.error), result.error.errors[0].message);
});

test("mantem o fallback para valores sem mensagem", () => {
	assert.equal(getErrorMessage({}), UNKNOWN_ERROR_MESSAGE);
	assert.equal(getErrorMessage(null), UNKNOWN_ERROR_MESSAGE);
	assert.equal(getErrorMessage(new Error("")), UNKNOWN_ERROR_MESSAGE);
});
