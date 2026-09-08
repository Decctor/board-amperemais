# Sessões de Venda e Fechamento de Caixa — Plano de Implementação

> Atualização de 2026-09: o modelo de responsável/`escopoChave` descrito no plano original abaixo
> foi substituído. A sessão agora possui `politica` (`VENDEDOR_UNICO` ou
> `VENDEDORES_MULTIPLOS`) e `vendedorPadraoId` opcional. A venda escolhe a sessão explicitamente e
> `sales.vendedorId` é a única fonte de atribuição do vendedor. Não há política padrão por
> organização nem tabela de participantes. As referências antigas a escopo por responsável neste
> documento são mantidas apenas como histórico da primeira implementação.

> Status: planejamento aprovado, pronto para implementação.
> Conceito antes chamado de "caixas / cash sessions". Renomeado para **sessões de venda**
> (`sales_sessions`) para não acoplar o conceito exclusivamente a "caixa de balcão" —
> a mesma estrutura cobre tanto turno de vendedor quanto caixa físico.

---

## 0. Decisões fechadas

Estas decisões já estão tomadas e o resto do documento as assume:

1. **Escopo da sessão = responsável (operador/vendedor).** Sem conceito de "terminal/PDV" nesta
   versão. `escopoChave` é preenchida com o `responsavelVendedorId` na abertura. Terminal fica
   para uma fase futura (basta passar a popular `escopoChave` com o device-id).
2. **A resolução da sessão parte do cliente.** O front sabe qual sessão abriu e envia
   `sessaoVendaId` explicitamente no payload de confirmação. O servidor apenas **valida**
   (existe, está `ABERTA`, pertence à org, bate o escopo). Nada de inferência ambígua no servidor.
3. **O cálculo do esperado lê exclusivamente de `financialTransactions.sessaoVendaId`.** É a única
   fonte que também cobre sangria/suprimento (que não têm venda). `sales.sessaoVendaId` é só
   denormalização para relatório/atribuição.
4. **Estorno gera `SAIDA` de dinheiro carimbada na sessão atual.** Hoje o refund só seta
   `provedorStatus='ESTORNADO'` sem mexer no caixa; este plano inclui a geração da movimentação
   de saída para que o estorno reflita na gaveta.
5. **Bloqueio fiscal usa `statusInterno`** (`fiscalDocumentLifecycleStatusEnum`), não o `status`
   externo. Pendência = `statusInterno NOT IN ('AUTORIZADO')`.

---

## 1. Conceito e separação de responsabilidades

| Conceito | O que é | Onde vive |
|---|---|---|
| **Conta financeira** | Conta persistente ("Caixa Loja 1"). Saldo corre indefinidamente. | `financialAccounts` (tipo `CAIXA`) — já existe |
| **Sessão de venda** | Turno time-boxed sobre um responsável. Tem abertura, fundo de troco, fechamento e conferência. | `sales_sessions` — **novo** |
| **Movimento** | Cada entrada/saída de dinheiro (venda, sangria, suprimento, estorno). | `financialTransactions` — já existe, ganha `sessaoVendaId` nullable |

A sessão **não** zera nem possui o saldo da conta. Ela recorta uma janela de movimentos e guarda a
conferência física daquela janela. Fechar = comparar `Σ financialTransactions` da sessão por método
(**esperado**) vs. contagem física informada (**informado**) → **diferença**.

---

## 2. Modelagem de dados

### 2.1 Enum (`services/drizzle/schema/enums.ts`)

```ts
export const salesSessionStatusEnum = pgEnum("sales_session_status", [
  "ABERTA",     // operando
  "FECHADA",    // operador encerrou e informou contagem
  "CONFERIDA",  // gestor revisou/aprovou a diferença
  "CANCELADA",  // aberta por engano (soft-delete; nunca apagar fisicamente)
]);
```

Sangria/suprimento/estorno **não** precisam de enum próprio nem de tabela nova — reaproveitam
`accountingEntryOriginTypeEnum` (`TRANSFERENCIA`/`ESTORNO`) e `financialTransactionTypeEnum`
(`ENTRADA`/`SAIDA`).

### 2.2 Tabela `sales_sessions` (`services/drizzle/schema/sales-sessions.ts`)

Seguir convenções: `newTable` (prefixa `ampmais_`), PK `varchar(255)` com `crypto.randomUUID()`,
colunas em snake_case PT, campos Drizzle em camelCase PT.

```
sales_sessions {
  id                    varchar(255) PK
  organizacaoId         → organizations.id (cascade)            // sessao_venda... organizacao_id
  contaFinanceiraId     → financialAccounts.id (set null)       // conta CAIXA do turno (nullable p/ progressive disclosure)
  responsavelVendedorId → sellers.id (set null)                 // o "responsável" — base do escopo
  escopoChave           text NOT NULL                           // = responsavelVendedorId nesta versão (terminal no futuro)
  abertaPorUsuarioId    → users.id (set null)                   // auditoria: quem logou e abriu
  fechadaPorUsuarioId   → users.id (set null)
  conferidaPorUsuarioId → users.id (set null)
  status                salesSessionStatusEnum NOT NULL default 'ABERTA'
  saldoInicial          doublePrecision NOT NULL default 0      // fundo de troco
  dataAbertura          timestamp NOT NULL defaultNow
  dataFechamento        timestamp                               // nullable
  // snapshots congelados no fechamento (denormalizados p/ histórico imutável)
  totalEsperado         doublePrecision                         // nullable até fechar
  totalInformado        doublePrecision
  diferencaTotal        doublePrecision
  observacoesAbertura   text
  observacoesFechamento text
  dataInsercao          timestamp NOT NULL defaultNow
}
```

Índices:
- `idx_sales_sessions_organizacao_id` em `organizacaoId`
- `idx_sales_sessions_status` em `(organizacaoId, status)`
- `idx_sales_sessions_responsavel` em `responsavelVendedorId`
- **Unicidade (uma sessão aberta por escopo):** índice parcial sobre `escopoChave` (coluna estática,
  escopo dinâmico — permite trocar para terminal no futuro sem nova DDL):

```sql
CREATE UNIQUE INDEX uq_sales_sessions_aberta
  ON ampmais_sales_sessions (organizacao_id, escopo_chave)
  WHERE status = 'ABERTA';
```

> Como `CANCELADA`/`FECHADA` saem do filtro `WHERE status='ABERTA'`, o índice nunca bloqueia
> reabertura legítima para o mesmo responsável.

### 2.3 Tabela `sales_session_reconciliations` (child — conferência por método)

Uma linha por método, preenchida **no fechamento**. É o snapshot imutável da conferência.

```
sales_session_reconciliations {
  id              varchar(255) PK
  organizacaoId   → organizations.id (cascade)
  sessaoVendaId   → sales_sessions.id (cascade)
  metodo          paymentMethodEnum NOT NULL
  valorEsperado   doublePrecision NOT NULL    // Σ financialTransactions do método na sessão (snapshot)
  valorInformado  doublePrecision             // contagem física (nullable — só métodos de gaveta contam)
  diferenca       doublePrecision             // valorInformado - valorEsperado (nullable p/ métodos sem contagem)
  dataInsercao    timestamp NOT NULL defaultNow
}
```

Índice: `idx_sales_session_reconciliations_sessao` em `sessaoVendaId`.

**Gaveta vs. recebível:** apenas `DINHEIRO` exige contagem física (gaveta). Os demais métodos
(PIX, cartão, fiado, vale, cashback...) são resumo de movimento/recebível e gravam
`valorInformado = null`, `diferenca = null`. **Essa regra é derivada no serviço/UI a partir do
método — não vira coluna nova.** `CASHBACK`, `VALE`, `FIADO_NOTA` e `A_DEFINIR` nem precisam aparecer
na conferência de gaveta.

**Conferência cega (blind count):** como `valorEsperado` só é gravado no fechamento, a UI pode
esconder o esperado do operador até ele confirmar a contagem. É flag de config, não muda o schema.

### 2.4 FKs nullable nas tabelas existentes (acoplamento aditivo)

```ts
// financialTransactions — ANCHOR do cálculo (única fonte da conciliação)
sessaoVendaId: varchar("sessao_venda_id", { length: 255 })
  .references(() => salesSessions.id, { onDelete: "set null" })   // NULLABLE

// sales — denormalização p/ relatório/atribuição por sessão
sessaoVendaId: varchar("sessao_venda_id", { length: 255 })
  .references(() => salesSessions.id, { onDelete: "set null" })   // NULLABLE
```

`onDelete: "set null"` (nunca cascade): apagar uma sessão jamais apaga venda ou movimento. A sessão
é uma lente, não um dono. Na prática **não apagamos** sessões — usamos `status='CANCELADA'`; o
`set null` é só rede de segurança.

Índices novos: `idx_financial_transactions_sessao` em `sessaoVendaId` (necessário para o cálculo do
fechamento) e `idx_sales_sessao` em `sessaoVendaId`.

### 2.5 Migration Drizzle

- Gerar via `drizzle-kit` (enum, duas tabelas, duas colunas FK, índices).
- O índice parcial único (`WHERE status='ABERTA'`) provavelmente precisa ser escrito à mão na
  migration (drizzle-kit não modela índice parcial diretamente). Adicionar o `CREATE UNIQUE INDEX`
  manualmente no arquivo de migration gerado.

---

## 3. Acoplamento com o fluxo existente

> **Nota de atomicidade (importante):** em `process-sale-confirmation.ts`, o `db.transaction`
> atualiza a venda e cria o `accountingEntry`, mas o `paymentProvider.processPayments` roda
> **depois e fora** do tx, com `db.insert` próprio. Por isso a conciliação lê **só** de
> `financialTransactions.sessaoVendaId` (decisão §0.3): a integridade financeira não depende do
> carimbo da venda ter sido atômico com o das transações.

### 3.1 Resolução/validação da sessão (um único seam)

Helper `lib/sales-sessions/resolve-active-sales-session.ts`:

```ts
// Valida uma sessão informada pelo cliente. Retorna a sessão ABERTA ou null.
resolveActiveSalesSession({ orgId, sessaoVendaId, escopoChave? }): Promise<TSalesSession | null>
```

- Cliente envia `sessaoVendaId`; o helper valida org + `status='ABERTA'` + (opcional) escopo.
- No escopo OPERADOR ele também serve de fallback: dado `responsavelVendedorId`, encontra a sessão
  aberta daquele responsável.
- **É o único ponto que decide "qual sessão?".** Não espalhar lógica de sessão pelo código.

### 3.2 Carimbar na confirmação (`processSaleConfirmation`)

Mudança mínima e aditiva:

1. Adicionar `sessaoVendaId?: string | null` ao `ProcessSaleConfirmationInput`.
2. Setar `sales.sessaoVendaId` no `tx.update(sales)` (denormalização).
3. Propagar `sessaoVendaId` via `TProcessPaymentsInput` (**no nível do input, não por split** — a
   sessão é da venda inteira) → `LocalPaymentProvider` grava `sessaoVendaId` em cada
   `financialTransactions` que insere.
4. Se vier `null` (caixa desligado, ou opcional e sem sessão), **tudo funciona como hoje**. Zero
   regressão — o caminho `null` é literalmente o caminho atual, intocado.

`TProcessPaymentsInput` ganha `sessaoVendaId?: string | null`; `LocalPaymentProvider.processPayments`
adiciona `sessaoVendaId: input.sessaoVendaId ?? null` em todos os `.values({...})` (imediato e
parcelado).

### 3.3 Enforcement (modo obrigatório)

Um único `if` no início do serviço de confirmação (ou nas rotas POS `confirm` /
`create-and-confirm`):

```ts
if (organization.configuracao.preferencias.sessoesVenda.obrigatorio && !input.sessaoVendaId) {
  throw new createHttpError.BadRequest("Nenhum caixa aberto. Abra uma sessão de venda para continuar.");
}
// Se sessaoVendaId veio, validar via resolveActiveSalesSession (existe, ABERTA, da org).
```

### 3.4 Sangria / Suprimento — sem tabela nova

Reaproveita a maquinaria contábil existente. Serviço em `lib/sales-sessions/register-movement.ts`:

- **Sangria** (retira dinheiro do caixa → cofre/banco): `accountingEntries` com
  `origemTipo='TRANSFERENCIA'` (débito Cofre, crédito Caixa) + `financialTransactions`
  `tipo='SAIDA'`, `metodo='DINHEIRO'`, `contaFinanceiraId=Caixa`, `sessaoVendaId=sessão`.
- **Suprimento** (injeta troco): o inverso (`tipo='ENTRADA'`).

As contas vêm de `configuracao.defaults.contabilidade.lancamentosPadrao.transferencias`. **Atenção:**
esses defaults existem no schema mas **nascem `null`** — o serviço deve validar que a org configurou
as contas de transferência (Caixa/Cofre) e retornar erro claro se não, em vez de quebrar.

Esperado de dinheiro no fechamento:
```
esperadoDinheiro = saldoInicial
  + Σ(ENTRADA, metodo=DINHEIRO)  − Σ(SAIDA, metodo=DINHEIRO)
  de financialTransactions WHERE sessaoVendaId = X
```

### 3.5 Estorno → gera `SAIDA` na sessão atual (novo comportamento)

Hoje `LocalPaymentProvider.refundPayment` só seta `provedorStatus='ESTORNADO'` e **não** mexe no
caixa. Este plano adiciona: ao estornar um pagamento que era dinheiro, gerar uma
`financialTransaction` `tipo='SAIDA'`, `metodo='DINHEIRO'`, carimbada na **sessão atualmente aberta**
do responsável (não na sessão original, que pode estar fechada/imutável), com um `accountingEntry`
`origemTipo='ESTORNO'`.

- Estorno de venda de sessão já fechada → cai na sessão aberta atual (mantém o histórico fechado
  imutável).
- Métodos não-dinheiro (cartão/PIX): o estorno permanece como ajuste de `provedorStatus`/recebível,
  sem saída de gaveta.
- Definir o ponto exato (estender `refundPayment` para receber `sessaoVendaId` + emitir entry, ou um
  serviço dedicado `registerRefundMovement`) na etapa de implementação. Preferência: serviço
  dedicado que reusa a mesma maquinaria do §3.4, mantendo `refundPayment` focado no provider.

### 3.5.1 Troco → `SAIDA` de dinheiro no lançamento da venda (implementado)

Pagamentos do PDV entram pelo valor **entregue** pelo cliente (R$ 50 em dinheiro numa venda de
R$ 37) e o excesso vira uma `financialTransaction` `tipo='SAIDA'`, `metodo='DINHEIRO'`,
`modificadoresMetadata.origem='TROCO'`, no mesmo `lancamentoContabilId` da venda e carimbada com a
sessão. A fórmula do §3.4 desconta o troco sozinha — a gaveta esperada fica em R$ 37, não em R$ 50.

- Regras em `lib/sales/sale-change.ts` (client-safe; PDV e servidor usam a mesma): troco só sobre
  pagamentos imediatos não parcelados; troco sem dinheiro recebido (excesso no cartão/PIX) exige
  confirmação explícita no PDV.
- Lançamento em `lib/sales/sale-processing/register-sale-change.ts`, chamado na confirmação e na
  edição da venda. Cancelamento estorna o dinheiro **líquido** do troco.
- Visão fiscal (`loadSalePayments`) sai líquida do troco: a Spedy não expõe `vTroco` e pagamentos
  acima do vNF são a rejeição 866.

### 3.6 Pendências fiscais — sem schema novo

No fechamento, query: `fiscalOutboundDocuments ⋈ sales` onde `sales.sessaoVendaId = X` e
`statusInterno NOT IN ('AUTORIZADO')`. Lista as NFC-e pendentes/processando/rejeitadas do turno.
Bloquear o fechamento ou só alertar é decisão de config
(`bloquearFechamentoComPendenciaFiscal`).

---

## 4. Progressive disclosure

Config nova em `configuracao.preferencias.sessoesVenda` (segue o padrão de `rastreamentoEstoque`,
em `schemas/organizations.ts`):

```ts
sessoesVenda: z.object({
  habilitado: z.boolean(),                              // Layer 0→1: liga a feature na UI
  obrigatorio: z.boolean(),                             // Layer 2: bloqueia venda sem sessão
  escopo: z.enum(["OPERADOR"]),                         // só OPERADOR nesta versão (TERMINAL futuro)
  exigirFundoTroco: z.boolean(),                        // abertura pede saldo inicial
  conferenciaCega: z.boolean(),                         // esconde esperado até contar
  bloquearFechamentoComPendenciaFiscal: z.boolean(),
})
.default({
  habilitado: false,
  obrigatorio: false,
  escopo: "OPERADOR",
  exigirFundoTroco: false,
  conferenciaCega: false,
  bloquearFechamentoComPendenciaFiscal: false,
})
```

| Camada | Config | Comportamento |
|---|---|---|
| **0 — Off (default)** | `habilitado: false` | Nada muda. Sem UI de sessão. Vendas como hoje. `sessaoVendaId` sempre `null`. |
| **1 — Opcional** | `habilitado: true, obrigatorio: false` | Operador pode abrir sessão. Vendas durante a sessão são carimbadas. Fechamento gera resumo. Quem ignora, vende normal. |
| **2 — Obrigatório** | `obrigatorio: true` | Confirmação exige `sessaoVendaId`; sem ele → `BadRequest`. |

O enforcement mora num único `if` (§3.3). O caminho `null` é o caminho de hoje, intocado.

---

## 5. Camadas a construir (ordem de implementação)

Seguindo as convenções do repo. Cada item é um PR/commit focado.

1. **Schema + migration**
   - `schema/enums.ts`: `salesSessionStatusEnum`.
   - `schema/sales-sessions.ts`: `salesSessions`, `salesSessionReconciliations`, relations, tipos
     inferidos, barrel-export em `schema/index.ts`.
   - FKs `sessaoVendaId` em `financialTransactions` e `sales` (+ índices).
   - Migration drizzle-kit + `CREATE UNIQUE INDEX` parcial manual.

2. **Config (progressive disclosure)**
   - `schemas/organizations.ts`: bloco `preferencias.sessoesVenda` com `.default(...)`.
   - Garantir defaults nas orgs existentes (migration de dados ou default no schema cobre leitura).

3. **Zod**
   - `schemas/sales-sessions.ts`: `SalesSessionSchema`, `SalesSessionReconciliationSchema`,
     inputs de abertura/fechamento/movimento, tipos inferidos.
   - Enum Zod correspondente em `schemas/enums.ts`.

4. **Helpers** (`lib/sales-sessions/`)
   - `resolve-active-sales-session.ts` (§3.1).
   - `compute-session-expected-by-method.ts` — lê `financialTransactions WHERE sessaoVendaId` e
     agrega por método (§3.4).
   - `close-sales-session.ts` — snapshot esperado por método, grava reconciliations + totais,
     muda status, checa pendência fiscal (§3.6).
   - `register-movement.ts` — sangria/suprimento (§3.4).
   - `register-refund-movement.ts` — saída de estorno (§3.5).

5. **Acoplamento no fluxo de venda**
   - `ProcessSaleConfirmationInput` + `tx.update(sales)` (§3.2).
   - `TProcessPaymentsInput` + `LocalPaymentProvider` (§3.2).
   - `if` de enforcement (§3.3).
   - Estorno → saída (§3.5).

6. **API** (`app/api/pos/sales-sessions/`)
   - `route.ts` (GET multi-modo: `?id=` resumo / lista paginada; padrão `byId`/`default`).
   - `open/route.ts`, `close/route.ts`, `movements/route.ts`.
   - Service puro + `appApiHandler`, `getCurrentSessionUncached`, formato `{ data, message }`.

7. **Query/Mutation hooks**
   - `lib/queries/sales-sessions.ts` (hook `byId`, lista paginada com debounce, query keys
     expostas).
   - `lib/mutations/sales-sessions.ts` (wrappers Axios: `openSalesSession`, `closeSalesSession`,
     `registerSalesSessionMovement`).

8. **State hooks + Modals**
   - `state-hooks/use-internal-sales-session-state.tsx`.
   - `components/Modals/Internal/SalesSessions/OpenSalesSession.tsx` (abertura + fundo de troco).
   - `.../CloseSalesSession.tsx` com bloco de conferência por método (gaveta vs. recebível,
     conferência cega, alerta de pendência fiscal).
   - `.../Blocks/` para os agrupamentos de campos.

---

## 6. Riscos / pontos de atenção residuais

- **Atomicidade venda × transações** (§3): mitigado por ler a conciliação só de
  `financialTransactions`. Uma venda confirmada exatamente no instante do fechamento pode ter a
  venda carimbada antes das transações; como o snapshot lê as transações, ele captura o estado real
  no momento do close. Documentar que o close é um corte temporal.
- **Pagamentos a prazo / recebíveis**: cartão crédito parcelado e PENDENTE entram como
  `financialTransactions` com `dataEfetivacao=null`. A conciliação separa **gaveta (dinheiro)** de
  **resumo de recebíveis por método** (§2.3). Só dinheiro tem contagem física.
- **Contas de transferência null** (§3.4): validar antes de operar sangria/suprimento.
- **Estorno** (§3.5): novo comportamento; garantir idempotência (não gerar duas saídas para o mesmo
  estorno) e testes do caminho dinheiro vs. não-dinheiro.
- **Orgs existentes**: o `.default(...)` em `sessoesVenda` cobre leitura; confirmar que o fluxo de
  update de organização não derruba o default.
```
