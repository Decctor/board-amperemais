# Finance Analytics and Route Separation

## Status

- [ ] Plan approved
- [ ] Implementation started
- [ ] Route separation completed
- [ ] Analytics backend completed
- [ ] Analytics UI completed
- [ ] Verification completed

## Objective

Two coupled goals, delivered together:

1. **Port the finance analytics suite from `syncroniza-control`** (reference commit `bfb87b0`,
   2026-07-21): executive summary with period-over-period deltas, cash flow (consolidated position,
   burn, runway, projection), managerial DRE (competência) with chart-of-accounts drill-down,
   receivables & payables (aging, delays, friction costs), and profitability rankings.
2. **Split the single tab-driven finance page into canonical routes** under `/dashboard/finance`
   with a grouped sidebar entry, following the sales decomposition executed in
   `dashboard-information-architecture-and-routes-plan.md`. The finance page currently holds six
   query-param tabs; dumping five more analytics views into it would reproduce the nested-tabs
   problem the Control page has today. Routes, not tabs.

This plan is the follow-up explicitly anticipated by the routes plan ("Record follow-up candidates
if a local tab later needs its own permission or deep-link boundary") and supersedes its
"keep finance statistics, entries, transactions, accounts, and reconciliation in local secondary
navigation" line for the finance module.

## References

- `syncroniza-control` — source implementation:
  - `src/components/finances/stats/*` (ExecutiveSummarySection, CashFlowSection, DreSection,
    ReceivablesPayablesSection, ProfitabilitySection, DeltaBadge)
  - `src/server/api/routers/finances/finances-analytics.service.ts` (all five analytics
    computations)
  - `src/server/api/routers/finances/finances.service.ts` (`getGeneralFinancesDashboardStats`,
    balance helpers)
- `docs/dev-planning/dashboard-information-architecture-and-routes-plan.md` — route taxonomy,
  sidebar manifest, clean-cutover rules. This plan inherits its principles wholesale.
- `docs/dev-planning/financial-module-improvements-plan.md` — data-model port (accounts, credit
  cards, recurrence). Its Phase 3 dashboard-totals items (`totalCaixa`, `totalPassivos`,
  `posicaoLiquida`) are claimed by the cash-flow workspace here.
- `docs/frontend-target-architecture.md` — page decomposition rules.
- `docs/bank-reconciliation-design.md` — reconciliation workspace being moved, not changed.

## Inherited principles

- [ ] Use routes for distinct jobs; tabs only for alternate views within the same context.
- [ ] Make every route-level workspace independently linkable and refresh-safe.
- [ ] Clean cutover: no redirects, no legacy `?view=` shims, update every internal link, remove
      the old tab contract in the same migration.
- [ ] Portuguese labels in the UI, English names in routes and code.
- [ ] Portuguese field names in API payloads (see *Payload language* below).
- [ ] Keep the API authoritative for authorization; sidebar visibility is not a security boundary.
- [ ] Avoid redesigning the CRUD content of existing tabs while moving them.

## Target navigation

`Gestão > Financeiro` becomes an expandable sidebar parent (the second one after `Vendas`):

```text
Financeiro                    /dashboard/finance            (parent, prefix match)
  Visão geral                 /dashboard/finance            (exact match)
  Relatórios                  /dashboard/finance/reports    (prefix match)
  Lançamentos                 /dashboard/finance/entries
  Movimentações               /dashboard/finance/transactions
  Contas financeiras          /dashboard/finance/accounts
  Faturas de cartão           /dashboard/finance/credit-cards
  Conciliação                 /dashboard/finance/reconciliation
```

Inside `Relatórios`, each report is a **real route** with module-local secondary navigation
(link-based, not query-param tabs), so each analysis is deep-linkable and refresh-safe:

```text
/dashboard/finance/reports/income-statement       DRE (default; /reports redirects here)
/dashboard/finance/reports/cash-flow              Fluxo de caixa
/dashboard/finance/reports/receivables-payables   Recebíveis & pagáveis
/dashboard/finance/reports/profitability          Rentabilidade (Phase 4, pending decision)
```

### Navigation decisions

- [ ] `Visão geral` (the ported executive summary) lives at the module root, mirroring how sales
      history lives at `/dashboard/sales`. It replaces the current `stats` tab.
- [ ] `Relatórios` is a single sidebar child covering the four analyses, keeping the Financeiro
      group at seven children. Promoting each report to its own sidebar child stays available as a
      follow-up if usage justifies it.
- [ ] `Faturas de cartão` keeps its own route (1:1 with the current tab). Alternative considered
      and rejected for now: folding it into `accounts` as local navigation.
- [ ] Plano de contas stays in Settings (`SettingsFinances`). The DRE depends on the
      `accounts_charts` tree, so a `/dashboard/finance/chart-of-accounts` workspace is a recorded
      follow-up candidate, not part of this migration.
- [ ] Recurring rules (`financial_recurring_rules`) still have no dedicated surface; they remain
      reachable through entry modals. Recorded follow-up candidate.

## Canonical route map

Current `?view=` tab → new route. Same clean-cutover rules as the dashboard routes migration:

- [ ] Move `stats` (default tab) to `/dashboard/finance` (upgraded to the executive summary).
- [ ] Move `accounting-entries` to `/dashboard/finance/entries`.
- [ ] Move `financial-transactions` to `/dashboard/finance/transactions`.
- [ ] Move `financial-accounts` to `/dashboard/finance/accounts`.
- [ ] Move `credit-card-invoices` to `/dashboard/finance/credit-cards`.
- [ ] Move `reconciliation` to `/dashboard/finance/reconciliation`.
- [ ] Add `/dashboard/finance/reports/income-statement`.
- [ ] Add `/dashboard/finance/reports/cash-flow`.
- [ ] Add `/dashboard/finance/reports/receivables-payables`.
- [ ] Add `/dashboard/finance/reports/profitability` (Phase 4).
- [ ] Remove the `view` query-state contract from the finance page.
- [ ] Do not add redirects or keep a compatibility `?view=` reader.

## Route registry and link audit

`appRoutes.finance` is currently a **callable leaf** (`finance: () => "/dashboard/finance"`).
Converting it to a nested object is a breaking change at every call site.

- [ ] Convert `appRoutes.finance` into a nested builder group
      (`finance: { root, entries, transactions, accounts, creditCards, reconciliation,
      reports: { incomeStatement, cashFlow, receivablesPayables, profitability } }`) in
      `lib/navigation/routes.ts`.
- [ ] Update the existing `appRoutes.finance()` call site in `components/Sidebar/AppSidebar.tsx`.
- [ ] Search for `"/dashboard/finance"` literals repo-wide and replace with builders.
- [ ] Search for `view=stats`, `view=accounting-entries`, `view=financial-transactions`,
      `view=financial-accounts`, `view=credit-card-invoices`, `view=reconciliation` and resolve
      every result.
- [ ] Extend `lib/navigation/routes.test.ts` with the new builders.

## Sidebar

- [ ] Convert the flat `finance` item in `SidebarConfig` (group `Gestão`) into a parent with
      `url: appRoutes.finance.root()`, prefix match, and the seven children above.
- [ ] Give `Visão geral` `activeMatch: "exact"` so it does not swallow sibling routes (same
      technique as `sales-history`).
- [ ] Give `Relatórios` prefix match on `/dashboard/finance/reports`.
- [ ] Keep every child on the existing `finance` capability for this migration (see access model).

## Access model

One capability (`finance` = ERP access + `canViewFinances`) continues to gate the whole module.
Granular capabilities are not required to ship this plan, but each route resolves its own
mutation permissions server-side — today only two of six tabs receive permission props.

- [ ] Every new `page.tsx` calls `requireDashboardCapability("finance")`.
- [ ] Resolve and pass granular props per route from `lib/permissions/finances.ts`:
      `canCreateFinances` / `canEditFinances` where the workspace mutates, and
      `canReconcileFinances` for the reconciliation route.
- [ ] Reports routes are read-only; no mutation props.
- [ ] Do not read `permissoes.financeiro` outside `lib/permissions/finances.ts`.
- [ ] Record follow-up: split `finance-reports` into its own capability if reports later need a
      distinct permission boundary (e.g. hiding DRE from operational finance users).
- [ ] This work satisfies the routes plan's open "Audit finance page/API alignment" item for the
      page side; note it there when done.

## Backend: analytics library and API routes

### Payload language

Control's analytics payloads mix English field names (`inflow`, `startingBalance`, `statement`,
`aging`). **Do not copy them.** Per the Portuguese-vs-English rule, computed blocks the API
attaches are data and travel in Portuguese (`entradas`, `saldoInicial`, `demonstrativo`,
`vencimentos`). English stays on type names (`TGetFinancesDreOutput`) and function names.

### Shared calculation library — `lib/finances/analytics/`

Pure, tested functions; the API routes stay thin per the four-part route convention.

- [ ] `classification.ts` — revenue/cost/expense classifier. **Adaptation:** RecompraCRM's
      `accounts_charts` has a `natureza` enum (`RECEITA | CUSTO | DESPESA | ...`), so classify by
      walking the `idContaPai` tree from accounts of each `natureza` instead of Control's
      hard-coded fixed-root UUIDs. Revenue matches on `idContaDebito`→credit side
      (`idContaCredito`), costs/expenses on `idContaDebito`, cost checked before expense — same
      semantics as Control's `getDreAccountClassification`.
- [ ] Use this single classifier for the executive summary, DRE, and profitability. (Control's
      executive summary uses a flat-ID variant that diverges from the DRE tree walk — a known
      inconsistency we fix on port rather than preserve.)
- [ ] `tree.ts` — DRE tree roll-up: per-account totals bubble to ancestors (max depth 20),
      zero-value nodes pruned, children sorted desc.
- [ ] `periods.ts` — previous-period window (immediately preceding window of identical duration),
      12-month series bucketing.
- [ ] `cash.ts` — consolidated position (`totalCaixa`, `totalPassivos`,
      `posicaoLiquida = totalCaixa − totalPassivos`, honoring the liability sign inversion from
      `financial-account-configuration`), 3-closed-month burn window, runway, recurring monthly
      normalization (DIARIA `30.44/intervalo`, SEMANAL `52.18/12/intervalo`, ANUAL
      `1/(12·intervalo)`, else `1/intervalo`), daily projection from pending transactions +
      not-yet-materialized recurrence occurrences (expand from `proximaGeracaoEm` to avoid double
      counting), first-negative-date detection.
- [ ] `aging.ts` — six buckets (VENCIDO +60 / 31-60 / 1-30, A VENCER 0-30 / 31-60 / +60),
      average receipt/payment delay over a 90-day window, friction totals from
      `valorJuros` / `valorMulta` / `valorTaxas` / `valorDesconto` (columns already exist).
- [ ] Exclude transfers everywhere flow is measured: `metodo !== "TRANSFERENCIA"` (and entries
      with `origemTipo === "TRANSFERENCIA"` where aggregating the accrual side).
- [ ] Scope every query by `organizacaoId` (Control scopes by `parceiroId`; the tenancy key
      changes, the shape does not).
- [ ] Accrual vs cash split is preserved exactly: DRE and profitability aggregate
      `accountingEntries.dataCompetencia`; cash flow and receivables aggregate
      `financialTransactions.dataPrevisao` / `dataEfetivacao` (null `dataEfetivacao` = pending).
- [ ] Credit-card forecast dates reuse the existing `lib/finances/credit-card.ts` helpers.
- [ ] No balance checkpoints: compute current balances from `saldoInicial` + transaction sums
      (existing account-balance helpers). Record checkpoint tables/crons as a performance
      follow-up, out of scope here.
- [ ] Unit tests per file: classification over a natureza tree with partner-created sub-accounts,
      roll-up pruning/sorting, previous-window edges, recurring normalization factors, aging
      bucketing, liability sign handling, transfer exclusion.

### API routes — `app/api/finances/analytics/`

Standard four-part App Router files; GET with `periodAfter` / `periodBefore` string params
transformed in the Zod schema; response `{ data, message }` with exported output types.

- [ ] `analytics/dre/route.ts` — `TGetFinancesDreOutput`: current + previous period totals,
      12-month series (receita, custo, despesa, lucroBruto, resultado, margens), and the
      `demonstrativo` block (receita bruta → custos → lucro bruto → despesas → resultado
      operacional) with drill-down trees per line.
- [ ] `analytics/cash-flow/route.ts` — multi-mode GET: `visaoGeral` (position, burn, runway,
      recurring commitments, saldo por conta) and `projecao` (`horizonteDias` 7–180, default 90,
      daily series, `primeiraDataNegativa`).
- [ ] `analytics/receivables-payables/route.ts` — aging buckets, totals + overdue, average
      delays, friction (`jurosMultasPagos`, `descontosObtidos`, `taxasPorMetodo`), liquidity
      block (capital de giro, cobertura de fixos).
- [ ] `analytics/profitability/route.ts` — Phase 4, shape pending the adaptation decision below.
- [ ] Extend `app/api/finances/stats/route.ts` with previous-period totals so the executive
      summary can render deltas; keep its existing output backward-compatible for the current
      consumers; remove the stray `console.log`.
- [ ] All routes authenticated + `canViewFinances` enforced server-side.
- [ ] Query hooks in `lib/queries/finances.ts` (or a new `lib/queries/finance-analytics.ts`),
      with 500 ms debounced period params, typed from the routes' exported output types.

### Profitability adaptation (decision required)

Control's profitability is built on `projetoId` and emissor/destinatário CNPJ snapshots — none of
which exist on RecompraCRM's `accounting_entries`. A 1:1 port is impossible. Options:

1. **Adapt (recommended):** revenue ranking by cliente via `vendaId` → sale → client join; spend
   ranking by fornecedor via purchase linkage; concentration metric (top-5 % of revenue) kept.
   "Resultado por projeto" has no equivalent — the closest RecompraCRM axis is per origem/canal
   (VENDA, COMPRA, MANUAL, ...) or per plano-de-contas subtree, which the DRE drill-down already
   covers.
2. **Descope:** ship the other three reports now, design profitability separately once
   counterparty data (or a cost-center dimension) exists in the schema.

Phase 4 does not block Phases 1–3 either way.

## Frontend decomposition

Follow the sales pattern (thin server `page.tsx` → client `{feature}-page.tsx` → local
`_components/`), which is also what `frontend-target-architecture.md` mandates. Module-shared UI
goes in `app/dashboard/finance/_components/` — not in `components/**`, which is reserved for
proven cross-area reuse (locality first, promotion later).

```text
app/dashboard/finance/
  page.tsx                          guard + permissions → overview-page.tsx
  overview-page.tsx                 executive summary (ported ExecutiveSummarySection)
  _components/                      module-shared: DeltaBadge, stat cards, ReportsNav
  entries/{page.tsx, entries-page.tsx}
  transactions/{page.tsx, transactions-page.tsx}
  accounts/{page.tsx, accounts-page.tsx, _components/}
  credit-cards/{page.tsx, credit-card-invoices-page.tsx}
  reconciliation/{page.tsx, reconciliation-page.tsx, _components/}
  reports/
    layout.tsx or shared ReportsNav  local secondary navigation between reports
    income-statement/{page.tsx, income-statement-page.tsx, _components/}
    cash-flow/{page.tsx, cash-flow-page.tsx, _components/}
    receivables-payables/{page.tsx, receivables-payables-page.tsx, _components/}
    profitability/…                  Phase 4
```

- [ ] Move each `finances-page-*.tsx` view into its route directory, renamed to the
      `{feature}-page.tsx` convention. Moving ≠ redesigning: CRUD behavior is untouched.
- [ ] While moving, split the two oversized views per the target architecture:
      `finances-page-reconciliation.tsx` (548 l.) and `finances-page-financial-accounts.tsx`
      (440 l.) get local `_components/`.
- [ ] Port the five Control sections as the new report pages, adapted to RecompraCRM primitives:
      existing `DateIntervalInput`, `InteractiveFilter`, recharts, Sonner; UI copy stays pt-BR
      (RESUMO EXECUTIVO → Visão geral, DRE, FLUXO DE CAIXA, RECEBÍVEIS & PAGÁVEIS,
      RENTABILIDADE).
- [ ] Port `DeltaBadge` into `_components/` (period-over-period badge with `invert` semantics for
      cost/expense lines).
- [ ] Each route owns its loading, error, and empty states.
- [ ] Each route exports page `metadata`.
- [ ] Keep useful local query state (filters, pagination) per route; drop only the `view`
      contract.
- [ ] Modals stay where they are (`components/Modals/Finances/**`, `AccountingEntries/**`) for
      this migration — relocating legacy modals is out of scope.

## Phases

### Phase 1 — Route separation (no new features)

- [ ] Route registry conversion + call-site updates + tests.
- [ ] Scaffold the six workspace routes; move the six existing views.
- [ ] Sidebar group with children, capability filtering, active-state matching.
- [ ] Per-route server permission resolution.
- [ ] Delete the old tab shell (`finances-page.tsx` Tabs + `view` contract).
- [ ] Link audit (`/dashboard/finance` literals, `view=` literals).

### Phase 2 — Analytics backend

- [ ] `lib/finances/analytics/` library + unit tests.
- [ ] `analytics/dre`, `analytics/cash-flow`, `analytics/receivables-payables` routes.
- [ ] `stats` route previous-period extension.
- [ ] Query hooks.

### Phase 3 — Analytics UI

- [ ] Reports scaffolding + local secondary navigation.
- [ ] DRE workspace (statement lines, drill-down trees, 12-month composed chart).
- [ ] Cash-flow workspace (position KPIs, projection charts with synced tooltips,
      negative-balance alert).
- [ ] Receivables & payables workspace (aging chart, delay/friction cards).
- [ ] Overview upgrade to executive summary with deltas.

### Phase 4 — Profitability (after decision)

- [ ] Decide adaptation vs descope.
- [ ] Implement the chosen shape (route, endpoint, UI).

### Phase 5 — Cleanup and cross-doc updates

- [ ] Remove unused imports/utilities left by the moves.
- [ ] Update `dashboard-information-architecture-and-routes-plan.md`: finance local-tabs line
      superseded, follow-up recorded, finance page/API alignment noted.
- [ ] Update `financial-module-improvements-plan.md`: Phase 3 dashboard-totals items
      cross-referenced to the cash-flow workspace.

## Verification

- [ ] `npm run lint`, `npm run format:check`, focused tests, `npm run build`.
- [ ] Route-builder and analytics unit tests pass.
- [ ] Direct refresh on every new canonical route.
- [ ] Sidebar: expanded, icon-only, and mobile behavior; active group auto-open; exact-match
      overview vs prefix-match siblings.
- [ ] Profiles: finance-only member (sees module, correct mutation props), read-only member
      (views without mutation controls), member without `financeiro.visualizar` (no sidebar
      entry, `UnauthorizedPage` on direct access), organization without ERP (no module).
- [ ] DRE totals reconcile with the executive summary totals for the same period (single
      classifier guarantee).
- [ ] Transfers excluded: a transfer between accounts changes no report flow totals.
- [ ] No `view=` or `/dashboard/finance` string literals remain outside the registry.

## Out of scope

- Changes to `syncroniza-control` (source reference only).
- Balance checkpoint tables and their crons (performance follow-up).
- Relocating legacy finance modals out of `components/Modals/**`.
- Plano de contas workspace under finance (follow-up candidate).
- Recurring-rules dedicated surface (follow-up candidate).
- Granular finance capabilities beyond the existing resolver.
- Open Finance / reconciliation feature changes.
- API URL restructuring for existing CRUD endpoints.
