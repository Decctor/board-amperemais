# Resgate de Recompensas (Cashback) no PDV — plano

Data: 2026-07-28
Status: **Proposto**

## O problema em uma frase

O PDV (`new-sale` + `/api/pos/sales/**`) já resgata cashback como **desconto em dinheiro**, mas não como **recompensa** (prêmio do catálogo `cashbackProgramPrizes`) — e recompensa não é só "mais um desconto": o prêmio sai de graça mas o restante do carrinho não, o estoque do prêmio precisa ser baixado quando rastreado, o custo (COGS) precisa ser contabilizado e o item precisa aparecer corretamente no documento fiscal.

## O que já existe e é reaproveitado

- **Catálogo de prêmios**: `cashbackProgramPrizes` (`services/drizzle/schema/cashback-programs.ts:57`) — `produtoId`/`produtoVarianteId`, `valor` (preço em moeda cashback), `ativo`, `imagemCapaUrl`. O valor comercial é derivado do `precoVenda` do produto/variante no momento do resgate.
- **Gate de modalidade**: `cashbackPrograms.modalidadeRecompensasPermitida` (schema L32) — hoje lido apenas pelo POI.
- **Ledger pronto para recompensa**: `cashbackProgramTransactions.resgateRecompensaId`/`resgateRecompensaValor` (schema L147-148). Não precisa de tipo novo — recompensa é `RESGATE` com esses campos preenchidos.
- **Débito FIFO de saldo**: `applyCashbackRedemptionFIFO` (`lib/cashback/redemption.ts:23`) — primitivo único, já usado pelo PDV no resgate-desconto.
- **Referência de implementação (POI)**: `app/api/point-of-interaction/new-transaction/route.ts` — validação do prêmio (L483-521), exclusividade com cupom (L532), limites `resgateLimite*` pulados para prêmio (L590), item da venda com `metadados.origem: "POI-RESGATE-RECOMPENSA"` (L808-829). **Mas a venda do POI nasce sem `statusVenda`** e nunca passa por `processSaleConfirmation`: sem baixa de estoque, sem lançamento contábil, sem pagamento, sem fiscal, sem sessão de caixa, e com `valorCusto* = 0`. É o molde da validação, não do efeito.
- **Ponto único de confirmação**: `processSaleConfirmationInTransaction` (`lib/sales/sale-processing/process-sale-confirmation.ts:49`) — CAS para `CONFIRMADA`, contabilidade, baixa de estoque condicional, pagamentos, resgate de cashback (L133-214), cupom, acúmulo. O resgate-desconto do PDV já vive aqui; o de recompensa entra no mesmo lugar.
- **Baixa de estoque agnóstica a preço**: `processStockDeduction` (`lib/sales/sale-processing/process-stock-deduction.ts:42`) — um item 100% descontado baixa estoque normalmente, incluindo composição/ficha técnica, variantes e lotes FEFO. Zero mudança necessária se a recompensa for um `saleItem` normal.
- **Idioma da casa para "item grátis"**: o motor de cupons modela `COMPRE_X_LEVE_Y` como **desconto de 100% no item, não item de preço zero** (`lib/coupons/engine.ts:245-273`). O fiscal segue o mesmo caminho: `baseLiquida = valorBruto − valorDesconto` (`lib/fiscal/engine/taxation.ts:190-192`) → item aparece com vProd e vDesc, impostos zerados.
- **Reversão em cancelamento**: `lib/cashback/reverse-sale-cashback.ts` reverte `RESGATE` por `vendaId` (devolve saldo via `CANCELAMENTO`); estoque reverte por `reverse-sale-item-stock.ts`. Recompensa gravada como `RESGATE` + item normal herda os dois caminhos.
- **Molde de UI**: `CashbackRedemptionBlock`/`CouponRedemptionSection` em `app/dashboard/commercial/sales/new-sale/components/checkout/SummarySection.tsx`; picker de prêmios em `components/Modals/TransactionRequests/NewTransaction.tsx:86-176` e `app/(external)/point-of-interaction/[orgId]/new-transaction/components/prize-selection-step.tsx`.

## Desenho central: a recompensa é um `saleItem` normal, construído pelo servidor, com 100% de desconto

Duas grandezas **independentes**, que o POI hoje mistura e o PDV não deve misturar:

| Grandeza | Valor | Onde vive |
|---|---|---|
| Débito de saldo do cliente | `prize.valor` (moeda cashback: R$ **ou pontos**) | `cashbackProgramTransactions` (`valor: -prize.valor`, `resgateRecompensaValor`) |
| Desconto comercial da venda | `precoVenda` do produto/variante (sempre R$) | `saleItems.valorTotalDesconto` do item recompensa |

O POI usa `min(valorVenda, prize.valor)` como desconto e cobra a diferença do cliente — o que quebra quando `terminologia = "PONTOS"` (compara pontos com reais). No PDV: **o prêmio sai integralmente de graça** (`valorTotalDesconto = valorVendaTotalBruto`, líquido 0) e o saldo é debitado em `prize.valor`. Não copiar o `min()`.

Por que `saleItem` com desconto 100% (e não linha sintética/ausente como o POI):

1. **Estoque de graça** — `processStockDeduction` baixa qualquer `saleItem` de produto rastreado, inclusive composição e variante.
2. **COGS correto** — `valorCustoUnitario/Total` vêm do catálogo (o POI grava 0; não replicar). Margem e giro continuam verdadeiros.
3. **Fiscal de graça** — o motor já emite item com vProd/vDesc e imposto zero; produto do prêmio precisa apenas de perfil fiscal como qualquer outro (validação bloqueante existente).
4. **Financeiro/caixa de graça** — o item líquido 0 não altera `valorTotal`, o lançamento contábil (que usa `sale.valorTotal`) já sai líquido e nenhuma `financialTransaction` é gerada para a recompensa; a sessão de caixa não é afetada.

**Servidor autoritativo**: o cliente envia apenas `recompensaResgate: { recompensaId }`; o item da recompensa **não** vem no array `itens`. O servidor valida o prêmio e constrói o item ele mesmo. Consequências deliberadas:

- `validateSaleItemsPricing` fica intocado (só valida itens enviados pelo cliente).
- `computeSaleAggregatedDiscount`/teto de desconto do vendedor ficam intocados — o desconto da recompensa **não** conta para aprovação de gestor, como já acontece com cashback e cupom `AUTOMATICA` (regras próprias validadas pelo motor).
- Impossível o cliente inflar preço, desconto ou custo do prêmio.

## Decisões de escopo (recomendações a validar)

| Dimensão | Decisão recomendada | Racional |
|---|---|---|
| Representação | `saleItem` normal server-built, desconto 100%, `metadados.origem: "POS-RESGATE-RECOMPENSA"` + snapshot `{ recompensaId, valorResgate, valorComercial }` | Estoque/fiscal/COGS de graça; idioma `COMPRE_X_LEVE_Y` |
| Quantidade | **1 recompensa por venda, quantidade 1** | Espelha o POI; simplifica idempotência (1 `RESGATE`/venda) |
| Combinabilidade | Recompensa **não** combina com cupom (espelha POI L532) **nem** com resgate-desconto de cashback na mesma venda; carrinho misto com itens pagos é permitido (é o ponto do PDV) | Idempotência atual do resgate é "existe `RESGATE` para a venda?" (`process-sale-confirmation.ts:137-150`); duas linhas `RESGATE` quebrariam isso e a reversão |
| Limites `resgateLimite*` | **Não se aplicam** a recompensa | Espelha o POI (L590); o teto é da modalidade desconto. O "preço" da recompensa é o `prize.valor` |
| Acúmulo | **Mantém** o acúmulo sobre `sale.valorTotal` (que já exclui a recompensa) | Diferente do POI, que suprime — mas lá a venda é só o prêmio (acúmulo seria 0 mesmo). No PDV o restante pago do carrinho deve pontuar normalmente |
| Cliente | Obrigatório (`clienteId` vinculado) | Saldo é por cliente |
| Edição de venda confirmada | Recompensa **imutável** no edit, como cupom e cashback hoje (`/api/pos/sales/edit` trata ambos como imutáveis) | Mesma decisão já tomada para os outros resgates |
| Fiscal v1 | Item normal com desconto 100% (imposto zero). CFOP de bonificação (5910) fica para fase futura | O engine não tem suporte a CFOP por item/bonificação hoje (`lib/fiscal/engine/cfop.ts` só troca dígito geográfico); construir isso não pode bloquear a feature |

## Fase 0 — Fundação compartilhada (+ correções no POI)

Extrair a validação de prêmio para `lib/cashback/prizes.ts` (função pura sobre `tx`), usada por POI e PDV:

```ts
validatePrizeForRedemption({ tx, organizacaoId, programaId, recompensaId })
// → { id, valor, valorVenda, precoCusto, produtoId, produtoVarianteId, titulo }
```

- Valida `ativo` + pertencimento ao programa + vínculo com produto/variante (regras do POI L483-521).
- **Resolve o `produtoId` pai quando o prêmio aponta só para variante** — `saleItems.produtoId` é `NOT NULL` (`services/drizzle/schema/sales.ts:167-169`); hoje o POI silenciosamente não cria item para prêmio variante-only (L808 checa só `produtoId`). A função devolve sempre o par completo.
- Devolve também `precoCusto` (variante ?? produto) para o item carregar custo real.

Correções no POI usando o helper (baixo risco, alto valor): passar a criar item para prêmios variante-only e gravar `valorCusto*` reais em vez de 0.

## Fase 1 — Servidor PDV

### 1.1 Input e construção do item (`app/api/pos/sales/create-and-confirm/route.ts`)

- `CreateAndConfirmSaleInputSchema` (L41-62) ganha:

```ts
recompensaResgate: z
	.object({
		recompensaId: z.string({ ... }),
		programaId: z.string({ ... }).optional().nullable(),
	})
	.optional()
	.nullable(),
```

- Regras de admissão (antes dos totais): exige `clienteId`; rejeita se `cupomResgate` ou `cashbackResgate > 0` presentes; resolve o programa (input ?? `cashbackProgramBalances.programaId`), exige `ativo` + `modalidadeRecompensasPermitida`; chama `validatePrizeForRedemption`.
- Totais (L128-158): o item recompensa entra com `bruto = precoVenda`, `desconto = precoVenda`, `líquido = 0` → `valorTotal` não muda; `custoTotal` soma o `precoCusto` do prêmio; `sales.descontosTotal` passa a somar o desconto comercial da recompensa (é "tudo que reduz o total" — schema `sales.ts:32`).
- Persistência: item inserido junto com os demais, com `metadados` no padrão snapshot (`{ origem: "POS-RESGATE-RECOMPENSA", recompensaId, valorResgate, valorComercial, nome, codigo, imagemUrl }`).

### 1.2 Ledger na confirmação (`lib/sales/sale-processing/process-sale-confirmation.ts`)

- `TProcessSaleConfirmationInput` ganha `saleRewardRedemption?: { recompensaId: string; programaId: string; valorResgate: number } | null`.
- Novo ramo no bloco de resgate (L133-214), mutuamente exclusivo com `saleCashbackRedemptionValue`:
  - Idempotência idêntica (existe `RESGATE` para a venda → retorna).
  - Gate `modalidadeRecompensasPermitida` (em vez de `modalidadeDescontosPermitida` L167); **sem** checagem de `resgateLimite*`.
  - `applyCashbackRedemptionFIFO` com `redemptionValue = prize.valor` e insert do `RESGATE` com `valor: -prize.valor`, `resgateRecompensaId`, `resgateRecompensaValor: prize.valor`, `metadados.consumoFifo` — mesmo shape do bloco atual (L183-204).
- Acúmulo (L296-327): sem mudança — `sale.valorTotal` já exclui a recompensa.
- Estoque, contabilidade, pagamentos: sem mudança (o item recompensa é um item normal).

### 1.3 Verificações obrigatórias nesta fase

- **Venda 100% grátis** (carrinho = só a recompensa): `valorTotal = 0`, zero pagamentos. Verificar `getSaleFinancialState`/`isFullyPaid` com total 0 (gate do fiscal em `process-sale-automatic-fiscal-emission.ts:69-72`), `assertFiscalReadiness` (`lib/fiscal/documents.ts:383`) e o lançamento contábil de valor 0. `isReadyForFinalize` no client também precisa aceitar `valorFinal = 0` sem splits.
- **Reversão**: cancelar uma venda com recompensa deve devolver o saldo (`reverse-sale-cashback.ts` já reverte `RESGATE` por `vendaId` — confirmar que o fluxo não depende de `resgateRecompensaId` nulo) e devolver o estoque do item (caminho existente).
- **Fiscal**: emitir NFC-e de venda mista com recompensa em homologação — item com vProd/vDesc e imposto zero; produto do prêmio **precisa** de perfil fiscal + grupo tributário (erro bloqueante existente — vale mensagem de erro clara no PDV apontando o produto).

## Fase 2 — UI do PDV

### 2.1 Endpoint de prêmios disponíveis

`GET /api/pos/cashback-rewards/available?clienteId=` (padrão irmão de `/api/pos/coupons/available`): retorna programa (`terminologia`, `modalidadeRecompensasPermitida`), saldo do cliente e prêmios ativos com `{ id, titulo, descricao, imagemCapaUrl, valor, valorVenda, elegivel, motivo }` (`elegivel = saldo >= valor`, produto com preço resolvido). Query hook `usePosAvailableRewards` em `lib/queries/`.

### 2.2 Estado (`state-hooks/use-sale-state.tsx`)

- Novo campo `recompensaResgate: { recompensaId, programaId, titulo, valor, valorVenda, imagemCapaUrl } | null` + `setRecompensaResgate`.
- Resets obrigatórios nos mesmos pontos do `cashbackResgate`/`cupomResgate`: `clearCliente` (L174), `setModoCliente("CONSUMIDOR")` (L184-185), `clearCart` (L216).
- Regras de exclusividade no client: selecionar recompensa zera `cashbackResgate` e `cupomResgate` (e vice-versa), com aviso.
- Totais derivados (L348-365): **não mudam** — a recompensa não entra em `itens` nem no encadeamento `valorAntesCupom → valorFinal`. Exibição do prêmio é uma linha própria.
- `getDraftMetadata()` (L402-411) passa a incluir `recompensaResgate` (necessário para o fluxo rascunho → confirmação, Fase 3).

### 2.3 Componentes

- `RewardRedemptionSection` no `SummarySection.tsx` (ao lado de `CouponRedemptionSection`/`CashbackRedemptionBlock`): visível com cliente vinculado + `modalidadeRecompensasPermitida` + prêmios existentes; mostra saldo formatado com `formatCashbackValue(valor, terminologia)`.
- Picker de prêmios (modal): molde visual de `prize-selection-step.tsx`/`NewTransaction.tsx` — grid com imagem, título, `valor` em moeda cashback, desabilitado com motivo quando saldo insuficiente.
- Linha da recompensa no resumo/carrinho: badge "RECOMPENSA", preço comercial riscado, líquido R$ 0,00, e o débito de saldo exibido em separado ("− X pontos/R$ do saldo"). A recompensa não é um `CartItemRow` editável (sem quantidade, sem desconto manual, botão único de remover).

## Fase 3 — Rascunhos, confirmação tardia, edição e tabs

- **Rascunho (`POST/PUT /api/pos/sales`)**: mesma admissão da Fase 1.1, com decisão de design: no rascunho a recompensa vive só em `rascunhoMetadados` (sem item, sem débito) e o item + ledger nascem na confirmação — evita reservar saldo/estoque de orçamento. `POST /api/pos/sales/confirm` lê `rascunhoMetadados.recompensaResgate`, **revalida tudo** (prêmio ativo, saldo, modalidade — preços podem ter mudado) e segue o caminho da Fase 1.
- **Edição (`/api/pos/sales/edit`)**: recompensa imutável — o item com `metadados.origem = "POS-RESGATE-RECOMPENSA"` não pode ser alterado/removido pela edição (mesma postura de cupom/cashback; `map-sale-to-sale-state.ts` precisa reconstruir a linha para exibição).
- **Tabs**: a venda da tab confirma pelo mesmo `processSaleConfirmation` no fechamento; decidir se o fechamento de conta oferece recompensa (provável sim, de graça, se o composer de fechamento reusar o mesmo estado/seção). Fora do caminho crítico.

## Fase 4 — Futuro (fora deste escopo)

- CFOP de bonificação (5910/6910) e tratamento fiscal dedicado por item de recompensa — exige suporte a CFOP por item no engine e no mapper Spedy (`lib/fiscal/providers/spedy/mappers/invoice.ts:95`).
- Estoque/quota de prêmios (`cashbackProgramPrizes` não tem quantidade nem limite de resgates por cliente).
- Snapshot de valor comercial no catálogo de prêmios (hoje o snapshot vive no `saleItem` + `resgateRecompensaValor`, o que é suficiente para auditoria da venda).
- Combinabilidade recompensa + cupom/cashback-desconto, e múltiplas recompensas por venda.
- Recompensa na loja digital (`coupon_redemption_source` já prevê `LOJA_DIGITAL`; o resgate de recompensa pediria o equivalente).

## Pontos de atenção de implementação

- **Não copiar o `min(valorVenda, prize.valor)` do POI** — mistura moeda cashback (pontos) com R$. As duas grandezas são independentes (ver Desenho central).
- **`saleItems.produtoId` é NOT NULL** — prêmio variante-only exige resolver o produto pai (Fase 0). É um bug latente do POI, não repetir.
- **Custo do prêmio**: `valorCustoUnitario/Total` reais no item (o POI grava 0 e quebra COGS/margem).
- **Idempotência do resgate**: a checagem "existe `RESGATE` para a venda" é o que protege reconfirmação; é por isso que a exclusividade recompensa × resgate-desconto não é só UX — é invariante do ledger.
- **FIFO com bypass**: `applyCashbackRedemptionFIFO` hoje só loga warning quando os acúmulos não cobrem o débito (`lib/cashback/redemption.ts:103-114`, bypass deliberado para saldos importados). A recompensa herda esse comportamento; não "consertar" aqui.
- **Tolerância de centavos**: reutilizar `SALE_PRICING_CENT_TOLERANCE` nas comparações novas.
- **Migração**: nenhuma coluna nova no banco (ledger e catálogo já suportam) — apenas schemas Zod/inputs. Se a Fase 4 (quota de prêmio) entrar, aí sim `db:push`.

## Arquivos-âncora

| Papel | Arquivo |
|---|---|
| Validação de prêmio (referência a extrair) | `app/api/point-of-interaction/new-transaction/route.ts:483-521` |
| Catálogo/ledger de recompensa | `services/drizzle/schema/cashback-programs.ts:57,147-148` |
| Ponto de admissão no PDV | `app/api/pos/sales/create-and-confirm/route.ts:41-62,128-158` |
| Ponto de efeito (ledger) | `lib/sales/sale-processing/process-sale-confirmation.ts:133-214` |
| Débito FIFO de saldo | `lib/cashback/redemption.ts:23` |
| Baixa de estoque (não muda) | `lib/sales/sale-processing/process-stock-deduction.ts:42` |
| Reversão em cancelamento | `lib/cashback/reverse-sale-cashback.ts` |
| Fiscal por item (não muda) | `lib/fiscal/engine/taxation.ts:190-192` |
| Estado/UI do PDV | `state-hooks/use-sale-state.tsx`, `app/dashboard/commercial/sales/new-sale/components/checkout/SummarySection.tsx` |
| Molde de picker de prêmios | `components/Modals/TransactionRequests/NewTransaction.tsx:86-176`, `app/(external)/point-of-interaction/[orgId]/new-transaction/components/prize-selection-step.tsx` |
| Molde de endpoint POS-scoped | `app/api/pos/coupons/available/route.ts` |
| Idioma "item grátis = desconto 100%" | `lib/coupons/engine.ts:245-273` (`COMPRE_X_LEVE_Y`) |
