# Chat Attendance Redesign — Plano de Implementação

> **Status**: aprovado, aguardando implementação
> **Origem da modelagem**: módulo de chatting do `syncroniza-control` (referido aqui como **Control**), aperfeiçoado e testado em produção com fluxos de atendimento transferível, claim concorrente e handoff de IA.
> **Escopo desta iniciativa**: modelagem + camada de estado + rotas + webhooks + UI/UX do hub + realtime. **Fora de escopo**: port das tabelas de AI Agents do Control (`ai_agents`, `ai_agent_runs`, `ai_agent_tool_calls`, etc.) — ver [Decisões](#decisões-fechadas).

---

## 1. Motivação

O módulo atual de chats do recompracrm tem uma modelagem degenerada em torno da `ampmais_chat_services`:

- O registro de "serviço" nasce com `descricao: "NÃO ESPECIFICADO"`, troca de responsável e **nunca é concluído**: a rota `PATCH /api/chats/services/{serviceId}` chamada pelo `ServiceConclusionDialog` **não existe** (404), `status` nunca chega a `CONCLUIDO` e `data_fim` nunca é preenchida em lugar nenhum do código.
- Na prática cada chat tem no máximo 1 serviço vivo para sempre — a tabela é uma coluna 1:1 de `chats` (responsável + descrição livre) travestida de tabela de histórico.
- Não há garantia de unicidade de atendimento ativo por chat, nem semântica segura para disputa entre webhook, IA e humanos.
- **Zero índices** nas três tabelas do módulo — incluindo nas colunas de paginação por cursor e no lookup `whatsapp_message_id` do webhook de status (hoje um seq scan em todas as mensagens da plataforma).
- Sem UNIQUE na chave natural do chat `(organizacao_id, cliente_id, whatsapp_telefone_id)` — risco real de chat duplicado sob concorrência de webhooks.

A modelagem do Control resolve tudo isso com a `chat_assignments`: um "ticket" de atendimento com ciclo de vida real, responsável tipado, métricas de resposta/resolução e um índice único parcial que garante **um único atendimento ativo por chat**.

## 2. Referência — arquivos-chave no Control

Base: `C:\Users\decsa\Projetos\syncroniza-control`

| Área | Path (Control) |
| --- | --- |
| Schema (chats, assignments, messages) | `src/server/db/schema/chats.ts` |
| Enums pg | `src/server/db/schema/enums.ts` |
| Validators/enums de aplicação | `src/lib/validators/chats.ts`, `src/lib/validators/enums.ts` |
| **Camada canônica de estado** | `src/server/chats/attendance-state.ts` |
| Rotas tRPC | `src/server/api/routers/chat/{chat.procedure,chat.input,chat.service}.ts` |
| Inbound WhatsApp | `src/lib/chats/incoming-whatsapp.ts` |
| Claim/trigger da IA | `src/lib/ai/agents/chat-trigger.ts`, `src/lib/ai/agents/routing.ts` |
| Handoff IA → humano | `src/lib/ai/tools/chats.transferir-para-humano.ts` |
| Cron de janela 24h | `src/app/api/crons/invalidate-chat-windows/route.ts` |
| UI — shell/hub | `src/app/(main)/dashboard/chats/{page,chats-page}.tsx`, `src/components/chats/ChatHub.tsx` |
| UI — inbox | `src/components/chats/ChatSidebar.tsx`, `ChatInboxListItem.tsx` |
| UI — thread | `src/components/chats/ChatThread.tsx` (merge otimista, realtime, agrupamento) |
| UI — bolha | `src/components/chats/ChatMessageBubble.tsx` |
| UI — input | `src/components/chats/ChatInputArea.tsx` |
| UI — painel de contexto | `src/components/chats/ChatContextPanel.tsx` |
| UI — ações de atribuição | `src/components/chats/ChatAssignmentActions.tsx` |
| UI — utilitários | `src/components/chats/{ChatAudioPlayer,WhatsAppMessageText,MediaAiContextDisclosure}.tsx`, `src/lib/chats/{chat-list-preview,media-ai-context,whatsapp-window-status}.ts` |

### Defeitos conhecidos do Control que NÃO devemos portar

1. `listChats` filtra a view **em memória**, sem limit/paginação (`chat.service.ts:205`) → aqui a view entra no SQL com paginação.
2. Ternário morto em `markChatNeedsResponse` (`attendance-state.ts:89`) — ambos os ramos resolvem `"ABERTO"`.
3. `onRetry` nunca é passado ao `ChatMessageBubble` → botão "Tentar novamente" invisível na prática. Conectar aqui.
4. Envio de template não existe no hub (fora da janela 24h o humano só ganha um link) → aqui o hub deve permitir enviar template aprovado direto.
5. Labels de status de run divergem entre `ChatThread` e `ChatContextPanel` (irrelevante aqui, sem runs, mas fica o alerta de consistência de labels).

## 3. Decisões fechadas

| Decisão | Escolha |
| --- | --- |
| AI Agents (tabelas `ai_agents` + runs/tools do Control) | **Não portar por enquanto.** `responsavel_agente_id` entra na `chat_assignments` como `varchar(255)` **nullable e SEM FK**; `responsavelTipo = 'AGENTE'` com id nulo significa "a IA da organização" (config `permitirAtendimentoIa`). O port completo de agentes vira iniciativa futura sem retrabalho. |
| Enums do assignment (status, tipo de responsável, prioridade) | `varchar` com `$type<...>` + validação Zod (padrão do Control), **desvio consciente** da convenção pgEnum do CLAUDE.md — `ALTER TYPE` em migrations manuais é doloroso e o formato varchar já foi provado lá. Enums de mensagem/conteúdo continuam pgEnum (já existem). |
| Migration | **Dividida**: `0047` aditiva + backfill (app velho continua funcionando) e `0048` destrutiva (drops), aplicada só após o deploy do código novo. Zero downtime ao custo de um segundo apply manual. |
| Aplicação de DDL | **O desenvolvedor aplica manualmente** via `npx tsx ./scripts/apply-sql-migration.ts drizzle/00XX_*.sql`. Claude escreve o SQL, não aplica. `drizzle-kit push/generate` não são usados (travam em prompt de drift; journal abandonado desde a 0019). |
| Numeração | Próximo número livre: **0047** (a sequência pula 0042–0044 e tem duplicatas históricas — não reaproveitar buracos). |
| Painel de contexto | 3 abas, com a aba "Cliente" substituindo a aba "Vínculos" do Control (oportunidades/kanban não existem aqui) pelo contexto de cliente do recompracrm (RFM, cashback, últimas compras, ticket médio), no espírito de `app/dashboard/commercial/sales/new-sale/components/context/ClientContextContent.tsx`. |

## 4. Modelagem alvo

Arquivo: `services/drizzle/schema/chats.ts` (reescrito). Prefixo `ampmais_` via `newTable` de `./common.ts`.

### 4.1 `ampmais_chat_assignments` (NOVA — substitui `ampmais_chat_services`)

| Coluna | Tipo | Notas |
| --- | --- | --- |
| `id` | varchar(255) PK | default UUID |
| `organizacao_id` | varchar(255) NOT NULL | FK → organizations |
| `chat_id` | varchar(255) NOT NULL | FK → chats ON DELETE CASCADE |
| `responsavel_tipo` | varchar(32) NOT NULL | `$type<TChatAssignmentResponsibleType>`: `USUARIO \| AGENTE \| EXTERNO \| NAO_ATRIBUIDO` |
| `responsavel_usuario_id` | varchar(255) | FK → users ON DELETE SET NULL |
| `responsavel_agente_id` | varchar(255) | **nullable, SEM FK** (ver decisões) |
| `status` | varchar(32) NOT NULL default `'ABERTO'` | `ABERTO \| EM_ATENDIMENTO \| AGUARDANDO_CLIENTE \| AGUARDANDO_INTERNO \| RESOLVIDO \| ENCERRADO \| CANCELADO` |
| `atribuido_por_usuario_id` | varchar(255) | FK → users SET NULL |
| `transferido_para_usuario_id` | varchar(255) | FK → users |
| `transferencia_motivo` | text | prefixo `HUMAN_HANDOFF:` quando handoff de IA |
| `prioridade` | varchar(16) | `BAIXA \| MEDIA \| ALTA \| URGENTE \| null` (validado só no input) |
| `categoria` | varchar(64) | |
| `resumo` | text | recebe a `descricao` legada com conteúdo real |
| `resultado` | text | |
| `data_atribuicao` | timestamp NOT NULL default now() | |
| `data_liberacao` | timestamp | |
| `data_ultima_entrada_cliente` | timestamp | |
| `data_primeira_resposta` | timestamp | métrica de 1ª resposta |
| `data_ultima_resposta` | timestamp | |
| `data_resolucao` | timestamp | |
| `data_encerramento` | timestamp | |
| `encerrado_por_usuario_id` | varchar(255) | FK → users SET NULL |
| `data_insercao` | timestamp NOT NULL default now() | |

Índices:

- `(chat_id, status)`
- `(organizacao_id, responsavel_usuario_id)`
- **`UNIQUE (chat_id) WHERE status NOT IN ('ENCERRADO','CANCELADO')`** — a garantia central de um único atendimento ativo por chat; é o que torna o claim concorrente (CAS) seguro.

Semântica dos tipos de responsável:

- `NAO_ATRIBUIDO` — ticket na fila do hub, sem dono (estado de nascimento). A "fila" é virtual: não existe tabela de fila/setor.
- `EXTERNO` — o operador respondeu direto pelo app WhatsApp no celular (Coexistence/echo); o hub mostra "Atendido pelo telefone" e a IA sai de cena.
- `AGENTE` — IA da organização (id nulo nesta fase).

### 4.2 `ampmais_chats` (ALTERADA)

Adicionar:

- `ultima_mensagem_entrada_data` timestamp — última msg **recebida** do cliente (backfill: `ultima_interacao_cliente_data`)
- `ultima_mensagem_saida_data` timestamp — última msg **enviada**
- `whatsapp_janela_data_expiracao` timestamp — janela de 24h; `null` = sem janela ativa (backfill: `ultima_interacao_cliente_data + 24h` quando no futuro; conexões `INTERNAL_GATEWAY` não têm janela)
- `ultima_leitura_data` timestamp
- `ultima_leitura_por_usuario_id` varchar(255) FK → users SET NULL

Remover (na 0048):

- `status` (`chat_status` ABERTA/FECHADA) — substituído pela janela
- `ultima_mensagem_conteudo_tipo`, `ultima_mensagem_conteudo_texto` — preview resolvido via join com `ultima_mensagem_id` (padrão Control, `src/lib/chats/chat-list-preview.ts`)
- `ai_agendamento_resposta_data` — o debounce da IA deixa de viver em coluna (ver §7 Fase 4)

Índices novos:

- `(organizacao_id, ultima_mensagem_data)`
- **`UNIQUE (organizacao_id, cliente_id, whatsapp_telefone_id)`** — chave natural, hoje tratada como tal em 4 pontos sem constraint. ⚠️ Exige merge de duplicatas antes (ver §6).

### 4.3 `ampmais_chat_messages` (ALTERADA)

Adicionar:

- `cliente_id` varchar(255) NOT NULL FK → clients (backfill via chat) — o Control carrega o cliente na mensagem e isso simplifica dedupe/consultas
- `cliente_mensagem_id` text — id gerado no cliente, chave de reconciliação do envio otimista
- `metadados` jsonb `$type<TChatMessageMetadata>` — referral de anúncio Meta (CTWA), status de download/processamento de mídia, dados do gateway interno (jobId, queueFailure). Shape de referência: `src/lib/validators/chats.ts:95` no Control
- índice `(chat_id, data_envio, id)` — paginação por cursor
- índices `whatsapp_message_id` e `cliente_mensagem_id`

Consolidar status (**uma** coluna no lugar de duas):

- Hoje: `status` (`ENVIADO/RECEBIDO/LIDO/CANCELADO`) + `whatsapp_message_status` (`PENDENTE/ENVIADO/ENTREGUE/LIDO/FALHOU`)
- Alvo: `status` único — `PENDENTE \| ENVIADA \| ENTREGUE \| LIDA \| FALHA \| CANCELADA` (novo pgEnum; backfill a partir de `whatsapp_message_status`)
- Adicionar `provedor_status_data_atualizacao` timestamp

Renomear: `is_echo` → `whatsapp_echo` (mesmo conceito, alinhamento com o Control).

Remover (na 0048): `servico_id`, `whatsapp_message_status`, enum antigo de status.

Mantém-se: toda a família `conteudo_midia_*` (já é ~idêntica ao Control, incluindo `conteudo_midia_texto_processado[_resumo]` para transcrição/OCR de IA), `whatsapp_template_id`.

### 4.4 Remoções (na 0048)

- Tabela `ampmais_chat_services`
- Enums `chat_service_status`, `chat_service_responsible_type`, `chat_status`, `chat_message_status` (antigo), `chat_message_whatsapp_status`

## 5. Mapeamentos de migração de dados

### `chat_services` → `chat_assignments`

| Campo legado | Destino | Regra |
| --- | --- | --- |
| `responsavel_tipo = 'USUÁRIO'` | `'USUARIO'` | |
| `responsavel_tipo = 'AI'` | `'AGENTE'` | `responsavel_agente_id = NULL` |
| `responsavel_tipo = 'BUSINESS-APP'` | `'EXTERNO'` | |
| `responsavel_tipo = 'CLIENTE'` | `'NAO_ATRIBUIDO'` | caso residual |
| `status = 'PENDENTE'` | `'ABERTO'` | |
| `status = 'EM_ANDAMENTO'` | `'EM_ATENDIMENTO'` | |
| `status = 'CONCLUIDO'` | `'ENCERRADO'` | na prática não existe nenhum no banco |
| `descricao` | `resumo` | descartar `'NÃO ESPECIFICADO'`; preservar as com conteúdo (escritas pelo handoff da IA, podem conter `[TRANSFERÊNCIA AI]`) |
| `responsavel_usuario_id` | `responsavel_usuario_id` | |
| `data_inicio` | `data_atribuicao` | |
| `data_fim` | `data_encerramento` | sempre null hoje |

⚠️ Se algum chat tiver mais de um service em estado aberto (não deveria, mas não há constraint), migrar apenas o mais recente como ativo e os demais como `ENCERRADO` — senão o UNIQUE parcial falha no apply.

### `chat_messages`

| Legado | Destino |
| --- | --- |
| `whatsapp_message_status = 'PENDENTE'` | `status = 'PENDENTE'` |
| `'ENVIADO'` | `'ENVIADA'` |
| `'ENTREGUE'` | `'ENTREGUE'` |
| `'LIDO'` | `'LIDA'` |
| `'FALHOU'` | `'FALHA'` |
| (status antigo `'CANCELADO'`) | `'CANCELADA'` |
| `is_echo` | `whatsapp_echo` |
| — | `cliente_id` = `chats.cliente_id` do chat pai |

## 6. Migrations

### `drizzle/0047_chat_attendance_redesign.sql` (aditiva — app velho continua funcionando)

1. `CREATE TABLE ampmais_chat_assignments` + índices (incluindo o UNIQUE parcial).
2. `ALTER ampmais_chats ADD` novas colunas + backfills de janela/entrada.
3. **Merge de duplicatas** da chave natural `(organizacao_id, cliente_id, whatsapp_telefone_id)`: eleger o chat com `ultima_mensagem_data` mais recente como sobrevivente, mover `chat_messages` (e `chat_services` legadas) para ele, somar `mensagens_nao_lidas`, deletar os órfãos. Só então criar o UNIQUE.
4. `ALTER ampmais_chat_messages ADD` novas colunas (nova coluna `status_novo` ou enum novo + coluna paralela), backfill de `cliente_id` e status, criação dos índices (`CREATE INDEX` — avaliar `CONCURRENTLY` fora de transação se o volume justificar).
5. Backfill de `chat_assignments` a partir de `chat_services` (mapeamentos do §5).

### `drizzle/0048_chat_attendance_drop_legacy.sql` (destrutiva — aplicar só após o deploy do código novo)

1. `ALTER ampmais_chat_messages DROP servico_id, whatsapp_message_status` (+ swap definitivo da coluna de status, se usada coluna paralela) e drop de `is_echo` (pós-rename).
2. `ALTER ampmais_chats DROP status, ultima_mensagem_conteudo_tipo, ultima_mensagem_conteudo_texto, ai_agendamento_resposta_data`.
3. `DROP TABLE ampmais_chat_services`.
4. `DROP TYPE` dos enums órfãos.

Aplicação (manual, pelo desenvolvedor):

```bash
npx tsx ./scripts/apply-sql-migration.ts drizzle/0047_chat_attendance_redesign.sql
```

## 7. Fases de implementação

### Fase 1 — Schema Drizzle + SQL 0047/0048

- Reescrever `services/drizzle/schema/chats.ts` (3 tabelas alvo + relations + tipos inferidos, barrel em `schema/index.ts`).
- Atualizar `schemas/enums.ts` (Zod): novos enums de assignment (status, responsável, prioridade, views da inbox) e status unificado de mensagem; remover os legados.
- Escrever os dois arquivos SQL.

### Fase 2 — Camada canônica de estado: `lib/chats/attendance-state.ts`

Port de `src/server/chats/attendance-state.ts` do Control, adaptado a `organizacaoId` e ao Drizzle daqui. **Toda mutação de atendimento — rotas, webhooks e IA — passa exclusivamente por esta camada.**

| Função | Semântica |
| --- | --- |
| `getCurrentChatAttendance` | assignment ativo (status ∉ ENCERRADO/CANCELADO) com responsável |
| `ensureCurrentAttendance` (privada) | find-then-insert, nasce `NAO_ATRIBUIDO`/`ABERTO`; `.onConflictDoNothing()` por causa dos webhooks concorrentes disputando o UNIQUE parcial |
| `markChatNeedsResponse` | inbound → `ABERTO` + `data_ultima_entrada_cliente` |
| `markChatAnswered` | outbound (source `HUB \| AI \| WHATSAPP_ECHO \| INTERNAL_GATEWAY`) → `ABERTO`→`EM_ATENDIMENTO`, grava `data_primeira_resposta` (só na 1ª) e `data_ultima_resposta` |
| `markChatAttendedExternally` | echo do celular → `EXTERNO`; **não sobrescreve** dono `USUARIO` |
| `assignChatAttendance` | atribuição com semântica de override (hub) |
| `claimChatAttendanceForAgent` | **compare-and-set**: `UPDATE ... WHERE responsavel_tipo = 'NAO_ATRIBUIDO' AND status ∉ fechados`; zero linhas = humano assumiu antes → IA recua |
| `transferChatAttendance` | seta `USUARIO` destino + motivo + prioridade, renova `data_atribuicao` |
| `releaseChatAttendance` | volta a `NAO_ATRIBUIDO`, `data_liberacao = now`; se há pendência do cliente vira `ABERTO` |
| `changeChatAttendanceStatus` / `changeChatAttendancePriority` | com `data_resolucao`/`data_encerramento` quando terminal |
| `closeChatAttendance` | encerramento com `resultado` (usado no handoff `HUMAN_HANDOFF`) |

Correção sobre o original: eliminar o ternário morto de `markChatNeedsResponse`.

### Fase 3 — Rotas de API (App Router, convenções do CLAUDE.md — não tRPC)

Reescrever `app/api/chats/**` no padrão input schema → service function → route handler → `appApiHandler`:

- `GET /api/chats` — listagem com views `MINHAS | NAO_ATRIBUIDAS | COM_AGENTE | TODAS`, filtro por telefone/conexão, busca; **view filtrada no SQL com paginação por cursor** (não em memória como no Control).
- `GET /api/chats/messages` — keyset descendente por `(data_envio, id)`, retorno `{ chat: {..., activeAssignment}, items, nextCursor, hasMoreOlder }`, limit default 30.
- `GET /api/chats/context` — atendimento ativo + contexto de cliente (reuso de `GET /api/clients/context` e saldo de cashback).
- `POST /api/chats/messages` — **unifica** o fluxo hoje partido entre `messages` e `send-whatsapp`: persiste (`PENDENTE`), envia pelo provider (Meta Cloud API ou Internal Gateway), atualiza denormalização do chat, `markChatAnswered(source: "HUB")`. Regras: **exigir ser o responsável** ("Assuma este atendimento antes de enviar mensagens."), janela de 24h para Meta (fora dela, aceitar apenas template aprovado — melhoria sobre o Control), assinatura opcional prefixando `"{nome}:\n"` (exceto áudio), retry mantido.
- `PATCH /api/chats/assignments` — ações `assumir | transferir | liberar | alterar_status | alterar_prioridade` (padrão multi-ação já usado em `PATCH /api/chats/[chatId]`). Autorização: posse (`responsavel_usuario_id = user`) ou permissão de gestão.
- `PATCH /api/chats/[chatId]` — mantém `mark_as_read` (agora gravando `ultima_leitura_data`/`ultima_leitura_por_usuario_id`); remove `update_status` (não existe mais status de chat).
- Mapeamento de permissões (`membership.permissoes.atendimentos`): `visualizar` → ver hub; `responder` → enviar/assumir; `receberTransferencias` → transferir/liberar; `finalizar` → gestão (alterar status/prioridade de qualquer atendimento). Passar a **aplicá-las de verdade** — hoje `ChatsMain.tsx` passa `userHasMessageSendingPermission={true}` hardcoded.
- Remover código morto: `useChatSummary` (rota inexistente), `useUpdateService` + tipos fantasmas `TUpdateServiceInput/Output`, `app/api/chats/services/transfer/route.ts` (substituída), rota `messages/[messageId]` que lê o id da query string em vez do path.
- Atualizar `lib/queries/chats.ts` e `lib/mutations/chats.ts` para os novos contratos (tipos importados das rotas).

### Fase 4 — Webhooks e IA

Arquivos: `app/api/integrations/whatsapp/route.ts` (Meta) e `app/api/integrations/whatsapp/gateway/route.ts` (Internal Gateway).

- Inbound: find-or-create cliente/chat (agora protegido pelo UNIQUE natural — usar upsert) → inserir mensagem → atualizar `ultima_mensagem_*`, `ultima_mensagem_entrada_data`, `mensagens_nao_lidas += 1`, `whatsapp_janela_data_expiracao = now + 24h` (só Meta) → `markChatNeedsResponse`.
- Echo (Coexistence): `whatsapp_echo = true` + `markChatAttendedExternally`.
- Status: `UPDATE ... WHERE whatsapp_message_id = ?` (agora indexado) → coluna `status` unificada + `provedor_status_data_atualizacao`.
- IA: passa a **claimar** o atendimento via `claimChatAttendanceForAgent` (CAS) em vez de ser dona por default; se dono é `USUARIO`, não entra; humano respondendo pelo hub encerra o episódio da IA (`closeChatAttendance` com `resultado: 'HUMAN_HANDOFF'`); handoff explícito usa `transferChatAttendance`/`releaseChatAttendance` com motivo `HUMAN_HANDOFF: [PRIORIDADE] ...` (adaptar `lib/ai/ai-agent/transfer-service-to-human.ts`).
- Debounce da IA: substituir a coluna `ai_agendamento_resposta_data` pelo padrão do Control (`chat-trigger.ts`): sleep de ~5s + re-checagem (aborta se chegou mensagem de cliente mais nova ou se já houve outbound depois do inbound).
- Cron novo: `app/api/cron/invalidate-chat-windows` — zera `whatsapp_janela_data_expiracao` vencidas (ref.: `src/app/api/crons/invalidate-chat-windows/route.ts` no Control).
- Oportunidade (não bloqueante, recomendado): extrair o miolo duplicado dos dois webhooks para `lib/chats/incoming-message.ts` — a duplicação quase linha a linha é o maior risco de divergência do módulo.

### Fase 5 — UI/UX (port do hub)

Substituir `components/Chats/**` pela arquitetura do Control, adaptada às convenções daqui (shadcn, React Query + Axios, sem tRPC):

- **`ChatSidebar`** — inbox com dropdown de view (Livres / Minhas / IA / Todas), busca client-side, seletor de número WhatsApp com chip removível; item com ponto de status da janela, tempo relativo, badge de não lidas (`99+`), preview com "Você:" e ícone de mídia, linha do responsável (avatar / smartphone p/ EXTERNO) e chip Automação/Humano.
- **`ChatThread`** — merge de mensagens otimistas + persistidas reconciliadas por `cliente_mensagem_id`, agrupamento por autor, `DateSeparator` por dia, pílula "N novas" quando scrollado para cima, "Carregar mensagens anteriores", header com status da janela + ações de atribuição.
- **`ChatMessageBubble`** — estilização do Control: `rounded-2xl` com rabinho assimétrico (`rounded-tr-md` saída / `rounded-tl-md` entrada), largura máx 72%, tons por autor (primary = humano; muted = IA e echo; card/outline = cliente; destructive = falha), meta inline (hora + ticks de status: 1 check ENVIADA, 2 ENTREGUE, 2 azuis LIDA), parser de formatação WhatsApp (`*negrito*`, `_itálico_`, `~riscado~`, `` `code` ``, autolink), disclosure "Ver análise da IA" para transcrição/OCR de mídia, preview de anúncio Meta (CTWA referral), otimista com `opacity-70`, **`onRetry` conectado** (fix sobre o Control).
- **`ChatInputArea`** — textarea auto-resize, Enter envia / Shift+Enter quebra, anexos com preview, gravação de áudio (**reaproveitar** `useAudioRecorder`/`AudioRecordingModal` existentes), switch "Assinar como {nome}" persistido em localStorage, estado de janela expirada com cadeado + **seletor de template aprovado enviável direto do hub**.
- **`ChatContextPanel`** — `aside` `w-80`, 3 abas (mobile via `Sheet`):
  1. **Atendimento** — ações rápidas (ASSUMIR com label contextual "ASSUMIR DA IA"/"ASSUMIR DO TELEFONE", card do responsável, select de transferência, LIBERAR), status editável inline (7 status), prioridade, canal, número, janela (verde/âmbar/vermelho com CTA de template).
  2. **Cliente** — substitui a aba "Vínculos" do Control: identidade + badge RFM, destaque de cashback, últimas compras, ticket médio/qtde compras — reuso/refatoração de `ClientContextContent` (`app/dashboard/commercial/sales/new-sale/components/context/ClientContextContent.tsx`) para o contexto de chat.
  3. **Atividade** — métricas (não lidas, última entrada ↙, última saída ↗ em tempo relativo) e atalhos de CRM pertinentes.
- Deletar: `ServiceBanner`, `ServiceConclusionDialog`, `components/Chats/Components/README.md` (descreve API antiga com Convex). De tabela, somem os bugs atuais: hooks após early return em `Content.tsx`, `whatsappConnection` singular inexistente em `Input.tsx`.
- Utilitários a portar: `chat-list-preview.ts`, `media-ai-context.ts`, `whatsapp-window-status.ts` → `lib/chats/`.

### Fase 6 — Realtime (Supabase postgres_changes)

Evoluir de invalidate-and-refetch para o padrão de **patch cirúrgico no cache** do Control:

- Canal `chats-sidebar-{organizacaoId}`: UPDATE em `ampmais_chats` (se `ultima_mensagem_id` mudou → invalida lista; senão patch otimista de datas/não-lidas/janela + reorder local), `*` em `ampmais_chat_assignments`, INSERT em `ampmais_chats`; re-invalidar tudo no re-SUBSCRIBED (reconexão).
- Canal `chat-thread-{chatId}`: INSERT em `ampmais_chat_messages` (mapear row snake_case → camelCase, remover otimista por `cliente_mensagem_id`, dedupe por id, `markChatRead` se autor é cliente), UPDATE de mensagens (status), `*` em assignments do chat, UPDATE do chat (janela/não-lidas).
- `markChatRead` com update otimista no cache (a aba originadora não recebe eco realtime do próprio write).
- ⚠️ Pré-requisitos no Supabase (verificar antes do deploy): **replication habilitada** para `ampmais_chat_assignments` e **RLS** das três tabelas — os canais filtram por organização/chat, não por tenant; o isolamento depende de RLS que não está versionada neste repo.

## 8. Pontos de integração fora do módulo (fáceis de esquecer)

| Arquivo | O que muda |
| --- | --- |
| `lib/interactions/send-reserved-interaction.ts` | insere `chat_messages`/cria `chats` (campanhas) — adaptar ao shape novo (status unificado, `cliente_id`, sem `ultima_mensagem_conteudo_*`, upsert pela chave natural) |
| `lib/client-portfolios/queue.ts` | lê `max(chats.ultimaInteracaoClienteData)` — trocar por `ultima_mensagem_entrada_data` |
| `lib/organizations/deletion.ts` | ordem de deleção: trocar `chat_services` por `chat_assignments` |
| `app/api/admin/organizations/deletion-summary/route.ts` | contagem: idem |
| `lib/whatsapp/smb-message-history-sync.ts` | import de histórico: shape novo de mensagem; **não** criar assignments |
| `app/api/integrations/ai/generate-response/route.ts` | contexto da IA: `atendimentoId` passa a vir do assignment ativo; `resumo` no lugar de `descricao` |
| `config/index.ts` + `components/Sidebar/AppSidebar.tsx` | rota `/dashboard/chats` inalterada; revisar labels se necessário |

## 9. Riscos

1. **Duplicatas na chave natural do chat** — o UNIQUE da 0047 falha se não houver merge prévio; o passo de merge precisa mover mensagens e somar contadores.
2. **Volume de `chat_messages`** nos backfills (`cliente_id`, status) e criação de índices — medir antes; considerar `CREATE INDEX CONCURRENTLY` fora da transação.
3. **Janela entre 0047 e 0048**: o código velho continua escrevendo em `chat_services`/`whatsapp_message_status` até o deploy — o backfill de assignments deve rodar na 0047 **e** ser re-executável (ou repetido como passo inicial da 0048) para capturar escritas do intervalo.
4. **RLS/replication do Supabase** não versionadas no repo — validar manualmente (ver Fase 6).
5. **Typecheck**: baseline com ~300 erros pré-existentes — validar com `tsc` filtrado pelos arquivos tocados; `oxlint` por arquivo é confiável.

## 10. Ordem de commits

1. `feat: chat attendance schema + migrations 0047/0048` (Fase 1 — dev aplica a 0047)
2. `feat: chat attendance state layer` (Fase 2)
3. `refactor: rewrite chat API routes on assignment model` (Fase 3, inclui remoção de código morto)
4. `refactor: webhooks and AI claim/handoff on attendance state` (Fase 4)
5. `feat: new chat hub UI` (Fase 5 — pode quebrar em sidebar / thread / painel de contexto)
6. `feat: realtime cache patching for chat hub` (Fase 6)
7. `chore: chat window invalidation cron + legacy cleanup` (dev aplica a 0048 após deploy)
