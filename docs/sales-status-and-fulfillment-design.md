# Sales Status and Fulfillment Design

## Contexto

A venda hoje usa um unico campo `sales.status` para representar o ciclo comercial. Na confirmacao da venda, o sistema tambem dispara efeitos de ERP: lancamento contabil, transacoes financeiras, emissao fiscal automatica quando configurada e baixa de estoque.

Esse acoplamento cria ambiguidade para operacoes com preparo, separacao, retirada ou entrega, especialmente food-service e fulfillment mais detalhado.

## Decisao

Separar o status comercial da venda do status operacional de atendimento.

### Status comercial

Renomear conceitualmente `sales.status` para `statusVenda`.

Valores recomendados:

```ts
ORCAMENTO
CONDICIONAL
CONFIRMADA
CANCELADA
```

`statusVenda` responde apenas se a venda existe comercialmente e pode gerar efeitos de ERP.

### Remocao de FATURADA

`FATURADA` nao deve permanecer em `SaleStatusEnum` nesta fase.

Motivo: faturamento e inferivel pelos documentos fiscais relacionados a venda. O sistema ja possui `fiscalOutboundDocuments.status` e `fiscalOutboundDocuments.statusInterno`, que sao fontes mais precisas para saber se a venda teve NF-e/NFC-e/NFS-e emitida, autorizada, rejeitada, cancelada ou inutilizada.

Na pratica:

- venda fiscalmente autorizada: existe documento fiscal da venda com `statusInterno = "AUTORIZADO"`;
- venda com emissao pendente: existe documento com `statusInterno` pendente/processando;
- venda com erro fiscal: existe documento com `statusInterno = "REJEITADO"` ou `"ERRO"`;
- venda sem faturamento fiscal: nao existe documento fiscal aplicavel.

Manter `FATURADA` em `statusVenda` criaria uma segunda fonte de verdade e exigiria sincronizacao em toda emissao, rejeicao, cancelamento, inutilizacao e devolucao fiscal.

### Status de atendimento

Adicionar um novo enum em vendas:

```ts
statusAtendimento
```

Valores iniciais recomendados:

```ts
NAO_INICIADO
EM_PREPARO
PRONTO
EM_ENTREGA
ENTREGUE
PARCIALMENTE_ENTREGUE
CANCELADO
```

`statusAtendimento` responde em que etapa operacional o pedido esta. Ele nao substitui o status comercial, financeiro ou fiscal.

## Financeiro

Nao adicionar `statusFinanceiro` persistido em `sales` neste momento.

O status financeiro deve ser calculado a partir das `financialTransactions` ligadas ao `accountingEntries` da venda:

```ts
PENDENTE
PARCIALMENTE_RECEBIDA
RECEBIDA
EM_ATRASO
```

Base de calculo:

- `dataEfetivacao != null`: transacao recebida/efetivada;
- `dataEfetivacao == null && dataPrevisao < now`: transacao em atraso;
- soma efetivada menor que o total da venda: parcialmente recebida;
- soma efetivada igual ou maior que o total da venda: recebida.

Se for necessario performance para filtros e dashboards, um cache sincronizado pode ser criado depois. Ele nao deve ser a fonte primaria.

## Fiscal

Nao adicionar `statusFiscal` persistido em `sales` neste momento.

O status fiscal deve ser calculado pelos documentos fiscais da venda. O modulo fiscal ja possui ciclo proprio mais detalhado do que um campo simples em vendas.

Na UI, a venda pode exibir um badge fiscal derivado:

```ts
NAO_EMITIDO
PENDENTE
EM_PROCESSAMENTO
AUTORIZADO
REJEITADO
CANCELADO
INUTILIZADO
ERRO
```

Esse badge deve ser apenas apresentacional ou derivado em query/service.

## Itens da venda

Adicionar rastreabilidade operacional minima nos itens:

```ts
quantidadeReservada
quantidadeSeparada
quantidadeEntregue
quantidadeCancelada
```

Nao adicionar `quantidadeProduzida` agora, a menos que a interface realmente precise controlar producao por item. Para a primeira versao, `statusAtendimento = "EM_PREPARO"` no nivel da venda cobre a maior parte do caso food-service com menos complexidade.

## Estoque

A confirmacao da venda nao deve significar obrigatoriamente baixa fisica de estoque.

Modelo recomendado:

- `statusVenda = "CONFIRMADA"`: venda comercialmente aceita;
- confirmacao pode reservar estoque, quando rastreamento estiver ativo;
- separacao/entrega deve ser o gatilho para baixa fisica, conforme regra operacional;
- baixas devem continuar registradas em `productStockTransactions`.

Isso evita que pedidos em preparo ou aguardando entrega consumam saldo fisico antes da operacao real.

## Complexidade Visivel ao Usuario

O usuario nao deve precisar gerenciar quatro status manualmente.

Tela de pedidos/pipeline:

- mostrar e permitir alterar `statusAtendimento`;
- mostrar `statusVenda` como contexto discreto;
- mostrar status financeiro e fiscal como badges derivados;
- evitar controles manuais para status financeiro/fiscal dentro da venda.

Fonte de verdade por eixo:

| Eixo | Fonte primaria |
| --- | --- |
| Comercial | `sales.statusVenda` |
| Atendimento | `sales.statusAtendimento` |
| Financeiro | `financialTransactions` |
| Fiscal | `fiscalOutboundDocuments` |
| Estoque | `productStockTransactions` + quantidades operacionais do item |

## Integracoes: Dumb Receiver, Smart Creator

O principio para integracoes deve continuar sendo:

```txt
Dumb receiver, smart creator.
```

Ou seja:

- vendas vindas de integracoes externas devem ser recebidas com o minimo de interpretacao possivel;
- vendas criadas internamente pelo ERP/POS/loja devem gerar a cadeia operacional, contabil, financeira, fiscal e de estoque conforme as regras da plataforma.

### Vendas externas

Para vendas com `processamentoOrigem = "EXTERNO"`:

- nao gerar lancamento contabil automaticamente;
- nao gerar transacoes financeiras automaticamente, exceto quando a integracao trouxer informacao confiavel e houver rotina propria de importacao financeira;
- nao emitir documento fiscal automaticamente;
- nao baixar estoque automaticamente;
- nao tentar inferir pipeline operacional detalhado quando a integracao nao fornece esse dado.

Mapeamento conservador recomendado:

```ts
statusVenda = mapExternalCommercialStatus(externalStatus)
statusAtendimento = mapExternalFulfillmentStatus(externalFulfillmentStatus) ?? "NAO_INICIADO"
```

Se a integracao trouxer apenas uma venda ja concluida, sem granularidade operacional, usar:

```ts
statusVenda = "CONFIRMADA"
statusAtendimento = "ENTREGUE"
```

apenas quando houver sinal confiavel de conclusao, por exemplo status externo entregue/finalizado/concluido. Caso contrario, manter `statusAtendimento = "NAO_INICIADO"` ou um valor neutro equivalente.

### Vendas internas

Para vendas com `processamentoOrigem = "INTERNO"`:

- `statusVenda` e `statusAtendimento` sao controlados pela plataforma;
- confirmacao cria lancamento contabil e transacoes financeiras;
- emissao fiscal automatica pode ser enfileirada conforme configuracao da organizacao;
- estoque deve ser reservado/baixado conforme fluxo operacional definido pela plataforma;
- badges financeiro e fiscal sao derivados das entidades geradas pela propria plataforma.

### Mapeamento de status externos

Cada conector deve ter um mapper explicito. Nao espalhar regras de traducao de status externo dentro de APIs ou componentes.

Exemplo:

```ts
function mapExternalCommercialStatus(status: string): TSaleStatus {
	switch (status) {
		case "draft":
		case "pending":
			return "ORCAMENTO";
		case "confirmed":
		case "paid":
		case "completed":
			return "CONFIRMADA";
		case "cancelled":
			return "CANCELADA";
		default:
			return "CONFIRMADA";
	}
}

function mapExternalAttendanceStatus(status?: string | null): TSaleAttendanceStatus | null {
	switch (status) {
		case "preparing":
			return "EM_PREPARO";
		case "ready":
			return "PRONTO";
		case "out_for_delivery":
			return "EM_ENTREGA";
		case "delivered":
		case "completed":
			return "ENTREGUE";
		case "cancelled":
			return "CANCELADO";
		default:
			return null;
	}
}
```

O fallback deve ser conservador. E melhor mostrar menos pipeline do que inventar uma etapa operacional que a integracao nao garantiu.

### Dados fiscais externos

Quando a integracao trouxer documento fiscal externo:

- armazenar os dados fiscais como documento fiscal recebido/importado quando houver suporte;
- nao usar `statusVenda = "FATURADA"`;
- o badge fiscal da venda deve continuar sendo derivado do documento fiscal relacionado.

Se a integracao trouxer apenas campos legados como `chave`, `documento`, `modelo`, `serie` e `situacao`, eles podem continuar sendo persistidos como snapshot historico da venda, mas nao devem virar fonte primaria do novo status fiscal.

### Dados financeiros externos

Quando a integracao trouxer pagamentos/recebimentos:

- se houver dados estruturados de parcelas, vencimento e recebimento, importar como `financialTransactions` em rotina propria;
- se houver apenas valor total pago ou status textual, manter como snapshot/metadado da venda ou mapper especifico;
- nao marcar manualmente um `statusFinanceiro` em vendas.

O status financeiro apresentado ao usuario deve continuar derivado das transacoes financeiras existentes. Se a integracao nao popula transacoes financeiras, a venda pode aparecer sem status financeiro operacional ou com status derivado "NAO_GERADO".

### Estoque em vendas externas

Vendas externas nao devem baixar estoque local automaticamente.

Motivo: o ERP externo provavelmente ja controla o estoque oficial. Baixar novamente no RecompraCRM pode duplicar o efeito.

Se uma organizacao usar integracao externa apenas como canal de venda, mas quiser que o RecompraCRM seja o estoque oficial, isso deve ser uma configuracao explicita por organizacao/conector, nao comportamento padrao.

## Plano de Implementacao Sugerido

1. Criar enum `saleAttendanceStatusEnum` e Zod equivalente.
2. Migrar `sales.status` para `statusVenda` ou introduzir alias gradual, conforme custo de migracao.
3. Remover `FATURADA` de `SaleStatusEnum` se nao houver dados reais dependentes desse valor.
4. Adicionar `sales.statusAtendimento` com default `NAO_INICIADO`.
5. Adicionar campos operacionais em `saleItems`.
6. Criar helpers para status financeiro e fiscal derivados.
7. Ajustar a confirmacao da venda para nao baixar estoque fisico obrigatoriamente.
8. Atualizar a UI de pedidos para operar pelo `statusAtendimento`.

## Pontos de Refactor

### Schema e enums

Arquivos principais:

- `services/drizzle/schema/enums.ts`
- `schemas/enums.ts`
- `services/drizzle/schema/sales.ts`

Mudancas:

- Renomear o campo Drizzle `sales.status` para `sales.statusVenda`, mantendo a coluna como `status_venda` em nova migracao.
- Criar `saleAttendanceStatusEnum`.
- Adicionar `sales.statusAtendimento`.
- Remover `FATURADA` do enum comercial, se nao houver registros reais usando esse valor.
- Adicionar nos itens de venda:

```ts
quantidadeReservada
quantidadeSeparada
quantidadeEntregue
quantidadeCancelada
```

Observacao de migracao:

- registros existentes com `status = "FATURADA"` devem ser migrados para `statusVenda = "CONFIRMADA"`;
- o faturamento desses registros deve ser lido dos documentos fiscais relacionados;
- registros sem status operacional devem receber `statusAtendimento = "NAO_INICIADO"`, exceto vendas ja confirmadas antigas que podem ser inicializadas como `ENTREGUE` apenas se houver criterio confiavel.

### Processamento de confirmacao da venda

Arquivos principais:

- `lib/sale-processing/process-sale-confirmation.ts`
- `lib/sale-processing/process-stock-deduction.ts`
- `lib/sale-processing/index.ts`

Mudancas:

- Trocar verificacoes de `sale.status` para `sale.statusVenda`.
- Na confirmacao, atualizar `statusVenda = "CONFIRMADA"`.
- Definir `statusAtendimento` inicial conforme modalidade:

```ts
PRESENCIAL -> ENTREGUE ou PRONTO, conforme regra de produto
RETIRADA -> PRONTO
ENTREGA -> EM_PREPARO ou PRONTO
COMANDA -> EM_PREPARO
```

- Remover a baixa fisica obrigatoria de estoque do fluxo de confirmacao.
- Manter `processStockDeduction` como helper, mas chama-lo a partir do evento operacional correto, por exemplo entrega/separacao.
- Se for necessario reservar estoque na confirmacao, criar fluxo separado de reserva. Nao reaproveitar `productStockTransactions` de `SAIDA` para reserva, porque `SAIDA` representa movimentacao fisica.

### Novo fluxo operacional de atendimento

Arquivos esperados:

- `app/api/pos/sales/attendance-status/route.ts` ou rota equivalente em `app/api/sales/**`
- `lib/sale-processing/process-sale-attendance-status-change.ts`

Responsabilidades:

- validar transicoes de `statusAtendimento`;
- atualizar quantidades operacionais nos itens quando aplicavel;
- executar baixa de estoque somente quando a transicao exigir saida fisica;
- impedir baixa duplicada verificando itens/quantidades ja entregues ou transacoes de estoque existentes;
- manter mensagens de API em portugues.

Exemplo de transicoes iniciais:

```ts
NAO_INICIADO -> EM_PREPARO
EM_PREPARO -> PRONTO
PRONTO -> EM_ENTREGA
EM_ENTREGA -> ENTREGUE
PRONTO -> ENTREGUE
```

Cancelamentos devem tratar separadamente:

- cancelamento comercial da venda (`statusVenda = "CANCELADA"`);
- cancelamento operacional do atendimento (`statusAtendimento = "CANCELADO"`);
- estorno financeiro, fiscal e estoque quando aplicavel.

### APIs de venda e pedidos

Arquivos principais:

- `app/api/sales/route.ts`
- `app/api/pos/sales/confirm/route.ts`
- `app/api/pos/sales/create-and-confirm/route.ts`
- `app/api/pos/sales/cancel/route.ts`
- `app/api/shop/orders/route.ts`
- `app/api/shop/[orgId]/orders/route.ts`

Mudancas:

- Substituir filtros e retornos baseados em `status` por `statusVenda`.
- Adicionar filtros opcionais por `statusAtendimento` nas listagens de pedidos/pipeline.
- Ajustar `shop/orders` para nao usar `sales.status` como status principal do pipeline.
- Atualizar schemas locais que ainda declaram manualmente:

```ts
z.enum(["ORCAMENTO", "CONDICIONAL", "CONFIRMADA", "FATURADA", "CANCELADA"])
```

para usar o enum compartilhado sem `FATURADA`.

### Queries e mutations client-side

Arquivos principais:

- `lib/queries/sales.ts`
- `lib/mutations/sales.ts`
- queries/mutations de shop orders, se existirem

Mudancas:

- Renomear parametros `status` de venda para `statusVenda`.
- Adicionar parametros de filtro por `statusAtendimento`.
- Criar mutation fina para atualizar `statusAtendimento`.
- Nao criar mutation para `statusFinanceiro` ou `statusFiscal`, pois esses devem ser derivados.

### UI de vendas e pipeline

Arquivos principais:

- `app/dashboard/commercial/sales/sales-page.tsx`
- `app/dashboard/commercial/sales/[id]/sale-by-id-page.tsx`
- telas de shop/pedidos/pipeline em desenvolvimento

Mudancas:

- Mostrar `statusVenda` como informacao comercial discreta.
- Usar `statusAtendimento` como eixo principal do pipeline.
- Mostrar status financeiro derivado das transacoes.
- Mostrar status fiscal derivado de `documentosFiscais`.
- Evitar controles manuais para financeiro/fiscal dentro da venda.

### Dependencias e buscas obrigatorias antes da migracao

Antes de implementar, buscar todos os usos:

```bash
rg "sales\.status|sale\.status|status: \"ORCAMENTO\"|status: \"CONFIRMADA\"|FATURADA|SaleStatusEnum"
```

Tambem revisar usos de status em documentacao e filtros:

```bash
rg "status" app/api/shop app/api/pos app/api/sales lib/queries lib/mutations app/dashboard/commercial/sales
```

Qualquer retorno de API que hoje exponha `status` para venda deve ser migrado para `statusVenda` ou, se houver compatibilidade temporaria, documentado como alias legado.
