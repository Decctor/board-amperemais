# Meta Agent Platform — planejamento de reposicionamento

Data: 2026-07-06
Branch: `claude/meta-agent-platform-dhznq9` (planejamento)
Status: **Estudo e planejamento** — nenhuma implementação ainda.

> ⚠️ **Ressalva de fonte.** A documentação oficial
> (`https://developers.facebook.com/documentation/meta-business-agent/overview`)
> respondeu **HTTP 403** em todas as tentativas de leitura automatizada, assim como as
> fontes secundárias de análise. O conteúdo abaixo foi montado a partir de: (a) anúncios
> públicos do **Conversations 2026** (03/06/2026) e cobertura de imprensa, e (b) leitura
> integral do código atual do RecompraCRM. **Tudo que depende do contrato exato da API da
> Meta está marcado com 🔎 e precisa ser confirmado contra a doc oficial antes de virar
> tarefa de implementação.**

---

## O problema em uma frase

Nosso agente de atendimento é um **wrapper da Cloud API rodando um agente próprio via AI SDK**
(`ToolLoopAgent` com `openai/gpt-5`) — recurso beta que nunca decolou; a Meta acabou de
lançar o **Meta Agent Platform**, que entrega nativamente a camada de LLM/orquestração
dentro do WhatsApp, Messenger e Instagram, tornando o "cérebro" próprio uma disputa perdida —
então precisamos **deixar de competir na camada de IA e passar a ocupar as camadas onde temos
dado e distribuição**: ponte de configuração/ativação e fonte de ferramentas (catálogo,
histórico, RFM, criação de pedido, cashback/cupom).

---

## 1. O que a Meta lançou (resumo do que apuramos)

| Fato | Detalhe | Confiança |
|---|---|---|
| **Meta Business Agent** | Agente de IA nativo em WhatsApp, Instagram e Messenger. Responde dúvidas, recomenda produtos do catálogo, agenda, qualifica leads e escala para humano. | Alta |
| **Versão in-app (self-serve)** | Qualquer negócio abre o app → *Tools* → *Meta Business Agent* e ativa em minutos. Sem desenvolvedor, sem integração. | Alta |
| **Meta Agent Platform (tier enterprise/partners)** | Camada de infraestrutura para negócios maiores, no ar desde **01/07/2026**. Conecta a "centenas de sistemas terceiros" (Shopify, Zendesk, Shopee) e **deixa o agente executar ações nesses sistemas** em nome do negócio. | Alta |
| **Grounding** | O agente é ancorado no catálogo, horários e políticas do próprio negócio. | Alta |
| **Preço** | Token-based, ~US$ 2,00 / 1M tokens (~4–5 centavos/mensagem), a partir de 01/08. | Média |
| **Modelo de integração de ferramentas** 🔎 | Forte indício de padrão **MCP / connectors com OAuth Business** (mesmo login que Shopify/Mailchimp usam), sem App Review pesado. A Meta já opera `mcp.facebook.com/ads` para Marketing API nesse formato. **Confirmar se o Business Agent usa o mesmo mecanismo de "actions/tools" e se o provedor de ferramenta é hospedado pelo parceiro ou registrado na Meta.** | Baixa |

**Leitura estratégica:** a Meta assume LLM + orquestração + custo de inferência + canal.
O que sobra de valor defensável para um parceiro como o RecompraCRM é **(a) reduzir o atrito
de ativação** para o SMB brasileiro e **(b) ser a fonte de dados e ações** que o agente
consome — exatamente onde já temos catálogo sincronizado, histórico de compras, RFM, loja
digital com pedidos, cashback e cupons.

---

## 2. Estado atual da codebase (o que temos hoje)

### 2.1 Agente próprio (beta)
- `lib/ai/ai-agent/index.ts` — `ToolLoopAgent` (`ai` SDK, `gateway("openai/gpt-5")`),
  `stopWhen: stepCountIs(20)`, saída estruturada (`message` + `serviceDescription`).
- `lib/ai/ai-agent/tools.ts` — **8 ferramentas, todas read-only**:
  `get_customer_purchase_history`, `get_customer_insights` (RFM), `get_customer_recent_purchases`,
  `search_products`, `get_products_by_group`, `get_product_by_code`,
  `get_available_product_groups`, `transfer_to_human`.
- `lib/ai/ai-agent/database-tools.ts` — queries Drizzle por trás das ferramentas.
- **Não existe** ferramenta de criação de pedido (marcada como "Future" no README).

### 2.2 Canal WhatsApp
- `app/api/integrations/whatsapp/route.ts` — webhook único (verify + POST). Recebe mensagem,
  faz find/create de cliente/chat/serviço, baixa mídia, **agenda resposta da IA com debounce
  de 5 s** (`AI_RESPONSE_DELAY_MS`), reavalia se ainda é `responsavelTipo === "AI"`, gera
  resposta e envia via Cloud API.
- `services/drizzle/schema/whatsapp-connections.ts` +
  `enums.ts:whatsappConnectionTypeEnum` → dois tipos: **`META_CLOUD_API`** (token/`metaEscopo`)
  e **`INTERNAL_GATEWAY`** (sessão própria estilo Baileys). Por telefone existe
  `permitirAtendimentoIa: boolean`.
- `lib/whatsapp/index.ts` — envio (`sendBasicWhatsappMessage`, `sendTemplateWhatsappMessage`,
  `sendMediaWhatsappMessage`, upload/download de mídia).

### 2.3 Feature-gating e "hub"
- `schemas/organizations.ts:OrganizationConfigurationSchema.recursos` — flags por organização:
  `hubAtendimentos.acesso` (+ `limiteAtendentes`), `iaAtendimento.acesso`, `integracoes.acesso`
  (+ `limiteAtivas`), `iaDicas`, etc. O webhook já **gate** por `hubAtendimentos.acesso`.

### 2.4 Dados que já existem e viram ferramentas de valor
- **Catálogo** sincronizado de ERPs/menus: `lib/data-connectors/{cardapio-web,bling,nuvemshop}`.
- **Loja digital com pedidos**: `app/api/shop/[orgId]/orders/route.ts` (criação de pedido já
  existe programaticamente).
- **Vendas / itens / clientes / RFM**: `sales`, `saleItems`, `clients` (`analiseRFMTitulo`),
  `products.grupo`.
- **Cashback e cupons**: `cashbackPrograms`, `coupons`/`coupon_grants`/`coupon_redemptions`.
- **Ponto de interação** (aprovação por operador): `poiTransactionRequests`.

**Conclusão:** já temos 80% das "ações" que a Meta quer que o agente execute — só não estão
expostas num contrato que a plataforma da Meta consiga chamar.

---

## 3. Decisão estratégica

> **De:** wrapper da Cloud API + agente de IA próprio (competindo na camada de LLM).
> **Para:** **(1) ponte de configuração/ativação** do Meta Business Agent + **(2) provedor de
> ferramentas/ações** para o agente da Meta, mantendo **(3) o handoff humano** no nosso Hub de
> Atendimentos.

Três produtos, um alinhado a cada camada onde ainda temos valor:

### Pilar A — Ativação assistida ("Bridge de configuração")
Fluxo no dashboard que leva o lojista de "tenho um WhatsApp Business" a "agente da Meta ativo,
ancorado no meu catálogo e políticas do RecompraCRM", sem ele mexer no Business Manager cru.
Empacota: seleção da WABA/telefone (já modelado em `whatsappConnections`), publicação de
knowledge/policies (horários, FAQ, política de troca — a partir do que já temos no perfil da
organização), e o **opt-in/registro do nosso provedor de ferramentas** no agente. 🔎 *O grau
de automação depende do que a Management API da Meta expõe para configurar o agente
programaticamente vs. exigir passos manuais no app da Meta.*

### Pilar B — Provedor de ferramentas ("Tool/Action source")
Um endpoint/servidor que expõe as capacidades do RecompraCRM como ferramentas que o agente da
Meta chama em runtime: consultar catálogo, histórico de compras, RFM, **criar pedido**,
aplicar cashback/cupom, abrir/escalar atendimento. **Reaproveita literalmente** a lógica de
`database-tools.ts` e das rotas de pedido — muda só a **casca** (de `tool()` do AI SDK para o
protocolo que a Meta exige, provavelmente MCP 🔎).

### Pilar C — Handoff e continuidade humana
Quando o agente da Meta escala, o atendimento cai no **Hub de Atendimentos** existente
(`chats`/`chatServices`, `responsavelTipo`). Precisamos receber o evento de handoff da Meta e
materializar como serviço `PENDENTE`/`USUÁRIO` — inverso do fluxo atual, em que **nós**
decidíamos escalar.

### O que descontinuar / congelar
- O `ToolLoopAgent` próprio (`lib/ai/ai-agent/index.ts`) deixa de ser o cérebro de produção.
  **Não apagar de imediato:** vira fallback para conexões `INTERNAL_GATEWAY` (onde não há
  Meta Agent) e para clientes fora do Meta Agent Platform. A lógica de ferramentas é
  preservada e refatorada para o Pilar B.

---

## 4. Arquitetura proposta

```
┌───────────────────────────────────────────────────────────┐
│                     Meta Agent Platform                    │
│   (LLM + orquestração + canal WA/IG/Messenger — da Meta)   │
└───────────────┬───────────────────────┬───────────────────┘
                │ chama ferramentas       │ evento de handoff/telemetria
                ▼ (MCP/actions) 🔎        ▼ (webhook) 🔎
┌───────────────────────────┐   ┌───────────────────────────┐
│  Pilar B: Tool Provider    │   │  Pilar C: Handoff Sink     │
│  /api/meta-agent/tools/*   │   │  /api/integrations/        │
│  (ou servidor MCP)         │   │  meta-agent/webhook        │
│  reusa database-tools.ts + │   │  → cria chatService        │
│  rotas de pedido/cashback  │   │    PENDENTE p/ Hub          │
└──────────────┬────────────┘   └──────────────┬────────────┘
               │                                │
               ▼                                ▼
        ┌──────────────────────────────────────────┐
        │  Domínio RecompraCRM (Drizzle / Postgres) │
        │  products · sales · clients(RFM) · orders │
        │  cashback · coupons · chats/chatServices  │
        └──────────────────────────────────────────┘
               ▲
               │ Pilar A: Bridge de configuração
        ┌──────┴───────────────────────────────────┐
        │  Dashboard admin: onboarding do agente    │
        │  (WABA, knowledge/policies, registro do   │
        │   tool provider, ativação)                │
        └───────────────────────────────────────────┘
```

### Ponto de decisão técnico central 🔎
Tudo se ramifica de **como a Meta espera receber as ferramentas**:
- **Hipótese 1 (MCP):** hospedamos um servidor MCP autenticado; a Meta registra a URL +
  OAuth Business. Mais próximo do que a Meta já faz em `mcp.facebook.com/ads`.
- **Hipótese 2 (Actions/Functions declaradas):** declaramos um schema de funções + URL de
  callback HTTP assinada por webhook, estilo function-calling clássico.
- **Hipótese 3 (Conector pré-integrado):** a Meta mantém catálogo de conectores e nós viramos
  um "app" nesse catálogo (modelo Shopify/Zendesk).

**Primeira tarefa concreta do épico é ler a doc oficial e cravar qual é.** O desenho de B/C
abaixo é propositalmente agnóstico à casca de transporte.

---

## 5. Modelagem de dados (mudanças propostas)

Reaproveitamos `whatsappConnections` e `organizations.configuracao` ao máximo; o novo é o
estado do agente da Meta e o vínculo com o provedor de ferramentas.

### 5.1 Novo tipo de conexão + estado do agente
- **`enums.ts`**: estender `whatsappConnectionTypeEnum` com **`META_AGENT_PLATFORM`** (3º tipo,
  além de `META_CLOUD_API` e `INTERNAL_GATEWAY`).
- **`whatsappConnectionPhones`** ou tabela nova `meta_agent_configs` (1:1 com telefone):
  ```ts
  metaAgentStatus: pgEnum([...])       // NAO_CONFIGURADO | CONFIGURANDO | ATIVO | PAUSADO | ERRO
  metaAgentId: varchar                 // id do agente na Meta 🔎
  metaAgentToolProviderRegistrado: boolean
  metaAgentUltimaSincronizacao: timestamp
  metadados: jsonb                     // knowledge/policies publicadas, escopos, etc.
  ```
  *Decisão:* tabela-filha nova (`meta_agent_configs`) em vez de inchar
  `whatsappConnectionPhones`, seguindo o gosto do repo (uma tabela por domínio).

### 5.2 Registro/segredo do tool provider
- `meta_agent_tool_credentials` (por organização/telefone): `providerToken` (segredo que a Meta
  apresenta ao chamar nossas ferramentas, para autenticação), `escopos: jsonb` (quais
  ferramentas habilitadas — catálogo/pedido/cashback), `dataRotacao`. 🔎 *Formato depende do
  esquema de auth da Meta (OAuth Business vs. token compartilhado vs. assinatura de webhook).*

### 5.3 Auditoria de chamadas de ferramenta
- `meta_agent_tool_invocations` (append-only): `telefoneId`, `clienteId?`, `ferramenta`,
  `inputSnapshot: jsonb`, `outputResumo`, `latenciaMs`, `sucesso`, `dataInsercao`.
  Serve para observabilidade, faturamento e depuração — mesmo espírito de ledger dos módulos
  de cashback/cupom.

### 5.4 Sem mudança destrutiva
Nada acima remove colunas existentes. `permitirAtendimentoIa` continua válido para o agente
próprio (`INTERNAL_GATEWAY`). O gate `iaAtendimento.acesso` ganha um irmão
`metaAgent.acesso` em `recursos` (`schemas/organizations.ts`).

---

## 6. Ferramentas a expor no Pilar B

Cada uma reusa código já existente; a coluna "origem" aponta o que refatorar.

| Ferramenta | Ação | Origem a reusar | Read/Write |
|---|---|---|---|
| `buscar_produtos` | busca no catálogo | `database-tools.ts:searchProducts` | R |
| `listar_categorias` / `produtos_por_categoria` | navegação de catálogo | idem | R |
| `historico_compras_cliente` | histórico + preferências | `getCustomerPurchaseHistory` | R |
| `perfil_cliente_rfm` | RFM + ticket médio | `getCustomerPurchaseInsights` | R |
| **`criar_pedido`** | cria pedido/rascunho de venda | `app/api/shop/[orgId]/orders/route.ts` | **W** |
| **`aplicar_cupom` / `consultar_cashback`** | benefícios | módulos `coupons` / `cashbackPrograms` | **W/R** |
| `escalar_para_humano` | abre serviço no Hub | `transfer-service-to-human.ts` | **W** |
| `consultar_status_pedido` | rastreio | `sales`/orders | R |

**Ferramentas de escrita exigem guarda-corpos** (idempotência por chave de request, limites de
valor, confirmação explícita antes de efetivar pagamento) — o padrão de `poiTransactionRequests`
(aprovação por operador com token) é o molde natural para "pedido criado pelo agente aguardando
confirmação".

---

## 7. Fases de entrega

### Fase 0 — Descoberta (bloqueante) 🔎
Ler a doc oficial e cravar: (a) mecanismo de tools (MCP vs actions vs conector),
(b) modelo de auth/onboarding, (c) API de configuração do agente (quanto dá pra automatizar),
(d) formato do evento de handoff, (e) o que muda entre in-app e Platform tier.
**Saída:** este documento revisado, com os 🔎 resolvidos, + um spike de "hello-tool" chamado
pelo agente da Meta num número de teste.

### Fase 1 — Provedor de ferramentas read-only (Pilar B, MVP)
Expor catálogo + histórico + RFM no protocolo da Meta, reusando `database-tools.ts`. Auth do
provider + auditoria (`meta_agent_tool_invocations`). Valor imediato: agente da Meta "ancorado"
nos dados do RecompraCRM sem migração de canal.

### Fase 2 — Bridge de ativação (Pilar A)
Onboarding no dashboard: vincular WABA/telefone → `META_AGENT_PLATFORM`, publicar
knowledge/policies, registrar o tool provider, ativar. Feature-gate `metaAgent.acesso`.

### Fase 3 — Ferramentas de escrita + handoff (Pilares B e C)
`criar_pedido`, cashback/cupom, com guarda-corpos estilo `poiTransactionRequests`. Webhook de
handoff → cria `chatService` no Hub. Continuidade humana ponta a ponta.

### Fase 4 — Observabilidade e faturamento
Painel de invocações/latência/custo por organização; base para precificar o valor que
entregamos por cima do custo de token da Meta.

---

## 8. Riscos e questões em aberto

- **🔎 Contrato da API (risco #1).** Todo o desenho pende da Fase 0. Não escrever código de
  transporte antes de confirmar o mecanismo real.
- **Disponibilidade geográfica / elegibilidade.** Confirmar cobertura BR e requisitos de
  verificação de negócio para o Platform tier.
- **Comoditização.** Se a Meta abrir conectores nativos para os mesmos ERPs (Bling, Nuvemshop),
  nosso diferencial de "fonte de catálogo" encolhe → **o valor real fica no cruzamento
  CRM/RFM/cashback/cupom, que é nosso e não commodity.** Priorizar essas ferramentas.
- **Custo de token repassado.** Definir se absorvemos, repassamos ou marcamos margem sobre os
  ~4–5 centavos/mensagem da Meta.
- **Coexistência de agentes.** Regras claras para quando um telefone tem Meta Agent + Hub
  humano + (legado) agente próprio, para não haver dupla resposta. O debounce/reavaliação de
  `responsavelTipo` já é um bom ponto de partida conceitual.
- **Privacidade/LGPD.** Expor histórico de compras e RFM a um agente da Meta é
  compartilhamento de PII com terceiro — precisa de base legal, opt-in do lojista e,
  provavelmente, do cliente final.

---

## 9. Próximo passo imediato

Aprovar este direcionamento e destravar a **Fase 0**: obter a doc oficial da Meta (acesso
autenticado ao portal de desenvolvedores) e resolver os itens 🔎 antes de abrir tarefas de
implementação. Sem isso, qualquer código de integração é chute sobre o contrato.
</content>
</invoke>
