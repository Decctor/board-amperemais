# Planejamento — Lancamentos Contabeis de Perdas e Descartes de Estoque

## Visao Geral

Hoje o sistema gera lancamentos contabeis automaticos para vendas (`VENDA`),
compras (`COMPRA`), estornos (`ESTORNO`), transferencias (`TRANSFERENCIA`) e
conciliacao (`CONCILIACAO`). Descartes de lotes de estoque
(`POST /api/products/stock-lots/discard`) apenas movimentam o estoque fisico
(`applyStockMovement` com tipo `DESCARTE`) e atualizam o lote — nenhum
lancamento contabil e criado.

Consequencia contabil: a conta **1.3 Estoques** e debitada nas compras
(`compras: { debitoKey: "estoques" }`) e nunca e creditada quando mercadoria e
perdida ou descartada. O ativo fica superavaliado e a perda nao aparece como
despesa no resultado.

Este plano introduz o lancamento automatico de perda no fluxo de descarte:

> **Debito**: Perdas de Estoque (despesa) · **Credito**: Estoques (ativo)
> **Valor**: quantidade descartada × custo unitario

## Estado atual relevante

| Peca | Onde | Observacao |
| --- | --- | --- |
| Enum de origem | `accountingEntryOriginTypeEnum` em `services/drizzle/schema/enums.ts` (espelho Zod em `schemas/enums.ts`) | Sem valor para perdas |
| Plano de contas padrao | `RecompraCRMDefaultAccountCharts` em `config/onboarding.tsx` | Nao existe conta de perdas; Despesas vai ate 6.4 |
| Padroes de lancamento | `configuracao.defaults.contabilidade.lancamentosPadrao.{vendas,compras,transferencias}` em `schemas/organizations.ts` | Cada bloco guarda `debitoContaId/Key` + `creditoContaId/Key` |
| Resolucao de contas | `resolvePurchaseAccountingAccountIds` em `app/api/purchases/route.ts` | ID da config → fallback por key→codigo via `getDefaultAccountChartCodeByKey` |
| Descarte de lote | `app/api/products/stock-lots/discard/route.ts` | Transacao unica; passa `unitCost: null`; `applyStockMovement` retorna `previousUnitCost` (custo medio atual do produto/variante) |
| Custo do lote | `productStockLots` | O lote **nao** guarda custo unitario; custo vive em `products.precoCusto` / `productVariants.precoCusto` (media movel) e na origem (item de compra / producao) |
| Lancamento sem transacoes | `getAccountingEntryBalanceError` em `lib/finances/accounting-entry-balance.ts` | Lancamento sem transacoes financeiras e explicitamente valido — perfeito para perda (evento nao-caixa) |

## Decisoes de Modelagem

### 1. Nova origem `PERDA_ESTOQUE`

Adicionar `"PERDA_ESTOQUE"` ao `accountingEntryOriginTypeEnum` (pgEnum) e ao
espelho em `schemas/enums.ts`. Migration de `ALTER TYPE ... ADD VALUE` seguindo
o padrao dos arquivos em `drizzle/` (ex.: `0047_purchase_accounting_entry_origin.sql`).

Nao reutilizar `MANUAL`: filtros, relatorios e a UI de lancamentos dependem da
origem para rotular e travar edicao.

### 2. Nova conta padrao no plano de contas

Novo no em `RecompraCRMDefaultAccountCharts`, sob Despesas:

```
{ key: "perdas_estoque", nome: "Perdas de Estoque", codigo: "6.5", natureza: "DESPESA" }
```

### 3. Novo bloco de padroes `perdasEstoque`

Em `OrganizationDefaultsSchema.contabilidade.lancamentosPadrao`, adicionar
`perdasEstoque` com o mesmo shape dos demais e `.default({ nulls })` — mesmo
padrao usado quando `transferencias` foi adicionado depois do lancamento
inicial, para que configs ja persistidas continuem parseando.

Defaults do produto (`RecompraCRMDefaultAccountingDefaults`):

```
perdasEstoque: { debitoKey: "perdas_estoque", creditoKey: "estoques" }
```

E estender `buildOrganizationAccountingDefaults` para que novas organizacoes
ja nascam com os IDs resolvidos.

### 4. Resolucao de contas com auto-provisionamento

Extrair um resolvedor compartilhado em `lib/finances/` (ex.:
`resolve-accounting-default-accounts.ts`), generalizando a logica de
`resolvePurchaseAccountingAccountIds`:

1. usar `debitoContaId`/`creditoContaId` da config, se validos;
2. fallback por `debitoContaKey`/`creditoContaKey` → codigo
   (`getDefaultAccountChartCodeByKey`) → busca por codigo no plano da org;
3. **novo**: se a conta do seed nao existir no plano da org (organizacoes
   onboardadas antes deste plano nao terao a `6.5`), criar a conta na hora, de
   forma idempotente (busca por codigo dentro da transacao), pendurada na conta
   pai `Despesas` (codigo `6`) quando existir.

O passo 3 evita que um fluxo operacional (descarte no balcao) falhe por
configuracao contabil ausente. A conta continua sobrescrevivel nas
configuracoes.

Migrar `resolvePurchaseAccountingAccountIds` para o helper compartilhado na
mesma PR (mantendo comportamento) para nao duplicar a cadeia de fallback.

### 5. Valor da perda: custo medio movel

Fonte do custo unitario, em ordem:

1. `previousUnitCost` retornado por `applyStockMovement` (o `precoCusto` da
   media movel do produto/variante no momento do descarte) — consistente com o
   metodo de custeio do sistema (`computeNextUnitCost`);
2. fallback: custo de origem do lote (item de compra vinculado via
   `compraItemId`, ou `custoUnitario` da producao vinculada);
3. sem custo conhecido (`null`/`0`): **nao criar lancamento** e registrar o
   motivo no retorno — um lancamento de valor zero e ruido contabil.

Passar o custo resolvido tambem como `unitCost` da movimentacao para que
`custoUnitarioMovimentado` fique preenchido em `productStockTransactions` e a
movimentacao e o lancamento contem a mesma historia.

### 6. Rastreabilidade: coluna `loteId` no lancamento

Adicionar `lote_id` (nullable, `references(() => productStockLots.id, { onDelete: "set null" })`,
com indice) em `accountingEntries`, espelhando o padrao de `vendaId`. Permite:

- exibir o lancamento na pagina do lote (`/dashboard/inventory/lots/[lotId]`);
- consultas de perdas por lote/produto;
- idempotencia de eventuais reprocessamentos.

`anotacoes` recebe o `motivo` do descarte; `titulo` no padrao
`DESCARTE LOTE #<codigoLote ?? id> - <quantidade>` (mesmo estilo `VENDA #id`).

### 7. Sem transacoes financeiras

Perda nao movimenta caixa. O lancamento nasce sem `financialTransactions`, o
que `getAccountingEntryBalanceError` ja permite. Verificar que
`app/api/finances/stats/route.ts` e as listagens tratam lancamentos sem
transacoes (padrao ja exercitado por lancamentos manuais nao programados).

## Etapas de Implementacao

1. **Enums + migrations**
   - `services/drizzle/schema/enums.ts`: `PERDA_ESTOQUE` no
     `accountingEntryOriginTypeEnum`.
   - `schemas/enums.ts`: espelho Zod.
   - `services/drizzle/schema/financial.ts`: coluna `loteId` + relation +
     indice em `accountingEntries` (e relation inversa em `productStockLots`).
   - Migration SQL: `ALTER TYPE ... ADD VALUE` + `ALTER TABLE ... ADD COLUMN`.

2. **Seed e defaults** (`config/onboarding.tsx`)
   - No `perdas_estoque` (6.5) no plano padrao.
   - `RecompraCRMDefaultAccountingDefaults.lancamentosPadrao.perdasEstoque`.
   - `buildOrganizationAccountingDefaults` com o novo bloco.

3. **Schema da organizacao** (`schemas/organizations.ts`)
   - Bloco `perdasEstoque` em `lancamentosPadrao`, com `.default()`.

4. **Resolvedor compartilhado** (`lib/finances/resolve-accounting-default-accounts.ts`)
   - Cadeia config-ID → key→codigo → auto-provisionamento idempotente.
   - Testes unitarios (o repo ja usa `*.test.ts`, ex.:
     `lib/payments/resolve-payment-financial-account.test.ts`).
   - Adotar no `app/api/purchases/route.ts`.

5. **Rota de descarte** (`app/api/products/stock-lots/discard/route.ts`)
   - Resolver custo unitario (media movel → origem do lote).
   - Passar `unitCost` ao `applyStockMovement`.
   - Criar o lancamento `PERDA_ESTOQUE` na mesma transacao, com `loteId`,
     `anotacoes = motivo`, `dataCompetencia = new Date()`.
   - Retornar no payload o resumo do lancamento criado (id, valor) — ou o
     motivo de nao ter sido criado (sem custo).

6. **UI**
   - `utils/select-options.tsx`: opcao `PERDA_ESTOQUE` em
     `AccountingEntryOriginTypeOptions` (icone `Trash2`, tom laranja).
   - `components/Modals/AccountingEntries/ControlAccountingEntry.tsx`: permitir
     edicao de anotacoes (como `VENDA`/`COMPRA`), contas travadas.
   - `components/Settings/SettingsFinances.tsx`: incluir `perdasEstoque` no map
     de blocos configuraveis (rotulo "Perdas de Estoque").
   - `components/Modals/Internal/StockLots/DiscardStockLot.tsx`: nota
     informativa de que o descarte gera lancamento de perda, com valor estimado
     (quantidade × custo atual) quando disponivel.

7. **Verificacoes**
   - `npx tsc --noEmit` / lint / testes.
   - Conferir filtros por origem em `app/api/finances/accounting-entries/route.ts`
     e telas de financas com a nova origem.
   - Smoke manual: descartar lote com custo, sem custo, org antiga sem conta 6.5.

## Fora do Escopo (registrar como follow-ups)

- **Ajustes manuais negativos** (`AJUSTE` em `app/api/products/route.ts` e
  `variants/route.ts`): tambem sao perda economica (quebra/roubo), mas o pedido
  cobre lotes. O resolvedor e a origem criados aqui servem direto quando formos
  cobrir ajustes.
- **Baixa automatica de vencidos**: `VENCIDO` hoje e status efetivo calculado
  na leitura; a baixa contabil do vencido acontece quando o lote e descartado
  (fluxo coberto por este plano). Um job de descarte automatico e outra
  feature.
- **CMV na venda**: a venda credita `receitas_operacionais` e debita
  `contas_receber`, sem baixar Estoques contra `custo_mercadorias_vendidas`
  (5.1, hoje sem uso). E a outra ponta do mesmo problema de superavaliacao de
  Estoques — gap maior e independente; vale plano proprio.
- **Estorno de descarte**: nao existe fluxo de "des-descartar" lote; reversao
  contabil segue manual (lancamento `MANUAL`/`ESTORNO`).
