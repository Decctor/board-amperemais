# Conciliação Bancária — Design & Planejamento

> Status: IMPLEMENTADO (2026-07-19) — Fases 1–3 completas; Fase 4 com scaffolding + provider MOCK
> (troca por Pluggy/Belvo é plugável em lib/integrations/openfinance/providers.ts).
> PENDENTE: aplicar drizzle/0036_financial_reconciliation.sql no banco (db:push está bloqueado por
> drift pré-existente — tabelas ampmais_access_* fora do schema; ver §12). Cron openfinance-sync
> existe mas não está registrado em vercel.json (aguarda agregador real).
> Decisões fechadas: prefixo de tabelas `financial_*`; colunas com nomes simples no contexto
> da tabela; domínio de permissão `financeiro` criado (padrão optional/nullable); status
> "conciliada" derivado por join nos matches (sem coluna redundante).

## 1. Objetivo

Adicionar ao módulo financeiro a capacidade de conciliar extratos bancários com as
movimentações do sistema:

1. **v1 (arquivos)**: o usuário anexa documentos de extrato (OFX, CSV, XLSX, PDF/imagem)
   vinculados a uma conta financeira; o sistema extrai as linhas, casa cada linha com as
   `financialTransactions` existentes (algoritmos determinísticos + IA para ambiguidade) e
   oferece ações de sincronização (confirmar vínculo, efetivar pendente, criar lançamento,
   corrigir detalhes, ignorar).
2. **Futuro (OpenFinance)**: conexões automáticas alimentam a mesma estrutura de linhas de
   extrato — o motor de matching e a UI de revisão não mudam, apenas a origem dos dados.

## 2. O que já existe (base para reaproveitar)

| Peça | Onde | Uso na conciliação |
|---|---|---|
| Partidas dobradas: `accountingEntries` + `financialTransactions` + `accountsCharts` + `financialAccounts` | `services/drizzle/schema/financial.ts` | O lado "sistema" do matching. Status pendente/efetivada derivado de `dataEfetivacao` vs `dataPrevisao`. |
| Efetivação de transação (com gatilhos de cashback/fiscal p/ vendas) | `app/api/finances/financial-transactions/effect/route.ts` | Ação "efetivar & conciliar" deve reusar essa lógica (extrair p/ service compartilhado). |
| Extração IA de documento (PDF/imagem → Zod) | `lib/purchase/import.ts` (`gateway("anthropic/claude-sonnet-4.5")` + `Output.object`) | Molde para extração de extratos em PDF/imagem. |
| Matching em 3 estágios (determinístico → código → IA haiku com candidatos) | `lib/purchase/match-products.ts` | Molde direto para o motor de matching de linhas. |
| Mapeamento IA de colunas de planilha (headers + sampleRows) | `app/api/sales/bulk/map/route.ts`, `app/api/clients/bulk/map/route.ts` | Molde para CSV/XLSX de bancos com layouts variados. |
| Parsing XLSX | `lib/excel-utils.ts` (SheetJS) | Leitura de planilhas no cliente. |
| Upload direto ao Supabase Storage com progresso | `lib/uploads/supabase-upload-with-progress.ts` (bucket `files`) | Contorna limite de ~4.5MB de body; guarda o documento para auditoria. |
| Modal de import em fases (UPLOAD → PROCESSANDO → REVISAO) | `components/Modals/Purchases/Blocks/Utils/ImportCompositionWithAI.tsx` | Molde de UX do fluxo de importação. |
| Cron + outbox no banco (backoff, lock) | `lib/fiscal/worker.ts` + `app/api/cron/fiscal-queue/route.ts` | Molde para sync OpenFinance no futuro (e fallback p/ arquivos grandes). |
| Aprendizado de de-paras confirmados | `supplierProductMappings` (compras) | Molde para regras aprendidas (descrição → conta contábil/método). |
| Domínio de permissão opcional sem quebrar JSONB existente | `permissoes.integracoes` / `vendas.descontos` em `schemas/organizations.ts` | Molde para o novo domínio `financeiro`. |
| Padrão integrações: ingestão vs gestão | `data-connectors` (ingestão) / `lib/integrations` (gestão) — iFood | Molde para os conectores OpenFinance. |

**Não existe hoje**: nenhuma tabela/rota/parser de extrato bancário. "Conciliação" no código
atual é só a conferência de caixa de sessões de venda (`salesSessionReconciliations`).

## 3. Modelo de dados

Novo arquivo `services/drizzle/schema/financial-reconciliation.ts` (barrel em `schema/index.ts`),
enums Drizzle em `schema/enums.ts`, Zod em `schemas/financial-reconciliation.ts` + `schemas/enums.ts`.
Convenções padrão: `newTable`, PK uuid varchar(255), `organizacaoId` cascade + índice,
colunas em português snake_case, **nomes simples no contexto da tabela** (mesmo estilo de
`financialTransactions`: `titulo`, `tipo`, `valor`, `metodo`).

> Nota de nomenclatura: verificado — não há colisão com tabelas existentes; os exports Drizzle
> `financialStatementTransactions` e `financialTransactions` são parecidos mas distinguíveis.
> Datas permanecem qualificadas (`dataTransacao`, não `data`), seguindo o padrão
> `dataPrevisao`/`dataEfetivacao`/`dataCompetencia` do schema.

### `financial_statement_imports` — importações de extrato
- `id`, `organizacaoId` (FK cascade), `contaFinanceiraId` (FK → `financialAccounts`, notNull)
- `origem` enum `financialStatementOriginEnum`: `ARQUIVO` | `OPEN_FINANCE` (futuro)
- Arquivo: `arquivoNome`, `arquivoStoragePath`, `arquivoMimeType`, `arquivoTamanhoBytes` (nullables p/ OPEN_FINANCE)
- `status` enum `financialStatementImportStatusEnum`: `PROCESSANDO` | `PROCESSADO` | `ERRO`
- `erro` text nullable (mensagem de falha)
- Detectados do extrato (validação de sanidade): `periodoInicio`, `periodoFim`, `saldoInicial`, `saldoFinal` (nullables)
- `autorId` (FK → users), `dataInsercao`

### `financial_statement_transactions` — linhas do extrato
- `id`, `organizacaoId`, `importacaoId` (FK → imports, cascade), `contaFinanceiraId` (denormalizado da importação, p/ filtros)
- `dataTransacao` timestamp notNull
- `descricao` text, `valor` doublePrecision (sempre positivo), `tipo` enum existente `financialTransactionTypeEnum` (ENTRADA/SAIDA)
- `metodo` `paymentMethodEnum` nullable (PIX/TED/boleto inferidos da descrição)
- `idExterno` varchar nullable — FITID do OFX / id do agregador OpenFinance
- `hash` varchar notNull — sha256 de (contaFinanceiraId, dia de dataTransacao, valor, tipo, descrição normalizada)
- `status` enum `financialStatementTransactionStatusEnum`: `PENDENTE` | `CONCILIADA` | `IGNORADA`
- `metadados` jsonb (linha crua do parser, p/ debug/auditoria)
- `dataInsercao`
- **Idempotência**: unique parcial `(contaFinanceiraId, idExterno)` where not null;
  unique `(contaFinanceiraId, hash)` como fallback quando não há FITID. Reimportar o mesmo
  extrato (ou períodos sobrepostos) não duplica linhas — linhas já existentes são puladas e
  reportadas no resultado da importação.

### `financial_reconciliation_matches` — vínculos linha ↔ transação
- `id`, `organizacaoId`, `extratoTransacaoId` (FK → statement transactions, cascade), `transacaoFinanceiraId` (FK → `financialTransactions`, cascade)
- `tipo` enum `financialReconciliationMatchTypeEnum`: `AUTOMATICO` (estágio A) | `HEURISTICO` (estágio B) | `IA` (estágio C) | `MANUAL`
- `confianca` doublePrecision nullable (0..1)
- `status` enum `financialReconciliationMatchStatusEnum`: `SUGERIDO` | `CONFIRMADO` | `REJEITADO`
- `acao` enum nullable `financialReconciliationActionEnum`: `VINCULADO` (transação já efetivada) | `EFETIVADO` (pendente efetivada na confirmação) | `LANCAMENTO_CRIADO` (lançamento novo criado a partir da linha)
- `autorId` nullable (null p/ sugestões automáticas), `dataInsercao`
- Cardinalidade N-N natural via linhas múltiplas: 1 linha de extrato ↔ N transações
  (ex.: banco agrupou recebimentos) e N linhas ↔ 1 transação (ex.: parcelas). Unique
  `(extratoTransacaoId, transacaoFinanceiraId)`.
- **Decidido**: uma `financialTransaction` é considerada conciliada se possui match
  `CONFIRMADO` — derivado por join, sem coluna redundante em `financialTransactions`.
  Materializar só se os filtros pesarem no futuro.

### `financial_reconciliation_rules` — regras aprendidas (Fase 3)
- `id`, `organizacaoId`, `padraoDescricao` (token/regex normalizado), `tipo`, `contaContabilDebitoId`/`contaContabilCreditoId` (FK → `accountsCharts`), `metodo` nullable, `dataInsercao`
- Alimentada quando o usuário confirma "criar lançamento" — próxima linha parecida já vem
  com contas contábeis sugeridas (mesmo papel do `supplierProductMappings` em compras).

### Mudanças em tabelas existentes
- `accountingEntryOriginTypeEnum`: adicionar valor **`CONCILIACAO`** para lançamentos criados
  a partir de linha de extrato (rastreabilidade; hoje: VENDA, MANUAL, ESTORNO, TRANSFERENCIA).
- **`lib/organizations/deletion.ts`**: incluir as novas tabelas na ordem explícita de deleção
  (matches → statement transactions → imports → rules), antes das tabelas financeiras.
- Migração via `npm run db:push` (workflow real do projeto; journal do generate está defasado).

## 4. Pipeline de ingestão — `lib/financial-reconciliation/`

Pasta de domínio em `lib/` (padrão `lib/purchase`):

```
lib/financial-reconciliation/
  parse/ofx.ts          # parser determinístico OFX (SGML/XML), extrai FITID/DTPOSTED/TRNAMT/MEMO
  parse/tabular.ts      # CSV/XLSX: excel-utils + mapeamento IA de colunas (headers+samples)
  parse/document.ts     # PDF/imagem: extração IA (molde lib/purchase/import.ts, sonnet + Output.object)
  normalize.ts          # linha canônica, hash de dedup, inferência de método
  match.ts              # motor de matching (seção 5)
  sync.ts               # aplicação das ações (seção 6)
  index.ts
```

Estratégia por formato:
- **OFX** — 100% determinístico, sem IA. Formato padrão dos bancos BR; tem FITID (idempotência
  perfeita) e saldos. É o caminho feliz — a UI deve incentivar OFX.
- **CSV/XLSX** — parse determinístico das células (SheetJS já em uso); só a identificação de
  colunas (data/descrição/valor/tipo) usa IA quando o layout não bate com heurísticas
  (mesmo padrão de `bulk/map`: envia apenas headers + amostra de linhas, nunca a planilha inteira).
- **PDF/imagem** — extração IA completa com `ExtractedStatementSchema` (data, descrição, valor,
  tipo, saldo por linha quando houver). Menor confiabilidade: marcar importação como origem
  IA e validar soma das linhas vs saldos inicial/final quando extraídos (alerta de divergência).

Transporte do arquivo: **upload direto ao bucket `files`** (prefixo novo
`bank-statements/${organizacaoId}/...` via `uploadFileToSupabaseWithProgress`), e a rota de
processamento recebe `storagePath` e baixa do storage. Evita o teto de ~4.5MB de body (que
limita o import de compras a ~3MB base64) e preserva o documento para auditoria.

Processamento: **síncrono na rota** (`runtime="nodejs"`, `maxDuration=300`), um arquivo por
request, com fases de progresso no cliente — igual ao import de compras. Outbox+cron só se
surgir necessidade real (arquivos enormes), reusando o molde do fiscal worker.

## 5. Motor de matching — `match.ts`

Universo de candidatos: `financialTransactions` da mesma organização e mesma
`contaFinanceiraId` (+ transações com conta null, opcionalmente), não conciliadas, janela de
data ao redor do período do extrato. Estágios (molde `match-products.ts`):

- **Estágio A — exato (auto-sugestão com confiança 1.0)**: mesmo tipo, valor igual
  (tolerância 0.02, a mesma dos lançamentos), `dataEfetivacao` (ou `dataPrevisao` se pendente)
  a até ±2 dias, e candidato **único**. Match por `provedorReferencia` = `idExterno` da linha
  também entra aqui.
- **Estágio B — heurístico (score)**: janela ±7 dias, score ponderado por proximidade de data,
  igualdade de valor, compatibilidade de método e similaridade de descrição (tokens
  `unaccent ILIKE`, como o retrieval do estágio C de compras). Inclui detecção de composição:
  N linhas somando o valor de 1 transação (parcelas/agrupamento) dentro da janela. Score ≥
  limiar → sugestão `HEURISTICO`.
- **Estágio C — IA (ambíguos)**: para linhas com múltiplos candidatos plausíveis, **uma**
  chamada `gateway("anthropic/claude-haiku-4.5")` com até 5 candidatos por linha e
  `Output.object` (`{ matches: [{ linhaIndex, transacaoId|null, confianca }] }`), corte mínimo
  0.5. Best-effort: falha de IA deixa a linha sem sugestão, nunca quebra a importação.

Nenhum estágio confirma nada sozinho: tudo vira match `SUGERIDO`; a confirmação é humana
(com ação em lote para os de confiança 1.0). Linha sem candidato fica `PENDENTE` sem match —
candidata a "criar lançamento".

## 6. Ações de sincronização — `sync.ts`

Todas em `db.transaction`, escopadas por `organizacaoId`:

1. **Confirmar match** (transação já efetivada): match → `CONFIRMADO` + `acao=VINCULADO`;
   linha → `CONCILIADA`. Opcional: corrigir `dataEfetivacao`/valor da transação para os do
   extrato (mostrar diff na UI antes).
2. **Efetivar & conciliar** (transação pendente): reusar a lógica de efetivação — **extrair de
   `financial-transactions/effect/route.ts` um service `effectFinancialTransaction` compartilhado**
   (mantendo os gatilhos de cashback/fiscal p/ vendas), com `dataEfetivacao` = data da linha;
   depois confirmar o match (`acao=EFETIVADO`).
3. **Criar lançamento**: cria `accountingEntry` origem `CONCILIACAO` + `financialTransaction`
   já efetivada (conta financeira do extrato, data/valor/tipo da linha), contas contábeis
   sugeridas pelas regras aprendidas ou escolhidas no modal (reusar
   `use-internal-accounting-entry-state` com `initialState` pré-preenchido); cria match
   `CONFIRMADO`/`acao=LANCAMENTO_CRIADO`. Suporta lote (várias linhas → vários lançamentos).
4. **Ignorar linha**: linha → `IGNORADA` (reversível). P/ tarifas irrelevantes, estornos, etc.
5. **Rejeitar sugestão**: match → `REJEITADO` (não volta a ser sugerido para o mesmo par).

## 7. API — `app/api/finances/reconciliation/`

Padrão quatro-partes (input schema → service → handler → `appApiHandler`), sessão via
`getCurrentSessionUncached`, org de `session.membership.organizacao.id`, respostas
`{ data, message }` com tipos exportados.

- `imports/route.ts` — `POST` (recebe `{ contaFinanceiraId, storagePath, mimeType, nomeArquivo }`,
  baixa do storage, parseia, deduplica, roda matching, retorna resumo `{ importadas, duplicadasIgnoradas, sugeridas, semCorrespondencia }`); `GET` lista importações paginadas.
- `statement-transactions/route.ts` — `GET` paginado com filtros (conta, status, período,
  busca por descrição, modo `byId`); `PUT` ignorar/restaurar linha.
- `matches/route.ts` — `POST` criar match manual / confirmar sugestões (aceita lote de ids);
  `PUT` rejeitar.
- `sync/route.ts` — `POST` ações compostas em lote: `{ efetivar: [...], criarLancamentos: [...], confirmar: [...] }`.
- `rematch/route.ts` (Fase 2, opcional) — `POST` re-roda o matching para linhas pendentes
  (útil após criar lançamentos manualmente).

### Permissões (decidido)

Criar o domínio **`financeiro`** em `permissoes` (`schemas/organizations.ts`), seguindo o
molde de `integracoes` — **`.optional().nullable()`** para não quebrar o JSONB de membros e
convites existentes, com a semântica de ausência resolvida na aplicação (fallback para
`empresa.editar`, como as demais chaves opcionais; helper em `lib/permissions/`):

```
financeiro: { visualizar, criar, editar, conciliar } (optional/nullable)
```

- `visualizar` → GETs de finanças e conciliação
- `criar` → criar lançamentos/transferências
- `editar` → editar lançamentos, efetivar/ajustar transações
- `conciliar` → importar extratos, confirmar/rejeitar matches, ações de sync
- Aplicar validação nas rotas novas de conciliação **e** retrofit nas rotas existentes de
  `app/api/finances/*` (hoje exigem apenas membership).
- UI: novas seções de checkbox em `components/Modals/Users/Blocks/Permissions.tsx` e
  `components/Modals/OrganizationsMembershipInvitations/Blocks/Permissions.tsx`.

## 8. UI

Workspace **"Conciliação"** com rota canônica própria — `/dashboard/finance/reconciliation` →
`app/dashboard/finance/reconciliation/reconciliation-page.tsx` (a antiga aba `?view=reconciliation`
foi promovida a rota na separação do módulo financeiro; ver
`docs/dev-planning/finance-analytics-and-route-separation-plan.md`):

- **Header da aba**: seletor de conta financeira (BANCO/CARTEIRA_DIGITAL), botão "Importar extrato",
  cards-resumo (pendentes, sugeridas, conciliadas no período).
- **Modal de importação** `components/Modals/Finances/Reconciliation/NewStatementImport.tsx`:
  fases UPLOAD (drag-and-drop, upload direto ao storage com progresso) → PROCESSANDO →
  RESUMO (linhas importadas/duplicadas/sugeridas). Molde: `ImportCompositionWithAI`.
- **Workspace de conciliação** (corpo da aba): lista de linhas do extrato com badge de status;
  linha expandida mostra a(s) transação(ões) sugerida(s) lado a lado com confiança e diffs
  (data/valor); ações por linha (Conciliar, Efetivar & conciliar, Criar lançamento, Ignorar,
  Buscar manualmente) e ações em lote ("Confirmar todas as sugestões exatas").
- **Modal** `ControlStatementTransaction.tsx` p/ busca manual de transação e criação de
  lançamento a partir da linha.
- Queries em `lib/queries/financial-reconciliation.ts` (keys `financial-reconciliation-*`,
  debounce padrão), mutations em `lib/mutations/financial-reconciliation.ts` (wrappers Axios
  tipados pelas rotas).

## 9. Preparação para OpenFinance (Fase 4)

O design acima já isola a origem dos dados:

- `financial_statement_imports.origem = OPEN_FINANCE` com `arquivo*` null; adicionar
  `conexaoId` nullable quando existir a tabela de conexões.
- Conector (Pluggy/Belvo/etc.) roda via **cron + outbox** (molde fiscal worker / iFood):
  cada sync cria um import `OPEN_FINANCE` e insere linhas na mesma
  `financial_statement_transactions` — idempotente pelo `idExterno` do agregador.
- Seguir o padrão do projeto: **ingestão** em `data-connectors/`, **gestão da conexão**
  (vincular conta, ativar/desativar) em `lib/integrations/`.
- Motor de matching, ações de sync e workspace de revisão são 100% reaproveitados.

## 10. Fases de implementação

**Fase 1 — Fundação + OFX/planilhas** (entrega valor sozinha)
1. Schema (3 tabelas + enums Drizzle/Zod) + `db:push` + `lib/organizations/deletion.ts`.
2. Domínio de permissão `financeiro` (schema optional/nullable + helper de fallback + UI dos
   dois modais de permissões) e validação nas rotas novas + retrofit nas rotas de finanças.
3. `lib/financial-reconciliation/`: `parse/ofx.ts`, `parse/tabular.ts` (com mapeamento IA de colunas), `normalize.ts` (dedup/idempotência).
4. Rota `imports` (POST/GET) + upload direto ao storage; rota `statement-transactions` (GET/PUT ignorar).
5. UI: aba Conciliação + modal de importação + lista de linhas (sem matching ainda — só importar e visualizar/ignorar).

**Fase 2 — Matching + sincronização** (coração do recurso)
1. `match.ts` (estágios A/B/C) rodando ao final da importação + rota `rematch`.
2. `sync.ts` + extração do service compartilhado de efetivação + enum `CONCILIACAO`.
3. Rotas `matches` e `sync`; workspace completo (sugestões lado a lado, ações unitárias e em lote, criar lançamento com state-hook pré-preenchido).

**Fase 3 — Extração IA de PDF/imagem + aprendizado**
1. `parse/document.ts` (molde `lib/purchase/import.ts`) + validação saldo inicial/final.
2. `financial_reconciliation_rules`: gravação na confirmação de "criar lançamento" + sugestão de contas contábeis para linhas novas.
3. Refinos de UX (filtros, indicador de origem-IA, divergências de saldo).

**Fase 4 — OpenFinance**
1. Escolha do agregador + tabela de conexões + gestão em `lib/integrations/`.
2. Ingestão via cron/outbox em `data-connectors/` gravando nas tabelas existentes.

## 11. Riscos e observações

- **PDF de extrato é o formato menos confiável** (IA pode errar valores/linhas em extratos longos); mitigação: validação de saldos + revisão humana obrigatória + incentivar OFX na UI.
- **Duplicidade entre extrato e recebíveis de integração** (ex.: repasse iFood já provisionado na conta first-party `IFOOD`): o matching por valor/data tende a casar naturalmente, mas vale teste dirigido na Fase 2.
- **Retrofit de permissões nas rotas existentes de finanças** muda comportamento para membros sem a chave `financeiro` — o fallback para `empresa.editar` (padrão das chaves opcionais) precisa ser comunicado/testado para não travar operação de quem usa hoje.
- **Tolerâncias** (0.02 de valor, ±2/±7 dias) devem ser constantes nomeadas em `lib/financial-reconciliation/` — possivelmente configuráveis por organização no futuro.
- **Exports Drizzle parecidos**: `financialStatementTransactions` vs `financialTransactions` — atenção em imports/autocomplete.

## 12. Migração pendente (pós-implementação)

O `npm run db:push` foi abortado de propósito: além das tabelas novas, o push tentaria (a) criar a
constraint pendente `uq_weekly_send_counters_org_campanha_semana` (delta legítimo de um commit
anterior) e (b) **DELETAR** as tabelas `ampmais_access_*` (16 registros em `ampmais_access_events`),
que existem no banco mas não no schema Drizzle — drift pré-existente que precisa de decisão humana.

Enquanto isso, as mudanças da conciliação (100% aditivas) estão em
`drizzle/0036_financial_reconciliation.sql`. Para aplicar, uma das opções:
1. Rodar o SQL diretamente (Supabase SQL Editor ou psql com `SUPABASE_DB_URL`).
2. Resolver o drift (incorporar/descartar as tabelas `access_*` no schema) e então `npm run db:push`
   respondendo "create" para os enums/tabelas novos.
