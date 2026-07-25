# Motor de réguas autônomas por agente — Diagnóstico do repositório

Resposta ao documento *"RecompraCRM — Motor de réguas autônomas por agente de IA"*.
Estado do código na branch `claude/new-session-0x2nkf` (base: `3fcc9f3`).

Todas as citações são `arquivo:linha` verificadas no código atual.

---

## 0. Sumário executivo

**A base é muito melhor do que o documento assume, e o gargalo não está onde ele
supõe.**

O documento parte de "hoje o RecompraCRM entrega campanhas: o lojista cria, segmenta
e dispara". Isso descreve a *UI*, não o motor. Por baixo, o que existe já é
substancialmente uma máquina de agendamento por contato:

- A unidade de trabalho persistida **já é o contato**, não a campanha. `interactions`
  é uma linha por (cliente × campanha × ocorrência) com data e bloco de horário
  próprios (`services/drizzle/schema/interactions.ts:19-81`). A campanha é só o
  *template de política* que gerou a linha.
- A execução **já é event-driven na entrada**: uma venda importada avalia gatilhos e
  agenda interações individuais dentro da transação de importação
  (`lib/data-collecting-v2/effects.ts:355-431`). O cron de entrega apenas drena o
  que já foi agendado (`app/api/cron/process-interactions/route.ts:278-376`).
- Existe **reserva de quota transacional com claim idempotente por interação**
  (`lib/interactions/campaign-weekly-limits.ts:236-330`), que é exatamente a
  primitiva de deduplicação/idempotência que o documento pede no item B10.
- Existe **atribuição de receita com snapshot de perfil, tipo de conversão e receita
  incremental** (`lib/conversions/attribution.ts:196-324`,
  `lib/conversions/incremental.ts:43-55`) — não é só log de envio.
- Existe **afinidade de cesta real por item de nota**, com filtragem colaborativa
  item-item (`app/api/cron/product-client-references/route.ts:120-234`).

O que realmente falta é menor em volume e maior em consequência:

1. **Não existe relógio de recompra por cliente persistido.** O intervalo individual
   é calculado ad-hoc em dois lugares diferentes, com fórmulas diferentes, e
   descartado (`lib/conversions/attribution.ts:79-89` vs
   `lib/client-portfolios/queue.ts:44-51`). Nada dispara a partir dele.
2. **Não existe agendamento sem gatilho externo.** Toda interação nasce de um evento
   (venda, mudança de RFM, bloco de recorrência). Não há "acorde este cliente no dia
   X porque o ciclo dele fecha" — a régua individual é justamente isso.
3. **Não existe consentimento por finalidade/canal nem holdout.** Zero ocorrências no
   repositório inteiro.
4. **Não existe teto de frequência por contato.** O teto que existe é por
   organização/semana e por campanha/semana
   (`lib/interactions/campaign-weekly-limits.ts:316-322`), não por pessoa.
5. **Não existe importação retroativa de onboarding como produto.** Existe só como
   script de linha de comando operado por nós
   (`utils/scripts/sync-organization-manual-collecting.ts:29-46`).

**Conclusão de arquitetura: isto é extensão, não reescrita.** Os candidatos naturais
a "reescrita" — o modelo de dados de interações e a máquina de entrega — são
justamente as duas peças mais bem construídas e as que sobrevivem inteiras. O que
precisa nascer é uma camada *acima* delas (política por contato, relógio,
orquestração) e uma tabela nova de agendamento não-disparado por evento.

---

## 1. Tabela de capacidades

| # | Capacidade | Estado | Evidência |
|---|---|---|---|
| A1 | Cliente final como entidade de 1ª classe com estado persistente | **Existe** | `services/drizzle/schema/clients.ts:11-89` — estado de compra (`primeiraCompraData`, `ultimaCompraData`), RFM, metadados de campanha |
| A2 | Memória/histórico de interação por contato, unificado | **Existe parcialmente** | `services/drizzle/schema/interactions.ts:19-81` unifica campanha + manual + carteira; mas o Hub de Atendimentos vive em tabela separada (`services/drizzle/schema/chats.ts:107-146`) e não é lido como memória |
| A3 | Atributos dinâmicos por organização | **Existe parcialmente** | Tags com metadados tipados (`services/drizzle/schema/clients.ts:91-155`); demais campos são fixos no schema |
| A4 | Consentimento por finalidade e canal | **Não existe** | Zero ocorrências. O que há é uma pausa global manual: `services/drizzle/schema/clients.ts:70` (`comunicacaoPausadaAte`) |
| A5 | Opt-out global honrado por todos os produtores | **Existe parcialmente** | `lib/campaigns/filters.ts:187-212` — honrado por campanhas de audiência e pela fila da carteira; **não** honrado pelo caminho transacional de venda (ver §3, B) |
| B5 | Granularidade de agendamento = contato | **Existe** | `services/drizzle/schema/interactions.ts:49-50` — cada linha tem `agendamentoDataReferencia` + `agendamentoBlocoReferencia` próprios |
| B6 | Agendamento por contato *sem* gatilho externo (relógio) | **Não existe** | Todo enqueue parte de um evento; nenhum caminho lê "próxima janela do cliente" |
| B7 | Event bus | **Não existe** | Módulos chamam funções diretamente: `lib/data-collecting-v2/index.ts:178-185`, `app/api/point-of-interaction/new-transaction/route.ts:846-919` |
| B8 | Isolamento de falha no cron | **Existe parcialmente** | `app/api/cron/process-interactions/route.ts:269-396` isola por organização; `app/api/cron/process-single-use-campaigns/route.ts:384-441` **não** isola |
| B9 | Fila/worker para milhares de jobs individuais | **Não existe** | Nenhuma infra de fila em `package.json`; só Vercel Cron (`vercel.json:2-83`) com `maxDuration = 300` |
| B10 | Idempotência e deduplicação | **Existe** (para campanhas) | `lib/interactions/campaign-weekly-limits.ts:254-268` — `SELECT … FOR UPDATE` + claim por `dataExecucao`; `lib/interactions/delivery-state.ts:66-90` — transições monotônicas de status |
| B10b | Deduplicação entre *agentes concorrentes* sobre o mesmo contato | **Não existe** | Dedupe atual é por campanha (`lib/data-collecting-v2/effects.ts:41-70`), não por contato |
| C11 | Itens de nota nos conectores | **Existe** | `lib/data-connectors/types.ts:106-119` (`TCanonicalSaleItem`), persistido em `services/drizzle/schema/sales.ts:156-195` |
| C12 | Importação retroativa no onboarding | **Existe parcialmente** | Capacidade técnica existe (`lib/data-collecting-v2/index.ts:28-34` aceita `window` arbitrária); exposta só como script (`utils/scripts/sync-organization-manual-collecting.ts:29-46`) |
| C13 | Estoque/giro/margem consultável por motor de ofertas | **Existe parcialmente** | Preço e custo por produto (`services/drizzle/schema/products.ts:35-36`), saldo e custo por movimento (`services/drizzle/schema/products.ts:455-461`); análise de portfólio é para UI (`lib/products/portfolio-analysis/build-findings.ts`), não API de decisão |
| C14 | RFM com intervalo individual entre compras | **Não existe** (RFM), **existe disperso** (intervalo) | RFM classifica em faixas: `app/api/cron/rfm-analysis/route.ts:206-228, 282-303`. Intervalo individual é calculado e descartado em `lib/conversions/attribution.ts:79-89` e recalculado com outra fórmula em `lib/client-portfolios/queue.ts:44-51` |
| D15 | WhatsApp oficial: templates aprovados | **Existe** | `services/drizzle/schema/whatsapp-templates.ts:32-52` (status/qualidade por telefone), `lib/whatsapp/template-management.ts` (1036 linhas) |
| D15b | Controle ativo da janela de 24h | **Existe parcialmente** | Âncora persistida (`services/drizzle/schema/chats.ts:42`); erro tratado *a posteriori* (`lib/whatsapp/parsing.ts:78`); bloqueio *a priori* só no cliente (`components/Chats/Components/Input.tsx:43-45`) |
| D15c | Resposta inbound | **Existe** | `app/api/integrations/whatsapp/route.ts:568-569`, `app/api/integrations/whatsapp/gateway/route.ts:418-419` |
| D16 | Teto de frequência **por contato** somando todas as origens | **Não existe** | Teto é por organização/semana e campanha/semana: `lib/interactions/campaign-weekly-limits.ts:316-322` |
| D17 | Classificação de intenção + roteamento para humano | **Existe parcialmente** | Escalonamento por palavra-chave (`lib/ai/ai-agent/prompts.ts:210-213`) e por tool do agente (`lib/ai/ai-agent/transfer-service-to-human.ts:16-`); não há classificador de intenção estruturado |
| E18 | Grupo de controle / holdout | **Não existe** | Zero ocorrências no repositório |
| E19 | "Quanto de receita esta comunicação gerou" | **Existe** | `services/drizzle/schema/campaign-conversions.ts:11-69` + `lib/conversions/incremental.ts:43-55` (receita incremental por tipo de conversão) |
| E20 | Rastro de decisão | **Não existe** | Só log de envio (`services/drizzle/schema/interactions.ts:55-58`) + `console.log` |
| F21 | Carteira de vendedor acionável como destino de escalonamento | **Existe parcialmente** | Fila derivada por consulta (`lib/client-portfolios/queue.ts:53-`); escrita de interação já tem `iniciadoPor: "AGENTE_IA"` previsto (`lib/interactions/create.ts:43`), mas nenhum caminho automático escreve nela |
| G22 | Contabilização/teto de consumo de IA por organização | **Existe parcialmente** | Campos de limite existem (`schemas/organizations.ts:166-181`); tokens são gravados só em `ai_hints` (`services/drizzle/schema/ai-hints.ts:29`); **nenhum limite é enforçado** — `limiteCreditos`/`limiteSemanal` não têm leitor no código |

---

## 2. Bloco A — Modelo de dados e estado

### A1. O cliente é entidade de primeira classe?

**Sim, e com estado de negócio já persistido.** `clients` não é participante de
campanha: é a entidade central, com FK de `sales`, `interactions`,
`cashbackProgramBalances`, `chats`, `clientSellerReferences`,
`productClientReferences`.

O estado relevante para uma régua individual já está lá:

```
services/drizzle/schema/clients.ts:48-51   primeiraCompraData / ultimaCompraData (+ IDs)
services/drizzle/schema/clients.ts:53-58   bloco RFM (título, notas R/F/M, últimas atualização e alteração)
services/drizzle/schema/clients.ts:61-66   metadados computados por cron (total de compras, valor, produto favorito, grupo, sugerido)
services/drizzle/schema/clients.ts:70      comunicacaoPausadaAte
```

`analiseRFMUltimaAlteracao` (`:58`) é uma boa surpresa: já existe memória de *quando o
cliente mudou de segmento*, que é o insumo do gatilho "entrou em risco".

**O que falta para o Relógio de Recompra:** não há
`intervaloMedioCompraDias`, `proximaJanelaCompraInicio/Fim`,
`probabilidadeAbandono`, `valorEsperadoCliente`. Esses são campos aditivos na mesma
tabela (ou numa tabela `client_purchase_clocks` 1:1, preferível por cadência de
atualização distinta).

### A2. Onde vive o histórico de interação?

**Majoritariamente unificado em `interactions`, com uma fronteira aberta.**

A tabela já foi evoluída para ser primitivo de relacionamento, não só fila de envio
(`services/drizzle/schema/interactions.ts:35-46`):

- `canal` / `direcao` / `iniciadoPor` — e `iniciadoPor` já prevê `AGENTE_IA`
  (`services/drizzle/schema/enums.ts:31`);
- `dataInteracao` como âncora canônica, distinta de `dataInsercao` (registro) e
  `dataExecucao` (claim de entrega) — a distinção certa, documentada em
  `services/drizzle/schema/interactions.ts:42-44`;
- `status` de ciclo de vida (`PLANEJADA` / `REALIZADA` / `CANCELADA`), separado de
  `statusEnvio` (entrega).

O ponto único de escrita manual mantém invariantes explícitos
(`lib/interactions/create.ts:53-63`): linha manual nunca tem `campanhaId`,
`agendamento*`, `statusEnvio` — logo não entra na máquina de entrega nem consome
quota.

**A fronteira aberta:** as conversas do Hub (`chats` / `chat_messages`,
`services/drizzle/schema/chats.ts:19-146`) são um segundo histórico. A fila da carteira
já as consulta como sinal de supressão (`lib/client-portfolios/queue.ts:118-124`), mas
nenhuma delas vira linha de `interactions`. Para "memória por contato" no sentido do
Agent Core, isso precisa convergir — provavelmente via projeção (uma interação
`ENTRADA`/`WHATSAPP` por conversa iniciada pelo cliente), não via merge de tabelas.

### A3. Atributos dinâmicos por organização?

**Parcialmente.** O mecanismo genérico que existe é tags com metadados discriminados
(`services/drizzle/schema/clients.ts:91-121` — `metadados` jsonb tipado
`TClientTagMetadata` com `{tipo: "MANUAL"}` como default). Isso cobre "marcadores por
organização", não "atributos tipados com valor".

Perfil declarado (composição da casa, preferências, datas — o Coletor da Fatia 2)
**não tem onde morar hoje**. Campos como `dataNascimento`, `profissao`,
`estadoCivil` (`services/drizzle/schema/clients.ts:72-77`) são fixos e vieram de outro
propósito (importação de ERP).

Recomendação: `client_attributes` (organizacaoId, clienteId, chave, valorTexto/valorNumero/valorData,
origem, dataColeta, consentimentoId). Fora da Fatia 1, mas o schema deve nascer junto
com o de consentimento para não retrabalhar a auditoria.

### A4/A5. Consentimento e opt-out

**Consentimento por finalidade e canal não existe.** Não há tabela, nem campo, nem
verificação. LGPD aparece só em textos de marketing e em webhooks de parceiros
(`lib/integrations/nuvemshop/webhook-notifications.ts:10`).

**O opt-out que existe é uma pausa temporal global**, gravada por ação manual
(`services/drizzle/schema/clients.ts:68-70`). É honrada em dois lugares:

- resolução de audiência de campanha — `lib/campaigns/filters.ts:187-212`, usado por
  `app/api/cron/rfm-analysis/route.ts:186-192` e pelos crons de campanha;
- fila da carteira do vendedor — `lib/client-portfolios/queue.ts:66`.

**Furo real:** o caminho transacional **não** consulta a pausa. Em
`lib/data-collecting-v2/effects.ts:355-431`, `getCampaignsForSale` filtra por audiência
resolvida (`campaignAudienceHasClient`, `:104`), e a audiência do caminho
transacional é resolvida em `lib/data-collecting-v2/campaign-audiences.ts`, sem passar
por `filterCommunicationPausedClientIds`. Mesmo padrão em
`app/api/point-of-interaction/new-transaction/route.ts:1095-1290`.

Ou seja: **hoje um cliente que pediu para não ser mais contatado ainda recebe a
mensagem de "nova compra" quando compra.** Isso é um bug de conformidade
independente de qualquer roadmap de agentes, e vale corrigir antes de tudo (uma
linha de filtro em cada um dos dois caminhos).

---

## 3. Bloco B — Motor de execução (foco principal)

### B5. Qual a granularidade real do agendamento?

**Contato.** Esta é a correção central ao diagnóstico do documento.

`interactions` é uma linha por (cliente, campanha, ocorrência), com agendamento
próprio em dois eixos: data (`agendamentoDataReferencia`, ISO `YYYY-MM-DD`) e bloco
horário (`agendamentoBlocoReferencia`, 24 blocos de hora cheia —
`lib/campaigns/time-blocks.ts:10-35`). Ver
`services/drizzle/schema/interactions.ts:48-50`.

O cron de entrega **não varre segmentos**. Ele pagina linhas já agendadas cujo bloco
chegou:

```
app/api/cron/process-interactions/route.ts:83-99
  where: organizacaoId = X
     and agendamentoDataReferencia = hoje
     and agendamentoBlocoReferencia IN (blocos já chegados)
     and campanhaId IS NOT NULL
     and dataExecucao IS NULL
     and statusEnvio IS NULL
```

suportado por índice composto dedicado
(`services/drizzle/schema/interactions.ts:61-68`).

O agendamento por contato é criado no momento do evento, com o atraso configurado na
campanha aplicado por cliente:

```
lib/data-collecting-v2/effects.ts:361-365   getPostponedDateFromReferenceDate(now, unidade, valor)
lib/data-collecting-v2/effects.ts:403-417   INSERT interactions (agendamentoDataReferencia, agendamentoBlocoReferencia)
```

**Então onde está a campanha como "unidade de trabalho"?** Em três lugares, todos
periféricos ao motor:

- `process-recurrent-campaigns` (`app/api/cron/process-recurrent-campaigns/route.ts`)
  e `process-single-use-campaigns` — resolvem audiência e enfileiram em massa. São
  *produtores*, e produtores em lote são legítimos mesmo no modelo alvo (um "broadcast"
  continua existindo).
- A política de frequência é lida da campanha (`campaigns.frequenciaIntervaloValor`,
  `services/drizzle/schema/campaigns.ts:60-61`), então "quantas vezes falo com este
  cliente" é decidido por campanha, não por cliente. Este é o gargalo real.
- O template é obrigatório e vem da campanha
  (`services/drizzle/schema/campaigns.ts:67-69`, `.notNull()`). Uma decisão de agente
  precisa poder escolher template em tempo de execução.

### B6. Esforço de introduzir agendamento por contato: extensão ou reescrita?

**Extensão.** O agendamento por contato já existe; o que falta é *uma origem de
agendamento que não seja um evento externo*.

Hoje, todo caminho que cria interação parte de um gatilho:

| Origem | Gatilho | Local |
|---|---|---|
| Importação ERP/marketplace | venda importada | `lib/data-collecting-v2/effects.ts:355-431` |
| Ponto de Interação (tablet) | transação no balcão | `app/api/point-of-interaction/new-transaction/route.ts:846-919` |
| RFM | mudança/permanência de segmento | `app/api/cron/rfm-analysis/route.ts:305-420` |
| Cashback expirando / aniversário / pior dia | data | `app/api/cron/cashback-expiring-notify/route.ts`, `birthday-notify`, `worst-sales-day-notify` |
| Recorrente / uso único | calendário da campanha | `app/api/cron/process-recurrent-campaigns/route.ts`, `process-single-use-campaigns` |

Falta a sexta linha: **"relógio do cliente fechou"**. E isso é um produtor novo, do
mesmo formato dos cinco existentes, que insere na mesma tabela e é drenado pelo mesmo
consumidor.

**O que sobrevive integralmente:**

- `interactions` como fila e como histórico — schema inteiro;
- toda a máquina de entrega: `lib/interactions/process-organization-interactions.ts`,
  `send-reserved-interaction.ts`, `delivery-state.ts`, `weekly-send-counters.ts`;
- reserva/claim transacional (`lib/interactions/campaign-weekly-limits.ts:236-330`);
- resolução de audiência e árvore de filtros (`lib/campaigns/filters.ts`);
- atribuição e conversões (`lib/conversions/`);
- conectores e modelo canônico (`lib/data-connectors/`);
- templates e gateway WhatsApp (`lib/whatsapp/`, `lib/message-templates/`).

**O que precisa mudar de forma incômoda (mas não de reescrita):**

1. `interactions.campanhaId` é a chave de tudo no consumidor. O cron **exige**
   `isNotNull(campanhaId)` (`app/api/cron/process-interactions/route.ts:89`) e a
   reserva também (`lib/interactions/campaign-weekly-limits.ts:262`). Uma interação
   originada de agente não tem campanha. Duas saídas:
   - **(a)** adicionar `politicaId` nullable e relaxar o filtro para
     `campanhaId IS NOT NULL OR politicaId IS NOT NULL`;
   - **(b)** modelar cada agente como uma "campanha de sistema" invisível na UI.
   A **(a)** é mais honesta e é a que o segundo produto (B2B) vai precisar; a (b) é
   mais barata na primeira semana e mais cara depois. Recomendo (a).
2. `campaigns.whatsappTemplateId` é `.notNull()`
   (`services/drizzle/schema/campaigns.ts:67-69`). Para o Redator escolher template em
   runtime, o template precisa poder ser resolvido na interação, não na política. Campo
   novo `interactions.messageTemplateId` nullable, com fallback para o da campanha.
3. `getCampaignConfigurationError` falha a interação se a campanha não tem template
   (`app/api/cron/process-interactions/route.ts:189-195`) — precisa aceitar template
   na interação.

Estimativa: as três mudanças acima somam algo como 150–250 linhas em arquivos
existentes, todas aditivas e compatíveis com o que roda hoje.

### B7. Event bus?

**Não existe.** Os módulos se chamam diretamente e de forma síncrona, dentro da mesma
transação:

```
lib/data-collecting-v2/index.ts:165-185
  db.transaction:
    syncAuxiliaryEntities → syncSales → resolveCampaignAudiences → processDataCollectingV2Effects
```

E `processDataCollectingV2Effects` faz, *na mesma transação*: atribuição de conversão,
acúmulo de cashback, estorno de cashback de venda cancelada, avaliação de gatilhos de
campanha, concessão de bônus, e insert das interações
(`lib/data-collecting-v2/effects.ts:266-529`).

O mesmo acontece no POI, só que copiado à mão em cinco funções gêmeas de ~150 linhas
cada (`app/api/point-of-interaction/new-transaction/route.ts:1095, 1293, 1448, 1594,
1746`) — duplicação real da lógica de `effects.ts`, com desvios (a de POI tem
`handleCampaignProcessingForCashbackAccumulation` em ponto diferente do fluxo,
`:686`).

**Uma venda registrada não emite evento consumível.** Consequências práticas:

- adicionar um consumidor novo significa editar `effects.ts` **e** as cinco funções do
  POI;
- não há como reprocessar "o que aconteceu na venda X" sem reimportar;
- a transação de importação carrega efeitos comerciais: uma falha em cashback
  desfaz o insert das vendas.

**Recomendação (Fatia 1):** não construir um event bus de infraestrutura (Kafka,
Redis Streams). Construir uma **outbox transacional**: `domain_events`
(organizacaoId, tipo, agregadoTipo, agregadoId, payload jsonb, dataOcorrencia,
dataProcessamento, tentativas). Escrever nela dentro da transação de venda; drenar
num cron dedicado. Isso dá: reprocessabilidade, desacoplamento dos consumidores,
isolamento de falha por evento, e é ~1 tabela + ~200 linhas. E resolve de quebra a
duplicação POI ↔ data-collecting, porque ambos passam a só emitir `VENDA_VALIDADA`.

### B8. Isolamento de falha no cron atual

**Desigual, e o pior caso é grave.**

Bom: `process-interactions` isola por organização —
`try` dentro do loop (`app/api/cron/process-interactions/route.ts:269-396`), erro
incrementa `failedOrganizationsCount` e segue para a próxima. Também respeita orçamento
de tempo (`:20`, `RUNTIME_BUDGET_MS = 295000`; `:66-68`,
`shouldContinueProcessing`) — não morre por timeout no meio.

Ruim: `process-single-use-campaigns` tem **um único `try` envolvendo o loop inteiro**
(`app/api/cron/process-single-use-campaigns/route.ts:384-441`). Um erro em qualquer
organização aborta o processamento de todas as seguintes, silenciosamente (retorna 500
e o Vercel só registra). `process-recurrent-campaigns` tem o mesmo formato
(`app/api/cron/process-recurrent-campaigns/route.ts:255-305`): há `try` para o
pós-enfileiramento de cada lote (`:214-231`), mas nenhum em volta da organização.

Pior ainda: `rfm-analysis` roda **uma transação por organização abrangendo todos os
clientes** (`app/api/cron/rfm-analysis/route.ts:249` — `db.transaction(async (tx) => {`
seguido do loop sobre `accumulatedResultsByClient`). Numa organização com 50 mil
clientes, é uma transação longa que segura locks e, ao falhar no cliente 49.999,
descarta 49.998 atualizações de RFM.

**Um redesenho para execução por contato resolveria o blast radius?** Parcialmente, e
não automaticamente. O ganho real vem de três coisas específicas, não do "por contato"
em si:

1. `try` por unidade de trabalho (já existe no consumidor, falta nos produtores);
2. transações curtas — commit por lote de N clientes, não por organização;
3. estado de progresso persistido, para retomar em vez de reprocessar.

Vale notar que o consumidor **já** tem isolamento por interação:
`Promise.allSettled` sobre o lote de envio
(`lib/interactions/process-organization-interactions.ts:149-157`), com cada rejeição
virando um resultado `FAILED` individual. O blast radius do envio já é 1 contato. O
blast radius que dói é o dos **produtores**.

### B9. Infraestrutura de fila/worker

**Não existe.** `package.json` não tem QStash, Inngest, BullMQ, Trigger.dev, Temporal,
Redis, pg-boss ou Graphile Worker. A infraestrutura de execução assíncrona é
integralmente Vercel Cron: 20 entradas em `vercel.json:2-83`, com
`maxDuration = 300` por rota (`app/api/cron/process-interactions/route.ts:424`).

A pergunta do documento é "que infra suportaria milhares de jobs individuais por
organização". A resposta honesta: **a que existe já suporta, e a razão é que
`interactions` já é a fila.**

- Job individual = linha em `interactions` com claim atômico.
- Worker = invocação do cron, que pagina em blocos de 250
  (`app/api/cron/process-interactions/route.ts:18`) com concorrência de envio 10
  (`:19`).
- Locking = `SELECT … FOR UPDATE` + `dataExecucao` como claim
  (`lib/interactions/campaign-weekly-limits.ts:254-268`).

Isso é um *job queue* em Postgres, bem construído, e escala razoavelmente longe.

Os limites reais, na ordem em que vão doer:

1. **`process-interactions` roda de hora em hora** (`vercel.json:63-66`). A granularidade
   mínima de entrega é 1 hora, que é a mesma dos blocos horários. Uma régua individual
   quer minutos, não horas. → mudar para `*/10 * * * *` é trivial e não quebra nada
   (o filtro de blocos chegados já é idempotente, `lib/campaigns/time-blocks.ts:63-66`).
2. **Uma invocação, todas as organizações, 295 s de orçamento**
   (`app/api/cron/process-interactions/route.ts:252-254, 263`). Com N organizações
   grandes, as últimas da lista ficam sistematicamente sem processamento — e a ordem é
   a do `findMany` sem `ORDER BY`, ou seja, arbitrária mas estável. Isso é fome de
   recursos silenciosa. → precisa de fan-out (uma invocação por organização) e/ou
   ordenação por "menos recentemente processada".
3. **Sem retry.** Uma interação que falha vira `FALHOU` terminal
   (`lib/interactions/delivery-state.ts:14`) e nunca é retentada. Para um motor que
   promete "devolve o cliente para a loja", uma falha transitória do WhatsApp virar
   perda definitiva do toque é caro. → `tentativas` + `proximaTentativaEm` na interação.

**Recomendação:** não trocar de infra na Fatia 1. Extrair o padrão para
`lib/queue/` (claim, retry com backoff, orçamento de tempo, fan-out por organização) e
migrar os produtores para ele. Se o volume justificar depois, o mesmo contrato roda
sobre QStash sem tocar em regra de negócio.

### B10. Idempotência e deduplicação com múltiplos agentes

**A metade difícil já está resolvida; a metade que o documento aponta, não.**

O que existe e é sólido:

- **Claim atômico por interação.** `reserveOrganizationWeeklyQuotaBatch`
  (`lib/interactions/campaign-weekly-limits.ts:236-330`) trava as linhas com
  `.for("update")` ordenadas por `(dataInsercao, id)` — ordem estável, então sem
  deadlock entre workers — e devolve `alreadyReservedInteractionIds` para quem perdeu a
  corrida (`:266-268`). Dois workers na mesma interação: um envia, o outro recebe
  `ALREADY_RESERVED`.
- **Contadores O(1) com `NULLS NOT DISTINCT`.** `weeklySendCounters`
  (`services/drizzle/schema/campaigns.ts:144-161`) — a linha com `campanhaId NULL` é o
  contador da organização, com unique index que permite upsert idempotente
  (`:158-160`). Substituiu `COUNT(*)` sobre `interactions` na reserva. É bom design.
- **Transições de status monotônicas.** `resolveNextDeliveryStatus`
  (`lib/interactions/delivery-state.ts:16-33`): `ENTREGUE` nunca volta para `ENVIADO`,
  `BLOQUEADA` é absorvente, e webhook duplicado não libera quota duas vezes
  (`:60-64`, comentário explícito).
- **Dedupe intra-lote em memória** por `interactionId`
  (`lib/interactions/process-organization-interactions.ts:54-66`).

O que **não** existe — e é exatamente o que o documento pede:

- **Nada impede duas interações distintas para o mesmo contato no mesmo dia.** O
  dedupe é *por campanha*: `canScheduleCampaignForClient`
  (`lib/data-collecting-v2/effects.ts:41-70`) checa recorrência e intervalo **daquela
  campanha**. Duas campanhas diferentes agendam livremente para o mesmo cliente.
- **A única mitigação é a prioridade exclusiva de gatilho de compra**
  (`lib/campaigns/purchase-trigger-priority.ts:26`): entre `PRIMEIRA-COMPRA` e
  `NOVA-COMPRA` escolhe-se uma. É uma regra pontual, não um mecanismo.
- **Não há chave de idempotência semântica.** Se o mesmo evento for processado duas
  vezes (reimportação, retry), as guardas são: `canScheduleCampaignForClient`
  (janela de tempo, aproximado) e, na acumulação de cashback,
  `alreadyProcessed` (`lib/data-collecting-v2/effects.ts:300`). Não há
  `UNIQUE(organizacaoId, clienteId, origemTipo, origemId)` em `interactions`.

**Recomendação para o Agent Core:** um **claim por contato**, não por interação, na
etapa de *decisão* (não de entrega):

```
contact_action_claims(organizacaoId, clienteId, janelaChave, agenteId, prioridade, dataClaim)
UNIQUE(organizacaoId, clienteId, janelaChave)
```

Onde `janelaChave` é o dia (ou meio-dia) na timezone da organização. O agente que
quer falar com o contato tenta o insert; conflito → compara prioridade; perde → não
agenda. É a primitiva mínima que faz "múltiplos agentes sobre o mesmo contato"
convergir sem coordenação central, e reusa o padrão de `weeklySendCounters` que já
funciona aqui.

---

## 4. Bloco C — Dados transacionais

### C11. O que os conectores trazem?

**Itens de nota completos, e melhor do que o documento espera.** O modelo canônico
(`lib/data-connectors/types.ts:106-119`) carrega por item: produto externo, código,
quantidade, valor unitário de venda **e de custo**, bruto, desconto, líquido, custo
total, modificadores. E o cabeçalho (`:121-165`) traz canal, modalidade de entrega,
parceiro, pagamentos, chave/documento/modelo/série fiscais, e `isValidSale`/`isCanceled`.

Cinco conectores implementam esse contrato: Bling, Cardápio Web, iFood, Nuvemshop,
Online Software (`lib/data-connectors/`). Persistência em
`services/drizzle/schema/sales.ts:156-195` (`saleItems`), com custo unitário e total por
linha — logo **margem por item de venda é computável hoje**.

Ressalva: `TCanonicalSaleItemRewritePolicy` (`lib/data-connectors/types.ts:10`) admite
`INSERT_ONLY_FOR_NEW_SALES`, ou seja, para alguns conectores os itens de uma venda
atualizada não são reescritos. Para análise de cesta isso é aceitável; vale saber.

### C12. Importação retroativa no onboarding?

**A capacidade existe; o produto não.**

`runDataCollectingV2` aceita janela arbitrária e permite desligar seletivamente cada
efeito colateral (`lib/data-collecting-v2/index.ts:28-40`):

```ts
{ organizationIds?, window?, processImmediateInteractions?, effects?: { processCashback, processCampaigns, processConversionAttribution } }
```

Isso é exatamente o que a importação retroativa precisa: importar 12 meses **sem**
disparar campanhas nem conceder cashback. E já é usado assim em dois lugares:

- `app/api/cron/fix-previous-sales/route.ts:38-48` — 5 dias anteriores, campanhas
  desligadas, com comentário explicando o porquê (`:17-21`);
- `utils/scripts/sync-organization-manual-collecting.ts:29-46` — script com
  `--start`/`--end`/`--campaigns=skip`, cujo próprio texto de ajuda dá o exemplo de
  "importar vendas antigas sem efeitos colaterais comerciais".

**Falta:** rota autenticada, controle de progresso, retomada, e o gatilho no
onboarding. Hoje só rodamos nós, à mão. Como a promessa é "régua rodando em até 24 h
após a conexão", isso é bloqueante para a Fatia 1 — mas é trabalho de orquestração
sobre uma função que já faz o trabalho pesado, não construção do zero.

Atenção ao dimensionamento: 12 meses de vendas de uma organização média não cabe em
uma invocação de 300 s. Precisa de paginação por janela (ex.: mês a mês, retomando de
onde parou) com estado persistido.

### C13. Estoque, giro e margem consultáveis por um motor de ofertas?

**Os dados existem; a interface de consulta, não.**

Existe:
- preço de venda e de custo por produto (`services/drizzle/schema/products.ts:35-36`)
  e por variante (`:93-94`);
- flag de rastreamento de estoque (`:40`), modo de baixa (`:43`);
- lotes (`:353`) e transações de estoque com saldo anterior/posterior e custo
  unitário movimentado (`:418-461`) — dá para derivar giro por janela;
- análise de portfólio já computa concentração, atividade e margem
  (`lib/products/portfolio-analysis/build-findings.ts:83-115`).

Não existe: uma consulta do tipo *"para o cliente C, dentre os candidatos de oferta,
ordene por (margem × estoque parado × afinidade)"*. `portfolio-analysis` produz
achados textuais para a UI (`build-analysis-summary.ts:26-39`), não um ranking
consumível.

Também não existe **posição de estoque denormalizada** — o saldo atual sai de
`saldoPosterior` da última transação, o que é caro de consultar em lote. Um
`product_stock_positions` (ou coluna materializada) é pré-requisito para o Ofertista
decidir em tempo hábil.

### C14. Onde vive o cálculo de RFM?

`app/api/cron/rfm-analysis/route.ts`, diário às 05:00 UTC (`vercel.json:27-30`).

**Ele classifica em faixas, não calcula intervalo individual.** A agregação
(`:206-228`) é `sum(valorTotal)`, `count(sales.id)`, `max(dataVenda)` sobre 12 meses.
Depois: recência = dias desde a última compra, frequência = contagem, monetário =
soma (`:282-284`); cada um mapeado a um score 1–5 via faixas configuradas por
organização (`:286-297`, config em `utils` com `identificador = "CONFIG_RFM"`,
`:231-235`); a combinação vira um dos 11 rótulos (`utils/rfm.ts:71-` e
`getRFMLabel`).

**O intervalo entre compras por cliente é calculado em dois lugares, com fórmulas
diferentes, e nenhum dos dois persiste:**

1. `lib/conversions/attribution.ts:79-89` — média das diferenças entre compras
   consecutivas, com `cicloCompraConfiavel = qtdeCompras >= 3`
   (`:28`). Persistido apenas como *snapshot congelado numa conversão*
   (`services/drizzle/schema/campaign-conversions.ts:43`), nunca como estado do cliente.
2. `lib/client-portfolios/queue.ts:44-51` — `(ultimaCompra - primeiraCompra) / (n-1)`,
   mesmo piso de 3 compras (`:15`). Calculado em memória a cada montagem da fila,
   descartado em seguida.

As duas fórmulas divergem: a primeira usa todas as compras, a segunda usa só o span. Em
base com sazonalidade, dão resultados diferentes.

**Probabilidade de abandono não existe em nenhuma forma.** O mais próximo é o limiar
de reativação `min(3 × ciclo, 90 dias)` (`lib/conversions/attribution.ts:29, 98-101`),
que é classificação retrospectiva, não previsão.

**Conclusão do Bloco C:** o Relógio de Recompra é a peça mais nova da Fatia 1, mas
seus dois insumos — histórico de compra por cliente e fórmula de ciclo — já estão no
código. O trabalho é: escolher uma fórmula, persistir o resultado, e adicionar
probabilidade de abandono. Não é pesquisa; é consolidação.

---

## 5. Bloco D — Canal e mensageria

### D15. API oficial do WhatsApp

**Gestão de templates: madura.** `lib/whatsapp/template-management.ts` (1036 linhas)
cobre criação, submissão, sincronização de status e categoria. O modelo separa
corretamente o template lógico (`whatsapp_templates`) do seu status **por telefone**
(`whatsapp_template_phones`, com `status` e `qualidade` por par template×telefone —
`services/drizzle/schema/whatsapp-templates.ts:32-52`). Isso está certo: a Meta aprova
por WABA, e a plataforma modela isso.

O envio já é por template com preenchimento de slots, não texto livre:
`buildWhatsappTemplateSendPayload` + `replaceMessageTemplateVariables`
(`lib/interactions/send-reserved-interaction.ts:3-8`), com catálogo de variáveis
nativas em `lib/message-templates/variables.ts`. **Ou seja, a restrição que o
documento impõe ao Redator ("preenche slots de template aprovado, não escreve
livremente") já é a única coisa que o motor sabe fazer.**

**Janela de 24 h: tratada, mas de forma reativa.**

- A âncora existe e é mantida: `chats.ultimaInteracaoClienteData`
  (`services/drizzle/schema/chats.ts:42`), atualizada em toda mensagem inbound
  (`app/api/integrations/whatsapp/route.ts:568`,
  `app/api/integrations/whatsapp/gateway/route.ts:418`).
- O erro é traduzido corretamente quando acontece: código 131047 →
  *"Mensagem fora da janela de atendimento de 24 horas. Use um template aprovado para
  retomar contato."* (`lib/whatsapp/parsing.ts:78`).
- O bloqueio **preventivo** existe só no front (`components/Chats/Components/Input.tsx:43-45`).

Não há uma função `isWithinServiceWindow(clienteId, telefoneId)` no servidor. Para o
caminho de campanha isso não é problema (sempre template). Para o Atendente e o
Escalador — que respondem inbound e podem querer texto livre — vira problema imediato.

### D16. Teto de frequência por contato somando todas as origens

**Não existe. Este é o furo mais sério do Bloco D**, e o documento acerta ao dizer que
"o risco de spam vem do acúmulo".

O que existe são dois tetos, ambos **por semana e por emissor**, não por destinatário
(`lib/interactions/campaign-weekly-limits.ts:316-322`):

- `organizationWeeklyLimit` — de
  `configuracao.preferencias.limiteMensagensSemanaisViaCampanhas`
  (`schemas/organizations.ts:196-202`);
- `campaignEffectiveWeeklyLimit` = `min(limite da campanha, limite da organização)`
  (`lib/interactions/campaign-weekly-limits.ts:80-88`).

Um cliente pode, dentro dos limites, receber: mensagem de nova compra (data-collecting),
mensagem de entrada em segmentação (RFM), mensagem de cashback expirando, mensagem de
aniversário e mensagem de campanha recorrente — no mesmo dia, sem que nenhuma guarda
dispare. As únicas contenções são por campanha
(`campaigns.frequenciaIntervaloValor`, `services/drizzle/schema/campaigns.ts:60-61`) e a
prioridade de gatilho de compra (`lib/campaigns/purchase-trigger-priority.ts:26`).

**Horário de silêncio também não existe.** Blocos horários são configurados por
campanha (`campaigns.execucaoAgendadaBloco`, `services/drizzle/schema/campaigns.ts:53`),
mas nada impede um bloco `"03:00"`, e o cron entrega qualquer bloco já chegado.

**Boa notícia:** a arquitetura para consertar isso já está pronta e testada.
`weeklySendCounters` é exatamente o padrão certo — contador denormalizado com upsert
idempotente e lock. Um `contact_send_counters(organizacaoId, clienteId, janelaChave,
usados)` com o mesmo desenho, consultado no mesmo ponto de reserva
(`lib/interactions/campaign-weekly-limits.ts:302-322`), resolve o teto por contato
somando todas as origens — porque **todas as origens passam por lá**. É uma extensão
de talvez 120 linhas num arquivo que já faz a coisa certa.

### D17. Classificação de intenção e roteamento para humano

**Existe roteamento; classificação estruturada não.**

- Escalonamento por palavra-chave: `detectEscalationNeeded`
  (`lib/ai/ai-agent/prompts.ts:210-213`) — `ESCALATION_KEYWORDS.some(includes)`. Frágil.
- Escalonamento por decisão do agente: `transferServiceToHuman`
  (`lib/ai/ai-agent/transfer-service-to-human.ts:16-`) — abre/atualiza `chatServices`
  e notifica por template. Este é o caminho bom.
- O agente é um `ToolLoopAgent` com saída estruturada
  (`lib/ai/ai-agent/index.ts:47-60`), `model: gateway("openai/gpt-5")`,
  `stepCountIs(20)`. Devolve `{ message, serviceDescription }` — não devolve intenção
  classificada.
- Há resposta com atraso agendado (`chats.aiAgendamentoRespostaData`,
  `services/drizzle/schema/chats.ts:43`), o que é uma boa ideia já implementada
  (evita responder instantaneamente e parecer robô).

Para o Atendente do documento ("classifica intenção, resolve dúvida simples, escala o
restante"), falta o primeiro verbo. E o modelo escolhido é caro para a função — ver §7.

---

## 6. Bloco E — Mensuração

### E18. Grupo de controle

**Não existe.** Zero ocorrências de holdout, grupo de controle ou equivalente em todo
o repositório (código, schema e documentação).

O mais próximo, conceitualmente, é `organizations.baselineInicio`
(`services/drizzle/schema/organizations.ts:62-64`): marco temporal a partir do qual
"passamos a operar a conta", com dados anteriores tratados como baseline. É comparação
antes/depois, não experimento com grupo de controle — sujeita a sazonalidade e a
qualquer outra mudança no negócio.

Para implementar holdout, o que falta é pouco e é tudo aditivo:

- `clients.holdoutGrupo` (`TRATADO` | `CONTROLE`) + `holdoutAlocadoEm`, alocação
  determinística (hash estável do `clienteId`, para que a alocação não mude quando a
  base cresce);
- guarda no ponto de reserva — mesmo lugar do teto por contato
  (`lib/interactions/campaign-weekly-limits.ts:302`), o que garante que **nenhuma**
  origem fure o holdout;
- na leitura, comparar receita por grupo. E aqui a base já ajuda: `sales` tem
  `clienteId` e `dataVenda` indexados por organização
  (`services/drizzle/schema/sales.ts:100`), então a query de comparação é direta.

### E19. É possível responder "quanto de receita esta comunicação gerou"?

**Sim, e com mais nuance do que o documento supõe existir.**

`campaign_conversions` (`services/drizzle/schema/campaign-conversions.ts:11-69`)
persiste, por conversão:

- vínculo completo venda ↔ interação ↔ campanha ↔ cliente (`:18-29`);
- modelo de atribuição, peso e receita atribuída (`:32-34`) — suportando
  `LAST_TOUCH`, `FIRST_TOUCH`, `LINEAR` por campanha
  (`services/drizzle/schema/campaigns.ts:77-78`);
- tempo até a conversão em minutos (`:39`);
- **snapshot do perfil do cliente no momento da conversão** (`:42-45`): ticket médio,
  ciclo de compra médio, quantidade de compras, e se o ciclo é confiável;
- **tipo de conversão** (`:51`): `AQUISICAO` / `REATIVACAO` / `ACELERACAO` / `REGULAR` /
  `ATRASADA`, classificado em `lib/conversions/attribution.ts:92-113`;
- **deltas congelados** (`:54-56`): frequência vs. ciclo, e diferença monetária
  absoluta e percentual vs. ticket médio.

E sobre isso há uma camada de **receita incremental** que resolve exatamente a crítica
que o próprio documento faz ao last-touch (`lib/conversions/incremental.ts:4-21`, e o
comentário no código diz isso com todas as letras):

```
lib/conversions/incremental.ts:43-49
  AQUISICAO/REATIVACAO → venda cheia
  ACELERACAO           → uplift de cesta + 50% do ticket basal
  REGULAR/ATRASADA     → só o uplift de cesta
```

Isso é um raciocínio de incrementalidade honesto, feito sem holdout. **Com** holdout,
vira validável — e a combinação das duas camadas é mais forte do que qualquer uma
isolada. Esta é a maior alavanca subaproveitada do repositório: o painel de receita
incremental que o documento pede na Fatia 1 está a um holdout de distância de existir,
não a uma reconstrução.

### E20. Rastro de decisão

**Não existe.** O que se persiste da execução:

- `interactions.metadados` (jsonb) — variáveis de contexto do template, não a decisão
  (`services/drizzle/schema/interactions.ts:53`);
- `statusEnvio`, `dataEnvio`, `erroEnvio` — só entrega (`:55-58`);
- `dataExecucao` — claim.

A decisão em si (quais campanhas eram elegíveis, qual venceu a exclusividade, por que
as outras foram descartadas, qual quota estava disponível) existe apenas como
`console.log` estruturado, ex.
`app/api/point-of-interaction/new-transaction/route.ts:1132-1146`. É observável no
Vercel, não é consultável, não é re-executável, e não sobrevive à retenção de logs.

O documento pede "abrir qualquer ação e ver o que o agente leu, o que decidiu, por quê
e o que executou — pausável e re-executável". Não há nada disso, e não há tabela onde
pendurar. É construção nova: `agent_runs` (contexto lido, decisão, política aplicada,
resultado) + `agent_run_steps`.

Nota: o primitivo de aprovação humana **já existe** e foi bem desenhado para
generalizar. `action_approval_requests`
(`services/drizzle/schema/action-approvals.ts:15-52`) tem `tipo` como `varchar`
deliberadamente (`:26`, comentário: "novos cenários entram via payload jsonb
discriminado por `tipo` … sem migração de enum") e um registry de handlers plugável
(`lib/action-approvals/index.ts:34-52`, hoje só `VENDA_DESCONTO`). Registrar
`AGENTE_ACAO` ali é o caminho previsto pelo próprio código para a fila de aprovação do
Modo Aprendizado.

---

## 7. Bloco F — Carteira de vendedor

**A carteira está pronta para ser destino de escalonamento, e o desacoplamento é bom.**

A fila é **derivada, não persistida** — uma consulta, e o comentário no código diz
isso explicitamente (`lib/client-portfolios/queue.ts:7-10`). Isso é a decisão certa
para o que o documento quer: não há estado a sincronizar entre o agente e a carteira.

A lógica é rica e já implementa o raciocínio que o documento pede dos agentes
(`lib/client-portfolios/queue.ts`):

- cadência por segmento com teto e piso de fadiga, sobrescrevível por organização
  (`lib/client-portfolios/cadence.ts:16-49`, defaults por segmento RFM; overrides em
  `services/drizzle/schema/segment-cadences.ts:10-33`);
- débito de comunicação = dias desde o último contato vs. cadência ideal;
- supressões: comunicação pausada (`:66`), follow-up planejado pendente (`:113`),
  inbound recente no Hub (`:118-124`);
- boosts de contexto: mudança recente de segmento, aniversário, top cliente frio,
  segunda compra (`:22, 26-27`);
- cap diário de 12 (`:11`, comentário: "fila terminável cria hábito" — está certo).

**Acoplamento:** baixo. Depende de `clientSellerReferences` (vínculo cliente↔vendedor,
computado por cron — `app/api/cron/client-seller-references/route.ts`),
`clients`, `interactions`, `chats`, `products`. Não depende de campanhas.

**Pode ser destino de escalonamento?** Sim, e o caminho já está aberto:
`createManualInteraction` aceita `iniciadoPor: "AGENTE_IA"`
(`lib/interactions/create.ts:43`) e cria interação `PLANEJADA` com `vendedorId`
(`:126-127`). Um Escalador que quisesse "acionar o vendedor da carteira com o motivo e
o roteiro" chamaria essa função com `planejada: true`, `vendedorId` resolvido por
`lib/client-portfolios/resolve-seller.ts`, e o roteiro em `descricao`/`metadados`. A
interação apareceria na agenda do vendedor sem nenhuma mudança de UI.

Duas lacunas:
- `createManualInteraction` exige `vendedorId` (`lib/interactions/create.ts:83-87`,
  lança 404 se não achar). Um cliente sem vendedor de carteira não pode receber
  interação planejada. Precisa de fallback.
- A fila **não** é ordenada por valor do cliente nem por urgência econômica — a
  prioridade é débito de cadência. Para "cliente de alto valor ou risco alto" do
  Escalador, falta o eixo de valor. `TOP_CLIENT_VALUE_QUANTILE` (`:17`) existe como
  boost, não como ordenação.

---

## 8. Bloco G — Custo de IA

### Onde há chamadas de LLM hoje

| Local | Modelo | Granularidade | Custo |
|---|---|---|---|
| Atendimento (Hub) | `openai/gpt-5` (`lib/ai/ai-agent/index.ts:50`) | por mensagem inbound, loop de até 20 passos (`:59`) | **Alto** |
| Agente de marketing | `openai/gpt-5.4-mini` (`lib/ai/ai-agent/marketing/agent.ts:13,32`; `marketing/index.ts:351`) | por execução (analista + executor) | Médio |
| Dicas de IA | via `lib/ai/ai-hints/generate-hints.ts` | semanal, por organização (`vercel.json:39-42`) | Baixo |
| Mídia (áudio/imagem/documento) | `whisper-1`, `gpt-4o`, `gpt-4o-mini` (`lib/ai/ai-media-processing/index.ts:8,15,37,57,100,105`) | por anexo recebido | Médio |
| Conciliação bancária | `claude-haiku-4.5` / `claude-sonnet-4.5` (`lib/financial-reconciliation/constants.ts:14,20,23`) | por extrato/linha | Fora do escopo da régua |
| Importação de compras | `claude-sonnet-4.5` / `claude-haiku-4.5` (`lib/purchase/import.ts:61`, `lib/purchase/match-products.ts:54`) | por documento | Fora do escopo |

### Existe contabilização ou teto por organização?

**Contabilização: quase nenhuma. Teto: nenhum.**

- Tokens são gravados **só** em `ai_hints.tokensUtilizados`
  (`services/drizzle/schema/ai-hints.ts:29`). O atendimento devolve `tokensUsed`
  (`lib/ai/ai-agent/index.ts:143`) e o valor **é descartado** — chega até a rota
  (`app/api/integrations/ai/generate-response/route.ts:139`) e não é persistido em
  lugar nenhum consultável por organização.
- Os campos de limite existem no schema de configuração:
  `recursos.iaDicas.limiteSemanal` e `recursos.iaAtendimento.limiteCreditos`
  (`schemas/organizations.ts:166-181`). **Nenhum dos dois tem leitor no código** — não
  há um único `if` que consulte esses valores antes de chamar o modelo.
- Não há tabela de consumo, nem distinção entre operação gratuita (gatilho, leitura,
  lógica) e onerosa (escrita, IA, chamada externa).

### Contraste com a restrição de unit economics do documento

O documento estima ~15 mil interações/mês para 5.000 consumidores ativos e exige custo
compatível com mensalidade de centenas de reais. A regra que ele propõe — *"decisão é
determinística e barata; geração é a única parte cara"* — **já é como o motor
funciona hoje**, e vale registrar isso porque é uma força a preservar:

- quando falar: determinístico (blocos horários, `execucaoAgendada*`);
- para quem: determinístico (árvore de filtros SQL, `lib/campaigns/filters.ts`);
- o que oferecer: determinístico (afinidade de cesta em SQL,
  `app/api/cron/product-client-references/route.ts:120-234`);
- redação: template com slots, **zero LLM em runtime**
  (`lib/interactions/send-reserved-interaction.ts:260-`).

**O custo de IA da régua hoje é literalmente zero por mensagem enviada.** O risco não
é a régua ficar cara — é a régua *ficar cara ao ganhar agentes*. Os dois vetores:

1. **Atendente em `gpt-5` com loop de 20 passos.** Se a promessa é "o Recompra assume o
   pós-venda", o volume de inbound sobe com a régua. Esse é o item de maior custo
   unitário do sistema e é o que o documento classifica como "modelo pequeno".
   Divergência a resolver antes da Fatia 2.
2. **Redator por indivíduo em vez de por coorte.** O documento já prescreve a solução
   (geração por coorte + cache). A boa notícia é que o esquema de template com slots
   aprovados **força** naturalmente esse desenho: a Meta exige template aprovado, então
   variação por indivíduo nem seria possível fora da janela de 24 h.

### Recomendação mínima (barata, e útil além da IA)

Uma tabela `organization_usage_events(organizacaoId, tipo, subtipo, quantidade, custoEstimado,
referenciaId, dataInsercao)` escrita por um helper único. Instrumentar os pontos que já
devolvem `tokensUsed` (são 4). Isso resolve simultaneamente: controle de custo,
enforcement dos limites que já existem no schema mas não são lidos, e a base da
cobrança por consumo que o documento cita como futura.

---

## 9. Extensão vs. reescrita

### Sobrevive integralmente (não tocar)

| Componente | Local | Por quê |
|---|---|---|
| `interactions` como fila + histórico | `services/drizzle/schema/interactions.ts` | Já é agendamento por contato; já tem canal/direção/iniciador para o Agent Core |
| Máquina de entrega | `lib/interactions/*` | Claim atômico, transições monotônicas, contadores O(1), isolamento por item |
| Reserva de quota | `lib/interactions/campaign-weekly-limits.ts` | É o ponto de estrangulamento por onde **todas** as origens passam — o lugar certo para plugar guardrails |
| Conectores + modelo canônico | `lib/data-connectors/*` | Traz item de nota com custo; 5 conectores no mesmo contrato |
| Atribuição e incrementalidade | `lib/conversions/*` | Snapshot de perfil, tipo de conversão, receita incremental — melhor que a média do mercado |
| Afinidade de cesta | `app/api/cron/product-client-references/route.ts` | Filtragem colaborativa item-item + reforço por grupo, em SQL |
| Templates e gateway WhatsApp | `lib/whatsapp/*`, `lib/message-templates/*` | Status por telefone, submissão, variáveis nativas |
| Carteira de vendedor | `lib/client-portfolios/*` | Fila derivada, desacoplada, com cadência e supressões |
| Aprovação de ações | `services/drizzle/schema/action-approvals.ts`, `lib/action-approvals/` | Registry plugável já previsto para novos tipos |

### Extensão aditiva (schema novo + código novo, sem quebrar o existente)

| # | O quê | Onde encaixa |
|---|---|---|
| 1 | `client_purchase_clocks` — ciclo individual, próxima janela, probabilidade de abandono, valor esperado | Novo; alimentado por cron; consolidar as fórmulas de `attribution.ts:79-89` e `queue.ts:44-51` |
| 2 | `contact_send_counters` — teto de frequência **por contato**, todas as origens | Espelha `weeklySendCounters`; consumido em `campaign-weekly-limits.ts:302-322` |
| 3 | Holdout: `clients.holdoutGrupo` + guarda na reserva | Coluna + `if` no mesmo ponto do item 2 |
| 4 | Horário de silêncio por organização | `configuracao.preferencias`; guarda na reserva |
| 5 | `contact_action_claims` — dedupe entre agentes concorrentes | Novo; consultado antes de agendar |
| 6 | `domain_events` (outbox) — `VENDA_VALIDADA`, `CLIENTE_SEGMENTO_ALTERADO`, … | Escrita nas transações existentes; drenada por cron |
| 7 | `agent_runs` / `agent_run_steps` — trilha de decisão | Novo |
| 8 | Consentimento por finalidade e canal | Novo; guarda na reserva (mesmo ponto dos itens 2–4) |
| 9 | `organization_usage_events` — consumo de IA/automação | Novo; instrumentar 4 call sites |
| 10 | `interactions.politicaId` + `interactions.messageTemplateId` nullable | Colunas + relaxar filtros em `process-interactions/route.ts:89` e `campaign-weekly-limits.ts:262` |
| 11 | Rota de importação retroativa com progresso e retomada | Envelopa `runDataCollectingV2` (que já aceita janela e efeitos seletivos) |
| 12 | `product_stock_positions` — posição/giro denormalizados | Novo; insumo do Ofertista |

### Refatoração necessária (mexe em código que funciona)

| # | O quê | Risco | Justificativa |
|---|---|---|---|
| R1 | Unificar caminho POI ↔ data-collecting via outbox | **Alto** — POI é receita ao vivo no balcão | ~750 linhas duplicadas em `app/api/point-of-interaction/new-transaction/route.ts:1095-1900` que divergem de `effects.ts`. Cada guardrail novo precisaria ser escrito duas vezes |
| R2 | `try` por organização nos produtores | Baixo | `process-single-use-campaigns/route.ts:384-441`, `process-recurrent-campaigns/route.ts:255-305` |
| R3 | Quebrar a transação única do RFM | Médio | `app/api/cron/rfm-analysis/route.ts:249` — transação sobre a base inteira da organização |
| R4 | Fan-out do cron por organização | Médio | `process-interactions/route.ts:252-263` — orçamento único para todas as organizações causa fome silenciosa das últimas |
| R5 | Retry com backoff em interações falhas | Baixo | `FALHOU` é terminal hoje (`delivery-state.ts:14`) |
| R6 | Extrair `lib/queue/` do padrão de claim | Baixo | Preparação para trocar de infra sem tocar em regra de negócio |

### Fora da Fatia 1 (mas o schema deve nascer junto)

- `client_attributes` — perfil declarado do Coletor (junto com consentimento, para não
  retrabalhar auditoria).
- Convergência `chats` → `interactions` como memória unificada.
- Classificador de intenção estruturado.

---

## 10. Plano de migração sem quebrar campanhas em produção

O princípio que torna isso seguro: **os dois modelos não são alternativos — o modelo
alvo é o modelo atual com um produtor a mais e guardrails a mais.** Não há "grande
troca"; há convivência permanente.

```
                      ┌── produtores existentes (venda, RFM, cashback, calendário)
                      │
   PRODUTORES ────────┼── produtores novos (Relógio de Recompra, agentes)
                      │
                      ▼
        ╔═══════════════════════════════════╗
        ║  camada de política (NOVA)        ║  ← teto por contato, silêncio,
        ║  ponto único de estrangulamento   ║    consentimento, holdout, dedupe
        ╚═══════════════════════════════════╝
                      ▼
              interactions (INTOCADA)
                      ▼
         máquina de entrega (INTOCADA)
```

O ponto de estrangulamento **já existe**: `reserveOrganizationWeeklyQuotaBatch`
(`lib/interactions/campaign-weekly-limits.ts:236`). Toda interação de campanha passa
por ele, de qualquer origem. É lá que a política entra — e por isso as regras novas
valem para as campanhas existentes automaticamente, sem tocar nelas.

### Fase 0 — Guardrails em modo observação (1 semana)

Implementar teto por contato, horário de silêncio e holdout **em modo `shadow`**:
computa a decisão, grava o que teria bloqueado, **não bloqueia**. Um dia de dados diz
exatamente quantas mensagens legítimas as regras matariam — antes de matarem alguma.

Encaixe: `lib/interactions/campaign-weekly-limits.ts:302-322`, no mesmo laço que já
avalia limites, reusando a estrutura `blockedReasonsByInteractionId` que já existe.

Nesta fase também: corrigir o furo do opt-out no caminho transacional (§A5) — não é
shadow, é bug.

### Fase 1 — Guardrails ativos, campanhas inalteradas

Ligar o enforcement com limites frouxos (ex.: 3 mensagens/contato/semana, silêncio
21 h–08 h). As campanhas em produção continuam idênticas; o que muda é que passam a ter
um teto por pessoa que hoje não têm. Ganho de conformidade imediato, independente de
agentes.

Rollback: uma flag por organização.

### Fase 2 — Relógio de Recompra em modo sombra

Cron calcula e persiste `client_purchase_clocks` para todas as organizações.
**Nenhuma interação é agendada.** Painel interno mostra: quantos clientes teriam sido
acordados hoje, com que antecedência, com que confiança. Duas a três semanas disso
calibram a fórmula sem risco.

### Fase 3 — Agendamento por relógio, uma organização, com holdout

Primeira organização piloto. O produtor novo insere em `interactions` com
`politicaId` preenchido e `campanhaId` nulo. Holdout de 10% já ativo desde o primeiro
dia — sem ele, não há como saber se funcionou.

Convivência: nesta organização, campanhas e régua individual rodam **juntas**, e a
dedupe por contato (`contact_action_claims`) decide quem fala. Se a régua individual e
uma campanha querem o mesmo cliente no mesmo dia, uma perde. Este é o teste real de
convivência, e é melhor descobrir problemas com uma organização do que com todas.

### Fase 4 — Rollout progressivo

Por organização, com Modo Aprendizado: nos primeiros 30 dias, toda ação da régua vai
para `action_approval_requests` (`AGENTE_ACAO`) em vez de executar. O lojista aprova em
lote; a taxa de aprovação vira o critério de liberação automática.

### O que nunca acontece neste plano

- Campanhas existentes **não** são migradas para o novo modelo. Elas continuam sendo
  produtores de primeira classe. "Campanha" e "régua individual" são dois produtores
  legítimos para sempre.
- `interactions` não muda de forma (só ganha colunas nullable).
- A máquina de entrega não é tocada.

---

## 11. Ordem de construção da Fatia 1

Esforço em escala relativa (1 = ~2–3 dias de trabalho focado).

| # | Item | Esforço | Depende de | Observação |
|---|---|---|---|---|
| 0 | Corrigir opt-out no caminho transacional | 0,3 | — | Bug de conformidade; independente do roadmap |
| 1 | Camada de política em modo shadow (teto/contato, silêncio, holdout) | 2 | — | Encaixa em `campaign-weekly-limits.ts:302`; libera 5 e 6 |
| 2 | Relógio de recompra: tabela + cron + consolidação de fórmulas | 3 | — | Insumos já existem; escolher entre `attribution.ts:79-89` e `queue.ts:44-51` |
| 3 | Importação retroativa como produto (rota, progresso, retomada) | 3 | — | Envelopa `runDataCollectingV2`; **bloqueante da promessa de 24 h** |
| 4 | Outbox `domain_events` + emissão em venda validada | 2 | — | Desbloqueia 7 e remove a duplicação POI a prazo |
| 5 | Guardrails ativos + Modo Aprendizado via `action_approval_requests` | 2 | 1 | Registry já existe (`lib/action-approvals/index.ts:34`) |
| 6 | Holdout ativo + painel de receita incremental | 2 | 1 | `lib/conversions/incremental.ts` já faz o cálculo; falta o corte por grupo |
| 7 | Produtor "relógio disparou" + `politicaId`/`messageTemplateId` em interações | 3 | 2, 4, 5 | O coração da régua individual |
| 8 | Dedupe entre agentes (`contact_action_claims`) | 1,5 | 7 | Espelha `weeklySendCounters` |
| 9 | Ofertista: posição/giro de estoque denormalizados + ranking de oferta | 3 | 2 | Afinidade de cesta já existe; falta o eixo estoque/margem |
| 10 | Trilha de execução (`agent_runs`) | 2 | 7 | Instrumentar o produtor do item 7 |
| 11 | Fan-out do cron por organização + retry com backoff | 2 | — | Pode ir em paralelo; vira bloqueante com o volume da régua |
| 12 | Contabilização de consumo (`organization_usage_events`) | 1 | — | Barato; instrumenta 4 call sites |

**Total: ~27 unidades ≈ 10–13 semanas de um desenvolvedor focado.**

**Caminho crítico:** 2 → 7 → 8 (relógio → produtor → dedupe). Tudo o mais é
paralelizável.

**Sugestão de sequenciamento:** 0 e 1 primeiro, porque são as únicas coisas que
melhoram o produto em produção *antes* de qualquer agente existir, e porque a camada
de política é onde tudo depois se pluga. O item 3 (importação retroativa) em paralelo,
por ser independente e bloqueante da promessa comercial.

**Item de discussão:** os itens 9 e 10 poderiam sair da Fatia 1. O Ofertista com
estoque/margem (9) é o que mais custa e o menos necessário para provar a promessa — a
afinidade de cesta que já existe sustenta uma primeira versão do "o que oferecer". A
trilha de execução (10) é indispensável para operar, mas pode entrar depois do
primeiro piloto. Sem eles, a Fatia 1 cai para ~22 unidades.

---

## 12. Riscos técnicos introduzidos pela mudança

### Alto

**R1 — Volume de escrita em `interactions`.** Hoje uma linha nasce de um evento. Com o
relógio, nasce de um cronograma: 5.000 clientes ativos × ~1 toque/mês = 5.000
linhas/mês por organização, mais o que já existe. A tabela já tem 5 índices
(`services/drizzle/schema/interactions.ts:60-80`), vários compostos e largos. Escrita
degrada. → Mitigação: particionar por data ou arquivar linhas terminais (`ENTREGUE`,
`LIDO`, `FALHOU`) com mais de N meses.

**R2 — Fome de recursos entre organizações.** `process-interactions` processa todas as
organizações numa invocação com 295 s de orçamento
(`app/api/cron/process-interactions/route.ts:252-263`). Com a régua, o volume por
organização cresce e as últimas da lista deixam de ser processadas — silenciosamente,
porque o resumo só reporta `stoppedByTimeBudget` no agregado (`:403-405`). O sintoma no
cliente é "a régua parou de funcionar" sem erro em lugar nenhum. → Item 11.

**R3 — Refatoração do POI.** Unificar os dois caminhos de venda mexe no fluxo de
transação do balcão, que é receita ao vivo. Se ficar como está, todo guardrail precisa
ser escrito duas vezes e as implementações vão divergir (já divergem). → Fazer via
outbox, com o POI emitindo evento **em adição** ao comportamento atual, e só remover a
duplicação quando o consumidor estiver provado.

### Médio

**R4 — Concorrência entre produtores.** Hoje os produtores rodam em horários
diferentes (`vercel.json`) e mal se cruzam. Com a régua rodando de 10 em 10 minutos, o
cruzamento vira regra. O claim de interação protege a *entrega*, não a *decisão*: dois
produtores ainda podem criar duas interações para o mesmo contato. → Item 8, e ele
precisa vir junto com o item 7, não depois.

**R5 — Divergência de fórmula de ciclo.** As duas implementações existentes
(`attribution.ts:79-89`, `queue.ts:44-51`) dão resultados diferentes. Se o relógio
usar uma terceira, passam a existir três respostas para "de quanto em quanto tempo este
cliente compra", e o lojista vai ver a inconsistência. → Escolher uma, persistir, e
fazer as outras duas lerem dela.

**R6 — Calibração do holdout.** 5–10% de holdout numa organização com 300 clientes
ativos é 15–30 pessoas: ruído maior que o efeito. → Piso absoluto (ex.: holdout só
acima de N clientes ativos) e intervalo de confiança explícito no painel. Reportar
"não há dados suficientes" é melhor que reportar um número que não se sustenta.

**R7 — Custo de IA do Atendente.** `gpt-5` com loop de 20 passos
(`lib/ai/ai-agent/index.ts:50,59`), por mensagem inbound, sem teto — e a régua
aumenta o inbound por construção. → Item 12 primeiro (medir), depois decidir modelo.

### Baixo

**R8 — Transação longa do RFM** (`app/api/cron/rfm-analysis/route.ts:249`). Já é um
problema hoje; a régua não piora, mas passa a depender do RFM estar atualizado.

**R9 — `FALHOU` terminal.** Sem retry, falha transitória = toque perdido. Numa
campanha, é 1 de milhares. Numa régua individual, é *o* toque daquele cliente naquele
ciclo.

---

## 13. Oportunidades identificadas no código que não estão no documento

**O1 — A receita incremental já está implementada e não está sendo usada como
argumento comercial.** `lib/conversions/incremental.ts:43-49` credita venda cheia só
para aquisição e reativação, e desconta antecipação a 50%. É um raciocínio de
incrementalidade que a maioria dos concorrentes não faz. O documento propõe construir
mensuração incremental do zero via holdout; na prática, o holdout **valida** o que já
existe. Vender isso é mais barato que construir.

**O2 — `analiseRFMUltimaAlteracao` é um sinal de churn subutilizado.**
`services/drizzle/schema/clients.ts:58` registra quando o cliente mudou de segmento. A
fila da carteira já usa isso como boost
(`lib/client-portfolios/queue.ts:13, 19-20`), distinguindo corretamente segmentos onde
"entrou recentemente" é alerta e não conquista. O Relógio de Recompra pode usar a mesma
coluna como feature de probabilidade de abandono, sem calcular nada novo.

**O3 — `campaign_conversions` é um dataset de treino pronto.** Cada linha tem features
(ticket médio, ciclo, quantidade de compras, dias desde a última compra, segmento) e
label (tipo de conversão, deltas) —
`services/drizzle/schema/campaign-conversions.ts:42-56`. Para um modelo de
probabilidade de abandono ou de propensão, os dados de treino já estão sendo
acumulados há tempo. Isso reduz materialmente o custo do item 2.

**O4 — O modelo de tab/comanda abre um canal de coleta que o documento não considera.**
`services/drizzle/schema/tabs.ts` + `poi_transaction_requests` são fluxos públicos onde
o cliente interage voluntariamente. O Coletor da Fatia 2 ("uma pergunta por interação
em troca de cashback") tem aqui um ponto de contato de altíssima conversão — muito
melhor que WhatsApp outbound, porque o cliente já está engajado e a resposta é
síncrona.

**O5 — O gateway interno de WhatsApp (Baileys) não tem restrição de janela de 24 h.**
`lib/whatsapp/internal-gateway.ts` — conexões `INTERNAL_GATEWAY` não passam pelas
regras da Meta. Para o Atendente e para mensagens de baixo risco, isso é um canal mais
barato e mais flexível. O documento assume WhatsApp oficial como único canal e perde
essa alavanca. (Com a ressalva de que a conta é do lojista e o risco de banimento é
dele — o que é decisão de produto, não técnica.)

**O6 — `iniciadoPor: "AGENTE_IA"` já existe no enum e não tem produtor.**
`services/drizzle/schema/enums.ts:31`. Alguém já pensou nisso. Toda a UI de timeline e
de carteira vai renderizar interações de agente sem nenhuma mudança.

**O7 — `deals` e `platform_partnerships` sugerem que o segundo produto (B2B) já tem
pegada no schema.** `services/drizzle/schema/deals.ts`,
`services/drizzle/schema/platform-partnerships.ts`. Vale checar se o Agent Core
compartilhado deve considerar essas entidades como "contato" de primeira classe desde
o início — a restrição de projeto do documento (§2) ficaria mais fácil de honrar.

**O8 — A ausência de testes automatizados é o maior risco não-listado.** Não há
framework de teste em `package.json`; o que existe são scripts manuais
(`utils/scripts/test-recurrent-campaign-weekly-quota.ts`,
`scripts/test-ifood-import.ts`). Para uma camada de política que decide *não* enviar
mensagens — onde o modo de falha é silencioso e o sintoma só aparece na receita do mês
seguinte — isso é preocupante. Recomendo que os itens 1, 5, 6 e 8 do plano nasçam com
testes de unidade sobre as funções de decisão, mesmo que seja o primeiro teste do
repositório.

---

## 14. Correção ao diagnóstico do documento

Para deixar explícito, porque muda o plano:

| O documento afirma | O código mostra |
|---|---|
| "cron varre segmentos em janelas fixas" | O cron drena interações já agendadas por contato (`process-interactions/route.ts:83-99`). Varredura de segmento existe só no RFM diário |
| "a unidade de trabalho é a campanha" | A unidade persistida é a interação por contato (`interactions.ts:19-81`). Campanha é a política que a gerou |
| "o cliente só existe como participante de campanha" | `clients` é a entidade central, com estado de compra, RFM e metadados próprios |
| "apenas log de envio, não rastro de decisão" | Correto para a decisão; **incorreto para o resultado** — `campaign_conversions` tem snapshot de perfil, tipo de conversão e deltas |
| "depende de item de nota, não só de valor total" (afinidade de cesta) | Item de nota já chega e já é usado: filtragem colaborativa em `product-client-references/route.ts:120-234` |
| "isso deve resolver naturalmente o blast radius do cron" | O blast radius do **envio** já é 1 contato (`process-organization-interactions.ts:149-157`). O que falta isolar são os **produtores** |

A consequência prática: **o esforço da Fatia 1 é menor do que o documento sugere, e
está concentrado em lugares diferentes.** Não é reconstruir o motor — é adicionar o
relógio, a camada de política e o holdout sobre um motor que já agenda por contato.
