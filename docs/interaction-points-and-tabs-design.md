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

O modelo deve ser excelente para food-service antes de tentar ser universal. A generalidade desejavel e a que aparece naturalmente ao separar:

- uma ancora operacional duravel (mesa, balcao, quarto);
- uma conta de consumo efemera;
- uma rodada operacional de itens.

Nao criar uma tabela especifica de `mesas`, mas tambem nao esconder regras essenciais do salao em `metadados` genericos. Outros segmentos podem reutilizar os primitivos quando seus ciclos de vida forem realmente equivalentes.

## Decisao

A demanda "mesas e comandas" esconde dois primitivos com ciclos de vida diferentes. Tentar resolver com um unico primitivo forca uma das duas pontas:

- a "mesa" e uma ancora fisica/logica **duravel** da organizacao. Um QR impresso e colado na mesa precisa apontar para algo estavel, que sobrevive a abertura e fechamento de contas;
- a "comanda" e uma conta de consumo **efemera**, com ciclo de vida (abre, acumula, fecha), que pode existir sem mesa (comanda avulsa, pulseira, delivery de balcao).

Portanto, dois primitivos de dados, ambos opcionais conforme o modo de operacao, e uma politica explicita que os coordena.

### Modos de operacao nao sao entidades

Uma organizacao pode operar mais de um fluxo ao mesmo tempo: por exemplo, balcao rapido e salao com mesas. Por isso, a existencia de um ponto ou de uma tab nao deve habilitar implicitamente um comportamento.

Persistir uma configuracao tipada de atendimento separada das entidades. A Interface recomendada e composta por capacidades e politicas:

```ts
serviceSettings {
  pontos: {
    habilitados: boolean
  }
  contas: {
    habilitadas: boolean
    identificacao: "AUTOMATICA" | "CODIGO_MANUAL"
    pontoObrigatorio: boolean
    maxAbertasPorPonto: number | null
  }
  aberturaPublica: "DESABILITADA" | "SOLICITACAO" | "AUTOMATICA"
  pedidosCliente: "DESABILITADO" | "SOLICITACAO" | "DIRETO"
}
```

A UI oferece presets, mas persiste as politicas:

| Preset | Politicas principais | Experiencia |
| --- | --- | --- |
| Balcao | pontos e contas desabilitados | venda/pedido avulso pelo fluxo normal |
| Somente mesas | ponto obrigatorio, identificacao automatica, maximo 1 conta por ponto | operador escolhe a mesa; a tab e aberta/reusada sem expor "comanda" |
| Somente comandas | pontos desabilitados, codigo manual | operador informa ou le o codigo da comanda |
| Mesas + comandas | ponto obrigatorio, codigo manual, varias contas por ponto | varias comandas podem estar vinculadas a mesma mesa |

Presets nao sao mutuamente exclusivos no nivel da operacao. Uma hamburgueria pode manter balcao no fluxo normal e usar "Somente mesas" no salao. Persistir politicas, em vez de um mega-enum `MESA | COMANDA | HIBRIDO`, evita combinacoes artificiais e concentra as invariantes no modulo de atendimento.

As regras nao devem ser inferidas apenas pela nulabilidade das FKs:

- mesa: exige ponto; `codigo` pode ser gerado/oculto; no maximo uma tab aberta por ponto;
- comanda: exige `codigo`; nao exige ponto;
- mesa + comanda: exige ponto e `codigo`; permite varias tabs abertas no mesmo ponto.

A exclusividade por ponto deve ser garantida pelo modulo de abertura com guarda transacional. Um indice global de unicidade por ponto impediria legitimamente o fluxo de varias comandas na mesma mesa.

### 1. Pontos de Atendimento (`servicePoints`)

E a ancora duravel em que o atendimento ocorre. `pointOfInteraction` e generico demais e ja possui outro significado no codebase: o playbook de fidelidade e suas `poiTransactionRequests`. Usar o mesmo nome para mesa/quarto criaria uma Interface conceitual ambigua.

O nome de dominio recomendado e `servicePoints` (UI: "Pontos de atendimento"). O vinculo com o POI publico e um adapter: um QR de ponto pode originar uma solicitacao, mas o ponto nao e uma `poiTransactionRequest`.

Exemplos por segmento:

| Segmento | Ponto de atendimento |
| --- | --- |
| Restaurante/bar | Mesa, balcao, quiosque |
| Pousada/hotel | Quarto |
| Salao/barbearia | Cadeira, sala |
| Oficina | Box, elevador |
| Clinica/estetica | Sala de atendimento |
| Loja | Guiche, totem |

Campos principais:

```ts
servicePoints {
  id
  organizacaoId            // FK organizations, cascade
  rotulo                   // "Mesa 12", "Quarto 3", "Box 2"
  grupo                    // texto livre opcional: "Salao", "Varanda", "Terreo"
  tipo                     // MESA | BALCAO | QUIOSQUE | OUTRO
  capacidade               // int opcional (lugares/ocupacao)
  tokenPublicoHash         // unique; token bruto aparece apenas na criacao/regeneracao
  ativo                    // boolean, default true
  metadados                // extensoes; nao guarda regras centrais de food-service
  dataInsercao
}
```

Notas:

- para a primeira versao focada em food-service, `tipo` deve ser um enum pequeno (`MESA`, `BALCAO`, `QUIOSQUE`, `OUTRO`). `OUTRO` preserva extensibilidade sem sacrificar validacao e filtros do caso principal;
- indices: `(organizacaoId, ativo)` para listagem, unique em `tokenPublicoHash`;
- organizacoes de balcao ou somente comandas nao precisam cadastrar pontos;
- `poiTransactionRequests` pode ganhar `servicePointId` nullable apenas para solicitacoes do playbook que precisem registrar origem fisica.

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
  servicePointId           // FK servicePoints, set null; nullable
  codigo                   // nullable em mesa; obrigatorio quando houver comanda fisica
  clienteId                // FK clients, set null — nullable, identificacao progressiva
  status                   // tabStatusEnum: ABERTA | FECHADA | CANCELADA
  tokenPublicoHash         // unique; QR proprio da tab (papel/pulseira)
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

- indices: `(organizacaoId, status)` para o board de contas abertas, `servicePointId`, unique em `tokenPublicoHash`;
- unicidade de `codigo`: partial unique index em `(organizacaoId, codigo) WHERE status = 'ABERTA' AND codigo IS NOT NULL`;
- **nao** forcar unicidade de tab aberta por ponto. Varias comandas na mesma mesa (uma por pessoa) e caso real de restaurante. Se algum segmento precisar de exclusividade (quarto de pousada), isso vira validacao de servico configuravel, nao constraint;
- enum `tabStatusEnum` em `services/drizzle/schema/enums.ts` e Zod equivalente em `schemas/enums.ts`, seguindo a convencao.

No preset "Somente mesas", a tab continua existindo no banco porque ela e a conta que agrega pedidos e viabiliza o fechamento. Ela e apenas escondida na Interface do operador: selecionar "Mesa 12" resolve ou abre automaticamente sua tab. Assim, "trabalhar somente com mesas" nao cria um segundo modelo comercial.

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

## Celular no salao e relacao com `shop`

Existem dois callers diferentes, embora ambos precisem de uma experiencia de cardapio:

1. **operador autenticado no celular**: escolhe ponto/tab, monta itens e chama `launchTabOrder` diretamente;
2. **cliente via QR**: monta itens em contexto publico e cria uma solicitacao de pedido, aprovada por operador conforme `serviceSettings.pedidosCliente`.

Nao reutilizar o checkout atual de `app/shop/[orgId]` como fluxo de salao. Hoje sua Interface exige telefone, retirada/entrega, intencao de pagamento e horario da loja; o POST cria e confirma uma venda propria. Em uma mesa isso transformaria cada rodada em uma venda comercial e quebraria a decisao de uma venda rascunho por tab.

O reaproveitamento correto acontece em um Seam anterior ao checkout:

```txt
catalogo + product builder + carrinho + validacao autoritativa de precos
  -> adapter SHOP: cria e confirma uma venda avulsa
  -> adapter OPERADOR: cria tabOrder diretamente
  -> adapter CLIENTE_QR: cria tabOrderRequest para aprovacao
```

Aprofundar `lib/sales/sale-pricing-validation.ts` como Interface compartilhada para validar produto, variante, modificadores e precos. O calculo local hoje existente na rota de `shop` deve convergir gradualmente para essa Interface. Parametrizar o checkout atual com muitos booleanos reduziria a Locality; orquestradores separados preservam as invariantes de cada fluxo.

A pagina do operador deve ser uma tela autenticada e responsiva do modulo de salao. A pagina publica pode reutilizar a composicao visual do cardapio, mas usa outro estado de checkout e outro endpoint.

### Solicitacoes de pedido do cliente

Criar `tabOrderRequests` em vez de encaixar o carrinho em `poiTransactionRequests`. O modulo POI atual possui Interface e resumo especificos de cashback/transacao; reutiliza-lo como inbox generico espalharia condicionais.

`tabOrderRequests` guarda idempotencia, contexto (`servicePointId`/`tabId`), payload de itens, status (`PENDENTE | APROVADA | REJEITADA | PROCESSANDO | CONCLUIDA | ERRO`), operador e `tabOrderId` resultante. Aprovar executa atomicamente a mesma validacao autoritativa de precos e o mesmo `launchTabOrder` usado pelo operador.

No preset "Somente mesas", a aprovacao pode abrir a tab implicita se ainda nao houver uma. Em "Mesas + comandas", o QR do ponto nao pode escolher silenciosamente uma entre varias tabs: o cliente precisa apresentar/selecionar sua comanda ou a solicitacao fica para o operador resolver.

## QR Codes e privacidade

Os QRs concedem contextos diferentes:

### QR do ponto (duravel, impresso na mesa)

- identifica o `servicePoint`;
- abre cardapio e permite solicitar abertura/pedido conforme configuracao;
- **nao exibe automaticamente itens ou total de tabs abertas**. Uma foto antiga do QR da mesa nao deve dar acesso ao consumo atual;
- em modo com varias comandas por mesa, exige identificacao adicional da tab.

### QR da tab (efemero, papel/pulseira/cartao)

- identifica uma conta especifica e pode mostrar seu extrato;
- pode iniciar uma solicitacao de nova rodada;
- deve poder ser revogado/rotacionado ao fechar ou reabrir uma conta.

Persistir hashes dos tokens, nao o token bruto, seguindo a pratica ja usada por `shopOrderRequests`. O token e mostrado somente na criacao/regeneracao. Prever rate limit para rotas publicas e uma operacao explicita de regeneracao do QR duravel do ponto.

## Board operacional

Visao de operacao dia a dia, complementar ao fulfillment board existente:

- **eixo conta**: tabs com `status = "ABERTA"` da organizacao, com ponto, cliente, responsavel, total parcial derivado e idade da conta;
- **eixo ponto**: pontos ativos LEFT JOIN tabs abertas — ponto sem tab aberta aparece como "livre", com tab(s) como "ocupado". Isso da o "mapa de mesas" sem precisar de tabela de mesa;
- **eixo cozinha**: o fulfillment board existente ganha cards de `tabOrders` ativos alem dos cards de venda;
- indices ja previstos cobrem as queries (`tabs (organizacaoId, status)`, `servicePoints (organizacaoId, ativo)`, `tabOrders (tabId)` + `(organizacaoId, status)`).

## Invariantes transacionais

- `tabOrders.numero` deve ter unique `(tabId, numero)`. O proximo numero e alocado com lock da tab ou contador atomico; `max(numero) + 1` sem lock tem race;
- lancar pedido, criar/reusar a venda rascunho, inserir itens e recalcular totais acontece em uma transacao;
- fechar usa lock da tab e da venda, ou uma transicao compare-and-set no inicio. A guarda nao pode acontecer somente no fim, depois de criar contabilidade e pagamentos;
- a confirmacao comum de POS rejeita venda rascunho com `tabId`; o fechamento da tab e a unica Interface autorizada a confirma-la;
- a baixa de estoque usa delta por `saleItem` (`quantidade - quantidadeEntregue`) e atualiza a quantidade entregue na mesma transacao;
- `tabOrders` possui transicao operacional propria: nao pode reutilizar diretamente `processSaleAttendanceStatusChange`, que exige venda confirmada e pagamento;
- transferir uma tab entre pontos preserva pedidos e venda. E uma operacao explicita e auditada; mesclar tabs e dividir itens continuam fora de escopo.

## Migracao e compatibilidade

- `sales.comandaNumero` permanece como snapshot legado. No novo fluxo, ao ligar uma venda a uma tab, denormalizar `tab.codigo` em `comandaNumero` para relatorios existentes continuarem funcionando. Deprecar o campo apenas quando o fluxo novo estiver consolidado;
- vendas antigas com `comandaNumero` preenchido nao precisam de backfill — tabs passam a existir apenas para contas novas;
- nenhuma mudanca em `salesSessions`: caixa e comanda seguem ortogonais (a comanda fecha *dentro* de um turno de caixa);
- `deliveryModeEnum = "COMANDA"` continua marcando a venda da conta (o `resolveInitialAttendanceStatus` existente ja trata).

## O que nao fazer agora

- reserva de mesa/agenda de pontos;
- mapa visual de salao com posicionamento (coordenadas em `metadados` do ponto se um dia precisar);
- fechamento parcial e divisao de conta item a item (a estrutura 1:N de `sales.tabId` ja suporta a evolucao; dividir por metodo de pagamento no fechamento ja atende o caso comum);
- aceite automatico de pedido publico; a primeira entrega recebe solicitacoes para aprovacao do operador;
- mesclar tabs; transferencia simples entre pontos entra na primeira versao;
- impressao termica de comanda.

## Pontos de decisao em aberto

1. **Nome do primitivo de conta**: `tabs` (recomendado — curto, termo consagrado de POS) vs. algo como `serviceAccounts`. `accounts` puro colide com `financialAccounts`.
2. **Nome da ancora duravel**: decidido por este refinamento como `servicePoints`, evitando colisao com o POI de fidelidade.
3. **Momento da baixa fisica de estoque** — decidido: na entrega de cada pedido (`tabOrders.status -> ENTREGUE`), com deduplicacao por delta `quantidade - quantidadeEntregue`.
4. **Abertura e pedido via QR**: default `SOLICITACAO`; `AUTOMATICA`/`DIRETO` somente apos controles de abuso e experiencia operacional validados.
5. **Criacao da venda em rascunho**: lazy no primeiro pedido (recomendado — abrir conta nao cria venda vazia) vs. na abertura da tab.
6. **Rotulo por segmento**: configuracao da organizacao para exibir "Comanda"/"Conta"/"Ficha" na UI — fica para quando outro segmento usar o primitivo.

## Plano de implementacao sugerido

1. Criar `serviceSettings` e presets de configuracao; definir as invariantes de mesa, comanda e hibrido.
2. Criar `tabStatusEnum` e `servicePointTypeEnum` (Drizzle + Zod); pedidos reusam `saleAttendanceStatusEnum`.
3. Criar `services/drizzle/schema/service-points.ts` e `services/drizzle/schema/tabs.ts` (tabs + tabOrders), com relations e indices de concorrencia.
4. Adicionar `sales.tabId` e `saleItems.tabOrderId`; manter `comandaNumero` como snapshot.
5. Aprofundar `lib/sales/sale-pricing-validation.ts` para que POS, shop e salao usem a mesma validacao autoritativa de itens.
6. Criar o modulo de atendimento: resolver contexto/politicas; abrir e transferir tab; lancar pedido; alterar status; fechar/cancelar.
7. APIs App Router e UI autenticada responsiva: board por contas/pontos e fluxo rapido de cardapio no celular do operador.
8. Fechamento confirma a venda rascunho uma unica vez, com pagamentos reais e sessao de caixa de quem fecha.
9. Fulfillment board recebe `tabOrders` por adapter para o card comum.
10. Criar `tabOrderRequests` e paginas publicas de QR; v1 usa aprovacao do operador.
11. Extrair a composicao visual reutilizavel do cardapio de `shop`, mantendo adapters de submissao separados.
