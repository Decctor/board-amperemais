# Tabs — Melhorias e Upgrades Futuros

Evolucoes deliberadamente deixadas fora da implementacao inicial de `implementation-plan.md`. Cada item registra **o que** e, e **qual gatilho** justificaria implementa-lo — para que a decisao de adiar nao se perca e ninguem reimplemente por esquecimento.

## Funcionalidades de produto

### Fechamento parcial e divisao de conta item a item

Mover itens selecionados de uma conta para uma nova venda e confirma-la, deixando o resto aberto. A estrutura ja suporta sem migracao: `sales.tabId` e 1:N e o partial unique permite nova venda `ORCAMENTO` apos a anterior confirmar.
**Gatilho:** demanda real de clientes; a divisao por metodo de pagamento no fechamento (multiplas `financialTransactions`) ja cobre o caso comum.

### Reserva de mesa / agenda de pontos

Agenda sobre `servicePoints`.
**Gatilho:** segmento com reserva (restaurante com booking, pousada). Nao criar antes — e outro dominio (agenda), nao uma extensao da tab.

### Mapa visual de salao

Posicionamento das mesas em planta. Coordenadas cabem em `servicePoints.metadados` quando chegar a hora; o board livre/ocupado (LEFT JOIN) ja atende a operacao.
**Gatilho:** feedback de operacao em saloes grandes.

### Aceite automatico de pedido publico (`pedidosCliente = "DIRETO"` / `aberturaPublica = "AUTOMATICA"`)

A v1 recebe solicitacoes (`tabOrderRequests`) para aprovacao do operador.
**Gatilho:** controles de abuso validados (rate limit, rotacao de token, historico de operacao) e confianca operacional no fluxo de aprovacao.

### Identificacao do cliente por telefone no fluxo publico

Capturar o telefone do cliente na abertura/vinculo da tab (ou no primeiro pedido via QR) para identifica-lo de verdade: vincular `clienteId` a tab, dar continuidade entre dispositivos/navegadores (o `deviceKey` e por dispositivo e morre com o localStorage) e conectar o consumo do salao ao CRM/fidelidade.
**Gatilho:** fluxo de continuidade por `deviceKey` (implementation-plan, secao 8 / fase 4) testado e validado em operacao real. Telefone adiciona atrito no primeiro pedido e exige verificacao (OTP) para nao virar identidade forjavel — nao antecipar.

### Mesclar tabs

Transferencia simples entre pontos entra na v1; merge de contas nao.
**Gatilho:** demanda real; merge exige politica de renumeracao de pedidos e unificacao de vendas rascunho.

### Impressao termica de comanda

**Gatilho:** integracao de hardware priorizada comercialmente. Entra como consumidor do mesmo evento que alimenta o board de Preparo.

### Rotulo do primitivo por segmento

Configuracao da organizacao para exibir "Comanda"/"Conta"/"Ficha"/"Estadia" na UI.
**Gatilho:** primeiro segmento nao-alimentacao usando o primitivo.

### Producao sob demanda (`productions.origem = "PEDIDO"`)

Para encomendas com lead time (bolo, kit de evento): lancar o item cria uma `production` com `vendaId`/`vendaItemId`, e o fulfillment aguarda `CONCLUIDA`. Os campos ja existem; falta a fiacao (flag por produto, criacao automatica, gate no fulfillment).
**Gatilho:** segmento de encomendas; nao e necessario para comanda/mesa.

### Custo derivado da ficha tecnica

`valorCustoUnitario` do item calculado a partir do custo dos insumos no momento da venda, em vez do custo cadastrado do produto composto.
**Gatilho:** relatorios de margem por prato; nao bloqueia a v1.

### Rota fullscreen dedicada do Preparo

A v1 entrega o board de Preparo (o "KDS") como aba em `sales-page.tsx`, com componente autocontido. A evolucao natural e uma rota propria fullscreen para tablet/TV da cozinha: auto-refresh agressivo, alvos de toque grandes, sem chrome do dashboard e permissao propria (quem prepara nao deveria precisar de acesso ao dashboard comercial).
**Gatilho:** primeira operacao usando display fixo na cozinha/estacao de preparo.

### Tickets de preparo generalizados (roteamento por estacao)

Se surgir demanda de roteamento por praca/estacao ou tempos por item: generalizar `tab_orders` em tickets de preparo com `vendaId` e `tabId` nullable, criados na confirmacao para modalidades com preparo, derivando `statusAtendimento` dos tickets. Como `tabOrders` ja reusa `saleAttendanceStatusEnum` e as transicoes das vendas, a generalizacao e aditiva.
**Gatilho:** demanda alem do board de Preparo unificado (duas fontes de ticket) da v1.

## Infraestrutura (avaliada na auditoria externa e adiada)

Itens propostos em `food-service-command-module-design.md` (auditoria GPT, removida apos consolidacao). Foram adiados porque a v1 tem dois callers autenticados e um fluxo de aprovacao — as invariantes criticas ja sao defendidas por constraints, advisory lock e compare-and-set no proprio plano. O criterio para revisitar cada item e o mesmo do documento original: implementa-lo quando *nao* te-lo fizer a complexidade reaparecer espalhada em varios callers.

### Idempotencia generica de comandos (tabela de execucoes)

Tabela `commandExecutions` com `commandId` + `payloadHash` + resultado persistido, cobrindo todas as operacoes mutaveis.
**Adiado porque:** o padrao da codebase e idempotencia nas superficies propensas a retry sem contexto (`shopOrderRequests`, `tabOrderRequests`); para o operador, o id de `tabOrder` gerado no client dedupa o caso real (duplo toque); fechar/cancelar sao idempotentes pelo compare-and-set de status.
**Gatilho:** aparecerem retries com efeitos nao-dedupaveis por chave natural (ex.: integracoes externas reenviando comandos compostos), ou mais de ~3 superficies repetindo logica de dedup ad hoc.

### Auditoria operacional append-only (event log)

Tabela `operationEvents` (TAB_OPENED, TAB_TRANSFERRED, ITEM_VOIDED...) com ator, motivo e deltas.
**Adiado porque:** a codebase audita por colunas (`abertaPorUsuarioId`, `fechadaPorUsuarioId`, motivos, timestamps), padrao `salesSessions`, e a v1 segue esse padrao. E aditivo — pode ser introduzido depois sem migracao dolorosa.
**Gatilho:** disputas operacionais reais ("quem cancelou este item?") que as colunas nao respondem, ou requisito de compliance/relatorio de cancelamentos por operador.

### Outbox generica + worker

Tabela `outboxEvents` com claim atomico, retry/backoff e reprocessamento, alimentando o board de Preparo, impressao, fiscal e integracoes.
**Adiado porque:** o unico efeito externo da v1 e o fiscal, que ja tem fila propria com retry (`fiscalOutboundDocuments` + `processFiscalQueue` via cron). O board de Preparo na v1 e query/invalidation, nao push.
**Gatilho:** segundo consumidor de eventos pos-commit com exigencia de entrega garantida (impressao termica, integracao de delivery, webhook). Nesse momento, avaliar generalizar a fila fiscal vs. criar a outbox e migrar o fiscal para ela.

### Versionamento otimista da tab (`tabs.version` + `expectedVersion`)

Coluna de versao incrementada a cada mutacao, com `expectedVersion` exigido em operacoes destrutivas.
**Adiado porque:** as operacoes destrutivas (fechar/cancelar/transferir) ja sao serializadas por compare-and-set de status e advisory lock; `placeOrder` e aditivo e nao conflita. Staleness de UI se resolve com refetch.
**Gatilho:** UI de edicao concorrente da mesma tab (ex.: dois operadores editando itens simultaneamente) onde "last write wins" cause perda real.

### Taxonomia de erros de dominio (codigos estaveis)

Erros como `TAB_NOT_OPEN`, `PRICE_CHANGED`, convertidos por adapter (HTTP, UI, worker).
**Adiado porque:** o padrao da codebase e `createHttpError` com mensagem em portugues direto do service.
**Gatilho:** consumidor programatico dos erros (worker com retry seletivo, client offline-first, SDK externo) que precise discriminar por codigo em vez de mensagem.

### Representacao monetaria (centavos inteiros / `numeric`)

**Adiado porque:** a codebase inteira usa `doublePrecision`; mudar e uma migracao transversal sem relacao com comandas. O modulo de tabs nao deve inaugurar uma segunda representacao.
**Gatilho:** decisao de plataforma (auditoria de arredondamento, requisito fiscal), executada como iniciativa propria cobrindo vendas/financeiro/fiscal de uma vez.

### Testes de integracao com PostgreSQL real

Suite cobrindo idempotencia, concorrencia (dois fechamentos, duas aberturas da mesma mesa), atomicidade e isolamento multi-tenant — mocks nao verificam locks, partial uniques nem rollback.
**Adiado porque:** a codebase nao tem infraestrutura de testes; montar containers/CI e um projeto proprio e nao deve ser pre-requisito do modulo.
**Gatilho:** decisao de plataforma de introduzir testes. Quando acontecer, os fluxos de tabs (fechamento concorrente, abertura de mesa, delta de estoque) sao os melhores primeiros candidatos — a lista de cenarios minimos esta preservada acima.

### Estado `FECHANDO` / checkout assincrono

Workflow de fechamento com estado intermediario e compensacao.
**Adiado porque:** pagamento hoje significa registro financeiro local — lock + transacao bastam.
**Gatilho:** autorizacao externa de cartao (TEF/gateway sincrono) no fechamento; nao manter transacao PostgreSQL aberta durante chamada externa.

### Reabertura de tab

`TAB_REOPENED` com rotacao de token.
**Gatilho:** demanda operacional (conta fechada por engano). Exige reverter a confirmacao da venda — hoje coberto por `processConfirmedSaleCancellation` + nova conta; avaliar se o atalho compensa.
