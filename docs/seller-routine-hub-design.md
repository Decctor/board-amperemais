# Rotina do Vendedor (Hub) — Proposta de UI/UX e Modelo de Interações

> Status: **v3 — plano final acordado; v1 implementada** (schema, crons, rotas, hub em
> `/dashboard/team/routine`). Pós-deploy: rodar `db:push`, `backfill:interactions-relationship`
> e o cron `client-seller-references`.
> v1: hub com fila gerada por gatilhos e tabela própria de abordagens.
> v2: interação como primitivo central; fila derivada da cadência de comunicação por segmento.
> v3: sem campo `desfecho` (registro leve; qualidade de abordagem será *inferida*, não
> declarada); opt-out desacoplado da interação; fronteira da máquina de entrega
> (`campanhaId`) reconhecida como design, não defeito.
> Um mockup navegável (light/dark, mobile/desktop) acompanha esta proposta.

---

## 1. Conceito em uma frase

Todo contato com um cliente — campanha, mensagem do vendedor, ligação, visita, atendimento —
é uma **interação**. Cada segmento de cliente tem uma **cadência ideal de comunicação**.
A fila de trabalho do vendedor é o **débito de comunicação**: clientes da sua carteira cujo
tempo sem interação estourou a cadência do segmento — priorizados por valor e contexto
(queda RFM, ciclo de recompra, aniversário).

Corolários importantes desse modelo:

- **A fila deixa de ser uma tabela e vira uma consulta.** Não existe mais a tabela
  `seller_approaches` da v1. Menos estado persistido = menos sincronização = menos gambiarra.
- **A supressão cruzada com campanhas sai de graça.** Se campanha e abordagem manual são ambas
  interações, qualquer uma delas "reseta o relógio" do cliente — o problema de colisão
  (cliente bombardeado por campanha + vendedor no mesmo dia) se resolve por construção,
  sem mecanismo dedicado.
- **"Não é eficiente conversar com todo mundo toda hora"** vira parâmetro explícito: a cadência
  tem um teto (dias ideais entre contatos) *e um piso* (mínimo de dias entre contatos —
  proteção contra fadiga). Cliente dentro da cadência não aparece na fila.

---

## 2. Persona e princípios

**Persona**: vendedor(a) de loja física, no balcão, com o celular na mão. Autenticado como
membro da organização com `usuarioVendedorId` preenchido (`organizationMembers`) — o hub
escopa tudo automaticamente para esse vendedor.

1. **Fila, não dashboard.** O gestor analisa; o vendedor executa. A unidade da tela é o card
   de abordagem, que se resolve em um toque.
2. **Cada card responde 4 perguntas, nesta ordem:** quem (nome + segmento RFM), por que agora
   (motivo em linguagem natural — "sem contato há 45 dias; a cadência de Em risco é 14"),
   o que oferecer (recompra/cross-sell), por onde (canal em 1 toque).
3. **O motivo é o produto.** Toda sugestão algorítmica vem com explicação; nunca um score opaco.
4. **Fechar o ciclo é obrigatório e barato.** Registrar um contato custa 2 toques (canal +
   salvar) — e o registro *é* uma interação, não um formulário paralelo.
5. **Toda comunicação é uma interação.** Um primitivo único alimenta fila, timeline do cliente,
   supressão, fadiga e métricas de influência. Nada de logs paralelos por modalidade.
6. **Âmbar só em celebração** (DESIGN.md): azul estrutural; ouro nos momentos de conquista
   (recompras geradas, topo do ranking, meta batida), proporção ~1:3.

---

## 3. O primitivo: evolução de `interactions`

### 3.1 Diagnóstico do estado atual (por que precisa evoluir)

A tabela `interactions` hoje é, na prática, **uma fila de entrega de mensagens de campanha**:

| Fato | Evidência |
|---|---|
| Só um tipo é escrito | Todos os inserts usam `tipo="ENVIO-MENSAGEM"`; `LIGAÇÃO`/`ATENDIMENTO`/`ENVIO-EMAIL` existem no enum (`schemas/enums.ts`) mas nunca são gravados |
| O processador é da máquina de entrega | O cron `process-interactions` filtra `campanhaId IS NOT NULL` porque o template da mensagem vem da campanha. **Isso é a fronteira natural do fluxo automatizado e permanece intocada**: linhas manuais nunca entram nessa máquina — a separação já existe por construção |
| Não há criação manual | Não existe rota `app/api/interactions/*`; o único POST relacionado é retry de envio falho |
| `dataExecucao` acumula 3 papéis | Claim atômico da reserva de quota (`campaign-weekly-limits.ts`), âncora da janela de quota semanal e âncora da janela de atribuição (`lib/conversions/attribution.ts`) |
| Status é ciclo de entrega | `statusEnvio` = PENDENTE→ENVIADO→ENTREGUE→LIDO / FALHOU / BLOQUEADA — não descreve uma ligação ou visita |
| Chats é um mundo à parte | Atendimentos grava em `chat_messages` (inclusive inbound do cliente) sem tocar `interactions`; só há um ponteiro solto `metadados.chatMessageId` no sentido campanha→chat |

Nada disso é defeito — é uma máquina de entrega bem resolvida (reserva atômica com
`FOR UPDATE`, ranking progressivo de status, quotas). O erro seria **forçar interações manuais
para dentro dessa máquina**. A proposta é separar os papéis dentro da mesma tabela.

### 3.2 Evolução proposta (aditiva, inspirada no modelo do Control)

O modelo do Control acerta em quatro separações que importam aqui:
**canal** (por onde) ≠ **direção** (quem falou com quem) ≠ **iniciador** (quem originou) ≠
**autor** (quem registrou); e **`dataInteracao` ≠ `dataInsercao`** (quando aconteceu vs.
quando foi registrado — essencial para registro retroativo honesto). Também traz o padrão de
**snapshots em metadados** (contexto no momento da interação, para analytics posterior).

Colunas novas em `interactions` (todas nullable — zero impacto nas linhas existentes):

```ts
// Classificação (substituem gradualmente a sobrecarga de `tipo`)
canal: interactionChannelEnum("canal"),
// WHATSAPP | EMAIL | LIGACAO | PRESENCIAL | VISITA | SMS | OUTRO
direcao: interactionDirectionEnum("direcao"),          // SAIDA | ENTRADA
iniciadoPor: interactionInitiatorEnum("iniciado_por"), // AUTOMACAO | USUARIO | AGENTE_IA | CLIENTE

// Autoria operacional (o vendedor é a persona do hub; `autorId` → users continua)
vendedorId: varchar("vendedor_id").references(() => sellers.id),

// Tempo canônico do relacionamento (≠ dataInsercao, ≠ dataExecucao)
dataInteracao: timestamp("data_interacao"),

// Ciclo de vida de interações manuais/planejadas (statusEnvio segue sendo só entrega)
status: interactionLifecycleEnum("status"),            // PLANEJADA | REALIZADA | CANCELADA
```

**Sem campo `desfecho` (decisão fechada).** Um enum de desfecho só seria preenchível em
linhas manuais (não é automatizável para envios de campanha sem pesar os fluxos de
processamento) e criaria uma taxonomia declarada à mão — dado caro e pouco confiável.
Tudo que ele habilitaria tem caminho independente e mais barato:

- *Pausar comunicação* → ação no **cliente** (§3.3.5), não na interação.
- *Agendar retorno* → criar a interação `PLANEJADA`, ação independente no mesmo dialog.
- *Re-entrada na fila* → o relógio de cadência resolve sozinho: interação `REALIZADA`
  reseta o relógio e o cliente volta quando a cadência estourar de novo.
- *Qualidade da abordagem* (respondeu? converteu?) → **inferível** de sinais que já
  existem: resposta inbound no Atendimentos (`chats.ultimaInteracaoClienteData`) na janela
  pós-contato, e venda na janela (§7). Desfecho *inferido* em v2, nunca digitado.

O registro manual fica com custo mínimo: **canal + nota livre opcional** (`descricao` já
existe). Menos atrito = mais registro = dado melhor.

Backfill único: `dataInteracao = COALESCE(dataEnvio, dataExecucao)`, `canal` derivado dos
`metadados.channelsSent`, `direcao='SAIDA'`, `iniciadoPor='AUTOMACAO'`, `status='REALIZADA'`
para enviadas. A partir daí, **`dataInteracao` é a única âncora de cadência e de ordenação
de relacionamento**; `dataExecucao` volta a ser detalhe interno da máquina de entrega.

Snapshots em `metadados` para interações manuais (padrão do Control adaptado):
`snapshotSegmentoRFM` (segmento no momento — permite "interações médias por segmento" e
medir se a cadência está sendo cumprida *por segmento* sem reprocessar histórico) e
`snapshotDiasSemContato`.

**Follow-up = interação `PLANEJADA`** (com `dataInteracao` futura). Não existe tabela de
tarefas: agendar retorno cria uma interação planejada; realizá-la muda o status para
`REALIZADA`; o card "Depois" (adiar) cria uma planejada para o dia seguinte. Um primitivo só.

### 3.3 Invariantes (os guardrails anti-gambiarra)

Estas regras devem virar CHECK constraints ou validação central única (ex.: um
`createInteraction()` em `lib/interactions/create.ts` por onde TODA escrita manual passa):

1. `campanhaId IS NOT NULL` ⇒ `iniciadoPor='AUTOMACAO'` e a linha pertence à máquina de
   entrega (agendamento/statusEnvio/quota). Recíproca: linha manual **nunca** tem
   `agendamento*`, `statusEnvio` ou `dataExecucao`.
2. Linhas manuais **não consomem quota semanal** — a quota
   (`limiteMensagensSemanaisViaCampanhas`) protege custo/limite de disparo automatizado;
   uma ligação não gasta WhatsApp. As queries de quota já filtram
   `tipo='ENVIO-MENSAGEM'`; ainda assim, adicionar o filtro explícito
   `iniciadoPor='AUTOMACAO'` nelas e nas queries de stats de campanha (funil divide
   convertidos/enviados) para não depender de coincidência de enum.
3. `status='PLANEJADA'` não conta para **nada** (cadência, fadiga, influência, timeline
   pública) até virar `REALIZADA`.
4. `dataInteracao <= now()` para `REALIZADA` (registro retroativo é permitido e honesto,
   registro futuro realizado não existe). Se `dataInsercao - dataInteracao >` limiar
   (ex.: 24h), marcar `metadados.registroRetroativo=true` — ver §7 (anti-gaming).
5. **Opt-out é do cliente, não da interação**: `clients.comunicacaoPausadaAte`, gravada por
   ação manual explícita ("pausar comunicação" — disponível no dialog de registro e na
   página do cliente), vale para **campanhas e fila**. Hoje não existe opt-out de cliente;
   é um gap independente do primitivo de interação, resolvido junto por conveniência.
6. `tipo` (legado) permanece: linhas manuais usam os valores hoje mortos
   (`LIGAÇÃO`, `ATENDIMENTO`) ou um novo valor — assim **todos os filtros existentes
   (`tipo='ENVIO-MENSAGEM'`) excluem linhas manuais por construção**, sem tocar uma query
   no dia 1. Código novo lê `canal`/`direcao`/`iniciadoPor`; `tipo` entra em deprecação.

---

## 4. Cadência por segmento

Config nova (tabela `segment_cadences` — queryável em JOIN pelo gerador da fila; org pode
ajustar; seeds sugeridos):

| Segmento RFM | Ideal entre contatos | Mínimo entre contatos (fadiga) |
|---|---|---|
| Campeões | 30 dias | 7 dias |
| Clientes leais | 25 dias | 7 dias |
| Não pode perdê-los | 20 dias | 5 dias |
| Em risco | 14 dias | 5 dias |
| Prestes a dormir | 12 dias | 5 dias |
| Precisam de atenção | 15 dias | 5 dias |
| Recentes / Promissores | 10 dias (janela da 2ª compra) | 3 dias |
| Hibernando | 40 dias | 10 dias |
| Perdidos | 90 dias ou nunca | 15 dias |

**Saldo de comunicação** do cliente = `diasDesdeUltimaInteracao − cadenciaIdeal(segmento)`.
Positivo = em débito → candidato à fila. O que conta como "última interação":

- Campanha: conta a partir de `ENTREGUE` (enviada e falhada/bloqueada não é contato).
- Manual `REALIZADA` (qualquer canal, qualquer direção).
- Inbound do cliente: v1 usa `chats.ultimaInteracaoClienteData` como sinal read-only
  (cliente que falou com a loja ontem não entra na fila); v2 faz a ponte formal (§9).
- `PLANEJADA` não conta — mas **suprime** o cliente da fila (já tem retorno agendado).

---

## 5. A fila de trabalho (derivada)

```
candidatos = clientes da carteira do vendedor
  WHERE saldoComunicacao > 0
    AND diasDesdeUltimaInteracao >= minimoFadiga
    AND (comunicacaoPausadaAte IS NULL OR vencida)
    AND sem interação PLANEJADA pendente
ORDEM  = round(saldoRelativo × pesoValor) com boosts
CAP    = ~12/dia (configurável) — fila terminável cria hábito; infinita vira ruído
```

- `saldoRelativo` = diasDesdeUltimaInteracao / cadenciaIdeal (2.0 = dobro do tolerável).
- `pesoValor` = LTV normalizado na carteira.
- Boosts aditivos de contexto (viram o "por que agora" do card): queda de segmento RFM
  recente (`analiseRFMUltimaAlteracao`), ciclo de recompra estourado
  (`ultimaCompraData` vs. ciclo), aniversário, top-cliente esfriando.
- O "o que oferecer" continua vindo de `metadataProdutoSugeridoId` /
  `metadataProdutoMaisCompradoId` / `product_client_references`.

Computada on-demand (query + ranking em memória) com cache diário opcional. Follow-ups do
dia (`PLANEJADA` com data de hoje) aparecem em seção própria, **acima** da fila algorítmica,
e nunca são reordenados pela inteligência — compromisso com cliente não é sugestão.

---

## 6. UI (o que muda vs. v1)

A estrutura da página não muda: `/dashboard/team/routine`, tabs **Meu dia / Minha carteira /
Meus resultados**, KPIs do dia, fila em cards, rail com follow-ups + ranking + 1 insight de
IA/dia, carteira derivada com "força do vínculo". Mudanças da v2:

1. **Motivo do card ganha a dimensão de relacionamento:** "Sem contato há 45 dias — a
   cadência de *Em risco* é 14. Última interação: campanha de reativação (lida, sem
   resposta) em 28/05." A ausência de interação *é* o motivo-base; RFM/ciclo/aniversário
   são o contexto que prioriza.
2. **Timeline do cliente (novo componente).** Não existe hoje nenhuma linha do tempo de
   relacionamento (o detalhe do cliente mostra só cashback e compras). O card expandido do
   hub e a página do cliente ganham uma timeline unificada: campanhas (com status de
   entrega), interações manuais (com canal e nota), compras (com badge de conversão) —
   ordenada por `dataInteracao`/`dataVenda`. API: `GET /api/interactions?clienteId=`.
3. **"Registrar" = criar interação, em 2 toques.** Formulário mínimo: canal (chips:
   WhatsApp/Ligação/Presencial/Visita) + nota livre opcional. Duas ações independentes no
   mesmo dialog: "agendar retorno" (cria a `PLANEJADA`) e "pausar comunicação" (grava no
   cliente). Sem enum de desfecho — ver §3.2. Mesmo formulário disponível na página do
   cliente e no Atendimentos ("registrar ligação").
4. **KPI "Abordagens" lê de interações** (`iniciadoPor='USUARIO'` + `vendedorId` + hoje);
   "Recompras geradas" lê da métrica de influência (§7).

---

## 7. Conversões e atribuição (a pergunta difícil)

**Pergunta colocada:** uma interação manual depois de um envio de campanha deveria
desqualificar a campanha para conversão?

**Recomendação: não — em v1, nenhum touch rouba conversão de outro. Registra-se tudo,
reporta-se em paralelo, e a sobreposição vira métrica explícita.**

Fundamentos:

1. **Last-touch entre tipos heterogêneos envenena os dois lados.** Se o vendedor rouba a
   conversão da campanha, um "oi, tudo bem?" atrás de cada disparo captura a receita da
   campanha inteira (Goodhart: a métrica vira alvo e morre como métrica — pior ainda com
   ranking gamificado). Se a campanha rouba do vendedor, o trabalho consultivo dele some do
   relatório. "Desqualificar" pressupõe uma certeza causal que ninguém tem.
2. **Comparabilidade histórica.** `campaign_conversions` alimenta funil, ranking, qualidade
   de conversão e relatórios existentes. Mudar a semântica da série histórica no mesmo PR
   que introduz interações manuais tornaria impossível saber o que mudou por quê.
3. **O schema atual nem comporta** o roubo: `campaign_conversions.campanhaId` é NOT NULL —
   interação manual não é representável ali, e não deve ser.

Modelo proposto (duas lentes + sobreposição):

- **Conversão de campanha** — intocada: last-touch entre envios de campanha, janela
  `atribuicaoJanelaDias` por campanha, como hoje (`lib/conversions/attribution.ts`).
- **Venda influenciada (vendedor)** — nova métrica *computada* (sem tabela nova em v1):
  venda cujo `sales.vendedorId = vendedor` E que teve interação manual `REALIZADA` desse
  mesmo vendedor com o cliente dentro de N dias antes de `dataVenda` (N: reutilizar a
  janela de atribuição da org; default 14). Exigir `vendedorId` da interação = `vendedorId`
  da venda elimina por construção a disputa entre vendedores pelo mesmo cliente.
- **Sobreposição explícita**: venda com conversão de campanha *e* influência de vendedor é
  contada nas duas lentes e ganha flag `assistida` nos dois relatórios, com um número
  honesto no dashboard do gestor: "R$ X convertido por campanha · R$ Y influenciado por
  vendedor · R$ Z por ambos". Nenhuma receita é dividida em v1.
- **v2+, com dados reais de sobreposição**: se um número único for necessário, o caminho já
  está pavimentado — `atribuicaoModelo`/`atribuicaoPeso` existem em `campaign_conversions`
  justamente para modelos multi-touch ponderados. Decidir pesos *antes* de medir a
  sobreposição real seria chute.

### Edge cases mapeados (e a regra que fecha cada um)

| # | Caso | Regra |
|---|---|---|
| 1 | Vendedor registra interação retroativa *depois* de ver a venda entrar (gaming do ranking) | Influência exige `dataInsercao da interação <= dataVenda + tolerância de sync`. Registro retroativo continua permitido para a *timeline* (é a verdade do relacionamento), mas `registroRetroativo=true` não pontua influência |
| 2 | Venda ingerida por sync de ERP horas/dias depois de acontecer | Atribuição roda na transação de insert da venda (como hoje) e considera interações existentes naquele momento; sem reprocessamento retroativo automático (o cron `fix-previous-sales` existe se a política mudar) |
| 3 | Vendedor manda WhatsApp pelo Atendimentos E registra interação manual | Dedupe futuro pela ponte chats↔interactions (`chatMessageId`); em v1, orientação de produto: quem usa o chat do app não precisa registrar de novo (v2 auto-loga, §9) |
| 4 | Cliente pediu pausa ao vendedor, campanha dispara no dia seguinte | "Pausar comunicação" (ação de 1 toque no dialog/página do cliente) grava `comunicacaoPausadaAte`; o enqueue de campanhas passa a respeitá-la (hoje não existe opt-out — resolver para os dois mundos juntos) |
| 5 | Interação manual "conta quota" e bloqueia campanha legítima (ou vice-versa) | Invariante §3.3.2: quota é só da máquina automatizada |
| 6 | `PLANEJADA` esquecida para sempre | Planejada vencida há mais de X dias reaparece na fila com selo "retorno atrasado"; nunca some silenciosamente |
| 7 | Dois vendedores atendem o mesmo cliente na mesma semana | Influência exige match com `sales.vendedorId`; a *carteira* derivada indica o dono do vínculo, mas não bloqueia registro — timeline mostra tudo |
| 8 | Interação inbound (cliente chamou a loja) resetando fila indevidamente | Inbound conta para *fadiga* (não abordar quem acabou de falar conosco) mas não zera o *débito de cadência de saída* — são relógios distintos: `ultimoContatoQualquer` vs. `ultimaSaidaRealizada` |
| 9 | Funil de campanha poluído por novos tipos | Invariante §3.3.6 + filtro explícito `iniciadoPor='AUTOMACAO'` nas queries de stats |
| 10 | Fuso horário no registro manual retroativo | `dataInteracao` capturada no fuso da org (`America/Sao_Paulo`), como os time-blocks de campanha |

---

## 8. Mapeamento inteligência existente → UI

| Sinal | Onde vive | Tratamento na UI |
|---|---|---|
| Ausência de interação vs. cadência | `interactions.dataInteracao` + `segment_cadences` (novo) | Motivo-base do card: "sem contato há N dias (cadência: M)" |
| Segmento RFM + última mudança | `clients.analiseRFM*` (cron `rfm-analysis`) | Chip colorido + boost "caiu de X para Y em DD/MM" |
| Recência vs. ciclo de recompra | `clients.ultimaCompraData` + histórico | Boost "ciclo estourado há N dias" |
| Produto sugerido / recompra | `clients.metadataProdutoSugeridoId`, `product_client_references` | Linha "o que oferecer" |
| Aniversário | `clients.dataNascimento` | Boost + oferta de cupom |
| Meta por vendedor | `goals`/`goalsSellers` + `getSellerSaleGoal` | KPI "meta do dia" pró-rateada |
| Cliente-360 | `getClientContext` | Card expandido / drawer |
| Entrega de campanha | `interactions.statusEnvio` | Timeline: "campanha X — lida, sem resposta" |
| Conversões | `campaign_conversions` + influência (nova) | KPI âmbar "recompras geradas" + badges na timeline |
| Recência de conversa | `chats.ultimaInteracaoClienteData` | Supressão de fadiga na fila (v1, read-only) |

---

## 9. O que construir (revisado)

1. **Evolução de `interactions`** (§3.2): colunas + enums novos, backfill, invariantes,
   `createInteraction()` central, rota `app/api/interactions` (POST manual + GET por
   cliente/vendedor).
2. **`segment_cadences`** + seeds + UI de configuração (org ajusta cadências).
3. **Carteira derivada** (`client_seller_references`, inalterado da v1): frequência com
   decay de recência sobre `sales.vendedorId × clienteId`, padrão do cron de
   `product_client_references`.
4. **Gerador/consulta da fila** (§5) — query + ranking, sem tabela.
5. **Métrica de influência do vendedor** (§7) — computada nas stats; flags de sobreposição
   no relatório de campanhas.
6. **`clients.comunicacaoPausadaAte`** respeitada por campanhas e fila.
7. **Página do hub** (§6) + **timeline do cliente** (componente novo, reuso na página do
   cliente).
8. **Gerador de `ai_hints` `assunto="sellers"`** (mensagem sugerida por contexto) — v2.
9. **Ponte chats↔interactions** — v2: outbound humano no Atendimentos auto-loga interação
   (`canal=WHATSAPP`, `iniciadoPor=USUARIO`, dedupe por `chatMessageId`); inbound relevante
   vira interação `ENTRADA` ou, no mínimo, alimenta o relógio de fadiga formalmente.

## 10. Roadmap

- **v1:** itens 1–7. Fila por cadência + boosts; registro manual (WhatsApp deep-link,
  ligação, presencial); follow-ups como `PLANEJADA`; timeline; influência em paralelo às
  conversões de campanha (sem tocar na atribuição existente).
- **v2:** itens 8–9 + modo "ver como" do gestor com visão de atividade agregada da equipe;
  revisão do modelo de atribuição *com dados de sobreposição em mãos*; **desfecho
  inferido** (respondeu = inbound no Atendimentos na janela pós-contato; converteu = venda
  na janela) — qualidade de abordagem sem digitação e sem taxonomia declarada.
- **v3:** abordagem sem sair do app (gateway interno), desfecho inferido da conversa,
  metas de atividade (interações/dia) ao lado das metas de venda.

## 11. Riscos a vigiar

- **Fila que erra o motivo mata a confiança** — começar com gatilhos de alta precisão e
  cadências conservadoras; melhor 6 cards certos que 20 duvidosos.
- **Gamificação envenenando o registro** — o ranking premia *venda*, não volume de
  interações; influência tem trava anti-retroativo (§7.1). Nunca criar meta de "N
  interações/dia" antes de existir cultura de registro honesto (v3, com dados).
- **Vigilância** — o hub é assistente do vendedor; o gestor vê atividade agregada, não
  cronômetro por pessoa.
- **Enum `tipo` legado esquecido pela metade** — deprecação precisa de dono: enquanto
  `tipo` existir, toda query nova usa `canal`/`iniciadoPor` e o lint/review barra filtros
  novos por `tipo`.
