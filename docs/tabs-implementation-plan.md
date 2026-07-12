# Tabs Implementation Plan

Plano de implementacao detalhado do modelo definido em `interaction-points-and-tabs-design.md` (pontos de interacao + contas de atendimento), incorporando duas decisoes tomadas apos o design:

1. **Baixa fisica de estoque no evento fisico** — a entrega de cada pedido (`tabOrder`) baixa os itens daquele pedido, nao o fechamento da conta. Isso alinha a comanda com o comportamento que a plataforma ja tem para vendas confirmadas: `processSaleAttendanceStatusChange` ja baixa estoque na transicao que exige saida fisica (`attendanceStatusRequiresPhysicalOut`), e a confirmacao so baixa quando a venda nasce `ENTREGUE` (balcao).
2. **Itens com producao (pratos)** baixam estoque **por composicao** (explosao da ficha tecnica), sem criar ordem de producao por prato. Ver secao "Producao".

## Visao geral do fluxo

```txt
abrir conta (tab ABERTA, com ou sem ponto)
  -> lancar pedido 1 (cria venda rascunho + tabOrder 1 + itens)
       -> cozinha: tabOrder EM_PREPARO -> PRONTO -> ENTREGUE  [baixa fisica dos itens do pedido]
  -> lancar pedido 2 (apenda itens na mesma venda rascunho + tabOrder 2)
       -> ...
  -> fechar conta (checkout):
       - baixa o que ainda nao foi entregue (delta por item)
       - metodos de pagamento reais (1..N transacoes)
       - confirma a venda rascunho: contabil + financeiro efetivado + fiscal, vinculado ao turno de caixa
       - tab FECHADA com snapshot de valorTotal
```

Nenhum efeito de ERP acontece antes do fechamento, exceto a baixa fisica de estoque — que reflete um fato fisico (o produto saiu), nao um fato comercial.

## 1. Schema

### 1.1 Enums

`services/drizzle/schema/enums.ts`:

```ts
export const tabStatusEnum = pgEnum("tab_status", ["ABERTA", "FECHADA", "CANCELADA"]);

// Como a venda de um produto baixa estoque:
// ESTOQUE_PROPRIO — baixa o saldo do proprio produto/variante (comportamento atual);
// COMPOSICAO — explode a ficha tecnica e baixa os insumos (pratos, drinks, lanches).
export const productStockDeductionModeEnum = pgEnum("product_stock_deduction_mode", ["ESTOQUE_PROPRIO", "COMPOSICAO"]);
```

`poiTransactionRequestTypeEnum` ganha o valor `"ABERTURA_TAB"`.

Espelhos Zod em `schemas/enums.ts` (`TabStatusEnum`/`TTabStatusEnum` etc.), com `required_error`/`invalid_type_error`, seguindo a convencao.

Pedidos (`tabOrders`) **reusam** `saleAttendanceStatusEnum` e os helpers de `lib/sales/sale-processing/attendance.ts` (`isValidAttendanceTransition`, `attendanceStatusRequiresPhysicalOut`) — mesmas transicoes ja validadas.

### 1.2 `services/drizzle/schema/interaction-points.ts`

```ts
export const interactionPoints = newTable(
  "interaction_points",
  {
    id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizacaoId: varchar("organizacao_id", { length: 255 })
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    rotulo: text("rotulo").notNull(),                    // "Mesa 12"
    grupo: text("grupo"),                                // "Salao", "Varanda"
    categoria: text("categoria"),                        // "MESA", "QUARTO"... texto livre normalizado
    capacidade: doublePrecision("capacidade"),
    tokenPublico: varchar("token_publico", { length: 255 }).notNull(),
    ativo: boolean("ativo").default(true).notNull(),
    metadados: jsonb("metadados"),
    dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
  },
  (table) => ({
    organizacaoAtivoIdx: index("idx_interaction_points_org_ativo").on(table.organizacaoId, table.ativo),
    tokenPublicoIdx: uniqueIndex("idx_interaction_points_token_publico").on(table.tokenPublico),
  }),
);
```

Relations: `organizacao`, `tabs: many(tabs)`. Exportar `TInteractionPointEntity`/`TNewInteractionPointEntity` e barrel-export em `schema/index.ts`.

### 1.3 `services/drizzle/schema/tabs.ts`

```ts
export const tabs = newTable(
  "tabs",
  {
    id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizacaoId: varchar("organizacao_id", { length: 255 })
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    pontoInteracaoId: varchar("ponto_interacao_id", { length: 255 }).references(() => interactionPoints.id, { onDelete: "set null" }),
    codigo: text("codigo").notNull(),                    // numero da comanda fisica/pulseira
    clienteId: varchar("cliente_id", { length: 255 }).references(() => clients.id, { onDelete: "set null" }),
    status: tabStatusEnum("status").notNull().default("ABERTA"),
    tokenPublico: varchar("token_publico", { length: 255 }).notNull(),
    responsavelVendedorId: varchar("responsavel_vendedor_id", { length: 255 }).references(() => sellers.id, { onDelete: "set null" }),
    abertaPorUsuarioId: varchar("aberta_por_usuario_id", { length: 255 }).references(() => users.id, { onDelete: "set null" }),
    fechadaPorUsuarioId: varchar("fechada_por_usuario_id", { length: 255 }).references(() => users.id, { onDelete: "set null" }),
    valorTotal: doublePrecision("valor_total"),          // snapshot congelado no fechamento
    observacoes: text("observacoes"),
    metadados: jsonb("metadados"),
    dataAbertura: timestamp("data_abertura").defaultNow().notNull(),
    dataFechamento: timestamp("data_fechamento"),
    dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
  },
  (table) => ({
    orgStatusIdx: index("idx_tabs_org_status").on(table.organizacaoId, table.status),
    pontoIdx: index("idx_tabs_ponto").on(table.pontoInteracaoId),
    tokenPublicoIdx: uniqueIndex("idx_tabs_token_publico").on(table.tokenPublico),
    // Impede duas comandas fisicas com o mesmo codigo abertas ao mesmo tempo; libera reuso apos fechar.
    codigoAbertaIdx: uniqueIndex("idx_tabs_org_codigo_aberta")
      .on(table.organizacaoId, table.codigo)
      .where(sql`status = 'ABERTA'`),
  }),
);

export const tabOrders = newTable(
  "tab_orders",
  {
    id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizacaoId: varchar("organizacao_id", { length: 255 })
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    tabId: varchar("tab_id", { length: 255 })
      .references(() => tabs.id, { onDelete: "cascade" })
      .notNull(),
    numero: doublePrecision("numero").notNull(),          // sequencial dentro da conta
    status: saleAttendanceStatusEnum("status").notNull().default("EM_PREPARO"),
    observacoes: text("observacoes"),                     // "sem cebola", nome da pessoa da rodada
    lancadoPorUsuarioId: varchar("lancado_por_usuario_id", { length: 255 }).references(() => users.id, { onDelete: "set null" }),
    dataEnvio: timestamp("data_envio").defaultNow().notNull(),
    dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
  },
  (table) => ({
    tabIdx: index("idx_tab_orders_tab").on(table.tabId),
    orgStatusIdx: index("idx_tab_orders_org_status").on(table.organizacaoId, table.status),
  }),
);
```

Relations: `tabs` -> `pontoInteracao`, `cliente`, `responsavelVendedor`, `abertaPorUsuario`/`fechadaPorUsuario` (com `relationName`, padrao `salesSessions`), `vendas: many(sales)`, `pedidos: many(tabOrders)`. `tabOrders` -> `tab`, `itens: many(saleItems)`.

### 1.4 Alteracoes em `sales.ts`

```ts
// sales
tabId: varchar("tab_id", { length: 255 }).references(() => tabs.id, { onDelete: "set null" }),

// index: uma unica venda em rascunho por conta; 1:N estrutural para fechamento parcial futuro
tabRascunhoIdx: uniqueIndex("idx_sales_tab_rascunho")
  .on(table.tabId)
  .where(sql`status_venda = 'ORCAMENTO' AND tab_id IS NOT NULL`),

// saleItems
tabOrderId: varchar("tab_order_id", { length: 255 }).references(() => tabOrders.id, { onDelete: "set null" }),
// index: idx_sale_items_tab_order (tabOrderId)
```

Ao vincular uma venda a uma tab, denormalizar `tab.codigo` em `sales.comandaNumero` (snapshot legado, relatorios existentes continuam funcionando).

### 1.5 Alteracoes em `products.ts`

```ts
// products (e espelho em productVariants para override por variante — fase 2)
baixaEstoqueModo: productStockDeductionModeEnum("baixa_estoque_modo").default("ESTOQUE_PROPRIO").notNull(),
fichaTecnicaReceitaId: varchar("ficha_tecnica_receita_id", { length: 255 }), // FK para productionRecipes
```

Atencao a ciclo de import: `productions.ts` ja importa `products.ts`. Declarar a coluna sem `.references()` no Drizzle e criar a FK na migracao SQL (ou mover a relation para `productionsRelations`), evitando import circular.

### 1.6 Alteracoes em `poi-transaction-requests.ts`

```ts
pontoInteracaoId: varchar("ponto_interacao_id", { length: 255 }).references(() => interactionPoints.id, { onDelete: "set null" }),
tabId: varchar("tab_id", { length: 255 }).references(() => tabs.id, { onDelete: "set null" }),
```

### 1.7 Migracao

Uma migracao Drizzle com: os dois enums novos + valor novo no enum de POI request; tabelas `interaction_points`, `tabs`, `tab_orders`; colunas novas em `sales`, `sale_items`, `products`, `poi_transaction_requests`; indexes (incluindo os parciais via SQL). Sem backfill — contas passam a existir apenas para operacoes novas.

## 2. Services (`lib/tabs/`)

Todos os services seguem o padrao existente: funcao pura recebendo `input` tipado (+ `organization`/`session` quando preciso), sem `NextRequest`/`NextResponse`, trabalho em `db.transaction` quando ha multiplas escritas.

### 2.1 `open-tab.ts`

- valida codigo nao vazio; o partial unique de `codigo` aberto garante unicidade (traduzir violacao para erro amigavel);
- gera `tokenPublico` (mesmo gerador usado em `poiTransactionRequests`);
- nao cria venda — a venda rascunho e lazy no primeiro pedido.

### 2.2 `launch-tab-order.ts`

Em transacao:

1. carrega a tab com lock logico (`status = "ABERTA"`, senao 400 "Conta nao esta aberta.");
2. resolve a venda rascunho da tab (`sales WHERE tabId = X AND statusVenda = 'ORCAMENTO'`); se nao existe, cria com `statusVenda = "ORCAMENTO"`, `entregaModalidade = "COMANDA"`, `comandaNumero = tab.codigo`, `clienteId = tab.clienteId`, vendedor = responsavel da tab;
3. cria o `tabOrder` com `numero = max(numero) + 1` da conta e `status = "EM_PREPARO"` (ou `NAO_INICIADO`, decisao de UI);
4. insere os `saleItems` (com `adicionais`) apontando `vendaId` (rascunho) e `tabOrderId`, reusando a logica de precificacao/validacao do fluxo de venda atual;
5. recalcula `valorTotal`/`custoTotal`/`descontosTotal` da venda rascunho.

### 2.3 `process-tab-order-status-change.ts`

Espelho de `processSaleAttendanceStatusChange`, no grao do pedido. Diferencas deliberadas:

- **sem gate de pagamento**: pedido de comanda e entregue sem estar pago — o pagamento e no fechamento da conta. O gate "Confirme o pagamento antes de entregar" pertence ao fluxo de venda confirmada e nao se aplica aqui;
- **sem efeitos pos-entrega**: nao dispara fiscal nem cashback por pedido — ambos acontecem no fechamento da conta;
- **baixa fisica por pedido**: na transicao para status com `attendanceStatusRequiresPhysicalOut` (ENTREGUE/PARCIALMENTE_ENTREGUE), baixa apenas os itens do pedido (`saleItems WHERE tabOrderId = X`), respeitando `organization.configuracao.preferencias.rastreamentoEstoque` e `rastreamentoEstoqueAtivo` do produto/variante;
- atualiza `quantidadeEntregue` dos itens do pedido (base do controle de deduplicacao — ver 2.4);
- valida transicao com o mesmo `isValidAttendanceTransition`.

### 2.4 Refactor de `processStockDeduction`: baixa por delta e por composicao

Hoje a funcao baixa `item.quantidade` inteiro e a deduplicacao e por venda (existe alguma `SAIDA` da venda?). Com baixa por pedido isso quebra: pedidos diferentes da mesma venda rascunho baixam em momentos diferentes, e o fechamento precisa baixar so o que falta.

Mudancas:

1. **Delta por item**: a quantidade a baixar de cada item passa a ser `item.quantidade - item.quantidadeEntregue` (nunca negativo). A funcao atualiza `quantidadeEntregue` junto com a baixa, na mesma transacao. A deduplicacao por venda em `processSaleAttendanceStatusChange` pode ser substituida pelo delta — vendas ja entregues tem delta zero — mantendo o comportamento atual para vendas comuns;
2. **Modo de baixa por produto**:
   - `ESTOQUE_PROPRIO`: comportamento atual (FEFO em lotes via `consumeStockLotsByFefo` + `applyStockMovement` do restante);
   - `COMPOSICAO`: carrega a ficha tecnica (`productionRecipes` + `productionRecipeInputs` via `fichaTecnicaReceitaId`), e baixa cada insumo em `deltaQuantidade * insumo.quantidade`, com FEFO, mantendo `links: { vendaId, vendaItemId }` para rastreabilidade. O produto composto em si nao gera movimentacao;
   - produto `COMPOSICAO` sem ficha tecnica ativa: nao baixa nada e nao bloqueia a venda (log/telemetria; consistente com "progressive disclosure" do restante do ERP);
3. **Adicionais**: inalterados — ja baixam o produto vinculado a opcao com `quantidadeConsumo`. Aplicar o mesmo delta (adicional acompanha o item do pedido).

### 2.5 `close-tab.ts`

Em transacao (+ pos-commit):

1. tab `ABERTA` com venda rascunho (conta sem consumo pode ser fechada direto como `CANCELADA` ou fechada vazia — decisao de UX; recomendado: fechar conta vazia vira cancelamento);
2. pedidos ainda ativos (`EM_PREPARO`/`PRONTO`): bloquear com 400 ("Existem pedidos em andamento.") — o operador resolve cada pedido (entregar ou cancelar) antes de fechar. Evita fechar conta com cozinha pendente;
3. baixa fisica do delta remanescente de todos os itens (itens nunca entregues, ex. pedido entregue sem transicao registrada) via `processStockDeduction` — com o delta por item, isso e idempotente;
4. confirma a venda rascunho via `processSaleConfirmationInTransaction` com `initialAttendanceStatus: "ENTREGUE"`, `salePayments` = metodos reais informados (1..N pagamentos, divisao entre pessoas = multiplas transacoes ja suportadas pelo fluxo), `sessaoVendaId` = turno de caixa aberto do operador (mesma resolucao do POS), `dataVenda = now` (ja e o comportamento da confirmacao). A baixa embutida da confirmacao para vendas nascendo `ENTREGUE` se torna no-op pelo delta por item;
5. atualiza a tab: `status = "FECHADA"`, `valorTotal` congelado, `fechadaPorUsuarioId`, `dataFechamento`;
6. pos-commit: `processSaleConfirmationPostCommit` (emissao fiscal automatica conforme configuracao). Cashback segue o fluxo existente de venda nascida `ENTREGUE`.

Concorrencia: o update da tab usa `WHERE status = 'ABERTA'` como guarda otimista — dois fechamentos simultaneos, um falha.

### 2.6 `cancel-tab-order.ts` / `cancel-tab.ts`

- **pedido nao entregue**: `tabOrder.status -> CANCELADO`; itens do pedido marcam `quantidadeCancelada = quantidade` e sao excluidos do recalculo de totais da venda rascunho (ou removidos fisicamente — recomendado marcar, preservando historico do que foi pedido);
- **pedido ja entregue**: cancelamento vira estorno explicito — alem do acima, gerar movimentacao de `ENTRADA` (devolucao) ou registrar perda como ajuste, conforme escolha do operador. v1 pode aceitar apenas "devolucao ao estoque" e deixar perda para ajuste manual;
- **conta**: cancela todos os pedidos ativos, venda rascunho -> `statusVenda = "CANCELADA"`, tab -> `CANCELADA`. Se houve itens entregues, exigir confirmacao explicita do operador (consumo ja aconteceu; movimentacoes de estoque permanecem como registro fisico honesto).

## 3. Producao: itens que exigem preparo (pratos)

O codebase ja tem um modulo de producao completo: `productionRecipes` (insumos + saidas), `productions` com `origem: MANUAL | PEDIDO | AGENDADA`, status proprio, e links `vendaId`/`vendaItemId` ja previstos. A pergunta e qual grao usar para o prato do dia a dia. Tres mecanismos, cada um com seu caso:

| Mecanismo | Caso | Estado |
| --- | --- | --- |
| Baixa por composicao (ficha tecnica) | Prato/drink feito na hora, alto volume | **Novo — e a resposta para o prato** |
| Producao em lote (`MANUAL`/`AGENDADA`) | Pre-preparo: molhos, porcoes, massas | Ja existe |
| Producao sob demanda (`origem = "PEDIDO"`) | Encomenda com lead time (bolo, evento) | Enum previsto, fiacao futura |

### 3.1 Prato a la minute: composicao, nao ordem de producao

**Nao** criar uma `production` por prato vendido. Num restaurante de movimento medio isso geraria dezenas/centenas de ordens de producao por noite sem nenhum valor operacional: o ticket da cozinha ja existe (`tabOrder` com status `EM_PREPARO -> PRONTO`), e a verdade de estoque e capturada pela explosao da ficha tecnica na baixa (secao 2.4). A ordem de producao viraria burocracia duplicando o `tabOrder`.

O prato entao e um produto com:

- `baixaEstoqueModo = "COMPOSICAO"`;
- `fichaTecnicaReceitaId` apontando a receita cujos `productionRecipeInputs` sao os insumos (100g de queijo, 1 pao, 150g de carne...).

Quando o pedido e entregue (evento fisico), os **insumos** baixam por FEFO — inclusive consumindo lotes com validade produzidos no pre-preparo. O prato em si nunca tem saldo de estoque.

Custo: como evolucao, o `valorCustoUnitario` do item pode ser derivado do custo dos insumos da ficha tecnica no momento da venda, em vez do custo cadastrado do produto. Nao bloqueia a v1.

### 3.2 Pre-preparo: o modulo existente resolve

A cozinha real trabalha em dois niveis: de manha produz-se em lote (molho, feijoada, porcoes embaladas) e no servico consome-se o pre-preparado. O primeiro nivel **ja e** o modulo `productions` com `origem = "MANUAL"`/`"AGENDADA"`: consome insumos crus e da entrada nos intermediarios como lotes com validade (`productionOutputs.dataValidade` + consumo FEFO ja implementado).

A ficha tecnica do prato entao referencia o **intermediario** (ex.: "300g de molho da casa"), nao os ingredientes crus dele. Os dois niveis se compoem sem nenhuma tabela nova.

### 3.3 Producao sob demanda (`origem = "PEDIDO"`): reservar para encomendas

Para itens com lead time real e acompanhamento individual (bolo sob encomenda, kit de evento), ai sim uma ordem de producao por item de venda faz sentido: lancar o item cria uma `production` com `vendaId`/`vendaItemId`, e o fulfillment aguarda `CONCLUIDA`. Os campos ja existem; a fiacao (flag por produto "sob encomenda" + criacao automatica + gate no fulfillment) fica **fora do escopo** desta implementacao — e uma fase propria, e nao e necessaria para comanda/mesa.

## 4. APIs (App Router)

Todas seguindo o padrao quatro partes (schema de input, service, handler, `appApiHandler`), mensagens em portugues, resposta `{ data, message }`:

| Rota | Metodos | Observacoes |
| --- | --- | --- |
| `app/api/interaction-points/route.ts` | GET (multi-mode `byId`/`default`), POST, PUT | CRUD de pontos; DELETE logico via `ativo` |
| `app/api/tabs/route.ts` | GET (multi-mode: `byId` com pedidos+itens+totais derivados; `default` = board de contas abertas com filtros `status`, `pontoInteracaoId`), POST (abrir conta) | `TGetTabsInput`, `TCreateTabInput`... |
| `app/api/tabs/orders/route.ts` | POST (lancar pedido: itens + observacoes) | payload aninhado, padrao create/update existente |
| `app/api/tabs/orders/status/route.ts` | POST (transicao de status do pedido) | espelha `app/api/pos/sales/attendance-status` |
| `app/api/tabs/close/route.ts` | POST (fechar conta: `salePayments`, `sessaoVendaId` resolvido como no POS) | |
| `app/api/tabs/cancel/route.ts` | POST (cancelar conta ou pedido, com flag de tratamento de estoque p/ entregues) | |
| `app/api/sales/fulfillment/route.ts` | GET (existente) | adicionar segunda fonte de cards a partir de `tabOrders` ativos (`map-tab-order-to-fulfillment-card.ts`) |

Paginas externas (QR), seguindo o padrao do playbook de POI (`tokenPublico` opaco, sem autenticacao, acao sensivel via `poiTransactionRequest`):

- `app/(external)/poi/[token]/` — resolve ponto: mostra conta(s) aberta(s) ou CTA "abrir conta" (cria request `ABERTURA_TAB` pendente de aprovacao);
- `app/(external)/tab/[token]/` — resolve tab: extrato da conta em andamento (pedidos, itens, total parcial).

## 5. Client (queries, mutations, state, UI)

- `lib/queries/tabs.ts` — `useTabs` (board, com `params`/`debouncedParams`), `useTabById`, `useInteractionPoints`;
- `lib/mutations/tabs.ts` — `createTab`, `createTabOrder`, `updateTabOrderStatus`, `closeTab`, `cancelTab`, wrappers Axios finos tipados pelos outputs das rotas;
- `state-hooks/use-internal-interaction-point-state.tsx` e `use-internal-tab-state.tsx` — padrao existente (`updateX`, `redefineState`, soft-delete de filhos);
- Modais em `components/Modals/Internal/Tabs/` e `.../InteractionPoints/` — `NewInteractionPoint`/`ControlInteractionPoint`, `NewTab` (abrir conta: codigo, ponto, cliente, responsavel);
- Board operacional em `app/dashboard/commercial/tabs/` — dois eixos: contas abertas (cards com ponto, codigo, total parcial derivado, idade) e ocupacao de pontos (pontos ativos com LEFT JOIN em contas abertas, livre/ocupado). Acoes: abrir conta, lancar pedido (reusa o fluxo de itens do POS apontando para a conta), fechar (checkout com pagamentos), cancelar;
- Fulfillment board existente: cards de `tabOrders` com quick actions de transicao (analogos a `CardQuickActions`), etiquetados com `tab.codigo` + ponto.

## 6. Invariantes e casos de borda

1. Uma unica venda `ORCAMENTO` por tab (partial unique). Fechamento parcial futuro cria nova venda na mesma tab — estrutura 1:N ja permite;
2. `quantidadeEntregue` e a fonte da deduplicacao de baixa. Toda baixa fisica atualiza o campo na mesma transacao; todo calculo de baixa usa delta. Fechamento e re-tentativas sao idempotentes;
3. Pedido so em conta `ABERTA`; fechamento so sem pedidos ativos; guarda otimista `WHERE status = 'ABERTA'` no fechamento/cancelamento;
4. Rounds de comanda nao passam por `processSaleAttendanceStatusChange` (que exige venda confirmada e pagamento antes da entrega) — usam o service proprio de `tabOrders`;
5. Fiscal e cashback disparam exatamente uma vez, no fechamento (confirmacao da venda nascendo `ENTREGUE`);
6. Conta atravessando turnos de caixa: valido — as transacoes financeiras nascem efetivadas no fechamento, vinculadas a sessao de quem fecha;
7. Org sem `rastreamentoEstoque` (ou produto sem `rastreamentoEstoqueAtivo`): nenhuma baixa, fluxo identico no resto;
8. Listagens de orcamentos existentes: vendas rascunho de comanda aparecem como `ORCAMENTO`. Filtrar `tabId IS NULL` nas telas de orcamento (a conta aberta ja tem board proprio) ou exibir com badge — recomendado filtrar;
9. Venda rascunho de tab nao pode ser confirmada pelo fluxo comum de POS (`confirm` deve rejeitar venda com `tabId` — fechamento e so via `close-tab`).

## 7. Fases de entrega

**Fase 1 — fundacao (comanda operavel):**
enums + schema + migracao; services `open-tab`, `launch-tab-order`, `process-tab-order-status-change`, `close-tab`, `cancel-*`; refactor de `processStockDeduction` para delta por item (modo `ESTOQUE_PROPRIO` apenas); APIs de tabs; board de contas + integracao do fulfillment board; modais e fluxo de lancamento de pedido.

**Fase 2 — composicao (pratos):**
`baixaEstoqueModo` + `fichaTecnicaReceitaId` em produtos; explosao de ficha tecnica na baixa; UI de ficha tecnica no produto (vincular receita existente do modulo de producao); custo derivado como evolucao.

**Fase 3 — QR externo:**
paginas publicas de ponto e tab; tipo `ABERTURA_TAB` em `poiTransactionRequests` + aprovacao no fluxo de operador existente; geracao/impressao dos QR codes no dashboard.

**Fase 4 (futuro, fora deste escopo):**
producao sob demanda (`origem = "PEDIDO"`) para encomendas; fechamento parcial/divisao por pessoa; self-order via QR; rotulo do primitivo configuravel por segmento.
