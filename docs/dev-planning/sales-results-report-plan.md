# Sales Results Report (Resultados de Vendas)

## Status

- [ ] Plan approved
- [ ] Backend (`/api/sales/results` + `lib/sales/results/*`) implemented
- [ ] Page, sidebar entry and capability implemented
- [ ] Phase 2 blocks (cash sessions, channels, daily series, export)
- [ ] Verification completed

## Objective

Give ERP organizations one period-based view that consolidates what the cash-session close
screen shows today (sales, receipts per payment method, fiscal emission health) **without**
being tied to a session, and add the one dimension sessions structurally cannot offer:
**results per seller**.

Today the only place that compiles "what happened" is `CloseSalesSession.tsx`, and it compiles
very little server-side: expected per method (`computeSessionExpectedByMethod`), fiscal pendencies,
and the frozen reconciliation snapshot. Sales count and total are summed in the modal from the
`vendas` relation (`components/Modals/Internal/SalesSessions/CloseSalesSession.tsx:76-77`).
Everything else (discounts, cancellations, per-seller, per-channel, rejection counts) does not exist.

## Why a new page under Vendas, and not the home Dashboard or the session screen

| Option | Problem |
|---|---|
| Extend `Dashboard > Comercial` (`components/Stats/CommercialStatsSection.tsx`) | That surface is the CRM analytics view and must stay valid for `RECEPTOR` organizations, whose sales carry no payments or fiscal documents. Payment method and fiscal data exist only on the ERP chain (`accountingEntries` → `financialTransactions`, `fiscalOutboundDocuments`). Mixing them there means empty sections for most CRM-only orgs. |
| Extend the session close / detail modal | A session is single-seller by construction (`escopoChave = responsavelVendedorId`) and only exists when `preferencias.sessoesVenda.habilitado` is on. Many ERP orgs do not run sessions at all. |
| **New `/dashboard/sales/results`, ERP-gated** | Reads the same ERP chain the session close reads, over an arbitrary period, with seller/channel breakdowns. Sessions become one block inside it instead of the only lens. |

Decision: build the third option. It is a sibling of `Histórico`, `Pedidos` and `Caixa` in the
`Vendas` group, following the routes plan
(`docs/dev-planning/dashboard-information-architecture-and-routes-plan.md`) and the finance
reports pattern (`docs/dev-planning/finance-analytics-and-route-separation-plan.md`).

## Inherited principles

- Routes for distinct jobs; no query-param tabs. The page is one route with sections.
- Independently linkable and refresh-safe: the period and filters live in the URL.
- API authoritative for authorization; sidebar visibility is not a security boundary.
- Portuguese labels and payload fields; English code, route and type names.
- Aggregate in SQL (`GROUP BY`), never by loading sales into memory (`/api/stats/comparison` is
  the anti-pattern to avoid).
- Put the computation in `lib/` so the page, the AI agent tools and the recurrent WhatsApp report
  can read the same numbers (same reasoning as `lib/sales/overall-stats.ts:8-14`).

## Target navigation

```text
Vendas
  Nova venda        /dashboard/sales/new
  Histórico         /dashboard/sales
  Resultados        /dashboard/sales/results        (new)
  Pedidos           /dashboard/sales/orders
  Caixa             /dashboard/sales/cash-sessions
  Mesas e comandas  /dashboard/sales/service-accounts
  Aprovações        /dashboard/approvals
```

- Sidebar id `sales-results`, icon `ChartNoAxesColumnIncreasing`, placed right after `Histórico`.
- `appRoutes.sales.results = () => "/dashboard/sales/results"` in `lib/navigation/routes.ts`.
- Label alternative considered: `Fechamento`. Rejected because it collides with the session
  close vocabulary and the page is not a closing act; it is a read-only compilation.

## Access model

New capability `salesResults` in `lib/access/capabilities.ts`:

```ts
case "salesResults":
	return erp && permissions.resultados.visualizar;
```

- `erp` because the payment and fiscal sections only exist for internally processed sales.
- `resultados.visualizar` (not `vendas.visualizar`): this is an analytics surface. A cashier who
  can see the sales list should not automatically see the organization's totals per seller.
- `resultados.escopo` narrows sellers exactly as the stats routes do: a scoped user is forced to
  their own seller and the org-wide totals are computed over that scope. Reuse
  `assertSellersIdsWithinResultsScope` / `resolveResultsScopeSellerIds` from
  `lib/permissions/results-scope.ts`, which the stats routes already share.
- `resultados.visualizarSensiveis` gates cost and margin fields (same as `OverallStatsBlock.tsx:25`).
- Server page: `requireDashboardCapability("salesResults")`, then `PlanRestrictionComponent`
  when `recursos.erp.acesso` is false (mirrors `sales/new/page.tsx:35`).
- Add a case to `lib/access/capabilities.test.ts`.

## Period and filters

- Period lives in the URL (`?after=&before=`, ISO) via `nuqs` (already used in
  `app/dashboard/fiscal/fiscal-page.tsx`). Missing params resolve to the default.
- **Default period: today** (`startOf("day")` → `endOf("day")`). Rationale: this page replaces the
  "how did the day go" question that people currently answer by opening the cash session; the
  home Dashboard already answers month-to-date. Presets in the trigger: `HOJE`, `ONTEM`,
  `ESTA SEMANA`, `ESTE MÊS`, `MÊS ANTERIOR`, plus the range calendar. Reuse
  `InteractiveFilter.DateRangeContent` with a preset list extended from
  `defaultInteractiveFilterDateRangePresets` (`components/ui/interactive-filter.tsx:587`).
- Day boundaries are computed on the client in the browser timezone and sent as ISO. Server-side
  day bucketing (daily series in phase 2) uses `inOperationTimezone` (`lib/operation-timezone.ts:41`)
  like `sales-grouped` does.
- Filters (progressively disclosed, chips like `SalesInlineFilters`):
  - `sellersIds` — by `sales.vendedorId`, the same contract the stats routes and the sales list
    use. Options from `useSaleQueryFilterOptions` (`value` is the seller id).
  - `channels` — values of `sales.canal` (free text: `POS`, `SHOP`, `COMANDA`, `IFOOD`,
    `WHATSAPP`, null). Options from a `SELECT DISTINCT canal` inside the route's `filterOptions`
    output (there is no channel option list anywhere today).
  - Comparison with the previous period of equal length is computed server-side for the summary
    block only (same convention as `getOverallStats`, not the year-ago convention of `sales-graph`).

## Data contract

### Route

`app/api/sales/results/route.ts` — single `GET`, query params parsed as strings and transformed
in the Zod input schema (CLAUDE.md *GET query params*). No `?payload=` JSON.

```ts
const GetSalesResultsInputSchema = z.object({
	after: z.string().transform((v) => new Date(v)),          // required
	before: z.string().transform((v) => new Date(v)),         // required
	sellersIds: z.string().optional().nullable().transform((v) => (v ? v.split(",") : [])),
	channels: z.string().optional().nullable().transform((v) => (v ? v.split(",") : [])),
});
export type TGetSalesResultsInput = z.infer<typeof GetSalesResultsInputSchema>;
export type TGetSalesResultsOutput = Awaited<ReturnType<typeof getSalesResults>>;
```

Handler: `getCurrentSessionUncached` → `requireERPSession` → results scope check → delegate to
`getSalesResults({ input, organizacaoId, scope })` → `NextResponse.json({ data, message })`.

### Sale universe

One CTE / subquery reused by every section:

```
sales WHERE organizacao_id = ? AND status_venda = 'CONFIRMADA'
  AND data_venda BETWEEN after AND before
  [AND vendedor_id IN (...)] [AND canal IN (...)]
```

Cancelled sales are a second universe with `status_venda = 'CANCELADA'` and the same
`data_venda` window. Cancellation keeps `dataVenda` and only flips status
(`process-confirmed-sale-cancellation.ts:172-178`), so this reads "sold in the period and later
cancelled". "Cancelled during the period" would need `accountingEntries.origemTipo = 'ESTORNO'`
by `dataCompetencia`; not in v1.

The universe includes **externally processed sales** (`processamentoOrigem = 'EXTERNO'`, e.g.
iFood). They count for revenue, sellers and channels; they have no payment rows or fiscal rows.
The payment section therefore exposes coverage explicitly (see `porMetodo.cobertura`) so the user
sees why `Σ recebimentos` differs from `faturamento`, instead of silently excluding those sales.

### Output (`data`)

```ts
{
	periodo: { inicio, fim, anteriorInicio, anteriorFim },
	resumo: {
		qtdeVendas:      { atual, anterior },
		faturamento:     { atual, anterior },     // Σ sales.valorTotal
		descontos:       { atual, anterior },     // Σ sales.descontosTotal
		acrescimos:      { atual, anterior },     // Σ sales.acrescimosTotal
		ticketMedio:     { atual, anterior },
		qtdeItens:       { atual, anterior },     // Σ saleItems.quantidade
		custoTotal:      { atual, anterior } | null,   // null when !visualizarSensiveis
		margemBruta:     { atual, anterior } | null,
		canceladas:      { qtde, valor },
		meta:            { objetivo, atingidoPercentual } | null,   // getOverallSaleGoal
	},
	porMetodo: {
		linhas: [{
			metodo,                 // paymentMethodEnum
			valor,                  // Σ financialTransactions.valor (ENTRADA, origem VENDA)
			qtdeVendas,             // countDistinct(accountingEntries.vendaId)
			valorEfetivado,         // dataEfetivacao IS NOT NULL
			valorPendente,          // dataEfetivacao IS NULL (parcelas, boleto, fiado)
			valorTaxas,             // Σ valorTaxas
			valorEstornado,         // provedorStatus IN ('ESTORNADO','CANCELADO')
			participacaoPercentual,
		}],
		cobertura: {
			vendasComPagamento, vendasSemPagamento,   // EXTERNO or legacy rows without entries
			valorSemPagamento,
		},
	},
	porVendedor: [{
		vendedorId, vendedorNome, vendedorAvatarUrl,
		qtdeVendas, faturamento, descontos, ticketMedio, qtdeItens,
		custoTotal | null, margemBruta | null,
		canceladas: { qtde, valor },
		meta: { objetivo, atingidoPercentual } | null,      // getSellerSaleGoal (lib/reports/data-fetchers.ts)
		porMetodo: [{ metodo, valor }],                     // phase 2
	}],
	fiscal: {
		porTipo: [{ tipo /* NFCE|NFE|NFSE */, autorizadas, pendentes, rejeitadas, canceladas, valorAutorizado }],
		vendasSemDocumento: { qtde, valor },                // sales in universe with no fiscalOutboundDocuments row
		vendasComPendencia:  { qtde, valor },               // latest doc statusInterno NOT IN (AUTORIZADO, CANCELADO, INUTILIZADO)
		rejeicoes: [{ codigoRejeicao, mensagem, qtde }],    // top N by codigoRejeicao + mensagens[0]
		ultimasPendencias: [{ vendaId, documentoId, tipo, statusInterno, referencia, dataInsercao }],  // capped list for drill-down
	},
	porCanal: [{ canal, qtdeVendas, faturamento, ticketMedio }],     // phase 2
	sessoes: {                                                          // phase 2, only when sessoesVenda.habilitado
		abertas, fechadas,
		diferencaTotal,                     // Σ salesSessions.diferencaTotal (closed in period)
		sangrias, suprimentos,              // financialTransactions with sessaoVendaId, entry origem TRANSFERENCIA, SAIDA/ENTRADA
		comDiferenca: [{ sessaoVendaId, responsavelVendedorNome, dataFechamento, diferencaTotal }],
	},
	serie: [{ dia, qtdeVendas, faturamento }],                         // phase 2, localDayKey buckets
	filterOptions: { canais: string[] },
}
```

Payload language: envelope keys (`data`, `periodo`, `filterOptions`) and section names are the
API's structure, but the sections extend the sale entity and travel beside `faturamento` and
`metodo`, so they are Portuguese, matching `resumoEsperado`/`pendenciasFiscais` on the session route.

### Payment basis: competência, not caixa

Receipts are attributed to the **sale date** (`sales.dataVenda`), joined through
`accountingEntries.vendaId` → `financialTransactions.lancamentoContabilId` with
`accountingEntries.origemTipo = 'VENDA'`. A credit-card sale in 3 installments shows its full
value under `CARTAO_CREDITO` for the day it was sold, split into `valorEfetivado` and
`valorPendente`. This answers "how was what I sold paid for", which is the sales question. "What
entered the accounts in the period" is the finance question and is already served by
`/dashboard/finance` (cash flow by `dataEfetivacao`). The two must not be conflated on this page.

This is also why the numbers here legitimately differ from a session close: the session's
expected per method reads `financialTransactions.sessaoVendaId` and includes sangria, suprimento,
refunds and the opening float. The page states this in a helper caption next to the sessions block.

### Fiscal health semantics

- Source: `fiscalOutboundDocuments` where `vendaId` is in the universe. Use `statusInterno`
  (lifecycle), never the external `status`, consistent with the session close decision
  (`docs/sales-sessions-design.md` §0.5).
- Per sale, take the **latest** document by `dataInsercao` to classify the sale
  (`autorizada` / `pendente` / `rejeitada` / `sem documento`); count documents per `tipo` separately.
- `pendentes` = `RASCUNHO, PRONTO_PARA_ENVIO, EM_PROCESSAMENTO, CANCELAMENTO_PENDENTE`;
  `rejeitadas` = `REJEITADO, ERRO`; `canceladas` = `CANCELADO, INUTILIZADO`.
- `vendasSemDocumento` is only a problem when emission is expected. v1 reports the count and
  lets the user judge; a later iteration can consult `emissaoFiscalAutomatica ?? org default` to
  split "não exigido" from "faltando".
- Each pending or rejected row links to `/dashboard/sales/[saleId]` and to the fiscal page.

## Implementation layout

```
lib/sales/results/
  universe.ts                 buildSalesUniverseConditions({ organizacaoId, after, before, sellersIds, channels })
  summary.ts                  getSalesResultsSummary(...)            (current + previous window)
  by-payment-method.ts        getSalesResultsByPaymentMethod(...)
  by-seller.ts                getSalesResultsBySeller(...)           (reuses getSellerSaleGoal)
  fiscal-health.ts            getSalesResultsFiscalHealth(...)
  by-channel.ts               phase 2
  sessions.ts                 phase 2
  daily-series.ts             phase 2
  index.ts                    getSalesResults(...) — Promise.all over the sections
  *.test.ts                   node:test units for the pure classification helpers
                              (fiscal status → bucket, coverage math, previous-window derivation)
app/api/sales/results/route.ts
lib/queries/sales-results.ts  useSalesResults({ initialParams }) → { data, params, updateParams, debouncedParams, queryKey }
lib/permissions/results-scope.ts   resolveResultsScopeSellerIds(membership) (extracted from the stats routes)
app/dashboard/sales/results/
  page.tsx                    server guard (capability + ERP + plan restriction), Metadata
  results-page.tsx            client: URL state, filter bar, sections
  _components/
    results-filters.tsx       period trigger + sellers + channels chips (InteractiveFilter)
    summary-block.tsx         StatCard/StatUnitCard grid with DeltaBadge
    payment-methods-block.tsx table + horizontal bar (ChartContainer), coverage caption
    sellers-block.tsx         ranking table, GoalTrackingBar per row, xlsx export (getExcelFromJSON)
    fiscal-health-block.tsx   status cards + rejection list + pending list with links
    sessions-block.tsx        phase 2
    channels-block.tsx        phase 2
```

- Sidebar: `components/Sidebar/AppSidebar.tsx` Vendas group, capability `salesResults`.
- Routes: `lib/navigation/routes.ts`.
- Capabilities: `lib/access/capabilities.ts` + test.
- Reuse, do not duplicate: `StatCard`/`DeltaBadge` from `app/dashboard/finance/_components`
  (promote to `components/Stats/` if a third module needs them), `formatToMoney`,
  `PaymentMethodLabel`-style mapping already used by `CloseSalesSession.tsx`, `isCashDrawerMethod`
  from `lib/sales-sessions/types.ts`.

## Phases

### Phase 1 — MVP

- [x] `lib/permissions/results-scope.ts` extracted; stats routes switched to it.
- [ ] `lib/sales/results/{universe,summary,by-payment-method,by-seller,fiscal-health,index}.ts` with tests.
- [ ] `app/api/sales/results/route.ts`.
- [ ] `useSalesResults` query hook.
- [ ] Capability `salesResults`, route registry entry, sidebar entry.
- [ ] Page with period (default today, URL-backed), seller and channel filters, four blocks:
      Resumo, Recebimentos por método, Por vendedor, Saúde fiscal.
- [ ] Empty state when the org has no confirmed sales in the period (`StatEmptyState`).

### Phase 2 — Operational completeness

- [ ] Sessions block (hidden when `sessoesVenda.habilitado` is false), with the "why this differs
      from the session close" caption and links to `/dashboard/sales/cash-sessions`.
- [ ] Channels block and daily series (bucketed with `localDayKey`).
- [ ] Per-seller × per-method matrix (`porVendedor[].porMetodo`).
- [ ] xlsx export for sellers and payment methods.
- [ ] Drill-down: payment method row → `/dashboard/sales?...` filtered; fiscal pending row →
      sale details.

### Phase 3 — Same numbers everywhere

- [ ] Agent tool `get_sales_results` (`lib/agent-tools/tools/`) reading `lib/sales/results`,
      or extend `get_commercial_results` with the ERP sections when the org has ERP access.
- [ ] Recurrent WhatsApp sales report (`lib/reports/run-recurrent-sales-report.ts`) gains a
      payment-method line for ERP orgs.
- [ ] Comparison of two arbitrary periods, if requested (reuse the summary section twice rather
      than porting `/api/stats/comparison`).

## Verification

- `npm run lint`, `npx tsc --noEmit`.
- `node --import tsx --test lib/sales/results/*.test.ts lib/access/capabilities.test.ts`; add a
  `test:sales-results` script.
- Manual: ERP org with sessions on and off; a scoped seller user sees only their own row and
  totals; CRM-only org does not see the sidebar entry and gets the plan restriction page on
  direct navigation; a period with an installment sale shows the full value under
  `CARTAO_CREDITO` with the pending split; a rejected NFC-e appears in `rejeicoes` with its code.

## Known debts

Resolved ahead of this plan (2026-09-02):

- Stats routes now filter sellers by `sales.vendedorId` (`sellersIds`), the seller filter options
  carry the seller id, and the results-scope check lives in `lib/permissions/results-scope.ts`.
- The dead `productGroups` stats filter was removed.
- `CONFERIDA` now has a mutation path: `POST /api/pos/sales-sessions/review` (gated by
  `canReviewSalesSession`, i.e. `vendas.editar`), exposed as "CONFERIR CAIXA" in the session detail.

Still open:

- `sales.canal` is free text with no FK to `salesChannels`; the channel filter and block use the
  raw values. A normalization migration is a follow-up.

## Open decisions (defaults assumed above)

1. Default period **today** vs month-to-date. Assumed today; presets make the month one click away.
2. Receipts on a **competência** basis (by `dataVenda`) rather than by `dataEfetivacao`. Assumed
   competência; finance already covers the cash view.
3. Universe includes **external** sales with a coverage indicator, rather than restricting to
   `processamentoOrigem = 'INTERNO'`. Assumed include.
4. Capability `erp && resultados.visualizar` rather than `vendas.visualizar`. Assumed `resultados`.
5. Label `Resultados` under Vendas. Alternative: `Fechamento`.
