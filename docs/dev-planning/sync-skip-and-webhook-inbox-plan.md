# Skip de vendas inalteradas + Inbox de webhooks — Planejamento

> Status: planejado em 2026-08-01. Motivado pela investigação de custo de Fluid Provisioned
> Memory na Vercel (projeto `recompracrm`, time `syncroniza`).

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
escreveram. A duração do run cresce linearmente ao longo do dia — é O(vendas do dia) quando
deveria ser O(vendas alteradas). Duração de run = wall-clock = GB-hr faturado.

### 1.2 Webhooks perdidos

Os payloads dos webhooks do WhatsApp (Meta Cloud API e Gateway Interno) são descartados após
o processamento. Hoje, quando algo dá errado, a recuperação é feita **raspando os runtime
logs da Vercel** ([scripts/backfill-whatsapp-webhook-logs.ts](../../scripts/backfill-whatsapp-webhook-logs.ts)),
que no plano Pro têm **1 dia de retenção**. Passou de 24h, perdeu-se o dado para sempre.

## 2. Resultado esperado

| Frente | Antes | Depois |
| --- | --- | --- |
| Duração do run do `data-collecting` | O(vendas do dia), crescente ao longo do dia | O(vendas alteradas) — a maioria dos runs vira no-op de escrita |
| Visibilidade | `created`/`updated` no summary | + `unchanged` (skips), comprovando o ganho nos logs do cron |
| Payloads de webhook | Perdidos após processamento; recovery via scraping de logs (24h) | Arquivados 30 dias em tabela própria, com replay por script |
| Fluid Provisioned Memory (baseline) | ~10,5 GB-hr/dia | Redução esperada da parcela do `data-collecting`; medir com `vercel usage --breakdown daily` |

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
// Assinatura do último estado canônico importado (formato "v1:<sha256>"). null = venda
// nunca carimbada (legado) — tratada como alterada no próximo sync.
assinaturaExterna: text("assinatura_externa"),
```

Nullable, sem backfill: o primeiro sync pós-deploy reescreve (como hoje) e carimba; do
segundo em diante, o skip engata. Migração via `npm run db:push` — conferir os prompts de
drift com atenção e **nunca** aceitar sugestões de drop/data-loss às cegas.

### 3.2 Módulo de assinatura — `lib/data-collecting-v2/sale-signature.ts`

**Princípio: hash do objeto canônico inteiro, nunca de campos escolhidos a dedo.** Uma
assinatura tipo "data-cliente-valor-itens" erra por omissão: se não cobrir
`statusText`/`isCanceled`, uma venda cancelada nunca re-sincroniza; e vira bug de drift
quando alguém adicionar um campo em `buildSaleValues` e esquecer a assinatura. O
`TCanonicalSale` já **é** o "o que a fonte diz agora" normalizado pelo conector — é o input
certo.

Entrada da assinatura:

```typescript
computeSaleImportSignature({
	sale,        // TCanonicalSale SEM o campo `raw` (payload bruto pode variar entre fetches)
	clienteId,   // IDs resolvidos: a resolução pode mudar entre runs
	vendedorId,  // (ex.: vendedor criado na plataforma depois) sem o payload mudar —
	parceiroId,  // incluí-los no hash cobre esse drift
}): string     // → "v1:<sha256 hex>"
```

Normalização (determinismo):

- Chaves de objeto ordenadas recursivamente.
- `Date` → `toISOString()` **antes** da canonicalização. Atenção: o util existente
  [lib/ai/operations/hash.ts](../../lib/ai/operations/hash.ts) trata `Date` como objeto genérico e
  o colapsa em `{}` — não reutilizar sem esse tratamento. O módulo novo implementa a própria
  canonicalização (~20 linhas) com teste próprio.
- Arrays sem ordem semântica (`items`, `modifiers`, `payments`) ordenados pela forma
  canônica serializada de cada elemento (a ordem de chegada do conector pode variar entre
  fetches).
- `undefined` omitido; `null` preservado.
- Prefixo de versão `"v1:"` — mudar o esquema de hash no futuro é só bumpar para `"v2:"`:
  todas as assinaturas antigas deixam de bater e o sistema reprocessa uma vez, sem migração.

### 3.3 Integração no `syncSales`

1. Adicionar `assinaturaExterna` às `columns` do select de `existingSales`.
2. Após resolver cliente/vendedor/parceiro, computar a assinatura.
3. **Condição de skip** (todas obrigatórias):
   - `existingSale` existe;
   - `existingSale.assinaturaExterna === assinatura`;
   - `!saleIsManaged` — **guard do canal gerenciado** (ver 3.4).
4. No skip: **não** executa o `update` de `sales` nem o rewrite de itens/modificadores. Todo
   o resto do fluxo continua igual: flags de transição são computadas como hoje (por
   construção serão neutras — assinatura igual ⇒ mesma validade da fonte ⇒
   `becameValid = false`, `nowCanceled` sem transição) e a venda **continua entrando em
   `persistedSales`**, com marcador `skipped: true`. Isso preserva a semântica dos efeitos
   byte a byte: [effects.ts:266+](../../lib/data-collecting-v2/effects.ts) já gateia tudo em
   `becameValid` / `previouslyValid && nowCanceled`, então vendas inalteradas já não
   contribuem com nada hoje.
5. Fora do skip: caminho atual + `assinaturaExterna` gravada no insert/update (entra no
   objeto de valores junto com os demais campos).

### 3.4 Guard do canal gerenciado (iFood)

O skip **não se aplica** quando `saleIsManaged`. Motivo:
`applyManagedSaleDeliveryEffects` roda em todo sync de venda entregue **de propósito** — é a
rede de segurança para entregas feitas pelo board *entre* syncs
([sync-sales.ts:312](../../lib/data-collecting-v2/sync-sales.ts)), um caso em que o estado da
**plataforma** mudou sem a **fonte** mudar. Um skip por hash de fonte engoliria essa
verificação. O volume que interessa ao custo é o dos conectores legados (Bling etc.) — o
canal gerenciado fica com o comportamento atual em v1.

### 3.5 Contadores

- `TPersistedSaleForEffects` ganha `skipped: boolean`.
- `TDataCollectingV2RunSummary` ganha `unchangedSalesCount`.
- `createdSalesCount` / `updatedSalesCount` passam a refletir apenas escritas reais
  (`updated` = não-novo e não-skipped).
- O route do cron já loga o summary por organização — os skips ficam visíveis nos logs de
  produção sem trabalho extra.

## 4. Parte B — Inbox de webhooks (`external_events`)

### 4.1 Escopo v1: arquivo write-only + replay

O inbox em v1 **não entra no caminho de decisão**. A deduplicação de processamento continua
onde está e funciona: índice único de `wamid` (migração 0057) no persist de mensagens e
`idempotencyKey` no publish da fila de turnos de IA. O que o inbox resolve é **durabilidade
e replay**: payload guardado antes de qualquer processamento, consultável por 30 dias,
reprocessável por script. Promovê-lo a gate de processamento (padrão inbox completo) fica
para uma v2, se houver motivo.

### 4.2 Schema — `services/drizzle/schema/external-events.ts`

```typescript
export const externalEvents = newTable("external_events", {
	id: varchar("id", { length: 255 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
	organizacaoId: varchar("organizacao_id", { length: 255 }), // nullable: chega antes da resolução de org
	origem: externalEventSourceEnum("origem").notNull(),
	tipo: text("tipo").notNull(),
	chaveIdempotencia: text("chave_idempotencia").notNull(),
	payload: jsonb("payload").notNull(),
	dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
});
// uniqueIndex (origem, chave_idempotencia)
// index (data_insercao)  → varredura de retenção
// index (organizacao_id) → consulta e deleção por org
```

- `externalEventSourceEnum` em `schema/enums.ts` (e espelho Zod em `/schemas/enums.ts`):
  `"META-WHATSAPP" | "WHATSAPP-GATEWAY"` — extensível (futuros: Stripe, iFood, Mux…).
- `tipo`: classificação rasa para consulta (`"MESSAGES" | "STATUSES" | "TEMPLATE" |
  "HISTORY" | "SMB-APP-STATE" | "DESCONHECIDO"`), derivada de uma inspeção leve do body.
- Granularidade: **1 linha por POST recebido** (payload = body inteiro), não 1 linha por
  evento interno. Espelha o replay que já praticamos (o backfill parseia bodies inteiros) e
  mantém o código do webhook trivial. `chaveIdempotencia` = sha256 do body canonicalizado
  (mesma canonicalização do módulo de assinatura). Linha-por-evento fica para v2 se
  precisarmos de query fina.

### 4.3 Pontos de escrita

- [app/api/integrations/whatsapp/route.ts](../../app/api/integrations/whatsapp/route.ts) (Meta):
  após o parse do body e **antes** do `200` — `insert … onConflictDoNothing()`, **await**
  (é a garantia de durabilidade; um insert custa ~ms), envolto em try/catch com
  `console.error`: falha do inbox **nunca** derruba o webhook.
- [app/api/integrations/whatsapp/gateway/route.ts](../../app/api/integrations/whatsapp/gateway/route.ts):
  idem, `origem: "WHATSAPP-GATEWAY"`.
- `organizacaoId` fica `null` na escrita (o webhook chega antes da resolução); não
  backfillamos em v1 — o replay resolve org do mesmo jeito que o processamento normal.

### 4.4 Retenção

30 dias. Delete em lotes (`LIMIT N` em loop) por `dataInsercao`, acoplado ao cron semanal
`access-cleanup` (`0 6 * * 0`) — idade efetiva máxima ~37 dias, aceitável, e evita criar
entrada nova de cron. Se a tabela crescer mais que o esperado, mover para varredura diária.

### 4.5 Replay — `scripts/replay-external-events.ts`

Filtros `--origem`, `--desde`, `--ate`, `--chave`, `--tipo`; reencaminha o `payload` pelo
mesmo caminho do processamento normal (`processWebhookAsync` para Meta; handler equivalente
do gateway). Substitui o scraping de logs do `backfill-whatsapp-webhook-logs.ts` como
ferramenta de recuperação.

### 4.6 Deleção de organização

Adicionar `external_events` à lista ordenada de `lib/organizations/deletion.ts` (padrão do
módulo: deletes explícitos, sem depender de cascade). Linhas com `organizacaoId IS NULL`
ficam para a retenção.

## 5. Fases

| Fase | Entrega | Deploy isolado? |
| --- | --- | --- |
| 1 | Coluna `assinatura_externa` (db:push) + `sale-signature.ts` + testes unitários | Sim (nada usa ainda) |
| 2 | Integração no `syncSales` + contadores no summary | Sim — observar `unchanged` nos logs do cron |
| 3 | Schema `external_events` + enum + escrita nos dois webhooks | Sim (write-only) |
| 4 | Retenção no `access-cleanup` + `replay-external-events.ts` + deletion module | Sim |

## 6. Testes

### 6.1 Unitários (node:test, padrão do repo)

`lib/data-collecting-v2/sale-signature.test.ts`:

- **Determinismo**: mesmo objeto com chaves em ordem diferente ⇒ mesmo hash; `items`
  reordenados ⇒ mesmo hash; `Date` equivalentes (instâncias distintas) ⇒ mesmo hash.
- **Sensibilidade**: mudar `statusText`, `isCanceled`, `totalValue`, quantidade de um item,
  um modificador, ou um ID resolvido ⇒ hash diferente.
- **Regressão do bug de Date**: assinatura de vendas com `occurredAt` distinto difere
  (garante que `Date` não colapsou em `{}` como no util de `lib/ai/operations/hash.ts`).
- **Formato**: prefixo `v1:`.

Rodar no padrão dos testes existentes (cf. `test:ai-quotes` no package.json):

```bash
node --import tsx --test lib/data-collecting-v2/sale-signature.test.ts
```

### 6.2 Loop local do `data-collecting` medindo skips

Harness: [scripts/sync-bling-collecting.ts](../../scripts/sync-bling-collecting.ts) já executa
**o mesmo pipeline** do cron (`runDataCollectingV2`) com janela e efeitos controláveis.

> ⚠️ O `.env` local aponta para o banco de produção. Usar organização de baixo volume,
> janela curta e efeitos desligados (`skip`) — o pipeline de sync em si é idempotente por
> construção.

Sequência:

```bash
# Run A — primeira execução pós-Fase 2: carimba as assinaturas.
# Esperado: created=0, updated=N, unchanged=0
npm run sync:bling-collecting -- --org=<orgId> --start=<hojeT00:00> --end=<agora> \
  --cashback=skip --campaigns=skip --conversion-attribution=skip

# Run B — imediatamente em seguida, mesma janela. Nada mudou na fonte.
# Esperado: created=0, updated=0, unchanged=N   ← a prova do fix
npm run sync:bling-collecting -- --org=<orgId> --start=<hojeT00:00> --end=<agora> \
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

### 6.3 Inbox local

1. `npm run dev` + `curl -X POST` no webhook com um body de exemplo real (dos fixtures ou de
   um log), duas vezes seguidas ⇒ **1** linha em `ampmais_external_events` (conflito na
   segunda).
2. `replay-external-events.ts --chave=<hash>` ⇒ reprocessa sem duplicar mensagem no chat
   (o índice de wamid segura, como no webhook ao vivo).

### 6.4 Métricas de produção

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

| Risco | Mitigação |
| --- | --- |
| Assinatura não cobre um campo que o sync escreve ⇒ mudança silenciosamente não sincronizada | Hash do canônico **inteiro** (menos `raw`) + IDs resolvidos; sem lista manual de campos. Se o esquema mudar: bump `v1:` → `v2:` força reprocesso geral, sem migração. |
| Skip engolir a rede de segurança do canal gerenciado | Guard explícito `!saleIsManaged` (seção 3.4); iFood mantém comportamento atual. |
| Mudança de semântica nos efeitos | Vendas skipadas continuam em `persistedSales` com flags neutras — efeitos já são gateados em transição (`becameValid`/`nowCanceled`), comportamento idêntico ao atual. |
| Insert do inbox atrasar/derrubar o webhook | 1 insert (~ms) com `onConflictDoNothing`, try/catch: falha loga e segue. |
| Crescimento da tabela de eventos | Retenção 30d em lote + índice em `data_insercao`; volume atual de webhooks é baixo (dezenas de milhares/mês, payloads pequenos). |
| Rollback da Parte A | Reverter o código da Fase 2; a coluna pode ficar (inerte). |
| Rollback da Parte B | Remover os pontos de escrita; tabela é write-only, nada depende dela. |
