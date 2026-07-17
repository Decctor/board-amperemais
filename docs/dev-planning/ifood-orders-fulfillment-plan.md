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
	financeiro: boolean; // lançamento contábil + transações financeiras
	fiscal: boolean; // emissão automática (processSaleAutomaticFiscalEmissionIfEligible)
	cashback: boolean; // acúmulo (hoje já acontece no data-collecting — mover para um lugar só)
};
```

- O pipeline continua único (`processSaleConfirmationInTransaction`,
  `processSaleAttendanceStatusChange`, `processStockDeduction`) — os blocos são pulados conforme a
  política. Sem pipeline paralelo para integrações.
- **Idempotência obrigatória** em todos os efeitos: eventos de webhook chegam duplicados e fora de
  ordem por design (garantia at-least-once, sem ordenação).

### 4.2 Esteira de atendimento unificada (adapter por canal)

O board passa a exibir vendas `CONFIRMADA` de qualquer canal com `fulfillment: true`. A diferença
fica num adapter:

| Card               | Transição no board                                                             | Efeito                          |
| ------------------ | ------------------------------------------------------------------------------ | ------------------------------- |
| Interno            | aplica direto (como hoje)                                                      | efeitos locais                  |
| iFood              | chama a API do iFood primeiro; só aplica o estado local se o iFood aceitar     | efeitos locais + estado externo |

Mapeamento de transições iFood:

| Ação no board                  | Chamada iFood                                  |
| ------------------------------ | ---------------------------------------------- |
| Confirmar (sai de NAO_INICIADO) | `POST /orders/{id}/confirm` (SLA 8 min)        |
| Em preparo                     | `POST /orders/{id}/startPreparation`           |
| Pronto (retirada: obrigatório) | `POST /orders/{id}/readyToPickup`              |
| Em entrega (entrega própria)   | `POST /orders/{id}/dispatch` (deliveredBy=MERCHANT) |
| Cancelar                       | `GET /cancellationReasons` + `POST /requestCancellation` |
| Entregue                       | não é ação nossa — chega via evento `CONCLUDED` |

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

### Fase 3 — Política de canal + esteira unificada (planejada)

- Introduzir `TChannelErpPolicy` na configuração da integração da organização.
- Board de atendimento passa a incluir vendas de canais com `fulfillment: true`; adapter iFood
  nas transições; eventos aplicam transições (bidirecional).
- Consolidar efeitos (cashback etc.) num único lugar com guardas de idempotência.

### Fase 4 — Financeiro de repasse (planejada)

- Provisionar conta `CARTEIRA_DIGITAL` "iFood"; ENTRADA pendente na confirmação;
  conciliação/efetivação via módulo Financial + transferência do líquido; taxas agregadas por
  ciclo (depois por pedido).

### Fase 5 — Fiscal (planejada)

- Ligar `processSaleAutomaticFiscalEmissionIfEligible` na política de canal.
  `additionalFees` do iFood não entram na NF; `customer.documentNumber` (CPF) quando presente.

## 6. Referências

- Fluxo de integração: https://developer.ifood.com.br/pt-BR/docs/getting-started/first-steps/integration-flow
- Polling/presença/critérios: https://developer.ifood.com.br/pt-BR/docs/guides/modules/events/polling-overview
- Webhook: https://developer.ifood.com.br/pt-BR/docs/guides/modules/events/webhook-overview
  (conceitos: `/webhook-request`, assinatura: `/webhook-signature`, presença: `/webhook-presence`)
- Endpoints de pedido: https://developer.ifood.com.br/pt-BR/docs/guides/modules/order/endpoints
- Detalhes do pedido: https://developer.ifood.com.br/pt-BR/docs/guides/modules/order/details
