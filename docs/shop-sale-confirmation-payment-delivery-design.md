# Shop Sale Confirmation, Payment, Delivery, and Cancellation Design

## Contexto

A loja digital em `/shop/[orgId]` cria pedidos públicos para retirada ou entrega. Esses pedidos representam vendas comerciais reais que devem entrar imediatamente no fluxo operacional da organização.

O fluxo atual possui uma inconsistência:

- `app/api/shop/[orgId]/orders/route.ts` pode gravar a venda como `CONFIRMADA`;
- a rota não executa todos os efeitos de confirmação existentes em `lib/sale-processing/process-sale-confirmation.ts`;
- cashback, lançamento contábil, transações financeiras e emissão fiscal podem ficar inconsistentes;
- o checkout interno ainda trata pedidos do `SHOP` como rascunhos `ORCAMENTO`.

Este documento formaliza o fluxo desejado para pedidos do `SHOP`, incluindo confirmação automática, pagamento no local, atendimento, cashback, fiscal, idempotência e cancelamento.

## Decisões Fechadas

- Pedidos do `SHOP` nascem como vendas `CONFIRMADA`.
- Pedidos do `SHOP` nascem com `statusAtendimento = "NAO_INICIADO"`.
- Processos públicos do `SHOP` podem registrar autoria nula.
- O cliente informa uma intenção de método de pagamento no checkout público.
- Pagamentos na retirada ou entrega nascem como transações financeiras pendentes.
- O resgate de cashback é consumido na confirmação do pedido.
- O acúmulo de cashback ocorre somente após o recebimento integral da venda.
- A transição para `ENTREGUE` deve exigir recebimento integral, salvo exceção explícita e autorizada.
- A emissão fiscal automática ocorre somente quando a venda estiver `ENTREGUE` e integralmente paga.
- A emissão fiscal manual continua disponível apenas para usuários com permissão `fiscal.emitir`.
- Pedidos públicos devem ser idempotentes.
- O cancelamento de vendas confirmadas deve reverter cashback, financeiro e demais efeitos aplicáveis.

## Fontes De Verdade

| Eixo | Fonte primária |
| --- | --- |
| Comercial | `sales.statusVenda` |
| Atendimento | `sales.statusAtendimento` |
| Financeiro | `financialTransactions` ligadas aos `accountingEntries` da venda |
| Fiscal | `fiscalOutboundDocuments` |
| Estoque | `productStockTransactions` e quantidades operacionais dos itens |
| Cashback | `cashbackProgramTransactions` e `cashbackProgramBalances` |
| Idempotência do pedido público | Nova tabela de requisições idempotentes do `SHOP` |

Não deve ser criado um `statusFinanceiro` ou `statusFiscal` persistido em `sales`. Esses estados continuam derivados.

## Ciclo De Vida Do Pedido

### Criação Pública

Ao concluir o checkout público:

```txt
SHOP checkout
  -> valida catálogo, disponibilidade, cliente, entrega e cashback
  -> cria venda e itens
  -> confirma comercialmente a venda
  -> cria lançamento contábil
  -> cria transação financeira pendente
  -> consome resgate de cashback, quando solicitado
  -> não acumula cashback
  -> não baixa estoque
  -> não emite documento fiscal automaticamente
  -> disponibiliza o pedido no quadro de atendimento
```

Estado esperado:

```ts
{
  statusVenda: "CONFIRMADA",
  statusAtendimento: "NAO_INICIADO",
  canal: "SHOP",
  processamentoOrigem: "INTERNO",
}
```

### Atendimento

O pedido segue o fluxo operacional existente:

```txt
NAO_INICIADO -> EM_PREPARO -> PRONTO -> EM_ENTREGA -> ENTREGUE
```

Para retirada, `EM_ENTREGA` pode ser ignorado conforme as transições válidas existentes.

### Recebimento E Entrega

Quando houver valor pendente, a operação principal deve ser:

```txt
Confirmar pagamento e entregar
```

Essa operação deve:

1. validar a venda e suas transações financeiras;
2. permitir confirmar ou corrigir método e conta financeira;
3. efetivar as transações pendentes aplicáveis;
4. validar que a venda ficou integralmente recebida;
5. acumular cashback de forma idempotente;
6. alterar o atendimento para `ENTREGUE`;
7. executar a baixa física de estoque;
8. solicitar emissão fiscal automática, quando configurada.

Uma ação separada de `Entregar sem receber` pode existir, mas deve exigir permissão explícita e registrar autoria. Essa exceção não acumula cashback e não dispara emissão fiscal automática enquanto a venda não estiver integralmente paga.

## Checkout Público E Intenção De Pagamento

Adicionar uma etapa `PAGAMENTO` antes da revisão final.

O estado do frontend pode conter informações auxiliares não persistidas de forma estruturada:

```ts
payment: {
  metodo: "DINHEIRO" | "PIX" | "CARTAO_DEBITO" | "CARTAO_CREDITO";
  observacoes: string;
  precisaTroco: boolean;
  trocoPara: number | null;
}
```

O método deve permanecer estruturado no payload e na transação financeira. Troco e texto livre podem ser concatenados em `observacoes`.

Exemplo:

```ts
{
  pagamento: {
    metodo: "DINHEIRO",
    observacoes: "Troco para R$ 100,00. Cliente solicita entrega na portaria."
  }
}
```

### Métodos Permitidos

Adicionar em `ShopSettingsConfigurationSchema` uma configuração de métodos de pagamento aceitos no `SHOP`.

Os métodos públicos devem ser um subconjunto conservador de `PaymentMethodEnum`, inicialmente:

```ts
["DINHEIRO", "PIX", "CARTAO_DEBITO", "CARTAO_CREDITO"]
```

Não expor automaticamente todos os métodos habilitados no POS. Métodos como `FIADO_NOTA`, `CASHBACK`, `VALE`, `BOLETO`, `TRANSFERENCIA`, `A_DEFINIR` e `OUTRO` exigem regras próprias antes de serem disponibilizados publicamente.

## Persistência Do Pagamento

Na confirmação do pedido do `SHOP`, criar uma transação financeira com:

```ts
{
  metodo: pagamento.metodo,
  valor: sale.valorTotal,
  efetivacaoTipo: "PENDENTE",
  dataPrevisao: data estimada da retirada ou entrega,
  observacoes: pagamento.observacoes,
}
```

Regras:

- `dataEfetivacao` deve permanecer nula;
- `provedorStatus` deve representar pendência;
- a conta financeira pode usar o padrão configurado para o método;
- a transação deve aparecer como `A receber` no status financeiro derivado;
- o snapshot da intenção de pagamento também pode permanecer em `rascunhoMetadados.shop.pagamento`.

## Cashback

### Resgate

O resgate solicitado pelo cliente deve ser consumido durante a confirmação automática do pedido.

Motivo: apenas validar o saldo permitiria que o mesmo cashback fosse usado em múltiplos pedidos simultâneos.

Requisitos:

- validar programa ativo e modalidade de desconto;
- validar limite de resgate;
- consumir saldo via FIFO;
- registrar transação `RESGATE` vinculada à venda;
- garantir idempotência por venda.

### Acúmulo

O acúmulo deve ocorrer somente quando a venda estiver integralmente recebida.

Requisitos:

- não acumular durante a criação pública;
- acumular após a efetivação integral do pagamento;
- registrar origem `SHOP`;
- garantir que uma venda não gere mais de uma transação de acúmulo para o mesmo programa;
- não acumular em vendas canceladas;
- não acumular quando a venda for entregue sem recebimento.

## Emissão Fiscal

### Emissão Automática

A emissão fiscal automática deve ocorrer somente quando todas as condições forem atendidas:

```txt
organization.fiscalEmissaoAutomatica === true
AND sale.statusVenda === "CONFIRMADA"
AND sale.statusAtendimento === "ENTREGUE"
AND sale está integralmente paga
AND ainda não existe documento fiscal aplicável já solicitado
```

O disparo deve continuar assíncrono por fila, sem bloquear a conclusão operacional em caso de falha da SEFAZ ou do provedor.

### Emissão Manual

A emissão manual pode ser solicitada por usuário autenticado com permissão:

```ts
session.membership.permissoes.fiscal.emitir === true
```

A emissão manual não depende de `fiscalEmissaoAutomatica`. A interface deve apresentar claramente quando a venda ainda não está entregue ou paga, mas a decisão manual permanece sob responsabilidade do usuário autorizado.

### Idempotência Fiscal

Antes de solicitar emissão automática ou manual, validar se já existe documento fiscal aplicável para a venda em estado que impeça duplicidade.

## Autoria

Processos iniciados pela rota pública do `SHOP` podem usar autoria nula:

```ts
saleAuthorId: null
```

Funções reutilizáveis devem aceitar `string | null` quando a tabela de destino permitir autoria nula.

Processos iniciados por usuários autenticados devem registrar `session.user.id`, incluindo:

- efetivação de pagamento;
- entrega sem recebimento;
- cancelamento;
- emissão fiscal manual;
- correções operacionais.

## Idempotência De Pedidos Públicos

### Problema

O cliente pode repetir o `POST` por timeout, reconexão, duplo clique ou retry automático. Sem idempotência, isso pode criar:

- vendas duplicadas;
- itens duplicados;
- resgates de cashback duplicados;
- lançamentos contábeis duplicados;
- transações financeiras duplicadas.

### Chave Idempotente

O frontend deve gerar uma chave UUID por tentativa lógica de pedido e enviá-la no payload:

```ts
{
  idempotencyKey: "uuid",
  // restante do pedido
}
```

A chave deve permanecer estável durante retries do mesmo pedido e ser renovada somente após sucesso ou alteração material do carrinho.

### Persistência Recomendada

Criar uma tabela dedicada, por exemplo `shopOrderRequests`, com:

```ts
{
  id: string;
  organizacaoId: string;
  idempotencyKey: string;
  payloadHash: string;
  status: "PROCESSANDO" | "CONCLUIDO" | "ERRO";
  vendaId: string | null;
  erro: string | null;
  dataInsercao: Date;
  dataAtualizacao: Date | null;
}
```

Adicionar restrição única:

```txt
(organizacaoId, idempotencyKey)
```

Não usar apenas `sales.idExterno` para idempotência. Esse campo também é usado por integrações e atualmente não possui garantia global de unicidade.

### Comportamento Da Rota

- primeira requisição: cria registro `PROCESSANDO` e executa o fluxo;
- retry com mesma chave e mesmo `payloadHash`, concluído: retorna a venda existente;
- retry com mesma chave e payload diferente: retorna `409 Conflict`;
- retry enquanto `PROCESSANDO`: retorna conflito temporário ou aguarda resultado por política definida;
- falha antes da conclusão: registra `ERRO` sem criar efeitos parciais não rastreáveis;
- retry após `ERRO`: pode reprocessar de forma controlada.

Além da idempotência da requisição, cada efeito deve ser idempotente por venda:

- um lançamento contábil de origem venda;
- uma intenção financeira equivalente;
- um resgate de cashback;
- um acúmulo de cashback;
- uma baixa de estoque;
- uma solicitação fiscal aplicável.

## Cancelamento De Venda Confirmada

Criar um processo centralizado, por exemplo:

```ts
processConfirmedSaleCancellation()
```

Ele deve receber organização, venda, motivo e autor.

### Validações

- a venda pertence à organização;
- a venda está `CONFIRMADA`;
- a venda ainda pode ser cancelada;
- documentos fiscais autorizados exigem tratamento fiscal compatível;
- estoque já baixado exige movimentação de estorno;
- pagamentos recebidos exigem estorno financeiro.

### Efeitos Do Cancelamento

1. alterar `statusVenda` para `CANCELADA`;
2. alterar `statusAtendimento` para `CANCELADO`;
3. reverter transações de cashback com `reverseSaleCashback`;
4. cancelar transações financeiras pendentes;
5. estornar transações financeiras efetivadas;
6. criar lançamento contábil de estorno, quando aplicável;
7. estornar baixa de estoque, quando aplicável;
8. cancelar documento fiscal autorizado ou impedir cancelamento até tratamento fiscal;
9. registrar motivo e autoria.

### Ajustes Necessários No Financeiro Derivado

O status financeiro derivado deve ignorar transações canceladas ou estornadas.

Hoje, apenas `dataEfetivacao` é considerada por `computeSaleFinancialStatus`. O fluxo de cancelamento deve definir e respeitar estados como:

```txt
PENDENTE
APROVADO
CANCELADO
ESTORNADO
```

Transações canceladas ou estornadas não podem manter a venda como `RECEBIDA` ou `PENDENTE`.

## Arquitetura De Processamento

`processSaleConfirmation` deve deixar de concentrar todas as regras em uma única função indivisível.

Separar responsabilidades em processos menores:

```ts
confirmSaleCommercialState()
createSaleAccountingEntry()
processSalePayments()
processSaleCashbackRedemption()
processSaleCashbackAccumulationIfEligible()
processSaleAutomaticFiscalEmissionIfEligible()
processSaleAttendanceStatusChange()
processConfirmedSaleCancellation()
```

Manter orquestradores específicos por caso de uso:

```ts
processPosSaleConfirmation()
processShopSaleConfirmation()
settleShopSalePaymentAndDeliver()
```

### Orquestrador Do POS

O POS pode continuar confirmando, recebendo, acumulando cashback e avaliando emissão conforme suas regras próprias.

### Orquestrador Do SHOP

O `SHOP` deve:

```txt
confirmar venda
criar contabilidade
criar pagamento pendente
consumir resgate
não acumular cashback
não emitir fiscal automaticamente
não baixar estoque
```

### Regra De Elegibilidade

Processos de acúmulo e fiscal devem consultar o estado atual da venda e de seus efeitos relacionados. Não devem depender apenas de flags enviadas pelo chamador.

## APIs E Interfaces Afetadas

### Backend

- `app/api/shop/[orgId]/orders/route.ts`
- `app/api/pos/sales/confirm/route.ts`
- `app/api/pos/sales/create-and-confirm/route.ts`
- `app/api/pos/sales/cancel/route.ts` ou nova rota de cancelamento confirmado
- `app/api/pos/sales/attendance-status/route.ts`
- `app/api/finances/financial-transactions/effect/route.ts`
- `app/api/fiscal/documents/route.ts`
- `app/api/sales/fulfillment/route.ts`
- `lib/sale-processing/process-sale-confirmation.ts`
- `lib/sale-processing/process-sale-attendance-status-change.ts`
- `lib/sales/derived-status.ts`
- `lib/cashback/reverse-sale-cashback.ts`

### Frontend Público

- `state-hooks/use-shop-order-state.tsx`
- `schemas/shop.ts`
- `app/shop/[orgId]/_components/CheckoutSheet.tsx`
- nova etapa de pagamento em `app/shop/[orgId]/_components/checkout/`
- `OrderReviewStep.tsx`
- `OrderSuccessView.tsx`

### Frontend Operacional

- `app/dashboard/commercial/sales/_components/fulfillment/fulfillment-card.tsx`
- `app/dashboard/commercial/sales/_components/fulfillment/fulfillment-board.tsx`
- `app/dashboard/commercial/shop/components/ShopOrdersQueue.tsx`

`ShopOrdersQueue` não deve continuar dependendo de pedidos `ORCAMENTO`, pois pedidos do `SHOP` passarão a nascer confirmados.

## UX Operacional

Os cards do quadro devem exibir:

- método de pagamento previsto;
- badge financeiro derivado;
- pill compacto quando houver observações;
- tooltip ou popover com o texto completo da observação;
- ação contextual para pagamento pendente.

Exemplo:

```txt
Pedido #SHOP-...
R$ 85,00
[Dinheiro] [A receber] [Observações]

Pagamento pendente: R$ 85,00
[Confirmar pagamento e entregar]
[Entregar sem receber]
```

## Migração Do Comportamento Atual

O plano anterior em `docs/dev-planning/digital-shop-operational-plan.md` define pedidos do `SHOP` como `ORCAMENTO`. Esta decisão é substituída por este documento.

Também devem ser atualizados textos que indiquem:

- "aguardando confirmação da loja";
- "a loja confirmará o desconto";
- "pedidos pendentes";
- links de checkout interno usados apenas para confirmar pedidos do `SHOP`.

## Sequência De Implementação

1. Adicionar configuração de métodos de pagamento aceitos no `ShopSettings`.
2. Adicionar schema, estado e etapa pública de pagamento.
3. Adicionar infraestrutura de idempotência para pedidos do `SHOP`.
4. Separar os processos reutilizáveis de confirmação de venda.
5. Criar o orquestrador de confirmação automática do `SHOP`.
6. Criar pagamento pendente e consumo idempotente de cashback.
7. Criar processo de recebimento integral, acúmulo e entrega.
8. Aplicar trava backend para entrega com pagamento pendente.
9. Aplicar emissão fiscal automática somente após entrega e pagamento.
10. Criar cancelamento centralizado com reversões.
11. Atualizar cards, fila, observações e textos do frontend.
12. Adicionar testes de integração e regressão.

## Testes De Aceitação

### Criação E Idempotência

- criar pedido do `SHOP` gera uma única venda confirmada;
- retry com mesma chave retorna a mesma venda;
- mesma chave com payload diferente retorna conflito;
- pedido cria um único lançamento contábil;
- pedido cria uma única transação financeira pendente;
- pedido com resgate consome cashback uma única vez.

### Pagamento E Entrega

- pedido pendente aparece como `A receber`;
- pedido não pode ser entregue pela rota padrão enquanto houver saldo pendente;
- confirmar pagamento e entregar efetiva o financeiro;
- confirmar pagamento e entregar acumula cashback uma única vez;
- confirmar pagamento e entregar baixa estoque uma única vez;
- entregar sem receber não acumula cashback;
- pagamento posterior de pedido entregue sem recebimento acumula cashback quando integral.

### Fiscal

- pedido confirmado e não entregue não gera emissão automática;
- pedido entregue e não pago não gera emissão automática;
- pedido entregue e pago gera emissão automática quando configurada;
- emissão automática não duplica documento;
- emissão manual exige permissão `fiscal.emitir`.

### Cancelamento

- cancelamento reverte resgate e acúmulo de cashback;
- cancelamento cancela financeiro pendente;
- cancelamento estorna financeiro efetivado;
- cancelamento não deixa venda aparecendo como recebida;
- cancelamento estorna estoque quando já houver baixa;
- cancelamento respeita restrições de documento fiscal autorizado.

## Fora De Escopo Inicial

- pagamento online nativo;
- autorização ou captura por adquirente;
- split de pagamento público;
- pagamento parcial público;
- múltiplos métodos de pagamento no checkout público;
- reserva formal de estoque;
- cálculo de taxa de entrega;
- conciliação automática de recebíveis.

