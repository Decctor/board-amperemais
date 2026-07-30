# Chats & Atendimento IA — Confiabilidade — Plano de Implementação

> **Status**: em revisão
> **Origem**: duplicação de mensagens recebidas via webhook e respostas duplicadas/defasadas em runs concorrentes de IA, observadas em produção.
> **Princípio norteador**: o banco de dados é a fonte de verdade dos fluxos assíncronos. Toda entrega é *at-least-once* (webhooks da Meta, Vercel Queues); a idempotência vive em constraints e compare-and-sets no Postgres, nunca na esperança de entrega única.
> **Escopo desta iniciativa**: idempotência de mensagens por `wamid`, revalidação pós-run antes da entrega, ack imediato do webhook Meta, migração do turno de IA para Vercel Queues e encerramento automático de atendimentos inativos. **Fora de escopo**: mover a transcrição de mídia para fila, migrar para Vercel Workflows, tocar no fluxo de envio do hub, resumo por IA no encerramento automático (incremento futuro documentado na seção 9) — ver [Decisões](#2-decisões-fechadas).
> **Como ler este documento**: as seções 1–2 são diagnóstico e contrato; 3–8 são as fases, cada uma deployável de forma independente e na ordem em que aparecem; 9–12 são o caminho futuro, riscos, validação, rollback e ordem de commits. Blocos de código são a forma-alvo; `// …` é elisão de trecho mecânico, não de decisão.

---

## Índice

1. [Diagnóstico](#1-diagnóstico)
2. [Decisões fechadas](#2-decisões-fechadas)
3. [Fase 1 — Idempotência por `wamid` (migration 0057)](#fase-1--idempotência-por-wamid-migration-0057)
4. [Fase 2 — Revalidação pós-run + status `CANCELADO`](#fase-2--revalidação-pós-run--status-cancelado)
5. [Fase 3 — Ack imediato no webhook da Meta](#fase-3--ack-imediato-no-webhook-da-meta)
6. [Fase 4 — Extração do turno de IA (`ai-turn-runner` + `dispatch`)](#fase-4--extração-do-turno-de-ia-ai-turn-runner--dispatch)
7. [Fase 5 — Vercel Queues como transporte do turno](#fase-5--vercel-queues-como-transporte-do-turno)
8. [Fase 6 — Encerramento automático de atendimentos inativos](#fase-6--encerramento-automático-de-atendimentos-inativos)
9. [Caminho futuro — Workflows e resumo por IA no encerramento](#9-caminho-futuro--workflows-e-resumo-por-ia-no-encerramento)
10. [Riscos e mitigações](#10-riscos-e-mitigações)
11. [Plano de validação](#11-plano-de-validação)
12. [Rollback](#12-rollback)
13. [Ordem de commits](#13-ordem-de-commits)

---

## 1. Diagnóstico

| Sintoma | Causa, com localização |
| --- | --- |
| Mensagens do cliente duplicadas | `persistIncomingClientMessage` (`lib/chats/incoming-message.ts:88`) insere incondicionalmente; `idx_chat_messages_whatsapp_message_id` **não é único**. A Meta reentrega eventos, e cada reentrega vira uma linha nova |
| A Meta reentrega com frequência anormal | O webhook (`app/api/integrations/whatsapp/route.ts:109-120`) **aguarda** `processWebhookAsync` inteiro — debounce de 5s+ e run de LLM de dezenas de segundos — antes de devolver 200. A Meta trata a demora como falha e reenvia. O webhook do Gateway Interno já responde na hora via `waitUntil` (`gateway/route.ts:123`) |
| Resposta da IA gerada sem a última mensagem do cliente no contexto | `confirmAiResponseStillValid` roda **antes** da run (`ai-trigger.ts:110-125`); nada é checado entre `executeAgentTurn` e `deliver` (`respond-to-chat.ts:49-58`). A janela perigosa é a duração da run |
| A mensagem nova do cliente fica sem resposta própria | Corolário do item anterior: quando a run antiga entrega, o ciclo da mensagem nova vê "a conversa já foi respondida" e aborta. A ordem certa é a inversa — a run **antiga** deve abortar |
| Runs abandonadas em `RODANDO`, sem retry | O turno roda dentro da request do webhook; crash, deploy ou `maxDuration` no meio da run = resposta perdida silenciosamente |
| `sleep()` de debounce dentro de função serverless | Compute pago parado, e o debounce morre junto com a função |
| Atendimentos `EXTERNO` nunca encerram | O echo do celular marca o ticket `EM_ATENDIMENTO`/`EXTERNO` (`attendance-state.ts:151`), mas nenhum caminho o leva a `ENCERRADO` — só o hub encerra, e atendimento pelo telefone não passa pelo hub. O ticket fica ativo para sempre, poluindo o quadro e as estatísticas |

O dedupe do history-sync (`lib/whatsapp/smb-message-history-sync.ts:405`) já usa a chave natural `(organizacaoId, whatsappMessageId)` — mas via find-then-insert, que perde corridas. A Fase 1 formaliza essa chave como constraint.

---

## 2. Decisões fechadas

1. **Idempotência no banco, não na fila.** O índice único de `wamid` e o compare-and-set de posse (`claimChatAttendanceForAgent`) são a camada de idempotência exigida por qualquer transporte *at-least-once*. A fila complementa; não substitui.
2. **Só a última run vale, imposta pelos fatos.** Vercel Queues não garante FIFO (mensagens retried perdem prioridade). A regra "responder apenas à última mensagem do cliente" é imposta por consultas sobre `chat_messages` — no início do turno **e** imediatamente antes da entrega — nunca pela ordem da fila.
3. **Vercel Queues entra nesta rodada** como transporte do turno de IA disparado por mensagem (`gatilho: "CHAT_MENSAGEM"`), atrás de uma abstração de dispatch com fallback inline por env var. O gatilho `ATRIBUICAO_HUB` (humano entregando a conversa) continua síncrono: não tem rajada a agrupar e é latency-sensitive para o operador.
4. **Claim se move para depois do debounce.** Hoje o claim acontece antes do sleep; movê-lo para o início do turno (no consumer/runner) o aproxima da entrega e reduz a janela em que um humano assume e a IA responde por cima. O CAS do claim já torna a mudança segura.
5. **Cancelamento é estado observável.** Run supersedida vira `status: "CANCELADO"` em `ai_agent_runs` (valor novo no enum de aplicação; a coluna é `varchar + $type`, sem `ALTER TYPE`). Tokens já gastos ficam registrados em `uso`.
6. **Escopo do índice único**: `(whatsapp_message_id, organizacao_id)`, parcial em `whatsapp_message_id IS NOT NULL`. `wamid` na frente para o índice servir também os lookups por `wamid` puro de `applyProviderDeliveryStatus`, substituindo o índice não-único atual.
7. **Encerramento por inatividade fecha qualquer atendimento ativo, de qualquer responsável.** O caso motivador é o `EXTERNO` (telefone), mas tickets `AGENTE`, `NAO_ATRIBUIDO` e `USUARIO` parados sofrem do mesmo problema — e encerrá-los cria a fronteira de episódio correta: a próxima mensagem do cliente abre um ticket novo via `ensureCurrentAttendance`, em vez de reanimar um atendimento de semanas atrás. Um único limiar de inatividade (7 dias sobre `chats.ultimaMensagemData`), inclusive para tickets com pendência do cliente: depois de 7 dias a janela de 24h está morta há muito tempo e o ticket não representa mais um atendimento em curso. O encerramento automático é distinguível do manual por `resultado: "INATIVIDADE"` + `encerradoPorUsuarioId` nulo.
8. **A mutação em lote vive em `attendance-state.ts`.** A invariante do módulo — nenhum `db.update(chatAssignments)` fora da camada canônica — vale também para o cron.
9. **Fora de escopo**: transcrição de mídia via fila (follow-up natural, mesma topologia), Workflows e resumo por IA no encerramento (ver seção 9), envio do hub, `pages/api`, limiar de inatividade configurável por organização (incremento simples se houver demanda).

---

## Fase 1 — Idempotência por `wamid` (migration 0057)

### 1.1 Migration `drizzle/0057_chat_message_idempotency.sql`

Três passos, nesta ordem, na mesma migration:

```sql
-- 1) Reaponta a denormalização dos chats que apontam para uma duplicata que será removida.
WITH ranqueadas AS (
	SELECT id,
		first_value(id) OVER (
			PARTITION BY organizacao_id, whatsapp_message_id
			ORDER BY data_envio ASC, id ASC
		) AS manter_id
	FROM ampmais_chat_messages
	WHERE whatsapp_message_id IS NOT NULL
)
UPDATE ampmais_chats c
SET ultima_mensagem_id = r.manter_id
FROM ranqueadas r
WHERE c.ultima_mensagem_id = r.id AND r.id <> r.manter_id;

-- 2) Remove as duplicatas, preservando a linha mais antiga de cada grupo.
WITH ranqueadas AS (
	SELECT id,
		first_value(id) OVER (
			PARTITION BY organizacao_id, whatsapp_message_id
			ORDER BY data_envio ASC, id ASC
		) AS manter_id
	FROM ampmais_chat_messages
	WHERE whatsapp_message_id IS NOT NULL
)
DELETE FROM ampmais_chat_messages m
USING ranqueadas r
WHERE m.id = r.id AND r.id <> r.manter_id;

-- 3) Troca o índice de lookup pelo índice único.
DROP INDEX IF EXISTS idx_chat_messages_whatsapp_message_id;
CREATE UNIQUE INDEX idx_chat_messages_whatsapp_message_id_org
	ON ampmais_chat_messages (whatsapp_message_id, organizacao_id)
	WHERE whatsapp_message_id IS NOT NULL;
```

Nota: `mensagens_nao_lidas` fica inflado nos chats que tinham duplicatas. Não recontamos na migration — o contador zera na próxima leitura do chat e o custo de uma recontagem global não se paga.

### 1.2 Schema Drizzle (`services/drizzle/schema/chats.ts`)

```typescript
// substitui index("idx_chat_messages_whatsapp_message_id")
uniqueIndex("idx_chat_messages_whatsapp_message_id_org")
	.on(table.whatsappMessageId, table.organizacaoId)
	.where(sql`${table.whatsappMessageId} is not null`),
```

### 1.3 `lib/chats/incoming-message.ts`

`persistIncomingClientMessage` e `persistOutboundNonHubMessage` passam a devolver `null` quando o insert conflita — e **nada downstream roda** (denormalização do chat, contador de não lidas, `markChatNeedsResponse`/`markChatAttendedExternally`, gatilho de IA):

```typescript
const [inserted] = await db
	.insert(chatMessages)
	.values({ /* … */ })
	.onConflictDoNothing({
		target: [chatMessages.whatsappMessageId, chatMessages.organizacaoId],
		where: sql`${chatMessages.whatsappMessageId} is not null`,
	})
	.returning({ id: chatMessages.id, dataEnvio: chatMessages.dataEnvio });

// Reentrega do provedor: a mensagem já existe, e todo o efeito colateral já aconteceu na primeira vez.
if (!inserted) return null;
```

Tipo de retorno: `Promise<{ messageId: string; dataEnvio: Date } | null>`.

### 1.4 Chamadores

| Arquivo | Mudança |
| --- | --- |
| `app/api/integrations/whatsapp/route.ts` (`handleIncomingMessage`) | `if (!insertedMessage) return;` logo após o persist — pula transcrição de mídia e gatilho de IA |
| `app/api/integrations/whatsapp/route.ts` (`handleMessageEcho`) | idem para o echo (cobre também um eventual echo de mensagem já persistida pelo hub — o skip silencioso é o comportamento correto) |
| `app/api/integrations/whatsapp/gateway/route.ts` | idem nos dois pontos equivalentes |
| `lib/whatsapp/smb-message-history-sync.ts` | o insert (linha ~444) ganha o mesmo `onConflictDoNothing` como rede de segurança para a corrida do find-then-insert existente |

Mensagens sem `wamid` (não há target de conflito) seguem inserindo normalmente — o comportamento atual é preservado.

---

## Fase 2 — Revalidação pós-run + status `CANCELADO`

### 2.1 Enum (`schemas/enums.ts`)

```typescript
export const AiAgentRunStatusEnum = z.enum(["PENDENTE", "RODANDO", "CONCLUIDO", "FALHA", "CANCELADO"]);
```

Sem migration: `ai_agent_runs.status` é `varchar(32) + $type`.

### 2.2 `lib/ai/agent/runs.ts`

```typescript
/** Run supersedida: o turno terminou, mas a entrega foi abortada pela revalidação. */
export async function markAgentRunCancelled(database: TDb, { runId, motivo }: { runId: string; motivo: string }) {
	await database
		.update(aiAgentRuns)
		.set({ status: "CANCELADO", erro: motivo, dataFim: new Date() })
		.where(eq(aiAgentRuns.id, runId));
}
```

Sobrescrever o `CONCLUIDO` que o runtime grava ao fim do turno é intencional: o estado final relevante é "não entregue", e `uso` preserva o custo.

### 2.3 `lib/chats/ai-trigger.ts` — revalidação de entrega

```typescript
/**
 * Última checagem antes de entregar a mensagem produzida pela run.
 *
 * A run de LLM leva dezenas de segundos e não pode ser cancelada em andamento; este é o único
 * ponto de corte. Reusa as mesmas consultas do confirm pré-run — a janela perigosa cai da
 * duração da run para os milissegundos entre esta checagem e o envio.
 */
export async function confirmAiDeliveryStillValid({
	organizacaoId,
	chatId,
	gatilho,
	mensagemGatilhoId,
	runStartedAt,
}: {
	organizacaoId: string;
	chatId: string;
	gatilho: TAiAgentRunGatilhoEnum;
	mensagemGatilhoId: string | null;
	runStartedAt: Date;
}): Promise<TAiTriggerDecision> {
	if (gatilho === "PLAYGROUND") return { shouldRespond: true };

	if (gatilho === "CHAT_MENSAGEM" && mensagemGatilhoId) {
		const gatilhoMsg = await db.query.chatMessages.findFirst({
			where: eq(chatMessages.id, mensagemGatilhoId),
			columns: { id: true, dataEnvio: true },
		});
		if (!gatilhoMsg) return { shouldRespond: false, reason: "Mensagem gatilho não encontrada." };
		return confirmAiResponseStillValid({ organizacaoId, chatId, messageId: gatilhoMsg.id, messageDate: gatilhoMsg.dataEnvio });
	}

	// ATRIBUICAO_HUB não tem mensagem gatilho: o marco é o início da run. Uma mensagem do
	// cliente chegada durante a run dispara o próprio ciclo — este turno recua.
	const entradaPosterior = await db.query.chatMessages.findFirst({
		where: and(eq(chatMessages.chatId, chatId), eq(chatMessages.autorTipo, "CLIENTE"), gt(chatMessages.dataEnvio, runStartedAt)),
		columns: { id: true },
	});
	if (entradaPosterior) return { shouldRespond: false, reason: "Chegou mensagem do cliente durante a run." };

	const respostaPosterior = await db.query.chatMessages.findFirst({
		where: and(
			eq(chatMessages.chatId, chatId),
			inArray(chatMessages.autorTipo, ["USUÁRIO", "AI", "BUSINESS-APP"]),
			gt(chatMessages.dataEnvio, runStartedAt),
		),
		columns: { id: true },
	});
	if (respostaPosterior) return { shouldRespond: false, reason: "A conversa já foi respondida durante a run." };

	const atual = await getCurrentChatAttendance(db, { organizacaoId, chatId });
	if (atual?.responsavelTipo !== "AGENTE") return { shouldRespond: false, reason: "O atendimento deixou de ser da IA." };

	return { shouldRespond: true };
}
```

### 2.4 `lib/ai/agent/respond-to-chat.ts`

Entre `executeAgentTurn` e `deliver`:

```typescript
const output = await executeAgentTurn(prepared);

if (output.mensagem?.trim()) {
	const delivery = await confirmAiDeliveryStillValid({
		organizacaoId,
		chatId,
		gatilho,
		mensagemGatilhoId: mensagemGatilhoId ?? null,
		runStartedAt: prepared.run.dataInicio ?? prepared.run.dataInsercao,
	});
	if (!delivery.shouldRespond) {
		await markAgentRunCancelled(database, { runId: prepared.run.id, motivo: delivery.reason });
		console.log("[AI_AGENT] Entrega cancelada:", delivery.reason);
		// Resumo de atendimento também não grava: veio de um contexto que a conversa já superou.
		return { runId: prepared.run.id, mensagem: null, messageId: null, resumoAtendimento: "" };
	}

	const delivered = await deliver({ /* … */ });
	// …
}
```

Sequência que o desenho garante: a run antiga vê a mensagem nova e cancela; o ciclo da mensagem nova (que só confirma após o debounce de ≥5s) não encontra resposta posterior e responde com contexto completo. A janela residual check-then-send é de milissegundos e aceita — fechá-la exigiria serialização por chat, que não se paga nesta rodada.

---

## Fase 3 — Ack imediato no webhook da Meta

`app/api/integrations/whatsapp/route.ts`, espelhando o gateway:

```typescript
import { waitUntil } from "@vercel/functions";

async function postWhatsappWebhookRoute(req: NextRequest) {
	const body = (await req.json()) as WebhookBody;
	if (body.object === "whatsapp_business_account") {
		// A Meta reentrega quando o 200 demora; todo o processamento sai da request.
		waitUntil(processWebhookAsync(body).catch((error) => console.error("[WHATSAPP_WEBHOOK] Error processing webhook:", error)));
		return NextResponse.json({ success: true }, { status: 200 });
	}
	return NextResponse.json({ error: "Event not supported" }, { status: 404 });
}
```

Deployável de forma independente: com a Fase 1 no ar, mesmo as reentregas residuais são inócuas.

---

## Fase 4 — Extração do turno de IA (`ai-turn-runner` + `dispatch`)

Refactor sem mudança de comportamento externo, que prepara a Fase 5 e elimina a duplicação do bloco claim → confirm → respond nos dois webhooks.

### 4.1 `lib/chats/ai-turn-runner.ts`

```typescript
export type TAiTurnPayload = {
	organizacaoId: string;
	chatId: string;
	mensagemGatilhoId: string;
	// ISO string: o payload atravessa JSON (fila) sem perder tipo.
	mensagemGatilhoDataEnvio: string;
};

/**
 * Executa um turno de IA disparado por mensagem do cliente. Idempotente e seguro sob
 * reentrega: claim por CAS, confirmação pré-run e revalidação pré-entrega são todos
 * checados aqui dentro, contra o banco — nada depende do transporte que o invocou.
 *
 * Pressupõe o debounce já cumprido (sleep no transporte inline, delaySeconds na fila).
 */
export async function runAiTurnForMessage(payload: TAiTurnPayload): Promise<void> {
	const agent = await ensureOrganizationAgent(db, payload.organizacaoId);
	if (agent.status !== "ATIVO") return;

	// Claim depois do debounce: mais perto da entrega, menor a janela para responder
	// por cima de um humano que assumiu durante a espera.
	const claim = await claimChatForAi({ organizacaoId: payload.organizacaoId, chatId: payload.chatId, agenteId: agent.id });
	if (!claim.shouldRespond) return;

	const confirmation = await confirmAiResponseStillValid({
		organizacaoId: payload.organizacaoId,
		chatId: payload.chatId,
		messageId: payload.mensagemGatilhoId,
		messageDate: new Date(payload.mensagemGatilhoDataEnvio),
	});
	if (!confirmation.shouldRespond) return;

	const deliver = await resolveChatDeliverer({ organizacaoId: payload.organizacaoId, chatId: payload.chatId });
	if (!deliver) return;

	await respondToChatWithAgent({
		organizacaoId: payload.organizacaoId,
		chatId: payload.chatId,
		gatilho: "CHAT_MENSAGEM",
		mensagemGatilhoId: payload.mensagemGatilhoId,
		deliver,
	});
}
```

`resolveChatDeliverer` (já existente em `lib/ai/agent/delivery.ts:144`) substitui os deliverers montados manualmente em cada webhook — a regra de canal deixa de viver em dois lugares.

### 4.2 `lib/chats/ai-turn-dispatch.ts`

```typescript
/**
 * Transporte do turno de IA. "inline" reproduz o comportamento atual (sleep + run na própria
 * função, sob waitUntil); "queue" publica em Vercel Queues (Fase 5). A env var é o rollback:
 * voltar para inline não requer deploy de código, só de configuração.
 */
export async function dispatchAiTurn(payload: TAiTurnPayload, { delayMs }: { delayMs: number }): Promise<void> {
	if (process.env.AI_TURN_TRANSPORT === "queue") {
		await sendAiTurnToQueue(payload, { delayMs }); // Fase 5
		return;
	}
	await sleep(delayMs);
	await runAiTurnForMessage(payload);
}
```

### 4.3 Webhooks

Nos dois webhooks, o bloco `claimChatForAi` → `waitAndConfirmAiResponse` → `respondToChatWithAgent` é substituído por:

```typescript
// Capability checks (hubAtendimentos, permitirAtendimentoIa, iaAtendimento, agente ATIVO)
// permanecem aqui: baratos, e evitam publicar ruído na fila.
await dispatchAiTurn(
	{
		organizacaoId,
		chatId,
		mensagemGatilhoId: insertedMessage.messageId,
		mensagemGatilhoDataEnvio: insertedMessage.dataEnvio.toISOString(),
	},
	{ delayMs: agent.capacidades?.atendimento?.atrasoRespostaMs ?? AI_RESPONSE_DELAY_MS },
);
```

`waitAndConfirmAiResponse` perde os dois chamadores e é removida; `confirmAiResponseStillValid`, `claimChatForAi` e `AI_RESPONSE_DELAY_MS` permanecem.

---

## Fase 5 — Vercel Queues como transporte do turno

**Pré-requisito operacional**: habilitar Vercel Queues no time (beta, atrás de permissão) e `npm i @vercel/queue` (npm, nunca pnpm/yarn — ver CLAUDE.md).

### 5.1 Produtor (`lib/chats/ai-turn-dispatch.ts`)

```typescript
import { send } from "@vercel/queue";

const AI_TURN_TOPIC = "ai-chat-turns";

async function sendAiTurnToQueue(payload: TAiTurnPayload, { delayMs }: { delayMs: number }) {
	await send(AI_TURN_TOPIC, payload, {
		// O debounce vira delay gerenciado: a mensagem só fica visível após a espera.
		delaySeconds: Math.max(1, Math.round(delayMs / 1000)),
		// Uma publicação por mensagem do cliente, mesmo que o webhook seja reentregue
		// entre o persist e o publish. Segunda linha de defesa atrás do índice de wamid.
		idempotencyKey: `ai-turn-${payload.mensagemGatilhoId}`,
	});
}
```

Retenção fica no default (24h): se o consumer ficar fora por horas, responder a uma mensagem antiga **ainda não respondida** é o comportamento desejado — e as checagens do runner descartam o que a conversa já superou.

### 5.2 Consumer (`app/api/queues/ai-chat-turn/route.ts`)

```typescript
import { handleCallback } from "@vercel/queue";
import { runAiTurnForMessage } from "@/lib/chats/ai-turn-runner";
import { z } from "zod";

const AiTurnQueueMessageSchema = z.object({
	organizacaoId: z.string(),
	chatId: z.string(),
	mensagemGatilhoId: z.string(),
	mensagemGatilhoDataEnvio: z.string(),
});

export const runtime = "nodejs";
export const maxDuration = 300;

export const POST = handleCallback(
	async (message) => {
		await runAiTurnForMessage(AiTurnQueueMessageSchema.parse(message));
	},
	{
		// Um retry de turno velho é inofensivo: o runner reconfere os fatos e descarta.
		retry: (_error, metadata) => (metadata.deliveryCount >= 3 ? { acknowledge: true } : { afterSeconds: 30 }),
	},
);
```

O SDK re-estende o visibility timeout enquanto o handler roda; runs longas não são reentregues no meio. A rota não é exposta publicamente — consumers `queue/v2beta` são invocáveis apenas pela infraestrutura interna da Vercel.

### 5.3 `vercel.json`

```json
{
	"crons": [ /* … inalterado … */ ],
	"functions": {
		"app/api/queues/ai-chat-turn/route.ts": {
			"experimentalTriggers": [
				{ "type": "queue/v2beta", "topic": "ai-chat-turns", "retryAfterSeconds": 30 }
			]
		}
	}
}
```

### 5.4 Rollout

1. Deploy com `AI_TURN_TRANSPORT` ausente → transporte inline, comportamento da Fase 4.
2. `AI_TURN_TRANSPORT=queue` em preview; validar com o cenário da seção 10.
3. Ativar em produção. Rollback = remover a env var.

O que muda de garantia com a fila ativa: o webhook responde em milissegundos; crash/deploy/timeout no meio do turno vira retry automático em vez de resposta perdida; o debounce deixa de ocupar compute.

---

## Fase 6 — Encerramento automático de atendimentos inativos

Independente das fases anteriores; pode ser deployada a qualquer momento. Sem migration: `resultado` já é `text` e todos os campos necessários existem.

### 6.1 `lib/chats/attendance-state.ts`

```typescript
/**
 * Encerra em lote os atendimentos ativos sem atividade no chat há mais tempo que o corte.
 *
 * O caso motivador é o EXTERNO: atendimento feito pelo telefone nunca passa pelo hub e o
 * ticket ficaria ativo para sempre. Fecha qualquer responsável (ver Decisão 7) — a próxima
 * mensagem do cliente abre um episódio novo via ensureCurrentAttendance.
 *
 * Set-based de propósito: uma varredura por chamada, sem loop por linha. Devolve as linhas
 * encerradas — é o ponto de acoplamento do incremento futuro de resumo por IA (seção 9).
 */
export async function closeStaleChatAttendances(db: TAttendanceDb, input: { inactiveSince: Date; now?: Date }) {
	const now = input.now ?? new Date();

	const staleChats = db
		.select({ id: chats.id })
		.from(chats)
		.where(lt(chats.ultimaMensagemData, input.inactiveSince));

	return db
		.update(chatAssignments)
		.set({
			status: "ENCERRADO",
			// Não sobrescreve um resultado que a IA ou o hub já tenham gravado.
			resultado: sql`COALESCE(${chatAssignments.resultado}, 'INATIVIDADE')`,
			dataEncerramento: now,
			dataLiberacao: now,
		})
		.where(and(notInArray(chatAssignments.status, CLOSED_ATTENDANCE_STATUSES), inArray(chatAssignments.chatId, staleChats)))
		.returning({
			id: chatAssignments.id,
			chatId: chatAssignments.chatId,
			organizacaoId: chatAssignments.organizacaoId,
			responsavelTipo: chatAssignments.responsavelTipo,
		});
}
```

`encerradoPorUsuarioId` fica intocado (nulo) e `dataResolucao` não é gravada: encerramento por inatividade não é resolução. O UPDATE dispara `postgres_changes` normalmente — o quadro do hub reflete sem refetch, como no cron de janelas.

### 6.2 Cron `app/api/cron/close-stale-attendances/route.ts`

Mesmo esqueleto de `invalidate-chat-windows` (`assertCronAuthorized` + `appApiHandler`):

```typescript
/** Sete dias sem qualquer mensagem no chat: o atendimento não está mais em curso. */
const STALE_ATTENDANCE_INACTIVITY_MS = 7 * 24 * 60 * 60 * 1000;

async function closeStaleAttendances() {
	const now = new Date();
	const closed = await closeStaleChatAttendances(db, {
		inactiveSince: new Date(now.getTime() - STALE_ATTENDANCE_INACTIVITY_MS),
		now,
	});

	console.log(`[INFO] [CLOSE_STALE_ATTENDANCES] ${closed.length} atendimento(s) encerrado(s) por inatividade.`);

	return { data: { atendimentosEncerrados: closed.length }, message: "Atendimentos inativos encerrados com sucesso." };
}
export type TCloseStaleAttendancesOutput = Awaited<ReturnType<typeof closeStaleAttendances>>;
```

`vercel.json`, junto aos crons existentes:

```json
{ "path": "/api/cron/close-stale-attendances", "schedule": "30 3 * * *" }
```

Diário e fora do horário comercial basta: a granularidade relevante do limiar é dias, e rodar de madrugada evita que a rajada de eventos realtime da primeira execução (que encerrará o backlog histórico de uma vez) concorra com o uso do hub.

### 6.3 Interações com o restante do módulo

- **Estatísticas** (`chats-stats`, quadro 0055): tickets encerrados por inatividade entram nas contagens de encerramento com `resultado: "INATIVIDADE"` — filtrável, e deixa de inflar o "em atendimento" eterno.
- **IA**: um chat cujo ticket foi encerrado volta ao estado "sem atendimento ativo"; se o cliente escrever de novo, `claimChatAttendanceForAgent` disputa um ticket novo `NAO_ATRIBUIDO` — comportamento idêntico ao de um chat novo, que é o desejado.
- **`AGUARDANDO_CLIENTE`/`AGUARDANDO_INTERNO`**: também são encerrados quando estagnados — sete dias sem nenhuma mensagem esgota qualquer espera legítima.

---

## 9. Caminho futuro — Workflows e resumo por IA no encerramento

### 9.1 Vercel Workflows

A fundação desta rodada é exatamente a exigida por Workflows — que roda **sobre** Queues:

| Peça desta rodada | Equivalente em Workflows |
| --- | --- |
| `send(topic, payload, { delaySeconds })` | `start(workflow, payload)` + `sleep()` durável como debounce |
| Consumer `handleCallback` | Corpo do workflow, com steps duráveis (claim, run, entrega) |
| Retry via visibility timeout | Retry por step, com recuperação workflow-aware |
| `dispatchAiTurn` | **Ponto único de troca** — migrar = adicionar um terceiro transporte |
| Índice de `wamid`, CAS do claim, revalidação pré-entrega | **Inalterados.** A idempotência no banco é pré-requisito lá também (steps são at-least-once) |

Nada do que este plano constrói é descartado na migração; o grosso do trabalho vira mover o corpo de `runAiTurnForMessage` para steps.

### 9.2 Resumo por IA no encerramento automático (incremento futuro, fora desta rodada)

A Fase 6 já deixa o ponto de acoplamento pronto: `closeStaleChatAttendances` devolve as linhas encerradas. O incremento é o cron publicar cada encerramento num tópico próprio e um consumer barato processar:

```
cron → send("attendance-closures", { assignmentId, chatId, organizacaoId }, { idempotencyKey: `closure-${assignmentId}` })
	→ consumer: modelo barato (ex.: claude-haiku-4-5) lê a conversa
		→ grava `resumo` e refina `resultado`/`categoria` no ticket encerrado
		→ opcionalmente agenda follow-ups (`interactions`) — ex.: cliente sumiu com pendência
```

Por que a topologia é a mesma da Fase 5 e por que fila (e não o próprio cron): volume em rajada na primeira execução, retry por item em vez de por varredura, e custo de LLM isolado do caminho do cron. O `idempotencyKey` por ticket e a escrita idempotente (o resumo é um `SET`, não um incremento) seguem a Decisão 1. Nenhuma coluna nova: `resumo`, `resultado` e `categoria` já existem em `chat_assignments`.

---

## 10. Riscos e mitigações

| Risco | Mitigação |
| --- | --- |
| Migration 0057 falha ao criar o índice único (duplicata não coberta pela janela de dedupe) | Os passos 1–2 da própria migration removem as duplicatas na mesma transação; testar contra dump de produção antes do deploy |
| `queue/v2beta` é beta; mudança de contrato ou indisponibilidade | Transporte inline atrás de env var — rollback sem deploy de código. O acoplamento ao SDK fica confinado a `ai-turn-dispatch.ts` e ao consumer |
| Latência fila ↔ banco (região) | O client auto-detecta `VERCEL_REGION`; a fila nasce na região das funções, que já é a região do Supabase. Verificar no primeiro deploy |
| Sem FIFO na fila | Irrelevante por construção: toda decisão de "responder ou não" é tomada contra `chat_messages`/`chat_assignments` no momento da execução (Decisão 2) |
| Reentrega da fila re-executa um turno já concluído | `confirmAiResponseStillValid` vê a resposta já persistida e aborta; `idempotencyKey` corta duplicatas de publicação |
| Claim movido para depois do debounce muda o momento em que o hub mostra "IA atendendo" | Aceito e desejável: o ticket só vira da IA quando ela de fato vai responder. Comunicar no changelog interno |
| `waitUntil` no webhook Meta: erro após o 200 não é reentregue pela Meta | Mesmo trade-off já aceito no gateway; com a fila ativa, o trecho crítico (turno de IA) tem retry próprio |
| Dois transportes ativos durante o rollout (deploy antigo drena a própria fila) | Tópicos são particionados por deployment na Vercel — os deployments não consomem mensagens um do outro |
| Primeira execução do cron de inatividade encerra o backlog histórico de uma vez (rajada de realtime + salto nas estatísticas de encerramento) | Agendado de madrugada; encerramentos automáticos são filtráveis por `resultado: "INATIVIDADE"` nas análises. Se o backlog for muito grande, rodar a primeira varredura manualmente via script antes de ativar o cron |
| Cron encerra um atendimento que o operador considerava vivo (ex.: espera longa combinada com o cliente) | Limiar generoso (7 dias **sem nenhuma mensagem**, em qualquer direção); qualquer mensagem nova reabre episódio limpo. Limiar por organização fica como incremento se houver demanda real |

---

## 11. Plano de validação

Sem runner de teste configurado no projeto; validação por script + cenários manuais em preview.

1. **Dedupe**: repetir o mesmo POST de webhook (payload real de `messages`) 3× em sequência e 3× em paralelo → 1 linha em `chat_messages`, `mensagens_nao_lidas` incrementado 1×, 1 turno de IA no máximo.
2. **Echo duplicado**: repetir um evento de echo → 1 linha, atendimento `EXTERNO` marcado 1×.
3. **Run supersedida**: mensagem A; aguardar o debounce passar e a run iniciar; mensagem B durante a run → run de A termina com `status: "CANCELADO"` e nada é enviado; run de B responde com A e B no contexto; exatamente 1 mensagem da IA no chat.
4. **Takeover humano durante a run**: humano assume o atendimento durante a run → entrega cancelada ("O atendimento deixou de ser da IA").
5. **Fila**: com `AI_TURN_TRANSPORT=queue`, cenários 1 e 3 novamente; conferir no painel de observabilidade de Queues o delay aplicado e o ack; matar o consumer no meio (redeploy) → turno reentregue e concluído.
6. **Regressão**: fluxo do gateway interno ponta a ponta; `ATRIBUICAO_HUB` pelo hub; playground (não passa pela fila e não revalida).
7. **Encerramento por inatividade**: seed com tickets `EXTERNO`, `NAO_ATRIBUIDO`, `AGENTE` e `USUARIO` com `ultimaMensagemData` além e aquém do corte → só os além encerram, com `resultado: "INATIVIDADE"` e `encerradoPorUsuarioId` nulo; ticket que já tinha `resultado` (ex.: `HUMAN_HANDOFF`) o preserva; mensagem nova num chat encerrado abre ticket novo e a IA disputa o claim normalmente.
8. `npm run lint` e `npx tsc --noEmit` verdes em cada commit.

---

## 12. Rollback

| Fase | Reversão |
| --- | --- |
| 1 | `DROP INDEX idx_chat_messages_whatsapp_message_id_org; CREATE INDEX idx_chat_messages_whatsapp_message_id ON ampmais_chat_messages (whatsapp_message_id);` + revert do código. As linhas deletadas eram duplicatas — sem perda de informação |
| 2 | Revert de código; `"CANCELADO"` é aditivo no enum de aplicação e linhas já gravadas com ele continuam legíveis pelo type `varchar` |
| 3–4 | Revert de código puro |
| 5 | `AI_TURN_TRANSPORT` removida/`inline` — sem deploy. Mensagens já na fila são consumidas ou expiram em 24h; o runner as trata com as mesmas checagens |
| 6 | Remover a entrada do cron em `vercel.json`. Tickets já encerrados não são reabertos em massa — a próxima mensagem de cada cliente abre episódio novo, que é o comportamento correto mesmo sem o cron |

---

## 13. Ordem de commits

1. `feat: idempotência de mensagens de chat por wamid (migration 0057 + onConflictDoNothing)` — Fases 1.1–1.4.
2. `feat: revalidação pós-run da IA antes da entrega + status CANCELADO` — Fase 2.
3. `fix: ack imediato no webhook da Meta via waitUntil` — Fase 3.
4. `refactor: extrai ai-turn-runner e dispatchAiTurn dos webhooks` — Fase 4.
5. `feat: Vercel Queues como transporte do turno de IA` — Fase 5 (código + `vercel.json`).
6. `feat: encerramento automático de atendimentos inativos via cron` — Fase 6.

Cada commit deixa a aplicação deployável; 1–3 e 6 podem ir a produção antes de 4–5 existirem.
