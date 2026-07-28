# Chat Attendance Redesign — Plano de Implementação

> **Status**: aprovado, aguardando implementação
> **Origem da modelagem**: módulo de chatting do `syncroniza-control` (referido aqui como **Control**), aperfeiçoado e testado em produção com fluxos de atendimento transferível, claim concorrente e handoff de IA.
> **Escopo desta iniciativa**: modelagem + camada de estado + rotas + webhooks + UI/UX do hub + realtime. **Fora de escopo**: port das tabelas de AI Agents do Control (`ai_agents`, `ai_agent_runs`, `ai_agent_tool_calls`, etc.) — ver [Decisões](#3-decisões-fechadas).
> **Como ler este documento**: as seções 1–3 são contexto e contrato; 4–6 são a modelagem e o DDL executável; 7–12 são as fases de implementação, cada uma com assinaturas e contratos concretos; 13–17 são permissões, riscos, validação, rollback e ordem de commits. Cada bloco de código aqui é a forma-alvo — o que estiver marcado `// …` é elisão de trecho mecânico, não de decisão.

---

## Índice

1. [Motivação](#1-motivação)
2. [Referência — arquivos-chave no Control](#2-referência--arquivos-chave-no-control)
3. [Decisões fechadas](#3-decisões-fechadas)
4. [Modelagem alvo](#4-modelagem-alvo)
5. [Enums e schemas Zod](#5-enums-e-schemas-zod)
6. [Migrations](#6-migrations)
7. [Fase 1 — Schema Drizzle + SQL](#fase-1--schema-drizzle--sql-00520053)
8. [Fase 2 — Camada canônica de estado](#fase-2--camada-canônica-de-estado-libchatsattendance-statets)
9. [Fase 3 — Rotas de API](#fase-3--rotas-de-api)
10. [Fase 4 — Webhooks e IA](#fase-4--webhooks-e-ia)
11. [Fase 5 — UI/UX](#fase-5--uiux-port-do-hub)
12. [Fase 6 — Realtime](#fase-6--realtime-supabase-postgres_changes)
13. [Permissões](#13-permissões)
14. [Pontos de integração fora do módulo](#14-pontos-de-integração-fora-do-módulo)
15. [Riscos e mitigações](#15-riscos-e-mitigações)
16. [Plano de validação](#16-plano-de-validação)
17. [Rollback](#17-rollback)
18. [Ordem de commits](#18-ordem-de-commits)

---

## 1. Motivação

O módulo atual de chats do recompracrm tem uma modelagem degenerada em torno da `ampmais_chat_services`. As evidências, com localização no código:

| Sintoma | Evidência |
| --- | --- |
| O "serviço" nasce com descrição de placeholder | `app/api/chats/route.ts:213` e `app/api/chats/messages/route.ts:218` inserem `descricao: "NÃO ESPECIFICADO"` |
| O serviço **nunca é concluído** | `ServiceConclusionDialog` chama `PATCH /api/chats/services/{serviceId}`, rota que **não existe** (404). Não há nenhuma escrita de `status = 'CONCLUIDO'` nem de `data_fim` em todo o repositório |
| Cada chat tem no máximo 1 serviço vivo para sempre | Todas as leituras usam `findFirst(status IN ('PENDENTE','EM_ANDAMENTO'))` — `app/api/chats/[chatId]/route.ts:42`, `app/api/chats/messages/route.ts:193`, `app/api/integrations/whatsapp/route.ts:~505`. Na prática a tabela é uma coluna 1:1 de `chats` travestida de histórico |
| Sem garantia de unicidade de atendimento ativo | Nenhum índice único; o webhook faz find-then-insert sem `onConflict` |
| Troca de dono implícita e silenciosa | `app/api/chats/messages/route.ts:199-207` reatribui o serviço ao usuário atual em **todo** envio, sem checagem de posse |
| **Zero índices** nas três tabelas | Nenhum `index(...)` em `services/drizzle/schema/chats.ts` e nenhum `CREATE INDEX` sobre `ampmais_chat*` em `drizzle/*.sql`. Inclui as colunas de paginação por cursor (`chat_id, data_envio, id`) e o lookup `whatsapp_message_id` do webhook de status — hoje um seq scan sobre todas as mensagens da plataforma |
| Sem UNIQUE na chave natural do chat | `(organizacao_id, cliente_id, whatsapp_telefone_id)` é tratada como chave em 4 pontos (`app/api/chats/route.ts:177`, webhooks Meta e Gateway, `smb-message-history-sync.ts`) sem constraint — risco real de chat duplicado sob concorrência de webhooks |
| Dois status de mensagem concorrentes | `status` (`ENVIADO/RECEBIDO/LIDO/CANCELADO`) e `whatsapp_message_status` (`PENDENTE/ENVIADO/ENTREGUE/LIDO/FALHOU`) coexistem; a UI lê um, o webhook escreve o outro |
| Fluxo de envio partido em duas rotas | `POST /api/chats/messages` persiste e devolve `requiresWhatsappSend: true`; o cliente então chama `POST /api/chats/messages/send-whatsapp`. Se o segundo request falhar, a mensagem fica órfã em `PENDENTE` para sempre |
| Permissões não aplicadas | `components/Chats/ChatsMain.tsx:22` passa `userHasMessageSendingPermission={true}` **hardcoded**; `membership.permissoes.atendimentos` nunca é lido no módulo |
| Código morto | `useChatSummary` (`lib/queries/chats.ts:121`) chama `/api/chats/{id}/summary`, rota inexistente; `lib/queries/chats.ts:67` tem um `console.log("[TESTING] …")` de debug; `app/api/chats/messages/[messageId]/route.ts` existe mas lê o id fora do path |

A modelagem do Control resolve tudo isso com a `chat_assignments`: um "ticket" de atendimento com ciclo de vida real, responsável tipado, métricas de resposta/resolução e um índice único parcial que garante **um único atendimento ativo por chat**.

---

## 2. Referência — arquivos-chave no Control

Base local nesta máquina: `/home/user/syncroniza-control` (no ambiente do dev: `C:\Users\decsa\Projetos\syncroniza-control`).

| Área | Path (Control) | Linhas |
| --- | --- | --- |
| Schema (chats, assignments, messages) | `src/server/db/schema/chats.ts` | 257 |
| Enums pg | `src/server/db/schema/enums.ts` | — |
| Validators/enums de aplicação | `src/lib/validators/chats.ts` (257), `src/lib/validators/enums.ts:336-351` | — |
| **Camada canônica de estado** | `src/server/chats/attendance-state.ts` | 378 |
| Rotas tRPC | `src/server/api/routers/chat/{chat.procedure,chat.input,chat.service}.ts` | 48 / 92 / 713 |
| Inbound WhatsApp | `src/lib/chats/incoming-whatsapp.ts` | 390 |
| Claim/trigger da IA | `src/lib/ai/agents/chat-trigger.ts` (286), `src/lib/ai/agents/routing.ts` (81) | — |
| Handoff IA → humano | `src/lib/ai/tools/chats.transferir-para-humano.ts` | 57 |
| Cron de janela 24h | `src/app/api/crons/invalidate-chat-windows/route.ts` | 27 |
| UI — shell/hub | `src/app/(main)/dashboard/chats/{page,chats-page}.tsx`, `src/components/chats/ChatHub.tsx` | 101 |
| UI — inbox | `src/components/chats/ChatSidebar.tsx` (372), `ChatInboxListItem.tsx` (155) | — |
| UI — thread | `src/components/chats/ChatThread.tsx` | 906 |
| UI — bolha | `src/components/chats/ChatMessageBubble.tsx` | 286 |
| UI — input | `src/components/chats/ChatInputArea.tsx` | 236 |
| UI — painel de contexto | `src/components/chats/ChatContextPanel.tsx` | 672 |
| UI — ações de atribuição | `src/components/chats/ChatAssignmentActions.tsx` | 191 |
| UI — utilitários | `ChatAudioPlayer` (221), `WhatsAppMessageText` (212), `MediaAiContextDisclosure` (45), `lib/chats/{chat-list-preview(74),media-ai-context(63),whatsapp-window-status(30)}.ts` | — |

### 2.1 Mapa de conceitos Control → recompracrm

Esta tabela é o dicionário de tradução para todo o port. Onde ela diverge, o Control **não** deve ser copiado literalmente.

| Control | recompracrm | Observação |
| --- | --- | --- |
| `parceiroId` / `partners` | `organizacaoId` / `organizations` | Chave de tenancy em todas as assinaturas |
| `partnerIntegrations` / `integracaoId` | `whatsappConnections` + `whatsappConnectionPhones` | Aqui o "número" é `whatsappConexaoTelefoneId`; a conexão carrega `tipoConexao` (`META_CLOUD_API` \| `INTERNAL_GATEWAY`) |
| `canal` (`WHATSAPP`/`INSTAGRAM`/`PLAYGROUND`) | — | Não existe aqui; o hub é WhatsApp-only. **Não portar** o filtro `ne(canal, "PLAYGROUND")` |
| `aiAgents` / `responsavelAgenteId` FK | `responsavelAgenteId` varchar **sem FK** | Ver [Decisões](#3-decisões-fechadas) |
| tRPC `api.chats.*` | App Router `app/api/chats/**/route.ts` + React Query/Axios | Convenção obrigatória do `CLAUDE.md` |
| `ctx.user.permissoes` + `validateUserPermissionAccess` | `session.membership.permissoes.atendimentos` | Ver [Permissões](#13-permissões) |
| `users.avatar` | `users.avatarUrl` | Nome de campo diferente |
| `clients.telefonePrimario` | `clients.telefone` | |
| `AttendanceResponseSource: "INTERNAL_WHATSAPP"` | `"INTERNAL_GATEWAY"` | Alinhado ao nome do provider daqui |
| `dataEnvio` nullable | `dataEnvio` **NOT NULL** | Aqui não é preciso o `isNotNull(dataEnvio)` do cursor |
| `mensagensNaoLidas` nullable | **NOT NULL default 0** | Sem `?? 0` defensivo |
| tabelas sem prefixo (`chats`) | prefixo `ampmais_` via `newTable` | **Crítico para os filtros de realtime** |

### 2.2 Defeitos conhecidos do Control que NÃO devemos portar

1. `listChats` (`chat.service.ts:196-210`) carrega **todos** os chats do parceiro e filtra a view **em memória**, sem limit nem paginação → aqui a view entra no `WHERE` do SQL com paginação por cursor.
2. Ternário morto em `markChatNeedsResponse` (`attendance-state.ts:89-90`): ambos os ramos resolvem `"ABERTO"`.
3. `onRetry` nunca é passado ao `ChatMessageBubble` → o botão "Tentar novamente" é invisível na prática. Conectar aqui.
4. Envio de template não existe no hub: fora da janela de 24h o Control lança `PRECONDITION_FAILED` ("Mensagens de template nao sao suportadas no momento", `chat.service.ts:360-363`) e o humano fica sem saída. Aqui o hub deve permitir enviar template aprovado direto — o recompracrm já tem `ampmais_message_templates` e `sendTemplateWhatsappMessage`.
5. Labels de status de run divergem entre `ChatThread` e `ChatContextPanel` (irrelevante aqui, sem runs, mas fica o alerta de consistência de labels).
6. `assignChatAttendance` faz read-then-update sem CAS — dois usuários podem assumir "ao mesmo tempo" e o segundo sobrescreve o primeiro. O Control mitiga com um pré-check + `try/catch` (`chat.service.ts:514-531`), o que é uma corrida com janela menor, não eliminada. **Aqui o `assumir` também usa compare-and-set** (ver [Fase 2](#28-assumechatattendanceforuser--melhoria-sobre-o-control)).

---

## 3. Decisões fechadas

| Decisão | Escolha |
| --- | --- |
| AI Agents (tabelas `ai_agents` + runs/tools do Control) | **Não portar por enquanto.** `responsavel_agente_id` entra na `chat_assignments` como `varchar(255)` **nullable e SEM FK**; `responsavelTipo = 'AGENTE'` com id nulo significa "a IA da organização". A flag que habilita a IA é **`ampmais_whatsapp_connection_phones.permitir_atendimento_ia`** (por número, `services/drizzle/schema/whatsapp-connections.ts:68`) — **não** uma config de organização. O port completo de agentes vira iniciativa futura sem retrabalho: basta adicionar a FK. |
| Enums do assignment (status, tipo de responsável, prioridade) | `varchar` com `$type<...>` + validação Zod (padrão do Control), **desvio consciente** da convenção pgEnum do `CLAUDE.md` — `ALTER TYPE` em migrations manuais é doloroso e o formato varchar já foi provado lá. Enums de mensagem/conteúdo continuam pgEnum (já existem). Registrar o desvio como comentário no topo de `services/drizzle/schema/chats.ts`. |
| Status unificado de mensagem | Nova coluna **`status_entrega`** (`chat_message_delivery_status`), campo Drizzle `statusEntrega`. **Não** é um swap sobre a coluna `status`. Justificativa em [§6.1](#61-por-que-status_entrega-e-não-um-swap-de-status). |
| Migration | **Dividida**: `0052` aditiva + backfill (app velho continua funcionando) e `0053` destrutiva (drops), aplicada só após o deploy do código novo. Zero downtime ao custo de um segundo apply manual. |
| Aplicação de DDL | **O desenvolvedor aplica manualmente** via `npx tsx ./scripts/apply-sql-migration.ts drizzle/00XX_*.sql`. Claude escreve o SQL, não aplica. `drizzle-kit push/generate` não são usados (travam em prompt de drift; journal abandonado desde a 0019). |
| Numeração | **`0052`** e **`0053`**. ⚠️ Correção sobre a versão anterior deste plano, que dizia "0047": a sequência avançou (`drizzle/` já vai até `0051_desktop_agent_versions.sql`). A sequência pula 0042–0044 e tem duplicatas históricas — não reaproveitar buracos. |
| `CREATE INDEX CONCURRENTLY` | **Indisponível** pelo caminho padrão: `scripts/apply-sql-migration.ts:19-21` envolve o arquivo inteiro em `connection.begin(...)`, e `CONCURRENTLY` não roda dentro de transação. Se o volume exigir, aplicar os índices por um arquivo separado executado fora do script (`psql -f`). Ver [§6.4](#64-índices-e-concurrently). |
| Painel de contexto | 3 abas, com a aba "Cliente" substituindo a aba "Vínculos" do Control (oportunidades/kanban não existem aqui) pelo contexto de cliente do recompracrm (RFM, cashback, últimas compras, ticket médio), reusando `GET /api/clients/context` (`app/api/clients/context/route.ts`) no espírito de `ClientContextContent`. |
| Envio unificado | `POST /api/chats/messages` passa a **persistir e enviar** na mesma requisição. As rotas `messages/send-whatsapp` e `messages/[messageId]` são removidas. |

---

## 4. Modelagem alvo

Arquivo: `services/drizzle/schema/chats.ts` (reescrito). Prefixo `ampmais_` via `newTable` de `./common.ts`.

### 4.1 `ampmais_chat_assignments` (NOVA — substitui `ampmais_chat_services`)

```typescript
export const chatAssignments = newTable(
	"chat_assignments",
	{
		id: varchar("id", { length: 255 })
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		organizacaoId: varchar("organizacao_id", { length: 255 })
			.references(() => organizations.id, { onDelete: "cascade" })
			.notNull(),
		chatId: varchar("chat_id", { length: 255 })
			.references(() => chats.id, { onDelete: "cascade" })
			.notNull(),
		responsavelTipo: varchar("responsavel_tipo", { length: 32 }).$type<TChatAssignmentResponsibleType>().notNull().default("NAO_ATRIBUIDO"),
		responsavelUsuarioId: varchar("responsavel_usuario_id", { length: 255 }).references(() => users.id, { onDelete: "set null" }),
		// Sem FK: a tabela de agentes ainda não existe aqui. null + tipo AGENTE = "IA da organização".
		responsavelAgenteId: varchar("responsavel_agente_id", { length: 255 }),
		status: varchar("status", { length: 32 }).$type<TChatAssignmentStatus>().notNull().default("ABERTO"),
		atribuidoPorUsuarioId: varchar("atribuido_por_usuario_id", { length: 255 }).references(() => users.id, { onDelete: "set null" }),
		transferidoParaUsuarioId: varchar("transferido_para_usuario_id", { length: 255 }).references(() => users.id, { onDelete: "set null" }),
		transferenciaMotivo: text("transferencia_motivo"),
		prioridade: varchar("prioridade", { length: 16 }).$type<TChatAssignmentPriority>(),
		categoria: varchar("categoria", { length: 64 }),
		resumo: text("resumo"),
		resultado: text("resultado"),
		dataAtribuicao: timestamp("data_atribuicao").defaultNow().notNull(),
		dataLiberacao: timestamp("data_liberacao"),
		dataUltimaEntradaCliente: timestamp("data_ultima_entrada_cliente"),
		dataPrimeiraResposta: timestamp("data_primeira_resposta"),
		dataUltimaResposta: timestamp("data_ultima_resposta"),
		dataResolucao: timestamp("data_resolucao"),
		dataEncerramento: timestamp("data_encerramento"),
		encerradoPorUsuarioId: varchar("encerrado_por_usuario_id", { length: 255 }).references(() => users.id, { onDelete: "set null" }),
		dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
	},
	(table) => [
		index("idx_chat_assignments_chat_status").on(table.chatId, table.status),
		index("idx_chat_assignments_organizacao_usuario").on(table.organizacaoId, table.responsavelUsuarioId),
		uniqueIndex("idx_chat_assignments_one_current_per_chat")
			.on(table.chatId)
			.where(sql`${table.status} not in ('ENCERRADO', 'CANCELADO')`),
	],
);
```

Notas de modelagem:

- **`UNIQUE (chat_id) WHERE status NOT IN ('ENCERRADO','CANCELADO')`** é a garantia central: um único atendimento ativo por chat. É o que torna o claim concorrente (CAS) e o `onConflictDoNothing()` seguros.
- `dataInsercao` não existe no Control; aqui entra por convenção do `CLAUDE.md`. `dataAtribuicao` é mutável (renovada em cada transferência); `dataInsercao` não.
- `atribuidoPorAgenteId` do Control **não** é portado (sem tabela de agentes).
- `prioridade` é validada só na entrada (Zod), não por CHECK constraint — mesma escolha do Control.

Semântica dos tipos de responsável:

| `responsavelTipo` | Significado | Quem escreve |
| --- | --- | --- |
| `NAO_ATRIBUIDO` | Ticket na fila do hub, sem dono (estado de nascimento). A "fila" é virtual: não existe tabela de fila/setor. | `ensureCurrentAttendance`, `releaseChatAttendance` |
| `USUARIO` | Um humano do hub é o dono. **Sempre** implica `responsavelUsuarioId` não-nulo. | `assumeChatAttendanceForUser`, `transferChatAttendance` |
| `AGENTE` | IA da organização (id nulo nesta fase). | `claimChatAttendanceForAgent` |
| `EXTERNO` | O operador respondeu direto pelo app WhatsApp no celular (Coexistence/echo); o hub mostra "Atendido pelo telefone" e a IA sai de cena. | `markChatAttendedExternally` |

Máquina de estados do `status`:

```
                 mensagem do cliente
   (nascimento) ─────────────────────▶ ABERTO ◀──────────────┐
                                        │                    │ markChatNeedsResponse
                    resposta (qualquer  │                    │ (nova entrada do cliente)
                     origem)            ▼                    │
                                  EM_ATENDIMENTO ────────────┘
                                    │      │
              alterar_status manual │      │ alterar_status manual
                                    ▼      ▼
                    AGUARDANDO_CLIENTE   AGUARDANDO_INTERNO
                                    │      │
                                    └──┬───┘
                                       ▼
                                   RESOLVIDO  ──▶ ENCERRADO ─┐ terminais:
                                                  CANCELADO ─┘ saem do índice único parcial
```

- `ABERTO` = há pendência do cliente. `EM_ATENDIMENTO` = já houve resposta.
- `RESOLVIDO` grava `data_resolucao` mas **não** é terminal para o índice único (o ticket ainda é o ativo do chat); `ENCERRADO`/`CANCELADO` gravam `data_encerramento` + `data_liberacao` e liberam o chat para um novo ticket.
- Uma nova mensagem do cliente sobre um ticket `RESOLVIDO` o traz de volta para `ABERTO` (mesmo ticket). Sobre um `ENCERRADO`, nasce um ticket novo.

### 4.2 `ampmais_chats` (ALTERADA)

Adicionar:

| Coluna | Tipo | Semântica / backfill |
| --- | --- | --- |
| `ultima_mensagem_entrada_data` | timestamp | Última msg **recebida** do cliente. Backfill: `ultima_interacao_cliente_data` |
| `ultima_mensagem_saida_data` | timestamp | Última msg **enviada**. Backfill: `max(data_envio)` das mensagens com `autor_tipo <> 'CLIENTE'` |
| `whatsapp_janela_data_expiracao` | timestamp | Janela de 24h; `null` = sem janela ativa. Backfill: `ultima_interacao_cliente_data + 24h` quando no futuro. Conexões `INTERNAL_GATEWAY` **não têm janela** → sempre `null` |
| `ultima_leitura_data` | timestamp | |
| `ultima_leitura_por_usuario_id` | varchar(255) FK → users SET NULL | |

Remover (na 0053):

- `status` (`chat_status` ABERTA/FECHADA) — substituído pela janela. A semântica "conversa expirada" passa a ser `whatsapp_janela_data_expiracao IS NULL OR < now()`.
- `ultima_mensagem_conteudo_tipo`, `ultima_mensagem_conteudo_texto` — preview resolvido via join com `ultima_mensagem_id` (padrão Control, `src/lib/chats/chat-list-preview.ts`).
- `ultima_interacao_cliente_data` — substituída por `ultima_mensagem_entrada_data`. ⚠️ Adição sobre a versão anterior do plano, que esquecia esta coluna.
- `ai_agendamento_resposta_data` — o debounce da IA deixa de viver em coluna (ver [Fase 4](#43-debounce-da-ia)).

Índices novos:

- `idx_chats_organizacao_ultima_mensagem` em `(organizacao_id, ultima_mensagem_data DESC)` — ordenação da inbox.
- `idx_chats_conexao_telefone_ultima_mensagem` em `(whatsapp_conexao_telefone_id, ultima_mensagem_data DESC)` — filtro por número + ordenação, o caminho quente do hub.
- **`UNIQUE (organizacao_id, cliente_id, whatsapp_telefone_id)`** — chave natural, hoje tratada como tal em 4 pontos sem constraint. ⚠️ Exige merge de duplicatas antes (ver [§6.3](#63-merge-de-duplicatas-da-chave-natural)).

### 4.3 `ampmais_chat_messages` (ALTERADA)

Adicionar:

| Coluna | Tipo | Notas |
| --- | --- | --- |
| `cliente_id` | varchar(255) FK → clients | Backfill via chat. **NOT NULL só na 0053** (o código velho não preenche) |
| `cliente_mensagem_id` | text | Id gerado no cliente, chave de reconciliação do envio otimista |
| `metadados` | jsonb `$type<TChatMessageMetadata>` | Referral de anúncio Meta (CTWA), status de download/processamento de mídia, dados do gateway interno (`jobId`, `queueFailure`). Shape de referência: `src/lib/validators/chats.ts:95-134` no Control |
| `status_entrega` | `chat_message_delivery_status` NOT NULL default `'PENDENTE'` | Status unificado. Ver [§6.1](#61-por-que-status_entrega-e-não-um-swap-de-status) |
| `provedor_status_data_atualizacao` | timestamp | Quando o provedor confirmou o último status |
| `whatsapp_echo` | boolean NOT NULL default false | Backfill de `is_echo`. **Adição**, não rename — o rename quebraria o código velho |

Relaxar NOT NULL (na 0052, para o código novo poder omitir):

- `conteudo_texto` → nullable (hoje NOT NULL; o código atual grava `""` para mídia sem legenda).

Índices novos:

- `idx_chat_messages_chat_timeline` em `(chat_id, data_envio DESC, id DESC)` — paginação por cursor da thread.
- `idx_chat_messages_whatsapp_message_id` em `(whatsapp_message_id)` — lookup do webhook de status.
- `idx_chat_messages_cliente_mensagem_id` em `(cliente_mensagem_id)` — reconciliação do otimista.
- `idx_chat_messages_organizacao_data_envio` em `(organizacao_id, data_envio DESC)` — relatórios/limpezas.

Remover (na 0053): `servico_id`, `whatsapp_message_status`, `status` (enum antigo), `is_echo`.

Mantém-se: toda a família `conteudo_midia_*` (já é ~idêntica ao Control, incluindo `conteudo_midia_texto_processado[_resumo]` para transcrição/OCR de IA) e `whatsapp_template_id`.

### 4.4 Remoções (na 0053)

- Tabela `ampmais_chat_services`
- Enums `chat_service_status`, `chat_service_responsible_type`, `chat_status`, `chat_message_status`, `chat_message_whatsapp_status`

### 4.5 Relations e tipos inferidos

```typescript
export const chatAssignmentsRelations = relations(chatAssignments, ({ one }) => ({
	organizacao: one(organizations, { fields: [chatAssignments.organizacaoId], references: [organizations.id] }),
	chat: one(chats, { fields: [chatAssignments.chatId], references: [chats.id] }),
	responsavelUsuario: one(users, {
		fields: [chatAssignments.responsavelUsuarioId],
		references: [users.id],
		relationName: "chat_assignment_responsavel_usuario",
	}),
	atribuidoPorUsuario: one(users, {
		fields: [chatAssignments.atribuidoPorUsuarioId],
		references: [users.id],
		relationName: "chat_assignment_atribuido_por_usuario",
	}),
	transferidoParaUsuario: one(users, {
		fields: [chatAssignments.transferidoParaUsuarioId],
		references: [users.id],
		relationName: "chat_assignment_transferido_para_usuario",
	}),
	encerradoPorUsuario: one(users, {
		fields: [chatAssignments.encerradoPorUsuarioId],
		references: [users.id],
		relationName: "chat_assignment_encerrado_por_usuario",
	}),
}));

export type TChatAssignmentEntity = typeof chatAssignments.$inferSelect;
export type TNewChatAssignmentEntity = typeof chatAssignments.$inferInsert;
```

⚠️ **`relationName` é obrigatório** em todas as relations que apontam para `users`: são 4 FKs para a mesma tabela e o Drizzle não desambigua sozinho. Em `chats`, a relation `ultimaMensagem` também precisa de `relationName: "chat_ultima_mensagem"` (já é o caso hoje de forma implícita, mas com `mensagens: many(chatMessages)` no mesmo objeto o Drizzle exige o nome — o Control usa exatamente isso em `chats.ts:189-194`).

Adicionar `atribuicoes: many(chatAssignments)` em `chatsRelations`, e remover `servicos`.

Barrel: `services/drizzle/schema/index.ts` deve exportar `chatAssignments` e deixar de exportar `chatServices`.

---

## 5. Enums e schemas Zod

### 5.1 `services/drizzle/schema/enums.ts`

```typescript
// NOVO
export const chatMessageDeliveryStatusEnum = pgEnum("chat_message_delivery_status", [
	"PENDENTE",
	"ENVIADA",
	"ENTREGUE",
	"LIDA",
	"FALHA",
	"CANCELADA",
]);

// MANTIDOS
export const chatMessageContentTypeEnum = pgEnum("chat_message_content_type", ["TEXTO", "IMAGEM", "VIDEO", "AUDIO", "DOCUMENTO"]);
export const chatMessageAuthorTypeEnum = pgEnum("chat_message_author_type", ["CLIENTE", "USUÁRIO", "AI", "BUSINESS-APP"]);

// REMOVIDOS na 0053 — apagar destas linhas junto com o drop dos tipos:
// chatStatusEnum, chatServiceStatusEnum, chatServiceResponsibleTypeEnum,
// chatMessageStatusEnum, chatMessageWhatsappStatusEnum
```

`chat_message_author_type` **não muda** nesta iniciativa: `"AI"` e `"BUSINESS-APP"` continuam como valores de autor de mensagem, mesmo que os tipos de *responsável* do assignment sejam `AGENTE`/`EXTERNO`. Renomear valores de pgEnum exigiria `ALTER TYPE ... RENAME VALUE` mais reescrita de todas as leituras — custo sem retorno. **Documentar o mapeamento** na camada de UI:

| `chat_messages.autor_tipo` | `chat_assignments.responsavel_tipo` correspondente | Label na UI |
| --- | --- | --- |
| `CLIENTE` | — | nome do cliente |
| `USUÁRIO` | `USUARIO` | nome do usuário |
| `AI` | `AGENTE` | "Assistente IA" |
| `BUSINESS-APP` | `EXTERNO` | "Telefone" |

### 5.2 `schemas/enums.ts` (Zod)

```typescript
export const ChatAssignmentResponsibleTypeEnum = z.enum(["USUARIO", "AGENTE", "EXTERNO", "NAO_ATRIBUIDO"], {
	required_error: "Tipo de responsável pelo atendimento não informado.",
	invalid_type_error: "Tipo não válido para o tipo de responsável pelo atendimento.",
});
export type TChatAssignmentResponsibleType = z.infer<typeof ChatAssignmentResponsibleTypeEnum>;

export const ChatAssignmentStatusEnum = z.enum(
	["ABERTO", "EM_ATENDIMENTO", "AGUARDANDO_CLIENTE", "AGUARDANDO_INTERNO", "RESOLVIDO", "ENCERRADO", "CANCELADO"],
	{
		required_error: "Status do atendimento não informado.",
		invalid_type_error: "Tipo não válido para o status do atendimento.",
	},
);
export type TChatAssignmentStatus = z.infer<typeof ChatAssignmentStatusEnum>;

export const ChatAssignmentPriorityEnum = z.enum(["BAIXA", "MEDIA", "ALTA", "URGENTE"], {
	required_error: "Prioridade do atendimento não informada.",
	invalid_type_error: "Tipo não válido para a prioridade do atendimento.",
});
export type TChatAssignmentPriority = z.infer<typeof ChatAssignmentPriorityEnum>;

export const ChatInboxViewEnum = z.enum(["MINHAS", "NAO_ATRIBUIDAS", "COM_AGENTE", "TODAS"], {
	required_error: "Visão da caixa de entrada não informada.",
	invalid_type_error: "Tipo não válido para a visão da caixa de entrada.",
});
export type TChatInboxView = z.infer<typeof ChatInboxViewEnum>;

export const ChatMessageDeliveryStatusEnum = z.enum(["PENDENTE", "ENVIADA", "ENTREGUE", "LIDA", "FALHA", "CANCELADA"], {
	required_error: "Status de entrega da mensagem não informado.",
	invalid_type_error: "Tipo não válido para o status de entrega da mensagem.",
});
export type TChatMessageDeliveryStatus = z.infer<typeof ChatMessageDeliveryStatusEnum>;
```

**Remover** de `schemas/enums.ts`: `ChatStatusEnum`, `ChatServiceStatusEnum`, `ChatServiceResponsibleTypeEnum`, `ChatMessageStatusEnum`, `ChatMessageWhatsappStatusEnum` (se existirem — conferir com `grep -rn "ChatService\|ChatStatus" schemas/`).

### 5.3 `schemas/chats.ts`

Novo arquivo, no padrão do `CLAUDE.md` (`required_error` + `invalid_type_error` em todo campo). Conteúdo mínimo:

- `ChatSchema` — entidade chat (sem `id`/`dataInsercao`, que entram por `.extend()` onde preciso).
- `ChatAssignmentSchema` — entidade assignment.
- `ChatMessageMetadataSchema` — port de `src/lib/validators/chats.ts:95-134` do Control, adaptado:

```typescript
export const ChatMessageMetadataSchema = z.object({
	whatsappReferral: WhatsappReferralNormalizedSchema.optional().nullable(), // CTWA — anúncio Meta que originou a conversa
	whatsappMidia: z
		.object({
			mediaId: z.string(),
			downloadStatus: z.enum(["success", "failed", "skipped"]),
			uploadStatus: z.enum(["success", "failed", "skipped"]),
			processingStatus: z.enum(["processed", "stored_only", "failed"]),
			model: z.string().optional(),
			failureReason: z.string().optional(),
			storageBucket: z.string().optional(),
			storagePath: z.string().optional(),
			mimeType: z.string().optional(),
			fileName: z.string().optional(),
			fileSize: z.number().optional(),
		})
		.optional(),
	gatewayInterno: z
		.object({
			sessaoId: z.string().optional(),
			gatewayTimestamp: z.string().optional(),
			jobId: z.string().optional(),
			echo: z.boolean().optional(),
			queueFailure: z
				.object({
					error: z.string(),
					attemptsUsed: z.number().optional(),
					maxAttempts: z.number().optional(),
					errorClass: z.string().optional(),
					retriable: z.boolean().optional(),
				})
				.optional(),
		})
		.optional(),
});
export type TChatMessageMetadata = z.infer<typeof ChatMessageMetadataSchema>;
```

⚠️ `WhatsappReferralNormalizedSchema` **não existe** neste repo — verificar `lib/whatsapp/` e criá-lo a partir do parser de webhook existente, ou tipar o referral como `z.record(z.unknown())` numa primeira iteração e apertar depois. Não bloquear a Fase 1 por isso.

---

## 6. Migrations

### 6.1 Por que `status_entrega` e não um swap de `status`

A alternativa "renomear o tipo antigo, criar `chat_message_status` com os valores novos e swapar a coluna" **quebra o requisito de zero downtime**:

- Entre a 0052 e o deploy do código novo, o app velho continua inserindo `status = 'ENVIADO'` / `'RECEBIDO'`. Esses valores não existem no enum novo → todo insert de mensagem falharia, derrubando os webhooks.
- Um swap `ADD status_novo … / DROP status / RENAME status_novo → status` exigiria **dois deploys de código** (um escrevendo `status_novo`, outro escrevendo `status`), porque o mapeamento Drizzle muda junto com o rename.

`status_entrega` como nome definitivo resolve os dois: é uma coluna nova, o código velho a ignora, o código novo a usa desde o primeiro deploy, e a 0053 só apaga o que sobrou. Bônus: desambigua de `chat_assignments.status`, que é um conceito totalmente diferente e conviveria com o mesmo nome nas queries com join.

Custo aceito: mensagens inseridas pelo código velho na janela entre 0052 e o deploy nascem com `status_entrega = 'PENDENTE'` (o default). Por isso a 0053 **repete o backfill** antes de dropar as colunas antigas.

### 6.2 `drizzle/0052_chat_attendance_redesign.sql` (aditiva)

```sql
-- Chat Attendance Redesign — Fase 1 (docs/dev-planning/chat-attendance-redesign-plan.md)
-- DDL aditivo. Seguro com o codigo antigo em producao.
-- Aplicado via scripts/apply-sql-migration.ts (drizzle push/generate travam em prompts de drift).

-- ─── 1. Enum novo de status de entrega de mensagem ──────────────────────────
CREATE TYPE "chat_message_delivery_status" AS ENUM ('PENDENTE', 'ENVIADA', 'ENTREGUE', 'LIDA', 'FALHA', 'CANCELADA');

-- ─── 2. chat_assignments ────────────────────────────────────────────────────
CREATE TABLE "ampmais_chat_assignments" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"organizacao_id" varchar(255) NOT NULL,
	"chat_id" varchar(255) NOT NULL,
	"responsavel_tipo" varchar(32) DEFAULT 'NAO_ATRIBUIDO' NOT NULL,
	"responsavel_usuario_id" varchar(255),
	"responsavel_agente_id" varchar(255),
	"status" varchar(32) DEFAULT 'ABERTO' NOT NULL,
	"atribuido_por_usuario_id" varchar(255),
	"transferido_para_usuario_id" varchar(255),
	"transferencia_motivo" text,
	"prioridade" varchar(16),
	"categoria" varchar(64),
	"resumo" text,
	"resultado" text,
	"data_atribuicao" timestamp DEFAULT now() NOT NULL,
	"data_liberacao" timestamp,
	"data_ultima_entrada_cliente" timestamp,
	"data_primeira_resposta" timestamp,
	"data_ultima_resposta" timestamp,
	"data_resolucao" timestamp,
	"data_encerramento" timestamp,
	"encerrado_por_usuario_id" varchar(255),
	"data_insercao" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ampmais_chat_assignments_organizacao_id_fk"
		FOREIGN KEY ("organizacao_id") REFERENCES "ampmais_organizations"("id") ON DELETE cascade,
	CONSTRAINT "ampmais_chat_assignments_chat_id_fk"
		FOREIGN KEY ("chat_id") REFERENCES "ampmais_chats"("id") ON DELETE cascade,
	CONSTRAINT "ampmais_chat_assignments_responsavel_usuario_id_fk"
		FOREIGN KEY ("responsavel_usuario_id") REFERENCES "ampmais_users"("id") ON DELETE set null,
	CONSTRAINT "ampmais_chat_assignments_atribuido_por_usuario_id_fk"
		FOREIGN KEY ("atribuido_por_usuario_id") REFERENCES "ampmais_users"("id") ON DELETE set null,
	CONSTRAINT "ampmais_chat_assignments_transferido_para_usuario_id_fk"
		FOREIGN KEY ("transferido_para_usuario_id") REFERENCES "ampmais_users"("id") ON DELETE set null,
	CONSTRAINT "ampmais_chat_assignments_encerrado_por_usuario_id_fk"
		FOREIGN KEY ("encerrado_por_usuario_id") REFERENCES "ampmais_users"("id") ON DELETE set null
);

CREATE INDEX "idx_chat_assignments_chat_status" ON "ampmais_chat_assignments" ("chat_id", "status");
CREATE INDEX "idx_chat_assignments_organizacao_usuario" ON "ampmais_chat_assignments" ("organizacao_id", "responsavel_usuario_id");

-- ─── 3. chats: colunas novas ────────────────────────────────────────────────
ALTER TABLE "ampmais_chats" ADD COLUMN "ultima_mensagem_entrada_data" timestamp;
ALTER TABLE "ampmais_chats" ADD COLUMN "ultima_mensagem_saida_data" timestamp;
ALTER TABLE "ampmais_chats" ADD COLUMN "whatsapp_janela_data_expiracao" timestamp;
ALTER TABLE "ampmais_chats" ADD COLUMN "ultima_leitura_data" timestamp;
ALTER TABLE "ampmais_chats" ADD COLUMN "ultima_leitura_por_usuario_id" varchar(255);
ALTER TABLE "ampmais_chats" ADD CONSTRAINT "ampmais_chats_ultima_leitura_por_usuario_id_fk"
	FOREIGN KEY ("ultima_leitura_por_usuario_id") REFERENCES "ampmais_users"("id") ON DELETE set null;

-- O codigo novo nao escreve mais estas colunas; relaxa o NOT NULL para nao quebrar inserts.
ALTER TABLE "ampmais_chats" ALTER COLUMN "ultima_mensagem_conteudo_tipo" DROP NOT NULL;

-- Backfill de entrada/saida/janela.
UPDATE "ampmais_chats" SET "ultima_mensagem_entrada_data" = "ultima_interacao_cliente_data"
WHERE "ultima_interacao_cliente_data" IS NOT NULL;

UPDATE "ampmais_chats" c
SET "ultima_mensagem_saida_data" = s."ultima_saida"
FROM (
	SELECT "chat_id", MAX("data_envio") AS "ultima_saida"
	FROM "ampmais_chat_messages"
	WHERE "autor_tipo" <> 'CLIENTE'
	GROUP BY "chat_id"
) s
WHERE c."id" = s."chat_id";

-- Janela de 24h so existe para conexoes Meta Cloud API.
UPDATE "ampmais_chats" c
SET "whatsapp_janela_data_expiracao" = c."ultima_interacao_cliente_data" + interval '24 hours'
FROM "ampmais_whatsapp_connections" wc
WHERE c."whatsapp_conexao_id" = wc."id"
	AND wc."tipo_conexao" = 'META_CLOUD_API'
	AND c."ultima_interacao_cliente_data" IS NOT NULL
	AND c."ultima_interacao_cliente_data" + interval '24 hours' > now();

-- ─── 4. chats: merge de duplicatas + UNIQUE natural ────────────────────────
-- (ver §6.3 — bloco completo)

-- ─── 5. chat_messages: colunas novas ───────────────────────────────────────
ALTER TABLE "ampmais_chat_messages" ADD COLUMN "cliente_id" varchar(255);
ALTER TABLE "ampmais_chat_messages" ADD CONSTRAINT "ampmais_chat_messages_cliente_id_fk"
	FOREIGN KEY ("cliente_id") REFERENCES "ampmais_clients"("id") ON DELETE cascade;
ALTER TABLE "ampmais_chat_messages" ADD COLUMN "cliente_mensagem_id" text;
ALTER TABLE "ampmais_chat_messages" ADD COLUMN "metadados" jsonb;
ALTER TABLE "ampmais_chat_messages" ADD COLUMN "whatsapp_echo" boolean DEFAULT false NOT NULL;
ALTER TABLE "ampmais_chat_messages" ADD COLUMN "status_entrega" "chat_message_delivery_status" DEFAULT 'PENDENTE' NOT NULL;
ALTER TABLE "ampmais_chat_messages" ADD COLUMN "provedor_status_data_atualizacao" timestamp;
ALTER TABLE "ampmais_chat_messages" ALTER COLUMN "conteudo_texto" DROP NOT NULL;

UPDATE "ampmais_chat_messages" m
SET "cliente_id" = c."cliente_id"
FROM "ampmais_chats" c
WHERE m."chat_id" = c."id" AND m."cliente_id" IS NULL;

UPDATE "ampmais_chat_messages" SET "whatsapp_echo" = "is_echo" WHERE "is_echo" = true;

UPDATE "ampmais_chat_messages"
SET "status_entrega" = CASE
	WHEN "status" = 'CANCELADO' THEN 'CANCELADA'::"chat_message_delivery_status"
	WHEN "whatsapp_message_status" = 'PENDENTE' THEN 'PENDENTE'::"chat_message_delivery_status"
	WHEN "whatsapp_message_status" = 'ENVIADO'  THEN 'ENVIADA'::"chat_message_delivery_status"
	WHEN "whatsapp_message_status" = 'ENTREGUE' THEN 'ENTREGUE'::"chat_message_delivery_status"
	WHEN "whatsapp_message_status" = 'LIDO'     THEN 'LIDA'::"chat_message_delivery_status"
	WHEN "whatsapp_message_status" = 'FALHOU'   THEN 'FALHA'::"chat_message_delivery_status"
	ELSE 'ENVIADA'::"chat_message_delivery_status"
END;

CREATE INDEX "idx_chat_messages_chat_timeline" ON "ampmais_chat_messages" ("chat_id", "data_envio" DESC, "id" DESC);
CREATE INDEX "idx_chat_messages_whatsapp_message_id" ON "ampmais_chat_messages" ("whatsapp_message_id");
CREATE INDEX "idx_chat_messages_cliente_mensagem_id" ON "ampmais_chat_messages" ("cliente_mensagem_id");
CREATE INDEX "idx_chat_messages_organizacao_data_envio" ON "ampmais_chat_messages" ("organizacao_id", "data_envio" DESC);

-- ─── 6. Backfill de chat_assignments a partir de chat_services ─────────────
-- (ver §6.5 — bloco re-executavel)
```

Ordem importa: o merge de duplicatas (passo 4) precisa acontecer **antes** do `UNIQUE` e **depois** do backfill de datas (o critério de sobrevivência usa `ultima_mensagem_data`).

### 6.3 Merge de duplicatas da chave natural

```sql
-- Elege o chat com ultima_mensagem_data mais recente como sobrevivente por
-- (organizacao_id, cliente_id, whatsapp_telefone_id); move mensagens e servicos,
-- soma nao-lidas, consolida datas e apaga os orfaos.
WITH ranked AS (
	SELECT
		"id",
		"organizacao_id",
		"cliente_id",
		"whatsapp_telefone_id",
		FIRST_VALUE("id") OVER (
			PARTITION BY "organizacao_id", "cliente_id", "whatsapp_telefone_id"
			ORDER BY "ultima_mensagem_data" DESC, "id" DESC
		) AS "sobrevivente_id"
	FROM "ampmais_chats"
	WHERE "whatsapp_telefone_id" IS NOT NULL
),
duplicados AS (
	SELECT "id", "sobrevivente_id" FROM ranked WHERE "id" <> "sobrevivente_id"
)
UPDATE "ampmais_chat_messages" m
SET "chat_id" = d."sobrevivente_id"
FROM duplicados d
WHERE m."chat_id" = d."id";

-- Idem para os servicos legados (a 0053 dropa a tabela, mas o backfill de
-- assignments abaixo ainda le dela).
WITH ranked AS (
	SELECT
		"id",
		FIRST_VALUE("id") OVER (
			PARTITION BY "organizacao_id", "cliente_id", "whatsapp_telefone_id"
			ORDER BY "ultima_mensagem_data" DESC, "id" DESC
		) AS "sobrevivente_id"
	FROM "ampmais_chats"
	WHERE "whatsapp_telefone_id" IS NOT NULL
),
duplicados AS (
	SELECT "id", "sobrevivente_id" FROM ranked WHERE "id" <> "sobrevivente_id"
)
UPDATE "ampmais_chat_services" s
SET "chat_id" = d."sobrevivente_id"
FROM duplicados d
WHERE s."chat_id" = d."id";

-- Consolida contadores e datas no sobrevivente, entao apaga os duplicados.
WITH ranked AS (
	SELECT
		"id",
		"mensagens_nao_lidas",
		"ultima_interacao_cliente_data",
		FIRST_VALUE("id") OVER (
			PARTITION BY "organizacao_id", "cliente_id", "whatsapp_telefone_id"
			ORDER BY "ultima_mensagem_data" DESC, "id" DESC
		) AS "sobrevivente_id"
	FROM "ampmais_chats"
	WHERE "whatsapp_telefone_id" IS NOT NULL
),
agregado AS (
	SELECT
		"sobrevivente_id",
		SUM("mensagens_nao_lidas") FILTER (WHERE "id" <> "sobrevivente_id") AS "nao_lidas_extra",
		MAX("ultima_interacao_cliente_data") AS "ultima_entrada"
	FROM ranked
	GROUP BY "sobrevivente_id"
	HAVING COUNT(*) > 1
)
UPDATE "ampmais_chats" c
SET
	"mensagens_nao_lidas" = c."mensagens_nao_lidas" + COALESCE(a."nao_lidas_extra", 0),
	"ultima_mensagem_entrada_data" = GREATEST(c."ultima_mensagem_entrada_data", a."ultima_entrada")
FROM agregado a
WHERE c."id" = a."sobrevivente_id";

WITH ranked AS (
	SELECT
		"id",
		FIRST_VALUE("id") OVER (
			PARTITION BY "organizacao_id", "cliente_id", "whatsapp_telefone_id"
			ORDER BY "ultima_mensagem_data" DESC, "id" DESC
		) AS "sobrevivente_id"
	FROM "ampmais_chats"
	WHERE "whatsapp_telefone_id" IS NOT NULL
)
DELETE FROM "ampmais_chats" WHERE "id" IN (SELECT "id" FROM ranked WHERE "id" <> "sobrevivente_id");

-- Agora a chave natural pode virar constraint.
CREATE UNIQUE INDEX "idx_chats_chave_natural"
	ON "ampmais_chats" ("organizacao_id", "cliente_id", "whatsapp_telefone_id")
	WHERE "whatsapp_telefone_id" IS NOT NULL;

CREATE INDEX "idx_chats_organizacao_ultima_mensagem" ON "ampmais_chats" ("organizacao_id", "ultima_mensagem_data" DESC);
CREATE INDEX "idx_chats_conexao_telefone_ultima_mensagem"
	ON "ampmais_chats" ("whatsapp_conexao_telefone_id", "ultima_mensagem_data" DESC);
```

⚠️ O índice único é **parcial** (`WHERE whatsapp_telefone_id IS NOT NULL`) porque a coluna é nullable e no Postgres `NULL` nunca conflita — deixar explícito evita a falsa sensação de que chats sem número estão protegidos. O `upsert` do webhook deve usar exatamente esta lista de colunas no `ON CONFLICT`.

**Antes de aplicar**, rodar o diagnóstico de [§16.1](#161-pré-migration-diagnóstico) para saber quantas duplicatas existem. Se o número for grande ou houver casos com mensagens muito divergentes, revisar manualmente antes de deletar.

### 6.4 Índices e `CONCURRENTLY`

`scripts/apply-sql-migration.ts` executa o arquivo inteiro dentro de `connection.begin(...)`. Consequências:

- `CREATE INDEX CONCURRENTLY` → **erro** (`CREATE INDEX CONCURRENTLY cannot run inside a transaction block`).
- `DROP TYPE` / `ALTER TYPE` funcionam normalmente.
- Um erro em qualquer statement reverte a migration inteira — o que é desejável aqui.

Se o `COUNT(*)` de `ampmais_chat_messages` (ver [§16.1](#161-pré-migration-diagnóstico)) tornar o lock de `CREATE INDEX` inaceitável:

1. Remover os `CREATE INDEX` do 0052 e colocá-los em `drizzle/0052a_chat_indexes_concurrent.sql` com `CONCURRENTLY`.
2. Aplicar esse arquivo **fora** do script, com `psql "$DATABASE_URL" -f drizzle/0052a_chat_indexes_concurrent.sql`.
3. Verificar `indisvalid` depois: `SELECT indexrelid::regclass, indisvalid FROM pg_index WHERE NOT indisvalid;` — um índice `CONCURRENTLY` que falha fica inválido e precisa ser dropado e recriado.

### 6.5 Backfill de `chat_assignments` (re-executável)

Este bloco entra no fim da 0052 **e** no início da 0053. Ele é idempotente: só cria assignment para chats que ainda não têm um ativo.

```sql
-- Regra: por chat, so o servico legado mais recente entre os abertos vira o
-- assignment ativo. Os demais entram como ENCERRADO (historico).
WITH servico_ativo AS (
	SELECT DISTINCT ON (s."chat_id")
		s."id", s."organizacao_id", s."chat_id", s."responsavel_tipo",
		s."responsavel_usuario_id", s."descricao", s."status",
		s."data_inicio", s."data_fim"
	FROM "ampmais_chat_services" s
	WHERE s."status" IN ('PENDENTE', 'EM_ANDAMENTO')
	ORDER BY s."chat_id", s."data_inicio" DESC, s."id" DESC
)
INSERT INTO "ampmais_chat_assignments" (
	"id", "organizacao_id", "chat_id", "responsavel_tipo", "responsavel_usuario_id",
	"status", "resumo", "data_atribuicao", "data_encerramento", "data_ultima_entrada_cliente", "data_insercao"
)
SELECT
	gen_random_uuid()::text,
	sa."organizacao_id",
	sa."chat_id",
	CASE sa."responsavel_tipo"
		WHEN 'USUÁRIO'      THEN 'USUARIO'
		WHEN 'AI'           THEN 'AGENTE'
		WHEN 'BUSINESS-APP' THEN 'EXTERNO'
		ELSE 'NAO_ATRIBUIDO'
	END,
	-- USUARIO sem usuario real é incoerente com a semântica do tipo: vira fila.
	CASE WHEN sa."responsavel_tipo" = 'USUÁRIO' THEN sa."responsavel_usuario_id" ELSE NULL END,
	CASE sa."status"
		WHEN 'PENDENTE'     THEN 'ABERTO'
		WHEN 'EM_ANDAMENTO' THEN 'EM_ATENDIMENTO'
		ELSE 'ENCERRADO'
	END,
	NULLIF(sa."descricao", 'NÃO ESPECIFICADO'),
	sa."data_inicio",
	sa."data_fim",
	c."ultima_mensagem_entrada_data",
	now()
FROM servico_ativo sa
JOIN "ampmais_chats" c ON c."id" = sa."chat_id"
WHERE NOT EXISTS (
	SELECT 1 FROM "ampmais_chat_assignments" a
	WHERE a."chat_id" = sa."chat_id" AND a."status" NOT IN ('ENCERRADO', 'CANCELADO')
);

-- Corrige a incoerencia USUARIO-sem-usuario que o CASE acima possa ter deixado.
UPDATE "ampmais_chat_assignments"
SET "responsavel_tipo" = 'NAO_ATRIBUIDO'
WHERE "responsavel_tipo" = 'USUARIO' AND "responsavel_usuario_id" IS NULL;

-- Chats sem nenhum servico legado tambem precisam de ticket, para o hub
-- nao depender de lazy-create no primeiro acesso.
INSERT INTO "ampmais_chat_assignments" (
	"id", "organizacao_id", "chat_id", "responsavel_tipo", "status",
	"data_atribuicao", "data_ultima_entrada_cliente", "data_insercao"
)
SELECT
	gen_random_uuid()::text, c."organizacao_id", c."id", 'NAO_ATRIBUIDO',
	CASE
		WHEN c."ultima_mensagem_entrada_data" IS NOT NULL
			AND (c."ultima_mensagem_saida_data" IS NULL OR c."ultima_mensagem_entrada_data" > c."ultima_mensagem_saida_data")
		THEN 'ABERTO'
		ELSE 'EM_ATENDIMENTO'
	END,
	COALESCE(c."ultima_mensagem_data", now()),
	c."ultima_mensagem_entrada_data",
	now()
FROM "ampmais_chats" c
WHERE NOT EXISTS (
	SELECT 1 FROM "ampmais_chat_assignments" a
	WHERE a."chat_id" = c."id" AND a."status" NOT IN ('ENCERRADO', 'CANCELADO')
);
```

⚠️ `gen_random_uuid()` exige `pgcrypto` (nativo no PG13+ como built-in). Conferir com `SELECT gen_random_uuid();` antes; se falhar, `CREATE EXTENSION IF NOT EXISTS pgcrypto;` no topo do arquivo.

### 6.6 `drizzle/0053_chat_attendance_drop_legacy.sql` (destrutiva)

**Só aplicar após o deploy do código novo estar estável em produção.**

```sql
-- Chat Attendance Redesign — limpeza do legado.
-- APLICAR SOMENTE APOS O DEPLOY DO CODIGO NOVO.

-- ─── 1. Re-executa os backfills para capturar escritas do periodo de transicao ──
UPDATE "ampmais_chat_messages" m
SET "cliente_id" = c."cliente_id"
FROM "ampmais_chats" c
WHERE m."chat_id" = c."id" AND m."cliente_id" IS NULL;

UPDATE "ampmais_chat_messages"
SET "status_entrega" = CASE
	WHEN "status" = 'CANCELADO' THEN 'CANCELADA'::"chat_message_delivery_status"
	WHEN "whatsapp_message_status" = 'PENDENTE' THEN 'PENDENTE'::"chat_message_delivery_status"
	WHEN "whatsapp_message_status" = 'ENVIADO'  THEN 'ENVIADA'::"chat_message_delivery_status"
	WHEN "whatsapp_message_status" = 'ENTREGUE' THEN 'ENTREGUE'::"chat_message_delivery_status"
	WHEN "whatsapp_message_status" = 'LIDO'     THEN 'LIDA'::"chat_message_delivery_status"
	WHEN "whatsapp_message_status" = 'FALHOU'   THEN 'FALHA'::"chat_message_delivery_status"
	ELSE "status_entrega"
END
WHERE "status_entrega" = 'PENDENTE' AND "whatsapp_message_status" <> 'PENDENTE';

UPDATE "ampmais_chat_messages" SET "whatsapp_echo" = true WHERE "is_echo" = true AND "whatsapp_echo" = false;

-- (repetir aqui o bloco completo de backfill de assignments de §6.5)

-- ─── 2. Aperta o NOT NULL agora que o backfill esta completo ───────────────
ALTER TABLE "ampmais_chat_messages" ALTER COLUMN "cliente_id" SET NOT NULL;

-- ─── 3. Drops ──────────────────────────────────────────────────────────────
ALTER TABLE "ampmais_chat_messages" DROP COLUMN "servico_id";
ALTER TABLE "ampmais_chat_messages" DROP COLUMN "whatsapp_message_status";
ALTER TABLE "ampmais_chat_messages" DROP COLUMN "status";
ALTER TABLE "ampmais_chat_messages" DROP COLUMN "is_echo";

ALTER TABLE "ampmais_chats" DROP COLUMN "status";
ALTER TABLE "ampmais_chats" DROP COLUMN "ultima_mensagem_conteudo_tipo";
ALTER TABLE "ampmais_chats" DROP COLUMN "ultima_mensagem_conteudo_texto";
ALTER TABLE "ampmais_chats" DROP COLUMN "ultima_interacao_cliente_data";
ALTER TABLE "ampmais_chats" DROP COLUMN "ai_agendamento_resposta_data";

DROP TABLE "ampmais_chat_services";

DROP TYPE "chat_service_status";
DROP TYPE "chat_service_responsible_type";
DROP TYPE "chat_status";
DROP TYPE "chat_message_status";
DROP TYPE "chat_message_whatsapp_status";
```

⚠️ `DROP TYPE "chat_message_status"` só funciona depois que a coluna `ampmais_chat_messages.status` sumir — a ordem acima já garante isso. Se algum outro schema ainda referenciar o tipo, o `DROP` falha e a transação inteira reverte (comportamento desejado): rodar `SELECT * FROM pg_depend WHERE refobjid = 'chat_message_status'::regtype;` para achar o dependente.

### 6.7 Aplicação

```bash
npx tsx ./scripts/apply-sql-migration.ts drizzle/0052_chat_attendance_redesign.sql
# … deploy do código novo, observação em produção …
npx tsx ./scripts/apply-sql-migration.ts drizzle/0053_chat_attendance_drop_legacy.sql
```

---

## Fase 1 — Schema Drizzle + SQL 0052/0053

**Entregáveis**

- [ ] `services/drizzle/schema/chats.ts` reescrito (3 tabelas alvo + relations com `relationName` + tipos inferidos).
- [ ] `services/drizzle/schema/enums.ts`: `chatMessageDeliveryStatusEnum` adicionado; enums legados marcados com `// TODO 0053: remover` (removidos de fato no commit da limpeza).
- [ ] `services/drizzle/schema/index.ts`: exporta `chatAssignments`, deixa de exportar `chatServices`.
- [ ] `schemas/enums.ts` + `schemas/chats.ts` conforme [§5](#5-enums-e-schemas-zod).
- [ ] `drizzle/0052_chat_attendance_redesign.sql` e `drizzle/0053_chat_attendance_drop_legacy.sql`.

**Critério de pronto**: `npx tsc --noEmit` não introduz erros novos nos arquivos tocados (baseline em [§15](#15-riscos-e-mitigações)), e a 0052 aplica sem erro num dump de produção restaurado localmente.

> Entre a Fase 1 e a Fase 3, o repositório fica temporariamente inconsistente: o schema não tem mais `chatServices`, mas as rotas antigas ainda o importam. Manter `chatServices` no schema Drizzle **até a Fase 3** (com um comentário `@deprecated`) e removê-lo no mesmo commit que reescreve as rotas. Isso mantém cada commit compilável.

---

## Fase 2 — Camada canônica de estado: `lib/chats/attendance-state.ts`

Port de `src/server/chats/attendance-state.ts` do Control (378 linhas), adaptado a `organizacaoId` e ao Drizzle daqui.

> **Regra inegociável**: toda mutação de atendimento — rotas, webhooks e IA — passa exclusivamente por esta camada. Nenhum `db.update(chatAssignments)` fora deste arquivo.

### 2.1 Tipos e preâmbulo

```typescript
import "server-only";
import { and, eq, isNull, notInArray, or, sql } from "drizzle-orm";
import type { TChatAssignmentPriority, TChatAssignmentStatus } from "@/schemas/enums";
import type { db as Database } from "@/services/drizzle";
import { chatAssignments, chats } from "@/services/drizzle/schema";

type TAttendanceDb = typeof Database | Parameters<Parameters<typeof Database.transaction>[0]>[0];

export type TAttendanceResponseSource = "HUB" | "AI" | "WHATSAPP_ECHO" | "INTERNAL_GATEWAY";

const CLOSED_ATTENDANCE_STATUSES = ["ENCERRADO", "CANCELADO"] as const satisfies readonly TChatAssignmentStatus[];

export function isClosedAttendanceStatus(status: string | null | undefined): status is "ENCERRADO" | "CANCELADO" {
	return (CLOSED_ATTENDANCE_STATUSES as readonly string[]).includes(status ?? "");
}
```

### 2.2 Superfície pública

| Função | Assinatura (além de `db` e `now?`) | Semântica |
| --- | --- | --- |
| `getCurrentChatAttendance` | `{ organizacaoId, chatId }` | Assignment ativo (status ∉ ENCERRADO/CANCELADO) com `responsavelUsuario` carregado |
| `ensureCurrentAttendance` *(privada)* | `{ organizacaoId, chatId, status? }` | find-then-insert; nasce `NAO_ATRIBUIDO`/`ABERTO`; `.onConflictDoNothing()` por causa dos webhooks concorrentes disputando o UNIQUE parcial; re-lê em caso de conflito |
| `markChatNeedsResponse` | `{ organizacaoId, chatId, messageDate }` | Inbound → `ABERTO` + `data_ultima_entrada_cliente` |
| `markChatAnswered` | `{ organizacaoId, chatId, responseDate, source }` | Outbound → `ABERTO`→`EM_ATENDIMENTO`; grava `data_primeira_resposta` (só na 1ª) e `data_ultima_resposta` |
| `markChatAttendedExternally` | `{ organizacaoId, chatId, responseDate }` | Echo do celular → `EXTERNO`; **não sobrescreve** dono `USUARIO` |
| `assumeChatAttendanceForUser` | `{ organizacaoId, chatId, usuarioId }` | **CAS**: assume só se o ticket não tem dono humano. Melhoria sobre o Control |
| `assignChatAttendance` | `{ organizacaoId, chatId, usuarioId, atribuidoPorUsuarioId }` | Atribuição com override (gestor atribuindo a terceiro) |
| `claimChatAttendanceForAgent` | `{ organizacaoId, chatId, agenteId? }` | **CAS**: `UPDATE … WHERE responsavel_tipo = 'NAO_ATRIBUIDO' AND status ∉ fechados`; zero linhas = humano assumiu antes → IA recua |
| `transferChatAttendance` | `{ organizacaoId, chatId, usuarioDestinoId, motivo?, prioridade?, transferidoPorUsuarioId? }` | Seta `USUARIO` destino + motivo + prioridade, renova `data_atribuicao` |
| `releaseChatAttendance` | `{ organizacaoId, chatId, motivo? }` | Volta a `NAO_ATRIBUIDO`, `data_liberacao = now`; se há pendência do cliente vira `ABERTO` |
| `changeChatAttendanceStatus` | `{ organizacaoId, chatId, status, usuarioId? }` | Grava `data_resolucao`/`data_encerramento`/`encerrado_por_usuario_id` quando aplicável |
| `changeChatAttendancePriority` | `{ organizacaoId, chatId, prioridade }` | |
| `closeChatAttendance` | `{ organizacaoId, chatId, status?, resultado?, usuarioId? }` | Encerramento com `resultado` (usado no handoff `HUMAN_HANDOFF`) |

Todas retornam `TChatAssignmentEntity | null`. `null` significa "não havia atendimento e não foi possível criar" (chat inexistente) **ou**, no caso dos CAS, "outra parte ganhou a corrida" — o chamador **deve** tratar os dois casos.

### 2.3 `getChatPendingState` (privada)

```typescript
async function getChatPendingState(db: TAttendanceDb, input: { chatId: string; organizacaoId: string }) {
	const chat = await db.query.chats.findFirst({
		where: and(eq(chats.id, input.chatId), eq(chats.organizacaoId, input.organizacaoId)),
		columns: { id: true, ultimaMensagemEntradaData: true, ultimaMensagemSaidaData: true },
	});
	if (!chat) return null;

	return {
		...chat,
		needsResponse:
			!!chat.ultimaMensagemEntradaData &&
			(!chat.ultimaMensagemSaidaData || chat.ultimaMensagemEntradaData > chat.ultimaMensagemSaidaData),
	};
}
```

### 2.4 `ensureCurrentAttendance` — o coração da concorrência

```typescript
async function ensureCurrentAttendance(
	db: TAttendanceDb,
	input: { organizacaoId: string; chatId: string; now: Date; status?: TChatAssignmentStatus },
) {
	const current = await getCurrentChatAttendance(db, input);
	if (current) return current;

	// O ticket nasce sem dono ("NAO_ATRIBUIDO"): representa o chat na fila do hub,
	// não um humano responsável. A posse só é afirmada por assumir/claim/transferir,
	// que sempre setam o id correspondente.
	const [created] = await db
		.insert(chatAssignments)
		.values({
			organizacaoId: input.organizacaoId,
			chatId: input.chatId,
			responsavelTipo: "NAO_ATRIBUIDO",
			status: input.status ?? "ABERTO",
			dataAtribuicao: input.now,
		})
		// Webhooks concorrentes disputam este find-then-insert; o índice único
		// parcial (um atendimento ativo por chat) faz o segundo insert conflitar.
		.onConflictDoNothing()
		.returning();
	if (created) return created;

	return getCurrentChatAttendance(db, input);
}
```

### 2.5 `markChatNeedsResponse` — com a correção do ternário morto

```typescript
export async function markChatNeedsResponse(
	db: TAttendanceDb,
	input: { organizacaoId: string; chatId: string; messageDate: Date; now?: Date },
) {
	const now = input.now ?? new Date();
	const current = await ensureCurrentAttendance(db, { ...input, now, status: "ABERTO" });
	if (!current) return null;

	// Uma nova entrada do cliente sempre reabre a pendência, inclusive sobre um
	// ticket RESOLVIDO. (O Control tinha aqui um ternário cujos dois ramos
	// resolviam "ABERTO" — attendance-state.ts:89-90.)
	const [updated] = await db
		.update(chatAssignments)
		.set({ status: "ABERTO", dataUltimaEntradaCliente: input.messageDate })
		.where(eq(chatAssignments.id, current.id))
		.returning();

	return updated ?? null;
}
```

### 2.6 `markChatAnswered`

Idêntico ao Control (`attendance-state.ts:104-123`), com `source` presente na assinatura para telemetria/log — o Control aceita o parâmetro e não o usa. Aqui, logar `source` no caminho de erro é útil para distinguir resposta do hub de resposta da IA nos incidentes.

### 2.7 `markChatAttendedExternally`

Port literal de `attendance-state.ts:136-169`. O ponto essencial: se `current.responsavelTipo === "USUARIO"`, retorna o assignment **sem alterar** — uma resposta pelo celular não rouba a conversa de quem já a assumiu no hub.

### 2.8 `assumeChatAttendanceForUser` — melhoria sobre o Control

O Control faz `getActiveAssignment` → checa `responsavelTipo === "USUARIO"` → `assignChatAttendance` (`chat.service.ts:514-531`). Entre a leitura e a escrita cabe outro usuário. Aqui o `assumir` é um CAS de verdade:

```typescript
export async function assumeChatAttendanceForUser(
	db: TAttendanceDb,
	input: { organizacaoId: string; chatId: string; usuarioId: string; now?: Date },
) {
	const now = input.now ?? new Date();
	// Garante que existe um ticket ativo antes do CAS.
	const ensured = await ensureCurrentAttendance(db, { ...input, now, status: "ABERTO" });
	if (!ensured) return null;

	const pending = await getChatPendingState(db, input);

	const [assumed] = await db
		.update(chatAssignments)
		.set({
			responsavelTipo: "USUARIO",
			responsavelUsuarioId: input.usuarioId,
			responsavelAgenteId: null,
			atribuidoPorUsuarioId: input.usuarioId,
			dataAtribuicao: now,
			status: pending?.needsResponse ? "ABERTO" : "EM_ATENDIMENTO",
			dataLiberacao: null,
		})
		.where(
			and(
				eq(chatAssignments.id, ensured.id),
				eq(chatAssignments.organizacaoId, input.organizacaoId),
				notInArray(chatAssignments.status, CLOSED_ATTENDANCE_STATUSES),
				// Só assume o que não tem dono humano — ou o que já é seu (idempotente).
				or(
					isNull(chatAssignments.responsavelUsuarioId),
					eq(chatAssignments.responsavelUsuarioId, input.usuarioId),
				),
			),
		)
		.returning();

	// null aqui = outro usuário assumiu entre o ensure e o update. O chamador
	// deve responder 409 "Esta conversa já possui responsável.".
	return assumed ?? null;
}
```

`assignChatAttendance` continua existindo, **sem** o CAS, para o caso do gestor atribuindo a conversa a um terceiro (override consciente, autorizado por `atendimentos.finalizar`).

### 2.9 `claimChatAttendanceForAgent`

Port de `attendance-state.ts:221-247`, com `agenteId` opcional (nulo = IA da organização):

```typescript
.where(
	and(
		eq(chatAssignments.organizacaoId, input.organizacaoId),
		eq(chatAssignments.chatId, input.chatId),
		eq(chatAssignments.responsavelTipo, "NAO_ATRIBUIDO"),
		notInArray(chatAssignments.status, CLOSED_ATTENDANCE_STATUSES),
	),
)
```

### 2.10 Testes da camada

Sem infra de teste automatizado no repo hoje; usar um script pontual `scripts/…` descartável, ou validação manual via `psql`. Os cenários que **precisam** ser exercitados antes do merge da Fase 4:

| # | Cenário | Esperado |
| --- | --- | --- |
| 1 | Dois `ensureCurrentAttendance` concorrentes no mesmo chat | 1 linha em `chat_assignments`, nenhuma exceção |
| 2 | `assumeChatAttendanceForUser` por dois usuários simultâneos | Um recebe o assignment, o outro `null` |
| 3 | `claimChatAttendanceForAgent` depois de um `assumir` humano | `null`; assignment segue `USUARIO` |
| 4 | `markChatAttendedExternally` com dono `USUARIO` | Assignment inalterado |
| 5 | `markChatAnswered` duas vezes | `data_primeira_resposta` não muda na 2ª |
| 6 | `changeChatAttendanceStatus('ENCERRADO')` → `markChatNeedsResponse` | Novo assignment criado (o índice único liberou) |
| 7 | `releaseChatAttendance` com pendência do cliente | `NAO_ATRIBUIDO` + `ABERTO` |

---

## Fase 3 — Rotas de API

App Router, convenções do `CLAUDE.md` (input schema → service function → route handler → `appApiHandler`). **Não tRPC.**

### 3.1 `GET /api/chats` — inbox

```typescript
const GetChatsInputSchema = z.object({
	whatsappConexaoTelefoneId: z
		.string({ invalid_type_error: "Tipo inválido para o ID do telefone da conexão." })
		.optional()
		.nullable(),
	view: z
		.string({ invalid_type_error: "Tipo inválido para a visão da caixa de entrada." })
		.optional()
		.nullable()
		.transform((v) => ChatInboxViewEnum.catch("MINHAS").parse(v ?? "MINHAS")),
	search: z.string({ invalid_type_error: "Tipo inválido para a busca." }).optional().nullable(),
	cursor: z.string({ invalid_type_error: "Tipo inválido para o cursor." }).optional().nullable(),
	limit: z
		.string({ invalid_type_error: "Tipo inválido para o limite." })
		.optional()
		.nullable()
		.transform((v) => Math.min(v ? Number(v) : 20, 50)),
});
```

Resposta:

```typescript
{
	data: {
		items: Array<{
			id, clienteId, whatsappConexaoId, whatsappConexaoTelefoneId, whatsappTelefoneId,
			mensagensNaoLidas, ultimaMensagemData, ultimaMensagemEntradaData, ultimaMensagemSaidaData,
			whatsappJanelaDataExpiracao, dataInsercao,
			cliente: { id, nome, telefone },
			ultimaMensagem: { id, autorTipo, conteudoTexto, conteudoMidiaTipo, conteudoMidiaTextoProcessado, conteudoMidiaArquivoNome } | null,
			atendimentoAtivo: {
				id, status, responsavelTipo, prioridade, dataAtribuicao, dataLiberacao, transferenciaMotivo,
				responsavelUsuario: { id, nome, avatarUrl } | null,
			} | null,
		}>,
		hasMore: boolean,
		nextCursor: string | null,
	},
	message: "Chats carregados com sucesso.",
}
```

**A view entra no SQL**, ao contrário do Control:

```typescript
const viewCondition =
	input.view === "MINHAS"
		? eq(chatAssignments.responsavelUsuarioId, session.user.id)
		: input.view === "NAO_ATRIBUIDAS"
			? or(isNull(chatAssignments.id), eq(chatAssignments.responsavelTipo, "NAO_ATRIBUIDO"))
			: input.view === "COM_AGENTE"
				? eq(chatAssignments.responsavelTipo, "AGENTE")
				: undefined;
```

Construir com `db.select(...).from(chats)` + `leftJoin(clients)` + `leftJoin(chatMessages, eq(chats.ultimaMensagemId, chatMessages.id))` + `leftJoin(chatAssignments, and(eq(chatAssignments.chatId, chats.id), notInArray(chatAssignments.status, ["ENCERRADO","CANCELADO"])))`. O `leftJoin` do assignment é seguro contra duplicação de linhas **porque o índice único parcial garante no máximo um ativo por chat** — é a segunda razão pela qual esse índice existe.

Cursor keyset: `${ultimaMensagemData.getTime()}_${id}`, mesma forma da rota atual (`app/api/chats/route.ts:112-116`), com `or(lt(ultimaMensagemData, ts), and(eq(ultimaMensagemData, ts), lt(id, cursorId)))`. Ordenação `desc(ultimaMensagemData), desc(id)` — casada com `idx_chats_conexao_telefone_ultima_mensagem`.

Busca (`search`): `ilike(clients.nome, pattern)` OU `ilike(clients.telefone, pattern)` OU `ilike(chatMessages.conteudoTexto, pattern)` — a terceira só funciona sobre a última mensagem, o que é intencional (busca full-text no histórico é outra iniciativa). ⚠️ A busca por telefone e por conteúdo não tem índice trigram; se ficar lenta, `pg_trgm` + GIN em `clients.nome` é a saída, fora do escopo desta migration.

### 3.2 `POST /api/chats` — abrir/recuperar chat por cliente

Mantém o contrato atual, com duas mudanças:

- Passa a usar `insert(...).onConflictDoNothing({ target: [chats.organizacaoId, chats.clienteId, chats.whatsappTelefoneId] })` + re-leitura, em vez do find-then-insert de `app/api/chats/route.ts:175-205`.
- **Deixa de criar `chatServices`**. O assignment nasce no primeiro `markChatNeedsResponse`/`markChatAnswered`, ou pelo `assumir` explícito.

### 3.3 `GET /api/chats/messages` — thread

Keyset descendente por `(data_envio, id)`. Retorno:

```typescript
{
	data: {
		chat: {
			id, clienteId, whatsappConexaoId, whatsappConexaoTelefoneId, whatsappTelefoneId,
			mensagensNaoLidas, whatsappJanelaDataExpiracao, ultimaMensagemEntradaData, ultimaMensagemSaidaData,
			cliente: { id, nome, telefone },
			conexaoTipo: "META_CLOUD_API" | "INTERNAL_GATEWAY",
			atendimentoAtivo: { … } | null,
		},
		items: Array<TChatMessageForHub>,   // ordem DESC (mais recente primeiro), como no Control
		nextCursor: { dataEnvio: string; id: string } | null,
		hasMoreOlder: boolean,
	},
	message: "Mensagens carregadas com sucesso.",
}
```

`TChatMessageForHub` é o `mapChatMessage` do Control (`chat.service.ts:97-130`) adaptado: sem `autorAgente`, com `autorUsuario: { id, nome, avatarUrl }`, `statusEntrega`, `whatsappEcho`, `clienteMensagemId`, `metadados`, e `conteudoMidiaUrl` já resolvido por `getChatMediaUrl(conteudoMidiaStorageId)` quando houver storage id (comportamento já presente em `app/api/chats/messages/route.ts:100`).

⚠️ **Mudança de ordenação**: a rota atual faz `enrichedMessages.reverse()` (`messages/route.ts:110`) e devolve ASC. O hub novo consome DESC (o `ChatThread` do Control usa `flex-col-reverse`). Trocar isso e o consumidor no mesmo commit.

`limit` default **30** (Control), máximo 100.

### 3.4 `POST /api/chats/messages` — envio unificado

Substitui `messages` + `messages/send-whatsapp`. Uma requisição: persiste, envia, atualiza denormalização, marca respondido.

```typescript
const CreateChatMessageInputSchema = z
	.object({
		chatId: z.string({ required_error: "ID do chat não informado." }),
		clienteMensagemId: z.string({ invalid_type_error: "Tipo inválido para o ID da mensagem do cliente." }).optional().nullable(),
		texto: z.string({ invalid_type_error: "Tipo inválido para o texto." }).max(4096, "A mensagem não pode ter mais de 4096 caracteres.").optional().nullable(),
		assinaturaAtiva: z.boolean({ invalid_type_error: "Tipo inválido para a assinatura." }).default(false),
		midia: z
			.object({
				tipo: z.enum(["IMAGEM", "VIDEO", "AUDIO", "DOCUMENTO"]),
				base64: z.string(),
				mimeType: z.string(),
				arquivoNome: z.string().optional().nullable(),
			})
			.optional()
			.nullable(),
		template: z
			.object({
				messageTemplateId: z.string(),
				variaveis: z.record(z.string()).optional().nullable(),
			})
			.optional()
			.nullable(),
	})
	.superRefine((input, ctx) => {
		if (!input.texto?.trim() && !input.midia && !input.template) {
			ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["texto"], message: "Informe texto, anexo ou template para enviar." });
		}
	});
```

Ordem de execução do service:

1. Ler chat + cliente + conexão (`tipoConexao`, `token`, `gatewaySessaoId`, `gatewayStatus`).
2. Checar recurso da org: `session.membership.organizacao.configuracao.recursos.hubAtendimentos.acesso` (regra que já existe em `messages/route.ts:167-170`) → 403.
3. Checar permissão `atendimentos.responder` → 403.
4. **Checar posse**: `getCurrentChatAttendance` deve retornar `responsavelTipo === "USUARIO" && responsavelUsuarioId === session.user.id`, senão 403 `"Assuma este atendimento antes de enviar mensagens."` (Control, `chat.service.ts:340-342`).
5. **Checar janela** (só `META_CLOUD_API`): `whatsappJanelaDataExpiracao != null && > now`. Fora da janela, **exigir** `template` — se não veio, 412 `"Janela de 24h expirada. Envie um template aprovado para reabrir a conversa."` O template precisa pertencer à organização e estar aprovado **para o número em uso** — a aprovação é por telefone, em `metadados.porNumeroTelefone[<whatsappTelefoneId>].status === "APROVADO"` (`schemas/message-templates.ts:171-186`), **não** na coluna `status` da tabela (que é `RASCUNHO | ATIVO | ARQUIVADO`, o ciclo de vida interno). `INTERNAL_GATEWAY` não tem janela.
6. Upload de mídia para o Supabase Storage (`uploadChatMedia`), se houver.
7. Montar o texto: `midia?.tipo === "AUDIO" ? "" : assinaturaAtiva && texto ? \`${session.user.nome}:\n${texto}\` : texto` (Control, `chat.service.ts:355`).
8. **Inserir a mensagem em `PENDENTE`** — antes do envio, para que uma falha do provider deixe rastro.
9. Enviar pelo provider. Meta: `sendBasicWhatsappMessage` / `sendMediaWhatsappMessage` / `sendTemplateWhatsappMessage`. Gateway: `sendInternalGatewayMessage` com `{ clientMessageId: <id da mensagem> }`.
10. `UPDATE chatMessages SET statusEntrega = 'ENVIADA' | 'PENDENTE', whatsappMessageId, provedorStatusDataAtualizacao, metadados` conforme o provider. (Gateway devolve `jobId` e fica `PENDENTE` até o webhook confirmar.)
11. `UPDATE chats SET ultimaMensagemId, ultimaMensagemData, ultimaMensagemSaidaData` — e, se foi template fora da janela pela Meta, **não** reabrir a janela: a janela só reabre com resposta do cliente. ⚠️ Isso corrige `send-whatsapp/route.ts:276-282`, que hoje marca `status: "ABERTA"` no envio de template — um erro de modelo, porque a Meta só abre a janela quando **o cliente** responde.
12. `markChatAnswered({ source: "HUB" })`.
13. Em caso de exceção no passo 9: `UPDATE chatMessages SET statusEntrega = 'FALHA'` e re-lançar.

Retorno: `{ data: <TChatMessageForHub da mensagem persistida>, message: "Mensagem enviada com sucesso." }` — o `ChatThread` reconcilia o otimista por `clienteMensagemId`.

Retry: `POST /api/chats/messages/retry` com `{ messageId }` — só aceita `statusEntrega === 'FALHA'`, reconstrói o input a partir da mensagem persistida e repete os passos 9–13.

### 3.5 `PATCH /api/chats/assignments` — ações de atendimento

Multi-ação, no padrão já usado em `PATCH /api/chats/[chatId]`:

```typescript
const UpdateChatAssignmentInputSchema = z.discriminatedUnion("acao", [
	z.object({ acao: z.literal("assumir"), chatId: z.string() }),
	z.object({ acao: z.literal("transferir"), chatId: z.string(), usuarioDestinoId: z.string(), motivo: z.string().max(1000).optional().nullable(), prioridade: ChatAssignmentPriorityEnum.optional().nullable() }),
	z.object({ acao: z.literal("liberar"), chatId: z.string(), motivo: z.string().max(1000).optional().nullable() }),
	z.object({ acao: z.literal("alterar_status"), chatId: z.string(), status: ChatAssignmentStatusEnum }),
	z.object({ acao: z.literal("alterar_prioridade"), chatId: z.string(), prioridade: ChatAssignmentPriorityEnum.nullable() }),
	z.object({ acao: z.literal("atribuir"), chatId: z.string(), usuarioDestinoId: z.string() }),
]);
```

| Ação | Permissão | Erros específicos |
| --- | --- | --- |
| `assumir` | `responder` | 409 `"Esta conversa já possui responsável."` quando o CAS devolve `null` |
| `transferir` | `receberTransferencias` (ou posse) | 400 se o destino não é membro ativo da organização |
| `liberar` | posse ou `finalizar` | 409 se não há atendimento ativo |
| `alterar_status` | posse ou `finalizar` | |
| `alterar_prioridade` | posse ou `finalizar` | |
| `atribuir` | `finalizar` (gestão) | override consciente sobre dono existente |

O destino da transferência é validado com um join em `organizationMembers` + `users.ativo`, espelhando `chat.service.ts:548-553`.

### 3.6 `PATCH /api/chats/[chatId]`

- Mantém `mark_as_read`, agora gravando `mensagensNaoLidas = 0`, `ultimaLeituraData = now`, `ultimaLeituraPorUsuarioId = session.user.id`. **Deixa de atualizar `chatMessages.status`** (a coluna some).
- **Remove** `update_status` (não existe mais status de chat).
- ⚠️ Corrigir a derivação do param: hoje os exports fazem `req.nextUrl.pathname.split("/").pop()` (`[chatId]/route.ts:165,169`) em vez de usar o `context.params` do App Router. Passar o contexto corretamente pelo `appApiHandler`.

### 3.7 `GET /api/chats/context`

Atendimento ativo + contexto de cliente, para a aba "Cliente" do painel. Compõe:

- `getCurrentChatAttendance`;
- o contexto de cliente já existente em `app/api/clients/context/route.ts` (`getClientContext`) — **reusar a função**, não duplicar a query; extrair para `lib/clients/context.ts` se ela estiver acoplada ao handler;
- saldo de cashback do cliente.

### 3.8 Rotas removidas

| Arquivo | Motivo |
| --- | --- |
| `app/api/chats/messages/send-whatsapp/route.ts` | Absorvida por `POST /api/chats/messages` |
| `app/api/chats/messages/[messageId]/route.ts` | Escrevia status legado; substituída pelo webhook + `retry` |
| `app/api/chats/services/transfer/route.ts` | Substituída por `PATCH /api/chats/assignments` |

### 3.9 `lib/queries/chats.ts` e `lib/mutations/chats.ts`

- Tipos importados exclusivamente das rotas (`TGetChatsOutput`, `TGetChatMessagesOutput`, …).
- Hooks: `useChats({ whatsappConexaoTelefoneId, view, search })`, `useChatMessages({ chatId })` (infinite, `getNextPageParam` do `nextCursor` objeto), `useChatAttendanceContext({ chatId })`.
- Query keys expostas junto com o hook (convenção do `CLAUDE.md`).
- **Remover**: `useChatSummary` (rota inexistente) e o `console.log("[TESTING] [useChats] Rerendering...")` (`lib/queries/chats.ts:67`).
- Mutations: `sendChatMessage`, `retryChatMessage`, `updateChatAssignment`, `markChatRead` — wrappers Axios puros, sem React Query.

---

## Fase 4 — Webhooks e IA

Arquivos: `app/api/integrations/whatsapp/route.ts` (Meta, 1079 linhas) e `app/api/integrations/whatsapp/gateway/route.ts` (Internal Gateway, 897 linhas).

### 4.1 Inbound

```
1. Resolver conexão/telefone pelo whatsappTelefoneId (já existe)
2. find-or-create cliente (já existe)
3. UPSERT do chat pela chave natural:
     insert(chats).values({...}).onConflictDoUpdate({
       target: [chats.organizacaoId, chats.clienteId, chats.whatsappTelefoneId],
       set: { whatsappConexaoId, whatsappConexaoTelefoneId },
     }).returning()
4. Download/armazenamento de mídia (já existe)
5. insert(chatMessages) com:
     clienteId, autorTipo: "CLIENTE", autorClienteId,
     statusEntrega: "ENTREGUE", whatsappMessageId, metadados (referral CTWA + whatsappMidia)
6. update(chats) com:
     ultimaMensagemId, ultimaMensagemData, ultimaMensagemEntradaData,
     mensagensNaoLidas: sql`${chats.mensagensNaoLidas} + 1`,
     whatsappJanelaDataExpiracao: <now + 24h>   // SOMENTE Meta; Gateway = null
7. markChatNeedsResponse({ organizacaoId, chatId, messageDate })
8. Disparo da IA (ver §4.3)
```

⚠️ Passo 6: usar `sql\`${chats.mensagensNaoLidas} + 1\`` e **não** `existingChat.mensagensNaoLidas + 1` como hoje (`whatsapp/route.ts:586`) — o valor lido pode estar velho sob concorrência de webhooks.

### 4.2 Echo (Coexistence) e status

- **Echo**: `whatsappEcho: true`, `autorTipo: "BUSINESS-APP"`, e `markChatAttendedExternally`.
- **Status**: `UPDATE chatMessages SET statusEntrega = <mapeado>, provedorStatusDataAtualizacao = now WHERE whatsappMessageId = ? AND organizacaoId = ?` (agora indexado). Mapeamento Meta → `statusEntrega`: `sent → ENVIADA`, `delivered → ENTREGUE`, `read → LIDA`, `failed → FALHA`.
- ⚠️ **Não regredir status**: um `sent` que chegue depois de um `read` não deve rebaixar a mensagem. Guardar com `AND status_entrega NOT IN ('LIDA','FALHA')` para os status intermediários.

### 4.3 Debounce da IA

Sai a coluna `ai_agendamento_resposta_data`, entra o padrão do Control (`chat-trigger.ts:245-275`):

```typescript
// 1. A IA só entra se conseguir claimar o ticket.
const claimed = await claimChatAttendanceForAgent(db, { organizacaoId, chatId });
if (!claimed) return; // humano ou telefone assumiu — a IA recua

// 2. Debounce por sleep + re-checagem.
await sleep(AI_RESPONSE_DELAY_MS); // 5s, constante já existente

// 3. Aborta se chegou mensagem mais nova do cliente…
const latestClientMessage = await db.query.chatMessages.findFirst({
	where: and(eq(chatMessages.chatId, chatId), eq(chatMessages.autorTipo, "CLIENTE")),
	orderBy: [desc(chatMessages.dataEnvio), desc(chatMessages.id)],
	columns: { id: true },
});
if (latestClientMessage?.id !== messageId) return;

// 4. …ou se já houve resposta depois do inbound.
const outboundAfterIncoming = await db.query.chatMessages.findFirst({
	where: and(
		eq(chatMessages.chatId, chatId),
		inArray(chatMessages.autorTipo, ["USUÁRIO", "AI", "BUSINESS-APP"]),
		gt(chatMessages.dataEnvio, messageDate),
	),
	columns: { id: true },
});
if (outboundAfterIncoming) return;

// 5. Re-checa a posse antes de gastar tokens.
const current = await getCurrentChatAttendance(db, { organizacaoId, chatId });
if (current?.responsavelTipo !== "AGENTE") return;
```

O gate de habilitação continua sendo `connectionPhone.permitirAtendimentoIa` (`whatsapp/route.ts:439`).

⚠️ O `sleep` roda dentro do handler do webhook. Isso já é assim hoje (`whatsapp/route.ts:838-841`) e mantém o comportamento, mas é uma bomba de timeout em serverless: 5s de sleep + a chamada ao modelo pode estourar o limite da função. **Não é regressão desta iniciativa**, mas registrar como dívida — o caminho certo é uma fila (`app/api/cron/process-interactions` já existe como precedente de processamento assíncrono).

### 4.4 Handoff IA → humano

`lib/ai/ai-agent/transfer-service-to-human.ts` (229 linhas) é reescrito sobre a camada de estado:

- Handoff explícito pela tool: `transferChatAttendance({ usuarioDestinoId, motivo: \`HUMAN_HANDOFF: [${prioridade}] ${motivo}\` })` quando há destinatário definido; `releaseChatAttendance({ motivo })` quando é "devolver para a fila".
- Humano respondendo pelo hub encerra o episódio da IA: no passo 12 de [§3.4](#34-post-apichatsmessages--envio-unificado), se o assignment corrente era `AGENTE`, `closeChatAttendance({ status: "ENCERRADO", resultado: "HUMAN_HANDOFF" })` — equivalente a `closeAgentAssignmentsForHumanHandoff` do Control (`chat-trigger.ts:125-144`). Com o CAS do `assumir` isso raramente dispara, mas cobre o caminho de gestor atribuindo por cima.
- O template de notificação ao humano (`WHATSAPP_REPORT_TEMPLATES`) que a implementação atual dispara permanece.

### 4.5 Cron de invalidação de janela

`app/api/cron/invalidate-chat-windows/route.ts`, no padrão dos crons existentes (`assertCronAuthorized` + `appApiHandler`):

```typescript
await db
	.update(chats)
	.set({ whatsappJanelaDataExpiracao: null })
	.where(and(isNotNull(chats.whatsappJanelaDataExpiracao), lt(chats.whatsappJanelaDataExpiracao, new Date())));
```

Registrar em `vercel.json` (mesma seção dos crons atuais). Frequência: 15 min é suficiente — a UI já calcula "expirada" pelo timestamp; o cron existe para que o **realtime** dispare um UPDATE e a sidebar reflita a mudança sem refetch.

### 4.6 Extração da duplicação (recomendado, não bloqueante)

Os dois webhooks repetem, quase linha a linha, os passos 2–7 de [§4.1](#41-inbound). Extrair para `lib/chats/incoming-message.ts` (referência: `src/lib/chats/incoming-whatsapp.ts` no Control, 390 linhas) com a assinatura:

```typescript
export async function persistIncomingChatMessage(input: {
	organizacaoId: string;
	conexao: { id: string; telefoneId: string; whatsappTelefoneId: string; tipoConexao: "META_CLOUD_API" | "INTERNAL_GATEWAY" };
	cliente: { id: string };
	mensagem: { whatsappMessageId: string | null; texto: string | null; midia: TIncomingMedia | null; dataEnvio: Date; echo: boolean };
	metadados: TChatMessageMetadata | null;
}): Promise<{ chatId: string; messageId: string; dataEnvio: Date }>;
```

É a maior fonte de divergência do módulo hoje e o custo de extrair é baixo depois que a camada de estado existe.

---

## Fase 5 — UI/UX (port do hub)

Substituir `components/Chats/**` (4637 linhas hoje) pela arquitetura do Control, adaptada às convenções daqui (shadcn, React Query + Axios, sem tRPC).

### 5.1 Árvore alvo

```
components/Chats/
	ChatHub.tsx                 # shell: sidebar + thread + painel, responsividade
	ChatSidebar.tsx             # inbox
	ChatInboxListItem.tsx
	ChatThread.tsx              # lista + merge otimista + realtime
	ChatMessageBubble.tsx
	ChatInputArea.tsx
	ChatContextPanel.tsx        # 3 abas
	ChatAssignmentActions.tsx
	ChatAudioPlayer.tsx         # reaproveitar MediaMessageDisplayAudioPlayer existente
	WhatsAppMessageText.tsx
	MediaAiContextDisclosure.tsx
	Hooks/useAudioRecorder.ts   # MANTIDO
	AudioRecordingModal.tsx     # MANTIDO
	FileUploadComponent.tsx     # MANTIDO/adaptado
lib/chats/
	chat-list-preview.ts
	media-ai-context.ts
	whatsapp-window-status.ts
```

### 5.2 `ChatSidebar`

- Dropdown de view: **Livres** (`NAO_ATRIBUIDAS`) / **Minhas** / **IA** (`COM_AGENTE`) / **Todas**. Default: `MINHAS`.
- Seletor de número WhatsApp com chip removível (substitui o seletor atual de conexão).
- Busca: **server-side** via `?search=`, com debounce de 350ms (`useDebounceMemo`, já usado em `lib/queries/chats.ts:48`). ⚠️ Divergência intencional do Control, que filtra em memória (`ChatSidebar.tsx:161-170`) — lá a lista inteira já está no cliente.
- Item (`ChatInboxListItem`): ponto de status da janela (verde/âmbar/vermelho via `getWhatsappWindowDisplay`), tempo relativo, badge de não lidas (`99+`), preview com "Você:" e ícone de mídia (via `getChatListMessagePreview`), linha do responsável (avatar do usuário / ícone `Smartphone` para `EXTERNO` / ícone de bot para `AGENTE`) e chip Automação/Humano.

### 5.3 `ChatThread`

- Lista em `flex-col-reverse` consumindo `items` em DESC.
- **Merge otimista**: mensagens locais com `clienteMensagemId` (UUID gerado no cliente) + mensagens persistidas; ao chegar a persistida (por resposta HTTP **ou** por realtime), remover a otimista com o mesmo `clienteMensagemId`. Dedupe final por `id`.
- Agrupamento por autor (bolhas consecutivas do mesmo autor perdem o cabeçalho), `DateSeparator` por dia.
- Pílula "N novas" quando o usuário está scrollado para cima; "Carregar mensagens anteriores" no topo (`fetchNextPage`).
- Header com status da janela + `ChatAssignmentActions`.
- `markChatRead` disparado quando a última mensagem persistida muda e o autor é `CLIENTE`, com **update otimista no cache** (a aba originadora não recebe eco realtime do próprio write).

### 5.4 `ChatMessageBubble`

Estilização do Control (`ChatMessageBubble.tsx`):

| Aspecto | Regra |
| --- | --- |
| Forma | `rounded-2xl` com rabinho assimétrico: `rounded-tr-md` (saída) / `rounded-tl-md` (entrada) |
| Largura | máx. 72% do container |
| Tons | `primary` = humano; `muted` = IA e echo; `card`/`outline` = cliente; `destructive` = falha |
| Meta inline | hora + ticks: 1 check `ENVIADA`, 2 checks `ENTREGUE`, 2 checks azuis `LIDA`, ícone de alerta `FALHA` |
| Formatação | parser WhatsApp: `*negrito*`, `_itálico_`, `~riscado~`, `` `code` ``, autolink (`WhatsAppMessageText`) |
| Mídia com IA | disclosure "Ver análise da IA" com `conteudoMidiaTextoProcessado[Resumo]` (`MediaAiContextDisclosure`) |
| CTWA | preview do anúncio Meta a partir de `metadados.whatsappReferral` |
| Otimista | `opacity-70` |
| Falha | botão "Tentar novamente" → **`onRetry` conectado** (fix sobre o Control, que nunca passa a prop) |

### 5.5 `ChatInputArea`

- Textarea auto-resize; Enter envia, Shift+Enter quebra linha.
- Anexos com preview; gravação de áudio **reaproveitando** `useAudioRecorder` e `AudioRecordingModal` já existentes.
- Switch "Assinar como {nome}" persistido em `localStorage` (chave por organização).
- **Estado de janela expirada**: cadeado + seletor de template enviável direto do hub, preenchendo variáveis quando o template as tiver. A lista mostra apenas templates com `metadados.porNumeroTelefone[<whatsappTelefoneId>].status === "APROVADO"` para o número selecionado — o mesmo filtro que a rota aplica. Este é o item que fecha a lacuna nº 4 do Control.
- **Estado sem posse**: se `atendimentoAtivo.responsavelUsuarioId !== user.id`, o input fica desabilitado com CTA "ASSUMIR ATENDIMENTO" — evita o 403 do passo 4 de [§3.4](#34-post-apichatsmessages--envio-unificado) virar um erro de toast.

### 5.6 `ChatContextPanel`

`aside` `w-80`; em mobile, dentro de um `Sheet`. Três abas:

1. **Atendimento** — ações rápidas (ASSUMIR com label contextual "ASSUMIR DA IA" / "ASSUMIR DO TELEFONE", card do responsável, select de transferência, LIBERAR), status editável inline (7 status), prioridade, canal, número, janela (verde/âmbar/vermelho com CTA de template).
2. **Cliente** — substitui a aba "Vínculos" do Control: identidade + badge RFM, destaque de cashback, últimas compras, ticket médio / qtde. de compras — reuso/refatoração de `ClientContextContent` (`app/dashboard/commercial/sales/new-sale/components/context/ClientContextContent.tsx`).
3. **Atividade** — métricas (não lidas, última entrada ↙, última saída ↗ em tempo relativo, tempo até 1ª resposta) e atalhos de CRM pertinentes.

### 5.7 Deleções

| Arquivo | Motivo |
| --- | --- |
| `components/Chats/Components/ServiceBanner*` / `ServiceConclusionDialog.tsx` | Chamam rota inexistente; conceito de "serviço" morre |
| `components/Chats/Components/README.md` | Descreve uma API antiga com Convex |
| `components/Chats/Components/{Root,Layout,Content,List,Header,Messages,Input,context,index}.tsx` | Substituídos pela árvore de [§5.1](#51-árvore-alvo) |

Bugs que somem por tabela: hooks depois de early return em `Content.tsx`, `whatsappConnection` singular inexistente em `Input.tsx`, `userHasMessageSendingPermission={true}` hardcoded em `ChatsMain.tsx:22`.

---

## Fase 6 — Realtime (Supabase postgres_changes)

Evoluir de invalidate-and-refetch (`lib/hooks/use-supabase-realtime.ts`, que só sabe invalidar query keys) para o **patch cirúrgico no cache** do Control.

⚠️ Os hooks `useChatsRealtime` e `useChatMessagesRealtime` de `lib/hooks/use-supabase-realtime.ts:178-214` **não servem** para o hub novo: eles invalidam a lista inteira a cada evento, o que num hub com tráfego real produz refetch contínuo. Manter o `useSupabaseRealtime` genérico (outros módulos o usam), mas escrever os canais do chat direto com `supabaseClient.channel(...)`, como o Control faz.

### 6.1 Canal `chats-sidebar-{organizacaoId}`

| Evento | Ação |
| --- | --- |
| `UPDATE` em `ampmais_chats` (filtro `organizacao_id=eq.{orgId}`) | Se `ultima_mensagem_id` mudou → `invalidateQueries` da lista. Senão → `setQueryData` com patch de `ultimaMensagemData`, `ultimaMensagemEntradaData`, `ultimaMensagemSaidaData`, `mensagensNaoLidas`, `whatsappJanelaDataExpiracao` + reordenação local |
| `*` em `ampmais_chat_assignments` (filtro `organizacao_id=eq.{orgId}`) | `invalidateQueries` da lista (o assignment muda a view a que o chat pertence) |
| `INSERT` em `ampmais_chats` | `invalidateQueries` se o chat pertence ao telefone selecionado |
| `subscribe` → `SUBSCRIBED` (a partir da 2ª vez) | `invalidateQueries` — recuperação de reconexão |

⚠️ Nomes de tabela **com prefixo** (`ampmais_chats`, `ampmais_chat_assignments`, `ampmais_chat_messages`) e filtro por `organizacao_id`, não `parceiro_id`.

⚠️ A lista é paginada por cursor (`useInfiniteQuery`), então o patch precisa percorrer `data.pages[].items` — não é o `setData` de array plano do Control. Reordenar **dentro da página** e aceitar que um chat pode ficar "fora de ordem" entre páginas até o próximo refetch: o alternativo (reordenação global) invalidaria o contrato do cursor.

### 6.2 Canal `chat-thread-{chatId}`

| Evento | Ação |
| --- | --- |
| `INSERT` em `ampmais_chat_messages` (filtro `chat_id=eq.{chatId}`) | Mapear row snake_case → camelCase; remover a otimista com o mesmo `cliente_mensagem_id`; inserir no cache infinito (página mais recente, dedupe por id); se `autor_tipo = 'CLIENTE'` → `markChatRead` |
| `UPDATE` em `ampmais_chat_messages` | Patch de `status_entrega`, `conteudo_midia_texto_processado`, `whatsapp_message_id`, `provedor_status_data_atualizacao` |
| `*` em `ampmais_chat_assignments` (filtro `chat_id=eq.{chatId}`) | `refetch` do chat/atendimento |
| `UPDATE` em `ampmais_chats` (filtro `id=eq.{chatId}`) | Patch de janela / não lidas no objeto `chat` do cache |
| `SUBSCRIBED` (reconexão) | `refetch` |

Escrever o mapeador `mapRealtimeMessageRow(row): TChatMessageForHub` num único lugar (`lib/chats/realtime-mappers.ts`) e usá-lo nos dois canais — é o ponto onde snake_case do Postgres encontra camelCase da API, e duplicá-lo garante divergência.

### 6.3 Pré-requisitos no Supabase (verificar **antes** do deploy)

1. **Replication habilitada** para `ampmais_chat_assignments` (tabela nova — não entra na publicação automaticamente). Conferir:
   ```sql
   SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename LIKE 'ampmais_chat%';
   ```
   Se faltar: `ALTER PUBLICATION supabase_realtime ADD TABLE "ampmais_chat_assignments";`
2. **`REPLICA IDENTITY`**: o patch de `UPDATE` usa `payload.old.ultima_mensagem_id` para decidir invalidar vs. patchar. Com `REPLICA IDENTITY DEFAULT` o `old` traz **apenas a PK**. Ou setar `ALTER TABLE "ampmais_chats" REPLICA IDENTITY FULL;` (custo de WAL) ou reescrever a decisão sem depender do `old` — por exemplo, comparar `row.ultima_mensagem_id` com o valor que já está no cache. **Preferir a segunda**: mesma correção, custo zero. ⚠️ O Control depende do `old` (`ChatSidebar.tsx:113-114`) e provavelmente só funciona lá por ter `REPLICA IDENTITY FULL`.
3. **RLS** das três tabelas: os canais filtram por organização/chat, não por tenant. O isolamento depende de RLS que **não está versionada neste repo**. Validar manualmente que `ampmais_chats`, `ampmais_chat_messages` e `ampmais_chat_assignments` têm políticas que impedem um cliente autenticado de outra organização de se inscrever no canal.

---

## 13. Permissões

`session.membership.permissoes.atendimentos` (`schemas/organizations.ts:574-598`) tem 5 flags. Mapeamento:

| Flag | Significado no hub | Rotas que checam |
| --- | --- | --- |
| `visualizar` | Ver o hub, listar chats, ler mensagens e contexto | `GET /api/chats`, `GET /api/chats/messages`, `GET /api/chats/context`, `PATCH /api/chats/[chatId]` (`mark_as_read`) |
| `iniciar` | Abrir um chat novo com um cliente | `POST /api/chats` |
| `responder` | Enviar mensagens e assumir atendimento | `POST /api/chats/messages`, `PATCH /api/chats/assignments` (`assumir`) |
| `receberTransferencias` | Ser destino de transferência e transferir | `PATCH /api/chats/assignments` (`transferir`, `liberar`) |
| `finalizar` | Gestão: alterar status/prioridade e atribuir a terceiros de **qualquer** atendimento | `PATCH /api/chats/assignments` (`alterar_status`, `alterar_prioridade`, `atribuir`) |

Regra composta em toda ação de mutação de assignment: **posse OU gestão** —

```typescript
function mayManageAssignment(session: TAuthUserSession, assignment: TChatAssignmentEntity | null) {
	return assignment?.responsavelUsuarioId === session.user.id || !!session.membership?.permissoes.atendimentos.finalizar;
}
```

Além das permissões de membro, todo acesso ao hub exige o **recurso** da organização: `session.membership.organizacao.configuracao.recursos.hubAtendimentos.acesso` (`schemas/organizations.ts:142-151`). A regra já existe em `POST /api/chats/messages` e deve subir para o `GET /api/chats` também.

No cliente, `ChatsMain.tsx` passa a derivar as flags da sessão e a propagá-las (fim do `userHasMessageSendingPermission={true}`).

`hubAtendimentos.limiteAtendentes` (assentos simultâneos) existe no schema e **não é aplicado hoje**. Fica fora do escopo desta iniciativa — registrar como dívida; a `chat_assignments` passa a ter os dados necessários para implementá-lo (`COUNT(DISTINCT responsavel_usuario_id) WHERE status ∉ fechados`).

---

## 14. Pontos de integração fora do módulo

| Arquivo | O que muda |
| --- | --- |
| `lib/interactions/send-reserved-interaction.ts` | Cria chats (`getOrCreateChatId`, linha ~98) e insere `chat_messages` para campanhas. Adaptar: upsert pela chave natural, `clienteId` na mensagem, `statusEntrega` no lugar de `whatsappMessageStatus` (a marcação de falha da linha 35 vira `statusEntrega: "FALHA"`), sem `ultima_mensagem_conteudo_*`. ⚠️ **Não** chamar `markChatAnswered` aqui: uma campanha em massa não é um atendimento, e criaria milhares de tickets `EM_ATENDIMENTO` sem dono. Deixar o assignment nascer só quando o cliente responder |
| `lib/client-portfolios/queue.ts` | Lê `max(chats.ultimaInteracaoClienteData)` → trocar por `ultimaMensagemEntradaData` |
| `lib/organizations/deletion.ts` | Ordem de deleção: trocar `chat_services` por `chat_assignments` |
| `app/api/admin/organizations/deletion-summary/route.ts` | Contagem: idem |
| `lib/whatsapp/smb-message-history-sync.ts` | Import de histórico: shape novo de mensagem (`clienteId`, `statusEntrega`, sem `aiAgendamentoRespostaData` na linha 483); **não** criar assignments — histórico importado não é atendimento |
| `app/api/integrations/ai/generate-response/route.ts` | Contexto da IA: `atendimentoId` passa a vir do assignment ativo; `resumo` no lugar de `descricao` |
| `lib/ai/ai-agent/transfer-service-to-human.ts` | Reescrito sobre a camada de estado (ver [§4.4](#44-handoff-ia--humano)) |
| `vercel.json` | Registrar o cron `invalidate-chat-windows` |
| `config/index.ts` + `components/Sidebar/AppSidebar.tsx` | Rota `/dashboard/chats` inalterada; revisar labels se necessário |

Comando de verificação de cobertura antes de fechar a Fase 3:

```bash
grep -rln "chatServices\|whatsappMessageStatus\|ultimaInteracaoClienteData\|aiAgendamentoRespostaData\|ultimaMensagemConteudo\|isEcho" \
	--include=*.ts --include=*.tsx . | grep -v node_modules
```

Deve retornar vazio ao fim da Fase 4 (exceto os arquivos SQL).

---

## 15. Riscos e mitigações

| # | Risco | Mitigação |
| --- | --- | --- |
| 1 | **Duplicatas na chave natural** — o UNIQUE da 0052 falha se não houver merge prévio | Bloco de merge de [§6.3](#63-merge-de-duplicatas-da-chave-natural), rodando **antes** do índice; diagnóstico prévio em [§16.1](#161-pré-migration-diagnóstico) |
| 2 | **Volume de `chat_messages`** nos backfills e criação de índices | Medir antes; se necessário, mover os `CREATE INDEX` para arquivo separado com `CONCURRENTLY` aplicado fora do script transacional ([§6.4](#64-índices-e-concurrently)) |
| 3 | **Janela entre 0052 e 0053** — o código velho continua escrevendo `chat_services`, `whatsapp_message_status` e `is_echo` | Backfills re-executáveis repetidos no topo da 0053 ([§6.6](#66-drizzle0053_chat_attendance_drop_legacysql-destrutiva)); `cliente_id` só vira NOT NULL na 0053 |
| 4 | **Múltiplos serviços abertos no mesmo chat** no legado | O `DISTINCT ON (chat_id)` do backfill migra só o mais recente; os demais ficam para trás com a tabela que será dropada. Contar antes ([§16.1](#161-pré-migration-diagnóstico)) |
| 5 | **RLS/replication do Supabase** não versionadas no repo | Checklist de [§6.3](#63-pré-requisitos-no-supabase-verificar-antes-do-deploy); validar manualmente antes do deploy da Fase 6 |
| 6 | **`REPLICA IDENTITY DEFAULT`** faz `payload.old` vir só com a PK | Não depender do `old` no patch da sidebar ([§6.2](#63-pré-requisitos-no-supabase-verificar-antes-do-deploy) item 2) |
| 7 | **Typecheck**: baseline com ~300 erros pré-existentes | `npx tsc --noEmit 2>&1 \| grep -E "app/api/chats\|components/Chats\|lib/chats\|services/drizzle/schema/chats"`; `npx oxlint <arquivo>` por arquivo é confiável |
| 8 | **Sleep da IA dentro do webhook** pode estourar timeout serverless | Comportamento pré-existente, não regressão. Registrar como dívida; caminho: fila via cron ([§4.3](#43-debounce-da-ia)) |
| 9 | **Envio de template não reabre a janela** — usuários podem esperar o contrário | Explicitar na UI: após enviar template, a janela segue "expirada" até o cliente responder ([§3.4](#34-post-apichatsmessages--envio-unificado) passo 11) |
| 10 | **Commits intermediários não compiláveis** entre as Fases 1 e 3 | Manter `chatServices` no schema Drizzle marcado `@deprecated` até o commit da Fase 3 |

---

## 16. Plano de validação

### 16.1 Pré-migration (diagnóstico)

Rodar em produção **antes** de escrever o SQL final; os números decidem `CONCURRENTLY` e o cuidado com o merge.

```sql
-- Volume
SELECT
	(SELECT count(*) FROM "ampmais_chats")         AS chats,
	(SELECT count(*) FROM "ampmais_chat_messages") AS mensagens,
	(SELECT count(*) FROM "ampmais_chat_services") AS servicos;

-- Duplicatas da chave natural
SELECT "organizacao_id", "cliente_id", "whatsapp_telefone_id", count(*) AS n
FROM "ampmais_chats"
WHERE "whatsapp_telefone_id" IS NOT NULL
GROUP BY 1, 2, 3 HAVING count(*) > 1
ORDER BY n DESC;

-- Chats com mais de um servico aberto
SELECT "chat_id", count(*) AS n
FROM "ampmais_chat_services"
WHERE "status" IN ('PENDENTE', 'EM_ANDAMENTO')
GROUP BY 1 HAVING count(*) > 1;

-- Distribuicao dos status legados de mensagem (valida o mapeamento)
SELECT "status", "whatsapp_message_status", count(*)
FROM "ampmais_chat_messages" GROUP BY 1, 2 ORDER BY 3 DESC;

-- Descricoes de servico com conteudo real (viram `resumo`)
SELECT count(*) FROM "ampmais_chat_services" WHERE "descricao" <> 'NÃO ESPECIFICADO';

-- Chats sem telefone (ficam fora do UNIQUE parcial)
SELECT count(*) FROM "ampmais_chats" WHERE "whatsapp_telefone_id" IS NULL;
```

### 16.2 Pós-0052 (integridade)

```sql
-- Um unico atendimento ativo por chat (deve retornar 0 linhas)
SELECT "chat_id", count(*) FROM "ampmais_chat_assignments"
WHERE "status" NOT IN ('ENCERRADO', 'CANCELADO') GROUP BY 1 HAVING count(*) > 1;

-- Todo chat tem ticket (deve retornar 0)
SELECT count(*) FROM "ampmais_chats" c
WHERE NOT EXISTS (SELECT 1 FROM "ampmais_chat_assignments" a WHERE a."chat_id" = c."id");

-- Coerencia responsavel_tipo x ids (deve retornar 0)
SELECT count(*) FROM "ampmais_chat_assignments"
WHERE ("responsavel_tipo" = 'USUARIO' AND "responsavel_usuario_id" IS NULL)
	OR ("responsavel_tipo" = 'NAO_ATRIBUIDO' AND "responsavel_usuario_id" IS NOT NULL);

-- Mensagens sem cliente_id (esperado: apenas as escritas pelo codigo velho pos-0052)
SELECT count(*) FROM "ampmais_chat_messages" WHERE "cliente_id" IS NULL;

-- Indices criados
SELECT indexname FROM pg_indexes
WHERE tablename IN ('ampmais_chats', 'ampmais_chat_messages', 'ampmais_chat_assignments')
ORDER BY 1;

-- Planos usando os indices novos
EXPLAIN ANALYZE
SELECT * FROM "ampmais_chat_messages" WHERE "chat_id" = '<id>' ORDER BY "data_envio" DESC, "id" DESC LIMIT 31;
EXPLAIN ANALYZE
SELECT * FROM "ampmais_chat_messages" WHERE "whatsapp_message_id" = '<wamid>';
```

### 16.3 Funcional (manual, por fase)

**Fase 3** — com dois usuários da mesma organização em navegadores diferentes:

- [ ] A lista respeita as 4 views e a paginação por cursor não repete nem pula chats.
- [ ] Usuário A assume; usuário B recebe 409 ao tentar assumir o mesmo chat.
- [ ] Usuário B não consegue enviar mensagem no chat de A (403 com a mensagem correta).
- [ ] A transfere para B; B passa a poder enviar; A não.
- [ ] `liberar` devolve para a fila e o chat aparece em "Livres" para os dois.
- [ ] `mark_as_read` zera o contador e grava `ultima_leitura_por_usuario_id`.

**Fase 4** — com um número de teste:

- [ ] Mensagem recebida cria chat + mensagem + ticket `ABERTO`, incrementa não lidas, seta a janela (Meta) ou deixa `null` (Gateway).
- [ ] Duas mensagens simultâneas do mesmo cliente não criam dois chats nem dois tickets.
- [ ] Webhook de status promove `ENVIADA → ENTREGUE → LIDA` e não regride.
- [ ] Resposta pelo celular (echo) muda o ticket para `EXTERNO` e o hub mostra "Atendido pelo telefone".
- [ ] Com `permitirAtendimentoIa` ligado e ninguém no chat, a IA claima e responde após ~5s.
- [ ] Um humano assumindo dentro dos 5s faz a IA recuar sem enviar nada.
- [ ] Handoff da IA transfere/libera e grava o motivo `HUMAN_HANDOFF: …`.

**Fase 5/6**:

- [ ] Mensagem enviada aparece otimista e é reconciliada (sem duplicar) quando o realtime chega.
- [ ] Duas abas do mesmo usuário convergem para o mesmo estado.
- [ ] Perder e recuperar a rede reinvalida os caches (evento `SUBSCRIBED` de reconexão).
- [ ] Falha de envio mostra o botão "Tentar novamente" e o retry funciona.
- [ ] Fora da janela: input bloqueado + envio de template aprovado funciona.

---

## 17. Rollback

| Momento | Como reverter |
| --- | --- |
| Após a 0052, antes do deploy | A 0052 é **puramente aditiva** exceto por dois pontos irreversíveis: o `DELETE` das duplicatas e o `DROP NOT NULL` de `ultima_mensagem_conteudo_tipo`/`conteudo_texto`. **Tirar um dump antes de aplicar** é obrigatório. O resto (tabela, colunas, índices) se reverte com `DROP TABLE ampmais_chat_assignments; ALTER TABLE … DROP COLUMN …; DROP TYPE chat_message_delivery_status;` |
| Após o deploy do código novo, antes da 0053 | Reverter o deploy. O código velho volta a funcionar: todas as colunas e a tabela `chat_services` ainda existem. Os assignments criados no período ficam órfãos e são recuperados pelo backfill re-executável quando o deploy voltar |
| Após a 0053 | **Sem rollback por migration.** As colunas e a tabela legadas foram apagadas. A volta é restauração de dump. Por isso a 0053 só entra depois de a Fase 6 estar estável em produção — sugestão: **uma semana** de operação normal entre os dois applies |

---

## 18. Ordem de commits

| # | Commit | Fase | Ação do dev |
| --- | --- | --- | --- |
| 1 | `feat: chat attendance schema + migrations 0052/0053` | 1 | Aplicar a **0052** |
| 2 | `feat: chat attendance state layer` | 2 | — |
| 3 | `refactor: rewrite chat API routes on assignment model` | 3 | — (inclui remoção de código morto e o drop de `chatServices` do schema Drizzle) |
| 4 | `refactor: webhooks and AI claim/handoff on attendance state` | 4 | — |
| 5 | `feat: new chat hub UI — sidebar` | 5a | — |
| 6 | `feat: new chat hub UI — thread and input` | 5b | — |
| 7 | `feat: new chat hub UI — context panel` | 5c | — |
| 8 | `feat: realtime cache patching for chat hub` | 6 | Validar replication + RLS no Supabase |
| 9 | `chore: chat window invalidation cron` | 4/6 | Registrar o cron no `vercel.json` |
| 10 | `chore: drop legacy chat service model` | — | Aplicar a **0053** (≥1 semana após o deploy do commit 8) |

Commits 3 e 4 devem ir para produção **juntos**: o webhook não pode continuar escrevendo `chat_services` enquanto as rotas já leem `chat_assignments`.
