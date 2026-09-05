import assert from "node:assert/strict";
import { test } from "node:test";
import { FISCAL_DEADLINES } from "./constants";
import {
	assertFiscalDocumentActionAvailable,
	getFiscalDocumentAction,
	resolveCancellationDeadline,
	resolveFiscalDocumentActions,
	resolveInutilizationDeadline,
	type TFiscalDocumentForActions,
} from "./document-actions";

const NOW = new Date("2026-09-04T15:00:00.000Z");

function buildDocument(overrides: Partial<TFiscalDocumentForActions> = {}): TFiscalDocumentForActions {
	return {
		tipo: "NFCE",
		status: "AUTORIZADA",
		statusInterno: "AUTORIZADO",
		numero: "123",
		serie: "1",
		chaveAcesso: "4".repeat(44),
		vendaId: "venda-1",
		xmlStoragePath: null,
		pdfStoragePath: null,
		provedorDocumentoId: "spedy-1",
		dataAutorizacao: new Date(NOW.getTime() - 10 * 60_000),
		dataInsercao: new Date(NOW.getTime() - 12 * 60_000),
		...overrides,
	};
}

function actionsFor(overrides: Partial<TFiscalDocumentForActions> = {}, context = {}) {
	return resolveFiscalDocumentActions({ document: buildDocument(overrides), now: NOW, context });
}

test("prazo de cancelamento: NFC-e 30 min, NF-e 24h a partir da autorizacao", () => {
	const autorizada = new Date("2026-09-04T12:00:00.000Z");
	assert.equal(resolveCancellationDeadline({ tipo: "NFCE", dataAutorizacao: autorizada })?.toISOString(), "2026-09-04T12:30:00.000Z");
	assert.equal(resolveCancellationDeadline({ tipo: "NFE", dataAutorizacao: autorizada })?.toISOString(), "2026-09-05T12:00:00.000Z");
	assert.equal(resolveCancellationDeadline({ tipo: "NFCE", dataAutorizacao: null }), null);
});

test("prazo de inutilizacao: dia 10 do mes seguinte", () => {
	const deadline = resolveInutilizationDeadline({ dataInsercao: new Date(2026, 8, 20, 10, 0, 0) });
	assert.equal(deadline.getFullYear(), 2026);
	assert.equal(deadline.getMonth(), 9);
	assert.equal(deadline.getDate(), FISCAL_DEADLINES.inutilizationDayOfNextMonth);
});

test("NFC-e autorizada dentro da janela: cancelar disponivel com prazo; inutilizar bloqueado", () => {
	const actions = actionsFor();
	const cancelar = getFiscalDocumentAction(actions, "CANCELAR");
	assert.equal(cancelar.disponivel, true);
	assert.ok(cancelar.prazoLimite);
	assert.equal(getFiscalDocumentAction(actions, "INUTILIZAR").disponivel, false);
	assert.equal(getFiscalDocumentAction(actions, "DEVOLUCAO").disponivel, true);
	assert.equal(getFiscalDocumentAction(actions, "CARTA_CORRECAO").disponivel, false);
	assert.equal(getFiscalDocumentAction(actions, "REENVIAR").disponivel, false);
	assert.equal(getFiscalDocumentAction(actions, "BAIXAR_XML").disponivel, true);
});

test("NFC-e autorizada fora da janela: cancelar indisponivel, devolucao como alternativa", () => {
	const actions = actionsFor({ dataAutorizacao: new Date(NOW.getTime() - 31 * 60_000) });
	const cancelar = getFiscalDocumentAction(actions, "CANCELAR");
	assert.equal(cancelar.disponivel, false);
	assert.match(cancelar.motivoIndisponivel ?? "", /Prazo de cancelamento \(30 min/);
	assert.deepEqual(cancelar.alternativas, ["DEVOLUCAO"]);
	assert.ok(cancelar.prazoLimite);
	assert.throws(() => assertFiscalDocumentActionAvailable(actions, "CANCELAR"), /Prazo de cancelamento/);
});

test("NF-e autorizada fora da janela oferece devolucao e carta de correcao", () => {
	const actions = actionsFor({ tipo: "NFE", dataAutorizacao: new Date(NOW.getTime() - 25 * 3_600_000) });
	const cancelar = getFiscalDocumentAction(actions, "CANCELAR");
	assert.equal(cancelar.disponivel, false);
	assert.deepEqual(cancelar.alternativas, ["DEVOLUCAO", "CARTA_CORRECAO"]);
	assert.equal(getFiscalDocumentAction(actions, "CARTA_CORRECAO").disponivel, true);
});

test("NF-e autorizada dentro de 24h ainda cancela", () => {
	const actions = actionsFor({ tipo: "NFE", dataAutorizacao: new Date(NOW.getTime() - 23 * 3_600_000) });
	assert.equal(getFiscalDocumentAction(actions, "CANCELAR").disponivel, true);
});

test("provedor MANUAL ignora janela de cancelamento", () => {
	const actions = actionsFor({ dataAutorizacao: new Date(NOW.getTime() - 5 * 3_600_000) }, { provider: "MANUAL" });
	assert.equal(getFiscalDocumentAction(actions, "CANCELAR").disponivel, true);
});

test("carta de correcao respeita o limite de 20 eventos", () => {
	const ok = actionsFor({ tipo: "NFE" }, { correctionLettersIssued: 19 });
	assert.equal(getFiscalDocumentAction(ok, "CARTA_CORRECAO").disponivel, true);
	const full = actionsFor({ tipo: "NFE" }, { correctionLettersIssued: 20 });
	const action = getFiscalDocumentAction(full, "CARTA_CORRECAO");
	assert.equal(action.disponivel, false);
	assert.deepEqual(action.alternativas, ["DEVOLUCAO"]);
});

test("documento rejeitado: reenviar e inutilizar disponiveis, cancelar nao", () => {
	const actions = actionsFor({ status: "PENDENTE", statusInterno: "REJEITADO", dataAutorizacao: null, chaveAcesso: null });
	assert.equal(getFiscalDocumentAction(actions, "REENVIAR").disponivel, true);
	const inutilizar = getFiscalDocumentAction(actions, "INUTILIZAR");
	assert.equal(inutilizar.disponivel, true);
	assert.ok(inutilizar.prazoLimite);
	const cancelar = getFiscalDocumentAction(actions, "CANCELAR");
	assert.equal(cancelar.disponivel, false);
	assert.deepEqual(cancelar.alternativas, ["REENVIAR", "INUTILIZAR"]);
	assert.equal(getFiscalDocumentAction(actions, "DEVOLUCAO").disponivel, false);
});

test("documento com erro sem numeracao reservada nao inutiliza", () => {
	const actions = actionsFor({
		status: "PENDENTE",
		statusInterno: "ERRO",
		numero: null,
		serie: null,
		dataAutorizacao: null,
		chaveAcesso: null,
		provedorDocumentoId: null,
	});
	assert.equal(getFiscalDocumentAction(actions, "INUTILIZAR").disponivel, false);
	assert.equal(getFiscalDocumentAction(actions, "REENVIAR").disponivel, true);
	assert.equal(getFiscalDocumentAction(actions, "SINCRONIZAR").disponivel, false);
});

test("inutilizacao fora do prazo (dia 10 do mes seguinte) e bloqueada", () => {
	const actions = actionsFor({
		status: "PENDENTE",
		statusInterno: "REJEITADO",
		dataAutorizacao: null,
		dataInsercao: new Date(2026, 5, 15),
	});
	const inutilizar = getFiscalDocumentAction(actions, "INUTILIZAR");
	assert.equal(inutilizar.disponivel, false);
	assert.match(inutilizar.motivoIndisponivel ?? "", /Prazo de inutilização/);
});

test("em processamento: apenas sincronizar", () => {
	const actions = actionsFor({ status: "PENDENTE", statusInterno: "EM_PROCESSAMENTO", dataAutorizacao: null });
	assert.equal(getFiscalDocumentAction(actions, "SINCRONIZAR").disponivel, true);
	for (const key of ["CANCELAR", "CARTA_CORRECAO", "INUTILIZAR", "DEVOLUCAO", "REENVIAR"] as const) {
		assert.equal(getFiscalDocumentAction(actions, key).disponivel, false, key);
	}
	assert.deepEqual(getFiscalDocumentAction(actions, "CANCELAR").alternativas, ["SINCRONIZAR"]);
});

test("cancelamento pendente: cancelar bloqueado apontando para sincronizar", () => {
	const actions = actionsFor({ statusInterno: "CANCELAMENTO_PENDENTE" });
	const cancelar = getFiscalDocumentAction(actions, "CANCELAR");
	assert.equal(cancelar.disponivel, false);
	assert.deepEqual(cancelar.alternativas, ["SINCRONIZAR"]);
});

test("cancelado: terminal, mas permite reemitir para a venda e baixar XML", () => {
	const actions = actionsFor({ status: "CANCELADA", statusInterno: "CANCELADO" });
	assert.equal(getFiscalDocumentAction(actions, "CANCELAR").disponivel, false);
	assert.equal(getFiscalDocumentAction(actions, "INUTILIZAR").disponivel, false);
	assert.equal(getFiscalDocumentAction(actions, "DEVOLUCAO").disponivel, false);
	assert.equal(getFiscalDocumentAction(actions, "REENVIAR").disponivel, true);
	assert.equal(getFiscalDocumentAction(actions, "BAIXAR_XML").disponivel, true);
});

test("devolucao: bloqueada sem perfil de devolucao ou quando ja existe devolucao autorizada", () => {
	const semPerfil = getFiscalDocumentAction(actionsFor({}, { hasReturnProfile: false }), "DEVOLUCAO");
	assert.equal(semPerfil.disponivel, false);
	assert.match(semPerfil.motivoIndisponivel ?? "", /perfil de operação fiscal de devolução/);
	const jaDevolvida = getFiscalDocumentAction(actionsFor({}, { hasAuthorizedReturn: true }), "DEVOLUCAO");
	assert.equal(jaDevolvida.disponivel, false);
});

test("NFS-e nunca reemite", () => {
	const actions = actionsFor({ tipo: "NFSE", status: "PENDENTE", statusInterno: "ERRO", dataAutorizacao: null });
	assert.equal(getFiscalDocumentAction(actions, "REENVIAR").disponivel, false);
});
