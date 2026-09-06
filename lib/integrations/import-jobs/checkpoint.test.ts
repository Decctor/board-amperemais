import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applyListedSalesPage, closeImportWindow, setImportWindow } from "./checkpoint";
import { resolveHistoricalCoverage } from "./coverage";
import { EMPTY_IMPORT_COUNTERS } from "@/schemas/import-jobs";
import type { TIntegrationImportJob } from "@/services/drizzle/schema/integration-import-jobs";
function job(): TIntegrationImportJob {
 return { id: "j", organizacaoId: "o", integracaoId: "i", tipo: "HISTORICO", estado: "EM_ANDAMENTO", janelaAlvoInicio: new Date("2026-01-01"), janelaAlvoFim: new Date("2026-01-15"), coberturaInicio: null, cursorJanelaInicio: null, cursorJanelaFim: null, cursorPagina: 1, cursorPendentes: [], listagemConcluida: false, janelasComFalha: [], contadores: { ...EMPTY_IMPORT_COUNTERS }, cache: {}, proximaExecucao: null, lockAte: null, tentativasConsecutivas: 0, ultimoErro: null, ultimaExecucao: null, dataInicio: new Date(), dataConclusao: null, autorId: null };
}
describe("historical import checkpoints", () => {
 it("keeps unknown statuses for enrichment and filters ignored sales first", () => {
  const current = job(); setImportWindow(current, current.janelaAlvoFim);
  applyListedSalesPage(current, { last: false, items: [{ sourceSaleId: "1", statusText: "ELEGIVEL" }, { sourceSaleId: "2", statusText: "IGNORADO" }, { sourceSaleId: "3", statusText: "DESCONHECIDO" }] }, (item) => item.statusText as "ELEGIVEL" | "IGNORADO" | "DESCONHECIDO");
  assert.deepEqual(current.cursorPendentes, ["1", "3"]);
  assert.equal(current.contadores.ignoradosPorSituacao, 1);
  assert.equal(current.contadores.situacoesDesconhecidas, 1);
  assert.equal(current.cursorPagina, 2);
  assert.equal(closeImportWindow(current), "PENDENTE");
  assert.equal(current.coberturaInicio, null);
 });
 it("does not close the last page before its pending enrichment is persisted", () => {
  const current = job(); setImportWindow(current, current.janelaAlvoFim);
  current.listagemConcluida = true; current.cursorPendentes = ["1"];
  assert.equal(closeImportWindow(current), "PENDENTE");
  assert.equal(current.coberturaInicio, null);
  current.cursorPendentes = [];
  assert.equal(closeImportWindow(current), "PROXIMA");
  assert.deepEqual(current.coberturaInicio, new Date("2026-01-08T00:00:00.000Z"));
  assert.equal(current.cursorPagina, 1);
  current.listagemConcluida = true;
  assert.equal(closeImportWindow(current), "CONCLUIDA");
  assert.deepEqual(current.coberturaInicio, new Date("2026-01-01T00:00:00.000Z"));
 });
 it("never advances contiguous coverage across a failed window", () => {
  const current = job();
  current.coberturaInicio = new Date("2026-01-12");
  current.janelasComFalha = [{ inicio: "2026-01-08", fim: "2026-01-12", motivo: "Falha" }];
  setImportWindow(current, new Date("2026-01-08"));
  current.listagemConcluida = true;
  assert.equal(closeImportWindow(current), "CONCLUIDA");
  assert.equal(current.coberturaInicio.toISOString(), "2026-01-12T00:00:00.000Z");
 });
});
describe("joint historical coverage", () => {
 const interval = (inicio: string, fim: string) => ({ inicio: new Date(inicio), fim: new Date(fim) });
 it("requires evidence from every source", () => assert.equal(resolveHistoricalCoverage([[interval("2026-01-01", "2026-02-01")], []]), null));
 it("uses the least-covered source, joining an expanded history", () => {
  assert.equal(resolveHistoricalCoverage([[interval("2026-01-01", "2026-02-01"), interval("2025-11-01", "2026-01-01")], [interval("2025-12-01", "2026-02-01")]])?.toISOString(), "2025-12-01T00:00:00.000Z");
 });
 it("does not jump over a gap in successive jobs", () => {
  assert.equal(resolveHistoricalCoverage([[interval("2026-01-01", "2026-02-01"), interval("2025-11-01", "2025-12-20")]])?.toISOString(), "2026-01-01T00:00:00.000Z");
 });
});
