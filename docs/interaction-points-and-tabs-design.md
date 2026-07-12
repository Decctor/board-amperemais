# Interaction Points and Tabs Design

## Contexto

Organizacoes de alimentacao precisam operar com mesas e comandas: abrir uma conta de consumo, acumular pedidos ao longo do atendimento, visualizar as contas abertas e fechar com pagamento no final. Tambem ha demanda por QR Codes que iniciem uma comanda ou deem acesso aos dados da conta em andamento.

Estado atual do modelo:

- `sales.comandaNumero` e um campo de texto livre na venda. Nao tem ciclo de vida, nao agrega multiplas vendas, nao tem identidade propria nem token de acesso;
- `deliveryModeEnum` ja possui o valor `COMANDA`, usado como modalidade da venda;
- `poiTransactionRequests` ja implementa o conceito de "point of interaction": solicitacoes publicas via `tokenPublico`, aprovadas por um operador;
- `salesSessions` cobre turno de caixa (abertura/fechamento/conferencia) e nao deve ser confundida com comanda.

O campo de texto e suficiente apenas para etiquetar uma venda avulsa. Ele nao suporta: uma conta que agrega varios pedidos, um board de contas abertas, QR duravel na mesa, ou fechamento com pagamento consolidado.

## Restricao de design

Nao criar tabelas especificas de "mesa" ou "comanda". O primitivo deve ter nome generico e servir outros segmentos em outros formatos (pousada, salao, oficina, bar com pulseira, conta mensal B2B).

## Decisao

A demanda "mesas e comandas" esconde dois primitivos com ciclos de vida diferentes. Tentar resolver com um unico primitivo forca uma das duas pontas:

- a "mesa" e uma ancora fisica/logica **duravel** da organizacao. Um QR impresso e colado na mesa precisa apontar para algo estavel, que sobrevive a abertura e fechamento de contas;
- a "comanda" e uma conta de consumo **efemera**, com ciclo de vida (abre, acumula, fecha), que pode existir sem mesa (comanda avulsa, pulseira, delivery de balcao).

Portanto, dois primitivos genericos:

### 1. Pontos de Interacao (`pointsOfInteraction`)

Formaliza como tabela o conceito que o codebase ja usa por nome (`poi_transaction_requests`, pagina externa `point-of-interaction-playbook`). E a ancora duravel onde a organizacao interage com clientes.

Exemplos por segmento:

| Segmento | Ponto de interacao |
| --- | --- |
| Restaurante/bar | Mesa, balcao, quiosque |
| Pousada/hotel | Quarto |
| Salao/barbearia | Cadeira, sala |
| Oficina | Box, elevador |
| Clinica/estetica | Sala de atendimento |
| Loja | Guiche, totem |

Campos principais:

```ts
pointsOfInteraction {
  id
  organizacaoId            // FK organizations, cascade
  rotulo                   // "Mesa 12", "Quarto 3", "Box 2"
  grupo                    // texto livre opcional: "Salao", "Varanda", "Terreo"
  categoria                // texto livre normalizado: "MESA", "QUARTO", "CADEIRA"...
  capacidade               // int opcional (lugares/ocupacao)
  tokenPublico             // unique — QR duravel impresso no ponto
  ativo                    // boolean, default true
  metadados                // jsonb
  dataInsercao
}
```

Notas:

- `categoria` deve ser texto livre (com sugestoes por segmento na UI), nao `pgEnum`. Enum de banco engessaria a generalidade que e o objetivo do primitivo;
- indices: `(organizacaoId, ativo)` para listagem, unique em `tokenPublico`;
- `poiTransactionRequests` ganha `pontoInteracaoId` nullable, para que solicitacoes carreguem a origem fisica (hoje o playbook e um QR unico por organizacao; com pontos, cada mesa/quarto tem o seu).

### 2. Contas de Atendimento (`tabs`)

A conta de consumo com ciclo de vida. "Tab" e o termo generico de POS para isso; o rotulo exibido na UI pode ser configuravel por organizacao ("Comanda", "Conta", "Ficha", "Estadia").

Exemplos por segmento:

| Segmento | Tab |
| --- | --- |
| Restaurante/bar | Comanda da mesa ou por pessoa |
| Bar/evento | Pulseira ou cartao com QR |
| Pousada/hotel | Estadia (folio) com consumos |
| Oficina | Ordem de servico aberta do veiculo |
| B2B | Conta do cliente no mes |

Campos principais:

```ts
tabs {
  id
  organizacaoId            // FK organizations, cascade
  pontoInteracaoId         // FK pointsOfInteraction, set null — NULLABLE (tab avulsa existe sem ponto)
  codigo                   // identificador humano: numero da comanda fisica, pulseira, quarto
  clienteId                // FK clients, set null — nullable, identificacao progressiva
  status                   // tabStatusEnum: ABERTA | FECHADA | CANCELADA
  tokenPublico             // unique — QR proprio da tab (papel/pulseira)
  responsavelVendedorId    // FK sellers, set null (garcom/atendente responsavel)
  abertaPorUsuarioId       // FK users, set null (auditoria, padrao salesSessions)
  fechadaPorUsuarioId      // FK users, set null
  valorTotal               // snapshot congelado no fechamento (denormalizado, padrao salesSessions)
  observacoes
  metadados                // jsonb
  dataAbertura             // defaultNow
  dataFechamento           // nullable
  dataInsercao
}
```

Notas:

- indices: `(organizacaoId, status)` para o board de contas abertas, `pontoInteracaoId`, unique em `tokenPublico`;
- unicidade de `codigo`: partial unique index em `(organizacaoId, codigo) WHERE status = 'ABERTA'` — impede duas comandas fisicas "42" abertas ao mesmo tempo, mas permite reuso do numero apos fechamento;
- **nao** forcar unicidade de tab aberta por ponto. Varias comandas na mesma mesa (uma por pessoa) e caso real de restaurante. Se algum segmento precisar de exclusividade (quarto de pousada), isso vira validacao de servico configuravel, nao constraint;
- enum `tabStatusEnum` em `services/drizzle/schema/enums.ts` e Zod equivalente em `schemas/enums.ts`, seguindo a convencao.

## Relacao com vendas

O grao comercial correto da comanda e a **conta**, nao o pedido. Na operacao real, pagamento, fiscal e contabilidade acontecem uma unica vez, no fechamento:

- pagamento: um acerto no final, frequentemente dividido entre pessoas/metodos — que nao mapeia para as rodadas individuais;
- fiscal: uma NFC-e cobrindo todo o consumo da conta, nao uma por rodada;
- contabil: um lancamento por conta.

Somente a cozinha opera no grao do pedido (rodada). O modelo reflete isso:

### Venda em rascunho por conta

Ao lancar o primeiro pedido de uma tab, criar uma venda em rascunho (`statusVenda = "ORCAMENTO"`) ligada a conta:

```ts
sales.tabId // varchar FK tabs, set null, nullable
```

Os pedidos seguintes apendam itens nessa mesma venda, reusando toda a infra existente de itens (`saleItems`, `saleItemModifiers`, precificacao, adicionais). Isso se apoia diretamente na decisao previa de `sales-status-and-fulfillment-design.md`: status comercial e status operacional sao eixos independentes — uma venda em `ORCAMENTO` nao dispara nenhum efeito de ERP.

Regras:

- partial unique index em `sales.tabId WHERE status_venda = 'ORCAMENTO'` — uma unica venda em aberto por conta;
- a FK permanece 1:N estruturalmente para suportar **fechamento parcial** no futuro (mover itens selecionados para uma nova venda e confirma-la, deixando o resto da conta aberta) sem migracao;
- `dataVenda` e definida no fechamento — o momento comercial real da venda e quando ela e paga, nao quando a conta abriu.

### Pedidos (`tabOrders`)

As rodadas viram uma entidade operacional leve, nao uma venda:

```ts
tabOrders {
  id
  organizacaoId            // FK organizations, cascade
  tabId                    // FK tabs, cascade
  numero                   // sequencial dentro da conta (Pedido 1, 2, 3...)
  status                   // reusa saleAttendanceStatusEnum (NAO_INICIADO, EM_PREPARO, PRONTO, ENTREGUE, CANCELADO)
  observacoes              // "sem cebola", nome da pessoa da rodada
  dataEnvio                // defaultNow — quando o pedido foi lancado
  dataInsercao
}
```

E os itens ganham o vinculo com a rodada:

```ts
saleItems.tabOrderId // varchar FK tabOrders, set null, nullable
```

`tabOrders` nao tem identidade comercial, financeira nem fiscal — e puramente o ticket operacional que a cozinha enxerga, espelhando a comanda de papel (varios pedidos enviados ao longo do atendimento).

Fulfillment board: hoje ele lista apenas vendas com `statusVenda = "CONFIRMADA"` (`app/api/sales/fulfillment/route.ts`), portanto pedidos de comanda exigiriam trabalho no board em qualquer modelo. Com `tabOrders`, o board ganha uma segunda fonte de cards (pedidos ativos de contas abertas), usando o mesmo enum e transicoes analogas as ja validadas para vendas. A cozinha enxerga tickets por rodada; a conta agrega.

### Fechamento

Fechar a conta = checkout da venda em rascunho:

1. o operador informa os metodos de pagamento reais — divisao entre pessoas vira multiplas `financialTransactions` com metodos/valores distintos na mesma venda;
2. `statusVenda -> "CONFIRMADA"`: todos os efeitos de ERP disparam uma unica vez com dados verdadeiros — lancamento contabil, transacoes financeiras ja efetivadas e vinculadas ao turno de caixa (`salesSession`) aberto de quem fecha, emissao fiscal automatica conforme configuracao, estoque;
3. `statusAtendimento` da venda vai para `ENTREGUE`; tab vai para `FECHADA` com `valorTotal` congelado.

Nao existem recebiveis sinteticos durante o consumo: enquanto a conta esta aberta, o "financeiro" dela e apenas o total parcial derivado dos itens, exibido no board.

### Alternativa rejeitada: cada pedido como venda confirmada com recebiveis

Confirmar cada rodada como venda propria, gerando `financialTransactions` a receber e efetivando no fechamento. Rejeitada porque:

- o metodo de pagamento nao e conhecido no momento do pedido — as transacoes a receber por rodada seriam placeholders sem informacao real;
- o pagamento real (unico, ou dividido entre pessoas) nao mapeia para as rodadas; alocar valores pro-rata entre vendas seria dado inventado;
- fiscal: emite-se uma NFC-e por conta, e `fiscalOutboundDocuments` referencia uma venda — N vendas por conta exigiria N documentos ou documento multi-venda;
- lancamentos contabeis por rodada geram ruido e possiveis estornos no fechamento.

O unico ponto forte desse modelo — pipeline de cozinha por rodada via `statusAtendimento` — e coberto por `tabOrders` com custo menor.

### Efeitos colaterais aceitos

- vendas em rascunho de contas abertas nao aparecem em relatorios de venda ate o fechamento. Comercialmente correto (a venda ainda nao aconteceu); o board de contas abertas expoe o "consumo em aberto" como metrica derivada para quem precisar do numero intra-dia;
- contas abandonadas: o board mostra a idade da conta; cancelar a tab cancela a venda em rascunho (`CANCELADA`) e os pedidos.

## QR Codes

Dois QRs, dois tokens, duas ancoras — ambos seguindo o padrao de seguranca ja existente em `poiTransactionRequests` (`tokenPublico` opaco, pagina externa, acao sensivel exige aprovacao de operador):

### QR do ponto (duravel, impresso na mesa/quarto/box)

Pagina publica em `app/(external)/` resolve o token do ponto:

- se ha tab(s) aberta(s) no ponto: exibe a conta atual (pedidos, itens, total parcial);
- se nao ha: CTA "abrir conta", que cria uma `poiTransactionRequest` com novo tipo (ex.: `ABERTURA_TAB`) pendente de aprovacao do operador — mesmo fluxo de aprovacao do POI atual. Auto-abertura sem aprovacao pode virar configuracao da organizacao depois;
- `poiTransactionRequestTypeEnum` ganha o(s) novo(s) tipo(s); `poiTransactionRequests` ganha `pontoInteracaoId` e `tabId` nullable.

### QR da tab (efemero, papel/pulseira/cartao)

Pagina publica resolve o `tokenPublico` da tab e mostra a conta em andamento. Serve o caso "comanda fisica com QR" e "pulseira de evento", sem depender de ponto.

Fora de escopo nesta fase: self-order completo pelo QR (cliente montando pedido sozinho). A primeira versao entrega visualizacao da conta + solicitacao de abertura. Pedido pelo cliente pode reusar o cardapio do shop depois, sempre passando pelo fluxo de aprovacao.

## Board operacional

Visao de operacao dia a dia, complementar ao fulfillment board existente:

- **eixo conta**: tabs com `status = "ABERTA"` da organizacao, com ponto, cliente, responsavel, total parcial derivado e idade da conta;
- **eixo ponto**: pontos ativos LEFT JOIN tabs abertas — ponto sem tab aberta aparece como "livre", com tab(s) como "ocupado". Isso da o "mapa de mesas" sem precisar de tabela de mesa;
- **eixo cozinha**: o fulfillment board existente ganha cards de `tabOrders` ativos alem dos cards de venda;
- indices ja previstos cobrem as queries (`tabs (organizacaoId, status)`, `pointsOfInteraction (organizacaoId, ativo)`, `tabOrders (tabId)` + `(organizacaoId, status)`).

## Migracao e compatibilidade

- `sales.comandaNumero` permanece como snapshot legado. No novo fluxo, ao ligar uma venda a uma tab, denormalizar `tab.codigo` em `comandaNumero` para relatorios existentes continuarem funcionando. Deprecar o campo apenas quando o fluxo novo estiver consolidado;
- vendas antigas com `comandaNumero` preenchido nao precisam de backfill — tabs passam a existir apenas para contas novas;
- nenhuma mudanca em `salesSessions`: caixa e comanda seguem ortogonais (a comanda fecha *dentro* de um turno de caixa);
- `deliveryModeEnum = "COMANDA"` continua marcando a venda da conta (o `resolveInitialAttendanceStatus` existente ja trata).

## O que nao fazer agora

- reserva de mesa/agenda de pontos;
- mapa visual de salao com posicionamento (coordenadas em `metadados` do ponto se um dia precisar);
- fechamento parcial e divisao de conta item a item (a estrutura 1:N de `sales.tabId` ja suporta a evolucao; dividir por metodo de pagamento no fechamento ja atende o caso comum);
- self-order completo via QR;
- impressao termica de comanda.

## Pontos de decisao em aberto

1. **Nome do primitivo de conta**: `tabs` (recomendado — curto, termo consagrado de POS) vs. algo como `serviceAccounts`. `accounts` puro colide com `financialAccounts`.
2. **Momento da baixa fisica de estoque**: no fechamento, junto da confirmacao (recomendado para v1 — um unico momento de efeitos) vs. na entrega de cada pedido (`tabOrders.status -> ENTREGUE`), que e o evento fisico real (um chopp entregue saiu do estoque mesmo que a conta nunca feche), mas exige tratar baixa contra venda em rascunho e cancelamento de conta com itens ja consumidos.
3. **Abertura via QR**: sempre com aprovacao de operador (recomendado como default, igual ao POI atual) vs. auto-abertura configuravel.
4. **Criacao da venda em rascunho**: lazy no primeiro pedido (recomendado — abrir conta nao cria venda vazia) vs. na abertura da tab.
5. **Rotulo por segmento**: configuracao da organizacao para exibir "Comanda"/"Conta"/"Ficha" na UI — fica para quando outro segmento usar o primitivo.

## Plano de implementacao sugerido

1. Criar `tabStatusEnum` (Drizzle + Zod) em `enums.ts` — pedidos reusam `saleAttendanceStatusEnum`.
2. Criar `services/drizzle/schema/points-of-interaction.ts` e `services/drizzle/schema/tabs.ts` (tabs + tabOrders), com relations e barrel-export.
3. Adicionar `sales.tabId` (com partial unique de rascunho) e `saleItems.tabOrderId`; manter `comandaNumero` como snapshot.
4. Adicionar `pontoInteracaoId`/`tabId` em `poiTransactionRequests` e novo(s) tipo(s) em `poiTransactionRequestTypeEnum`.
5. APIs App Router: CRUD de pontos; abrir conta; lancar pedido (append de itens na venda em rascunho + criacao do `tabOrder`, em transacao); consultar conta; cancelar conta.
6. Fechamento da conta: service de checkout que recebe os metodos de pagamento, confirma a venda em rascunho (efeitos de ERP unicos, transacoes vinculadas ao turno de caixa aberto) e fecha a tab com snapshot.
7. Fulfillment board: segunda fonte de cards a partir de `tabOrders` ativos, com quick actions de transicao de status.
8. Paginas externas de QR (ponto e tab), seguindo o padrao do playbook de POI.
9. UI do board de contas/pontos e integracao com o fluxo de nova venda (lancar pedido em conta aberta).
