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

## Fidelidade

### Clube de beneficios (`benefitClub`)

Identidade institucional duravel que governa organizacoes participantes, membros e programas de fidelidade. O caso mono-organizacao e um clube com uma unica participante.

### Programa de fidelidade (`loyaltyProgram`)

Contrato economico vigente do clube. Opera exclusivamente com cashback ou pontos e define politicas e recompensas uniformes para todas as organizacoes participantes.

### Membro do clube (`loyaltyMember`)

Identidade do consumidor no escopo do clube, reconhecida por telefone verificado. Pode se vincular a diferentes cadastros locais de cliente e possui uma unica conta por programa.

### Lote de credito (`loyaltyCreditLot`)

Credito consumivel com quantidade original, organizacao emissora e eventual expiracao. Debitos registram alocacoes imutaveis contra um ou mais lotes na ordem de expiracao e criacao.

### Compensacao de fidelidade (`loyaltySettlementEntry`)

Posicao economica imutavel que identifica quanto uma organizacao deve pagar ou receber por emissao, resgate, expiracao, ajuste ou reversao no programa.
