---
target: purchase accounting-entry transactions table
total_score: 16
p0_count: 2
p1_count: 3
timestamp: 2026-07-25T10-25-47Z
slug: rchases-blocks-utils-purchasetransactionstable-tsx
---
# Critique: purchase accounting-entry transactions table (both repos)

Register: product. Source-level review (no dev server per project CLAUDE.md).
Two independent assessments: LLM design review + `impeccable detect` v3.3.1.

## Design Health Score

| #   | Heuristic                       | Score     | Key issue                                                                                 |
| --- | ------------------------------- | --------- | ----------------------------------------------------------------------------------------- |
| 1   | Visibility of System Status     | 2         | Auto-commit is unacknowledged; empty table reads BALANCEADO; bar clamps at 100%            |
| 2   | Match System / Real World       | 2         | VALOR PREVISTO vs EFETIVO undifferentiated, only one governs the rule; no installment UI   |
| 3   | User Control and Freedom        | 1         | No undo on delete or on auto-commit                                                       |
| 4   | Consistency and Standards       | 1         | 6 cells / 5 declared grid cols, 2 unwired; 3 tolerance values; card-date logic in one repo |
| 5   | Error Prevention                | 1         | No client-side balance gate; SALVAR enabled into a guaranteed 400                          |
| 6   | Recognition Rather Than Recall  | 2         | Neither governing rule (auto-commit, blank-valor-means-remainder) is stated                |
| 7   | Flexibility and Efficiency      | 2         | Tab traps at col 0 (RecompraCRM); no grid nav at all (Control); no installment generator   |
| 8   | Aesthetic and Minimalist Design | 3         | Genuinely restrained; emphasis inverted (loud type toggle, quiet blocker)                  |
| 9   | Error Recovery                  | 1         | Rule-not-delta toast after full submit; silent no-ops; no aria-invalid                     |
| 10  | Help and Documentation          | 1         | One hint, only when empty, and factually wrong in RecompraCRM                              |
|     | **Total**                       | **16/40** | **Poor (behavior). Visual layer alone would score low 30s.**                               |

## Anti-Patterns Verdict

Not AI slop visually. Tinted neutrals, hairline borders, `tabular-nums` on money, no shadows, structural (not fluid) responsive strategy. Zero hits for gradients, glassmorphism, gradient text, side-stripe borders, hardcoded #000/#fff, bounce easing, em dashes. All semantic color pairs carry dark variants. Icon-only buttons and editable cells all have `aria-label`.

Detector: 4 advisory `design-system-font-size` findings (0.65/0.68rem below the 0.75rem ramp floor). Systemic, not local: `text-[0.65rem]` appears ~470 times in RecompraCRM and across 456 files in Control.

The failure is behavioral, and it is concentrated exactly where money moves.

## What's Working

1. The coverage meter is the right instrument: money-in-context, and it distinguishes EXCEDENTE from PENDENTE instead of collapsing both to "invalid".
2. The cell primitives are properly engineered: display/input swap, `select()` on entry, Escape-restores, focus-visible rings, and RecompraCRM's `skipNextBlurCommitRef` correctly defuses the Tab double-commit race.
3. Responsive strategy is structural: cells re-hosted in labelled `MobileEditableField` rather than a horizontally-scrolling table.

## Priority Issues

**[P0] The draft row invents a money amount.** `effectiveValue = valor > 0 ? valor : suggestedValue` — typing only a título schedules a payment for the entire remaining balance. Auto-commit-on-first-field is the established house pattern (CompositionTable commits once the asset is picked), so the commit itself is fine; inventing the *amount* is not. The composition table defaults valor to 0 and never fabricates a figure. Fix: pre-fill the draft's valor as an editable suggestion rendered as a suggestion (muted/ghost), and require it to be real before commit.

**[P0] VALOR EFETIVO = 0 is a silent dead end.** `entryValue = accountingEntry.valor` (EFETIVO). At 0, `suggestedValue` is 0, so a typed título commits nothing, with no message. RecompraCRM's empty-state copy says "Preencha o título na linha em branco" — factually wrong in that state. Meanwhile the meter reads green BALANCEADO / SEM DIFERENÇA over an empty bar. Fix: when `entryValue <= 0`, state the actual blocker and point at the field; label the zero-row state SEM TRANSAÇÕES, not BALANCEADO.

**[P1] RecompraCRM: Tab traps in the title cell.** `TRANSACTION_GRID_COL` declares METHOD:1 and ACCOUNT:2 with `colCount = 5`, but neither select is wired with grid props, and TYPE isn't in the map at all. `handleSpreadsheetNavigationKeyDown` calls `event.preventDefault()` *before* `focusSpreadsheetCell` (spreadsheet-navigation.ts:155), so an unregistered target swallows the keystroke and focus stays put. Verified in source. Fix: wire METHOD/ACCOUNT the way `Items.tsx` wires its select, add TYPE, set colCount 6. Separately worth moving the `preventDefault` after a confirmed focus so unregistered cells degrade to native Tab.

**[P1] No client-side balance gate.** `getAccountingEntryBalanceError` is imported only by the API route. SALVAR is enabled and the whole purchase 400s on a delta the screen already computed and rendered in `text-muted-foreground`. Control gates the builder stage but not the edit modal. Fix: call the helper client-side, give the panel destructive treatment when blocking, and name the number on the button.

**[P1] No undo on destructive or auto-commit actions.** One-click delete, no confirm, no toast, no undo; auto-commit equally irreversible. State is local and mutators are index-based, so Sonner undo toasts are cheap.

**[P2] RecompraCRM: draft Valor displays a number its editor doesn't contain.** `value={draft.valor}` (0) with `format` falling through to `suggestedValue` — the cell reads R$ 1.200,00, you click it, the input says 0. Control passes the resolved value and is correct. Asymmetry between the two implementations.

**[P2] Control: tolerance drift and a no-op fossil.** `Math.abs(missingTotal) < 0.02` hardcoded (line 39) while the exported `ACCOUNTING_ENTRY_BALANCE_TOLERANCE` uses `>` — at exactly 0.02 the UI says PENDENTE and the server accepts. The pre-existing card editor uses 0.01. Three thresholds for one rule. Also `const draftWithSuggestion = { ...draft, valor: draft.valor }` (line 268) is a no-op named after a behavior it doesn't implement.

**[P2] `transition-all` animates `width` on the progress fill.** Both repos (Control:88, RecompraCRM:122). Layout property animated every frame; `transform: scaleX()` is the compositor-only equivalent.

**[P2] Type toggle has no focus-visible ring** while every sibling cell opts into one. Native button so the UA ring survives, but it's a design-system inconsistency on a tinted fill.

**[P2] No installment generator.** The card editor it parallels has `AddMultiFinancialTransactionsMenu` + `distributeTotalEqually` for exact-cent distribution. The table hardcodes `parcela: null, totalParcelas: null` and has no `dataEfetivacao`. A 6x card purchase means six hand-rounded rows against a to-the-cent server check.

## Persona Red Flags

**Marina (purchasing/finance operator, project-specific):** fills VALOR PREVISTO because it comes first, types a título, nothing happens, concludes the feature is broken. Once EFETIVO is set, her first blur creates a full-amount payment with `A_DEFINIR` and no account. Cannot mark anything effective, so the screen can't answer "did we pay it?"

**Alex (power user):** Tab inert from the title cell in RecompraCRM; no grid nav at all in Control. No duplicate-row, no bulk delete, no paste, despite a `components/Spreadsheet/*` namespace.

**Sam (accessibility):** coverage bar is a bare div with no `role="progressbar"`/`aria-valuenow`; the BALANCEADO/PENDENTE swap has no `aria-live`, so the one signal governing saveability is inaudible. Invalid cells set a red border only. Column headers are `<p>` in flex divs (house pattern, but it means cells are announced without their column name).

**Riley (stress tester):** EFETIVO=0 → inert table, no message. Overshoot R$10.000 vs R$0,03 → identical full red bar (`Math.min(100, ...)`). Fill método first then título → works; printed order → doesn't.

## Minor Observations

- Row keys depend on index with a shared "nova" prefix; inserting above a new row remounts it and drops edit state.
- Control does `T12:00:00` noon normalization inline in the table; RecompraCRM correctly owns it inside `EditableDateCell`.
- Draft placeholder case flips across breakpoints (NOVA TRANSAÇÃO / Nova transação) - propagated from Items/CompositionTable.
- Empty-state copy disagrees across repos about what's required, and both are wrong about the actual rule.
- Divergence already baked in: `min-h-10` vs `min-h-11`, `rounded-2xl bg-muted/35` vs `rounded-md bg-muted/30`. Each matches its own neighbour.
- `Ações` 8% (Control) vs 5% (RecompraCRM); 5% risks under-running 44x44 touch guidance.
- Cross-repo duplication: 240 identical lines (53%) between the two tables; the 42-line coverage panel differs in only 4 lines, 3 cosmetically.
