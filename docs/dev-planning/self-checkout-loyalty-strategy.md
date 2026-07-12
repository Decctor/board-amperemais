# Self-Checkout / Totens de Autoatendimento — Planejamento Técnico e Estratégico

Objetivo: posicionar o RecompraCRM como a **camada de fidelização/recompra** que qualquer
terminal de autoatendimento (próprio ou de fabricantes como Sweda, PDV Smart, Genialtec)
consegue plugar — sem virarmos fabricante de hardware.

Contexto de mercado: self-checkout cresce ~11–13% a.a. no Brasil (projeção de US$ 6,5 bi
até 2027), com preferência do consumidor entre 63–70% e o padrão emergente de
identificação por CPF/app com aplicação automática de desconto de fidelidade — exatamente
o problema que o motor RFM/cashback já resolve.

Este documento consolida a auditoria de código (Passo 1), opções de arquitetura com
trade-offs (Passo 2 — decisão fica com o negócio), mapeamento por nicho (Passo 3),
setup/onboarding (Passo 4), integração com o GTM (Passo 5) e riscos/recomendação (Passo 6).

---

## PASSO 1 — Auditoria de prontidão arquitetural

### 1.1 Como o sistema registra venda em ponto físico hoje

Existem **dois PDVs distintos** na plataforma:

| Superfície | UI | Rota de criação | Natureza |
|---|---|---|---|
| **Ponto de Interação (POI)** — tablet/totem de balcão | `app/(external)/point-of-interaction/[orgId]/` | `POST /api/point-of-interaction/new-transaction` | Venda **por valor** (sem carrinho), foco em cashback/cupom/prêmio |
| **PDV interno** — dashboard com carrinho | `app/dashboard/commercial/sales/new-sale/new-sale-page.tsx` | `POST /api/pos/sales/create-and-confirm` | Venda completa (itens, pagamentos, NFC-e, sessão de caixa) |

O POI é o proxy direto do caso self-checkout. Fluxo síncrono do
`processPointOfInteractionTransaction` (`app/api/point-of-interaction/new-transaction/route.ts:219-1007`),
tudo dentro de **um único `db.transaction`**:

1. Identificação do operador por **senha** (`route.ts:270-297`).
2. Identificação/criação do cliente (`route.ts:306-390`).
3. Resgate de cashback FIFO (`route.ts:576-642` → `lib/cashback/redemption.ts:23-138`).
4. Acúmulo de cashback — cliente e parceiro (`route.ts:644-703` → `lib/cashback/accumulation.ts:63-162`).
5. Cupom/recompensa (`route.ts:459-555`).
6. Criação da venda com `processamentoOrigem='INTERNO'`, sem emissão fiscal (`route.ts:706-818`).
7. Avaliação de campanhas e **inserção de `interactions` dentro da transação** (`route.ts:820-940`).

O POI tem dois modos já hoje: **`kiosk`** (tablet no balcão, exige senha do operador,
chamada síncrona) e **`mobile`** (celular do cliente cria uma *solicitação* em
`poiTransactionRequests` que o operador aprova depois —
`transaction-requests/public/route.ts:42-53` + `management/approve/route.ts:91-99`).
O modo kiosk já tem fullscreen + wake-lock (`_shared/providers/kiosk-provider.tsx:26-46`)
e a organização já armazena QR codes de kiosk/mobile (`schemas/organizations.ts:349-350`)
e branding white-label por organização (cores em `schemas/organizations.ts:311-348`).

### 1.2 Identificação do cliente e latência do hot path

- **Chave de identificação = telefone (11 dígitos)**, não CPF. Lookup em
  `GET /api/clients/lookup` (`app/api/clients/lookup/route.ts:29-119`) por
  `telefoneBase + organizacaoId`, retornando nome + saldo disponível + regras do programa.
  CPF/CNPJ existe no cadastro (`clients.cpf_cnpj`, adicionado na migração
  `drizzle/0006_partner_cashback_foundation.sql`) mas **não é chave de busca** — para o
  padrão de mercado "digite seu CPF no totem", falta indexar e expor lookup por CPF.
- **Latência da venda POI**: ~15–20 queries **sequenciais** numa transação, crescendo
  linearmente com o número de campanhas ativas (cada campanha aplicável = +1 a +3 queries —
  `route.ts:820-940`; `resolveCampaignAudiencesByCampaignId` resolve audiências de todas as
  campanhas a cada venda, `route.ts:1060`).
- **Nenhuma chamada externa bloqueante no hot path**: WhatsApp roda pós-resposta via
  `waitUntil` (`route.ts:958-989`); fiscal não existe no POI e no PDV interno é apenas
  enfileirado (outbox `lib/fiscal/worker.ts` + cron a cada 2 min em `vercel.json`); RFM é
  cron diário (`app/api/cron/rfm-analysis/route.ts`), não recalculado na venda.

**Veredito de latência**: o desenho já protege o consumidor no caixa — o custo é só de
queries Postgres sequenciais, sem I/O externo. Para um terminal físico, o risco não é a
média e sim a cauda: transação longa com muitas campanhas ativas prolonga locks. Duas
otimizações nomeadas caso apareça lentidão real: mover avaliação de campanhas para fora
da transação de venda, e cachear a resolução de audiências.

### 1.3 Camada de API pública / webhooks

**Não existe API externa formal.** Achados:

- Auth de tenant é 100% cookie de sessão (Lucia — `lib/authentication/session.ts`).
  **Não há API key, bearer ou HMAC por tenant/organização.** M2M existente é só segredo
  compartilhado único: `CRON_SECRET` (`lib/cron/assert-cron-authorized.ts:4-14`),
  `INTERNAL_WHATSAPP_GATEWAY_API_SECRET` (`app/api/integrations/whatsapp/gateway/route.ts:99-107`),
  e HMAC de provedores específicos (Stripe, Mux, Nuvemshop).
- **O POI já é, na prática, uma API pública de venda/cashback** keyada apenas por `orgId`
  no body + senha de operador (`new-transaction/route.ts:1011-1021` não checa sessão).
  É o candidato natural para um totem consumir hoje — porém com autenticação fraca demais
  para um produto de terceiros.
- Conectores ERP (Bling, Nuvemshop, iFood, Cardápio Web, Online Software) são **outbound
  polling via cron** a cada 5 min (`app/api/cron/data-collecting/route.ts` +
  `lib/data-connectors/index.ts:13-55`), cada um com mapper específico normalizando para o
  modelo canônico (`lib/data-connectors/types.ts:22-151`). **Não há endpoint genérico de
  ingestão inbound** — um fabricante de totem não tem como "empurrar" vendas hoje.
- Sem rate limiting inbound, sem versionamento (`/v1`), sem OpenAPI. O molde de como o
  time constrói API externa existe em `docs/internal-whatsapp-gateway-api-reference.md`
  (REST + Bearer + webhook de eventos) e o padrão de idempotência existe na loja digital
  (`app/api/shop/[orgId]/orders/route.ts:349-378`, unique index em
  `(organizacaoId, idempotencyKey)` — `services/drizzle/schema/shop.ts:51-61`).

### 1.4 Operação offline / intermitente — **gap crítico confirmado**

- **Zero capacidade offline**: sem service worker, sem PWA/manifest, sem IndexedDB, sem
  fila local (`instrumentation-client.ts:1-6`, `next.config.mjs`, `public/`).
- O totem atual, ao cair a conexão, **bloqueia a venda** com overlay em tela cheia
  (`_shared/providers/connection-status-provider.tsx:148-183`), baseado só em
  `navigator.onLine` (o ping real de internet está como TODO no código, `:56-61`).
- **Sem idempotência no POI**: o input não tem idempotency key e o `idExterno` é gerado
  no servidor com `Date.now()+random` (`new-transaction/route.ts:713`) — **um retry após
  timeout duplica venda, cashback e contadores do cliente**. Qualquer fila offline com
  re-envio é inviável sem resolver isso primeiro.
- Ativos reutilizáveis para construir resiliência: outbox fiscal com backoff exponencial
  (`lib/fiscal/worker.ts:7-14`), reserva atômica da fila de interações
  (`lib/interactions/process-organization-interactions.ts:92-112`), retry/backoff do
  cliente Bling (`lib/data-connectors/bling/client.ts:172-193`) e a idempotência do shop.

### 1.5 Modelo de dados — a venda admite nova origem?

- **Sim, sem reescrita**: `sales.canal` é `text` **nullable e livre**
  (`services/drizzle/schema/sales.ts:49`) — valores hoje: `"POS"`, `"SHOP"`, `"iFood"`,
  `"Bling"`, `"Loja Física"`, `"Importação de planilha"`. Gravar `"AUTOATENDIMENTO"` não
  exige migração. Efeito colateral: canal sem enum central já gera inconsistência de
  rótulos nos relatórios por canal (`app/api/admin/marketing-context/route.ts:399,602`).
  Exceção: `couponRedemptionSourceEnum = ["POS","PONTO_INTERACAO","LOJA_DIGITAL"]`
  (`schema/enums.ts:363`) precisaria de novo valor se o totem resgatar cupom.
- **RFM/stats fluem automaticamente**: as agregações RFM filtram só por
  `organizacaoId + dataVenda + cliente identificado`, sem filtro de canal
  (`app/api/stats/sales-rfm-labelled/route.ts:67-122`). Venda de totem com `clienteId`
  entra no RFM sem qualquer mudança. Venda anônima não contribui (idêntico ao POS atual).
- **Venda sem vendedor humano é possível**: `vendedorId` é nullable (`sales.ts:36`); só
  `vendedorNome` é NOT NULL (`sales.ts:35`) — um rótulo sintético ("Autoatendimento")
  resolve.
- **Não existe conceito de loja/filial/terminal** abaixo da organização. O modelo é
  1 organização = 1 estabelecimento (endereço único em `organizations.ts:23-29`). O único
  gancho é `salesSessions.escopoChave` com comentário explícito "terminal no futuro"
  (`services/drizzle/schema/sales-sessions.ts:30`; decisão em
  `docs/sales-sessions-design.md` §0.1). **Frota de totens distinguíveis e varejo
  multi-loja exigem nova entidade** (`terminals` e/ou `stores`) — é o maior gap de modelo.
- **Produtos**: variantes/add-ons maduros (`products.ts:61-308`), mas **sem campo de
  código de barras/EAN** (só `codigo` SKU genérico, `products.ts:26`) e **sem mercadoria
  por peso** (preço/kg, tara) — `unidade` é texto livre e `saleItems.quantidade` aceita
  fração (`sales.ts:154`), então peso é representável, mas não há fluxo de balança.
- **Risco de double-spend no cashback com terminais concorrentes**: o resgate roda em
  transação, mas sob READ COMMITTED **sem `SELECT FOR UPDATE`** — o saldo materializado é
  lido-modificado-escrito (`lib/cashback/redemption.ts:40-50,116-127`); dois resgates
  simultâneos do mesmo cliente podem ambos passar na checagem. Agravante: o guard que
  deveria falhar quando o FIFO não cobre o valor está **comentado** ("Bypass temporario",
  `redemption.ts:103-114`). Com um único tablet por loja isso é teórico; com múltiplos
  terminais é real. Correção: decremento condicional atômico
  (`SET saldo = saldo - X WHERE saldo >= X`) ou `FOR UPDATE`, e reativação do guard.

### Resumo da prontidão

| Dimensão | Estado | Severidade do gap |
|---|---|---|
| Motor cashback/RFM em tempo real | Pronto; hot path sem I/O externo | — |
| Nova origem de venda no modelo | Pronto (`canal` texto livre) | Baixa |
| Identificação por CPF | Campo existe; lookup não | Média |
| Auth máquina-a-máquina por tenant | Inexistente | **Alta** |
| Idempotência no fluxo de venda POI | Inexistente | **Alta** |
| Identidade de terminal / multi-loja | Inexistente (só gancho `escopoChave`) | **Alta** p/ frota |
| Concorrência de resgate (double-spend) | Vulnerável + guard desativado | **Alta** p/ frota |
| Operação offline | Inexistente (totem bloqueia) | **Alta** — nomeado, não ignorado |
| Pagamento no POI | Inexistente (venda por valor, sem captura) | Média (depende da opção de arquitetura) |
| EAN / pesagem | Inexistentes | Média (por nicho) |

---

## PASSO 2 — Decisão de arquitetura (opções e trade-offs; decisão é sua)

Premissa comum às três opções (o "P0" inegociável, ~2–3 semanas de eng.):
1. **API key por organização** (tabela + hash, molde do gateway WhatsApp) — sem isso,
   nenhum terceiro pode integrar com segurança.
2. **Idempotency key no fluxo de venda POI** (padrão já pronto no shop).
3. **Correção do double-spend de resgate** + reativar guard FIFO.
4. **Lookup por CPF** além de telefone.
Esses quatro itens beneficiam o produto atual mesmo que a frente self-checkout não avance.

### Opção (a) — Módulo interno: self-checkout como novo canal dentro do RecompraCRM

Evoluir o POI kiosk atual para um modo "autoatendimento" completo: catálogo, carrinho,
pagamento (Pix/TEF), identificação por CPF, sem operador.

| Critério | Avaliação |
|---|---|
| Esforço | **Alto** (2–4 meses): remover a dependência de senha de operador, catálogo/carrinho no totem, integração de pagamento presencial (TEF/SmartPOS/Pix — hoje `paymentProvider.processPayments` só existe no PDV interno), NFC-e no fluxo, identidade de terminal, EAN. |
| Acoplamento | **Alto** — tudo dentro do monólito Next/Vercel; a UI do totem herda a mesma pipeline serverless; cauda de latência e indisponibilidade da nuvem viram indisponibilidade do caixa. Offline continua não resolvido (browser + Vercel não dão fila local confiável sem virar PWA séria). |
| Velocidade p/ versão testável | Lenta para autoatendimento real; **rápida** apenas para o cenário "totem de fidelidade ao lado do caixa" (que o POI kiosk já quase faz). |
| Potencial de parceria | **Baixo** — competimos com o software dos fabricantes em vez de complementá-lo. Sweda/Genialtec têm PDV próprio; não vão embarcar nossa UI. |

### Opção (b) — App/agente separado no terminal

Aplicativo próprio (Android/Electron) rodando no hardware do totem, com fila local
(SQLite) e sync com o backend via API — isolado do núcleo.

| Critério | Avaliação |
|---|---|
| Esforço | **Muito alto** (4–6+ meses) e **fora do stack atual**: hoje não existe nenhum app nativo nem experiência de time nisso; suporte a hardware heterogêneo (impressora, scanner, TEF) é um produto em si. |
| Acoplamento | Baixo no núcleo, mas cria uma **segunda base de código** com ciclo de release próprio, atualização remota de dispositivos, observabilidade de campo. |
| Velocidade p/ versão testável | Muito lenta. |
| Potencial de parceria | Ambíguo — resolve offline de verdade, mas continua nos colocando dentro do terminal, território dos fabricantes. |

### Opção (c) — Híbrido: "Conector de Fidelidade" (API/SDK leve) + totem próprio simples

Fase 1: **API pública de fidelidade** para qualquer fabricante integrar (nós não tocamos
o hardware nem a UI do terminal). Três endpoints essenciais, derivados do que já existe:

- `GET /v1/loyalty/identify?cpf|telefone` — evolução do `clients/lookup` (nome, saldo,
  regras do programa, oferta aplicável).
- `POST /v1/loyalty/transactions` — evolução hardening do `new-transaction` (venda +
  acúmulo + resgate, com idempotency key, sem senha de operador, autenticado por API key
  + `terminalId`).
- `GET /v1/loyalty/programs/current` — regras/branding para o terminal exibir.

O fabricante mantém catálogo, carrinho, pagamento, fiscal e **o offline** (todo software
de totem sério já tem contingência local — o problema mais difícil fica com quem já o
resolveu; nossa API só precisa aceitar transações atrasadas com `dataVenda` retroativa e
idempotência, e definir a regra de resgate em contingência: recomendado *acúmulo offline
ok, resgate só online*).

Fase 2 (opcional, validada a demanda): "totem RecompraCRM" para clientes sem
autoatendimento — evolução do POI kiosk atual (que já tem fullscreen, wake-lock, QR e
branding) consumindo a MESMA API pública, começando pelo escopo que o POI já cobre
(identificar + acumular/resgatar), não por carrinho/pagamento.

| Critério | Avaliação |
|---|---|
| Esforço | **Baixo–médio para a Fase 1** (4–7 semanas incluindo o P0): os endpoints são refactors de rotas existentes + camada de auth/idempotência/terminalId + docs OpenAPI + dashboard por terminal. Fase 2 é incremental. |
| Acoplamento | Baixo — a API versionada vira fachada estável sobre os serviços atuais (`accumulateCashbackForClient`, `applyCashbackRedemptionFIFO`, criação de venda), que continuam sendo usados pelo POI/PDV. |
| Velocidade p/ versão testável | **Rápida** — dá para colocar um piloto com 1 fabricante + 1 lojista em ~2 meses. |
| Potencial de parceria | **Alto** — é o único modelo em que Sweda/PDV Smart/Genialtec são canal, não concorrente. "Fidelidade plugável" agrega valor ao hardware deles; a Genialtec inclusive mantém programa formal de parcerias para quiosques/totens. Encaixa no programa `platformPartners` já planejado (`docs/dev-planning/platform-partnerships-plan.md`) para comissionamento de indicações. |
| Risco específico | Dependemos do roadmap do parceiro para a integração acontecer; sem um parceiro assinado, a Fase 1 não tem consumidor. Mitigação: a Fase 2 (nosso kiosk simples) e o próprio POI consomem a mesma API, então o investimento não fica órfão. |

**Observação honesta sobre (a) vs (c)**: a Fase 2 da opção (c) e a opção (a) convergem no
longo prazo. A diferença é a ordem: (c) força a criação da API pública primeiro (ativo
vendável a terceiros), enquanto (a) cria mais superfície interna acoplada antes de gerar
um ativo de parceria.

---

## PASSO 3 — Mapeamento por ICP/nicho

Base: as 20+ páginas de segmento já publicadas (`app/_content/segment-pages.ts`) cobrem
todos os nichos abaixo.

### Food service (restaurantes, padarias, sorveterias, delivery)
- **Jornada**: totem de pedido (não de checkout) — cliente monta o pedido, paga e o
  pedido vai para produção. É o caso mais maduro no Brasil (Copa 2026 acelera) e o dos
  fabricantes Consumer/Genialtec.
- **Já aplicável sem mudança**: identificação por telefone/CPF, acúmulo/resgate por valor,
  campanhas pós-compra, add-ons de produto (`productAddOns`, `products.ts:231-308`) já
  modelam "adicionais" de lanchonete.
- **Adaptação necessária**: integração com o fluxo de pedido do parceiro (KDS/producão é
  deles); cupom no totem exigiria novo valor no `couponRedemptionSourceEnum`.
- **Encaixe**: forte. Melhor nicho para o primeiro piloto.

### Varejo alimentar (supermercado, mercearia, açougue, hortifrúti)
- **Jornada**: self-checkout clássico — scanner de EAN, **pesagem**, antifurto, fiscal
  obrigatório no ato. Identificação por CPF no início ou fim da compra.
- **Já aplicável**: identificação + acúmulo/resgate por valor total; RFM flui normal.
- **Adaptação necessária**: EAN (campo novo) e peso variável (preço/kg/tara) **se**
  formos o software do carrinho — na opção (c) Fase 1, o parceiro cuida disso e nós só
  recebemos o valor final + itens opcionais, o que elimina o gap para o piloto.
- **Encaixe**: forte via parceiro; fraco como totem próprio (não construir carrinho de
  supermercado).

### Moda (roupas, calçados, joalheria, ótica)
- **Jornada**: self-checkout é raro e de baixo valor — a compra é assistida (provador,
  troca, tamanho). O terminal que faz sentido é **totem de fidelidade/consulta**:
  identificar-se, ver saldo, resgatar na frente do vendedor — exatamente o POI atual.
- **Já aplicável**: tudo do POI; variantes Tamanho×Cor já modeladas
  (`docs/dev-planning/variant-modeling-improvements.md`).
- **Gap honesto**: **self-checkout transacional não faz sentido aqui — não forçar.**
  Posicionar como "ponto de fidelidade", não como caixa.

### Varejo multi-loja (redes, franquias)
- **Jornada**: qualquer uma das acima × N lojas; o gestor precisa comparar terminais e
  unidades.
- **Gap estrutural**: **não existe entidade loja/filial nem terminal** no modelo
  (`sales-sessions.ts:30` é só um gancho). Sem `terminals`/`stores`, não há relatório por
  unidade nem atribuição de venda a um totem específico.
- **Decisão embutida**: a entidade `terminals` (id, org, apelido, loja futura, API key
  escopada) é pré-requisito de qualquer opção do Passo 2 e é o primeiro passo concreto na
  direção multi-loja — vale desenhá-la já pensando em ganhar `storeId` depois.
- **Encaixe**: é onde o self-checkout com fidelidade tem mais valor comercial (padroniza
  fidelização na rede), mas é o que mais exige do modelo de dados. Não prometer antes de
  `terminals` existir.

### Nichos onde não forçar
Moda/joalheria/ótica (acima) para checkout transacional; serviços (pet banho/tosa,
farmácia com receita) onde o atendimento humano é obrigatório por natureza ou regulação.

---

## PASSO 4 — Setup, experiência do totem e dashboard (esboço, não implementar)

### 4.1 Fluxo de setup do lojista (admin da organização)
Pré-requisitos já existentes: programa de cashback configurado
(`cashbackPrograms` — acúmulo FIXO/PERCENTUAL, mínimo, expiração, cap de resgate,
`cashback-programs.ts:20-45`), flag `acumuloPermitirViaPontoIntegracao` (`:39`), branding
(cores + logo) e QR kiosk (`organizations.ts:349-350`).

O que precisaria existir:
1. **Cadastro de terminal**: criar terminal → recebe nome ("Totem entrada"), API key /
   token de pareamento (QR de pareamento, molde do `poiQrCodeKioskDataUrl`).
2. **Política de identificação**: telefone e/ou CPF; obrigatória ou opcional; momento
   (início vs antes de pagar).
3. **Política de resgate no totem**: permitir resgate sem operador? cap específico do
   canal (hoje o cap é global do programa)? resgate bloqueado em contingência offline?
4. **Elegibilidade**: reutilizar o gate de recursos existente
   (`OrganizationConfigurationSchema.recursos`, `schemas/organizations.ts:125+`, padrão
   `erp.acesso`) com um bloco `autoatendimento.acesso` — plano/upsell controlável.
5. Para integração de fabricante: tela "Integrações → Autoatendimento" com API key,
   webhook de eventos (opcional) e link para docs públicas (OpenAPI) — hoje inexistentes.

### 4.2 O que o cliente precisa ver no terminal (mesmo em UI do parceiro)
Mínimo contratual de marca/fidelidade (entra na spec da API e no manual do parceiro):
- Logo + cores da loja (a API `programs/current` entrega o branding já armazenado).
- No momento da identificação: "Olá, {nome} — você tem R$ X de cashback" (payload do
  lookup já retorna isso hoje — `clients/lookup/route.ts:33-105`).
- No pagamento: valor do resgate aplicado + quanto vai acumular com esta compra
  ("Você está ganhando R$ Y para a próxima compra") — é o momento que planta a recompra.
- No comprovante/tela final: saldo novo + validade do cashback (o dado de expiração
  existe: `expiracaoRegraValidadeValor`).
- Cadastro relâmpago para não identificado: telefone → opt-in LGPD (aproveitar o
  trabalho de LGPD recém-implementado no repo).

### 4.3 Dashboard interno
Sim — o gestor precisa enxergar por terminal, e hoje isso é impossível (não há
`terminalId`). Com a entidade criada:
- Vendas, ticket médio, taxa de identificação (% de vendas com cliente identificado — a
  métrica-mãe do produto neste canal), cashback acumulado/resgatado por terminal.
- Comparativo canal autoatendimento vs balcão (o `sales.canal` já permite o corte
  agregado; o corte por terminal exige a FK nova).
- Alerta de terminal silencioso (sem transações há X horas — proxy de terminal
  caído/offline).
Reaproveitar o padrão de stats existente (`lib/queries/stats/*`, agregação on-read).

---

## PASSO 5 — Integração com o go-to-market

### 5.1 Parcerias com fabricantes
Candidatos identificados em pesquisa (mercado ~11-13% a.a., preferência do consumidor
63-70%):
- **Sweda** — 90+ anos em automação comercial; linha de totens Jaspe, Citrino e Onix
  Kiosk; já vende "integração nativa" PDV↔totem↔KDS. Parceiro de maior alcance no varejo
  tradicional.
- **Genialtec** — referência em terminais de autoatendimento (linha GT Market) e mantém
  **programa formal de parcerias para quiosques/totens** — porta de entrada natural.
- **PDV Smart** — publica ativamente sobre self-checkout no Brasil; perfil mais SMB/food.
- **Consumer** — forte em totens para restaurantes (food service).
Critério de escolha do primeiro: quem tem programa de parceria aberto + clientes no nicho
do piloto (food service) + roadmap de API aberto. Comercialmente, encaixar fabricantes no
programa `platformPartners` já desenhado (`docs/dev-planning/platform-partnerships-plan.md`:
código de indicação, comissão sobre invoices) — o fabricante indica lojistas e ganha
recorrência; nós não pagamos por hardware.

### 5.2 Prospecção ativa (porta a porta / televendas)
Duas mensagens distintas — não misturar:
- **Upsell para a base atual**: "seu Ponto de Interação vira autoatendimento" — clientes
  que já usam POI/cashback entendem em uma frase. Baixo custo de venda; bom para o piloto.
- **Gancho para prospects que JÁ têm totem**: "seu totem vende; ele fideliza? Plugamos
  cashback e recompra automática no equipamento que você já tem — sem trocar de sistema."
  Este é o discurso novo que a API pública habilita, e é o mais forte para abrir portas em
  quem já investiu em hardware e não quer trocá-lo.

### 5.3 SEO/Search — estender a infra existente, não recomeçar
A infraestrutura já está pronta: `app/_content/{segment,feature,integration}-pages.ts` +
blog alimentando `app/sitemap.ts`. Ações incrementais:
- **Nova feature page**: `features/self-checkout-fidelidade` (ou
  `totem-de-autoatendimento`) — hoje só existem 4 feature pages (`programa-de-cashback`,
  `campanhas-whatsapp`, `ponto-de-interacao`, `business-intelligence`); esta seria a 5ª e
  deve cruzar links com `ponto-de-interacao`.
- **Integration pages por fabricante** (`integrations/sweda`, `integrations/genialtec`,
  `integrations/pdv-smart`) — espelho do padrão Bling/Nuvemshop existente. Publicar
  somente quando a integração/parceria existir de fato, para não queimar credibilidade.
- **Termos-alvo**: "totem de autoatendimento com fidelidade", "self-checkout com
  cashback", "programa de fidelidade para totem", "autoatendimento restaurante cashback",
  "self-checkout supermercado CPF desconto".
- **Blog**: 2–3 posts ("Self-checkout e fidelização: por que o totem precisa reconhecer o
  cliente", "Copa 2026 e o autoatendimento no food service") com link para a feature page.
- **Cross-link nos segmentos**: blocos de autoatendimento nas segment pages de
  restaurantes/supermercado (onde o encaixe é real), não em moda.

### 5.4 Posicionamento — a mensagem "dobra a venda e a recompra automática"
Avaliação honesta: **hoje não sustentamos "dobra a venda"**.
- O que o produto entrega de verdade neste canal: identificação do cliente + cashback no
  momento da compra + campanhas automáticas que trazem o cliente de volta. Ou seja,
  sustentamos a **segunda metade** da promessa (recompra automática) — e mesmo essa ainda
  sem número público de "2x" (o funil de conversão de campanhas existe na plataforma, mas
  não temos estudo de caso consolidado de recompra em autoatendimento, porque o canal não
  existe ainda).
- "Dobra a venda" (a primeira metade) é efeito do self-checkout em si (menos fila, mais
  giro — benefício do hardware do parceiro), não do RecompraCRM. Reivindicar isso é se
  apropriar do valor do fabricante e cria promessa que não controlamos.
- Mensagem defensável hoje: **"Seu totem vende. O RecompraCRM faz o cliente voltar."**
  (variação: "Todo checkout vira a próxima venda"). Após o piloto, com dados reais de taxa
  de identificação e recompra em 30/60/90 dias, aí sim testar claims quantitativos —
  condicionados a caso real, não a projeção.

---

## PASSO 6 — Riscos e o que NÃO fazer agora

### Riscos
1. **Técnico — segurança do dinheiro**: double-spend de resgate sob concorrência
   (`redemption.ts:40-127`) + guard FIFO desativado (`:103-114`) + POI sem idempotência
   (`new-transaction/route.ts:713`) + endpoint público keyado só por `orgId`. Cashback é
   passivo financeiro; expor a terceiros sem corrigir isso é risco direto de fraude/perda.
   **Bloqueante para qualquer opção.**
2. **Técnico — offline**: nomeado e não resolvido. Na opção (c) Fase 1 ele é transferido
   ao parceiro (que já o resolve), mas precisa estar **explícito na spec da API**
   (transações retroativas idempotentes; resgate só online). Num totem próprio (a/b), é um
   projeto inteiro.
3. **Técnico — modelo**: sem `terminals`/`stores`, qualquer promessa a redes multi-loja é
   prematura.
4. **Comercial**: dependência do roadmap do fabricante (integração pode levar trimestres);
   risco de o fabricante copiar a feature (mitigação: nosso valor é o motor RFM/campanhas
   /WhatsApp acumulado, não o endpoint); mercado de food service já tem players de
   fidelidade acoplados a totem — validar diferenciação antes de investir em marketing.
5. **Foco**: há frentes grandes em andamento no repo (módulo fiscal em review, loja
   digital, parcerias de plataforma, LGPD recém-entregue). Uma quarta frente simultânea
   de 3+ meses (opções a/b) colocaria todas em risco. A Fase 1 da opção (c) é a única com
   escopo compatível com o momento.

### O que NÃO fazer agora
- Não construir hardware nem app nativo de terminal (opção b) — fora do stack e do foco.
- Não construir carrinho/pesagem/EAN de supermercado — é o software do parceiro.
- Não publicar integration pages de fabricantes antes de parceria assinada.
- Não usar o claim "dobra a venda" antes de dados de piloto.
- Não prometer multi-loja/frota antes da entidade `terminals` existir.

### Recomendação
**Vale começar, com piloto pequeno no formato da opção (c) Fase 1**, condicionado a uma
validação comercial ANTES do código: 2–4 conversas (1 fabricante com programa de parceria
— Genialtec é o alvo mais acessível; 1–2 clientes atuais de food service interessados em
totem; 1 prospect que já tem totem sem fidelidade). Se houver um fabricante disposto a
integrar OU um lojista com totem instalado disposto a pilotar:

1. **Semanas 1–3 (P0, valor independente do piloto)**: API key por organização,
   idempotência no POI, correção do double-spend + guard FIFO, lookup por CPF.
2. **Semanas 3–7**: entidade `terminals`, endpoints `/v1/loyalty/*` (fachada sobre os
   serviços atuais), OpenAPI + guia do integrador, corte por terminal no dashboard.
3. **Piloto (60–90 dias)**: 1 fabricante + 1–3 lojas de food service; métricas de
   sucesso: taxa de identificação no totem (>30% já valida), recompra em 30/60 dias dos
   identificados vs não identificados, incidentes de duplicidade/fraude = 0.
4. Só depois: Fase 2 (totem próprio simples sobre o POI kiosk), multi-loja, claims de
   marketing quantitativos.

Se a validação comercial não encontrar nem fabricante nem lojista com totem em 30 dias,
executar apenas o item 1 (P0 — que endurece o produto atual de qualquer forma) e adiar o
restante — o mercado cresce 11–13% a.a.; chegar 2 meses "atrasado" com parceiro assinado
vale mais que chegar antes sem consumidor para a API.

### O que ainda não sabemos (validar com cliente antes de codar)
- O fabricante aceita chamar nossa API na tela de pagamento, ou exige SDK embarcado?
- O lojista quer resgate no totem sem operador (risco de fraude) ou só acúmulo?
- Identificação preferida do consumidor no totem: CPF (padrão de mercado) vs telefone
  (padrão do nosso POI)?
- Qual o SLA de latência que o software do fabricante tolera na tela de checkout?
- Em contingência offline do totem, o lojista aceita perder o acúmulo ou exige
  reconciliação posterior (e com que prazo)?

---

## Fontes de mercado
- [Sweda — O que é totem de autoatendimento](https://sweda.com.br/blog/automacao-comercial/o-que-e-totem-de-autoatendimento/)
- [Sweda — Solução Totem Auto Atendimento](https://sweda.com.br/solucoes/solucao-totem-auto-atendimento/)
- [Genialtec — Terminais de autoatendimento](https://www.genialtec.com.br/aplicacoes-terminais-autoatendimento.html)
- [Genialtec — Programa de parcerias para quiosques/totens](https://www.genialtec.com.br/parceria-quiosques-totens-autoatendimento.html)
- [PDV Smart — Self Checkout no Brasil](https://pdvsmart.site/blog/self-checkout-autoatendimento-brasil)
- [E-Commerce Brasil — O futuro do self-checkout no varejo brasileiro](https://www.ecommercebrasil.com.br/artigos/o-futuro-do-self-checkout-no-varejo-brasileiro)
- [SuperVarejo — 63% dos consumidores preferem self-checkout](https://www.supervarejo.com.br/tecnologia/cerca-de-63-dos-consumidores-preferem-passar-por-self-checkouts)
- [Consumer — Autoatendimento para restaurantes](https://consumer.com.br/autoatendimento)
- [Varejo S.A (CNDL) — Self-checkout como pilar estratégico](https://cndl.org.br/varejosa/autonomia-e-agilidade-para-o-cliente-o-self-checkout-como-pilar-estrategico-do-varejo-moderno/)
