import assert from "node:assert/strict";
import test from "node:test";
import { classifyFiscalDocumentEvent, describeFiscalEmissionResult } from "./document-event-classification";

test("classifica documento em processamento como processamento iniciado", () => {
	assert.equal(classifyFiscalDocumentEvent("EM_PROCESSAMENTO"), "PROCESSAMENTO_INICIADO");
	assert.equal(
		describeFiscalEmissionResult({ status: "EM_PROCESSAMENTO", messages: [] }),
		"Documento aceito pelo provedor e aguardando processamento.",
	);
});

test("reserva evento de erro para um status de erro real", () => {
	assert.equal(classifyFiscalDocumentEvent("ERRO"), "ERRO");
	assert.equal(describeFiscalEmissionResult({ status: "ERRO", messages: ["Falha interna no provedor"] }), "Documento erro: Falha interna no provedor");
});

test("mantem o motivo informado em uma rejeicao", () => {
	assert.equal(classifyFiscalDocumentEvent("REJEITADO"), "REJEITADO");
	assert.equal(describeFiscalEmissionResult({ status: "REJEITADO", messages: ["Rejeição 786"] }), "Documento rejeitado: Rejeição 786");
});
