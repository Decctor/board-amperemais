import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolvePaymentObservation } from "./payment-observation";
import { getLaunchChecklist } from "./erp-channels";
import { isCampaignReady, resolveCampaignDependencies, resolveOnboardingCampaignState, type TCampaignDependencyContext, type TOnboardingCampaignRow } from "./campaign-dependencies";
describe("WhatsApp payment observations", () => {
 it("requires delivered/read evidence; sent alone proves nothing", () => {
  assert.equal(resolvePaymentObservation({ status: "sent" }), null);
  assert.equal(resolvePaymentObservation({ status: "delivered" }), "VERIFICADO");
  assert.equal(resolvePaymentObservation({ status: "read" }), "VERIFICADO");
  assert.equal(resolvePaymentObservation({ status: "failed", errors: [{ code: 131042 }] }), "PENDENTE");
  assert.equal(resolvePaymentObservation({ status: "failed", errors: [{ code: 131026 }] }), null);
 });
});
describe("ERP launch checklist", () => {
 const ready = { acesso: true, produtosUtilizaveis: 5, lojaDigital: { existe: true, ativa: false, configurada: true }, pontosAtendimento: 0, simulacaoConcluida: false };
 it("allows counter launch without a digital shop or a real test sale", () => assert.ok(getLaunchChecklist("BALCAO", { ...ready, lojaDigital: { existe: false, ativa: false, configurada: false } }).every((item) => item.concluida)));
 it("requires a configured shop for catalog and an active service point for tables", () => {
  assert.equal(getLaunchChecklist("CATALOGO", { ...ready, lojaDigital: { existe: false, ativa: false, configurada: false } }).find((item) => item.chave === "loja")?.concluida, false);
  assert.equal(getLaunchChecklist("MESAS", ready).find((item) => item.chave === "mesas")?.concluida, false);
  assert.ok(getLaunchChecklist("MESAS", { ...ready, pontosAtendimento: 1 }).every((item) => item.concluida));
 });
});
describe("campaign activation", () => {
 const campaign: TOnboardingCampaignRow = { id: "campaign", titulo: "Boas-vindas", chavePreset: "welcome-first-purchase", ativo: false, whatsappTemplateId: "template", whatsappConexaoTelefoneId: "phone" };
 const context: TCampaignDependencyContext = { whatsapp: { numero: "CONECTADO", tipoConexao: "META_CLOUD_API", telefoneId: "phone", pagamento: "CONFIRMADO_PELO_USUARIO" }, templatesById: new Map([["template", { status: "ATIVO", metadados: { porNumeroTelefone: { phone: { idExterno: "meta", status: "APROVADO", qualidade: "ALTA" } } } }]]), cashbackAtivo: true, coberturaInicio: new Date("2020-01-01"), clientesComAniversario: 1, saldosCashbackComValidade: 1, envioHabilitadoPeloUsuario: false };
 it("requires explicit sending intent even when dependencies are ready", () => {
  const dependencies = resolveCampaignDependencies({ campaign, context });
  assert.equal(isCampaignReady(dependencies), true);
  assert.equal(resolveOnboardingCampaignState({ campaign, dependencies }), "PRONTA");
 });
 it("keeps enabled campaigns waiting on rejected templates or pending payment", () => {
  const dependencies = resolveCampaignDependencies({ campaign, context: { ...context, envioHabilitadoPeloUsuario: true, whatsapp: { ...context.whatsapp, pagamento: "PENDENTE" } } });
  assert.equal(isCampaignReady(dependencies), false);
  assert.equal(resolveOnboardingCampaignState({ campaign, dependencies }), "HABILITADA");
 });
});
