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

Cada **pedido/rodada** dentro da conta e uma venda normal ligada a tab:

```ts
sales.tabId // varchar FK tabs, set null, nullable
```

A tab e um **container de vendas**, nao uma venda gigante:

- cada rodada confirmada (`statusVenda = "CONFIRMADA"`) entra no pipeline operacional existente (`statusAtendimento`, fulfillment board) sem nenhuma mudanca — a cozinha enxerga rodadas, nao a conta;
- o total da tab e derivado (soma das vendas nao canceladas ligadas a ela); `valorTotal` so e congelado no fechamento, como `salesSessions` faz com `totalEsperado`;
- financeiro: as rodadas confirmadas geram `financialTransactions` a receber (`dataEfetivacao = null`), coerente com o design em `sales-status-and-fulfillment-design.md`. No fechamento da tab, o operador informa os metodos de pagamento e as transacoes sao efetivadas — vinculadas a `salesSession` aberta de quem fecha, para a conferencia de caixa continuar integra;
- `deliveryModeEnum = "COMANDA"` continua marcando as rodadas de consumo no local (o `resolveInitialAttendanceStatus` existente ja trata).

### Alternativa rejeitada: venda unica crescente

Modelar a comanda como uma unica venda em rascunho que acumula itens e e confirmada no fechamento:

- quebra o pipeline de cozinha por rodada (o `statusAtendimento` e por venda; rodadas diferentes estariam em etapas diferentes);
- atrasa todos os efeitos de ERP para o fechamento, distorcendo data de venda e relatorios intra-dia;
- conflita com o principio ja decidido de separar status comercial de status operacional.

O modelo de container preserva tudo que ja foi construido para fulfillment.

## QR Codes

Dois QRs, dois tokens, duas anceoras — ambos seguindo o padrao de seguranca ja existente em `poiTransactionRequests` (`tokenPublico` opaco, pagina externa, acao sensivel exige aprovacao de operador):

### QR do ponto (duravel, impresso na mesa/quarto/box)

Pagina publica em `app/(external)/` resolve o token do ponto:

- se ha tab(s) aberta(s) no ponto: exibe a conta atual (rodadas, itens, total parcial);
- se nao ha: CTA "abrir conta", que cria uma `poiTransactionRequest` com novo tipo (ex.: `ABERTURA_TAB`) pendente de aprovacao do operador — mesmo fluxo de aprovacao do POI atual. Auto-abertura sem aprovacao pode virar configuracao da organizacao depois;
- `poiTransactionRequestTypeEnum` ganha o(s) novo(s) tipo(s); `poiTransactionRequests` ganha `pontoInteracaoId` e `tabId` nullable.

### QR da tab (efemero, papel/pulseira/cartao)

Pagina publica resolve o `tokenPublico` da tab e mostra a conta em andamento. Serve o caso "comanda fisica com QR" e "pulseira de evento", sem depender de ponto.

Fora de escopo nesta fase: self-order completo pelo QR (cliente montando pedido sozinho). A primeira versao entrega visualizacao da conta + solicitacao de abertura. Pedido pelo cliente pode reusar o cardapio do shop depois, sempre passando pelo fluxo de aprovacao.

## Board operacional

Visao de operacao dia a dia, complementar ao fulfillment board existente (que continua sendo o eixo da cozinha):

- **eixo conta**: tabs com `status = "ABERTA"` da organizacao, com ponto, cliente, responsavel, total parcial derivado e idade da conta;
- **eixo ponto**: pontos ativos LEFT JOIN tabs abertas — ponto sem tab aberta aparece como "livre", com tab(s) como "ocupado". Isso da o "mapa de mesas" sem precisar de tabela de mesa;
- indices ja previstos cobrem as duas queries (`tabs (organizacaoId, status)`, `pointsOfInteraction (organizacaoId, ativo)`).

## Migracao e compatibilidade

- `sales.comandaNumero` permanece como snapshot legado. No novo fluxo, ao ligar uma venda a uma tab, denormalizar `tab.codigo` em `comandaNumero` para relatorios existentes continuarem funcionando. Deprecar o campo apenas quando o fluxo novo estiver consolidado;
- vendas antigas com `comandaNumero` preenchido nao precisam de backfill — tabs passam a existir apenas para contas novas;
- nenhuma mudanca em `salesSessions`: caixa e comanda seguem ortogonais (a comanda fecha *dentro* de um turno de caixa).

## O que nao fazer agora

- reserva de mesa/agenda de pontos;
- mapa visual de salao com posicionamento (coordenadas em `metadados` do ponto se um dia precisar);
- divisao de conta item a item entre clientes (dividir por rodada ja sai de graca: cada venda da tab pode ter `clienteId` diferente);
- self-order completo via QR;
- impressao termica de comanda.

## Pontos de decisao em aberto

1. **Nome do primitivo de conta**: `tabs` (recomendado — curto, termo consagrado de POS) vs. algo como `serviceAccounts`. `accounts` puro colide com `financialAccounts`.
2. **Nome da FK em vendas**: `sales.tabId` (recomendado) — "tab" vira termo do dominio, como "poi" ja e.
3. **Fechamento e pagamento**: efetivar as `financialTransactions` das rodadas no fechamento da tab (recomendado) vs. permitir pagamento parcial por rodada. A primeira versao pode suportar apenas fechamento total.
4. **Abertura via QR**: sempre com aprovacao de operador (recomendado como default, igual ao POI atual) vs. auto-abertura configuravel.
5. **Rotulo por segmento**: configuracao da organizacao para exibir "Comanda"/"Conta"/"Ficha" na UI — fica para quando outro segmento usar o primitivo.

## Plano de implementacao sugerido

1. Criar `tabStatusEnum` (Drizzle + Zod) em `enums.ts`.
2. Criar `services/drizzle/schema/points-of-interaction.ts` e `services/drizzle/schema/tabs.ts`, com relations e barrel-export.
3. Adicionar `sales.tabId` e relation; manter `comandaNumero` como snapshot.
4. Adicionar `pontoInteracaoId`/`tabId` em `poiTransactionRequests` e novo(s) tipo(s) em `poiTransactionRequestTypeEnum`.
5. APIs App Router: CRUD de pontos, abrir/consultar/fechar tab, listagem do board (contas abertas + ocupacao de pontos).
6. Fechamento da tab: service que consolida vendas da tab, recebe metodos de pagamento, efetiva transacoes financeiras vinculadas ao turno de caixa aberto.
7. Paginas externas de QR (ponto e tab), seguindo o padrao do playbook de POI.
8. UI do board operacional e integracao com o fluxo de nova venda (selecionar tab aberta ao lancar rodada).
