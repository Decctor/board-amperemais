# Envio em massa de campanhas com Vercel Workflows — plano de implementação

> Status: proposta · Autor: engenharia · Última atualização: 2026-06-27

## 1. Objetivo e escopo

Rearquitetar o disparo de campanhas agendadas (que fazem _fan-out_ para uma audiência num bloco horário) para um modelo **durável, idempotente e observável**, eliminando os bugs estruturais do fluxo atual:

- timeout no meio do processamento deixa a campanha `ativo=false` e clientes nunca recebem (hoje há `scripts/recover-single-use-campaign.ts` como prova);
- cashback concedido no _enqueue_, antes da entrega;
- dedup de envio apoiado só em `SELECT`-then-filter, sem constraint;
- janela de bloco exata sem recuperação.

**Em escopo:** campanhas `USO-UNICO` e `RECORRENTE` (disparo agendado por bloco para uma audiência).

**Fora de escopo (mantêm o fluxo atual):** campanhas por evento (`NOVA-COMPRA`, `CASHBACK-EXPIRANDO`, etc.), que criam uma interação pontual por evento — não são envio em massa.

**Premissas:**

- Já pagamos Vercel e temos cota de Workflows não utilizada → sem custo adicional esperado.
- O **start continua via cron** (confiável e casa com nosso agendamento por blocos). O cron só _dispara_ o workflow; nada de fan-out manual por HTTP.

## 2. Decisões de arquitetura

1. **Cron dá o start, o Workflow faz o resto.** Um único cron horário (`/api/cron/campaigns/start`) encontra as campanhas do bloco atual e chama `start(sendCampaignWorkflow, [disparoId])` para cada uma. Sem `/tick`, `/worker`, `/reconcile` com fan-out manual.
2. **Outbox como fonte da verdade.** Duas tabelas novas: `campaign_dispatches` (1 linha por execução de campanha, máquina de estados) e `campaign_recipients` (1 linha por mensagem pretendida).
3. **Reaproveitar `interactions`.** O envio continua criando uma linha em `interactions` e usando `sendReservedInteraction`, `reserveOrganizationWeeklyQuotaBatch` e o webhook/`delivery-state.ts` **sem alteração**. A camada de outbox fica _acima_: orquestra, deduplica e dá durabilidade. `campaign_recipients.interacaoId` faz o vínculo.
4. **Claim idempotente sem `ativo=false`.** O cron reivindica a execução com `INSERT ... ON CONFLICT DO NOTHING` na `UNIQUE (campanha_id, data_referencia, bloco_referencia)` de `campaign_dispatches`. Só dá `start()` se o insert venceu. Duplo disparo do cron nunca cria duas execuções.
5. **Durabilidade do Workflow substitui lease/`SKIP LOCKED` manual.** Crash de step → retry/replay automático. Um cron sweeper opcional cobre o caso raro de workflow morto em definitivo.

## 3. Modelo de dados

### 3.1 Enums

`services/drizzle/schema/enums.ts`:

```typescript
export const campaignDispatchStatusEnum = pgEnum("campaign_dispatch_status", [
	"AGENDADO",
	"EXPANDINDO",
	"ENVIANDO",
	"CONCLUIDO",
	"CONCLUIDO_PARCIAL",
	"FALHOU",
	"CANCELADO",
]);

// Confirmação de entrega (ENTREGUE/LIDO) continua em `interactions`.
export const campaignRecipientStatusEnum = pgEnum("campaign_recipient_status", ["PENDENTE", "RESERVADO", "ENVIADO", "FALHOU", "BLOQUEADA", "PULADO"]);
```

`schemas/enums.ts` (espelho Zod, mesmo padrão dos demais):

```typescript
export const CampaignDispatchStatusEnum = z.enum(["AGENDADO", "EXPANDINDO", "ENVIANDO", "CONCLUIDO", "CONCLUIDO_PARCIAL", "FALHOU", "CANCELADO"]);
export type TCampaignDispatchStatusEnum = z.infer<typeof CampaignDispatchStatusEnum>;

export const CampaignRecipientStatusEnum = z.enum(["PENDENTE", "RESERVADO", "ENVIADO", "FALHOU", "BLOQUEADA", "PULADO"]);
export type TCampaignRecipientStatusEnum = z.infer<typeof CampaignRecipientStatusEnum>;
```

### 3.2 `campaign_dispatches`

`services/drizzle/schema/campaign-dispatches.ts`:

```typescript
export const campaignDispatches = newTable(
	"campaign_dispatches",
	{
		id: varchar("id", { length: 255 })
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		organizacaoId: varchar("organizacao_id", { length: 255 })
			.references(() => organizations.id, { onDelete: "cascade" })
			.notNull(),
		campanhaId: varchar("campanha_id", { length: 255 })
			.references(() => campaigns.id, { onDelete: "cascade" })
			.notNull(),

		dataReferencia: text("data_referencia").notNull(), // YYYY-MM-DD no timezone do cron
		blocoReferencia: interactionsCronJobTimeBlocksEnum("bloco_referencia").notNull(),

		status: campaignDispatchStatusEnum("status").notNull().default("AGENDADO"),
		workflowRunId: text("workflow_run_id"), // run id do WDK, p/ observabilidade

		audienciaTotal: integer("audiencia_total").notNull().default(0),
		totalEnviados: integer("total_enviados").notNull().default(0),
		totalFalhados: integer("total_falhados").notNull().default(0),
		totalBloqueados: integer("total_bloqueados").notNull().default(0),
		totalPulados: integer("total_pulados").notNull().default(0),

		erro: text("erro"),
		dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
		dataInicio: timestamp("data_inicio"),
		dataConclusao: timestamp("data_conclusao"),
	},
	(table) => ({
		// Claim idempotente do start: 1 execução por campanha/data/bloco.
		unqExecucao: unique("unq_dispatch_campanha_data_bloco").on(table.campanhaId, table.dataReferencia, table.blocoReferencia),
		statusIdx: index("idx_dispatch_status").on(table.status),
	}),
);
```

### 3.3 `campaign_recipients` (outbox)

`services/drizzle/schema/campaign-recipients.ts`:

```typescript
export const campaignRecipients = newTable(
	"campaign_recipients",
	{
		id: varchar("id", { length: 255 })
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		organizacaoId: varchar("organizacao_id", { length: 255 })
			.references(() => organizations.id, { onDelete: "cascade" })
			.notNull(),
		campanhaId: varchar("campanha_id", { length: 255 })
			.references(() => campaigns.id, { onDelete: "cascade" })
			.notNull(),
		disparoId: varchar("disparo_id", { length: 255 })
			.references(() => campaignDispatches.id, { onDelete: "cascade" })
			.notNull(),
		clienteId: varchar("cliente_id", { length: 255 })
			.references(() => clients.id, { onDelete: "cascade" })
			.notNull(),

		// Vínculo com o registro de entrega (criado no envio). Webhooks/limites usam `interactions`.
		interacaoId: varchar("interacao_id", { length: 255 }).references(() => interactions.id, { onDelete: "set null" }),

		status: campaignRecipientStatusEnum("status").notNull().default("PENDENTE"),
		// Sem coluna de idempotency key própria: o `interacaoId` já é a chave estável de
		// idempotência (1 interação por destinatário) e segue como `clientMessageId` ao gateway.

		tentativas: integer("tentativas").notNull().default(0),
		ultimoErro: text("ultimo_erro"),
		cashbackGerado: boolean("cashback_gerado").notNull().default(false),

		dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
		dataExecucao: timestamp("data_execucao"),
	},
	(table) => ({
		// Expansão idempotente + dedup de envio na origem.
		unqDestinatario: unique("unq_recipient_disparo_cliente").on(table.disparoId, table.clienteId),
		// Suporta o claim de lotes.
		claimIdx: index("idx_recipient_claim").on(table.disparoId, table.status),
	}),
);
```

> `UNIQUE (disparo_id, cliente_id)` (não `campanha_id, cliente_id`) porque campanhas `RECORRENTE` reenviam ao mesmo cliente em datas diferentes — cada execução é um disparo distinto.

Exportar tipos (`$inferSelect`/`$inferInsert`), `relations` e barrel em `schema/index.ts` como os demais.

## 4. Setup do Workflow Development Kit

```bash
npm i workflow
npx plugins add vercel/vercel-plugin   # plugin Vercel p/ Workflows
```

O WDK descobre os workflows em build e gera as rotas em `app/.well-known/workflow/v1` automaticamente — não escrevemos essas rotas à mão. Observabilidade no dashboard Vercel (Observability → Workflows) e via `npx workflow web` localmente.

## 5. O workflow

`app/workflows/send-campaign.ts` — o corpo só **orquestra** e deve ser determinístico; todo I/O fica em `'use step'`.

```typescript
import { sleep } from "workflow";
import { loadDispatchContext, expandAudience, claimNextBatches, dispatchBatch, finalizeDispatch } from "@/lib/campaigns/dispatch"; // funções puras; viram steps via diretiva

const BATCH_SIZE = 100; // destinatários por step de envio
const BATCH_FANOUT = 5; // steps de envio em paralelo por onda
const PACING = "1s"; // throttle entre ondas p/ respeitar rate limit do provedor

export async function sendCampaignWorkflow(disparoId: string) {
	"use workflow";

	const ctx = await loadDispatchContext(disparoId); // marca EXPANDINDO; null se já concluído/cancelado
	if (!ctx) return;

	// Expansão resumível: insere recipients (ON CONFLICT DO NOTHING) e cria interactions.
	let cursor: string | null = null;
	do {
		const res = await expandAudience(disparoId, cursor);
		cursor = res.nextCursor;
	} while (cursor !== null);

	await markSending(disparoId);

	// Drena em ondas até a fila esvaziar.
	while (true) {
		const batches = await claimNextBatches(disparoId, { lotes: BATCH_FANOUT, tamanho: BATCH_SIZE });
		if (batches.length === 0) break;
		await Promise.all(batches.map((ids) => dispatchBatch(disparoId, ids)));
		await sleep(PACING);
	}

	await finalizeDispatch(disparoId); // agrega contadores, marca CONCLUIDO/PARCIAL, desativa USO-UNICO
}
```

Determinismo: o `while`/`do-while` depende só de saídas de steps (gravadas no event log), então o replay é determinístico.

## 6. Os steps (funções puras e portáveis)

`lib/campaigns/dispatch.ts`. Cada função recebe input simples, deriva estado do banco e é idempotente. A diretiva `'use step'` dá retry/durabilidade. **Importante:** mantê-las agnósticas de cron/HTTP/workflow — assim a camada de disparo é trocável.

### 6.1 `expandAudience` (resumível por cursor)

```typescript
export async function expandAudience(disparoId: string, cursor: string | null) {
	"use step";
	const dispatch = await getDispatch(disparoId);
	const campaign = await getCampaignWithRelations(dispatch.campanhaId);

	// Reaproveita o resolvedor de audiência existente.
	const clientIds = await resolveCampaignAudienceClientIdsForCampaign({
		organizationId: dispatch.organizacaoId,
		campaign,
	});

	const CHUNK = 1000;
	const startIdx = cursor ? Number(cursor) : 0;
	const slice = clientIds.slice(startIdx, startIdx + CHUNK);
	if (slice.length === 0) {
		await setAudienceTotal(disparoId, clientIds.length); // 1ª vez basta
		return { nextCursor: null as string | null };
	}

	await db
		.insert(campaignRecipients)
		.values(
			slice.map((clienteId) => ({
				organizacaoId: dispatch.organizacaoId,
				campanhaId: dispatch.campanhaId,
				disparoId,
				clienteId,
			})),
		)
		.onConflictDoNothing(); // idempotente em re-execução do step

	const next = startIdx + CHUNK;
	return { nextCursor: next < clientIds.length ? String(next) : null };
}
```

### 6.2 `claimNextBatches` (claim atômico)

```typescript
export async function claimNextBatches(disparoId: string, opts: { lotes: number; tamanho: number }) {
	"use step";
	const limit = opts.lotes * opts.tamanho;
	// CTE: seleciona PENDENTE, marca RESERVADO e devolve os ids numa só statement.
	const rows = await db.execute(sql`
    WITH due AS (
      SELECT id FROM ${campaignRecipients}
      WHERE disparo_id = ${disparoId} AND status = 'PENDENTE'
      ORDER BY data_insercao
      FOR UPDATE SKIP LOCKED
      LIMIT ${limit}
    )
    UPDATE ${campaignRecipients} r
    SET status = 'RESERVADO', tentativas = r.tentativas + 1
    FROM due WHERE r.id = due.id
    RETURNING r.id;
  `);
	const ids = rows.map((r) => r.id as string);
	// Quebra em `lotes` arrays disjuntos (sem contenção entre os dispatchBatch paralelos).
	return chunkArray(ids, opts.tamanho);
}
```

### 6.3 `dispatchBatch` (o trabalho de envio)

```typescript
import { RetryableError } from "workflow";

export async function dispatchBatch(disparoId: string, recipientIds: string[]) {
	"use step";
	const recipients = await getRecipients(recipientIds); // só status RESERVADO
	const dispatch = await getDispatch(disparoId);
	const campaign = await getCampaignWithRelations(dispatch.campanhaId);

	// 1. Garante interaction p/ cada recipient (idempotente via interacaoId).
	await ensureInteractionsForRecipients({ recipients, dispatch, campaign });

	// 2. Reserva quota semanal (função existente, opera sobre interactions).
	const interactionIds = recipients.map((r) => r.interacaoId!).filter(Boolean);
	const reserva = await reserveOrganizationWeeklyQuotaBatch({
		organizationId: dispatch.organizacaoId,
		interactionIds,
	});

	// 3. Envia os reservados (reaproveita sendReservedInteraction).
	const batchResult = await processOrganizationInteractionsBatch({
		organizationId: dispatch.organizacaoId,
		interactions: buildImmediateData(recipients, campaign),
		weeklyLimitMode: "skip", // já reservado acima
	});

	// 4. Propaga resultado p/ os recipients + cashback SÓ no sucesso (idempotente).
	for (const r of recipients) {
		const result = batchResult.byInteractionId.get(r.interacaoId!);
		if (result?.status === "SENT" || result?.status === "QUEUED") {
			await markRecipientSent(r.id);
			if (isCashbackActive(campaign) && !r.cashbackGerado) await grantCashbackForRecipient(r, campaign);
		} else if (reserva.blockedInteractionIds.includes(r.interacaoId!)) {
			await markRecipientBlocked(r.id);
		} else {
			await markRecipientFailed(r.id, result?.error);
		}
	}

	// Rate limit do provedor → deixa o WDK reagendar a tentativa.
	if (batchResult.rateLimited) throw new RetryableError("Provider rate limit", { retryAfter: "30s" });
}
dispatchBatch.maxRetries = 3; // 4 tentativas totais; default do WDK
```

Regras de erro: número inválido / sem template → `markRecipientFailed`/`Blocked` e **não** retentar (não lança); rate limit → `RetryableError({ retryAfter })`; erro fatal de config → `FatalError`.

### 6.4 Idempotência (as 3 camadas)

1. `UNIQUE (disparo_id, cliente_id)` + `onConflictDoNothing` → expansão repetível, sem destinatário duplicado.
2. **Uma interação por destinatário**, criada idempotentemente (`recipient.interacaoId` reusado se já existir). O `interactionId` é estável por destinatário e segue como `clientMessageId` ao gateway — **igual a hoje**. Logo o retry de step não duplica no provedor e o webhook (`resolveMessageTargets`, que indexa por `interactions.id = clientMessageId`) **não muda**.
3. `dispatchBatch` relê o status: recipient já `ENVIADO` é pulado. Cashback gated por `cashbackGerado`.

> Sem essas camadas, o **retry automático do Workflow causaria envio duplo** — por isso o outbox permanece mesmo com Workflows.
>
> **Por que não criar um `clientMessageId` próprio (ex.: `disparoId:clienteId`):** o webhook do gateway interno usa o `clientMessageId` como chave de lookup direta (`interactions.id`) e, no `message.sent`, é o **único** caminho de reconciliação — o `whatsappMessageId` só chega nesse mesmo evento, então não há fallback. Repropor o `clientMessageId` quebraria a reconciliação de entrega. Mantemos `clientMessageId = interactionId`.

## 7. O cron de start (único)

`app/api/cron/campaigns/start/route.ts`:

```typescript
import { start } from "workflow/api";
import { sendCampaignWorkflow } from "@/workflows/send-campaign";

async function startDueCampaignsRoute(_req: NextRequest) {
	const now = dayjs().tz(INTERACTIONS_CRON_TIMEZONE);
	const dataReferencia = now.format("YYYY-MM-DD");
	const blocoReferencia = getCurrentTimeBlock(now);

	const dueCampaigns = await findDueScheduledCampaigns({ dataReferencia, blocoReferencia });

	for (const campaign of dueCampaigns) {
		// Claim idempotente: só dá start se o INSERT venceu a UNIQUE.
		const [dispatch] = await db
			.insert(campaignDispatches)
			.values({
				organizacaoId: campaign.organizacaoId,
				campanhaId: campaign.id,
				dataReferencia,
				blocoReferencia,
				status: "AGENDADO",
			})
			.onConflictDoNothing()
			.returning({ id: campaignDispatches.id });

		if (!dispatch) continue; // já reivindicado por execução anterior do cron

		const run = await start(sendCampaignWorkflow, [dispatch.id]);
		await db.update(campaignDispatches).set({ workflowRunId: run.runId }).where(eq(campaignDispatches.id, dispatch.id));
	}

	return NextResponse.json("EXECUTADO COM SUCESSO");
}

export const GET = appApiHandler({
	GET: async (req) => {
		assertCronAuthorized(req);
		return startDueCampaignsRoute(req);
	},
});
```

`vercel.json` (substitui `process-single-use-campaigns` e `process-recurrent-campaigns` ao fim da migração):

```json
{ "path": "/api/cron/campaigns/start", "schedule": "0 * * * *" }
```

`findDueScheduledCampaigns`: `USO-UNICO` → `ativo AND gatilhoUsoUnicoDataReferencia = data AND execucaoAgendadaBloco = bloco`; `RECORRENTE` → recorrência casa hoje `AND execucaoAgendadaBloco = bloco`.

## 8. Webhooks, entrega e reconciliação

- **Webhooks (Meta/Resend)** continuam atualizando `interactions` via `delivery-state.ts` — zero mudança. `ENTREGUE`/`LIDO` ficam na interaction; o relatório de campanha lê via `recipient → interacao`. (Opcional: o webhook também espelhar status no recipient, só para relatório.)
- **Reconciliação (cron sweeper opcional, não é fan-out):** `/api/cron/campaigns/reconcile` a cada 10 min encontra `campaign_dispatches` em `ENVIANDO` parados há > X min sem progresso e: vira `RESERVADO` órfão → `PENDENTE` e/ou redá `start()` no disparo. Com a durabilidade do WDK isso deve ser raro; é só rede de segurança.

## 9. Observabilidade

- Trace por run no dashboard Vercel (cada step/input/output/erro/sleep gravado) — endereça diretamente a preocupação com debug.
- `workflowRunId` salvo na `campaign_dispatches` linka o registro de negócio ao trace.
- Progresso da campanha = agregação barata sobre `campaign_recipients` (`GROUP BY status`); contadores materializados na `campaign_dispatches` para a UI.

## 10. Migração incremental (baixo risco)

Feature flag por organização (`configuracao.recursos.campanhasWorkflow.acesso`):

1. **Schema** — criar enums + tabelas + índices/migração Drizzle. Nada quebra (aditivo).
2. **Funções puras** — `loadDispatchContext`, `expandAudience`, `claimNextBatches`, `dispatchBatch`, `finalizeDispatch` em `lib/campaigns/dispatch.ts`, reusando `resolveCampaignAudienceClientIdsForCampaign`, `reserveOrganizationWeeklyQuotaBatch`, `sendReservedInteraction`.
3. **Workflow + cron de start** — atrás da flag. Orgs sem a flag seguem nos crons antigos.
4. **Cashback na entrega** — implementado já no `dispatchBatch` (não no enqueue).
5. **Piloto** — habilitar a flag em 1–2 orgs; comparar contadores e traces.
6. **Cutover** — habilitar geral; remover `process-single-use-campaigns` e `process-recurrent-campaigns` do `vercel.json` e arquivar `scripts/recover-single-use-campaign.ts`.

## 11. Riscos e rollback

- **WDK em beta:** mitigar com piloto e flag por org; rollback = desligar a flag (volta aos crons antigos, que continuam no código até o cutover).
- **Expansão de audiência gigante:** já resumível por cursor; se `resolveCampaignAudienceClientIds` (em memória) virar gargalo, paginar a resolução também.
- **Custo:** monitorar Events/Data Written/Data Retained no dashboard; lotear (não 1 step por cliente) mantém o volume de eventos baixo.
- **Determinismo:** garantir que nada de I/O/aleatório fique no corpo do `'use workflow'` — só em steps.

## 12. Checklist de tarefas

- [ ] Enums `campaignDispatchStatusEnum` / `campaignRecipientStatusEnum` (Drizzle + Zod).
- [ ] Tabelas `campaign_dispatches` e `campaign_recipients` + relations + barrel + migração.
- [ ] `lib/campaigns/dispatch.ts` com as 5 funções puras (+ helpers de status).
- [ ] `ensureInteractionsForRecipients` (cria interaction idempotente, seta `interacaoId`).
- [ ] Mover geração de cashback para o sucesso de envio, gated por `cashbackGerado`.
- [ ] `app/workflows/send-campaign.ts`.
- [ ] `app/api/cron/campaigns/start/route.ts` (claim idempotente + `start`).
- [ ] Flag por organização + `findDueScheduledCampaigns`.
- [ ] (Opcional) `/api/cron/campaigns/reconcile`.
- [ ] UI de progresso lendo contadores da `campaign_dispatches`.
- [ ] Piloto, cutover, limpeza dos crons antigos e do script de recuperação.
