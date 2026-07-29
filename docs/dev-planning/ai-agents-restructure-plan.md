# Reestruturação do Módulo de Agentes de IA

> **Status**: planejado — aprovado em 2026-07-29
> **Escopo**: exclusão completa de AI Hints + reconstrução do agente de atendimento com arquitetura de agente auditável (runs, tool calls, capacidades, conhecimento), um agente por organização.
> **Referência de arquitetura**: `syncroniza-control` (`C:\Users\Lucas\PROJETOS\syncroniza-control`), adaptada para escopo menor.

---

## 1. Contexto e motivação

O módulo de IA tem hoje dois usos:

1. **AI Hints** — sugestões de campanhas geradas por um pipeline de marketing. **Sem adoção**: a UI já está comentada (`app/dashboard/layout.tsx:42`, `components/Layouts/HeaderApp.tsx:41`), o cron roda com whitelist hardcoded de 2 organizações, e o valor agregado é baixo. **Decisão: excluir por completo.**
2. **Agente de atendimento** — responde clientes via WhatsApp (Meta Cloud API e gateway interno/Baileys). **Funciona, mas é frágil.** O foco dos agentes de IA passa a ser 100% atendimento.

### 1.1 Diagnóstico do estado atual do agente de atendimento

| Problema | Evidência |
|---|---|
| System prompt hardcoded para uma única empresa | `lib/ai/ai-agent/prompts.ts` — `ENHANCED_SYSTEM_PROMPT` cita "Ampère Mais" e endereço físico literal. Zero parametrização por organização |
| **Furo multi-tenant nas tools** | `lib/ai/ai-agent/database-tools.ts:231` — `ilike(products.nome, %q%)` sem filtro de `organizacaoId`; **nenhuma** das 7 funções de dados filtra org. `agentTools` é objeto estático (não factory), então não há como injetar o tenant sem refatorar |
| Ids alucináveis | `transfer_to_human` recebe `chatId`/`clientId` como argumentos do modelo |
| Zero configuração por organização | Modelo, temperatura, maxSteps, persona, regras — tudo hardcoded. `whatsapp_connection_phones.permitir_atendimento_ia` é o único gate real e **não tem UI** (só exibição em `ViewConnectionPhone.tsx:222`) |
| Capability nunca checada | `organizations.configuracao.recursos.iaAtendimento.acesso` existe mas os webhooks checam apenas `hubAtendimentos.acesso`; `limiteCreditos` nunca é consumido |
| Zero observabilidade | Nenhuma persistência de runs, tokens, tool calls. `console.log` com dump do resultado inteiro do LLM. `metadata.tokensUsed` é calculado, logado e descartado |
| Código morto | `ESCALATION_KEYWORDS`/`detectEscalationNeeded` (exportados, nunca chamados); `toolsUsed` sempre `[]`; branch `metadata.escalation` inalcançável nos webhooks; `app/api/integrations/ai/generate-response/route.ts` sem chamador e **sem autenticação** |
| Slot reservado sem tabela | `chat_assignments.responsavelAgenteId` (`services/drizzle/schema/chats.ts:141`) com comentário: "a tabela de agentes de IA ainda não existe aqui" |

### 1.2 O que o syncroniza-control faz certo (e será portado adaptado)

O princípio central, documentado no ADR daquele projeto:

> *"AI SDK should execute our wrappers, not raw business logic."*

Ou seja: o AI SDK executa **wrappers auditados** — `executeAgentTool` grava a tool call **antes** de executar, valida capacidade em runtime (não confia no toolset filtrado), e normaliza a saída. É isso que transforma "chatbot com tools" em "agente auditável". Peças portadas (adaptadas):

- **Trio de tabelas**: `ai_agents` (config) / `ai_agent_runs` (execuções com snapshot de contexto, tokens, erro) / `ai_agent_tool_calls` (auditoria de cada ferramenta: input, output, status).
- **Contrato de tool**: `defineAgentTool { name, description, inputSchema (Zod), execute(input, context) }` + registro em objeto literal + pipeline de execução com auditoria embutida.
- **Capacidades como camada de permissão**: JSONB validado por Zod com `ferramentas: {nome: {habilitada}}` + `limites`.
- **Runtime em 3 fases**: `prepare` (carrega/valida/cria run) → `build` (`ToolLoopAgent` com config do banco) → `run` (completa/falha o run com uso normalizado).
- **Prompt em camadas**: instruções do usuário → regras fixas → regras **condicionais às tools habilitadas** → lista de tools → contexto de conhecimento.
- **Snapshot rico no prompt de turno**: o modelo recebe o contexto completo (cliente, mensagens, bloco de tempo) em vez de redescobrir via tools.
- **Controles de concorrência agente↔humano**: claim atômico (CAS), debounce com revalidação pós-sleep, respeito ao humano dono do chat. *O RecompraCRM já tem isso em `lib/chats/ai-trigger.ts` + `lib/chats/attendance-state.ts` — será evoluído, não duplicado.*
- **Playground**: chat sintético que roda o pipeline **idêntico** ao de produção.

### 1.3 O que NÃO será portado (decisões de corte para o v1)

| Recurso do syncroniza | Por que não |
|---|---|
| Versionamento (`ai_agent_versions`, fluxo salvar→publicar→ativar) | Com 1 agente por org editado por poucas pessoas, o overhead não compensa. Auditoria preservada via `config_snapshot` por run |
| Aprovações HITL (fila, payload editável, execução diferida) | Atendimento é tempo real; as tools do v1 são leitura + transferência. Sem mutações externas perigosas |
| Meta-tools / descobrimento progressivo (`get_tool_catalog`, `learn_tools`, `execute_tool`) | Justifica-se com 32 tools; com 5, pré-carregar tudo é mais simples e mais rápido |
| Skills carregáveis | Mesma lógica — conteúdo vai direto no system prompt |
| Artifacts (`ai_agent_run_artifacts`) | Atendimento puro não produz saídas estruturadas consultáveis |
| RAG / pgvector / pipeline de embeddings | v1 usa blocos de texto injetados direto (ver §4). Estrutura preparada para evoluir |
| Multi-agente / routing entre agentes / `chats.porIntegracao` | Um agente por organização (por enquanto) |
| Templates múltiplos de agente | Vira um único template de seed com defaults |

---

## 2. Decisões de produto (tomadas com o usuário)

1. **Conhecimento v1** = blocos de texto editáveis (tabela própria) injetados no system prompt. Sem RAG por enquanto.
2. **Sem versionamento** de config: runtime lê a config atual; cada run grava snapshot jsonb da config usada.
3. **UI v1** = configuração + lista de execuções (drawer com timeline de tool calls/tokens/erros) + playground.
4. **Marketing pipeline** deletado inteiro, incluindo a rota admin `marketing-context`.
5. **Sem HITL** no v1.
6. **Tools consolidadas**: poucas tools com filtros ricos ("abstração SQL até certo ponto") em vez de muitas variações fixas. 8 tools → 5.
7. **Domínios do agente no v1**: compras do cliente, catálogo de produtos, **cashback**, **cupons**, transferência para humano. (Deals/negociações ficam para depois.)

---

## 3. Decisões de arquitetura

| Decisão | Escolha | Justificativa |
|---|---|---|
| Agente único por org | `uniqueIndex` em `organizacao_id` na tabela `ampmais_ai_agents` | Torna o auto-provisionamento idempotente e o lookup trivial |
| Provisionamento | **Lazy** via `ensureOrganizationAgent()`, chamado no GET da config **e** no webhook. Criado com `status: "ATIVO"` e instruções-template que interpolam `org.nome`. `onConflictDoNothing` + re-select contra corrida | Sem seed/migração; orgs que já usam IA via `permitirAtendimentoIa` não regridem |
| Envio de mensagem | **Não é tool.** Output estruturado do agente: `{ mensagem: string \| null, resumoAtendimento: string }` + adapter `deliver` por canal | Garante ≤1 mensagem por run por construção; a checagem de janela 24h fica no canal (onde pertence); o playground vira um adapter persist-only trivial. `mensagem: null` = o agente decidiu não responder (ex.: acabou de transferir) |
| `transferir_para_humano` | Continua **tool** | É efeito colateral no meio do loop, não o resultado final do turno |
| Vínculo run ↔ mensagem | `mensagem_enviada_id` em `ai_agent_runs` (canônico) + `chatMessages.metadados.aiAgente = { runId, agenteId }` (denormalizado) | Drawer navega run→mensagem; hub mostra mensagem→run sem join. `metadados` jsonb já existe (`schemas/chats.ts:236`) |
| `chat_assignments.responsavelAgenteId` | Passa a ser preenchido com `aiAgents.id`. **Sem FK** | `claimChatAttendanceForAgent` **já aceita `agenteId`** (`lib/chats/attendance-state.ts:264-266`). FK criaria import circular `chats.ts ⇄ ai-agents.ts`; a direção de import é `ai-agents.ts → chats.ts` |
| Enums | `varchar` + `$type<>` no Drizzle + `z.enum` em `schemas/enums.ts` (não `pgEnum`) | Desvio consciente já documentado em `chat_assignments` (`services/drizzle/schema/chats.ts:121-123`) — evita migrations de enum |
| Campos jsonb | Português (dados viajam): `modeloConfig: {modelo, temperatura, maxTokensSaida, topP}`, `uso: {tokensEntrada, tokensSaida, tokensTotal, modelo}` | Convenção CLAUDE.md "data is Portuguese". O mapeamento para params do AI SDK acontece no runtime (código inglês) |
| Playground | Coluna nova `chats.origem` (`"WHATSAPP"` default \| `"PLAYGROUND"`), cliente fictício por org, chat real sem conexão WhatsApp, `gatilho: "PLAYGROUND"`, sem debounce | As colunas WhatsApp do chat já são nullable (`services/drizzle/schema/chats.ts:34-40`). Pipeline idêntico ao de produção = teste fiel. Hub filtra `origem != 'PLAYGROUND'` |
| Endpoint legado `generate-response` | **Deletar** | Sem chamador no repo, **sem autenticação** (executa o agente para qualquer `chatId` recebido), formato legado do tempo do Convex |
| `iaAtendimento.limiteCreditos` | Fora do v1 | Nunca foi consumido. `capacidades.limites.maxRunsDiarios` é o freio real. A tabela de runs viabiliza metering futuro |
| Migração de dados | Nenhuma | Hints são regenerados semanalmente e descartáveis; feedback é like/dislike sem consumidor. Nenhuma outra tabela referencia `ai_hints` |
| Provider | Mantém Vercel AI SDK v6 + AI Gateway (`gateway("openai/gpt-5")` como default), agora isolado em `lib/ai/providers/` | Já é o stack do projeto; o isolamento evita lock-in e centraliza normalização de uso |

---

## 4. Modelo de dados

Arquivo novo: `services/drizzle/schema/ai-agents.ts`. Importa `organizations`, `chats`, `chatMessages` — **direção única de import** (`chats.ts` não importa este arquivo).

### 4.1 `ampmais_ai_agents` (`aiAgents`)

| Campo | Tipo | Nota |
|---|---|---|
| `id` | varchar(255) PK | `crypto.randomUUID()` |
| `organizacaoId` | varchar(255) FK → organizations, cascade, notNull | **`uniqueIndex("ai_agents_organizacao_unica_idx")`** — 1 agente por org |
| `nome` | varchar(255) notNull | default `"Agente de Atendimento"` |
| `status` | varchar(32) `$type<TAiAgentStatus>` notNull | `"ATIVO"` \| `"PAUSADO"`, default `"ATIVO"` |
| `instrucoes` | text notNull | Persona/instruções editadas pelo usuário |
| `modeloConfig` | jsonb `$type<TAiAgentModeloConfig>` notNull | `{ modelo, temperatura?, maxTokensSaida?, topP? }` |
| `capacidades` | jsonb `$type<TAiAgentCapacidades>` notNull | Ver §5 |
| `dataInsercao` | timestamp defaultNow notNull | |
| `dataAtualizacao` | timestamp `$onUpdate` | |

### 4.2 `ampmais_ai_agent_knowledge` (`aiAgentKnowledge`)

Blocos de conhecimento editáveis (políticas, horários, FAQ, diferenciais...).

| Campo | Tipo | Nota |
|---|---|---|
| `id` | varchar(255) PK | |
| `organizacaoId` | varchar(255) FK cascade notNull | |
| `agenteId` | varchar(255) FK → aiAgents, cascade, notNull | |
| `titulo` | varchar(255) notNull | |
| `conteudo` | text notNull | |
| `ativo` | boolean notNull default true | Toggle sem deletar |
| `ordem` | integer notNull default 0 | Ordem de injeção no prompt |
| `dataInsercao` / `dataAtualizacao` | timestamp | |

Index: `(agenteId, ativo)`.

**Evolução futura para RAG**: cada bloco vira unidade de chunking/embedding — a modelagem em tabela separada (vs. campo text no agente) existe exatamente para isso.

### 4.3 `ampmais_ai_agent_runs` (`aiAgentRuns`)

| Campo | Tipo | Nota |
|---|---|---|
| `id` | varchar(255) PK | |
| `organizacaoId` | varchar(255) FK cascade notNull | |
| `agenteId` | varchar(255) FK → aiAgents cascade notNull | |
| `status` | varchar(32) `$type` notNull | `PENDENTE → RODANDO → CONCLUIDO \| FALHA`, default `PENDENTE` |
| `gatilho` | varchar(32) `$type` notNull | `"CHAT_MENSAGEM"` \| `"PLAYGROUND"` |
| `chatId` | varchar(255) FK → chats cascade notNull | |
| `clienteId` | varchar(255) | Denormalizado, sem FK |
| `mensagemGatilhoId` | varchar(255) | Mensagem do cliente que disparou o run |
| `mensagemEnviadaId` | varchar(255) FK → chatMessages, `set null` | Mensagem que o run produziu |
| `configSnapshot` | jsonb `$type<TAiAgentConfigSnapshot>` notNull | `{ instrucoes, modeloConfig, capacidades, conhecimento: [{id, titulo}] }` — substitui o versionamento |
| `contextoEntradaSnapshot` | jsonb | Snapshot do contexto montado para o turno (debug) |
| `outputResumo` | text | Texto final / resumo do output |
| `uso` | jsonb `$type<TAiAgentUso>` | `{ tokensEntrada, tokensSaida, tokensTotal, modelo }` |
| `erro` | text | |
| `dataInicio` / `dataFim` | timestamp | |
| `dataInsercao` | timestamp defaultNow notNull | |

Indexes: `(organizacaoId, dataInsercao desc)`, `(agenteId, status)`, `(chatId)`.

### 4.4 `ampmais_ai_agent_tool_calls` (`aiAgentToolCalls`)

| Campo | Tipo | Nota |
|---|---|---|
| `id` | varchar(255) PK | |
| `organizacaoId` | varchar(255) FK cascade notNull | |
| `runId` | varchar(255) FK → aiAgentRuns cascade notNull | |
| `agenteId` | varchar(255) FK cascade notNull | |
| `ferramentaNome` | varchar(128) notNull | Ex.: `"produtos.consultar"` |
| `status` | varchar(32) `$type` notNull | `EXECUTANDO → CONCLUIDO \| FALHA`, default `EXECUTANDO` |
| `input` | jsonb | Input validado (pós-parse Zod) |
| `output` | jsonb | Output normalizado |
| `erro` | text | |
| `dataExecucao` | timestamp | |
| `dataInsercao` | timestamp defaultNow notNull | |

Index: `(runId, status)`.

### 4.5 Alterações em tabelas existentes

- **`services/drizzle/schema/chats.ts`** — `chats` ganha `origem: varchar("origem", { length: 16 }).$type<TChatOrigin>().notNull().default("WHATSAPP")`. Atualizar o comentário de `responsavelAgenteId` (linha ~141): agora preenchido com `aiAgents.id`; sem FK por direção de import.
- **`schemas/chats.ts`** — `ChatMessageMetadataSchema` (linha ~236) ganha `aiAgente: z.object({ runId: z.string(), agenteId: z.string() }).optional().nullable()`.
- **`lib/organizations/deletion.ts`** — adicionar, na ordem filhos→pais: `aiAgentToolCalls` → `aiAgentRuns` → `aiAgentKnowledge` → `aiAgents`. **Regra do projeto**: toda tabela nova de org entra na deleção explícita (cascade no banco sobrecarregou o DB no passado).

### 4.6 Tabelas removidas

- `ampmais_ai_hint_feedback` (primeiro — tem FK para hints)
- `ampmais_ai_hints`

---

## 5. Schemas Zod (`schemas/ai-agents.ts` + adições em `schemas/enums.ts`)

### 5.1 Enums novos (`schemas/enums.ts`)

```ts
AiAgentStatusEnum         = z.enum(["ATIVO", "PAUSADO"])
AiAgentRunStatusEnum      = z.enum(["PENDENTE", "RODANDO", "CONCLUIDO", "FALHA"])
AiAgentRunGatilhoEnum     = z.enum(["CHAT_MENSAGEM", "PLAYGROUND"])
AiAgentToolCallStatusEnum = z.enum(["EXECUTANDO", "CONCLUIDO", "FALHA"])
AiAgentToolNameEnum       = z.enum([
  "clientes.consultar_compras",
  "produtos.consultar",
  "cashback.consultar",
  "cupons.consultar",
  "atendimento.transferir_para_humano",
])
ChatOriginEnum            = z.enum(["WHATSAPP", "PLAYGROUND"])
```

Todos com `required_error`/`invalid_type_error` e tipos `T*` exportados, na convenção do arquivo.

### 5.2 `schemas/ai-agents.ts`

```ts
// Tudo com .default() em cada campo E no objeto — padrão parseJsonbWithFallback:
// jsonb persistido com shape antigo continua parseando com defaults novos.

AiAgentModeloConfigSchema = z.object({
  modelo:        z.string().default("openai/gpt-5"),
  temperatura:   z.number().min(0).max(2).optional(),
  maxTokensSaida: z.number().int().positive().optional(),
  topP:          z.number().min(0).max(1).optional(),
}).default({})

AiAgentFerramentaConfigSchema  = z.object({ habilitada: z.boolean().default(false) })
AiAgentFerramentasConfigSchema = z.object({
  "clientes.consultar_compras":          AiAgentFerramentaConfigSchema.optional(),
  "produtos.consultar":                  AiAgentFerramentaConfigSchema.optional(),
  "cashback.consultar":                  AiAgentFerramentaConfigSchema.optional(),
  "cupons.consultar":                    AiAgentFerramentaConfigSchema.optional(),
  "atendimento.transferir_para_humano":  AiAgentFerramentaConfigSchema.optional(),
})

AiAgentCapacidadesSchema = z.object({
  version:     z.literal(1).default(1),
  ferramentas: AiAgentFerramentasConfigSchema.default({}),
  limites: z.object({
    maxChamadasFerramentasPorRun: z.number().int().min(1).max(30).default(15),
    maxRunsDiarios:               z.number().int().min(1).default(500),
  }).default({}),
  atendimento: z.object({
    atrasoRespostaMs: z.number().int().min(0).max(60000).default(5000),
  }).default({}),
}).default({})

AiAgentUsoSchema = z.object({
  tokensEntrada: z.number().optional(),
  tokensSaida:   z.number().optional(),
  tokensTotal:   z.number().optional(),
  modelo:        z.string().optional(),
})

AiAgentConfigSnapshotSchema = z.object({
  instrucoes:   z.string(),
  modeloConfig: AiAgentModeloConfigSchema,
  capacidades:  AiAgentCapacidadesSchema,
  conhecimento: z.array(z.object({ id: z.string(), titulo: z.string() })),
})

AiAgentSchema          // entidade completa (com dataInsercao etc.)
AiAgentKnowledgeSchema // { titulo: max 120, conteudo: max 8000, ativo, ordem } + dataInsercao
// + variantes .omit() para inputs de API (padrão do projeto)
```

---

## 6. Engine — `lib/ai/`

Estrutura de pastas (o diretório `lib/ai/ai-agent/` antigo é deletado ao fim da Fase 5; `lib/ai/ai-media-processing/` **não muda**):

```
lib/ai/
  providers/
    models.ts        # AI_MODEL_ALIASES ("agent-default" → "openai/gpt-5"); normalização de model id
                     # (aceita "gpt-5" → "openai/gpt-5")
    language.ts      # resolveLanguageModel(modeloConfig) → gateway(resolvedId)
    usage.ts         # normalizeAiUsage(totalUsage, modelo) → { tokensEntrada, tokensSaida, tokensTotal, modelo }
  shared/
    errors.ts        # AgentInactiveError, AgentDailyRunLimitError, AgentToolNotEnabledError
                     # (erros tipados com `name` estável — discriminados por name, não instanceof)
    json.ts          # parseJsonbWithFallback(schema, value) — porta de
                     # syncroniza-control/src/lib/ai/shared/json.ts
  tools/
    types.ts         # TAgentToolContext, TAgentToolOutput, TAgentToolDefinition
    define-tool.ts   # defineAgentTool — identity helper p/ inferência de tipos
    guards.ts        # assertToolEnabled(capacidades, name) → AgentToolNotEnabledError
    registry.ts      # AGENT_TOOL_REGISTRY + executeAgentTool + toAISdkTools
    customer-purchases.ts
    products.ts
    cashback.ts
    coupons.ts
    human-handoff.ts
  agent/
    runs.ts          # createAgentRun / markAgentRunRunning / completeAgentRun /
                     # failAgentRun / linkAgentRunMessage
    provisioning.ts  # ensureOrganizationAgent + DEFAULT_AGENT_INSTRUCOES (template com org.nome)
                     # + DEFAULT_AGENT_CAPACIDADES (todas as tools habilitadas)
    knowledge.ts     # getActiveKnowledgeBlocks(agenteId) + formatKnowledgeContext
    context.ts       # buildChatRunContext (snapshot do turno)
    prompts.ts       # buildAgentSystemPrompt (prompt em camadas)
    runtime.ts       # prepareAgentExecution + executeAgentTurn
    respond-to-chat.ts # respondToChatWithAgent (entry-point de alto nível)
    playground.ts    # ensurePlaygroundClient / ensurePlaygroundChat / getPlaygroundState
```

### 6.1 Contrato de tool (`tools/types.ts`)

```ts
export type TAgentToolContext = {
  db: DB | DBTransaction;
  organizacaoId: string;
  agent: { id: string; nome: string };
  run: { id: string; gatilho: TAiAgentRunGatilho };
  chat: { id: string; clienteId: string };
  capacidades: TAiAgentCapacidades;
};

export type TAgentToolOutput = {
  success: boolean;
  message: string;
  result?: unknown;
};

export type TAgentToolDefinition<TInput extends z.ZodTypeAny = z.ZodTypeAny> = {
  name: TAiAgentToolName;
  description: string;           // descrição rica: o modelo decide filtros por ela
  inputSchema: TInput;
  execute: (input: z.infer<TInput>, context: TAgentToolContext) => Promise<TAgentToolOutput>;
};
```

### 6.2 Pipeline de execução (`tools/registry.ts` — a peça central)

Porta de `syncroniza-control/src/lib/ai/tools/registry.ts:171`, sem a camada de aprovação:

```
executeAgentTool(name, rawInput, context):
  1. definition.inputSchema.parse(rawInput)          // valida — ZodError vira tool error p/ o modelo
  2. INSERT aiAgentToolCalls (status EXECUTANDO, input validado, runId, organizacaoId, agenteId)
  3. assertToolEnabled(context.capacidades, name)     // guard em RUNTIME — não confia no toolset filtrado
  4. definition.execute(input, context)
  5. normaliza p/ { success, message, result }
  6. UPDATE tool_call → CONCLUIDO + output + dataExecucao
     catch → UPDATE tool_call → FALHA + erro; re-throw (o SDK devolve o erro ao modelo,
     que pode se recuperar ou tentar outra abordagem)
```

`toAISdkTools(context)`:
- Filtra o registro pelas tools **habilitadas** nas capacidades.
- Traduz nomes: `"produtos.consultar"` → `produtos_consultar` (AI SDK não aceita ponto).
- Entrega o `inputSchema` Zod direto ao SDK (sem conversão manual).
- Fecha sobre o `context` via closure — o contexto nunca transita pelo modelo.

### 6.3 Runtime (`agent/runtime.ts`)

**`prepareAgentExecution({ organizacaoId, chatId, gatilho })`**:
1. Carrega o agente da org; `AgentInactiveError` se ausente/`PAUSADO` (defesa em profundidade — o webhook já checou, mas o runtime revalida).
2. Valida `maxRunsDiarios`: `count(*)` de runs da org no dia (por `dataInsercao`); `AgentDailyRunLimitError` se estourou.
3. Parseia os jsonb com `parseJsonbWithFallback` (config evolutiva nunca quebra runs).
4. Monta `configSnapshot` + `contextoEntradaSnapshot` (via `context.ts`).
5. `createAgentRun` (status `PENDENTE`).

**`executeAgentTurn(prepared)`**:
```ts
const agent = new ToolLoopAgent({
  model: resolveLanguageModel(modeloConfig),
  instructions: buildAgentSystemPrompt({ instrucoes, capacidades, knowledgeContext }),
  tools: toAISdkTools(context),
  temperature: modeloConfig.temperatura,
  maxOutputTokens: modeloConfig.maxTokensSaida,
  topP: modeloConfig.topP,
  stopWhen: stepCountIs(capacidades.limites.maxChamadasFerramentasPorRun),
  output: Output.object({
    schema: z.object({
      mensagem: z.string().nullable(),      // null = decidiu não responder (ex.: transferiu)
      resumoAtendimento: z.string(),
    }),
  }),
});
```
- `markAgentRunRunning` antes de `.generate()`.
- Sucesso → `completeAgentRun({ outputResumo, uso: normalizeAiUsage(result.totalUsage, modelo) })`.
- Erro → `failAgentRun({ erro })` e re-throw. **Sem fallback de texto silencioso**: o erro fica auditável no run e o canal decide não enviar nada (o comportamento atual de responder "Desculpe, estou com dificuldades técnicas..." esconde falhas).

### 6.4 Entry-point (`agent/respond-to-chat.ts`)

Substitui `getAgentResponse` + `handleAIMessageResponse` dos webhooks:

```ts
respondToChatWithAgent({
  organizacaoId, chatId, agent, gatilho,
  deliver,   // (args: { mensagem: string }) => Promise<{ messageId: string | null }>
})
```

1. `prepareAgentExecution` + `executeAgentTurn`.
2. Se `output.mensagem` presente → `deliver({ mensagem })` — o **adapter do canal** envia e persiste a `chatMessage` (`autorTipo: "AI"`, `metadados.aiAgente = { runId, agenteId }`) → `linkAgentRunMessage(runId, messageId)`.
3. `updateChatAttendanceSummary(resumoAtendimento)`.

Adapters de canal:
- **Meta Cloud API**: checa `isWhatsappWindowOpen` (IA nunca envia template), `sendBasicWhatsappMessage`, `persistOutboundNonHubMessage({ origem: "AI" })`.
- **Gateway interno**: `sendInternalGatewayMessage` com `clientMessageId`; mensagem nasce `PENDENTE`, confirmada por webhook `message.sent` (fluxo atual preservado).
- **Playground**: persist-only — insere a mensagem no chat sem envio externo e sem checagem de janela.

### 6.5 Contexto de turno (`agent/context.ts`)

`buildChatRunContext` monta o snapshot que **sempre** acompanha o prompt (decisão de design portada: o modelo não redescobre contexto básico via tools):

- **Cliente**: dados cadastrais completos.
- **Conversa**: últimas 100 mensagens em ordem cronológica, serializadas com autor (`Cliente:` / `Você (AI):` / `Atendente Humano:`), incluindo `conteudoMidiaTextoProcessado`/`Resumo` quando a mensagem é mídia processada.
- **Atendimento**: assignment aberto (status, resumo acumulado, responsável).
- **Bloco tempo**: `{ agora, fusoHorario: "America/Sao_Paulo (BRT, -03:00)", whatsappJanela24h: { valida, expiraEm }, ultimaMensagemDoClienteEm, ultimaMensagemEnviadaEm }` — evita alucinação temporal e deixa o modelo ciente da janela.

### 6.6 System prompt em camadas (`agent/prompts.ts`)

```
1. instrucoes (do banco — persona/tom/regras da organização)
2. Regras operacionais fixas:
   - canal WhatsApp: respostas concisas (3–5 frases), máx. 1 emoji
   - UMA mensagem por turno; mensagem: null quando não deve responder
   - NUNCA inventar dados — o que não vier de ferramenta ou do contexto, não afirmar
   - responder sempre em português brasileiro
3. Regras CONDICIONAIS às tools habilitadas (padrão-chave do syncroniza):
   - has("atendimento.transferir_para_humano") → "Transfira quando o cliente pedir humano,
     demonstrar frustração, ou o assunto exigir decisão comercial..."
   - has("cashback.consultar") → "Para perguntas sobre saldo/pontos, consulte a ferramenta;
     nunca estime valores..."
   - (um agente sem a tool X não recebe instruções sobre X — não dilui o prompt)
4. Lista de ferramentas habilitadas (nome + descrição curta)
5. Base de conhecimento: blocos ativos formatados
   ### <titulo>
   <conteudo>
```

### 6.7 Conhecimento (`agent/knowledge.ts`)

- `getActiveKnowledgeBlocks(agenteId)`: blocos `ativo = true` ordenados por `ordem`.
- `formatKnowledgeContext(blocks)`: concatena `### titulo\nconteudo`.
- Injetado na camada 5 do system prompt. Sem busca — v1 assume volume pequeno (FAQ, políticas, horários). Se o volume crescer, a evolução natural é chunk+embedding por bloco (a tabela já está pronta).

---

## 7. Tools consolidadas

**Filosofia**: poucas tools com filtros ricos validados por Zod — uma abstração "SQL até certo ponto". Em vez de `historico_compras` vs `compras_recentes` (a mesma query com defaults diferentes), uma tool com `dataInicio`/`dataFim`. As 8 tools atuais viram **5**.

### 7.1 Princípios transversais

1. **Ids sempre do contexto**: `organizacaoId`, `clienteId`, `chatId` vêm do `TAgentToolContext` — o modelo **nunca** fornece ids. Isso corrige simultaneamente o furo multi-tenant (`database-tools.ts:231` e todas as demais queries) e a alucinação de ids no `transfer_to_human`.
2. **Datas ISO string** no input: `z.string().datetime()` com `.transform((v) => new Date(v))` — mesmo padrão dos GET params do projeto.
3. **`limite` com teto Zod** (max 50) e **`totalEncontrado`** em toda resposta de lista — o modelo sabe que há mais resultados e **refina o filtro** em vez de paginar às cegas.
4. **`visao` como discriminador de modo** (linhas vs. agregado) — o "GROUP BY" da abstração, mantendo 1 tool por domínio.
5. **Domínio ausente ≠ erro**: org sem programa de cashback → `{ success: false, message: "A organização não possui programa de cashback ativo." }` — o modelo comunica isso ao cliente com naturalidade.

### 7.2 Especificação

#### `clientes.consultar_compras`
Compras do cliente do chat (substitui `get_customer_purchase_history` + `get_customer_recent_purchases` + `get_customer_insights`).

```ts
inputSchema: {
  dataInicio?:  ISO datetime      // compras a partir de
  dataFim?:     ISO datetime      // compras até
  produtoTermo?: string           // só compras contendo produto cujo nome/código casa o termo
  ordem?:       "DATA_DESC" | "DATA_ASC" | "VALOR_DESC"   // default DATA_DESC
  limite?:      int 1..50         // default 10
  visao?:       "LISTA" | "RESUMO"  // default LISTA
}
```

- **LISTA**: vendas com `{ dataVenda, valorTotal, vendedorNome, situacao, itens: [{ produto: {nome, codigo, grupo}, quantidade, valorUnitario, valorTotal }] }`. Filtro `produtoTermo` via join `saleItems`→`products`.
- **RESUMO**: agregados **sobre os mesmos filtros**: `{ totalCompras, valorTotalGasto, ticketMedio, primeiraCompra, ultimaCompra, gruposFavoritos (top 5), produtosMaisComprados (top 10), analiseRFM }`.
- Todas as queries: `and(eq(sales.clienteId, ctx.chat.clienteId), eq(sales.organizacaoId, ctx.organizacaoId), ...filtros)`.

#### `produtos.consultar`
Catálogo da organização (substitui `search_products` + `get_products_by_group` + `get_product_by_code` + `get_available_product_groups`).

```ts
inputSchema: {
  termo?:       string            // casa codigo EXATO ou ilike(nome)
  grupo?:       string
  precoMin?:    number
  precoMax?:    number
  apenasAtivos?: boolean          // default true
  limite?:      int 1..50         // default 10
  visao?:       "LISTA" | "GRUPOS"  // default LISTA
}
```

- **LISTA**: `{ nome, codigo, grupo, precoVenda, unidade, variantes: [{ nome, precoVenda }] (ativas) }`.
- **GRUPOS**: `selectDistinct` de grupos com contagem de produtos, **respeitando os demais filtros** — cobre o descobrimento de categorias.
- Todas as queries filtram `eq(products.organizacaoId, ctx.organizacaoId)`.

#### `cashback.consultar`
Nova. Programa de cashback da org + posição do cliente.

```ts
inputSchema: {
  visao?:      "SALDO" | "EXTRATO" | "RECOMPENSAS"   // default SALDO
  dataInicio?: ISO datetime     // EXTRATO
  dataFim?:    ISO datetime     // EXTRATO
  limite?:     int 1..50        // EXTRATO, default 10
}
```

- Resolve o programa ativo da org (`cashbackPrograms.ativo = true`); ausente → `success: false` + mensagem.
- **SALDO**: regras do programa (percentual de acúmulo `acumuloValor`, valor mínimo `acumuloRegraValorMinimo`, validade `expiracaoRegraValidadeValor`, limite de resgate `resgateLimiteValor`) + saldo do cliente (`cashbackProgramBalances`: `saldoValorDisponivel`, `saldoValorAcumuladoTotal`, `saldoValorResgatadoTotal`). Cliente sem balance = saldo zero (não erro).
- **EXTRATO**: `cashbackProgramTransactions` do cliente, filtradas por data, com tipo/valor/saldo posterior.
- **RECOMPENSAS**: `cashbackProgramPrizes` ativas (se `modalidadeRecompensasPermitida`), com valor em "moeda" cashback.

#### `cupons.consultar`
Nova. Cupons do cliente e da organização.

```ts
inputSchema: {
  visao?:  "DISPONIVEIS" | "RESGATES"   // default DISPONIVEIS
  codigo?: string                        // validar um cupom específico
  limite?: int 1..50                     // default 10
}
```

- **DISPONIVEIS**: união de (a) `couponGrants` do cliente com `quantidadeDisponivel > 0` e não expirados (respeitando `expiracaoData` do grant, que sobrepõe a vigência do cupom) e (b) cupons globais `ativo = true` dentro de `vigenciaInicio`/`vigenciaFim`. Retorna `{ codigo, beneficio (descrição legível do tipo/valor/teto), condicoes: { valorMinimoVenda, quantidadeMinimaItens }, validade, origem: "ATRIBUIDO" | "GLOBAL" }`.
- **RESGATES**: `couponRedemptions` do cliente (histórico).
- Filtro `codigo` restringe qualquer visão a um cupom específico ("esse cupom X vale?").

#### `atendimento.transferir_para_humano`
Mantida como tool (efeito colateral no meio do loop).

```ts
inputSchema: {
  motivo:         string
  resumoConversa: string
}
```

- `chatId` e `clienteId` **do contexto** (nunca do modelo).
- Porta `transferServiceToHuman` (`lib/ai/ai-agent/transfer-service-to-human.ts`): busca membros com `permissoes.atendimentos.receberTransferencias`, sorteia um, grava resumo, `transferChatAttendance` com motivo `HUMAN_HANDOFF: ...`, notifica via template WhatsApp `SERVICE_TRANSFER_NOTIFICATIONS`.
- **Modo playground** (`ctx.run.gatilho === "PLAYGROUND"`): não transfere nem notifica; retorna `{ success: true, message: "Transferência simulada (playground)." }`.

---

## 8. Integração com canais

### 8.1 Fluxo atual (mantido na espinha, trocado no miolo)

```
webhook POST (Meta app/api/integrations/whatsapp/route.ts | gateway .../gateway/route.ts)
  → resolve connectionPhone → conexão → organização
  → Gate 1: organizacao.configuracao.recursos.hubAtendimentos.acesso
  → upsert cliente + resolveIncomingChat
  → mídia? → download → Supabase Storage → ai-media-processing (inalterado)
  → persistIncomingClientMessage (denormalizações, janela 24h, markChatNeedsResponse)
  → Gate 2: connectionPhone.permitirAtendimentoIa
  ┌─────────────────────── NOVO A PARTIR DAQUI ───────────────────────┐
  → Gate 3: organizacao.configuracao.recursos.iaAtendimento.acesso     (config já carregada — custo zero)
  → agent = ensureOrganizationAgent(db, organizacaoId)                 (lazy provisioning)
  → agent.status !== "ATIVO" → return (log)
  → claimChatForAi({ organizacaoId, chatId, agenteId: agent.id })      (CAS existente; agora grava o id)
  → waitAndConfirmAiResponse({ delayMs: capacidades.atendimento.atrasoRespostaMs })
      (debounce existente; delay agora configurável por agente)
  → respondToChatWithAgent({ ..., gatilho: "CHAT_MENSAGEM", deliver: <adapter do canal> })
  └───────────────────────────────────────────────────────────────────┘
```

### 8.2 Mudanças em `lib/chats/ai-trigger.ts`

- `claimChatForAi` ganha `agenteId: string` e repassa para `claimChatAttendanceForAgent` (que **já aceita** — `attendance-state.ts:264-266`; nada muda em `attendance-state.ts`).
- `waitAndConfirmAiResponse` recebe `delayMs` do chamador; `AI_RESPONSE_DELAY_MS` vira apenas default.
- Toda a lógica de revalidação pós-sleep (última msg ainda é do cliente? alguém respondeu? atendimento ainda é `AGENTE`?) permanece intacta.

### 8.3 O que é substituído nos webhooks

- `handleAIMessageResponse` + `createAIMessage` (Meta: linhas ~695-836; gateway: ~614+) → `respondToChatWithAgent` com o adapter de cada canal (§6.4).
- O branch morto de `metadata.escalation` sai junto.

### 8.4 Núcleo antigo deletado (ao fim da Fase 5)

`lib/ai/ai-agent/{index.ts, prompts.ts, tools.ts, database-tools.ts, transfer-service-to-human.ts, README.md}`.

---

## 9. API (padrão do projeto: 4 partes, `appApiHandler`, `getCurrentSessionUncached`)

Permissões: leitura `empresa.visualizar`, escrita `empresa.editar`. Recurso gateado por `recursos.iaAtendimento.acesso` (403 com mensagem de upsell).

| Rota | Métodos | Contrato |
|---|---|---|
| `app/api/ai-agents/route.ts` | GET, PUT | **GET**: `ensureOrganizationAgent` (auto-provisiona no primeiro acesso) → `{ data: { agente, conhecimento[] }, message }`. **PUT**: payload aninhado `{ agente: { nome, status, instrucoes, modeloConfig, capacidades }, conhecimento: [{ id?, titulo, conteudo, ativo, ordem, deletar? }] }` com `handleSimpleChildRowsProcessing` em transação (padrão de child rows do projeto) |
| `app/api/ai-agents/runs/route.ts` | GET | Multi-mode: `?id=` → `{ byId: run + toolCalls (ordenadas por dataInsercao) + mensagemEnviada }`; default → `{ default: { runs, pagination } }` com filtros `gatilho`, `status`, `page` |
| `app/api/ai-agents/playground/route.ts` | POST, GET | **POST**: cria/reseta chat playground — `ensurePlaygroundClient` (cliente "Cliente de Teste (Playground)" por org), chat com `origem: "PLAYGROUND"` e claim imediato para o agente. **GET**: `{ mensagens, atendimento, execucaoAtiva, ultimaExecucao }` |
| `app/api/ai-agents/playground/messages/route.ts` | POST | Persiste mensagem `autorTipo: "CLIENTE"` (insert + denormalização do chat + `markChatNeedsResponse`), roda `respondToChatWithAgent` **síncrono, sem debounce**, `gatilho: "PLAYGROUND"`, `deliver` persist-only. Retorna `{ runId }`. `export const maxDuration` alto (run pode passar de 30s) |

**Filtro do hub**: excluir `origem = "PLAYGROUND"` na listagem de chats (`app/api/chats/route.ts` + `lib/chats/chat-list-preview.ts`).

**Rota extra — toggle de IA por telefone**: `PATCH` em `app/api/whatsapp-connections/route.ts` com `{ phoneId, permitirAtendimentoIa }`, permissão `integracoes.gerenciar`, validando que o phone pertence à org da sessão. (Hoje `permitir_atendimento_ia` só é editável direto no banco.)

### 9.1 Client-side

- `lib/queries/ai-agents.ts`: `useOrganizationAiAgent`, `useAiAgentRuns` (params/updateParams/debouncedParams), `useAiAgentRunById`, `usePlaygroundState` (com `refetchInterval` ~1500ms enquanto `execucaoAtiva`). Query keys expostas junto dos hooks (convenção).
- `lib/mutations/ai-agents.ts`: `updateAiAgent`, `createPlaygroundChat`, `sendPlaygroundMessage` — wrappers Axios puros, tipados pelos outputs das rotas.
- `lib/mutations/whatsapp-connections.ts`: `updateConnectionPhoneAiService`.
- `state-hooks/use-internal-ai-agent-state.tsx`: schema Zod do estado (`agente` + `conhecimento[]` com `id`/`deletar`), `updateAgent`, `updateModeloConfig`, `updateCapacidades`, `addKnowledgeBlock`, `updateKnowledgeBlock`, `removeKnowledgeBlock` (soft-delete: com `id` marca `deletar: true`, sem `id` filtra), `redefineState`, `resetState` — tudo em `useCallback`, padrão do projeto.

---

## 10. UI

### 10.1 Localização

Nova view em **Configurações** (`app/dashboard/settings/settings-page.tsx` já usa `useQueryState("view", parseAsStringEnum([...]))`): adicionar `"ai-agent"` ao enum + botão "AGENTE DE IA" (ícone `Bot`), visível quando `membership.organizacao.configuracao.recursos.iaAtendimento.acesso` (senão, bloco de upsell). Justificativa: `/dashboard/settings` é acessível em todos os planos — evita mexer em `AppRoutes`/mapas de rota por plano.

### 10.2 Componentes

```
components/Settings/SettingsAiAgent.tsx        # container com sub-tabs: Configuração | Execuções | Playground
components/Settings/AiAgent/
  AgentConfigForm.tsx                          # useInternalAiAgentState + mutation updateAiAgent
  Blocks/GeneralBlock.tsx                      # nome, switch ATIVO/PAUSADO, modelo (select de aliases),
                                               # slider temperatura
  Blocks/InstructionsBlock.tsx                 # textarea de instrucoes (persona/regras da org)
  Blocks/ToolsBlock.tsx                        # switch por ferramenta + limites
                                               # (maxChamadasFerramentasPorRun, maxRunsDiarios, atrasoRespostaMs)
  Blocks/KnowledgeBlock.tsx                    # blocos de conhecimento: titulo, toggle ativo,
                                               # editar/remover/adicionar, reordenar
  AgentRunsList.tsx                            # tabela paginada (data, gatilho, status, tokens, chat) → drawer
  AgentRunDrawer.tsx                           # status, erro (com dica acionável), uso (tokens),
                                               # configSnapshot, timeline de tool calls com input/output
                                               # JSON colapsável, mensagem enviada, link p/ chat no hub
  AgentPlayground.tsx                          # bolhas CLIENTE/AI, input, indicador "digitando"
                                               # (execucaoAtiva), botão "Novo chat de teste",
                                               # link do run gerado → drawer
```

Formulário direto na view (registro singleton — o padrão `New*`/`Control*` de modais não se aplica); agrupamento visual com `ResponsiveMenuSection`.

### 10.3 UI de reflexo no hub (já existente, sem mudanças estruturais)

Aba "IA" (`ChatSidebar.tsx`), "ASSUMIR DA IA" (`ChatAssignmentActions.tsx`), badges de autor AI (`ChatMessageBubble.tsx`) continuam funcionando — agora com `responsavelAgenteId` preenchido.

---

## 11. Fases de execução

Cada fase termina com `npx tsc --noEmit` + `npm run build` limpos e o app funcional.

### Fase 1 — Exclusão: AI Hints + marketing + código morto

**AI Hints:**

| Alvo | Ação |
|---|---|
| `services/drizzle/schema/ai-hints.ts` | Deletar |
| `services/drizzle/schema/index.ts:26` | Remover `export * from "./ai-hints"` |
| `schemas/ai-hints.ts` | Deletar |
| `lib/ai/ai-hints/` (service, approval, generate-hints) | Deletar diretório |
| `lib/queries/ai-hints.ts`, `lib/mutations/ai-hints.ts` | Deletar |
| `app/api/ai-hints/` (route + approve/dismiss/feedback/generate/check-avaliable-usage) | Deletar diretório |
| `app/api/cron/run-ai-hints/route.ts` | Deletar |
| `vercel.json:35-38` | Remover entrada do cron |
| `components/AIHints/` (9 arquivos), `components/Modals/AiHints/`, `app/dashboard/ai-hints/` | Deletar |
| `app/dashboard/layout.tsx:42`, `components/Layouts/HeaderApp.tsx:5,41` | Remover imports/JSX comentados |
| `config/index.ts` | Remover `HINTS_AMMOUNT_VALIDATION_THRESHOLD` (linha 7), `iaDicas` dos defaults e dos 3 planos, bullets "Dicas de IA" em `pricingTableFeatures` |
| `schemas/organizations.ts:167-172` | Remover `iaDicas` |
| `components/Modals/Organizations/Blocks/Resources.tsx:109-113` | Remover toggle `iaDicas` |
| `lib/organizations/deletion.ts:6-7,143-145,251` | Remover imports/deletes de hints |

Nota: `OrganizationConfigurationSchema` não é `.strict()` — configs jsonb persistidas com `iaDicas` continuam parseando (Zod descarta chaves desconhecidas). Sem backfill.

**Marketing:**

| Alvo | Ação |
|---|---|
| `lib/ai/ai-agent/marketing/` (9 arquivos, ~1.700 linhas) | Deletar diretório |
| `app/api/admin/marketing-context/route.ts` | Deletar |
| `app/(admin)/admin-dashboard/components/AdminMarketingContextExportMenu.tsx` | Deletar |
| `app/(admin)/admin-dashboard/components/AdminOrganizationRow.tsx:19,192` | Remover import, render e state do modal |
| `lib/mutations/admin.ts:10,39-41` | Remover `exportMarketingContext` |
| `scripts/run-marketing-agent.ts`, `scripts/test-marketing-agent.ts` | Deletar |
| `package.json:41` | Remover script `marketing-agent:run` |

**Código morto:** `app/api/integrations/ai/generate-response/route.ts` (+ diretório se vazio). O núcleo antigo do agente fica até a Fase 5 (webhooks ainda o usam).

**Banco:** `npm run db:push` → diff deve conter **apenas** `DROP TABLE ampmais_ai_hint_feedback` e `DROP TABLE ampmais_ai_hints`. Revisar linha a linha; qualquer outro data-loss = abortar (regra do projeto — journal de migrations está stale, o diff do push é a única rede).

**Verificação:** typecheck + build limpos; `grep -r "ai-hints|aiHints|iaDicas"` sem hits em `app/ lib/ components/ schemas/ config/`; dashboard e hub abrem.

### Fase 2 — Schema novo + validators

1. Enums em `schemas/enums.ts` (§5.1).
2. `schemas/ai-agents.ts` (§5.2).
3. `services/drizzle/schema/ai-agents.ts` (§4.1–4.4) + barrel export.
4. `chats.origem` + comentário `responsavelAgenteId` + `ChatMessageMetadataSchema.aiAgente` (§4.5).
5. `lib/organizations/deletion.ts` — 4 tabelas novas na ordem.
6. `npm run db:push` → diff esperado: 4 CREATE TABLE + índice único + coluna `origem` (additive com default — sem data loss). Revisar.

### Fase 3 — Engine

Criar `lib/ai/{providers,shared,tools,agent}/` conforme §6 (sem as 5 tools ainda — só contrato/registry/guards vazios de entradas). Sem consumidores; app inalterado.

### Fase 4 — Tools consolidadas

Implementar as 5 tools (§7.2), um arquivo por tool, portando as queries de `lib/ai/ai-agent/database-tools.ts` **com filtro de `organizacaoId` em todas** e registrando no `AGENT_TOOL_REGISTRY`. Auditar cada query portada contra o furo multi-tenant.

### Fase 5 — Integração nos webhooks + gates

1. `lib/chats/ai-trigger.ts` (§8.2).
2. Webhook Meta (§8.1/8.3).
3. Webhook gateway interno (mesmas mudanças, adapter próprio).
4. Deletar núcleo antigo (§8.4).

**Verificação:** grep `getAgentResponse|ENHANCED_SYSTEM_PROMPT|agentTools` → zero. Smoke real via gateway interno: mensagem de teste → no banco: run `CONCLUIDO`, tool_calls populadas, `mensagem_enviada_id` e `responsavel_agente_id` preenchidos. (Webhook Meta exige assinatura — smoke via gateway + playground cobre o pipeline.)

### Fase 6 — API + client-side

Rotas, queries, mutations e state hook conforme §9. Filtro `PLAYGROUND` no hub.

**Verificação:** GET auto-provisiona e retorna agente; PUT altera instruções; POST playground/messages devolve `runId` e o run aparece `CONCLUIDO` no GET de runs.

### Fase 7 — UI

Componentes conforme §10 + toggle `permitirAtendimentoIa` no modal de conexão.

**Verificação (fluxo manual completo):** ativar `iaAtendimento` na org (modal admin Resources) → Configurações → "AGENTE DE IA" (agente auto-provisionado) → editar instruções + bloco de conhecimento → Playground:
- "vocês têm disjuntor?" → usa `produtos.consultar` com produtos **da org** (conferir tool call no drawer);
- "quanto tenho de cashback?" → usa `cashback.consultar`;
- "tenho algum cupom?" → usa `cupons.consultar`;
- "quero falar com um humano" → transferência simulada;
- lista de execuções mostra os runs `PLAYGROUND` com timeline/tokens; hub **não** exibe o chat de teste; toggle `permitirAtendimentoIa` persiste.

### Fase 8 — Limpeza final + E2E

1. Greps de exaustão: `ai-hints|aiHints|iaDicas|HINTS_AMMOUNT|getAgentResponse|runMarketingAgent|marketing-context|generate-response` → zero em `app/ lib/ components/ schemas/ services/ config/ scripts/`.
2. Docs históricos que citam o modelo antigo (`docs/ai-sdk-v6-migration-plan.md`, `docs/dev-planning/chat-attendance-redesign-plan.md`) — anotar como históricos (baixa prioridade).
3. Remover `console.log` de dump no caminho novo (a auditoria vive em runs/tool_calls).
4. `npm run build` final + `db:push` sem diff pendente.
5. E2E real via WhatsApp de teste:
   - mensagem → IA responde;
   - humano assume → IA recua (claim CAS falha);
   - `iaAtendimento.acesso = false` → IA silencia;
   - agente `PAUSADO` → IA silencia;
   - erro forçado (modelo inválido na config) → run `FALHA` visível no drawer, **nenhuma** mensagem enviada.

---

## 12. Riscos e pontos de atenção

| Risco | Mitigação |
|---|---|
| `db:push` com journal stale (Fases 1 e 2) | Revisar o diff linha a linha nas duas execuções; abortar em qualquer data-loss não previsto |
| Import circular no schema | Direção única `ai-agents.ts → chats.ts`; `responsavelAgenteId` sem FK (documentado em comentário) |
| Debounce configurável vs. timeout serverless | `atrasoRespostaMs` limitado a 60s no Zod; o sleep de 5s atual já convive com o runtime dos webhooks |
| Playground síncrono >30s | `export const maxDuration` adequado na rota de messages |
| Orgs ao vivo na virada (Fase 5) | O primeiro webhook pós-deploy provisiona o agente com template neutro — substitui o prompt "Ampère Mais" hardcoded. **Ação operacional**: preencher as instruções personalizadas na nova tela para a(s) org(s) que já usam IA, idealmente logo após o deploy |
| Tool nova em org com config antiga | `parseJsonbWithFallback` + defaults em todos os campos das capacidades: configs persistidas antes de uma tool nova existir seguem parseando (tool nova nasce `habilitada: false`) |

---

## 13. Fora de escopo (evoluções futuras naturais)

- **RAG**: chunk + embedding por bloco de `ai_agent_knowledge` (pgvector no Supabase), com `ragConfig` no agente — o modelo do syncroniza (`retrieve-knowledge.ts`, ~80 linhas) é praticamente copy-paste quando chegar a hora.
- **Metering de créditos**: consumir `iaAtendimento.limiteCreditos` a partir de `ai_agent_runs.uso` (tabela já viabiliza).
- **Custo em R$**: `uso` guarda tokens + modelo; tabela de preços por modelo transforma em custo.
- **Deals/negociações** como domínio de tool (`deals.consultar`).
- **Multi-agente por org** (roteamento por conexão/segmento) — o schema comporta removendo o `uniqueIndex`.
- **Aprovações HITL** — necessárias apenas quando surgirem tools de mutação sensível (ex.: aplicar desconto, criar pedido).
