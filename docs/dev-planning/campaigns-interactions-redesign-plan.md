# Campaigns + Interactions — Audit & Redesign Plan

**Status:** proposta (2026-07-13)
**Scope:** campaign processing (single-use, recurrent, event-triggered), interaction delivery pipeline, weekly limit capping, campaign bonuses (cashback/coupon).
**Related:** supersedes and absorbs `docs/dev-planning/bulk-messaging-workflows-plan.md` (outbox proposal); consistent with `docs/seller-routine-hub-design.md` (interactions as relationship primitive).

---

## Part 1 — Audit

### 1.1 The root cause everything else follows from

The `interactions` table plays **four roles at once**:

1. **CRM relationship timeline** (canal/direcao/iniciadoPor/vendedorId/dataInteracao/status) — the seller-routine primitive.
2. **Message delivery queue** (agendamentoDataReferencia/agendamentoBlocoReferencia + `statusEnvio IS NULL` = "pending work").
3. **Quota ledger** — weekly usage is `COUNT(*)` over interactions with `statusEnvio IN (PENDENTE, ENVIADO, ENTREGUE, LIDO)` and `dataExecucao >= startOfWeek` (`lib/interactions/campaign-weekly-limits.ts:344-397`).
4. **Attribution anchor** (`dataExecucao` feeds conversion attribution).

Because the queue, the ledger, and the record are the same rows:

- Enforcing a limit requires **mutating rows into `BLOQUEADA`** — dead data polluting the timeline and stats, created in 5 different places in `campaign-weekly-limits.ts` (lines 583, 719, 777, 983, 1057) plus `send-reserved-interaction.ts:457`.
- Quota checks require `COUNT(*)` scans plus `SELECT ... FOR UPDATE` **on the organization row itself** (`campaign-weekly-limits.ts:564, 689, 880`), serializing every send in the org through one lock.
- `dataExecucao` is simultaneously the **claim lock**, the **quota window anchor**, and the **attribution anchor** (acknowledged in `seller-routine-hub-design.md:69`). A crash between claim (`dataExecucao` set) and send (`statusEnvio` set) leaves rows invisible to the drain query (`process-interactions/route.ts:88-92` requires both NULL) — never retried. `scripts/recover-single-use-campaign.ts` exists because this happened in production.

### 1.2 Bonus-at-enqueue

Cashback/coupons are granted when the interaction is **created**, not when the message is delivered (`lib/data-collecting-v2/effects.ts:357-406`, `process-single-use-campaigns/route.ts:160-185`). Every blocked/failed send therefore needs **compensating reversal**, keyed by a `metadados ->> 'interacaoId'` back-reference on cashback transactions (`lib/cashback/reverse-campaign-cashback.ts:58`) — an unindexed JSON scan, and only stamped since commit 55c09fb (older grants are unreversible). Reversal runs in a different transaction than some block decisions, so a crash in between leaks granted-but-unsent cashback.

### 1.3 The pipeline is fragile by construction

- **Three crons fire at the same minute hourly** (`vercel.json:47-70`), each iterating **all organizations sequentially**, `maxDuration = 300s`. Only `process-interactions` has an internal time budget; the two enqueue crons can be hard-killed mid-run.
- **Single-use claim = `UPDATE campaigns SET ativo = false`** *before* audience resolution and enqueue (`process-single-use-campaigns/route.ts:224-233`). Timeout mid-run ⇒ campaign permanently deactivated with a partial audience, silently. The failure note even says "campanha permaneceu desativada e NÃO foi reativada".
- **Dedup is SELECT-then-INSERT with no unique constraint** (recurrent: `route.ts:147-161`; single-use: `route.ts:125-138`; event path: 4 copies of `canScheduleCampaignForClient`). Overlapping runs can double-enqueue; recurrent has no claim at all.
- **Send is non-atomic**: chat-message insert, provider call, and status writes are separate statements (`send-reserved-interaction.ts:318-513`). Crash after the provider call but before the status write ⇒ duplicate send on any retry. There is no idempotency key at the provider boundary.
- The retry endpoint (`app/api/campaigns/interactions/route.ts:301-302`) requires `dataExecucao IS NULL`, but any send failure inside `sendReservedInteraction` happens *after* reservation set `dataExecucao` — so retry is unreachable exactly for real send failures.

### 1.4 Duplication census

| Logic | Copies | Locations |
|---|---|---|
| Event-trigger engine | 2 (+1 in test script) | `lib/data-collecting-v2/effects.ts` vs `app/api/point-of-interaction/new-transaction/route.ts` (behaviorally divergent: `allowNewPurchaseOnFirstPurchase` false vs true) |
| `canScheduleCampaignForClient` (frequency dedup) | 4 | effects.ts:41, new-transaction/route.ts:43, test script, inline |
| Quota reservation | 3 | `reserveCampaignWeeklyQuota` / `reserveCampaignWeeklyQuotaBatch` / `reserveOrganizationWeeklyQuotaBatch` (~500 lines of near-identical claim/block logic) |
| `processChunkImmediateInteractions` + chunk/sleep/retry helpers | 3 | both enqueue crons + process-interactions' `buildImmediateProcessingData` |
| Webhook status mapping + handlers | 2 | `integrations/whatsapp/route.ts:329` vs `whatsapp/gateway/route.ts:447` |
| `getEffectiveCampaignWeeklyLimit` | 2 | `lib/campaigns/validation.ts:113` vs `campaign-weekly-limits.ts:94` |
| Enum definitions | 2–3 | pgEnum + Zod + `$type` text columns; live drift: `whatsappMensagemId` vs `whatsappMessageId` (`schemas/interactions.ts:22-23`) |

### 1.5 Data-model debt

- **No CREATE TABLE migration exists** for campaigns/interactions/conversions — schema is `db:push`-managed; the `drizzle/*.sql` files are a partial, misleading record (`0024` even targets an unprefixed table name).
- `statusEnvio` and `atribuicao_modelo` are raw `text` with `$type` casts — DB accepts anything.
- `interactions.metadados` is untyped jsonb with **three divergent shapes** written by different modules (`schemas/interactions.ts:9-44` vs `lib/message-templates/variables.ts:195-213` vs `lib/campaigns/interaction-metadata.ts:72-128`).
- `campaigns` is single-table accretion: 12 trigger types × dedicated nullable `gatilho_*` columns; boolean+nullable-cluster pattern for cashback/coupon config; recurrence day lists as JSON-in-`text`.
- Missing indexes for hot analytics: stats queries filter `statusEnvio` + `dataInsercao` (no covering index); `campaign_conversions` has **no `organizacao_id` index**; campaign list full-text search has no GIN index.
- Trigger thresholds use **exact equality** (`newTotalPurchaseValue === gatilhoValorTotalCompras`, effects.ts:97) — a sale that crosses the threshold without landing on it never fires; float equality besides.
- Campaign weekly limit above org limit is silently clamped at runtime (surfaced as blocked sends) instead of rejected at save time.

### 1.6 What the operational scripts prove

- `scripts/recover-single-use-campaign.ts` — audiences partially enqueued + PENDENTE rows reserved-but-never-dispatched (claim-then-crash).
- `scripts/backfill-campaign-interaction-delivery-dates.ts` — delivered rows with NULL `dataExecucao`/`dataEnvio`, i.e. sends invisible to quota and reporting.
- `utils/scripts/test-recurrent-campaign-weekly-quota.ts` — quota behavior untrusted enough to need a hand-rolled phone-targeted test rig; no automated test coverage exists for any of this.

---

## Part 2 — Target architecture

**Principle: separate the pipeline from the record.**
The pipeline (what should be sent, to whom, under what budget) lives in dedicated dispatch tables. `interactions` returns to being the **record of things that actually happened** — clean timeline, no dead rows, no queue semantics.

### 2.1 New tables

```
campaign_dispatches            -- one row per campaign "run"
  id, organizacao_id, campanha_id
  origem            ENUM('AGENDADA','RECORRENTE','EVENTO')
  janela_referencia text        -- 'YYYY-MM-DD@HH:00' for scheduled; sale id for event
  status            ENUM('PENDENTE','RESOLVENDO','ENFILEIRADA','ENVIANDO','CONCLUIDA','FALHOU','CANCELADA')
  total_destinatarios, total_enviados, total_falhados, total_pulados  int
  erro, data_insercao, data_conclusao
  UNIQUE (campanha_id, janela_referencia)          -- idempotent run creation

campaign_dispatch_recipients   -- the outbox / work queue
  id, dispatch_id FK, organizacao_id, campanha_id, cliente_id
  status            ENUM('AGUARDANDO','RESERVADA','ENVIADA','FALHOU','PULADA')
  motivo_pulo       ENUM('QUOTA_ORG','QUOTA_CAMPANHA','SEM_CONTATO','COMUNICACAO_PAUSADA','FREQUENCIA') NULL
  tentativas int, erro text
  interacao_id FK NULL          -- set when the send happens
  idempotency_key varchar       -- passed to provider; makes retries safe
  UNIQUE (dispatch_id, cliente_id)                 -- idempotent enqueue (ON CONFLICT DO NOTHING)

weekly_send_counters           -- O(1) quota ledger, replaces COUNT(*) + BLOQUEADA
  organizacao_id, campanha_id NULL, semana_chave ('2026-W28'), usados int
  UNIQUE (organizacao_id, campanha_id, semana_chave)   -- campanha_id NULL = org counter
```

### 2.2 Quota enforcement (kills BLOQUEADA)

Reservation becomes one atomic statement per counter — no org-row lock, no COUNT(*), no status mutation:

```sql
UPDATE weekly_send_counters
SET usados = usados + :n
WHERE organizacao_id = :org AND campanha_id IS NOT DISTINCT FROM :camp
  AND semana_chave = :week AND usados + :n <= :limit
RETURNING usados;
```

(Wrapped in upsert-then-claim; claim org counter and campaign counter in a fixed order to avoid deadlock. When quota is partial, claim `min(remaining, batch)` and mark the rest `PULADA/QUOTA_*`.)

- Over-quota recipients are marked `PULADA` with a reason — **no interaction row is ever created**, so nothing pollutes the timeline and there is nothing to reverse.
- Terminal failures decrement the counter (explicit, auditable) — replacing today's accidental behavior where `FALHOU` retroactively frees quota by falling out of the counted statuses.
- Limits keep today's semantics: effective limit = `min(campaign, org)`; week key stays `America/Sao_Paulo`. New: reject `campaign limit > org limit` at save time instead of clamping at send time.

### 2.3 Processing (one dispatcher + one sender)

Replace the three-cron structure with two roles, both idempotent and resumable:

1. **Dispatcher** (cron, cheap, frequent): for each due campaign, `INSERT campaign_dispatches ... ON CONFLICT DO NOTHING` (the unique key on `(campanha_id, janela_referencia)` *is* the claim — deletes the `ativo=false` lock). Then resolve the audience and bulk-insert recipients `ON CONFLICT DO NOTHING`. Frequency-cap and communication-pause filters run here, marking `PULADA` rows instead of silently skipping — full observability of why someone wasn't messaged. Advances dispatch status `PENDENTE → ENFILEIRADA`; safe to re-run at any point.
2. **Sender** (cron or Vercel Workflow step): claims recipient batches with `FOR UPDATE SKIP LOCKED`, reserves quota via counters, sends with the recipient's `idempotency_key`, writes the `interactions` row at send time (`interacao_id` back-ref), updates recipient + dispatch counters. Multiple concurrent senders are safe by construction; a killed run resumes where it left off because state lives in rows, not in process memory.

Single-use and recurrent campaigns become the *same* flow — the only difference is how `janela_referencia` is computed. Event-triggered campaigns create a 1-recipient dispatch (`origem = 'EVENTO'`, `janela_referencia = saleId`) through the **one shared engine** (see 2.5) — same quota, same journal, same debuggability.

Execution substrate: the dispatcher/sender split works on plain crons + SKIP LOCKED today, and maps 1:1 onto Vercel Workflows later (dispatch = workflow run, chunk = step) as `bulk-messaging-workflows-plan.md` proposed. Start with crons — no new infra — and adopt Workflows only if the 300s ceiling still bites after the redesign.

### 2.4 Bonus on delivery

Grant cashback/coupon when the send **succeeds** (recipient → `ENVIADA`, or first delivery webhook), inside the same transaction that records the interaction. Deletes: `reverseCampaignCashbackForBlockedInteractions`, the `metadados->>'interacaoId'` back-reference convention, and the cashback-leak window. (Product note: message templates that mention the bonus remain valid — the grant lands milliseconds before/with the send.)

### 2.5 One event-trigger engine

Extract to `lib/campaigns/engine/` (single module consumed by both `lib/data-collecting-v2/effects.ts` and `app/api/point-of-interaction/new-transaction/route.ts`):

- `resolveTriggeredCampaigns(saleContext)` — pure function: priority resolution + threshold **crossing** semantics (`previous < threshold && new >= threshold`) instead of float equality. One explicit decision on `allowNewPurchaseOnFirstPurchase` (today the two paths silently disagree).
- `checkFrequencyCap(...)` — the single `canScheduleCampaignForClient` (deletes 3 copies).
- Both entry points shrink to: build context → call engine → create dispatch+recipient.

### 2.6 Schema hygiene (with the dust settled)

- `interactions` sheds queue columns (`agendamento*`, `statusEnvio`-as-claim ambiguity): rows are created at send time with `canal`/`direcao`/`iniciadoPor` populated; `statusEnvio` remains as pure delivery tracking (ENVIADO→ENTREGUE→LIDO via webhooks) and becomes a **pgEnum**; `FALHOU`/`BLOQUEADA` disappear from it (failures/blocks live on recipients).
- `dataExecucao` overload dissolves: claim → recipient row; quota → counters; attribution → interaction creation timestamp.
- Type `metadados` (`$type` + one Zod schema; fix `whatsappMensagemId`/`whatsappMessageId`).
- Unify the two webhook handlers behind one `applyProviderStatusUpdate`.
- Add missing indexes: `campaign_conversions (organizacao_id, campanha_id, data_conversao)`; stats-covering index on interactions; GIN for campaign search.
- Optional later: fold `gatilho_*` column sprawl into a discriminated `configuracaoGatilho` jsonb validated by a Zod discriminated union on `gatilhoTipo`.

### 2.7 Testability & debuggability

- Eligibility, priority, frequency-cap, quota-math, and recurrence-schedule logic become **pure functions** → plain unit tests (replaces the phone-targeted test rig).
- The dispatch journal answers "why didn't client X get campaign Y?" with a row: `PULADA/QUOTA_ORG`, `PULADA/SEM_CONTATO`, etc. Today that answer requires archaeology across BLOQUEADA rows and logs.
- A small admin view over dispatches (status, counts, errors, retry button) replaces `recover-single-use-campaign.ts` — stuck dispatches are visible and re-runnable instead of requiring hardcoded-UUID scripts.

---

## Part 3 — Migration plan (strangler, each phase ships alone)

**Phase 0 — stop the bleeding (days).** No schema changes: move the single-use `ativo=false` claim to *after* successful enqueue (or reactivate on failure); validate campaign-limit ≤ org-limit at save; fix threshold-crossing equality bugs; delete dead code (`processMultipleInteractions`, unused delivery-state helpers, stale TODOs); dedupe the copy-pasted chunk/retry helpers into `lib/campaigns/shared`.

**Phase 1 — quota counters.** Add `weekly_send_counters`; swap the three reservation functions for counter claims (one ~100-line module replaces ~1000 lines); backfill current week from existing counts; stop writing quota-`BLOQUEADA`. Keep `SEM_CONTATO` blocking as-is for now.

**Phase 2 — dispatch/recipients for scheduled campaigns.** New tables; dispatcher+sender replace `process-single-use-campaigns` and `process-recurrent-campaigns`; `process-interactions` keeps draining legacy event-path rows during transition. Roll out behind a per-org flag; dual-run comparison on a pilot org; then cutover and delete the two crons + recovery scripts.

**Phase 3 — bonus on delivery.** Move grant to send success; delete reversal machinery and the metadata back-reference.

**Phase 4 — unified event engine.** Extract `lib/campaigns/engine/`; route sales + POI paths through it; event sends become 1-recipient dispatches; retire the legacy drain path in `process-interactions`.

**Phase 5 — schema hygiene + cleanup.** pgEnums, typed metadata, indexes, webhook unification; archive historical `BLOQUEADA` rows (their information now lives in recipients) or keep them read-only for history.

**Testing gate per phase:** unit tests on the pure functions; one integration test per pipeline invariant (idempotent enqueue, crash-resume, quota-exact, no-double-send with concurrent senders).

---

## Part 4 — Open decisions

1. **Crons+SKIP LOCKED vs Vercel Workflows** for the sender (plan recommends starting with crons; the design is substrate-agnostic).
2. **Quota release on failure** — decrement counters on terminal failure (recommended, matches current accidental behavior) or count attempts.
3. **Bonus grant moment** — at send success vs at first delivery webhook (recommend send success: simpler, and gateway sends may lack delivery receipts).
4. **Historical BLOQUEADA rows** — archive table vs delete after stats windows close.
5. Whether Phase 5 folds `gatilho_*` columns into a discriminated jsonb config or leaves the wide table.
