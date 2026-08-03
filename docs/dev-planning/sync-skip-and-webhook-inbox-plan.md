# Skip de vendas inalteradas + Inbox de webhooks — Planejamento

> Status: implementado em 2026-08-01 (fases 1–5). Pendente: `npm run db:push` para criar a
> coluna `assinatura_externa` em `ampmais_sales`, o enum `external_event_processing_status`
> e a tabela `ampmais_external_events`; conferir `META_APP_SECRET` antes do deploy (§4.0).
> Motivado pela investigação de custo de Fluid Provisioned Memory na Vercel (projeto
> `recompracrm`, time `syncroniza`).
>
> Rev. 2: incorpora revisão externa — fingerprint pela projeção de persistência (não pelo
> canônico bruto), efeitos ignoram vendas skipadas, contrato de durabilidade honesto no
> inbox, autenticação dos webhooks como pré-requisito, ownership de organização, seam de
> processamento reutilizável.

## 1. Motivação

### 1.1 O custo medido

`Fluid Provisioned Memory` é a maior linha da fatura do time (jul/2026: $9,08 de $43,41), e
~95% dela é do projeto `recompracrm`. A dimensão cobra **wall-clock** da instância (memória
provisionada enquanto há request em andamento), não CPU: o projeto usou ~471 GB-hr no mês
contra apenas ~9 CPU-hr — menos de 4% de utilização de CPU. Ou seja, pagamos instâncias de
4 GB paradas esperando I/O.

O baseline pré-módulo-de-IA (1–27/jul) era **~10,5 GB-hr/dia**, e o principal suspeito desse
baseline é o cron `data-collecting`:

- Roda **288×/dia** (`*/5 * * * *`), com `maxDuration = 300`.
- A janela de importação é sempre **o dia inteiro** ([lib/data-collecting-v2/index.ts:44](../../lib/data-collecting-v2/index.ts)).
- Para **toda** venda já existente na janela, `syncSales` faz um
  `tx.update(sales).set(updateValues)` **incondicional**
  ([lib/data-collecting-v2/sync-sales.ts:343](../../lib/data-collecting-v2/sync-sales.ts)) — mesmo
  que nada tenha mudado na fonte.
- Conectores com `saleItemRewritePolicy === "REPLACE_ON_EVERY_SYNC"` ainda **deletam e
  reinserem todos os itens e modificadores** da venda a cada sync
  ([sync-sales.ts:344-347](../../lib/data-collecting-v2/sync-sales.ts)).
- O loop de organizações e o loop de vendas são **sequenciais**: cada venda custa vários
  round trips ao banco, um atrás do outro.

Consequência: no fim do dia, o run nº 280 reescreve tudo o que os runs nº 1–279 já
escreveram. As **escritas** crescem linearmente ao longo do dia. Duração de run =
wall-clock = GB-hr faturado.

### 1.2 Webhooks perdidos

Os payloads dos webhooks do WhatsApp (Meta Cloud API e Gateway Interno) são descartados após
o processamento. Hoje, quando algo dá errado, a recuperação é feita **raspando os runtime
logs da Vercel** ([scripts/backfill-whatsapp-webhook-logs.ts](../../scripts/backfill-whatsapp-webhook-logs.ts)),
que no plano Pro têm **1 dia de retenção**. Passou de 24h, perdeu-se o dado para sempre.

## 2. Resultado esperado

| Frente                              | Antes                                                            | Depois                                                                                                                                                                               |
| ----------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Escritas do `data-collecting`       | O(vendas do dia) por run, crescente                              | **O(vendas alteradas)** por run                                                                                                                                                      |
| Pipeline como um todo               | —                                                                | Ainda O(vendas importadas): fetch do conector, resolução auxiliar, cômputo de hash e iteração continuam. O ganho é a eliminação dos round trips de escrita, que dominam o wall-clock |
| Visibilidade                        | `created`/`updated` no summary                                   | + `unchanged` (skips), comprovando o ganho nos logs do cron                                                                                                                          |
| Payloads de webhook                 | Perdidos após processamento; recovery via scraping de logs (24h) | Arquivados 30 dias com contrato durável, status de processamento e replay por script                                                                                                 |
| Fluid Provisioned Memory (baseline) | ~10,5 GB-hr/dia                                                  | Redução da parcela do `data-collecting`; medir com `vercel usage --breakdown daily`                                                                                                  |

Expectativa honesta: este plano ataca o **baseline**. O grosso do gasto pós-28/jul é o
caminho do agente de IA, já endereçado por `AI_TURN_TRANSPORT=queue` (acompanhar em
paralelo).

## 3. Parte A — Assinatura de importação em `sales` (skip de inalteradas)

Decisão de design: **coluna na própria tabela `sales`**, não tabela separada. O
`syncSales` já busca as vendas existentes em batch
([sync-sales.ts:257-270](../../lib/data-collecting-v2/sync-sales.ts)) — adicionar a coluna a esse
select custa zero queries extras, não cria segunda fonte de verdade e dispensa retenção.

### 3.1 Schema

Em [services/drizzle/schema/sales.ts](../../services/drizzle/schema/sales.ts):

```typescript
// Assinatura da última projeção de persistência importada (formato "v1:<sha256>"). null =
// venda nunca carimbada (legado) — tratada como alterada no próximo sync.
assinaturaExterna: text("assinatura_externa"),
```

Nullable, sem backfill: o primeiro sync pós-deploy reescreve (como hoje) e carimba; do
segundo em diante, o skip engata. Migração via `npm run db:push` (workflow estabelecido do
repo — o journal de migrations está desatualizado e `generate` acusa drift); conferir os
prompts de drift com atenção e **nunca** aceitar sugestões de drop/data-loss às cegas.

**Exposição consciente**: `GET /api/sales?id=` retorna a linha inteira da venda
([app/api/sales/route.ts:288](../../app/api/sales/route.ts) usa `findFirst` sem restrição de
`columns` na própria venda), então `assinaturaExterna` vai aparecer na resposta. Decisão:
aceitável — é um hash de conteúdo, não-sensível e não-reversível. Fica documentado.

### 3.2 Módulo de assinatura — `lib/data-collecting-v2/sale-signature.ts`

**Princípio: a assinatura representa a projeção de persistência — exatamente o que o sync
escreveria — e não o payload canônico bruto.** Motivo: `resolveSaleItemTarget`
([sync-sales.ts:90](../../lib/data-collecting-v2/sync-sales.ts)) resolve `productCode` →
`produtoId`/`produtoVarianteId`/opções contra o estado da **plataforma**, e a resolução de
modificadores idem (`opcaoId`). Um produto/modificador irresolvível hoje pode se tornar
resolvível amanhã **sem o payload da fonte mudar** — um hash do canônico bruto ficaria
idêntico e a venda seria skipada para sempre. Hashear a projeção também elimina o risco de
drift-por-omissão: se alguém adicionar um campo em `buildSaleValues`, ele entra na
assinatura automaticamente.

Entrada da assinatura (computada no ponto do fluxo onde tudo já está resolvido):

```typescript
computeSaleImportSignature({
	saleValues,           // retorno de buildSaleValues — já inclui clienteId/vendedorId/
	                      // parceiroId resolvidos, statuses mapeados, integracaoMetadados
	resolvedItems,        // itens pós-resolução: produtoId, produtoVarianteId, opcoes,
	                      // quantidades/valores, metadados, modificadores com opcaoId resolvido
	saleItemRewritePolicy // mudança de política do conector também deve invalidar
}): string                // → "v1:<sha256 hex>"
```

O campo `raw` do canônico não participa (e não basta tipar `Omit<..., "raw">` — o módulo
**descarta `raw` em runtime** ao montar `resolvedItems`, já que tipos não removem campos de
objetos reais).

Normalização (determinismo):

- Chaves de objeto ordenadas recursivamente.
- `Date` → `toISOString()` **antes** da canonicalização. Atenção: o util existente
  [lib/ai/operations/hash.ts](../../lib/ai/operations/hash.ts) trata `Date` como objeto genérico e
  o colapsa em `{}` — não reutilizar sem esse tratamento. O módulo novo implementa a própria
  canonicalização (~20 linhas) com teste próprio.
- Arrays de itens/modificadores ordenados pela forma canônica serializada de cada elemento
  (a ordem de chegada do conector pode variar entre fetches e não é semântica **neste
  domínio** — regra local, não reutilizar para outros payloads).
- `undefined` omitido; `null` preservado.
- Prefixo de versão `"v1:"` — mudar o esquema de hash no futuro é só bumpar para `"v2:"`:
  todas as assinaturas antigas deixam de bater e o sistema reprocessa uma vez, sem migração.

### 3.3 Integração no `syncSales`

1. Adicionar `assinaturaExterna` às `columns` do select de `existingSales`.
2. Após resolver cliente/vendedor/parceiro **e itens/modificadores**, computar a assinatura.
3. **Condição de skip** (todas obrigatórias):
   - `existingSale` existe;
   - `existingSale.assinaturaExterna === assinatura`;
   - `!saleIsManaged` — **guard do canal gerenciado** (ver 3.4).
4. No skip: **não** executa o `update` de `sales` nem o rewrite de itens/modificadores. A
   venda entra em `persistedSales` com `skipped: true`.
5. Fora do skip: caminho atual + `assinaturaExterna` gravada no insert/update.

**Efeitos ignoram vendas skipadas — explicitamente, não "por construção".** A suposição
inicial de que as flags seriam neutras estava errada para um caso: `nowCanceled` é **estado
atual**, não transição ([sync-sales.ts:304](../../lib/data-collecting-v2/sync-sales.ts)), e
`previouslyValid` deriva de `natureza`/`valorTotal` persistidos — então uma venda cancelada
**inalterada** dispara `reverseSaleCashback` a cada run
([effects.ts:279](../../lib/data-collecting-v2/effects.ts)), hoje inclusive (round trips
repetidos que o skip também elimina). A regra passa a ser: assinatura igual **prova** que a
transação de import daquele estado já commitou — logo `processDataCollectingV2Effects` pula
entradas com `skipped: true` no início do loop. Exige **teste de integração** (seção 6),
não só teste de hash.

### 3.4 Guard do canal gerenciado (iFood)

O skip **não se aplica** quando `saleIsManaged`. Motivo:
`applyManagedSaleDeliveryEffects` roda em todo sync de venda entregue **de propósito** — é a
rede de segurança para entregas feitas pelo board _entre_ syncs
([sync-sales.ts:312](../../lib/data-collecting-v2/sync-sales.ts)), um caso em que o estado da
**plataforma** mudou sem a **fonte** mudar. Um skip por hash de fonte engoliria essa
verificação. O volume que interessa ao custo é o dos conectores legados (Bling etc.) — o
canal gerenciado fica com o comportamento atual em v1.

### 3.5 Contadores e consumidores

- `TPersistedSaleForEffects` ganha `skipped: boolean`.
- `TDataCollectingV2RunSummary` ganha `unchangedSalesCount`; `updatedSalesCount` passa a
  contar apenas escritas reais (não-novo e não-skipped).
- Revisar os consumidores do summary na implementação:
  [app/api/cron/fix-previous-sales/route.ts:55](../../app/api/cron/fix-previous-sales/route.ts)
  (agrega contadores — herda o campo novo), o output de
  [scripts/sync-data-collecting.ts](../../scripts/sync-data-collecting.ts) (imprimir
  `unchanged`) e o snapshot dormante de
  [lib/data-collecting-v2/validation.ts](../../lib/data-collecting-v2/validation.ts) (sem
  consumidores ativos hoje; atualizar ou remover).
- O route do cron já loga o summary por organização — os skips ficam visíveis nos logs de
  produção sem trabalho extra.

## 4. Parte B — Inbox de webhooks (`external_events`)

### 4.0 Pré-requisito: autenticar antes de arquivar

Arquivar payloads torna dois problemas **pré-existentes** mais sérios — passamos a persistir
e a ter tooling de replay para bodies potencialmente forjados. Corrigir antes de ligar a
escrita:

1. **Meta: POST sem verificação de assinatura.** Hoje
   [app/api/integrations/whatsapp/route.ts:107](../../app/api/integrations/whatsapp/route.ts) faz
   `req.json()` direto — o verify token do GET não autentica deliveries. Implementar:
   ler o **body cru** (`req.text()`), verificar `x-hub-signature-256` (HMAC-SHA256 com
   `META_APP_SECRET`, já presente nas envs) com comparação timing-safe
   (`crypto.timingSafeEqual`), e só então `JSON.parse`. Requests sem assinatura válida →
   `401`, sem arquivar.
2. **Gateway: autenticação fail-open.** `API_SECRET = process.env.INTERNAL_WHATSAPP_GATEWAY_API_SECRET`
   sem guard ([gateway/route.ts:28](../../app/api/integrations/whatsapp/gateway/route.ts)): com a
   env ausente, `undefined === undefined` autoriza qualquer request. Passar a **falhar
   fechado**: secret ausente → `500` + log de erro de configuração.

### 4.1 Escopo v1: arquivo durável + status de processamento + replay

O inbox **não entra no caminho de decisão de negócio**. A deduplicação de processamento
continua onde está e funciona: índice único de `wamid` (migração 0057) no persist de
mensagens e `idempotencyKey` no publish da fila de turnos de IA. O inbox entrega:

- **Durabilidade**: payload persistido antes de qualquer processamento (contrato em 4.3).
- **Observabilidade**: status de processamento por evento — hoje uma falha dentro de
  `waitUntil` só é descoberta em log.
- **Replay**: reprocessamento por script, aposentando o scraping de logs.

### 4.2 Schema — `services/drizzle/schema/external-events.ts`

```typescript
export const externalEvents = newTable("external_events", {
	id: varchar("id", { length: 255 })
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	// nullable: o webhook chega antes da resolução; o processamento backfilla (ver 4.5)
	organizacaoId: varchar("organizacao_id", { length: 255 }),
	origem: externalEventSourceEnum("origem").notNull(),
	tipo: text("tipo").notNull(),
	chaveIdempotencia: text("chave_idempotencia").notNull(),
	payload: jsonb("payload").notNull(),
	processamentoStatus: externalEventProcessingStatusEnum("processamento_status").notNull().default("RECEBIDO"),
	processamentoData: timestamp("processamento_data"),
	processamentoUltimoErro: text("processamento_ultimo_erro"), // truncado (ex.: 2000 chars)
	dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
});
// uniqueIndex nomeado (origem, chave_idempotencia)
// index nomeado (data_insercao)   → varredura de retenção
// index nomeado (organizacao_id)  → consulta e deleção por org
```

- Enums em `schema/enums.ts` (espelho Zod em `/schemas/enums.ts`):
  - `externalEventSourceEnum`: `"META-WHATSAPP" | "WHATSAPP-GATEWAY"` — extensível.
  - `externalEventProcessingStatusEnum`: `"RECEBIDO" | "PROCESSADO" | "FALHOU"`.
- `tipo`: classificação rasa para consulta (`"MESSAGES" | "STATUSES" | "TEMPLATE" |
"HISTORY" | "SMB-APP-STATE" | "MISTO" | "DESCONHECIDO"`) — `MISTO` para bodies da Meta
  com múltiplos tipos de evento; classificações próprias para os eventos do gateway
  (`message.received` etc.).
- Barrel-export em `schema/index.ts` + tipos inferidos (`$inferSelect`/`$inferInsert`),
  padrão do repo.
- Granularidade: **1 linha por payload distinto** (payload = body inteiro do POST).
  `chaveIdempotencia` = hash canônico do body — retries do provider com body idêntico
  colapsam na mesma linha via `onConflictDoNothing` (comportamento desejado: é redelivery,
  não evento novo). Linha-por-evento-interno fica para v2 se precisarmos de query fina.
- **Hash do webhook ≠ hash da venda**: util genérico versionado (`"v1:"`), chaves ordenadas,
  `Date` não ocorre (JSON puro), e **ordem de arrays preservada** — em payloads de provider
  a ordem pode ser semântica; a regra de ordenar arrays é específica do domínio de vendas e
  não deve ser reutilizada cegamente.

### 4.3 Pontos de escrita e contrato de durabilidade

Nos dois webhooks ([route.ts](../../app/api/integrations/whatsapp/route.ts) e
[gateway/route.ts](../../app/api/integrations/whatsapp/gateway/route.ts)): **após autenticação**
(4.0) e antes de qualquer processamento — `await insert … onConflictDoNothing()`.

**Contrato: inbox durável.** Se o insert de arquivamento falhar, o webhook retorna **5xx** e
**não** processa — o provider reentrega (Meta faz retry com backoff; a redelivery é inócua
graças ao índice de wamid e à `idempotencyKey` da fila). "Await + catch + 200" seria
best-effort fingindo ser durável: payload perdido com o provider achando que entregou.
Trade-off aceito: indisponibilidade prolongada do banco vira retries acumulados no provider
— cenário em que hoje o dado seria simplesmente perdido.

### 4.4 Retenção

30 dias. **Postgres não tem `DELETE ... LIMIT`** — usar keyset em lote:

```sql
DELETE FROM ampmais_external_events
WHERE id IN (
  SELECT id FROM ampmais_external_events
  WHERE data_insercao < now() - interval '30 days'
  ORDER BY data_insercao
  LIMIT 500
);
-- loop até 0 linhas afetadas
```

Acoplado ao cron semanal `retention-cleanup` (`0 6 * * 0`, ex-`access-cleanup`, renomeado ao
absorver esta segunda política de retenção) — idade efetiva máxima ~37 dias,
aceitável. Se o volume crescer, mover para varredura diária.

### 4.5 Seam de processamento + ownership de organização

- **Extrair as duas `processWebhookAsync` privadas** para módulos reutilizáveis (ex.:
  `lib/whatsapp/webhook-processing.ts`). Route e replay script viram dois adapters do mesmo
  seam.
- **O processador lança erros** (o da Meta hoje suprime com catch interno — replay reportaria
  sucesso falso). O adapter do route captura, loga e **atualiza a linha do inbox**:
  `PROCESSADO`/`FALHOU` + `processamentoData` + `processamentoUltimoErro` truncado. O
  adapter de replay propaga para o sumário do script.
- **Backfill de `organizacaoId` no processamento**: o processador já resolve a organização
  (phone_number_id → org na Meta; sessionId → org no gateway); a mesma atualização de status
  carimba a org. Body da Meta pode conter múltiplas entries de orgs diferentes: org única
  resolvida ⇒ carimba; múltiplas/nenhuma ⇒ permanece `null`. Com isso a **deleção de
  organização funciona de verdade** para linhas carimbadas (LGPD: payloads contêm telefone,
  nome, conteúdo de mensagem); linhas `null` ficam para a retenção de 30 dias.

### 4.6 Replay — `scripts/replay-external-events.ts`

Seguro por padrão:

- **Dry-run por default**; só executa com `--apply`.
- Filtro **obrigatório** e limitado: `--origem` + (`--desde`/`--ate` | `--chave` | `--ids`),
  `--limit` com teto.
- Ordem determinística (`data_insercao, id`), processamento em lote.
- Sumário por evento (ok/falha/erro), **sem logar payloads** (dados pessoais).
- `connection.end()` em `finally` (padrão dos scripts do repo).
- Usa o seam de 4.5 — erros do processador aparecem no sumário, não somem.

### 4.7 Deleção de organização

Adicionar `external_events` à lista ordenada de `lib/organizations/deletion.ts` (padrão do
módulo: deletes explícitos, sem depender de cascade), deletando por `organizacaoId`.

## 5. Fases

| Fase | Entrega                                                                         | Deploy isolado?                             |
| ---- | ------------------------------------------------------------------------------- | ------------------------------------------- |
| 1    | Coluna `assinatura_externa` (db:push) + `sale-signature.ts` + testes unitários  | Sim (nada usa ainda)                        |
| 2    | Integração no `syncSales` + filtro de skipadas nos efeitos + contadores         | Sim — observar `unchanged` nos logs do cron |
| 3    | **Hardening dos webhooks** (HMAC Meta + gateway fail-closed)                    | Sim — pré-requisito da Fase 4               |
| 4    | Schema `external_events` + seam de processamento + escrita durável + status     | Sim                                         |
| 5    | Retenção no `retention-cleanup` + `replay-external-events.ts` + deletion module | Sim                                         |

## 6. Testes

### 6.1 Unitários (node:test, padrão do repo)

`lib/data-collecting-v2/sale-signature.test.ts`:

- **Determinismo**: chaves em ordem diferente ⇒ mesmo hash; itens reordenados ⇒ mesmo hash;
  `Date` equivalentes (instâncias distintas) ⇒ mesmo hash; `raw` diferente ⇒ mesmo hash
  (descartado em runtime).
- **Sensibilidade**: mudar status, valores, quantidade de item, modificador, **ID resolvido
  de produto/variante/opção de modificador** ou `saleItemRewritePolicy` ⇒ hash diferente.
- **Regressão do bug de Date**: `occurredAt` distinto ⇒ hash distinto (garante que `Date`
  não colapsou em `{}` como no util de `lib/ai/operations/hash.ts`).
- **Formato**: prefixo `v1:`.

Util de hash de webhook: determinismo por chaves, **ordem de array preservada** (arrays
trocados ⇒ hash diferente).

Rodar no padrão dos testes existentes (cf. `test:ai-quotes` no package.json):

```bash
node --import tsx --test lib/data-collecting-v2/sale-signature.test.ts
```

### 6.2 Integração do skip (comportamento, não só hash)

Sobre `syncSales`/`processDataCollectingV2Effects` (banco de teste ou org descartável):

- Assinatura igual + não-gerenciada ⇒ **zero** update/delete/insert para a venda.
- Assinatura `null` (legado) ou diferente ⇒ escreve e carimba.
- Produto antes irresolvível que passa a resolver ⇒ assinatura invalida ⇒ re-sync.
- Venda gerenciada ⇒ **nunca** skipa (guard 3.4).
- Venda cancelada inalterada skipada ⇒ `reverseSaleCashback` **não** executa.
- Partição correta de `created`/`updated`/`unchanged` no summary.

### 6.3 Loop local do `data-collecting` medindo skips

Harness: [scripts/sync-data-collecting.ts](../../scripts/sync-data-collecting.ts) (agnóstico de
conector; ex-`sync-bling-collecting`) já executa
**o mesmo pipeline** do cron (`runDataCollectingV2`) com janela e efeitos controláveis.

> ⚠️ O `.env` local aponta para o banco de produção. Usar organização de baixo volume,
> janela curta e efeitos desligados (`skip`) — o pipeline de sync em si é idempotente por
> construção.

Sequência:

```bash
# Run A — primeira execução pós-Fase 2: carimba as assinaturas.
# Esperado: created=0, updated=N, unchanged=0
npm run sync:data-collecting -- --org=<orgId> --start=<hojeT00:00> --end=<agora> \
  --cashback=skip --campaigns=skip --conversion-attribution=skip

# Run B — imediatamente em seguida, mesma janela. Nada mudou na fonte.
# Esperado: created=0, updated=0, unchanged=N   ← a prova do fix
npm run sync:data-collecting -- --org=<orgId> --start=<hojeT00:00> --end=<agora> \
  --cashback=skip --campaigns=skip --conversion-attribution=skip

# Run C — mutação controlada: invalidar a assinatura de UMA venda direto no banco
# (equivale a "a fonte mudou") e rodar de novo.
#   UPDATE ampmais_sales SET assinatura_externa = 'v0:invalida' WHERE id = '<saleId>';
# Esperado: updated=1, unchanged=N-1
```

Acompanhamento do carimbo em produção (progresso do rollout):

```sql
SELECT count(*) FILTER (WHERE assinatura_externa IS NULL)  AS sem_assinatura,
       count(*) FILTER (WHERE assinatura_externa IS NOT NULL) AS carimbadas
FROM ampmais_sales
WHERE organizacao_id = '<orgId>' AND data_venda >= now() - interval '2 days';
```

Também vale um teste de mutação real na fonte (editar uma venda no Bling e rodar de novo):
cobre o caminho fim-a-fim que o UPDATE manual só simula.

### 6.4 Webhooks e inbox

- **Auth**: POST da Meta sem/with assinatura HMAC inválida ⇒ `401` e **nada arquivado**;
  gateway com env do secret ausente ⇒ `500` (fail-closed), nunca autorizado.
- **Inbox local**: `npm run dev` + `curl -X POST` com body real assinado, duas vezes ⇒ **1**
  linha (conflito na segunda); status transiciona `RECEBIDO → PROCESSADO`; falha simulada no
  processador ⇒ `FALHOU` + `processamentoUltimoErro` preenchido.
- **Contrato durável**: falha simulada do insert de arquivamento ⇒ resposta 5xx, nada
  processado.
- **Replay**: dry-run não escreve; `--apply` reprocessa sem duplicar mensagem (wamid segura);
  erro do processador aparece no sumário do script.
- **Retenção**: lote keyset deleta apenas além do cutoff, em iterações limitadas.
- **Deleção de org**: remove as linhas carimbadas com a org.

### 6.5 Métricas de produção

- **Logs do cron**: os summaries por organização passam a imprimir `unchanged` — comparar
  runs de início vs. fim de dia (hoje o fim de dia é o pior caso).
- **Fatura**: uma semana antes vs. depois da Fase 2:

```bash
vercel usage --scope syncroniza --from <ini> --to <fim> --breakdown daily --group-by project
```

O alvo é a queda do componente diário de `Fluid Provisioned Memory` do `recompracrm` em
direção ao patamar pré-28/jul e abaixo dele (descontado o efeito, paralelo, da migração do
turno de IA para a fila).

## 7. Riscos e reversibilidade

| Risco                                                                                                     | Mitigação                                                                                                                                                                                                                                                            |
| --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Assinatura não cobre algo que o sync escreve ⇒ mudança silenciosamente não sincronizada                   | Hash da **projeção de persistência** (`saleValues` + itens resolvidos): campo novo em `buildSaleValues` entra automaticamente; resolução tardia de produto/modificador invalida o hash. Se o esquema mudar: bump `v1:` → `v2:` força reprocesso geral, sem migração. |
| Skip engolir a rede de segurança do canal gerenciado                                                      | Guard explícito `!saleIsManaged` (3.4); iFood mantém comportamento atual.                                                                                                                                                                                            |
| Efeitos executarem para venda skipada (ex.: reversão de cashback — `nowCanceled` é estado, não transição) | Efeitos **ignoram** `skipped: true` (3.3), coberto por teste de integração (6.2).                                                                                                                                                                                    |
| Payload forjado arquivado/replayado                                                                       | Autenticação antes do arquivamento (4.0): HMAC Meta + gateway fail-closed.                                                                                                                                                                                           |
| Perda de payload com 200 devolvido                                                                        | Contrato durável: falha de arquivamento ⇒ 5xx ⇒ provider reentrega (redelivery inócua via wamid/idempotencyKey).                                                                                                                                                     |
| Indisponibilidade prolongada do banco ⇒ retries acumulados no provider                                    | Aceito: hoje o dado seria perdido; com o contrato, é reentregue quando o banco voltar.                                                                                                                                                                               |
| Deleção de org não remover payloads (dados pessoais)                                                      | Backfill de `organizacaoId` no processamento (4.5) + entrada no deletion module (4.7); linhas `null` caem na retenção de 30d.                                                                                                                                        |
| Crescimento da tabela de eventos                                                                          | Retenção keyset em lote (4.4) + índice em `data_insercao`.                                                                                                                                                                                                           |
| Rollback da Parte A                                                                                       | Reverter o código da Fase 2; a coluna pode ficar (inerte).                                                                                                                                                                                                           |
| Rollback da Parte B                                                                                       | Remover os pontos de escrita; nada de negócio depende da tabela. O hardening de auth (Fase 3) **não** se reverte — é correção de segurança por si só.                                                                                                                |
