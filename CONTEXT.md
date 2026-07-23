# Domain Context

## Food-service

### Ponto de atendimento (`servicePoint`)

Ancora operacional duravel em que um atendimento acontece, como mesa, balcao ou quiosque. Pode existir sem uma conta aberta e possui identidade/QR estavel. Nao e sinonimo de `poiTransactionRequest`: POI e um fluxo publico de solicitacoes de fidelidade/transacao.

### Conta de atendimento (`tab`)

Conta de consumo efemera que agrega pedidos ate o fechamento. Pode estar ligada a um ponto de atendimento ou existir de forma avulsa. Em operacoes "somente mesas", a tab existe internamente, mas pode ter identificacao automatica e ficar oculta na UI.

### Pedido da conta (`tabOrder`)

Rodada operacional enviada para preparo/entrega durante uma tab. Organiza itens e status de atendimento, mas nao possui identidade comercial, financeira ou fiscal. Os efeitos comerciais acontecem na venda vinculada a tab.

### Solicitacao de pedido (`tabOrderRequest`)

Intencao enviada por um cliente em contexto publico de ponto/tab. Nao altera a conta enquanto estiver pendente. A aprovacao do operador valida novamente itens e precos e cria um `tabOrder`.

### Venda da tab

Venda interna em `ORCAMENTO` que agrega os `saleItems` de todos os pedidos de uma tab. E confirmada uma unica vez no fechamento, quando pagamentos, sessao de caixa, contabilidade, fiscal e cashback possuem dados definitivos.

### Configuracao de atendimento (`serviceSettings`)

Politicas por organizacao que definem se pontos e contas estao habilitados, como a conta e identificada, se o ponto e obrigatorio, quantas contas podem ficar abertas por ponto e como solicitacoes publicas sao aceitas. Presets de UI como "Somente mesas" e "Somente comandas" sao traducoes dessas politicas, nao entidades do dominio.
