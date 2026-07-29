# Chats — Estatísticas e Quadro (Kanban) — Plano de Implementação

Transforma `app/dashboard/chats` de uma tela única (o hub) em um workspace de três abas:
**Hub** (padrão), **Quadro** e **Estatísticas**.

> **Estado: implementado.** As seis fases da [§10](#10-fases-de-implementação) estão em código.
> O que mudou em relação ao plano original está registrado em
> [§12](#12-desvios-durante-a-implementação) — inclusive uma armadilha de fuso horário que só
> apareceu ao escrever as agregações.

---

## Índice

1. [Motivação e escopo](#1-motivação-e-escopo)
2. [Decisões fechadas](#2-decisões-fechadas)
3. [O que o modelo de dados sustenta — e o que não sustenta](#3-o-que-o-modelo-de-dados-sustenta--e-o-que-não-sustenta)
4. [Aba Estatísticas — conjunto analítico](#4-aba-estatísticas--conjunto-analítico)
5. [Aba Quadro — kanban de atendimentos](#5-aba-quadro--kanban-de-atendimentos)
6. [Estrutura de abas e layout](#6-estrutura-de-abas-e-layout)
7. [Contratos de API](#7-contratos-de-api)
8. [Índices e migration](#8-índices-e-migration)
9. [Mapa de arquivos](#9-mapa-de-arquivos)
10. [Fases de implementação](#10-fases-de-implementação)
11. [Riscos e follow-ups](#11-riscos-e-follow-ups)
12. [Desvios durante a implementação](#12-desvios-durante-a-implementação)

---

## 1. Motivação e escopo

O hub responde bem à pergunta *"o que eu respondo agora?"*, mas não responde a outras duas que
a operação faz todo dia:

- **"Como o atendimento está indo?"** — volume, tempo de resposta, quem está carregando a fila.
  Hoje não existe nenhuma leitura agregada: o único jeito de saber é rolar a inbox.
- **"Onde cada atendimento está parado?"** — a inbox ordena por última mensagem, o que mistura
  um ticket resolvido que recebeu um "obrigado" com um aberto há três horas sem resposta. O
  estado do atendimento (`chat_assignments.status`) já existe no banco e é editável pelo painel
  de contexto, mas não é *visível* como pipeline.

O escopo é de leitura e roteamento. Nada no fluxo de mensagens muda: enviar, receber, assumir,
transferir e liberar continuam exatamente como estão.

---

## 2. Decisões fechadas

| # | Decisão | Motivo |
|---|---------|--------|
| D1 | Três abas: `hub` (padrão), `quadro`, `estatisticas` | O hub é o trabalho; as outras duas são leitura sobre o trabalho |
| D2 | O card do quadro é o **atendimento** (`chat_assignments`), não o chat | Um chat sem ticket é um chat sem atendimento — não pertence a um pipeline de atendimentos |
| D3 | Mover card = `PATCH /api/chats/assignments` com `acao: "alterar_status"` | A ação já existe, já valida posse/permissão e já grava `dataResolucao`/`dataEncerramento`. Nenhuma mutação nova |
| D4 | Coluna `ENCERRADO` mostra só os encerrados nos últimos N dias (padrão 3) e é **somente leitura** | Ver [§3, armadilha A3](#3-o-que-o-modelo-de-dados-sustenta--e-o-que-não-sustenta): arrastar para fora de `ENCERRADO` criaria um ticket novo, não reabriria o antigo |
| D5 | `CANCELADO` não é coluna; é ação no menu do card | Mesmo tratamento que o quadro de pedidos dá ao cancelamento (`_components/fulfillment/config.tsx`) |
| D6 | Abertura do atendimento = `dataInsercao`, **nunca** `dataAtribuicao` | `dataAtribuicao` é reescrita a cada assumir/atribuir/transferir. Ver [§3, armadilha A1](#3-o-que-o-modelo-de-dados-sustenta--e-o-que-não-sustenta) |
| D7 | Toda métrica de tempo publica **mediana e p90**, não só média | Fila de atendimento tem cauda longa; a média sozinha esconde o pior caso, que é justamente o que a gestão precisa ver |
| D8 | Aba Estatísticas visível com `atendimentos.visualizar`; bloco de ranking exige `atendimentos.finalizar` | Ranking nominal de atendentes é dado de gestão. A API recusa; a UI esconde |
| D9 | Três rotas de estatística em vez de uma | Cada bloco carrega e falha sozinho; o ranking (o mais caro) não segura os KPIs |
| D10 | Sem tabela de histórico de atendimento nesta iteração | Ver [§11](#11-riscos-e-follow-ups): mudaria o escopo de "duas telas" para "novo modelo de eventos". As métricas afetadas ficam explicitamente rotuladas |

---

## 3. O que o modelo de dados sustenta — e o que não sustenta

`chat_assignments` já foi desenhado com métricas em mente (`dataPrimeiraResposta`,
`dataUltimaResposta`, `dataResolucao`, `dataEncerramento`). Quase tudo que queremos sai dali sem
migration. Mas há quatro armadilhas que definem decisões deste plano — todas verificadas em
`lib/chats/attendance-state.ts`.

**A1 — `dataAtribuicao` não é a data de abertura.**
`ensureCurrentAttendance` cria o ticket com `dataAtribuicao = now`, mas `assumeChatAttendanceForUser`,
`assignChatAttendance`, `claimChatAttendanceForAgent` e `transferChatAttendance` **reescrevem** o campo
com o `now` da vez. Ou seja: `dataAtribuicao` significa *"o dono atual é dono desde"*, não *"o
atendimento abriu em"*. A data de abertura estável é `dataInsercao` (default do insert, nunca
tocada). Todo cálculo de tempo de primeira resposta e de resolução parte de `dataInsercao`.

Consequência: **"tempo de espera na fila"** (abertura → posse) só é calculável para tickets que
nunca foram transferidos, e mesmo assim `dataAtribuicao − dataInsercao` reflete a *última* posse.
A métrica entra rotulada como *"tempo até a posse atual"*, com nota, em vez de ser vendida como
tempo de fila.

**A2 — `dataPrimeiraResposta` não guarda a origem.**
`markChatAnswered` recebe `source: "HUB" | "AI" | "WHATSAPP_ECHO" | "INTERNAL_GATEWAY"` e grava a data
sem persistir a origem. Não dá para separar "primeira resposta humana" de "primeira resposta da IA"
olhando só o ticket. O recorte humano × IA sai de `chat_messages.autorTipo`
(`CLIENTE` / `USUÁRIO` / `AI` / `BUSINESS-APP`), que é confiável e indexado por
`idx_chat_messages_chat_timeline`.

**A3 — Não existe reabertura de ticket encerrado.**
`changeChatAttendanceStatus` chama `ensureCurrentAttendance`, que só enxerga tickets com status fora de
(`ENCERRADO`, `CANCELADO`). Aplicado a um chat cujo único ticket está encerrado, ele **cria um ticket
novo**. Arrastar um card de `ENCERRADO` para `ABERTO` não reabriria nada — abriria um segundo
atendimento com métricas zeradas. Daí D4: a coluna é vitrine, não área de drop. (Uma nova mensagem
do cliente já reabre o fluxo corretamente, via `markChatNeedsResponse` sobre um ticket novo.)

**A4 — `responsavelUsuarioId` é o dono *atual*.**
Transferência sobrescreve o campo e não deixa rastro além de `transferidoParaUsuarioId` /
`transferenciaMotivo` (também sobrescritos). O ranking por atendente é, portanto:

- **carteira atual** (`responsavelUsuarioId` nos tickets ativos) — exato;
- **encerramentos** (`encerradoPorUsuarioId`) — exato, é quem clicou em encerrar;
- **mensagens enviadas** (`chat_messages.autorUsuarioId`) — exato, é a métrica de esforço mais dura que temos;
- **tempos medianos** — aproximados, atribuídos ao dono atual do ticket. Rotulados como tal na UI.

Isso é honesto e útil. Atribuição perfeita exigiria `chat_assignment_events` — [§11](#11-riscos-e-follow-ups).

**Fatos de apoio (sem armadilha):** um ticket ativo por chat é garantido pelo índice único parcial
`idx_chat_assignments_one_current_per_chat`, então `leftJoin` filtrado por status não-terminal não
duplica linha (é o que `app/api/chats/route.ts` já explora). Pendência do cliente é
`chats.ultimaMensagemEntradaData > chats.ultimaMensagemSaidaData`. Fila é
`responsavelTipo = 'NAO_ATRIBUIDO'`. Janela de 24h é `chats.whatsappJanelaDataExpiracao` combinada com
`whatsapp_connections.tipoConexao` (gateway interno nunca tem janela) — a regra já está em
`lib/chats/whatsapp-window-status.ts` e é reaproveitada.

---

## 4. Aba Estatísticas — conjunto analítico

Filtro de período local à aba, no padrão de `components/Stats/CampaignStatsSection.tsx`
(`InteractiveFilter` + `formatInteractiveDateRangeSummary`, default = mês corrente). Filtros
adicionais: telefone da conexão e responsável. Comparação com o período anterior de mesma duração
alimenta os deltas de `StatUnitCard`.

Distinção que atravessa a aba inteira: **métricas de período** (o que aconteceu entre as datas) e
**métricas de retrato** (como a fila está agora). As de retrato usam a tag `ACUMULADO` que
`StatUnitCard` já suporta — sem isso, "23 atendimentos abertos" com filtro de mês passado vira
mentira.

### Bloco 1 — KPIs de volume e SLA (linha de cards)

| Métrica | Definição |
|---|---|
| Atendimentos abertos | `count(dataInsercao ∈ período)` |
| Atendimentos encerrados | `count(dataEncerramento ∈ período)` — inclui `CANCELADO` |
| Resolvidos | `count(dataResolucao ∈ período)` |
| Saldo de backlog | abertos − encerrados (positivo = fila crescendo) |
| Taxa de resolução | resolvidos ÷ abertos no período |
| Primeira resposta (mediana) | `percentile_cont(0.5)` de `dataPrimeiraResposta − dataInsercao` |
| Tempo de resolução (mediana) | `percentile_cont(0.5)` de `dataResolucao − dataInsercao` |
| Dentro da meta de 1ª resposta | % com `dataPrimeiraResposta − dataInsercao ≤ 15 min` |
| Sem primeira resposta | tickets do período com `dataPrimeiraResposta IS NULL` — o número que mais dói |

Cada card de tempo traz p90 no rodapé (`footer` do `StatUnitCard`). `lowerIsBetter` nos cards de
tempo, para o delta verde/vermelho não inverter o sentido.

### Bloco 2 — Volume ao longo do tempo (gráfico)

Série diária (bucket por dia; semana quando o período > 90 dias): **abertos × encerrados** em barras,
com **mediana de primeira resposta** em linha no eixo secundário. É o gráfico que mostra se a equipe
está fechando o que abre e a que custo de tempo.

### Bloco 3 — Distribuição do tempo de primeira resposta

Histograma de faixas: `< 5 min`, `5–15`, `15–60`, `1–4 h`, `> 4 h`, `sem resposta`. Complementa a
mediana: duas equipes com a mesma mediana e caudas diferentes são operações diferentes.

### Bloco 4 — Fila agora (retrato)

- Abertos agora, quebrados por status (`ABERTO`, `EM_ATENDIMENTO`, `AGUARDANDO_CLIENTE`, `AGUARDANDO_INTERNO`, `RESOLVIDO`) — barra empilhada; clicar leva à aba Quadro com o filtro aplicado.
- **Na fila** (`NAO_ATRIBUIDO`) e **aguardando resposta** (pendência do cliente).
- **Idade da fila**: mediana e p90 do tempo desde `dataInsercao` dos abertos + o mais antigo.
- **Janela em risco**: pendentes com janela de 24h `expirando` (< 4 h) ou `expirada`. É o único bloco com consequência comercial direta — janela expirada obriga template aprovado.
- Distribuição por prioridade e por categoria.

### Bloco 5 — Ranking de atendentes (tabela, exige `finalizar`)

Colunas ordenáveis: atendente · carteira atual · encerrados no período · resolvidos · mensagens
enviadas · 1ª resposta (mediana) · resolução (mediana) · ativos agora. Ordenação padrão por
encerrados. Nota de rodapé fixa explicando a atribuição da armadilha A4 — a tabela não finge
precisão que o dado não tem.

### Bloco 6 — Humano × IA × telefone

- Atendimentos por tipo de responsável (`USUARIO` / `AGENTE` / `EXTERNO` / `NAO_ATRIBUIDO`).
- **Contenção da IA**: encerrados com `responsavelTipo = 'AGENTE'` ÷ total tocado pela IA.
- **Handoffs**: encerrados com `resultado = 'HUMAN_HANDOFF'` (valor já gravado por `closeChatAttendance`).
- Mensagens por autor (`CLIENTE` / `USUÁRIO` / `AI` / `BUSINESS-APP`) e média de mensagens por atendimento.

### Bloco 7 — Carga por hora × dia da semana (heatmap)

Mensagens recebidas e atendimentos abertos agregados em `dia da semana × hora` no fuso da
organização. Responde "quando precisamos de gente na linha" — a pergunta que dimensiona escala e
que nenhum outro bloco responde.

---

## 5. Aba Quadro — kanban de atendimentos

Referência de implementação: `app/dashboard/commercial/sales/_components/fulfillment/` (dnd-kit já
é dependência do projeto). O quadro de pedidos resolve exatamente os mesmos problemas —
otimismo com rollback, confirmação de transição sensível, acessibilidade por teclado, auto-refresh
pausado durante o arraste — e copiar sua forma mantém as duas telas consistentes.

### Colunas

| Coluna | Status | Regra |
|---|---|---|
| Aberto | `ABERTO` | Pendência do cliente sem resposta |
| Em atendimento | `EM_ATENDIMENTO` | — |
| Aguardando cliente | `AGUARDANDO_CLIENTE` | — |
| Aguardando interno | `AGUARDANDO_INTERNO` | — |
| Resolvido | `RESOLVIDO` | Grava `dataResolucao` na entrada |
| Encerrado | `ENCERRADO` | Somente os últimos N dias (D4). Não recebe drop e não sai |

`CANCELADO` fica no menu do card, com confirmação. `ENCERRADO` recebido por drop também confirma
(mesmo papel de `transitionNeedsConfirmation` no quadro de pedidos).

### Card

Densidade calibrada para varredura, não para leitura completa:

- Nome do cliente + avatar; badge **Livre** quando `NAO_ATRIBUIDO`, senão avatar/nome do responsável (ou pill `Automação` / `Telefone`, reaproveitando os rótulos de `ChatInboxListItem`).
- **Última mensagem** via `getChatListMessagePreview` — o mesmo preview da inbox, incluindo prefixo "Você:" e ícone de mídia.
- Tempo relativo desde a última mensagem + contador de não lidas.
- Prioridade como pill (só quando `ALTA`/`URGENTE` — prioridade baixa não merece tinta).
- Ponto de janela de 24h (`getWhatsappWindowDisplay`), com rótulo `sr-only`, idêntico à inbox.
- `resumo` do atendimento (o campo que a IA preenche) truncado em 2 linhas, quando existir.
- Ações: abrir no hub (clique no card) e menu com mover / alterar prioridade / cancelar.

### Filtros do topo

Visão (`MINHAS` / `NAO_ATRIBUIDAS` / `COM_AGENTE` / `TODAS`, reaproveitando `ChatInboxViewEnum`),
telefone da conexão, prioridade, busca por cliente e janela de encerrados (1 / 3 / 7 dias).

### Movimentação

1. `onDragEnd` valida a transição contra `isValidBoardTransition` (config local) e ignora movimentos inválidos com toast informativo.
2. Update otimista no cache (`queryClient.setQueryData`), card marcado como `pending`.
3. `updateChatAssignment({ acao: "alterar_status", chatId, status })`.
4. Erro → rollback para o status anterior + `toast.error(getErrorMessage(err))`. 403 (não é dono nem gestor) cai naturalmente nesse caminho.
5. Sucesso → invalida `["chats-board"]` e `["chats"]` (a inbox mostra o mesmo estado).

Drag desabilitado quando o usuário não pode gerenciar aquele ticket (não é o responsável e não tem
`finalizar`) — a regra de `mayManageAssignment` espelhada na UI, para não oferecer um gesto que a
API vai recusar. Movimento por teclado pelo menu "Mover", como no quadro de pedidos.

### Atualização

Realtime em `ampmais_chat_assignments` filtrado por `organizacao_id` (mesmo padrão do
`ChatSidebar`) invalidando a query do quadro, mais polling de 30 s como rede de segurança —
ambos pausados enquanto há movimento otimista ou confirmação aberta.

### Limites

Máximo de 60 cards por coluna, ordenados por última mensagem. Quando estoura, o rodapé da coluna diz
"+N atendimentos não exibidos" — truncar em silêncio faria o quadro parecer completo quando não é.

---

## 6. Estrutura de abas e layout

```
app/dashboard/chats/page.tsx          (server, inalterado)
└── chats-page.tsx                    (inalterado)
    └── ChatsMain                     (mantém o gate de conexões WhatsApp)
        └── ChatsWorkspace            (NOVO — dono de `tab` e `selectedChatId`)
            ├── Tabs variant="page"   (hub | quadro | estatisticas)
            ├── ChatHub               (passa a receber selectedChatId/onSelectChat)
            ├── ChatsBoard
            └── ChatsStatsSection
```

Pontos de atenção:

- **`selectedChatId` sobe para o `ChatsWorkspace`.** Clicar num card do quadro seleciona o chat e troca para a aba Hub — sem isso o quadro seria um beco sem saída.
- **A aba Hub usa `forceMount`.** Radix desmonta `TabsContent` inativo por padrão; sem `forceMount`, ir ao quadro e voltar remontaria a thread, perderia o scroll e refaria as inscrições de realtime. Quadro e estatísticas montam sob demanda (e suas queries recebem `enabled: tab === ...`, para não pollar em segundo plano).
- **Altura.** O hub é `h-full` com panes que rolam por dentro. O `Tabs` precisa de `flex min-h-0 flex-1 flex-col` e cada `TabsContent` de `min-h-0 flex-1`, senão o `min-height: auto` do flex estoura a página. O quadro reaproveita as classes de altura do quadro de pedidos (`md:max-h-[calc(100dvh-…)]`); só a aba de estatísticas rola a página.
- Toolbar segue `tabsPageToolbarClassName` / `tabsPageToolbarActionsClassName` (padrão de `app/dashboard/dashboard-page.tsx`), com `WhatsappConnectionsPills` à direita.

---

## 7. Contratos de API

Todas as rotas: `appApiHandler`, `getCurrentSessionUncached`, `assertChatAccess`, resposta
`{ data, message }`, params de GET parseados como string e convertidos no schema Zod (convenção do
CLAUDE.md).

### `GET /api/chats/board`

```
Input:  view? · whatsappConexaoTelefoneId? · prioridade? · search? · encerradosDias? (1|3|7, default 3)
Output: {
  data: {
    colunas: [{ status, itens: TChatBoardCard[], total, exibidos }],
    totais: { abertos, naFila, pendentes }
  },
  message
}
```

Query única sobre `chat_assignments`, com joins de `chats`, `clients`, `chat_messages` (última
mensagem), `users` (responsável) e `whatsapp_connections` (tipo, para a janela). Status não-terminais
sem recorte de data; `ENCERRADO` com `dataEncerramento >= now() - encerradosDias`. Agrupamento por
status feito na service — não em SQL — para conseguir devolver `total` e `exibidos` por coluna.

### `GET /api/chats/stats/overview`

```
Input:  startDate · endDate · comparingStartDate? · comparingEndDate? · whatsappConexaoTelefoneId? · responsavelUsuarioId?
Output: { data: { periodo, volume, tempos, sla, atendimento, mensagens, backlog, distribuicoes, comparacao? }, message }
```

`tempos` traz `{ media, mediana, p90, amostra }` por métrica — `amostra` é o N, para a UI poder
silenciar um p90 calculado sobre 3 tickets. `backlog` é retrato e ignora o filtro de período.

### `GET /api/chats/stats/timeseries`

```
Input:  startDate · endDate · granularidade? (DIA|SEMANA, default automático) · whatsappConexaoTelefoneId?
Output: { data: { serie: [{ data, abertos, encerrados, resolvidos, primeiraRespostaMediana, mensagensRecebidas, mensagensEnviadas }],
                  carga: [{ diaSemana, hora, mensagensRecebidas, atendimentosAbertos }] }, message }
```

Buckets gerados por `generate_series` no Postgres, para dias sem movimento virarem zero em vez de
buraco no gráfico.

### `GET /api/chats/stats/agents`

```
Input:  startDate · endDate · ordenarPor? (ChatStatsRankingByEnum) · whatsappConexaoTelefoneId?
Output: { data: { ranking: [...], ordenadoPor }, message }
```

Exige `assertChatAccess({ session, permission: "finalizar" })` (D8).

### Nomes (CLAUDE.md §Portuguese vs. English)

Campos de payload em português (`atendimentosAbertos`, `tempoPrimeiraResposta`, `naFila`); funções,
componentes e tipos em inglês (`getChatsStatsOverview`, `ChatsBoardColumn`, `TChatBoardCard`); enums
novos em `schemas/enums.ts` com valores SCREAMING_CASE em português
(`ChatStatsRankingByEnum`, `ChatBoardClosedWindowEnum`).

---

## 8. Índices e migration

Uma migration aditiva, `drizzle/0055_chat_assignments_analytics_indexes.sql`, só com índices — nenhuma
coluna nova. Os índices existentes cobrem acesso por chat e por usuário, mas nenhum cobre varredura
por organização + data, que é o acesso de toda a aba de estatísticas.

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chat_assignments_org_data_insercao
  ON ampmais_chat_assignments (organizacao_id, data_insercao DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chat_assignments_org_data_encerramento
  ON ampmais_chat_assignments (organizacao_id, data_encerramento DESC)
  WHERE data_encerramento IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chat_assignments_org_status
  ON ampmais_chat_assignments (organizacao_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chat_messages_org_data_envio
  ON ampmais_chat_messages (organizacao_id, data_envio DESC);
```

`CONCURRENTLY` pelo mesmo motivo documentado na 0052 §6.4 — as tabelas têm volume e o índice não
pode travar escrita de webhook. Espelhar as definições em `services/drizzle/schema/chats.ts` para o
schema não divergir do banco.

---

## 9. Mapa de arquivos

**Novos — backend**

| Arquivo | Papel |
|---|---|
| `lib/chats/analytics.ts` | Fragmentos SQL de percentil, faixas de SLA, bucketização, tipos compartilhados |
| `app/api/chats/board/route.ts` | GET do quadro |
| `app/api/chats/stats/overview/route.ts` | KPIs, tempos, SLA, fila, distribuições |
| `app/api/chats/stats/timeseries/route.ts` | Série diária + heatmap de carga |
| `app/api/chats/stats/agents/route.ts` | Ranking de atendentes |

**Novos — cliente**

| Arquivo | Papel |
|---|---|
| `lib/queries/chats-board.ts` | `useChatsBoard({ filtros, paused, enabled })` |
| `lib/queries/chats-stats.ts` | `useChatsStatsOverview` / `useChatsStatsTimeseries` / `useChatsStatsAgents` |
| `components/Chats/ChatsWorkspace.tsx` | Shell das abas, dono de `tab` e `selectedChatId` |
| `components/Chats/Board/config.tsx` | Colunas, rótulos, ícones, regras de transição, meta de prioridade |
| `components/Chats/Board/ChatsBoard.tsx` | `DndContext`, otimismo, rollback, realtime |
| `components/Chats/Board/ChatsBoardColumn.tsx` | `useDroppable` + cabeçalho + contador |
| `components/Chats/Board/ChatsBoardCard.tsx` | Card (também usado no `DragOverlay`) |
| `components/Chats/Board/ChatsBoardFilters.tsx` | Barra de filtros |
| `components/Chats/Stats/ChatsStatsSection.tsx` | Período + composição dos blocos |
| `components/Chats/Stats/Blocks/*.tsx` | Sete blocos da [§4](#4-aba-estatísticas--conjunto-analítico) |

**Alterados**

| Arquivo | Mudança |
|---|---|
| `components/Chats/ChatsMain.tsx` | Renderiza `ChatsWorkspace` em vez de `ChatHub` |
| `components/Chats/ChatHub.tsx` | `selectedChatId`/`onSelectChat` viram props controladas |
| `schemas/enums.ts` | `ChatStatsRankingByEnum`, `ChatBoardClosedWindowEnum`, `ChatsWorkspaceTabEnum` |
| `services/drizzle/schema/chats.ts` | Declaração dos índices novos |

`app/dashboard/chats/page.tsx` e `chats-page.tsx` não mudam — o gate de permissão e o layout já servem.

---

## 10. Fases de implementação

Cada fase compila, passa no lint e pode ir para produção sozinha.

**Fase 1 — Casca de abas.** `ChatsWorkspace` com as três abas; quadro e estatísticas como
placeholders. Hub controlado e com `forceMount`. Encerra quando trocar de aba e voltar preserva a
conversa aberta e o scroll da thread. *(~150 linhas; o risco aqui é o layout de altura, e ele é
melhor isolado antes de existir conteúdo.)*

**Fase 2 — Migration de índices.** Aplicada antes das rotas de leitura chegarem.

**Fase 3 — Quadro, leitura.** `GET /api/chats/board` + `useChatsBoard` + colunas/cards, sem drag.
Clique no card leva ao hub. Já entrega valor sozinho.

**Fase 4 — Quadro, movimentação.** dnd-kit, otimismo com rollback, confirmação de encerramento,
menu de mover/prioridade/cancelar, realtime e polling pausável.

**Fase 5 — Estatísticas, núcleo.** `overview` + `timeseries`, blocos 1 a 4 e 6.

**Fase 6 — Estatísticas, gestão.** `agents` + ranking (bloco 5) e heatmap (bloco 7).

**Verificação por fase**

- `pnpm lint` e `pnpm build` (o build é o type-check real do App Router).
- Cada rota exercitada com organização sem dados (períodos vazios não podem quebrar percentil nem divisão por zero) e com período de 90 dias.
- Quadro: mover com permissão, sem permissão (espera 403 + rollback), com duas abas abertas (realtime), e durante arraste com polling ativo.
- Acessibilidade: mover por teclado via menu, `announcements` do dnd-kit em português, rótulo `sr-only` no ponto de janela.

---

## 11. Riscos e follow-ups

| # | Risco | Mitigação nesta iteração | Follow-up |
|---|---|---|---|
| R1 | Atribuição por atendente é aproximada (A4) | Métricas duras (encerramentos, mensagens) separadas das aproximadas; nota na tabela | `chat_assignment_events` (append-only: atribuição, transferência, mudança de status) — resolveria A2 e A4 de uma vez e habilitaria tempo real de fila |
| R2 | Percentil sobre amostra pequena engana | `amostra` no payload; UI omite p90 com N < 10 | — |
| R3 | Custo das queries de estatística em organizações grandes | Índices da [§8](#8-índices-e-migration); `staleTime` de 5 min nas queries; três rotas independentes | Tabela de agregado diário se o p95 passar de ~2 s |
| R4 | Quadro com muitos atendimentos ativos | Teto de 60 por coluna com contador de excedente explícito | Paginação por coluna sob demanda |
| R5 | Meta de SLA fixa em 15 min | Constante única em `lib/chats/analytics.ts` | Mover para `configuracao.recursos.hubAtendimentos` |
| R6 | Fuso horário nos buckets diários e no heatmap | Agregação em `America/Sao_Paulo` explícito no SQL, não no fuso do servidor | Fuso por organização quando existir o campo |
| R7 | `forceMount` no hub mantém realtime de todas as abas vivo | É desejado no hub (a inbox deve continuar quente); quadro/estatísticas usam `enabled` por aba | — |
```

---

## 12. Desvios durante a implementação

O que o código faz diferente do que este plano previa, e por quê.

### D-1 — A conversão de fuso precisa de dois `AT TIME ZONE` (correção de bug)

O plano ([R6](#11-riscos-e-follow-ups)) dizia "agregação em `America/Sao_Paulo` explícito no SQL", e a
leitura natural disso — `data_insercao AT TIME ZONE 'America/Sao_Paulo'` — está **errada**.

As colunas de data do módulo são `timestamp without time zone` alimentadas por `now()` sob
`TimeZone = UTC`: valores UTC que não declaram fuso nenhum. Um `AT TIME ZONE` sozinho não
converte esse valor — ele **interpreta** o valor como já sendo horário de São Paulo e produz
um `timestamptz` deslocado para o lado oposto. Um atendimento das 21h UTC (18h local) cairia
às 00h do dia seguinte em vez de às 18h: erro de 6 horas, atravessando a meia-noite. O
heatmap mostraria movimento de fim de tarde como madrugada, e a série diária empurraria parte
do movimento noturno para o dia seguinte.

O correto é declarar o fuso que o valor tem e só então converter:

```sql
(data_insercao at time zone 'UTC') at time zone 'America/Sao_Paulo'
```

Encapsulado em `inOperationTimezone()` (`lib/chats/analytics.ts`), com o mesmo cuidado em
`nowAsNaiveUtc()` para comparações contra `now()` — que é `timestamptz` e, sem normalização,
faria o resultado depender do `TimeZone` da sessão do Postgres.

### D-2 — Migration sem `CONCURRENTLY`, e um índice a menos

O plano pedia `CREATE INDEX CONCURRENTLY`. Não dá: `scripts/apply-sql-migration.ts` envolve o
arquivo inteiro em uma transação, e `CONCURRENTLY` não roda dentro de transação. A 0055 cria
os índices no modo normal e o cabeçalho documenta como aplicá-los com `psql -f` caso o lock em
`ampmais_chat_messages` se torne inaceitável.

O quarto índice previsto (`chat_messages` por organização + data) **já existia**: é o
`idx_chat_messages_organizacao_data_envio`, criado na 0052. Criar um duplicado custaria escrita
e disco sem ganho nenhum.

### D-3 — Menos enums do que o plano previa

`ChatStatsRankingByEnum` e `ChatBoardClosedWindowEnum` não foram criados.

A ordenação do ranking passou a ser **do cliente**: são poucas dezenas de linhas, e um refetch
por clique em cabeçalho custaria latência numa operação que é puramente local. A janela de
encerrados virou um número com clamp — um `z.enum(["1","3","7"])` existiria só para recusar 5.

`ChatsWorkspaceTabEnum` também não: a aba ativa é estado da tela e nunca atravessa a API, então
pela regra do CLAUDE.md ela é código, não dado — union local em `ChatsWorkspace.tsx`.

### D-4 — `podeGerenciar` viaja no card

O plano dizia que a UI espelharia `mayManageAssignment`. Em vez de reimplementar a regra no
cliente, a rota do quadro resolve a posse por card e envia `podeGerenciar`. Uma segunda cópia
da regra de autorização é uma cópia que vai divergir.

### D-5 — Cancelar também confirma

`chatBoardTransitionNeedsConfirmation` cobre `ENCERRADO` **e** `CANCELADO`. As duas transições
são terminais e nenhuma volta pelo quadro; confirmar uma e não a outra seria arbitrário.

### D-6 — O que ficou fora

Nada do escopo planejado. O `next build` continua vermelho na base por três dependências
ausentes do `package.json` (`d3-ease`, `@radix-ui/react-slider`, `@tiptap/core`), em arquivos
alheios a esta iniciativa (`lib/animations.ts`, `components/ui/slider.tsx`,
`components/Whatsapp/whatsapp-editor-marks.ts`). Com elas instaladas temporariamente, o
`Compiled successfully` passa. Corrigi-las é assunto de outro commit.
