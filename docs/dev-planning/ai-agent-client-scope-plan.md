# Agente de IA — escopo de clientes

> **Documento temporário de especificação.** Deve ser excluído quando a implementação estiver
> concluída e revisada.

Porta para o RecompraCRM o escopo de atendimento por cliente que já roda no `syncroniza-control`.
Referência do padrão: `src/lib/validators/ai-agents.ts:95` (config) + `src/lib/ai/agents/routing.ts:17`
(enforcement).

**Problema:** hoje, agente `ATIVO` atende todo mundo. Não há como (a) rodar um piloto restrito a
alguns clientes reais, nem (b) tirar do atendimento automático quem fala com a empresa por motivo
operacional — o financeiro cobrando um fornecedor, a equipe interna testando o número. Hoje esses
dois casos disparam o agente igual a um cliente comprando.

---

## 1. Estado atual — a escada de gates que já existe

| # | Gate | Onde | O que decide |
| --- | --- | --- | --- |
| 1 | `iaAtendimento.acesso` | `webhook-processing.ts:561`, `gateway-webhook-processing.ts:349` | Capability de plano da organização |
| 2 | `permitirAtendimentoIa` | `services/drizzle/schema/whatsapp-connections.ts:68` | Em quais **números nossos** a IA atende |
| 3 | `agente.status === "ATIVO"` | `ai-turn-runner.ts:27` | Liga/desliga o agente inteiro |
| 4 | `claimChatForAi` | `lib/chats/ai-trigger.ts:35` | Se a conversa já tem dono (humano, telefone, outro episódio da IA) |
| 5 | `confirmAiResponseStillValid` | `lib/chats/ai-trigger.ts:68` | Se responder ainda faz sentido (mensagem nova, resposta já dada) |

**Falta o eixo do cliente.** O gate #2 responde "em quais números *nossos* a IA trabalha"; nenhum
gate responde "com quais números *deles* a IA fala". É exatamente esse o furo — e é o eixo que o
`syncroniza-control` já resolve.

**Fato que simplifica tudo:** `chats.clienteId` é `notNull` (`services/drizzle/schema/chats.ts:31`).
Todo chat resolve para um cliente antes de qualquer coisa acontecer. Escopo por `clienteId` é,
portanto, **total** — não existe conversa fora dele.

---

## 2. O que o `syncroniza-control` faz, e por que a porta não é literal

Lá, `AiAgentCanalConfigSchema` carrega dois campos por canal:

```ts
escopoTipo: z.enum(["TODOS", "INCLUIR", "EXCLUIR"]).default("TODOS"),
escopoClienteIds: z.array(z.string()).default([]),
```

E `resolveChatAgentDispatch` usa `isClientInAgentChatScope` como **filtro de candidatos**, antes de
qualquer lógica de posse: cliente fora do escopo → o agente nem chega a ser candidato.

| | `syncroniza-control` | RecompraCRM |
| --- | --- | --- |
| Agentes | N por parceiro | **1 por organização** (`ai_agents_organizacao_unica_idx`, `schema/ai-agents.ts:57`) |
| Canais | N integrações, config por canal em `canais` | Sem campo `canais` — o gate de canal é `permitirAtendimentoIa` |
| Onde o escopo cabe | Por canal, obrigatoriamente (o mesmo agente pode ter escopos diferentes por número) | **No agente**, uma vez só |

Ou seja: a porta **simplifica**. Não há `canais` para replicar; o escopo é um campo do agente e
compõe com o gate de número que já existe.

---

## 3. Onde a config mora — coluna `escopo`, **não** dentro de `capacidades`

Único desvio consciente em relação a um port ingênuo, e o ponto mais importante do desenho.

`capacidades` é copiado **integralmente para dentro de cada run** (`AiAgentConfigSnapshotSchema`,
`schemas/ai-agents.ts:195` → `runtime.ts:120` → `ai_agent_runs.config_snapshot`). Uma lista de 200
`clienteIds` dentro de `capacidades` seria duplicada em **toda run, para sempre**. O
`syncroniza-control` toma a mesma decisão pelo mesmo motivo, e deixa escrito em `canais`:
*"Config viva de implantação — lida do registro do agente, nunca versionada"*.

Escopo é config de implantação, não capacidade. Fica fora do snapshot.

### Migration `0082`

```sql
-- Escopo de clientes do agente de IA — docs/dev-planning/ai-agent-client-scope-plan.md
-- Aditiva e preservadora de comportamento: o default TODOS reproduz o comportamento atual
-- (agente atende todo mundo) para toda organização existente.
-- Aplicar com: npx tsx ./scripts/apply-sql-migration.ts drizzle/0082_ai_agent_client_scope.sql
-- Idempotente (IF NOT EXISTS).

ALTER TABLE ampmais_ai_agents
	ADD COLUMN IF NOT EXISTS escopo jsonb NOT NULL DEFAULT '{"tipo":"TODOS","clienteIds":[]}'::jsonb;
```

### Schema Drizzle

```ts
// services/drizzle/schema/ai-agents.ts — junto de `capacidades`
// Config viva de implantação: fica FORA de `configSnapshot` de propósito. Uma lista de
// clientes copiada em toda run inflaria `ai_agent_runs` sem nenhum ganho de auditoria.
escopo: jsonb("escopo").$type<TAiAgentEscopo>().notNull().default({ tipo: "TODOS", clienteIds: [] }),
```

### Zod

```ts
// schemas/enums.ts — enums não ficam co-locados (CLAUDE.md)
export const AiAgentEscopoTipoEnum = z.enum(["TODOS", "INCLUIR", "EXCLUIR"]);
export type TAiAgentEscopoTipoEnum = z.infer<typeof AiAgentEscopoTipoEnum>;

// schemas/ai-agents.ts
export const AiAgentEscopoSchema = z
	.object({
		tipo: AiAgentEscopoTipoEnum.default("TODOS"),
		clienteIds: z.array(z.string({ invalid_type_error: "Tipo não válido para o ID do cliente." })).default([]),
	})
	.default({});
export type TAiAgentEscopo = z.infer<typeof AiAgentEscopoSchema>;
```

Todo campo com `.default()`, pela regra que o próprio arquivo declara no cabeçalho: config gravada
antes do campo existir continua parseando via `parseJsonbWithFallback`, em vez de derrubar a run.

**Por que jsonb e não tabela filha.** Os dois casos de uso reais — piloto restrito e exclusão da
equipe interna — são listas de dezenas. jsonb não custa query nenhuma no caminho quente: a linha do
agente já está carregada em `ai-turn-runner.ts:26`. IDs órfãos de clientes deletados são inofensivos
(simplesmente nunca casam). A fronteira para migrar para tabela filha é **centenas de IDs** ou
necessidade de auditoria por linha; nenhuma das duas está no horizonte.

---

## 4. Semântica — três estados, não duas listas

| `tipo` | Lista vazia | Lista preenchida |
| --- | --- | --- |
| `TODOS` | todo mundo | — (lista ignorada) |
| `INCLUIR` | **ninguém** | só os listados |
| `EXCLUIR` | todo mundo | todo mundo menos os listados |

```ts
export function isClientInAgentScope(escopo: TAiAgentEscopo, clienteId: string): boolean {
	const ids = escopo.clienteIds ?? [];
	if (escopo.tipo === "INCLUIR") return ids.includes(clienteId);
	if (escopo.tipo === "EXCLUIR") return ids.length === 0 || !ids.includes(clienteId);
	return true;
}
```

**A assimetria da lista vazia é deliberada** (e é a do `syncroniza-control`): `INCLUIR` + `[]` →
ninguém; `EXCLUIR` + `[]` → todo mundo. Em ambos os casos "a lista quer dizer o que está escrito
nela". E fecha um footgun concreto: organização troca para lista de permissão, salva antes de
escolher alguém, e o agente **continuaria atendendo todo mundo** se o vazio fosse permissivo.

**Por que um enum e não duas listas independentes** (permitir + bloquear): duas listas exigem uma
regra de precedência que ninguém lembra, e a UI precisa explicá-la. Um modo se lê como frase — *quem
o agente atende? todo mundo / só estes / todos menos estes*.

---

## 5. Enforcement — na camada de roteamento, e é isso que isenta o playground

Função pura em `lib/chats/ai-trigger.ts`, ao lado dos gates que já vivem lá. Chamada em
**exatamente dois** pontos:

| Ponto | Arquivo | Cobre |
| --- | --- | --- |
| `runAiTurnForMessage` | `lib/chats/ai-turn-runner.ts:25` | Webhook Meta **e** gateway interno **e** consumer da fila — os três funilam aqui (`webhook-processing.ts:575`, `gateway-webhook-processing.ts:364`, `app/api/queues/ai-chat-turn/route.ts:28`) |
| `triggerAgentTurnFromHub` | `lib/ai/agent/hub-turn.ts:26` | Entrega manual da conversa ao agente pelo hub |

Um único ponto de inserção cobre os dois webhooks — nada de checagem duplicada nos dois arquivos.

**Deliberadamente NÃO em `respondToChatWithAgent` / `prepareAgentExecution`.** Esse é o caminho de
execução compartilhado que o **playground** chama direto
(`app/api/ai-agents/playground/messages/route.ts:49`). Manter a checagem no roteamento isenta o
playground de graça — e isso importa: o playground é justamente a ferramenta que a organização usa
enquanto o agente está numa lista de permissão.

**Armadilha evitada de quebra:** o playground cria uma linha **real** em `clients`
(`"Cliente de Teste (Playground)"`, `lib/ai/agent/playground.ts:17`). Se o enforcement fosse no
caminho de execução, esse cliente apareceria no seletor e teria que ser incluído na mão em toda
lista `INCLUIR` — ou o playground pararia de funcionar sem explicação.

### Posição dentro do runner: **antes** do `claimChatForAi`, nunca dentro

Sutil e importante. `claimChatForAi` faz curto-circuito com `shouldRespond: true` quando
`responsavelTipo === "AGENTE"` (`ai-trigger.ts:49`) — o episódio já é do agente, não precisa
reivindicar de novo. Se a checagem de escopo morasse dentro do claim, **uma conversa que o agente já
conduz continuaria sendo respondida** depois de o cliente entrar na lista de exclusão.

Checar antes do claim faz a regra valer **por turno**, retroativamente — que é o que a organização
quer dizer quando adiciona alguém à lista no meio de uma conversa.

```ts
// lib/chats/ai-turn-runner.ts, entre o gate de status (:27) e o claim (:34)
if (!isClientInAgentScope(agent.escopo, chat.clienteId)) {
	await releaseChatAttendanceIfAgentOwned({ organizacaoId, chatId, agenteId: agent.id });
	console.log("[AI_TURN] Cliente fora do escopo do agente:", chat.clienteId);
	return;
}
```

O `clienteId` não está no `TAiTurnPayload` hoje — ler do chat aqui (uma query por `columns:
{ clienteId: true }`) é preferível a carregá-lo no payload: o payload atravessa a fila em JSON e
um `clienteId` embarcado poderia estar velho na hora do consumo.

---

## 6. Liberar o atendimento ao sair do escopo — **decisão fechada**

Se o agente simplesmente emudecesse, o `chat_assignment` continuaria com
`responsavelTipo: "AGENTE"`: a conversa **parece atendida** enquanto ninguém a atende. O financeiro
receberia silêncio, não um humano.

Portanto: quando a checagem de escopo falha **e** o atendimento atual é do próprio agente, liberar
via `releaseChatAttendance` (`lib/chats/attendance-state.ts:395`), com `motivo`. A função já faz o
certo — põe em `NAO_ATRIBUIDO`, limpa `responsavelAgenteId`/`atribuidoPorUsuarioId` e reabre o
ticket (`status: "ABERTO"`) quando há pendência do cliente. A conversa volta para a fila do hub.

Assim "tirar do escopo" significa **devolver para as pessoas**, não *largar no chão*.

Não há varredura retroativa no save da config: a regra vale por turno, e o release acontece no
primeiro turno em que o cliente fora do escopo escrever. É o suficiente — uma conversa parada não
precisa ser liberada, porque ninguém está esperando resposta nela.

---

## 7. Superfície de configuração

| Camada | Arquivo | Mudança |
| --- | --- | --- |
| Enum | `schemas/enums.ts` | `AiAgentEscopoTipoEnum` |
| Zod | `schemas/ai-agents.ts:216` | `AiAgentEscopoSchema`; `escopo` em `AiAgentSchema` — `UpdateAiAgentSchema` (`:267`) herda pelo `.omit()` existente |
| Schema | `services/drizzle/schema/ai-agents.ts:53` | Coluna `escopo` |
| Migration | `drizzle/0082_ai_agent_client_scope.sql` | Aditiva com default |
| Provisionamento | `lib/ai/agent/provisioning.ts:89` | `escopo` no `.values()` do insert lazy |
| API | `app/api/ai-agents/route.ts:38` e `:63` | `getAiAgent` parseia com `parseJsonbWithFallback(AiAgentEscopoSchema, …)`; `updateAiAgent` grava `escopo: input.agente.escopo` |
| State hook | `state-hooks/use-internal-ai-agent-state.tsx:60` | `updateScope` e `toggleScopeClient` (ao lado de `updateAttendanceSettings`), default em `buildInitialState` |
| UI | `components/Settings/AiAgent/AgentScopeSection.tsx` | **Novo.** Toggle de 3 modos; seletor de clientes só renderiza quando `tipo !== "TODOS"` |
| Form | `components/Settings/AiAgent/AgentConfigForm.tsx:99` | Quarta seção `QUEM O AGENTE ATENDE`, entre "O QUE O AGENTE PODE CONSULTAR" (`:85`) e "BASE DE CONHECIMENTO" (`:99`) |
| Hub | Controle de atribuição do hub | Desabilitar "entregar ao agente" para cliente fora do escopo, com motivo |

### O seletor de clientes precisa de uma adição em `/api/clients/search`

`useClientsBySearch` / `GET /api/clients/search` é **só busca**: mínimo de 2 caracteres, `limit: 10`,
sem lookup por ID (`app/api/clients/search/route.ts:20-49`). Para renderizar os chips dos clientes já
selecionados é preciso o **nome** deles, e a busca não sabe devolver por ID.

Adicionar um parâmetro `clientIds` à rota — exatamente o que o `getClientsSimplified` do
`syncroniza-control` recebe, e é assim que o `ClienteEscopoPicker` de lá monta seus chips.

Descartado: gravar `{ id, nome, telefone }` no jsonb. Nome denormalizado envelhece, e a lista de IDs
deixa de ser fonte única da verdade.

### Hub: desabilitar, não deixar clicar em vazio

O gate já barra o turno, mas um humano clicando "entregar ao agente" numa conversa fora do escopo
teria um no-op silencioso. Desabilitar a ação com o motivo (`Cliente fora do escopo do agente`). O
enforcement continua no gate — a UI só evita o clique morto.

---

## 8. Ordem de implementação

1. `schemas/enums.ts` + `schemas/ai-agents.ts` — enum, `AiAgentEscopoSchema`, campo em `AiAgentSchema`.
2. `services/drizzle/schema/ai-agents.ts` + `drizzle/0082_*.sql` + `provisioning.ts`.
3. `lib/chats/ai-trigger.ts` — `isClientInAgentScope` (pura) + helper de release.
4. `lib/chats/ai-turn-runner.ts` e `lib/ai/agent/hub-turn.ts` — os dois pontos de enforcement.
5. `app/api/ai-agents/route.ts` — leitura e escrita do campo.
6. `app/api/clients/search/route.ts` — parâmetro `clientIds`.
7. `state-hooks/use-internal-ai-agent-state.tsx` + `AgentScopeSection.tsx` + `AgentConfigForm.tsx`.
8. Hub: desabilitar a atribuição fora do escopo.

Os passos 1–5 já entregam a feature completa no backend; 6–8 são a superfície de configuração.

---

## 9. Decisões fechadas

| # | Decisão | Motivo |
| --- | --- | --- |
| 1 | Coluna `escopo` própria, fora de `capacidades` | `capacidades` vai para `config_snapshot` de toda run; lista de clientes inflaria `ai_agent_runs` sem ganho de auditoria |
| 2 | jsonb, não tabela filha | Listas de dezenas; sem query extra no caminho quente; IDs órfãos são inofensivos |
| 3 | Enum de 3 estados, não duas listas | Precedência entre permitir/bloquear é invisível para quem configura |
| 4 | `INCLUIR` + lista vazia = ninguém | Leitura segura; fecha o footgun de salvar antes de escolher |
| 5 | Enforcement no roteamento, não na execução | Isenta o playground de graça — e o playground é a ferramenta usada justamente durante um piloto restrito |
| 6 | Checagem **antes** do `claimChatForAi` | O claim faz curto-circuito em conversa já do agente; dentro dele a exclusão não valeria retroativamente |
| 7 | Liberar o atendimento ao sair do escopo | Sem isso a conversa parece atendida e ninguém a atende |
| 8 | **Escopo sempre por `clienteId`** — nunca por telefone solto | `chats.clienteId` é `notNull`: escopo por cliente é total. Quem precisa ser excluído deve ter cadastro de cliente; um eixo paralelo por telefone criaria duas fontes de verdade para a mesma pergunta |
| 9 | Sem varredura retroativa no save | A regra vale por turno; conversa parada não precisa de release |

---

## 10. Verificação

**Unitário** (`isClientInAgentScope` é pura — teste de tabela, como `schemas/ai-agents.test.ts`):

| `tipo` | lista | cliente | esperado |
| --- | --- | --- | --- |
| `TODOS` | `[]` | qualquer | `true` |
| `TODOS` | `["a"]` | `"b"` | `true` (lista ignorada) |
| `INCLUIR` | `[]` | `"a"` | `false` |
| `INCLUIR` | `["a"]` | `"a"` | `true` |
| `INCLUIR` | `["a"]` | `"b"` | `false` |
| `EXCLUIR` | `[]` | `"a"` | `true` |
| `EXCLUIR` | `["a"]` | `"a"` | `false` |
| `EXCLUIR` | `["a"]` | `"b"` | `true` |

**Integração / manual:**

1. Organização existente, sem tocar na config → agente atende igual a antes (default `TODOS`).
2. `INCLUIR` com um cliente → esse cliente é atendido; qualquer outro cai no hub sem resposta.
3. `INCLUIR` com lista vazia → ninguém é atendido; nenhuma run é criada.
4. **Playground funciona nos casos 2 e 3** — é o teste que prova o ponto de enforcement.
5. Conversa em andamento conduzida pelo agente → adicionar o cliente ao `EXCLUIR` → na próxima
   mensagem dele o agente não responde **e** o ticket volta para `NAO_ATRIBUIDO` com pendência.
6. Hub: "entregar ao agente" desabilitado em conversa de cliente fora do escopo.
7. Ambos os transportes (`AI_TURN_TRANSPORT` inline e `queue`) respeitam o escopo — o gate está no
   runner compartilhado, então basta confirmar que o consumer da fila passa por ele.

---

## 11. Fora de escopo nesta fase

- **Escopo por canal.** Um agente por organização e o gate `permitirAtendimentoIa` já cobrem o eixo
  de número. Se um dia houver N agentes por organização, o campo `escopo` vira o valor de um mapa
  por conexão — mesma forma, mesma função pura.
- **Escopo por segmento/tag de cliente** (tabela `client_tags`, audiences). Seria uma terceira `tipo`
  (`SEGMENTO`) resolvida em query, não uma lista de IDs. Só vale quando alguém pedir lista grande —
  que é o mesmo gatilho da migração para tabela filha.
- **Auditoria de mudanças de escopo.** Nada registra hoje quem tirou quem do escopo e quando.
