# iFood: Pedidos, Fulfillment de Integrações e Financeiro de Repasse

> Status: fases 1 e 2 em implementação (jul/2026). Fases 3–5 planejadas.
> Contexto: homologação do app iFood + evolução do fulfillment para vendas de integrações em geral.

## 1. Contexto e motivação

A homologação do aplicativo iFood tem 5 etapas: (1) testar conectividade, (2) receber e confirmar
pedidos, (3) cancelar pedidos, (4) despachar pedidos, (5) validar pedidos. Descobertas que moldaram
este plano:

- **Presença**: o iFood considera o _aplicativo_ ONLINE apenas enquanto há `GET /events:polling` a
  cada ~30s (ou webhook com heartbeat). O cron `data-collecting` de 5 minutos não satisfaz isso —
  origem do erro "Aplicativo precisa estar online. Status atual: OFFLINE" na etapa 1. Paliativo
  atual: `npm run ifood:homologation-polling` (loop de 30s com ACK).
- **SLA de confirmação**: pedidos devem ser confirmados via `POST /orders/{id}/confirm` em até
  **8 minutos**. Ingestão de 5 em 5 minutos é incompatível com gestão de pedidos.
- **Ciclo de vida**: confirmar/despachar/cancelar são chamadas de API que não existiam no código
  (o data-connector era somente leitura: polling + GET /orders/{id} + ACK).

## 2. Decisões tomadas

1. **Ingestão migra para webhook** (tempo real), com o cron de polling mantido como fallback —
   o próprio iFood recomenda: eventos de webhook são descartados após 15 min de retentativas.
2. **Vendas de integrações passam a gerar efeitos de ERP** (estoque, financeiro, fiscal) — não só
   o iFood: o desenho vale para qualquer canal futuro (e-commerce etc.), controlado por política.
3. **Financeiro do iFood usa conta de repasse** (clearing account): os recebíveis agregam numa
   conta financeira "iFood" e são baixados/transferidos na conciliação do repasse, com as taxas.

## 3. ⚠️ Pré-requisito descoberto: webhook exige autenticação centralizada

A doc do iFood é explícita: **"Webhook está disponível apenas para autenticação centralizada."**
Nosso app hoje usa o fluxo **distribuído** (userCode + authorizationCode por loja —
`createIfoodUserCode`/`exchangeIfoodAuthorizationCode` em `lib/data-connectors/ifood/client.ts`).

Consequências:

- O endpoint de webhook (fase 2) fica pronto e testável (assinatura, KEEPALIVE, ingestão), mas o
  iFood só passa a enviar eventos quando o app estiver no modelo centralizado.
- Migração para centralizado = criar/converter app com acesso centralizado no Developer Portal e
  trocar o fluxo de conexão da organização de "digite o userCode no Portal do Parceiro" para
  "solicitar acesso à loja" (aprovação pelo lojista no Portal do Parceiro). Os tokens deixam de
  ser por loja (grant `client_credentials` único do app).
- Até lá, a presença/ingestão em tempo quase real pode ser suprida por um worker de polling de 30s
  (o script de homologação já implementa o loop; um worker permanente exigiria infra fora do cron
  da Vercel).

## 4. Arquitetura alvo

### 4.1 Política de canal (separar "origem da captura" de "quais efeitos rodam")

Hoje `sales.processamentoOrigem: EXTERNO | INTERNO` decide implicitamente se a venda participa do
ERP (o board de atendimento filtra `INTERNO`, `app/api/sales/fulfillment/route.ts`). Passa a valer:

- `processamentoOrigem` continua indicando apenas onde a venda foi capturada.
- Uma **política de canal** por integração (na configuração da organização) decide os efeitos:

```ts
type TChannelErpPolicy = {
	fulfillment: boolean; // aparece na esteira de atendimento
	estoque: boolean; // baixa física na entrega (processStockDeduction)
	financeiro: boolean; // lançamento contábil + transações financeiras (fase 4)
	fiscal: boolean; // emissão automática (fase 5)
};
```

Cashback **não** faz parte da política: o controle já existe e continua sendo
`cashbackPrograms.acumuloPermitirViaIntegracao` (padrão vigente: acumula). Implementação:
`configuracao.preferencias.integracaoERP` (defaults todos `false`) + accessor defensivo
`getChannelErpPolicy` em `lib/sales/fulfillment-channels/policy.ts` (jsonb antigo não tem o bloco).

- O pipeline continua único (`processSaleConfirmationInTransaction`,
  `processSaleAttendanceStatusChange`, `processStockDeduction`) — os blocos são pulados conforme a
  política. Sem pipeline paralelo para integrações.
- **Idempotência obrigatória** em todos os efeitos: eventos de webhook chegam duplicados e fora de
  ordem por design (garantia at-least-once, sem ordenação).

### 4.2 Esteira de atendimento unificada (adapter por canal)

O board passa a exibir vendas `CONFIRMADA` de qualquer canal com `fulfillment: true`. A diferença
fica num adapter:

| Card    | Transição no board                                                         | Efeito                          |
| ------- | -------------------------------------------------------------------------- | ------------------------------- |
| Interno | aplica direto (como hoje)                                                  | efeitos locais                  |
| iFood   | chama a API do iFood primeiro; só aplica o estado local se o iFood aceitar | efeitos locais + estado externo |

Mapeamento de transições iFood:

| Ação no board                   | Chamada iFood                                            |
| ------------------------------- | -------------------------------------------------------- |
| Confirmar (sai de NAO_INICIADO) | `POST /orders/{id}/confirm` (SLA 8 min)                  |
| Em preparo                      | `POST /orders/{id}/startPreparation`                     |
| Pronto (retirada: obrigatório)  | `POST /orders/{id}/readyToPickup`                        |
| Em entrega (entrega própria)    | `POST /orders/{id}/dispatch` (deliveredBy=MERCHANT)      |
| Cancelar                        | `GET /cancellationReasons` + `POST /requestCancellation` |
| Entregue                        | não é ação nossa — chega via evento `CONCLUDED`          |

Sincronização bidirecional: o lojista pode operar pelo Gestor de Pedidos do iFood em paralelo
("múltiplos devices"). Eventos `CFM`/`DSP`/`CON`/`CAN` recebidos (webhook ou polling) aplicam a
mesma transição local via os mesmos serviços — o card se move sozinho e a baixa de estoque na
entrega acontece exatamente uma vez.

### 4.3 Financeiro: conta de repasse (clearing account)

O schema atual já suporta o desenho (nenhuma migração estrutural):

1. **Conta financeira "iFood"** tipo `CARTEIRA_DIGITAL`, provisionada ao conectar a integração.
   Representa "dinheiro que está com o iFood".
2. **Na confirmação do pedido**: lançamento contábil pelo valor **bruto** +
   `financialTransaction` de ENTRADA:
   - Pago online (no app do iFood) → conta iFood, `dataEfetivacao` nula (pendente),
     `dataPrevisao` = repasse estimado, `provedorReferencia` = orderId.
   - Pago na entrega → conta padrão do caixa, efetivada na entrega (não passa pelo iFood).
3. **No repasse (ciclo semanal)**: efetivar as transações pendentes do ciclo; lançar SAÍDA das
   taxas/comissões na conta iFood; registrar TRANSFERÊNCIA (enum `origem_tipo` já tem) da conta
   iFood para a conta bancária no valor líquido. O saldo da conta iFood é a conciliação.
4. **Taxas**: começar com taxa **agregada por ciclo de repasse** (concilia com o extrato);
   evoluir para taxa por pedido usando o **módulo Financial da API do iFood**
   (settlements/conciliação por pedido) — casamento via `provedorReferencia`.

Observação do payload do pedido: `additionalFees` com `liabilities.name = IFOOD` são receita do
iFood (não entram na NF); `benefits` com sponsorship `IFOOD`/`EXTERNAL`/`CHAIN` são tratados como
pagamento (o iFood repassa), sponsorship `MERCHANT` é desconto real da loja.

### 4.4 Webhook (contrato do iFood)

- URL única por app (configurada no Developer Portal), HTTPS, timeout de **5 segundos** —
  responder `202 Accepted` imediatamente e processar de forma assíncrona (`waitUntil`).
- **Assinatura**: header `X-IFood-Signature` = HMAC-SHA256 hex do **body cru** com o
  `client_secret` do app. Validar ANTES do parse, com comparação constant-time. A homologação
  testa envio com assinatura inválida (deve responder 401).
- **Presença (KEEPALIVE)**: evento `{ code: "KEEPALIVE", ... }` chega no mesmo endpoint.
  - Modo "por aplicativo" (padrão): responder `202` → todos os merchants online.
  - Modo "por merchant": request traz `merchantIds[]`; responder `202` + JSON com a lista dos
    merchants online (respondemos com os merchants conectados à plataforma).
- **Entrega**: at-least-once, sem ordem, retentativas por 15 min, depois descarta → cron de
  polling continua como fallback de recuperação.
- Sem filtro por tipo/merchant: todo evento de todos os merchants autorizados chega na mesma URL.
  Resolver `merchantId → organização` via `organizations.integracaoConfiguracao.merchantIds`.

## 5. Fases

### Fase 1 — Módulo de ações de pedido + painel (em implementação)

- `lib/integrations/ifood/order-types.ts`: DTOs tolerantes (`.passthrough()`) do pedido
  (detalhes p/ UI) e dos motivos de cancelamento.
- `lib/integrations/ifood/orders.ts`: `getIfoodOrderDetails`, `getIfoodOrderCancellationReasons`,
  `confirmIfoodOrder`, `startIfoodOrderPreparation`, `setIfoodOrderReadyToPickup`,
  `dispatchIfoodOrder`, `requestIfoodOrderCancellation` — sempre via
  `resolveIfoodManagementContext` + `mapIfoodError`.
- Rotas:
  - `GET /api/integrations/ifood/orders` — lista pedidos iFood recentes da organização a partir
    de `sales` (`canal = "iFood"`, `idExterno` = orderId), com status de atendimento.
  - `GET /api/integrations/ifood/orders/details?orderId=` — detalhes ao vivo do pedido no iFood
    (+ motivos de cancelamento).
  - `POST /api/integrations/ifood/orders/actions` — `{ orderId, action, cancellationCode? }` com
    `action ∈ confirm | startPreparation | readyToPickup | dispatch | requestCancellation`.
  - Permissões: GET → `canViewIntegrations`; POST → `canManageIntegrations`.
- Painel "Pedidos" em `app/dashboard/integrations/ifood/_module/orders/` (nova aba na página da
  integração): lista com refresh automático + ações por pedido. É a superfície de evidência para
  as etapas 2–4 da homologação (a esteira unificada da fase 3 substitui/complementa depois).
- Nota: o corpo de `requestCancellation` é enviado como `{ reason, cancellationCode }` (código nos
  dois campos) para cobrir as duas variantes documentadas — validar na homologação ao vivo.

### Fase 2 — Webhook de ingestão (em implementação)

- Rota pública `POST /api/webhooks/ifood`:
  1. lê o body cru (`request.text()`), valida `X-IFood-Signature` (HMAC-SHA256 com
     `IFOOD_CLIENT_SECRET`), rejeita com 401 se inválida;
  2. `KEEPALIVE` → responde 202 (com `merchantIds` conectados quando o request trouxer a lista);
  3. evento de pedido → responde 202 imediatamente e, via `waitUntil`, resolve a organização pelo
     `merchantId` e dispara `runDataCollectingV2({ organizationIds: [org] })` com janela curta —
     reusa todo o pipeline canônico (upsert idempotente por `idExterno`, ACK, efeitos).
- O webhook é um "sino": não processa o evento em si, dispara o import da organização. Burst de
  eventos gera imports redundantes mas idempotentes (aceitável na escala atual; debounce por org é
  otimização futura).
- Cron `data-collecting` de 5 min permanece como fallback (eventos não-ACKados continuam vindo no
  polling).
- Configuração manual no Developer Portal: habilitar webhook + URL + modo de presença.
  **Depende da migração para autenticação centralizada (seção 3).**

### Fase 3 — Política de canal + esteira unificada (implementada)

Decisões fechadas na implementação:

- **Eixo canônico de fulfillment**: `TCanonicalSale.attendanceStatus` (novo); o conector iFood
  mapeia o ciclo completo (PLACED→NAO_INICIADO, CONFIRMED/PREPARATION→EM_PREPARO,
  READY_TO_PICKUP→PRONTO, DISPATCHED→EM_ENTREGA, CONCLUDED→ENTREGUE, CANCELLED→CANCELADO) e os
  eventos intermediários (RTP/DSP/SPS/SPE/COL) entraram nos relevantes — ações no Gestor de
  Pedidos movem o board via ingestão. Conectores sem granularidade mantêm o comportamento legado.
- **`becameValid` substitui `isNewSale && isValidSale`** como gatilho dos efeitos de "nova
  compra" (cashback, atribuição de conversão, campanhas, métricas do cliente). Motivo: com
  ingestão em tempo real todo pedido é visto primeiro em `PLACED` (inválido) e o gate antigo
  nunca mais disparava os efeitos na confirmação. `becameValid = isValidSale && !previouslyValid`
  dispara exatamente uma vez por venda.
- **Guarda de cashback na fonte**: `accumulateCashbackForClient` só acumula se não existir
  transação ACÚMULO para (venda, cliente) — comprador e parceiro seguem acumulando separadamente.
  Os três chamadores (import, confirmação interna, entrega) ficam idempotentes por construção.
- **Ingestão aplica transições**: para canais gerenciados o `sync-sales` respeita
  `isValidAttendanceTransition` (evento fora de ordem é ignorado com log), nunca rebaixa
  `statusVenda`, e na chegada à entrega executa baixa de estoque guardada num savepoint
  (falha de estoque não aborta a importação). Venda que nasce entregue faz fast-forward.
- **Pedidos `PLACED` não são cards**: ficam com `statusVenda: null` e aparecem na **pill de
  pedidos a confirmar** no topo da esteira (estilo das pills de conexões do dashboard), que abre
  dialog/drawer com a fila: confirmar (promove localmente + `confirm` no iFood) ou recusar
  (motivo obrigatório via `cancellationReasons`; o pedido só sai quando o evento `CANCELLED`
  chega — cancelamento tem gatilho único: o evento).
- **Adapter no board**: transição de card iFood chama a Order API antes do estado local
  (`lib/sales/fulfillment-channels/`); se o iFood rejeitar, nada muda. Board envia
  `allowUnpaidDelivery` implícito para canais gerenciados (financeiro chega na fase 4) e os
  gates `enableStockDeduction`/`enableAutomaticFiscalEmission` seguem a política.
- Rollout: política default desligada; ligar por organização piloto e validar com pedidos de
  teste antes de habilitar `estoque` (depende do matching externalCode→produto do catálogo).

### Fase 4 — Financeiro por pedido, conciliação manual (implementada)

Decisões fechadas: contas first-party identificadas por `financialAccounts.chave_sistema`
(índice único por organização; contas do usuário ficam null); conta contábil reaproveitada de
`defaults.contabilidade.lancamentosPadrao.vendas`; **sem** conciliação automática/módulo
Financial nesta fase — taxas e transferência do líquido do repasse são lançadas manualmente no
módulo financeiro (a conta iFood funciona como clearing com conciliação manual pelo saldo).

- `ensureFirstPartyFinancialAccount` (`lib/finances/first-party-accounts.ts`): provisiona a
  conta `CARTEIRA_DIGITAL` "iFood" idempotentemente (onConflictDoNothing + relê).
- `TCanonicalSale.payments`: o mapper do iFood parseia `payments.methods` (método mapeado para
  o enum da plataforma, online/offline); fallback pelos agregados `prepaid`/`pending`.
- `processManagedSaleFinancials` (`lib/sales/fulfillment-channels/managed-sale-financials.ts`),
  disparado no sync em `becameValid` com `policy.financeiro`, savepoint, idempotente por venda
  (lançamento contábil existente = pula):
  - lançamento contábil pelo bruto, `dataCompetencia` = data do pedido;
  - pago online → ENTRADA pendente na conta iFood, `provedorStatus AGUARDANDO_REPASSE`,
    `dataPrevisao` = D+7, `provedorReferencia` = orderId (âncora da conciliação futura);
  - pago na entrega → ENTRADA pendente na conta padrão do método (`defaults.pagamentos`),
    efetivada quando a venda chega a ENTREGUE (`settleManagedSaleOfflinePayments`, idempotente,
    roda em todo sync de venda entregue — cobre entregas feitas pelo board entre syncs);
  - cancelamento (`previouslyValid && nowCanceled`) → pendentes viram CANCELADO; efetivadas são
    logadas para estorno manual.
- Organização sem contas contábeis padrão: loga e importa a venda sem financeiro (não aborta).

Adiado para a fase 4b (sem retrabalho): connector do módulo Financial (settlements/conciliação),
efetivação automática no repasse, taxas automáticas por pedido, transferência automática do
líquido.

### Fase 5 — Fiscal (implementada; trava C5 ativa até validação em homologação)

**Descoberta-chave que molda o desenho**: o payload fiscal (Spedy) é construído inteiramente a
partir dos **itens** da venda — `vProd`/`vDesc`/`vNF` saem de `computeSaleTaxation`
(`lib/fiscal/taxation-context.ts`, soma de `valorVendaTotalBruto`/`valorTotalDesconto` por item);
`freightAmount` é 0 fixo no mapper (`lib/fiscal/providers/spedy/mappers/invoice.ts`); o
`venda.valorTotal` só aparece no check de readiness (pagamentos ≥ total). Consequência: as
`additionalFees` do iFood e a taxa de entrega **já ficam naturalmente fora da NF** — o problema
NÃO é excluí-las, e sim os quatro pontos abaixo.

O que já funciona de graça: CPF do cliente (`documentNumber` → `cliente.cpfCnpj` → snapshot do
destinatário), `resolveEmissionDocumentType` recebendo `canal` como sinal, pagamentos fiscais
lidos das transações da fase 4, fila com retry + `FiscalReadinessError` + notificação.

#### A. Elegibilidade para canal gerenciado

`processSaleAutomaticFiscalEmissionIfEligible` exige `isFullyPaid`; recebíveis online da fase 4
ficam `AGUARDANDO_REPASSE` (não efetivados) até a conciliação manual → a NF de pedido iFood
nunca dispararia. Correção: para venda de canal gerenciado, `AGUARDANDO_REPASSE` conta como
"pago pelo cliente" na elegibilidade (o consumidor pagou no app; a pendência é loja↔iFood e não
muda o fato gerador). Demais gates inalterados (ENTREGUE, sem documento vigente, lançamento
contábil existente — garantido pela fase 4).

#### B. Disparo na ingestão (pós-commit)

O hook fiscal hoje só roda na transição via board (gate `enableAutomaticFiscalEmission` da fase
3). Falta o disparo quando a entrega chega pela ingestão (evento CONCLUDED). Restrição: o
processo de emissão lê via `db` (fora da transação do sync) — dentro do tx da organização ele
enxergaria o estado pré-commit. Desenho: o sync coleta os ids das vendas gerenciadas entregues
com `policy.fiscal` e a emissão roda APÓS o commit da organização (junto do `postProcess`).
Idempotente por natureza (`DOCUMENTO_EXISTENTE`).

#### C. Base fiscal do pedido iFood — problemas reais e abordagens

**C1. Descontos MERCHANT não chegam aos itens (NF superestimada).** Hoje
`mapIfoodSaleItem.discountValue = bruto − totalPrice` (praticamente sempre 0, pois `totalPrice`
inclui complementos) e os `benefits` do pedido não são alocados aos itens. Um desconto real da
loja (sponsorship MERCHANT) não reduz a NF → tributa receita que não existiu.
Abordagem escolhida: **rateio no mapper do iFood**:

- benefit `target: ITEM`/`PROGRESSIVE_DISCOUNT_ITEM` com parcela MERCHANT → desconto direto no
  item indicado por `targetId` (= `items.index`);
- benefit `target: CART` com parcela MERCHANT → rateio proporcional ao valor dos itens (padrão
  contábil), acumulado em `item.discountValue`;
- benefit `target: DELIVERY_FEE` → ignorado para a NF (a taxa de entrega não está nos itens);
- parcelas patrocinadas (IFOOD/EXTERNAL/CHAIN) → **não** viram desconto: a NF sai pelo valor
  cheio e a diferença é pagamento do patrocinador (ver C2).
  Efeito colateral desejado: `valorVendaTotalLiquido` dos itens passa a refletir a margem real.

**C2. Pagamentos fiscais ≠ vNF (troco artificial na NFC-e).** As transações da fase 4 somam o
`orderAmount` (inclui taxa de entrega/additionalFees) e o `loadSalePayments` do snapshot as usa
cruas → pagamentos > vNF e a diferença viraria `vTroco` numa NFC-e paga com cartão (feio e
sinalizável). Abordagem: para venda de canal gerenciado, os pagamentos fiscais são
**reconstruídos do detalhamento do canal** (C4) e ajustados ao vNF: métodos reais do cliente
(proporcionalmente) + parcela "paga pelo patrocinador" como `giftVoucher`/`other`, com clamp
para somar exatamente vNF (+ frete próprio quando C3 entrar). O financeiro (fase 4) continua
usando os valores cheios — só a visão fiscal é ajustada.

**C3. Frete próprio fora da NF (receita subdeclarada).** Entrega própria (`deliveredBy:
MERCHANT`): a taxa de entrega é receita da loja e deve compor a NF (`vFrete`; hoje
`freightAmount: 0` fixo). Entrega feita pelo iFood: fica fora (não é receita da loja).
Abordagem: `computeDocumentTotals`/mapper ganham suporte a frete de canal gerenciado; o valor
vem do detalhamento (C4). Decisão consciente: é a única parte que ALTERA o motor de totais —
implementar por último e atrás da trava (C5). Alternativa mínima descartada (frete fora da NF)
por subdeclarar receita.

**C4. Persistência do detalhamento fiscal do canal.** Os dados (benefits por patrocinador,
additionalFees, frete e `deliveredBy`) chegam no payload e hoje são descartados. Abordagem
(decidida): coluna dedicada **`sales.integracaoMetadados`** (jsonb tipado, nullable — mesmo
padrão do `capiMetadados`), schema `SaleIntegrationMetadataSchema` em `/schemas/sales`:
`{ versao, canal, entrega: { realizadaPor: LOJA|CANAL, valorFrete }, descontos: { loja,
patrocinados[] }, taxasCanal[] }`. O canônico carrega o bloco (`integrationMetadata`), o sync
persiste, o snapshot fiscal lê da própria venda (zero join novo). Alternativas rejeitadas:
`rascunhoMetadados` (semanticamente é rascunho do PDV), tabela dedicada (join + boilerplate +
módulo de deleção para dado 1:1), recalcular do `raw` na emissão (o raw não é persistido).

**C5. Trava de segurança no rollout.** Enquanto C1–C3 não forem validados com pedidos reais:
venda gerenciada cujo pedido tem benefits patrocinados, frete próprio ou divergência
itens×pagamentos acima da tolerância → emissão automática é PULADA com razão explícita
(`CANAL_PENDENTE_TRATAMENTO_FISCAL`), caindo para emissão manual. A trava é afrouxada por
etapa conforme C1→C4→C2→C3 entram e são validados na homologação.

#### D. Toggle + requisitos operacionais

Tirar o "Em breve" do fiscal no modal. Requisitos do piloto (não são código): produtos do
iFood precisam de perfil fiscal (NCM/grupo tributário) — sem isso a emissão cai na fila com
`FiscalReadinessError` e notificação (comportamento correto); operação fiscal configurada para
o canal (`resolveEmissionDocumentType`). Cancelamento de pedido após NF autorizada permanece
manual (fluxo de cancelamento de NF já existe).

**Ordem de implementação**: A → B → C4 → C1 → C2 → D (com C5 ativa) → C3 → afrouxar C5 conforme
validação com pedidos reais na homologação.

**Notas da implementação (jul/2026)**:

- Correção adicional descoberta no C1: o bruto do item iFood usava `unitPrice × qty` SEM
  complementos — NF subdeclarada e violação de `vProd = qCom × vUnCom`. Corrigido: bruto =
  `totalPrice` (item + complementos), unitário derivado do bruto.
- Benefit sem `sponsorshipValues` é tratado como patrocinado "DESCONHECIDO" (nunca subdeclara a
  NF; a trava C5 segura a emissão automática do caso).
- Trava C5: constante `MANAGED_CHANNEL_STRICT_AUTO_EMISSION` em
  `process-sale-automatic-fiscal-emission.ts` — pula automático quando patrocinado > 0 ou frete
  próprio > 0, razão `CANAL_PENDENTE_VALIDACAO_FISCAL`; virar para `false` após validação.
- Validado com pedido sintético completo (rateio direto+proporcional, metadados, vNF = itens −
  desconto + frete, pagamentos fiscais fechando exatos sem troco) e parse contra a API real.

## 6. Referências

- Fluxo de integração: https://developer.ifood.com.br/pt-BR/docs/getting-started/first-steps/integration-flow
- Polling/presença/critérios: https://developer.ifood.com.br/pt-BR/docs/guides/modules/events/polling-overview
- Webhook: https://developer.ifood.com.br/pt-BR/docs/guides/modules/events/webhook-overview
  (conceitos: `/webhook-request`, assinatura: `/webhook-signature`, presença: `/webhook-presence`)
- Endpoints de pedido: https://developer.ifood.com.br/pt-BR/docs/guides/modules/order/endpoints
- Detalhes do pedido: https://developer.ifood.com.br/pt-BR/docs/guides/modules/order/details
