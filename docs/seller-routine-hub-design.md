# Rotina do Vendedor (Hub) — Proposta de UI/UX

> Status: proposta de design para discussão — nada implementado.
> Origem: sugestão de cliente em prospecção. O RecompraCRM opera de forma
> majoritariamente autônoma; este hub cria a primeira superfície de **operação
> diária do vendedor**, alimentada pela inteligência que já existe (RFM, ciclo
> de recompra, produto sugerido, metas por vendedor).
> Um mockup navegável (light/dark, mobile/desktop) acompanha esta proposta.

---

## 1. Conceito em uma frase

Uma página que transforma a inteligência do CRM em uma **fila de abordagens
executável**: todo dia o vendedor abre o hub e vê *quem* abordar, *por que
agora*, *o que* oferecer e *por qual canal* — e cada desfecho registrado
realimenta o sistema.

A tese de UX: **fila, não dashboard**. O gestor analisa; o vendedor executa.
Nada de gráficos como elemento central — a unidade da tela é o "card de
abordagem", que cabe no polegar e se resolve em um toque.

---

## 2. Persona e princípios

**Persona**: vendedor(a) de loja física, no balcão, com o celular na mão.
Já autenticado como membro da organização com `usuarioVendedorId` preenchido
(`organizationMembers`) — o hub escopa tudo automaticamente para esse vendedor.

Princípios de design:

1. **Cada card responde 4 perguntas, nesta ordem:** quem (nome + segmento RFM),
   por que agora (motivo em linguagem natural, sempre visível — nunca só um
   score), o que oferecer (recompra/cross-sell), por onde (WhatsApp em 1 toque).
2. **O motivo é o produto.** "Era Campeã e caiu para Em risco — sem comprar há
   52 dias (ciclo dela: ~28)" gera confiança na fila. Um badge "prioridade 87"
   não gera. Toda sugestão algorítmica vem com explicação.
3. **Mobile-first de verdade.** A fila funciona inteira em uma coluna; ações
   principais têm alvo de toque ≥ 44px; detalhe do cliente abre em drawer
   (`ResponsiveMenuV2` já alterna Dialog/Drawer por breakpoint).
4. **Fechar o ciclo é obrigatório.** Abordagem sem desfecho registrado é fila
   morta. O registro custa 2 toques (Registrar → desfecho → salvar) e é o que
   alimenta follow-ups, silencia clientes que pediram pausa e dá ao gestor
   visão de *atividade*, não só de resultado.
5. **Âmbar só em celebração.** Segue o DESIGN.md: azul estrutural em CTAs e
   estados ativos; ouro comercial apenas nos momentos de conquista (recompras
   geradas, topo do ranking, meta batida) — proporção ~1:3.

---

## 3. Arquitetura de informação

```
/dashboard/team/routine            ← ou /dashboard/routine ("Minha rotina")
├── Tab: Meu dia        (default)  ← fila de abordagens + follow-ups + ranking
├── Tab: Minha carteira            ← clientes do vendedor, derivados por recorrência
└── Tab: Meus resultados           ← SellersStats/SellersGraphs filtrados p/ ele
```

- Entrada na sidebar (grupo **Comercial** ou **Geral**), com `checkAccess`
  exigindo membro com `usuarioVendedorId` — admins/gestores veem um seletor de
  vendedor no topo (modo "ver como").
- Registrar título/descrição em `AppRoutes` (`config/index.ts`) — ex.:
  título "Minha rotina", descrição "Quem abordar, o que oferecer e por quê".
- Página segue o padrão: server component com gate de sessão + client
  component `routine-page.tsx`; container `flex h-full w-full flex-col gap-3`;
  tabs `variant="page"`.

---

## 4. Anatomia da tela

### 4.1 Header + KPIs do dia (linha de 4 `StatUnitCard`)

| KPI | Fonte | Observação de UX |
|---|---|---|
| Meta do dia (R$ X / R$ Y + barra) | `getSellerSaleGoal` pró-rateada | "Faltam R$ 230" é acionável hoje; meta mensal não é |
| Abordagens (feitas/planejadas + barra) | novo (ver §6) | é o "todo list" do dia; atualiza ao registrar desfecho |
| Vendas hoje + ticket médio | `getSellerStats` | reforço imediato |
| Recompras geradas no mês (+delta) | `sales` × abordagens registradas | **único card âmbar** — é a métrica-alma do produto |

Saudação pessoal ("Bom dia, Mariana") + data por extenso: o hub é um ritual de
início de turno, não um relatório.

### 4.2 Fila de abordagens (coluna principal)

Agrupada por **motivo de prioridade**, não por segmento (o vendedor pensa em
"o que faço primeiro", não em taxonomia RFM):

- **Prioridade do dia** — queda de segmento RFM recente
  (`analiseRFMUltimaAlteracao`), ciclo de recompra estourado
  (`ultimaCompraData` vs. ciclo médio do cliente), aniversário
  (`dataNascimento`), top-cliente da carteira esfriando.
- **Oportunidades** — cross-sell (`metadataProdutoSugeridoId` +
  `product_client_references`), janela de 2ª compra (cliente recente),
  categoria nunca comprada.

Anatomia do card (estado colapsado ≈ 96px de altura):

```
[avatar]  NOME DO CLIENTE   [chip RFM colorido]     [chevron expandir]
          14 compras · ticket médio R$ 186
POR QUE AGORA   Era Campeã e caiu para Em risco em 02/07 — sem comprar
                há 52 dias (o ciclo dela é ~28).
O QUE OFERECER  Recompra: Ração Premier 15kg · Sugestão: Petisco dental
[Abordar no WhatsApp]  [Registrar]  [Depois]
```

Expandido (inline no desktop; drawer no mobile) = mini cliente-360 via
`getClientContext`: compras/LTV/ciclo, últimas 3 compras, e **mensagem
sugerida** com botão copiar (template com nome, produto e gancho do motivo —
futuro `ai_hints assunto="sellers"`).

Ações:
- **Abordar no WhatsApp** (CTA primário azul): deep-link `wa.me/<telefone>`
  com a mensagem sugerida pré-preenchida; registra o clique como início de
  abordagem. Integrável depois ao gateway interno de WhatsApp/Atendimentos.
- **Registrar**: dialog leve com 4 desfechos — *venda realizada* / *respondeu,
  sem venda* / *pediu para falar depois (agenda follow-up)* / *sem resposta
  (recoloca na fila em N dias)*. Card ganha estado "Abordada" e some da conta.
- **Depois**: move para o fim da fila sem punição (o vendedor manda no dia).

### 4.3 Rail lateral (desktop) / seções abaixo (mobile)

1. **Follow-ups de hoje** — compromissos com hora, nascidos dos desfechos.
   Regra dura: follow-up é *promessa a um cliente*; a inteligência nunca
   reordena nem remove — só a fila algorítmica é dinâmica.
2. **Ranking da semana** — reusa o componente `Ranking` (coroa/ouro no 1º).
   Gamificação leve; sem streaks punitivos.
3. **Sugestão inteligente** — 1 insight agregado por dia ("6 clientes seus
   compram areia todo mês e não conhecem a linha nova") com ação em 1 toque.
   Ponto de entrada natural para `ai_hints` com `assunto="sellers"`.

### 4.4 Tab "Minha carteira"

Lista em card-rows (sem tabela densa): nome + chip RFM, "N compras com você ·
última há X dias", LTV, ciclo, e uma barra de **força do vínculo** que torna o
critério de atribuição transparente. Filtros por segmento em chips
(`InteractiveFilter` para filtros avançados). Card explicativo fixo: "como a
carteira é montada" — transparência evita a sensação de caixa-preta e
disputas entre vendedores.

### 4.5 Tab "Meus resultados"

Reaproveita `SellersStats`/`SellersGraphs`/`getSellerStats` filtrados para o
vendedor logado (gráficos na paleta ouro). Nenhuma consulta nova — só uma
visão "primeira pessoa" do que o gestor já vê.

---

## 5. Mapeamento inteligência existente → UI

| Sinal já existente | Onde vive | Tratamento na UI |
|---|---|---|
| Segmento RFM + data da última mudança | `clients.analiseRFM*` (cron `rfm-analysis`) | Chip colorido (cores de `utils/rfm.ts`) + motivo "caiu de X para Y em DD/MM" |
| Recência vs. ciclo de recompra | `clients.ultimaCompraData` + histórico `sales` | Motivo "ciclo estourado há N dias" — o gatilho mais acionável da fila |
| Produto sugerido (cross-sell) | `clients.metadataProdutoSugeridoId` (cron `product-client-references`) | Linha "O que oferecer — Sugestão: …" |
| Produto mais comprado / recompra | `clients.metadataProdutoMaisCompradoId`, `product_client_references` (janelas GERAL/30/90) | Linha "Recompra: …" + histórico no card expandido |
| Aniversário | `clients.dataNascimento` (cron `birthday-notify`) | Card de prioridade com oferta de cupom |
| Meta por vendedor | `goals`/`goalsSellers` + `getSellerSaleGoal` | KPI "Meta do dia" pró-rateada |
| Cliente-360 | `getClientContext` (`/api/clients/context`) | Card expandido / drawer |
| Ranking e stats por vendedor | `getSellerStats`, `SellersRanking` | Rail lateral + tab Resultados |
| Toques automatizados | `interactions` | Base para o log de desfechos (evitar colisão: não abordar manualmente quem recebeu campanha há < N dias) |

---

## 6. O que precisa ser construído (gaps)

1. **Carteira derivada (vendedor × cliente).** Não existe atribuição
   persistida. Derivar de `sales.vendedorId × clienteId` (frequência com decay
   de recência), no mesmo padrão do cron de `product_client_references` — ex.:
   tabela `client_seller_references` com `totalVendas`, `ultimaVendaData`,
   `rankingVinculo`. Clientes sem vendedor dominante ficam na "carteira da
   loja". Empate/decay e janela (12 meses) a calibrar.
2. **Abordagens (tarefas de rotina).** Nova tabela (ex.: `seller_approaches`):
   `vendedorId`, `clienteId`, `motivoTipo` (enum: RFM_QUEDA, CICLO_ESTOURADO,
   ANIVERSARIO, CROSS_SELL, SEGUNDA_COMPRA, TOP_CLIENTE_FRIO, MANUAL),
   `motivoDetalhe` (JSONB), `produtoSugeridoId`, `status`, `desfecho`,
   `followUpEm`, `dataInsercao`. Gerada por cron diário; desfechos também
   podem espelhar em `interactions` (`tipo="ABORDAGEM_VENDEDOR"`).
3. **Gerador da fila (cron diário).** Prioriza por: follow-up do dia > queda
   RFM recente > ciclo estourado (ponderado por LTV) > aniversário >
   cross-sell > 2ª compra. Cap de ~12/dia (configurável) — fila terminável é o
   que cria o hábito; fila infinita vira ruído. Supressões: pediu pausa,
   campanha automática recente, abordado há < N dias.
4. **Gerador de `ai_hints` para `assunto="sellers"`** (schema já permite; o
   gerador é stub) — mensagens sugeridas e insights agregados.
5. **Permissão/rota**: entrada na sidebar com gate por `usuarioVendedorId`,
   modo "ver como" para gestores, entrada em `AppRoutes`.

---

## 7. Componentes reutilizados (custo baixo de UI)

`SectionWrapper`, `StatUnitCard`, `Ranking`, `InteractiveFilter`,
`GeneralPaginationComponent`, `ResponsiveMenuV2` (drawer mobile), `Empty`,
chips de status no padrão de `sales-page.tsx`, cores RFM de `utils/rfm.ts`,
toasts sonner. Nada de kanban na v1 — estados de abordagem são chips, não
colunas (o board dnd-kit do fulfillment fica disponível se uma v2 pedir
gestão visual de follow-ups).

---

## 8. Roadmap sugerido

- **v1 (validável com o cliente da prospecção):** carteira derivada + fila
  gerada por cron (motivos: ciclo estourado, queda RFM, aniversário,
  cross-sell) + registro de desfecho + follow-ups + KPIs do dia. Mensagem
  sugerida por template estático.
- **v2:** mensagens/insights via `ai_hints`, modo "ver como" do gestor com
  visão de atividade da equipe, supressão inteligente vs. campanhas.
- **v3:** integração com o gateway interno de WhatsApp (abordar sem sair do
  app, desfecho inferido da conversa), metas de atividade (abordagens/dia)
  ao lado das metas de venda.

---

## 9. Riscos de UX a vigiar

- **Fila que erra o motivo mata a confiança.** Melhor 6 cards certos que 20
  duvidosos; começar com gatilhos de alta precisão (ciclo estourado,
  aniversário) e só depois ampliar.
- **Vendedor como alvo de cobrança.** O hub deve parecer um assistente, não
  um painel de vigilância — a visão do gestor mostra atividade agregada, não
  "tempo de resposta por vendedor".
- **Colisão com automações.** Cliente abordado por campanha e por vendedor no
  mesmo dia percebe spam; a supressão cruzada (item 6.3) é requisito de v1.
