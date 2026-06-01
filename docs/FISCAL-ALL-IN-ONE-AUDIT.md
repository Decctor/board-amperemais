# Auditoria técnica: módulo fiscal e prontidão All-in-One

Data da avaliação: 2026-05-28  
Produto: RecompraCRM  
Escopo: leitura estática da codebase, com foco em fiscal, PDV, catálogo digital, CRM/retenção e financeiro.

## Sumário executivo

O RecompraCRM já tem uma fundação relevante para uma suíte operacional de varejo: PDV interno, catálogo digital, CRM de retenção, cashback, campanhas WhatsApp, financeiro básico e uma primeira camada de integração fiscal com Nuvem Fiscal.

O ponto crítico é que o módulo fiscal ainda não está pronto para sustentar a promessa de substituição de ERP. A integração com Nuvem Fiscal existe, mas o payload tributário é simplificado demais para produção: faltam regras de ICMS, CST/CSOSN, PIS/COFINS, variação por UF, tratamento estruturado de rejeições, CC-e, inutilização e processamento assíncrono robusto.

Como produto para piloto controlado, o sistema está próximo. Como All-in-One completo para varejo sem depender de Bling/Tiny/ERP terceiro, ainda precisa de uma fase clara de hardening fiscal, financeiro e operacional.

---

## 1. Mapa do módulo fiscal atual

### Arquivos relevantes

| Arquivo | Papel |
|---|---|
| `services/drizzle/schema/fiscal.ts` | Define séries fiscais, perfis de operação fiscal, perfis fiscais de produto e eventos de documento fiscal. |
| `services/drizzle/schema/financial.ts` | Define `fiscalDocuments`, com chave de acesso, número, série, protocolo, XML/PDF, status, provider, snapshots e mensagens. |
| `schemas/fiscal.ts` | Schemas Zod para configuração fiscal, séries, perfis fiscais, documentos, eventos e dados fiscais de cliente. |
| `schemas/enums.ts` | Enums fiscais de documento, ambiente, status, ciclo de vida, origem de mercadoria, finalidade e presença do consumidor. |
| `services/drizzle/schema/enums.ts` | Enums Postgres equivalentes aos enums fiscais usados no banco. |
| `lib/fiscal/documents.ts` | Orquestra emissão, sincronização, cancelamento, criação de documento, readiness, eventos e armazenamento de XML/PDF. |
| `lib/fiscal/settings.ts` | Lida com configuração fiscal da organização, empresa, certificado, séries e perfis de operação. |
| `lib/fiscal/storage.ts` | Salva e lê XML/PDF fiscal no Supabase Storage. |
| `lib/fiscal/providers/manual.ts` | Provider manual simples, útil como fallback/stub. |
| `lib/fiscal/providers/nuvem-fiscal/client.ts` | Cliente Axios da Nuvem Fiscal, token e base URL. |
| `lib/fiscal/providers/nuvem-fiscal/company.ts` | Cadastro/sincronização da empresa e certificado na Nuvem Fiscal. |
| `lib/fiscal/providers/nuvem-fiscal/documents.ts` | Integra emissão, consulta/sincronização, cancelamento e download XML/PDF de NF-e/NFC-e. |
| `lib/fiscal/providers/nuvem-fiscal/mappers/nfce.ts` | Monta payload NFC-e a partir da venda, organização, série, operação e perfis fiscais de produto. |
| `lib/fiscal/providers/nuvem-fiscal/mappers/nfe.ts` | Monta payload NF-e a partir da venda, com estrutura semelhante à NFC-e. |
| `lib/fiscal/providers/nuvem-fiscal/mappers/utils.ts` | Conversões auxiliares de finalidade, presença e indicador fiscal. |
| `app/api/fiscal/documents/route.ts` | Lista documentos fiscais, consulta por ID/eventos e dispara emissão. |
| `app/api/fiscal/documents/sync/route.ts` | Sincroniza documento fiscal com o provider. |
| `app/api/fiscal/documents/cancel/route.ts` | Cancela documento fiscal. |
| `app/api/fiscal/document-assets/route.ts` | Baixa/serve XML ou PDF/DANFE. |
| `app/api/fiscal/settings/route.ts` | Consulta e atualiza configuração fiscal da organização. |
| `app/api/fiscal/series/route.ts` | CRUD de séries fiscais. |
| `app/api/fiscal/operation-profiles/route.ts` | CRUD de perfis de operação fiscal. |
| `app/api/fiscal/company/sync/route.ts` | Sincroniza cadastro da empresa na Nuvem Fiscal. |
| `app/api/fiscal/company/sync-certificate/route.ts` | Sincroniza certificado digital da empresa na Nuvem Fiscal. |
| `lib/queries/fiscal.ts` | Hooks React Query para documentos, settings, séries e perfis. |
| `lib/mutations/fiscal.ts` | Mutations client-side para emissão, sync, cancelamento, settings e cadastros fiscais. |
| `state-hooks/use-internal-fiscal-settings-state.tsx` | Estado client-side de configuração fiscal. |
| `state-hooks/use-internal-fiscal-document-state.tsx` | Estado client-side relacionado a documento fiscal. |
| `state-hooks/use-fiscal-series-state.tsx` | Estado de séries fiscais. |
| `state-hooks/use-fiscal-operation-profile-state.tsx` | Estado de perfis de operação fiscal. |
| `app/dashboard/operational/fiscal/fiscal-page.tsx` | Tela operacional de documentos e configuração fiscal. |

### Endpoints Nuvem Fiscal integrados

Foram encontrados os seguintes fluxos implementados contra a Nuvem Fiscal:

- Emissão NFC-e: `POST /nfce`
- Emissão NF-e: `POST /nfe`
- Consulta NFC-e: `GET /nfce/{id}`
- Consulta NF-e: `GET /nfe/{id}`
- Sincronização NFC-e: `POST /nfce/{id}/sincronizar`
- Sincronização NF-e: `POST /nfe/{id}/sincronizar`
- Cancelamento NFC-e: `POST /nfce/{id}/cancelamento`
- Cancelamento NF-e: `POST /nfe/{id}/cancelamento`
- Download XML NFC-e/NF-e: `GET /nfce/{id}/xml`, `GET /nfe/{id}/xml`
- Download PDF/DANFE NFC-e/NF-e: `GET /nfce/{id}/pdf`, `GET /nfe/{id}/pdf`
- Cadastro de empresa: `POST /empresas`, fallback `PUT /empresas/{cpfCnpj}`
- Configuração NF-e/NFC-e da empresa: `PUT /empresas/{cpfCnpj}/nfe`, `PUT /empresas/{cpfCnpj}/nfce`
- Certificado digital: `PUT /empresas/{cpfCnpj}/certificado`

Não encontrei integração para:

- Carta de correção eletrônica (CC-e)
- Inutilização de numeração
- Manifestação do destinatário
- Eventos fiscais avançados
- Contingência offline

### Como o payload da nota é montado

O payload fiscal é montado principalmente em:

- `lib/fiscal/documents.ts`
- `lib/fiscal/providers/nuvem-fiscal/mappers/nfce.ts`
- `lib/fiscal/providers/nuvem-fiscal/mappers/nfe.ts`

Fontes de dados usadas:

- Venda: `sales`
- Itens da venda: `saleItems`
- Cliente/destinatário: `clients` e `clientLocations`
- Emitente: `organizations.fiscalConfiguracao`
- Série: `fiscalSeries`
- Operação fiscal: `fiscalOperationProfiles`
- Perfil fiscal de produto: `productFiscalProfiles`

O readiness atual valida configuração fiscal básica, série, operação, CPF/CNPJ, razão social e CSC para NFC-e. Também exige que exista pelo menos um perfil fiscal de produto na venda.

Ponto crítico: o payload tributário é incompleto. Os mappers usam NCM/CFOP/unidade, mas não modelam adequadamente ICMS, CST/CSOSN, PIS, COFINS, regras por UF ou regime. Totais tributários aparecem zerados/simplificados. Isso é aceitável como protótipo de integração, mas não como operação fiscal de produção.

### Tratamento de erros e rejeições

Existe armazenamento de:

- `status`
- `statusInterno`
- `provedorStatus`
- `mensagens`
- `provedorPayload`
- `provedorRetorno`
- eventos em `fiscalDocumentEvents`

O provider mapeia status como `autorizado`, `cancelado`, `rejeitado`, `denegado` e `erro` para status internos.

Lacunas:

- Não há catálogo de códigos de rejeição SEFAZ.
- Não há sugestão operacional de correção por código.
- Não há reenvio assistido com validação.
- Não há fila/retry/backoff robusto.
- Não há monitor operacional de documentos pendentes além da listagem.

### Multi-tenant e múltiplos CNPJs

O módulo é multi-tenant por organização. Documentos, séries, perfis e configuração fiscal são isolados por `organizacaoId`.

Limitações:

- Há uma configuração fiscal por organização, não múltiplos estabelecimentos/CNPJs dentro da mesma organização.
- O client da Nuvem Fiscal aceita token por organização, mas também tem fallback para token global por ambiente. Isso é um risco operacional para multi-tenant.
- O path de storage fiscal usa documento, mas não é claramente organizado por CNPJ/organização no prefixo.

### Armazenamento de XML e chave de acesso

Existe armazenamento de:

- `chaveAcesso`
- `numero`
- `serie`
- `protocolo`
- `xmlStoragePath`
- `pdfStoragePath`
- `snapshotOrigemVenda`
- `provedorPayload`
- `provedorRetorno`

XML e PDF são baixados do provider e persistidos no Supabase Storage.

### Processamento assíncrono

Não encontrei fila real para emissão fiscal.

Existe `syncPendingFiscalDocuments`, mas não encontrei worker, scheduler ou cron chamando essa rotina. A emissão automática no fluxo de venda ocorre de forma síncrona em `processSaleConfirmation`.

---

## 2. Lacunas críticas do módulo fiscal

| Item | Status | Complexidade |
|---|---:|---:|
| Emissão NFC-e balcão | Parcial | Alta |
| Emissão NF-e venda remota | Parcial | Alta |
| Cancelamento de nota | Parcial | Média |
| Carta de correção CC-e | Ausente | Média |
| Inutilização de numeração | Ausente | Média |
| Consulta de status no SEFAZ/provider | Parcial | Média |
| Download de XML assinado | Parcial | Baixa/Média |
| Geração/exibição de DANFE | Parcial, via PDF do provider | Baixa/Média |
| Configuração por CNPJ multi-tenant | Parcial | Média |
| Mapeamento de CFOP por tipo de operação | Parcial | Média |
| Mapeamento de CST/CSOSN por regime tributário | Ausente | Alta |
| NCM por categoria de produto | Parcial | Média |
| ICMS por UF de destino | Ausente | Alta |
| PIS/COFINS por regime | Ausente | Alta |
| Ambiente de homologação vs produção | Parcial | Baixa/Média |
| Tratamento de rejeições SEFAZ | Parcial | Média/Alta |
| Reemissão em caso de falha | Parcial | Média |
| Export CSV compatível com Bling/Tiny | Ausente | Baixa/Média |

---

## 3. Mapa dos demais módulos do produto

## PDV

Arquivos centrais:

- `services/drizzle/schema/sales.ts`
- `services/drizzle/schema/products.ts`
- `app/dashboard/commercial/sales/new-sale/new-sale-page.tsx`
- `app/api/pos/sales/route.ts`
- `app/api/pos/sales/create-and-confirm/route.ts`
- `app/api/pos/sales/confirm/route.ts`
- `app/api/pos/sales/cancel/route.ts`
- `lib/sale-processing/process-sale-confirmation.ts`
- `lib/sale-processing/create-accounting-entry.ts`
- `lib/sale-processing/process-stock-deduction.ts`
- `lib/payments/index.ts`
- `lib/payments/providers/local.ts`

Fluxo atual:

- Venda nasce como `sales`, geralmente com status `ORCAMENTO`.
- Itens são gravados em `saleItems`.
- Modificadores/add-ons são gravados em `saleItemModifiers`.
- Confirmação muda status para `CONFIRMADA`, define `natureza = SN01`, cria lançamento contábil, baixa estoque e processa pagamentos.
- Se habilitado, tenta emissão automática NFC-e.

Produtos:

- Produtos base em `products`.
- Variantes em `productVariants`.
- Add-ons em `productAddOns`, `productAddOnOptions` e `productAddOnReferences`.
- Estoque via `quantidade`, flags de rastreamento e `productStockTransactions`.

Pagamentos:

- Modelo suporta dinheiro, Pix, cartão crédito/débito, boleto, transferência, cashback, vale, fiado e outros.
- Provider real implementado é `LOCAL`.
- Mercado Pago, Stripe Connect e Pagar.me aparecem como caminhos previstos/TODO, não como integração completa.

Contabilidade:

- Venda confirmada cria `accountingEntries`.
- Contas padrão vêm da configuração da organização.
- Ainda é contabilidade operacional interna, não escrituração contábil/fiscal completa.

## Catálogo / Cardápio digital

Arquivos centrais:

- `services/drizzle/schema/shop.ts`
- `schemas/shop.ts`
- `lib/shop/catalog.ts`
- `app/shop/[orgId]/shop-page.tsx`
- `app/api/shop/[orgId]/catalog/route.ts`
- `app/api/shop/[orgId]/orders/route.ts`
- `app/api/shop/[orgId]/clients/lookup/route.ts`
- `app/api/shop/orders/route.ts`
- `app/dashboard/commercial/shop/shop-page.tsx`
- `components/dashboard/commercial/shop/ShopOrdersQueue.tsx`

Fluxo atual:

- Organização publica catálogo/cardápio por link público com `orgId`.
- API pública monta catálogo server-side com produtos ativos, estoque e configurações da loja.
- Cliente cria pedido digital.
- Pedido vira `sales` com status `ORCAMENTO`, canal `SHOP`, itens e metadados.
- Backoffice lista pedidos SHOP pendentes.

Status:

- Catálogo e criação de pedido estão funcionais em arquitetura.
- Pedido público não processa pagamento, estoque, fiscal ou contabilidade diretamente. Essa é uma decisão correta.
- A confirmação operacional precisa continuar sendo tratada como fluxo crítico de backoffice.

## CRM / Retenção

Arquivos centrais:

- `services/drizzle/schema/clients.ts`
- `pages/api/clients/index.ts`
- `pages/api/clients/bulk/index.ts`
- `utils/rfm.ts`
- `pages/api/cron/rfm-analysis.ts`
- `services/drizzle/schema/cashback-programs.ts`
- `lib/cashback/accumulation.ts`
- `lib/cashback/redemption.ts`
- `services/drizzle/schema/campaigns.ts`
- `app/api/campaigns/route.ts`
- `services/drizzle/schema/interactions.ts`
- `lib/interactions/process-single-interaction.ts`
- `lib/whatsapp/index.ts`
- `lib/whatsapp/internal-gateway.ts`
- `lib/whatsapp/template-management.ts`

Clientes:

- Captura por PDV, ponto de interação, loja digital e importações.
- Cliente possui CPF/CNPJ, telefone base, email, origem, localização, RFM e metadados de compra.

RFM:

- Calculado em cron.
- Usa vendas com `natureza = SN01`.
- Atualiza campos RFM no cliente e dispara campanhas de entrada/permanência de segmento.

Cashback:

- Modelo completo de programa, saldo e transações.
- Há acúmulo, resgate FIFO, expiração e reversão.
- Pontos de atenção: consistência entre todos os fluxos de venda e origem dos saldos importados.

WhatsApp:

- Integra Meta Cloud API e gateway interno.
- Suporta templates, mensagens, mídia, campanhas, interações agendadas e limites.

## Financeiro

Arquivos centrais:

- `services/drizzle/schema/financial.ts`
- `app/api/finances/financial-transactions/route.ts`
- `app/api/finances/financial-transactions/effect/route.ts`
- `app/api/finances/financial-accounts/route.ts`
- `app/api/finances/accounting-entries/route.ts`
- `app/api/finances/stats/route.ts`
- `app/dashboard/operational/finances/finances-page.tsx`
- `app/api/purchases/route.ts`

Status atual:

- Existem plano de contas, lançamentos contábeis, contas financeiras e transações financeiras.
- Vendas confirmadas geram lançamentos e transações.
- Há telas e APIs de listagem/estatísticas.
- Não encontrei conciliação bancária/acquirer robusta.
- Compras existem, mas o efeito contábil/financeiro/estoque/fiscal de compras ainda parece limitado.

---

## 4. Score de prontidão All-in-One

| Pilar | Score | Justificativa |
|---|---:|---|
| PDV operacional | 6/10 | O fluxo principal existe: venda, itens, variantes, add-ons, pagamento local, estoque e contabilidade. Ainda faltam adquirência real, testes end-to-end, robustez fiscal e conciliação. |
| Catálogo digital | 6/10 | Catálogo público e criação de pedido estão bem encaminhados. A operação depende de confirmação no backoffice e ainda não tem pagamento online completo. |
| CRM e retenção | 7/10 | RFM, cashback, campanhas e WhatsApp são módulos fortes. O risco está na consistência dos dados de venda/cliente entre todos os canais. |
| Módulo fiscal | 3/10 | Há provider, documentos, XML/PDF e cancelamento. A parte tributária e operacional SEFAZ ainda não sustenta produção sem risco. |
| Multi-tenancy / isolamento por lojista | 7/10 | `organizacaoId` aparece de forma ampla. Pontos de atenção: token fiscal global, configuração única por organização, storage e crons. |
| Qualidade de dados para retenção | 6/10 | Há boa base de clientes/vendas/importações, mas vendas anônimas, integrações e fluxos paralelos podem gerar buracos. |
| Infraestrutura e confiabilidade | 4/10 | Faltam filas, retries, idempotência forte, observabilidade e workers para fiscal/campanhas/integrações críticas. |

Score geral estimado para go-to-market como All-in-One: **5/10**.

Como CRM + catálogo + PDV básico, está viável para piloto controlado. Como suíte que substitui ERP com fiscal confiável, ainda não.

---

## 5. Os 5 maiores riscos técnicos hoje

### 1. Fiscal tributário incompleto

Impacto: alto.

O payload NF-e/NFC-e não modela adequadamente CST/CSOSN, ICMS por UF, PIS/COFINS, regras por regime, CFOP por cenário e validações de item. Isso pode gerar rejeição em massa ou emissão fiscal incorreta.

Mitigação:

- Criar motor fiscal mínimo por regime/operação/UF/NCM.
- Validar item a item antes de emitir.
- Rodar bateria de homologação com cenários reais por UF.

### 2. Emissão fiscal sem fila operacional robusta

Impacto: alto.

A emissão fiscal está acoplada ao fluxo de venda. Sem fila, retry e observabilidade, falhas externas podem deixar venda confirmada e nota pendente/erro sem operação clara.

Mitigação:

- Criar fila de emissão, sync, cancelamento e download de assets.
- Adicionar retry com backoff.
- Criar tela de pendências fiscais e alertas.

### 3. Financeiro sem conciliação real

Impacto: médio/alto.

O sistema cria transações financeiras, mas ainda não fecha o ciclo com adquirentes/bancos. Para varejo, isso limita confiança em contas a receber, liquidação e fluxo de caixa.

Mitigação:

- Implementar provider real de pagamento.
- Consumir webhooks de liquidação.
- Criar conciliação por extrato/adquirente.

### 4. Inconsistência entre canais de venda

Impacto: médio/alto.

PDV, loja digital, ponto de interação e importações podem criar vendas com diferentes efeitos colaterais: estoque, cashback, contabilidade, fiscal e campanhas. Isso prejudica retenção e relatórios.

Mitigação:

- Centralizar invariantes em `processSaleConfirmation`.
- Criar testes de contrato para venda confirmada.
- Garantir que todo canal converta para a mesma rotina de confirmação.

### 5. Multi-tenant fiscal ainda simplificado

Impacto: médio.

Há isolamento por organização, mas não há multiestabelecimento/CNPJs múltiplos dentro da mesma organização. O fallback de token fiscal global também é sensível.

Mitigação:

- Remover dependência operacional de token global em produção.
- Modelar estabelecimento fiscal quando necessário.
- Organizar storage e configs por organização/CNPJ.

---

## 6. Roadmap técnico sugerido

### Agora: 0-4 semanas

Objetivo: viabilizar piloto sem quebrar operação básica.

- Garantir que pedido SHOP confirmado usa contas padrão reais da organização.
- Fazer falha fiscal automática ficar visível para o operador.
- Bloquear emissão automática sem configuração fiscal mínima.
- Tornar incremento de número fiscal mais seguro.
- Garantir acúmulo/resgate de cashback no fluxo principal de confirmação.
- Garantir baixa de estoque de produto, variante e add-ons.
- Criar smoke tests mínimos para:
  - venda POS confirmada;
  - pedido SHOP confirmado;
  - baixa de estoque;
  - lançamento contábil;
  - transação financeira;
  - tentativa de emissão fiscal.

### Curto prazo: 1-3 meses

Objetivo: produto vendável com menos ressalvas.

- Completar motor fiscal mínimo:
  - CFOP por operação;
  - CST/CSOSN por regime;
  - NCM obrigatório;
  - ICMS por UF;
  - PIS/COFINS;
  - validação de payload antes do provider.
- Implementar CC-e e inutilização.
- Implementar fila/worker fiscal.
- Criar catálogo de rejeições SEFAZ com mensagens acionáveis.
- Completar provider de pagamento real e webhooks.
- Melhorar financeiro: contas padrão, efetivação, conciliação inicial e relatórios de divergência.
- Fortalecer operação de pedidos digitais: status, notificações e painel de atendimento.

### Médio prazo: 3-6 meses

Objetivo: defender posicionamento All-in-One.

- Homologar fiscal por UF/CNPJ alvo.
- Modelar multiestabelecimento se o público exigir.
- Completar compras com entrada em estoque, custo e efeitos financeiros.
- Criar conciliação bancária/adquirente madura.
- Robustecer automações WhatsApp com fila, deduplicação, tracking de entrega e métricas.
- Criar export fiscal/comercial compatível com Bling/Tiny como fallback de contingência/migração.

---

## 7. Observações livres

### Decisões após revisão

Itens que ficaram fora do escopo imediato por decisão de produto/implementação:

- Migrations fiscais: o ambiente atual usa `db:push` para refletir o schema.
- Motor tributário completo: CST/CSOSN, ICMS por UF, PIS/COFINS, CFOP por cenário e validação fiscal avançada continuam no roadmap maior.
- CC-e, inutilização e eventos fiscais avançados continuam adiados.
- Catálogo de rejeições SEFAZ com mensagens acionáveis continua no roadmap maior.
- Multiestabelecimento/múltiplos CNPJs por organização continua adiado até haver demanda clara.
- Conciliação bancária/adquirente real continua fora do escopo fiscal imediato.

Itens priorizados no ciclo imediato:

- Corrigir defaults/estado de permissões fiscais.
- Evitar log e persistência da senha do certificado digital.
- Manter a confirmação da venda independente da emissão fiscal e notificar responsáveis por e-mail quando a emissão automática falhar.
- Reservar numeração fiscal antes do envio ao provider e reutilizar o número em reprocessamentos do mesmo documento.
- Expor ações operacionais na tela fiscal: detalhes, sincronizar, emitir novamente, cancelar e baixar XML/PDF.
- Corrigir o erro TypeScript direto no provider de certificado da Nuvem Fiscal.

### Pontos positivos

- Boa separação entre schema, API, hooks e estado client-side.
- Provider fiscal abstraído, permitindo evoluir Nuvem Fiscal ou fallback manual.
- Documentos fiscais têm snapshots e eventos, o que é essencial para auditoria.
- Catálogo público recalcula produtos/preços no servidor, reduzindo manipulação client-side.
- O modelo de cashback/campanhas é mais maduro que o restante do ERP.

### Débitos visíveis

- Falta uma suíte de testes automatizados para fluxos críticos.
- O TypeScript global do projeto apresenta erros em módulos não relacionados ao fiscal, o que reduz confiança em refactors.
- Há crons com muita responsabilidade e pouca observabilidade.
- Algumas integrações externas têm logs/efeitos colaterais que deveriam ser tratados como jobs.
- Fiscal ainda está no estágio de integração, não de compliance completo.

### Conclusão

O caminho correto é não vender o fiscal como pronto antes de completar regras tributárias, fila e tratamento de rejeições. O produto pode avançar para piloto com PDV, catálogo e CRM, desde que o escopo fiscal seja controlado: homologação, poucos CNPJs, poucos cenários fiscais e operação assistida.
