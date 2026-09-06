# Onboarding CRM e ERP: desenho técnico e visual

> Status: detalhamento de implementação do plano de produto em
> `[onboarding-crm-erp-plan.md](./onboarding-crm-erp-plan.md)`, consolidado em 05/09/2026.
> **Fase 1 implementada em 05/09/2026** (ver seção 14). Fases 2 a 6 pendentes. Este documento define máquina de estados, funções,
> endpoints (ajustes e criações), modelo de dados e a proposta visual. Onde há decisão em
> aberto, ela está marcada como `D-n` e listada na seção 12.
>
> Convenções deste documento: nomes de função, tipo, arquivo e chave de envelope em inglês;
> campos de entidade, enums e textos de interface em português, seguindo o `CLAUDE.md`.
> DDL nunca é aplicado automaticamente: as migrações ficam em `drizzle/` e são aplicadas
> manualmente via `scripts/apply-sql-migration.ts`.

---

## 1. O que existe hoje (as-is) e o que muda

### 1.1 Fluxo atual

| Peça                     | Onde                                                                    | Comportamento atual                                                                                                                     | Problema frente ao plano                                                                                                               |
| ------------------------ | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Página servidor          | `app/onboarding/page.tsx`                                               | Gate por `organizations.dataOnboardingConclusao`; retomada pelo cookie `onboarding_stage`; hidrata campos da org e `integracoesAtivas`. | Etapa vive em cookie (24h, por dispositivo). Não há noção de produto (CRM/ERP) nem de etapa adiada.                                    |
| Página cliente           | `app/onboarding/onboarding-page.tsx`                                    | 6 etapas fixas: empresa, cashback, WhatsApp, campanhas, fonte de dados, conclusão. WhatsApp e campanhas bloqueiam o avanço.             | Ordem inverte o plano (fonte de dados deveria vir cedo). Bloqueios impedem adiar. Conclusão diz "Tudo pronto" e "N automações ativas". |
| Estado                   | `state-hooks/use-organization-onboarding-state.tsx`                     | Um único estado Zod com org, cashback, campanhas, fonte de dados e `stage`.                                                             | Mistura navegação, formulário e prontidão.                                                                                             |
| Criar org                | `POST /api/organizations`                                               | Cria org, plano de contas, contas financeiras, trial de 15 dias com capabilities de CRESCIMENTO.                                        | Mantém-se. Só o cliente muda.                                                                                                          |
| Cashback                 | `POST /api/organizations/onboarding/cashback`                           | Upsert idempotente do programa único da org.                                                                                            | Mantém-se.                                                                                                                             |
| Campanhas                | `POST /api/organizations/onboarding/campaigns`                          | Semeia templates (RASCUNHO) e campanhas com `ativo: true`; identifica campanhas gerenciadas pelo título.                                | Campanha nasce "ativa" sem canal pronto nem template aprovado. Identificação por título é frágil.                                      |
| Concluir                 | `POST /api/organizations/onboarding`                                    | Carimba `dataOnboardingConclusao`, notifica fundadores, envia boas-vindas.                                                              | Mantém-se, passa a receber `produto` e a não exigir pendências resolvidas.                                                             |
| Checklist pós-onboarding | `GET /api/organizations/onboarding-quality` + `OnboardingQualityBubble` | Seis passos com limiares arbitrários (10 clientes, 4 membros).                                                                          | Passa a derivar da prontidão real (seção 4).                                                                                           |
| Coleta de dados          | `app/api/cron/data-collecting` a cada 5 min, `lib/data-collecting-v2`   | Janela sempre "hoje"; loop por integração; uma transação por batch com efeitos (cashback, campanhas, atribuição).                       | Não existe carga histórica. O conector Bling busca detalhe de todo pedido antes de filtrar.                                            |
| Conectores               | `lib/data-connectors/*`                                                 | `fetchImportBatch({ window })` devolve batch canônico com `isValidSale`/`isCanceled`.                                                   | Sem contrato de listagem paginada separada do enriquecimento, nem descrição de capacidades por provedor.                               |
| Fila persistente         | `app/api/queues/ai-chat-turn/route.ts` + `vercel.json`                  | Tópico `ai-chat-turns` via `@vercel/queue` (`queue/v2beta`), at-least-once, `maxDuration 300`.                                          | É o mecanismo existente a reaproveitar para lotes de importação.                                                                       |
| Estado de sincronização  | `fiscalInboundSyncStates`                                               | Checkpoint, `proximaSincronizacaoPermitida`, `ultimoDesfecho`.                                                                          | Precedente de persistência de progresso por integração.                                                                                |
| Layout                   | `app/onboarding/_components/OnboardingLayout.tsx`                       | Gradiente azul, blobs com blur, card `bg-white/95 backdrop-blur`, `shadow-2xl`, cores hardcoded (`text-gray-900`, `dark:text-black`).   | Glassmorphism e cores fora do sistema. Não respeita dark mode do app (`next-themes`, `defaultTheme="system"`).                         |

### 1.2 O que este documento adiciona

1. Uma tabela de progresso por organização e produto, substituindo o cookie como fonte de verdade.
2. Um endpoint de prontidão que deriva o estado real de fonte de dados, carga histórica, cashback, campanhas, WhatsApp e canais de venda.
3. Um job persistente de carga histórica por integração, com filtro antes do enriquecimento e cobertura temporal explícita.
4. Uma máquina de estados de campanha em quatro estados (preparada, pronta, habilitada, ativa) com dependências visíveis.
5. Duas jornadas (CRM e ERP) com etapas adiáveis e uma tela de entrada que mostra o que já funciona.
6. Uma casca visual nova: fundo limpo, tokens do app, light e dark, sem gradiente nem vidro.

---

## 2. Modelo de dados

### 2.1 Nova tabela `organization_onboardings` (`ampmais_organization_onboardings`)

Uma linha por organização e produto. Guarda navegação e respostas; nunca guarda prontidão (que é derivada).

| Coluna             | Tipo                                                                                        | Notas                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `id`               | varchar(255) PK                                                                             | `crypto.randomUUID()`                                                     |
| `organizacao_id`   | varchar(255) FK cascade                                                                     |                                                                           |
| `produto`          | enum `onboarding_product` (`CRM`, `ERP`)                                                    |                                                                           |
| `origem_intencao`  | enum `onboarding_intent_origin` (`LINK`, `PARCEIRO`, `DEAL`, `PERGUNTA`, `SEGUNDO_PRODUTO`) | Como a jornada foi escolhida.                                             |
| `etapa_atual`      | varchar(64)                                                                                 | Id da etapa (seção 3.2 e 3.3). Referência de navegação, não de prontidão. |
| `etapas_adiadas`   | jsonb `string[]`                                                                            | Etapas em que o usuário clicou "Fazer depois".                            |
| `etapas_visitadas` | jsonb `string[]`                                                                            | Para instrumentação e para não repetir explicações.                       |
| `respostas`        | jsonb tipado `TOnboardingAnswers`                                                           | Ver abaixo.                                                               |
| `data_inicio`      | timestamp default now                                                                       |                                                                           |
| `data_conclusao`   | timestamp null                                                                              | Momento em que o usuário entrou no espaço de trabalho por este produto.   |
| `autor_id`         | varchar(255) FK set null                                                                    |                                                                           |
| `data_atualizacao` | timestamp                                                                                   | `$onUpdate`                                                               |

Índice único em `(organizacao_id, produto)`.

`TOnboardingAnswers` (Zod, `schemas/onboarding.ts`):

```typescript
{
  fonteDadosModo: "INTEGRACAO" | "POI" | "DEPOIS" | null,
  campanhasSelecionadas: string[],          // chaves dos presets
  campanhasComEnvioHabilitado: string[],    // intenção explícita de liberar envios
  whatsappPagamentoConfirmadoPeloUsuario: boolean,
  erpCanalInicial: "BALCAO" | "CATALOGO" | "MESAS" | null,
  erpCanaisPretendidos: string[],
  erpSimulacaoConcluidaEm: string | null,   // ISO
}
```

`organizations.dataOnboardingConclusao` continua sendo o gate do `/dashboard` (compatibilidade com o layout e com organizações existentes). Ele passa a ser carimbado quando a **primeira** jornada conclui. A conclusão da segunda jornada só carimba `organization_onboardings.data_conclusao`.

### 2.2 Nova tabela `integration_import_jobs` (`ampmais_integration_import_jobs`)

Uma carga histórica por integração. Progresso persistido por sub-janela e página.

| Coluna                    | Tipo                                      | Notas                                                                                                                                                   |
| ------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                      | varchar(255) PK                           |                                                                                                                                                         |
| `organizacao_id`          | varchar(255) FK cascade                   |                                                                                                                                                         |
| `integracao_id`           | varchar(255) FK restrict → `integrations` | Uma linha ativa por integração (índice único parcial em `estado in (...)`; ver D-4).                                                                    |
| `tipo`                    | enum `import_job_type` (`HISTORICO`)      | Reservado para futuros tipos (ex.: `REPROCESSAMENTO`).                                                                                                  |
| `estado`                  | enum `import_job_state`                   | `AGUARDANDO`, `EM_ANDAMENTO`, `PAUSADO_LIMITE`, `AGUARDANDO_RECONEXAO`, `CONCLUIDO`, `CONCLUIDO_COM_LACUNAS`, `FALHOU`, `CANCELADO`                     |
| `janela_alvo_inicio`      | timestamp                                 | Ex.: hoje menos 90 dias.                                                                                                                                |
| `janela_alvo_fim`         | timestamp                                 | Marco de início da carga (instante da conexão). O cron diário cobre dali para frente.                                                                   |
| `cobertura_inicio`        | timestamp null                            | Limite inferior do período **completamente** coberto. Avança para trás. Cobertura = `[cobertura_inicio, janela_alvo_fim]`.                              |
| `cursor_janela_inicio`    | timestamp null                            | Sub-janela em processamento.                                                                                                                            |
| `cursor_janela_fim`       | timestamp null                            |                                                                                                                                                         |
| `cursor_pagina`           | integer                                   | Página da listagem dentro da sub-janela.                                                                                                                |
| `cursor_pendentes`        | jsonb `string[]`                          | Ids de venda listados e elegíveis ainda não enriquecidos na sub-janela atual.                                                                           |
| `janelas_com_falha`       | jsonb `{ inicio, fim, motivo }[]`         | Sub-janelas que não fecharam. Se não vazio ao final, estado vira `CONCLUIDO_COM_LACUNAS`.                                                               |
| `contadores`              | jsonb `TImportJobCounters`                | `listados`, `elegiveis`, `ignoradosPorSituacao`, `situacoesDesconhecidas`, `importados`, `atualizados`, `clientesCriados`, `requisicoes`, `rateLimits`. |
| `proxima_execucao`        | timestamp null                            | Respeita `Retry-After` e limites diários.                                                                                                               |
| `lock_ate`                | timestamp null                            | Lease de execução; evita dois workers no mesmo job.                                                                                                     |
| `tentativas_consecutivas` | integer                                   | Zera a cada lote bem-sucedido.                                                                                                                          |
| `ultimo_erro`             | text null                                 |                                                                                                                                                         |
| `ultima_execucao`         | timestamp null                            |                                                                                                                                                         |
| `data_inicio`             | timestamp                                 |                                                                                                                                                         |
| `data_conclusao`          | timestamp null                            |                                                                                                                                                         |
| `autor_id`                | varchar(255) FK set null                  | Quem disparou. Null para disparo automático.                                                                                                            |

Índices: `(organizacao_id)`, `(estado, proxima_execucao)` para o varredor.

### 2.3 Ajustes em tabelas existentes

| Tabela                                 | Ajuste                                                 | Motivo                                                                                                                                                                                                                                                                                                       |
| -------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------ | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `campaigns`                            | Nova coluna `chave_preset varchar(64) null`            | Identificar campanhas criadas a partir de um preset sem depender do título (o usuário pode renomear). O nome é genérico de propósito: o mesmo conceito servirá à futura biblioteca de campanhas, em que organizações escolhem presets. O seed do onboarding faz upsert por `(organizacao_id, chave_preset)`. |
| `whatsapp_connection_phones.metadados` | Nova chave tipada `pagamento: { status: "DESCONHECIDO" | "CONFIRMADO_PELO_USUARIO"                                                                                                                                                                                                                                                                                    | "VERIFICADO" | "PENDENTE", atualizadoEm, ultimoErroCodigo? }` | A Meta não expõe de forma confiável se a conta tem forma de pagamento. O estado nasce `DESCONHECIDO`, vira `CONFIRMADO_PELO_USUARIO` no onboarding, `VERIFICADO` na primeira entrega bem-sucedida e `PENDENTE` quando um webhook de status traz o erro `131042` (problema de pagamento). Sem DDL: é jsonb. |
| `sales`                                | Nenhuma coluna nova                                    | Os contadores da carga vivem no job.                                                                                                                                                                                                                                                                         |

### 2.4 Enums (Zod em `schemas/enums.ts`, pg em `services/drizzle/schema/enums.ts`)

`OnboardingProductEnum`, `OnboardingIntentOriginEnum`, `ImportJobTypeEnum`, `ImportJobStateEnum`, `WhatsappPaymentStatusEnum`, `OnboardingCampaignStateEnum` (`PREPARADA`, `PRONTA`, `HABILITADA`, `ATIVA`), `OnboardingDependencyTypeEnum` (`CANAL`, `TEMPLATE`, `PAGAMENTO`, `DADOS`, `CASHBACK`, `LIBERACAO`), `OnboardingDependencyStatusEnum` (`OK`, `PENDENTE`, `EM_ANALISE`, `FALHOU`, `NAO_APLICAVEL`).

---

## 3. Máquinas de estado

Há quatro máquinas independentes. A interface compõe as quatro; nenhuma etapa visual é fonte de verdade sobre outra.

### 3.1 Navegação da jornada (por organização e produto)

```
                 ┌──────────────┐
  (sem org) ───▶ │  SEM_JORNADA │ ──── intenção conhecida ────▶ jornada = CRM | ERP
                 └──────────────┘ ──── intenção desconhecida ─▶ PERGUNTA ─▶ jornada
                         │
                         ▼
                 ┌──────────────┐   continuar / fazer depois / voltar
                 │ EM_ANDAMENTO │ ◀─────────────────────────────────┐
                 └──────────────┘                                    │
                         │ entrar no espaço de trabalho              │
                         ▼                                           │
                 ┌──────────────┐   retomar pendência (contextual)   │
                 │  CONCLUIDA   │ ───────────────────────────────────┘
                 └──────────────┘
```

Regras:

- `etapa_atual` só muda por ação do usuário (continuar, voltar, clicar no trilho) ou por retorno de OAuth (a rota de callback grava a etapa de origem).
- "Fazer depois" adiciona a etapa a `etapas_adiadas` e avança. Uma etapa adiada nunca é tratada como configurada.
- Voltar é permitido até a primeira etapa **depois** da criação da organização. A etapa "Conhecer a empresa" vira edição (não recriação) quando a org já existe.
- Ao concluir, `etapa_atual = "entrada"`, `data_conclusao` é carimbada e o redirecionamento vai para `/dashboard`. Pendências não bloqueiam.
- Ao retornar com jornada `CONCLUIDA`, o `/onboarding` redireciona para `/dashboard`. A continuidade acontece no painel de ativação (seção 8.6), não no fluxo.
- Segundo produto: `POST /api/organizations/onboarding/journeys` com `origem_intencao = "SEGUNDO_PRODUTO"` cria a linha e pula etapas cuja prontidão já é `OK` (ex.: cashback já ativo, WhatsApp já conectado).

### 3.2 Etapas da jornada CRM

| id            | Título (sentence case)          | Adiável | Concluída quando (derivado de prontidão)                             |
| ------------- | ------------------------------- | ------- | -------------------------------------------------------------------- |
| `empresa`     | Sobre a empresa                 | não     | organização existe e `atuacaoNicho` preenchido                       |
| `fonte-dados` | De onde vêm suas vendas         | sim     | `fonteDados.modo !== "NENHUMA"`                                      |
| `cashback`    | Incentivo para a próxima compra | sim     | programa existe (ativo ou não; a escolha de não ativar é válida)     |
| `campanhas`   | Campanhas para começar          | sim     | ≥ 1 campanha `PREPARADA` ou escolha explícita "nenhuma por enquanto" |
| `whatsapp`    | Canal de envio                  | sim     | telefone conectado                                                   |
| `entrada`     | Seu programa está preparado     | não     | `data_conclusao`                                                     |

Ordem: `empresa → fonte-dados → cashback → campanhas → whatsapp → entrada`. A carga histórica começa no retorno do OAuth e segue em segundo plano durante as demais etapas.

### 3.3 Etapas da jornada ERP

| id            | Título                  | Adiável | Concluída quando                                                                                            |
| ------------- | ----------------------- | ------- | ----------------------------------------------------------------------------------------------------------- |
| `empresa`     | Sobre a empresa         | não     | idem CRM (reaproveitada)                                                                                    |
| `canal`       | Como você quer vender   | não     | `respostas.erpCanalInicial`                                                                                 |
| `produtos`    | Seus primeiros produtos | não     | ≥ 1 produto utilizável no canal escolhido (seção 4.7)                                                       |
| `experiencia` | A cara da sua loja      | sim     | canal configurado (loja digital com `shopSettings`; balcão com PDV acessível; mesas com ≥ 1 `servicePoint`) |
| `incentivo`   | Incentivo na compra     | sim     | programa de cashback ou cupom existe, ou escolha "depois"                                                   |
| `simulacao`   | Experimente uma compra  | sim     | `respostas.erpSimulacaoConcluidaEm`                                                                         |
| `lancamento`  | Comece a vender         | não     | `data_conclusao`                                                                                            |

Pré-requisito de capability: a jornada ERP exige `configuracao.recursos.erp.acesso`. O trial atual usa as capabilities de CRESCIMENTO, que **não** incluem ERP (`app/api/organizations/route.ts:390`, memória `conector-vs-erp-tiers`). Ver D-1.

### 3.4 Carga histórica (`integration_import_jobs.estado`)

```
AGUARDANDO ──enfileirado──▶ EM_ANDAMENTO ──lote ok, resta janela──▶ EM_ANDAMENTO (re-enfileira)
                                │  │  │
                                │  │  └── 429 / limite diário ──▶ PAUSADO_LIMITE ──proxima_execucao──▶ EM_ANDAMENTO
                                │  └───── token EXPIRADO/401 ───▶ AGUARDANDO_RECONEXAO ──reconectou──▶ EM_ANDAMENTO
                                └──────── janela alvo coberta ──▶ CONCLUIDO | CONCLUIDO_COM_LACUNAS
                                                                        (janelas_com_falha vazio | não vazio)
qualquer ──tentativas_consecutivas ≥ N──▶ FALHOU (ação: "Tentar novamente" recria cursor a partir de cobertura_inicio)
qualquer ──usuário/desconexão da integração──▶ CANCELADO
```

Invariantes:

- `cobertura_inicio` só recua quando **toda** a sub-janela `[cursor_janela_inicio, cursor_janela_fim]` terminou: todas as páginas listadas, todos os elegíveis enriquecidos ou registrados em `janelas_com_falha`.
- Um lote nunca interpreta "fim de página" como "fim de janela". A condição de fechamento é a resposta do provedor sinalizando última página (Bling: resposta com menos de `limite` itens) **e** `cursor_pendentes` vazio.
- Retry é idempotente: `syncSales` já faz upsert por `(organizacaoId, integracaoId, idExterno)` com assinatura de importação; reprocessar uma página não duplica.
- Efeitos comerciais desligados: o lote chama a persistência com `effects = { processCashback: false, processCampaigns: false, processConversionAttribution: false }` e `processImmediateInteractions = false`. Nenhuma interação, cashback ou atribuição nasce de histórico.
- Sobreposição com o cron contínuo: o cron de 5 min segue cobrindo "hoje". O job cobre `[janela_alvo_inicio, janela_alvo_fim]` com `janela_alvo_fim = instante da conexão`. As duas escritas convergem pelo upsert. A reconciliação de transições (pedido ignorado que vira válido, venda que é cancelada) continua sendo papel do cron contínuo dentro de sua janela; para transições fora da janela do cron ver D-5.

### 3.5 Campanha preparada no onboarding

Estado derivado, calculado por `resolveOnboardingCampaignState` a partir da linha em `campaigns` e das dependências:

```
PREPARADA  = linha existe, ativo = false, template semeado
PRONTA     = PREPARADA ∧ todas as dependências aplicáveis em OK
HABILITADA = chave ∈ respostas.campanhasComEnvioHabilitado  (intenção do usuário)
ATIVA      = campaigns.ativo = true  (o motor de campanhas passa a considerar)
```

Transição para `ATIVA` acontece **somente** em `reconcileOnboardingCampaigns`, que roda quando: o usuário habilita envios; um template muda de status (webhook Meta, `lib/whatsapp/parsing.ts:613`); um telefone é conectado; a cobertura de dados atinge o limiar da campanha; o pagamento sai de `PENDENTE`. A função só liga `ativo = true` quando `PRONTA ∧ HABILITADA`. Dependência que regride (template pausado, pagamento pendente, telefone removido) desliga `ativo` e registra `alerta` na campanha.

Dependências por preset (`config/onboarding-campaign-presets.ts`, nova propriedade `dependencias`):

| Preset               | CANAL    | TEMPLATE                         | PAGAMENTO        | DADOS                                                                                                                                                                        | CASHBACK       |
| -------------------- | -------- | -------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| `primeira-compra`    | telefone | aprovado (META) / n.a. (gateway) | ok (META) / n.a. | cobertura contínua iniciada (o gatilho é evento futuro); aviso se `cobertura_inicio` for mais recente que 30 dias, porque "primeira compra" pode ser só a primeira importada | n.a.           |
| `segunda-compra`     | idem     | idem                             | idem             | idem                                                                                                                                                                         | n.a.           |
| `aniversario`        | idem     | idem                             | idem             | ≥ 1 cliente com data de nascimento                                                                                                                                           | n.a.           |
| `recuperacao`        | idem     | idem                             | idem             | cobertura ≥ 90 dias e RFM calculado sobre a janela coberta                                                                                                                   | n.a.           |
| `cashback-expirando` | idem     | idem                             | idem             | saldo existente com validade                                                                                                                                                 | programa ativo |

O limiar de 90 dias para recuperação é parâmetro (`ONBOARDING_RECOVERY_MIN_COVERAGE_DAYS`) e segue a decisão do plano §10.

### 3.6 WhatsApp

Três sub-estados independentes, expostos juntos em `readiness.whatsapp`:

| Facet       | Estados                                                                                        | Fonte                                                                                                            |
| ----------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `numero`    | `NENHUM`, `CONECTADO`, `EXPIRADO`, `DESCONECTADO`                                              | `whatsapp_connections` + `telefones`; `dataExpiracao` para META; `gatewayStatus` para gateway interno            |
| `pagamento` | `NAO_APLICAVEL` (gateway), `DESCONHECIDO`, `CONFIRMADO_PELO_USUARIO`, `VERIFICADO`, `PENDENTE` | `telefones.metadados.pagamento` (seção 2.3)                                                                      |
| `templates` | por template semeado: `RASCUNHO`, `EM_ANALISE`, `APROVADO`, `REJEITADO`, `PAUSADO`             | `message_templates.status` + status Meta em `metadados` (`lib/message-templates/channels/whatsapp/meta-maps.ts`) |

A conexão oficial é a ação principal. A conexão por QR Code sai do par de cards e vai para "Outras opções" (link discreto), sem a promessa de "sem burocracia".

---

## 4. Prontidão derivada (`getOnboardingReadiness`)

Função pura sobre o banco, em `lib/onboarding/readiness.ts`. Nunca lê cookie ou request. É a única fonte para: trilho da jornada, tela de entrada, painel de ativação, bolha de qualidade e reconciliação de campanhas.

```typescript
export type TOnboardingReadiness = {
	organizacao: { id: string; nome: string; atuacaoNicho: string | null; produtos: ("CRM" | "ERP")[] };
	fonteDados: {
		modo: "NENHUMA" | "POI" | "INTEGRACAO" | "AMBOS";
		poi: { registroAtivo: boolean };
		integracoes: Array<{
			id: string;
			tipo: TDataSourceIntegrationType;
			apelido: string | null;
			status: "CONECTADO" | "EXPIRADO" | "ERRO";
			ultimaSincronizacao: Date | null;
			cargaHistorica: TImportJobProgress | null; // seção 4.2
		}>;
	};
	dados: {
		vendasValidas: number;
		clientes: number;
		coberturaInicio: Date | null; // mínimo entre integrações concluídas; null se nenhuma
		coberturaParcial: boolean; // alguma carga em andamento ou com lacunas
		rfmCalculadoEm: Date | null;
	};
	cashback: {
		estado: "NAO_CONFIGURADO" | "CONFIGURADO_INATIVO" | "ATIVO";
		programaId: string | null;
		resumo: { acumuloTipo; acumuloValor; validadeDias; limiteResgate } | null;
	};
	campanhas: Array<{
		id: string;
		chave: string;
		titulo: string;
		estado: "PREPARADA" | "PRONTA" | "HABILITADA" | "ATIVA";
		dependencias: Array<{
			tipo: TOnboardingDependencyType;
			status: TOnboardingDependencyStatus;
			detalhe: string | null;
			acao: { rotulo: string; href: string } | null;
		}>;
	}>;
	whatsapp: { numero; pagamento; templates: Array<{ id; nome; status }>; tipoConexao: "META_CLOUD_API" | "INTERNAL_GATEWAY" | null };
	erp: {
		acesso: boolean;
		canal: "BALCAO" | "CATALOGO" | "MESAS" | null;
		produtosUtilizaveis: number;
		lojaDigital: { existe: boolean; ativa: boolean; modo: string | null };
		pontosAtendimento: number;
		simulacaoConcluida: boolean;
		pendenciasLancamento: Array<{ chave: string; rotulo: string; href: string }>;
	};
	proximaAcao: { chave: string; rotulo: string; descricao: string; href: string } | null;
};
```

### 4.1 Regras de composição

- `fonteDados.modo`: `POI` se `poiConfiguracao.vendas.registroAtivo`; `INTEGRACAO` se `organizationHasActiveDataSource`; `AMBOS` quando os dois; senão `NENHUMA`.
- `dados.vendasValidas` usa `getValidSaleConditions` (`lib/sales/valid-sale.ts`). Não cria regra própria.
- `dados.coberturaInicio` é o **máximo** dos `cobertura_inicio` das integrações ativas (a cobertura conjunta só vale até onde a fonte mais atrasada chegou). Sem integração, mas com POI ativo, a cobertura começa na data da primeira venda POI.
- `campanhas[].dependencias` vem de `resolveCampaignDependencies` (seção 3.5).
- `proximaAcao` segue prioridade fixa: reconexão de integração com erro → pagamento pendente → template rejeitado → campanha habilitada aguardando dependência sob controle do usuário → etapa adiada mais antiga → oportunidade fundamentada (só se `coberturaParcial = false`) → null.

### 4.2 Progresso da carga (`TImportJobProgress`)

```typescript
{
  jobId: string;
  estado: TImportJobState;
  janelaAlvo: { inicio: Date; fim: Date };
  coberturaConcluida: { inicio: Date; fim: Date } | null;   // [cobertura_inicio, janela_alvo_fim]
  emProcessamento: { inicio: Date; fim: Date } | null;      // sub-janela atual
  contadores: TImportJobCounters;
  proximaExecucao: Date | null;
  lacunas: number;
  acao: { tipo: "RECONECTAR" | "TENTAR_NOVAMENTE" | null; href: string | null };
}
```

A interface nunca mostra porcentagem de vendas (o total é desconhecido). Mostra cobertura temporal, que é conhecida: dias cobertos sobre dias da janela alvo.

### 4.3 Adaptação do `onboarding-quality`

`GET /api/organizations/onboarding-quality` passa a ser um adaptador fino sobre `getOnboardingReadiness`: os passos "10 clientes" e "3 membros convidados" deixam de ser critérios e viram sugestões sem contagem no progresso. O componente `OnboardingQualityBubble` consome a mesma saída; com o painel de ativação (seção 8.6) a bolha só aparece quando o painel foi dispensado.

---

## 5. Carga histórica em segundo plano

### 5.1 Execução

Mecanismo principal: **Vercel Queue**, mesmo padrão de `ai-chat-turns`.

- Produtor: `lib/integrations/import-jobs/enqueue.ts` → `enqueueImportJobBatch({ jobId })` publica em `integration-import-batches`.
- Consumidor: `app/api/queues/integration-import-batch/route.ts` com `handleCallback`, `maxDuration = 300`, retry `afterSeconds` derivado de `proxima_execucao`.
- Varredor de segurança: `app/api/cron/import-jobs/route.ts` a cada 2 minutos (mesmo cadência de `fiscal-queue`) seleciona jobs em `EM_ANDAMENTO | PAUSADO_LIMITE | AGUARDANDO` com `proxima_execucao <= now()` e `lock_ate < now()` e os re-enfileira. Cobre perda de mensagem e reinício após deploy.
- Cada lote roda `runImportJobBatch({ jobId, budget })` com orçamento explícito: `{ maxRequests: 120, maxMillis: 240_000 }`. Ao esgotar, persiste cursor e re-enfileira. Ver D-3 para o orçamento por provedor.

Lease: o lote grava `lock_ate = now() + 6 min` antes de começar e limpa ao terminar. Um segundo consumidor que encontre lock vigente reconhece a mensagem sem processar.

### 5.2 Algoritmo de um lote (`runImportJobBatch`)

```
1. carregar job + integração; se integração inativa → CANCELADO; se status EXPIRADO → AGUARDANDO_RECONEXAO
2. se cursor vazio: cursor_janela = [max(janela_alvo_inicio, janela_alvo_fim - passo), janela_alvo_fim]; cursor_pagina = 1
3. enquanto orçamento > 0:
   a. se cursor_pendentes vazio:
        página = connector.listSales({ window: cursor_janela, page: cursor_pagina })
        para cada resumo: decidir elegibilidade pela situação da listagem (connector.classifyListedSale)
           ELEGIVEL → cursor_pendentes.push(id) ; IGNORADO → contadores.ignoradosPorSituacao++
           DESCONHECIDO → cursor_pendentes.push(id) ; contadores.situacoesDesconhecidas++   (nunca descartar em silêncio)
        se página.ultima: marcar listagem da sub-janela concluída ; senão cursor_pagina++
   b. senão:
        ids = cursor_pendentes.splice(0, tamanhoLote)
        batch = connector.buildBatchForSales({ ids, window })     // detalhes + contatos + produtos necessários
        persistCanonicalBatch({ integration, batch, effects: NONE, mode: "HISTORICO" })
        contadores.importados/atualizados += resultado
   c. se listagem concluída ∧ cursor_pendentes vazio:
        cobertura_inicio = cursor_janela_inicio
        se cobertura_inicio <= janela_alvo_inicio → estado final (CONCLUIDO ou CONCLUIDO_COM_LACUNAS) ; return
        cursor_janela = janela anterior (mesmo passo) ; cursor_pagina = 1
4. salvar cursor e contadores; re-enfileirar
tratamento: 429 → proxima_execucao = now + Retry-After (ou padrão do conector) ; estado PAUSADO_LIMITE ; salvar ; return
            401/expirado → AGUARDANDO_RECONEXAO ; salvar ; return
            erro de página → janelas_com_falha.push(sub-janela, motivo) ; seguir para a próxima sub-janela
```

Passo inicial de sub-janela: 7 dias (recentes primeiro). Parâmetro por conector.

Ao concluir: chamar a recomputação de métricas de cliente da organização (a mesma rotina do cron `enrich-clients`, extraída em função) para consolidar `primeiraCompra`, `ultimaCompra` e totais a partir de vendas válidas. Isso evita que `updateClientMetrics` incremental produza contagens fora de ordem quando a carga anda para trás no tempo (D-7).

### 5.3 Contrato dos conectores

`lib/data-connectors/types.ts` ganha um contrato opcional. Conectores sem ele continuam funcionando no cron; o job só é oferecido para conectores que o implementem.

```typescript
export type TDataConnectorHistoryCapabilities = {
	supportsHistory: boolean;
	listIncludesStatus: boolean; // dá para decidir elegibilidade sem detalhe
	supportsStatusFilterOnList: boolean; // filtro de situação na própria listagem
	maxWindowDays: number | null; // limite do provedor por consulta
	defaultStepDays: number; // passo de sub-janela
	rateLimit: { perSecond: number | null; perDay: number | null };
};

export type TListedSaleClassification = "ELEGIVEL" | "IGNORADO" | "DESCONHECIDO";

export type TDataConnectorHistory<TConfig> = {
	describe: () => TDataConnectorHistoryCapabilities;
	listSales: (input: {
		config: TConfig;
		window: TCanonicalImportWindow;
		page: number;
	}) => Promise<{ items: Array<{ sourceSaleId: string; statusText: string; occurredAt: Date | null }>; last: boolean; requests: number }>;
	classifyListedSale: (item: { statusText: string }) => TListedSaleClassification;
	buildBatchForSales: (input: {
		organizationId: string;
		integrationId: string;
		config: TConfig;
		window: TCanonicalImportWindow;
		sourceSaleIds: string[];
	}) => Promise<TCanonicalConnectorBatch & { requests: number }>;
};
```

Bling (primeiro conector a implementar):

- `listSales` usa `GET /pedidos/vendas?dataInicial&dataFinal&pagina&limite=100`, já existente em `fetchBlingPaginated`, mas página a página.
- `classifyListedSale` reutiliza `isBlingValidSaleStatus` / `isBlingCanceledSaleStatus` (`lib/data-connectors/bling/mappers.ts`) sobre `situacao` da própria listagem. Situação não reconhecida → `DESCONHECIDO`, que segue para detalhe.
- `buildBatchForSales` reaproveita `fetchBlingSalesWithDetails`, `fetchBlingContactsForSales`, `fetchBlingProductsForSales`, com cache por job de contatos e produtos já buscados (evita repetir consulta do mesmo contato entre lotes; cache em `contadores.cacheIds` ou tabela auxiliar, D-3).
- `describe`: `supportsStatusFilterOnList` fica `false` até validar `idsSituacoes[]` contra a conta real (os ids de situação são por conta; ver `mappers.ts:59`).

### 5.4 Reaproveitamento em `lib/data-collecting-v2`

Extrair de `processIntegration` o núcleo transacional em `persistCanonicalBatch({ integration, batch, organizationConfiguration, effects, mode })`, usado pelo cron (com efeitos) e pelo job (sem efeitos). O bloco pós-commit (aceite iFood, cupom automático, emissão fiscal) só roda em `mode = "CONTINUA"`.

### 5.5 Disparo

- Callbacks OAuth (`bling`, `nuvemshop`) após `connectDataSourceIntegration`: se o `redirectTo` aponta para `/onboarding`, chamar `startHistoricalImport({ integrationId, organizationId, autorId: null, janelaDias: 90 })`. Idempotente: se já existe job não terminal para a integração, retorna o existente.
- Configurações (`/dashboard/settings?view=integration`): botão "Importar histórico" chama `POST /api/integrations/import-jobs` explicitamente. Não dispara sozinho (D-2).
- Expansão até 12 meses: `POST /api/integrations/import-jobs` com `janelaDias: 365` sobre integração com job `CONCLUIDO` cria novo job cuja `janela_alvo_fim = cobertura_inicio` do anterior. A interface oferece "Buscar mais histórico" na tela de entrada quando o primeiro job concluiu.

---

## 6. Endpoints

Todos em `app/api/**/route.ts`, no padrão do `CLAUDE.md` (schema de entrada, função de serviço, handler, `appApiHandler`).

### 6.1 Onboarding

| Método e rota                                         | Estado                                 | Entrada                                                                          | Saída                                                            | Observações                                                                                                                                                                                                                                                   |
| ----------------------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `GET /api/organizations/onboarding`                   | **novo** (arquivo existente ganha GET) | `?produto=CRM                                                                    | ERP` opcional                                                    | `{ data: { journeys: TOrganizationOnboardingEntity[], readiness: TOnboardingReadiness }, message }`                                                                                                                                                           | Uma chamada para retomar. O servidor (`page.tsx`) chama a função de serviço diretamente. |
| `POST /api/organizations/onboarding/journeys`         | novo                                   | `{ produto, origemIntencao }`                                                    | `{ data: { journey }, message }`                                 | Cria a linha; se já existe, devolve. Para `SEGUNDO_PRODUTO`, marca em `etapas_visitadas` as etapas cuja prontidão já é OK.                                                                                                                                    |
| `PUT /api/organizations/onboarding/progress`          | novo                                   | `{ produto, etapaAtual?, adiarEtapa?, respostas?: Partial<TOnboardingAnswers> }` | `{ data: { journey }, message }`                                 | Merge raso de `respostas`. Registra `etapas_visitadas`.                                                                                                                                                                                                       |
| `POST /api/organizations/onboarding`                  | **ajuste**                             | `{ produto }`                                                                    | `{ data: { redirectTo, pendencias: number }, message }`          | Não exige pendências resolvidas. Carimba `organization_onboardings.data_conclusao` e, se for a primeira jornada, `organizations.dataOnboardingConclusao`. A mensagem reflete o estado ("Seu programa está preparado. 2 pendências aguardam você no painel."). |
| `POST /api/organizations/onboarding/cashback`         | mantido                                | idem                                                                             | idem                                                             | Passa a também gravar `respostas` da etapa via serviço compartilhado, não via segunda chamada do cliente.                                                                                                                                                     |
| `POST /api/organizations/onboarding/campaigns`        | **ajuste**                             | `{ cashbackAtivo, selectedKeys, enableSendingKeys }`                             | `{ data: { campaigns: Array<{ id, chave, estado }> }, message }` | Semeia com `ativo: false` e `chavePreset`. Upsert por chave; presets desmarcados são removidos só se ainda `ativo = false` e sem interações. Chama `reconcileOnboardingCampaigns` ao final.                                                                   |
| `POST /api/organizations/onboarding/campaigns/enable` | novo                                   | `{ chaves: string[] }`                                                           | `{ data: { campaigns }, message }`                               | Liberação explícita a partir da tela de entrada ou do painel. Grava intenção e reconcilia.                                                                                                                                                                    |
| `GET /api/organizations/onboarding/readiness`         | novo                                   | nenhuma                                                                          | `{ data: TOnboardingReadiness }`                                 | Para polling leve (10 s) enquanto houver job ativo; `staleTime` curto. Sem job ativo, 60 s.                                                                                                                                                                   |
| `PUT /api/organizations/onboarding/whatsapp-payment`  | novo                                   | `{ telefoneId, confirmado: boolean }`                                            | `{ data: { pagamento }, message }`                               | Grava `CONFIRMADO_PELO_USUARIO` em `metadados.pagamento`.                                                                                                                                                                                                     |
| `GET /api/organizations/onboarding-quality`           | **ajuste**                             | nenhuma                                                                          | mesmo tipo atual                                                 | Vira adaptador de `getOnboardingReadiness`.                                                                                                                                                                                                                   |

### 6.2 Carga histórica

| Método e rota                                    | Estado                 | Entrada                         | Saída                                                                                   |
| ------------------------------------------------ | ---------------------- | ------------------------------- | --------------------------------------------------------------------------------------- |
| `POST /api/integrations/import-jobs`             | novo                   | `{ integrationId, janelaDias }` | `{ data: { job: TImportJobProgress }, message }`                                        |
| `GET /api/integrations/import-jobs`              | novo                   | `?integrationId=` ou `?id=`     | `{ data: { byId, default: TImportJobProgress[] } }`                                     |
| `POST /api/integrations/import-jobs/[id]/retry`  | novo                   | nenhuma                         | job reaberto a partir de `cobertura_inicio`, `janelas_com_falha` reprocessadas primeiro |
| `POST /api/integrations/import-jobs/[id]/cancel` | novo                   | nenhuma                         | `CANCELADO`                                                                             |
| `POST /api/queues/integration-import-batch`      | novo (sem URL pública) | mensagem `{ jobId }`            | `handleCallback`                                                                        |
| `GET /api/cron/import-jobs`                      | novo                   | `assertCronAuthorized`          | varredor                                                                                |

Permissão: `canManageIntegrations` (`lib/integrations/mask.ts`), a mesma dos callbacks OAuth.

### 6.3 Integrações e WhatsApp (ajustes)

| Rota                                                     | Ajuste                                                                                                                                                                                   |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/integrations/bling/auth`, `.../nuvemshop/auth` | Aceitar `?redirectTo=/onboarding&etapa=fonte-dados`; o callback grava `etapa_atual` na jornada em andamento antes de redirecionar, substituindo o cookie de etapa.                       |
| callbacks OAuth de fonte de dados                        | Após `connectDataSourceIntegration`, `startHistoricalImport` quando origem é onboarding (seção 5.5).                                                                                     |
| `GET /api/whatsapp-connections`                          | Saída ganha `pagamento` por telefone (derivado de `metadados`) e `tipoConexao`. Sem quebra: campos adicionais.                                                                           |
| webhooks Meta (`lib/whatsapp/webhook-processing.ts`)     | Ao processar status de template (`APPROVED`/`REJECTED`/`PAUSED`) e erros de envio `131042`, chamar `reconcileOnboardingCampaigns({ organizationId })` e atualizar `metadados.pagamento`. |

### 6.4 ERP (reaproveita rotas existentes)

| Etapa         | Rotas usadas                                                                                           | Observação                                                                          |
| ------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `produtos`    | `GET/POST /api/products`, importação por arquivo se já suportada                                       | Campos mínimos por canal definidos em `lib/onboarding/erp-channels.ts` (seção 4.7). |
| `experiencia` | `PUT /api/shop/settings` (loja digital), `POST /api/service-points` (mesas), `GET /api/sales-channels` | Preset por segmento aplica `modo` da loja e categorias.                             |
| `incentivo`   | `POST /api/organizations/onboarding/cashback`, `POST /api/coupons`                                     | Reaproveita programa existente; nunca cria segundo programa.                        |
| `simulacao`   | nenhuma escrita (D-8)                                                                                  | Prévia guiada do lado do cliente e painel simulado do lado da operação.             |
| `lancamento`  | `PUT /api/shop/settings` (`ativo: true`), configuração fiscal quando aplicável                         | Checklist por canal (`erp.pendenciasLancamento`).                                   |

---

## 7. Funções e módulos

### 7.1 `lib/onboarding/`

| Arquivo                    | Funções                                                                                                               | Papel                                                                                                                                                       |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `journeys.ts`              | `CRM_JOURNEY`, `ERP_JOURNEY`, `getJourneyDefinition(produto)`, `resolveStageCompletion(stageId, readiness)`           | Definições de etapa (id, título, descrição, adiável, ícone, `isComplete(readiness)`). Consumidas pelo trilho e pelo servidor.                               |
| `progress.ts`              | `getOrCreateJourney`, `updateJourneyProgress`, `concludeJourney`, `resolveResumeStage(journey, readiness)`            | Substitui `app/onboarding/_lib/stages.ts`. Retomada: primeira etapa não concluída e não adiada; se todas concluídas ou adiadas, `entrada`.                  |
| `readiness.ts`             | `getOnboardingReadiness`, `resolveNextAction`                                                                         | Seção 4.                                                                                                                                                    |
| `campaign-dependencies.ts` | `resolveCampaignDependencies`, `resolveOnboardingCampaignState`, `reconcileOnboardingCampaigns`                       | Seção 3.5.                                                                                                                                                  |
| `intent.ts`                | `resolveIntentOrigin({ searchParams, cookies, dealForm })`                                                            | Lê `?produto=`, cookie de parceiro (`PLATFORM_PARTNER_COOKIE_NAME`) e formulário de deal (`lib/deals/onboarding.ts`). Retorna produto ou `null` (pergunta). |
| `erp-channels.ts`          | `ERP_CHANNELS`, `getRequiredProductFieldsForChannel`, `countUsableProducts`, `getLaunchChecklist(channel, readiness)` | Campos mínimos por canal e checklist de lançamento.                                                                                                         |
| `copy.ts`                  | `getStageCopy`, `getImportProgressCopy`, `getConclusionCopy(readiness)`                                               | Textos centralizados, com plural e estado real.                                                                                                             |

### 7.2 `lib/integrations/import-jobs/`

| Arquivo        | Funções                                                         |
| -------------- | --------------------------------------------------------------- | ------- | ------------ | ------ |
| `start.ts`     | `startHistoricalImport`, `getActiveImportJob`                   |
| `run-batch.ts` | `runImportJobBatch`, `acquireJobLease`, `releaseJobLease`       |
| `coverage.ts`  | `getImportCoverage(organizationId)`, `toImportJobProgress(row)` |
| `enqueue.ts`   | `enqueueImportJobBatch`                                         |
| `schedule.ts`  | `sweepDueImportJobs` (cron)                                     |
| `errors.ts`    | `classifyProviderError(error)` → `RATE_LIMIT                    | EXPIRED | PAGE_FAILURE | FATAL` |

### 7.3 `lib/data-collecting-v2/`

- `persist-canonical-batch.ts`: `persistCanonicalBatch` extraído de `index.ts`.
- `index.ts`: `processIntegration` passa a chamar `persistCanonicalBatch` e o pós-commit.
- `lib/clients/recompute-metrics.ts`: extrair de `app/api/cron/enrich-clients` a função `recomputeClientMetricsForOrganization`.

### 7.4 Cliente

| Arquivo                                                    | Conteúdo                                                                                                                                               |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `lib/queries/onboarding.ts`                                | `useOnboardingReadiness({ pollWhileImporting })`, `useOnboardingJourney(produto)`, `useImportJob({ integrationId })`, mantém `useOnboardingQuality`    |
| `lib/mutations/onboarding.ts`                              | `createJourney`, `updateJourneyProgress`, `concludeJourney`, `enableOnboardingCampaigns`, `confirmWhatsappPayment`, `startImportJob`, `retryImportJob` |
| `state-hooks/use-internal-onboarding-navigation-state.tsx` | `stage`, `goTo`, `next`, `back`, `defer`, sincroniza com `PUT progress` (otimista)                                                                     |
| `state-hooks/use-internal-onboarding-crm-state.tsx`        | organização, cashback, campanhas selecionadas, fonte de dados (o hook atual, sem `stage`)                                                              |
| `state-hooks/use-internal-onboarding-erp-state.tsx`        | canal, produtos iniciais, experiência, incentivo                                                                                                       |

Eventos PostHog (cliente e servidor): `onboarding_journey_selected`, `onboarding_stage_viewed`, `onboarding_stage_deferred`, `onboarding_stage_completed`, `onboarding_concluded { produto, pendencias }`, `import_job_started`, `import_job_batch { requests, importados }`, `import_job_paused_rate_limit`, `import_job_completed { coberturaDias, lacunas }`, `campaign_prepared`, `campaign_ready`, `campaign_enabled`, `campaign_activated`, `whatsapp_payment_confirmed`, `erp_simulation_completed`, `erp_channel_launched`. Mapeiam a seção 7 do plano de produto.

---

## 8. Proposta visual

### 8.1 Registro e direção

Registro: **produto**. O onboarding é interface autenticada em que o lojista está executando uma tarefa. A referência é o próprio app interno: `SettingsNavRail`, `SettingsSectionHeader`, `OnboardingQualityStep`, `Button` e os tokens de `styles/globals.css`.

Cena: o dono de uma loja de bairro, no balcão ou no escritório dos fundos, num notebook ou tablet, no meio do expediente, com o ERP aberto na outra aba e pouca paciência para telas de boas-vindas. Sob luz de loja, um fundo branco limpo lê melhor que um gradiente azul; à noite, no celular, o dark do sistema é o que ele já tem no resto do app. Conclusão: **o tema segue o sistema**, como todo o `/dashboard` (`ThemeProvider defaultTheme="system"`). Nada de forçar light ou dark.

Estratégia de cor: **Restrained**. Neutros do tema, `foreground` como cor de ação (o `--primary` real do app é o quase-preto), azul `brand-secondary` só em links e no logo, âmbar `brand` em exatamente dois momentos: a prévia do cashback e a marca de etapa concluída. Isso corrige a inversão atual, em que âmbar é a cor de seleção em todos os cards e viola a proporção 1:3 do `DESIGN.md`.

Âncoras: o rail de Configurações do próprio app; formulários de onboarding do Stripe Dashboard (uma pergunta por bloco, sem ilustração); páginas de configuração do Linear (lista vertical de opções em vez de grade de cards).

O que sai: gradiente `from-[#0f2c5c]`, blobs com `blur-[100px]`, `bg-white/95 backdrop-blur`, `shadow-2xl shadow-black/50`, `hover:-translate-y-1 hover:shadow-lg`, cores `text-gray-*`, `green-50/200`, `yellow-700`, `emerald-*`, títulos em caixa alta, o card "Precisa de ajuda?" em vidro.

### 8.2 Casca (`OnboardingShell`)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  [logo horizontal]                                   Sair · Ajuda        │  h-14, border-b hairline
├───────────────┬──────────────────────────────────────────────────────────┤
│ JORNADA CRM   │  ETAPA 2 DE 6 · FONTE DE DADOS         (eyebrow)         │
│ ● Empresa     │  De onde vêm suas vendas                (title)           │
│ ○ Vendas   ←  │  Conecte o sistema que você já usa ou registre no balcão. │
│ ○ Cashback    │  ──────────────────────────────────────────────           │
│ ○ Campanhas   │                                                           │
│ ○ WhatsApp    │  [conteúdo da etapa, max-w 640px]                         │
│ ○ Entrada     │                                                           │
│               │                                                           │
│ Importando…   │                                                           │
│ 126 vendas    │  ──────────────────────────────────────────────           │
│               │  Voltar                     Fazer depois   [Continuar]    │
└───────────────┴──────────────────────────────────────────────────────────┘
```

- Fundo: `bg-background text-foreground` em toda a viewport. Sem card envolvente. Sem sombra.
- Container: `mx-auto w-full max-w-[1120px] px-6 lg:px-10`.
- Grid desktop: `lg:grid lg:grid-cols-[248px_minmax(0,1fr)] lg:gap-12`.
- Topo: `h-14 flex items-center justify-between border-b border-border`. Logo `BrandLogo lockup="horizontal" tone="black"` com par `dark:` `tone="white"` (dois renders, `dark:hidden` / `hidden dark:block`). Ações à direita como `Button variant="ghost" size="sm"`.
- Trilho (`JourneyRail`): mesmo idioma do `SettingsNavRail`: `rounded-xl border border-border bg-muted/40 p-2 lg:sticky lg:top-6`. Eyebrow do grupo `text-[11px] font-extrabold tracking-[0.08em] uppercase text-muted-foreground/70`. Item `rounded-lg px-2.5 py-2 text-sm`; ativo `bg-secondary font-bold text-foreground`; demais `text-muted-foreground font-medium hover:bg-secondary/60`. Marcador à esquerda de 20px: concluída `rounded-full bg-brand text-brand-foreground` com `Check` (igual ao `OnboardingQualityStep`); atual `border-2 border-foreground` com ponto `bg-foreground`; pendente `border-2 border-muted-foreground/30`; adiada: marcador pendente mais micro rótulo "Depois" em `text-[11px] font-semibold text-muted-foreground`. Clicável para etapas já visitadas.
- Rodapé do trilho: bloco de progresso da carga (seção 8.5, versão compacta) quando houver job ativo. Sem card de ajuda em vidro; "Ajuda" vive no topo.
- Cabeçalho da etapa (`StageHeader`): reaproveita a anatomia de `SettingsSectionHeader`: eyebrow `text-[11px] font-extrabold tracking-[0.08em] uppercase text-muted-foreground` ("Etapa 2 de 6 · Fonte de dados"), título `text-2xl font-extrabold tracking-tight` em sentence case, descrição `text-sm text-muted-foreground`, `border-b border-border pb-4`.
- Conteúdo: `max-w-[640px]` para formulários e listas de escolha; prosa em `max-w-[68ch]`.
- Rodapé (`StageFooter`): `border-t border-border pt-4 flex items-center justify-between`. Esquerda: `Button variant="ghost"` "Voltar". Direita: `Button variant="link"` "Fazer depois" (só em etapa adiável) e `Button variant="default" size="lg"` "Continuar". Rótulos em sentence case (D-9). Em mobile, o rodapé é `sticky bottom-0 bg-background/95 border-t` com padding seguro.
- Mobile (`< lg`): o trilho vira uma linha sob o topo com seis barras `h-1 rounded-full` (concluída `bg-brand`, atual `bg-foreground`, pendente `bg-border`) e o eyebrow "Etapa 2 de 6". Um botão "Ver etapas" abre um `Popover` com a lista completa. Sem sidebar.

### 8.3 Componentes de escolha (`ChoiceList`, `ChoiceRow`)

Substitui `SelectableCard` e `ModeCard`. Lista vertical, uma opção por linha, semântica de radio (`role="radiogroup"`, setas do teclado).

- Linha: `flex items-start gap-3 rounded-xl border border-border p-4 text-left transition-colors duration-150`.
- Hover: `bg-muted/40`. Selecionada: `border-foreground bg-muted/40`. Foco: `focus-visible:ring-[3px] focus-visible:ring-ring/50`.
- Indicador à esquerda: círculo 18px `border-2 border-muted-foreground/40`; selecionado `border-foreground` com ponto `bg-foreground`.
- Texto: título `text-sm font-bold`, descrição `text-sm text-muted-foreground`. Ícone opcional 16px em `text-muted-foreground`, nunca em capsula colorida.
- Sem `translate-y`, sem sombra, sem âmbar.
- Segmentos (nicho): mesma `ChoiceRow` em grade `sm:grid-cols-2` porque são 20 opções curtas; a grade é exceção justificada pela quantidade, não estilo.

### 8.4 Estados semânticos (`ReadinessPill`)

Pílula `rounded-full px-2.5 py-0.5 text-[11px] font-bold` com ponto de 6px. Vocabulário fechado, mapeado nos tokens existentes:

| Estado                           | Classe                                            | Uso                                                 |
| -------------------------------- | ------------------------------------------------- | --------------------------------------------------- |
| Ok / conectado / ativa           | `text-success bg-success/10`                      | número conectado, template aprovado, campanha ativa |
| Em andamento / em análise        | `text-foreground bg-muted`                        | importação, template em análise                     |
| Pendente sob controle do usuário | `text-brand-foreground bg-brand/15` (âmbar suave) | pagamento a confirmar, liberação de envios          |
| Falhou / rejeitado / expirado    | `text-destructive bg-destructive/10`              | reconexão, template rejeitado                       |
| Adiado / não configurado         | `text-muted-foreground bg-muted/60`               | etapa adiada                                        |

A pílula âmbar conta na proporção 1:3; só um estado usa âmbar e ele significa "a bola está com você", coerente com `ABERTO` no hub de atendimentos (`DESIGN.md`).

### 8.5 Progresso da carga (`ImportProgress`)

Versão completa (etapa "Entrada" e painel de ativação):

```
Importando o histórico do Bling
126 vendas válidas e 91 clientes importados. Estamos buscando o restante.

[██████████████░░░░░░░░░░░░░░░░░░]   Coberto: 12 ago a hoje · Em andamento: 5 a 12 ago · Alvo: 90 dias
Você pode continuar configurando. Avisamos quando concluir.
```

- Título `text-sm font-bold`; contadores em prosa `text-sm text-muted-foreground` com `tabular-nums`.
- Barra `h-1.5 rounded-full bg-border` com segmento coberto `bg-foreground/80` e segmento em processamento `bg-foreground/30`. A largura é **proporção de dias** da janela alvo, nunca de vendas.
- Estados: `PAUSADO_LIMITE` → texto "O Bling pediu uma pausa. Retomamos automaticamente às 14:32." (sem culpar o usuário). `AGUARDANDO_RECONEXAO` → pílula destrutiva e `Button variant="outline" size="sm"` "Reconectar". `CONCLUIDO_COM_LACUNAS` → "Concluído com 2 períodos pendentes" e "Tentar novamente".
- Versão compacta (trilho): duas linhas, sem barra.

### 8.6 Tela de entrada e painel de ativação

Etapa `entrada` (última do fluxo): título dinâmico de `getConclusionCopy(readiness)`: "Seu programa está preparado" (cashback ativo), "Sua base está chegando" (só importação), "Sua conta está criada" (tudo adiado). Nunca "Tudo pronto".

Duas colunas em `lg`, sem cards aninhados:

- Esquerda, "O que já funciona": lista `divide-y divide-border` de linhas `py-3 flex items-center justify-between` com rótulo e `ReadinessPill`. Ex.: "Cashback · Ativo, 5% de volta", "WhatsApp · Número conectado", "Campanhas · 3 preparadas, aguardando template", "Histórico · Importando, 126 vendas".
- Direita, "Próxima ação": um único bloco `rounded-2xl border border-border p-5` com título, descrição e um `Button`. Se `proximaAcao` for `null`, o bloco mostra "Nada pendente por enquanto" e o botão "Ir para o painel".
- Rodapé: `Button size="lg"` "Entrar no RecompraCRM".

Painel de ativação (`components/Onboarding/ActivationPanel.tsx`), exibido em `/dashboard` acima das abas enquanto existir pendência ou carga ativa e por até 14 dias após a conclusão: mesma anatomia da tela de entrada em versão horizontal (`lg:grid-cols-[1fr_320px]`), com botão "Ocultar" que persiste em `respostas`. Ao ocultar, a `OnboardingQualityBubble` volta a ser o acesso.

### 8.7 Momento âmbar: prévia do cashback

Único bloco com cor de marca na jornada CRM. `rounded-2xl border border-brand/40 bg-brand/10 p-4`:

```
COMO O CLIENTE VÊ                                 (eyebrow em text-foreground/70)
Uma compra de R$ 100 gera R$ 5 para usar em até 60 dias.
Até 30% do valor da próxima compra pode ser pago com o saldo.
```

Valores calculados do estado. Sem ícone decorativo, sem gradiente, sem `Sparkles`.

### 8.8 Movimento

- Troca de etapa: `opacity 0→1` e `translateY 4px→0` em 180 ms, `ease-out` (`cubic-bezier(0.22, 1, 0.36, 1)`). Sem animação de saída.
- Pílulas e barra de progresso: `transition-[width,background-color] duration-300`.
- Nada anima no carregamento da página. Nada usa `bounce` ou `spring`.
- `prefers-reduced-motion`: desliga a troca de etapa.

### 8.9 Dark mode

- Tudo via tokens (`bg-background`, `text-foreground`, `bg-muted`, `border-border`, `text-muted-foreground`, `text-success`, `text-destructive`, `bg-brand`). Nenhuma classe `gray-*`, `white`, `black`.
- Logo troca de tom por `dark:`.
- `bg-brand/10` e `bg-success/10` funcionam nos dois temas porque a cor de fundo do tema já dá o contraste.
- Imagens de logos de integrações (`bling-logo.png`) ficam sobre `bg-background` com `rounded-lg border border-border p-2`, para não flutuar no escuro.

### 8.10 Acessibilidade e responsivo

- Trilho e `ChoiceList` navegáveis por teclado; `aria-current="step"` na etapa atual.
- Todo estado tem texto, não só cor (pílula com rótulo).
- Alvos de toque mínimos 44px em mobile (linhas de escolha têm `p-4`).
- Inputs reaproveitam `TextInput` do app; rótulos em caixa alta continuam sendo o padrão do componente, coerente com "UPPERCASE para labels" do `DESIGN.md`.
- `ImportProgress` tem `aria-live="polite"` no contador.

---

## 9. Copy por etapa (CRM)

Todos os textos em sentence case, sem travessão, sem promessa de receita.

| Etapa       | Eyebrow                  | Título                          | Descrição                                                                                                  | Ação secundária      |
| ----------- | ------------------------ | ------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------- |
| empresa     | Etapa 1 de 6 · Empresa   | Sobre a empresa                 | Nome, CNPJ e segmento. Usamos o segmento para sugerir cashback e campanhas.                                | nenhuma              |
| fonte-dados | Etapa 2 de 6 · Vendas    | De onde vêm suas vendas         | Conecte o sistema que você já usa ou registre as vendas no balcão. A importação continua em segundo plano. | Fazer depois         |
| cashback    | Etapa 3 de 6 · Cashback  | Incentivo para a próxima compra | Revise a sugestão para o seu segmento. Você pode ativar agora ou deixar configurado para depois.           | Fazer depois         |
| campanhas   | Etapa 4 de 6 · Campanhas | Campanhas para começar          | Sugestões para o seu segmento e programa. Elas ficam preparadas e só enviam quando você liberar.           | Nenhuma por enquanto |
| whatsapp    | Etapa 5 de 6 · WhatsApp  | Canal de envio                  | Conecte pelo caminho oficial da Meta. Você pode preparar tudo agora e conectar depois.                     | Conectar depois      |
| entrada     | Etapa 6 de 6             | (dinâmico)                      | (dinâmico)                                                                                                 | nenhuma              |

Mensagens de erro (toasts, `getErrorMessage`): "Preencha um CNPJ válido.", "Escolha o segmento da sua empresa.", "Não foi possível conectar o Bling. Tente novamente ou conecte depois." Erros de importação nunca aparecem como toast; ficam no `ImportProgress`.

Texto de adiamento do WhatsApp (mantido do plano): "Você pode preparar suas campanhas agora. Os envios ficam pendentes até concluir a configuração."

Texto de campanhas antes da cobertura: "Para começar, sugerimos estas campanhas para seu segmento e programa de cashback." Nunca "X clientes vão receber".

---

## 10. Estrutura de arquivos proposta

```
app/onboarding/
  page.tsx                          # gate + intenção + getOnboardingReadiness + jornada
  onboarding-page.tsx               # orquestra shell + jornada ativa
  _components/
    shell/OnboardingShell.tsx
    shell/JourneyRail.tsx
    shell/StageHeader.tsx
    shell/StageFooter.tsx
    shared/ChoiceList.tsx
    shared/ReadinessPill.tsx
    shared/ImportProgress.tsx
    shared/DependencyList.tsx
    JourneyPicker.tsx               # "O que você quer melhorar primeiro?"
    crm/CompanyStage.tsx
    crm/DataSourceStage.tsx
    crm/CashbackStage.tsx
    crm/CampaignsStage.tsx
    crm/WhatsappStage.tsx
    crm/EntryStage.tsx
    erp/ChannelStage.tsx
    erp/ProductsStage.tsx
    erp/ExperienceStage.tsx
    erp/IncentiveStage.tsx
    erp/SimulationStage.tsx
    erp/LaunchStage.tsx
components/Onboarding/
  ActivationPanel.tsx
  OnboardingQualityBubble.tsx       # mantido, consome readiness
lib/onboarding/                     # seção 7.1
lib/integrations/import-jobs/       # seção 7.2
app/api/organizations/onboarding/
  route.ts                          # GET novo + POST ajustado
  journeys/route.ts
  progress/route.ts
  readiness/route.ts
  campaigns/route.ts                # ajustado
  campaigns/enable/route.ts
  cashback/route.ts                 # mantido
  whatsapp-payment/route.ts
app/api/integrations/import-jobs/
  route.ts
  [id]/retry/route.ts
  [id]/cancel/route.ts
app/api/queues/integration-import-batch/route.ts
app/api/cron/import-jobs/route.ts
schemas/onboarding.ts
schemas/import-jobs.ts
services/drizzle/schema/organization-onboardings.ts
services/drizzle/schema/integration-import-jobs.ts
drizzle/00xx_organization_onboardings.sql
drizzle/00xx_integration_import_jobs.sql
drizzle/00xx_campaigns_chave_preset.sql
```

`app/onboarding/_lib/stages.ts` e o cookie `onboarding_stage` são removidos após a migração de retomada (seção 11, fase 1). `app/onboarding/success/page.tsx` ("Pagamento confirmado") é ajustado para a casca nova e para os tokens.

---

## 11. Fases de entrega

Cada fase é uma PR revisável e entrega comportamento completo. Nenhuma fase aplica DDL automaticamente.

### Fase 1: fundação e casca (CRM com etapas reordenadas)

- Tabela `organization_onboardings`, schema, enums, migração SQL.
- `lib/onboarding/{journeys,progress,readiness,intent,copy}.ts` com prontidão de fonte de dados, cashback, campanhas (estado `PREPARADA`/`ATIVA` apenas), WhatsApp (`numero`).
- Endpoints `GET onboarding`, `journeys`, `progress`, `readiness`; ajuste do `POST onboarding` (não bloqueia; `produto`).
- Nova casca visual, trilho, `ChoiceList`, `ReadinessPill`, `StageHeader`, `StageFooter`; etapas CRM reordenadas; "Fazer depois" em fonte de dados, cashback, campanhas e WhatsApp; tela de entrada estática (sem importação).
- Seed de campanhas com `ativo: false` e `chavePreset`; QR Code movido para "Outras opções".
- Migração de retomada: se existir cookie `onboarding_stage` e não existir linha, cria a linha com a etapa equivalente. Organizações concluídas não são tocadas.
- Aceite: fluxo completo em light e dark sem classes fora do sistema; adiar e retomar em outro dispositivo preserva etapa; conclusão com pendências redireciona e mostra o painel.

### Fase 2: carga histórica (Bling)

- Tabela `integration_import_jobs`, enums, migração.
- Contrato `TDataConnectorHistory` e implementação Bling.
- `persistCanonicalBatch` extraído; `recomputeClientMetricsForOrganization` extraído.
- Fila `integration-import-batches` (`vercel.json`), consumidor, varredor cron.
- Disparo no callback do Bling quando origem é onboarding; endpoints `import-jobs`.
- `ImportProgress` no trilho, na entrada e no painel; `readiness.dados` com cobertura.
- Aceite: conta de teste com 90 dias importa sem duplicar em dois runs; 429 pausa e retoma; token expirado leva a `AGUARDANDO_RECONEXAO`; nenhuma interação/cashback criada; cobertura só avança com sub-janela fechada.

### Fase 3: dependências de campanha e WhatsApp

- `campaign-dependencies.ts`, `reconcileOnboardingCampaigns`, endpoint `campaigns/enable`.
- `metadados.pagamento`, endpoint `whatsapp-payment`, hooks nos webhooks Meta (status de template e erro `131042`).
- Etapa de campanhas mostra `DependencyList`; etapa WhatsApp mostra os três sub-estados.
- Aceite: campanha habilitada só vira `ativo` quando template aprovado e pagamento confirmado; template rejeitado desliga e aponta ação.

### Fase 4: painel de ativação e qualidade

- `ActivationPanel`, `onboarding-quality` como adaptador, `proximaAcao`.
- "Buscar mais histórico" (expansão até 12 meses).
- Aceite: painel some ao resolver pendências; bolha volta ao ocultar.

### Fase 5: jornada ERP

- Decisão D-1 resolvida; `erp-channels.ts`; etapas ERP; `JourneyPicker`; segundo produto.
- Prévia guiada (D-8) e checklist de lançamento por canal.
- Aceite: catálogo com 5 produtos permite percorrer a prévia sem escrita; lançamento exige checklist do canal.

### Fase 6: instrumentação e rollout

- Eventos PostHog completos; painel interno de métricas de ativação (seção 7 do plano).
- Validação com três organizações representativas (Bling, POI puro, food service).

---

## 12. Decisões em aberto

| Id   | Decisão                                                                                                                                                                                                                                                                  | Recomendação                                                                                                                                                        | Bloqueia                |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| D-1  | Jornada ERP durante o trial: o trial usa capabilities de CRESCIMENTO, sem `erp.acesso`. Liberar ERP no trial, criar trial por produto, ou exigir plano ESCALA para a jornada ERP?                                                                                        | Trial por produto: `subscription = "FREE-TRIAL-ERP"` com capabilities de ESCALA por 15 dias. Decisão comercial dos fundadores (memória `conector-vs-erp-tiers`).    | Fase 5                  |
| D-2  | Disparo automático da carga histórica quando a conexão nasce em Configurações (fora do onboarding).                                                                                                                                                                      | Não disparar; oferecer botão "Importar histórico". Evita custo inesperado em contas antigas.                                                                        | Fase 2                  |
| D-3  | Orçamento por lote e cache de contatos/produtos entre lotes no Bling.                                                                                                                                                                                                    | `maxRequests 120`, `maxMillis 240s`; cache de ids já buscados em `contadores.cache` limitado a 5k entradas, senão tabela auxiliar. Validar contra a conta de teste. | Fase 2                  |
| D-4  | Uma carga ativa por integração via índice único parcial (`WHERE estado IN (...)`) ou checagem em código.                                                                                                                                                                 | Índice parcial (banco garante), com checagem em código para mensagem legível.                                                                                       | Fase 2                  |
| D-5  | Reconciliação de transições de situação **fora** da janela do cron contínuo (pedido de 40 dias atrás que foi cancelado hoje).                                                                                                                                            | Job periódico semanal `REPROCESSAMENTO` sobre a cobertura, reaproveitando o mesmo contrato. Fora do escopo das fases 1 a 4.                                         | Nenhuma fase inicial    |
| D-6  | Decidida: nenhuma coluna em `sales`; os contadores do job cobrem a métrica de ativação.                                                                                                                                                                                  | Fechada em 05/09/2026.                                                                                                                                              | Nenhuma                 |
| D-7  | Recomputar métricas de cliente ao final da carga ou desligar `updateClientMetrics` em modo histórico.                                                                                                                                                                    | Manter o incremental e recomputar ao final (uma passada, idempotente, mesma rotina do cron).                                                                        | Fase 2                  |
| D-8  | Simulação do ERP: prévia guiada sem escrita ou venda de teste real com flag `simulacao`.                                                                                                                                                                                 | Prévia guiada sem escrita na v1. Venda de teste real exige isolamento em estoque, financeiro, fiscal e cashback, que hoje não existe como flag transversal.         | Fase 5                  |
| D-9  | Rótulos de botão em sentence case ("Continuar") em vez de caixa alta ("CONTINUAR"). O app mistura os dois (`HeaderApp` usa "VOLTAR").                                                                                                                                    | Sentence case no onboarding, conforme `DESIGN.md` §3 ("UPPERCASE reservado para labels"). Registrar em `DESIGN.md` se aprovado.                                     | Fase 1                  |
| D-10 | Janela inicial de 90 dias e expansão até 12 meses por segmento e provedor (plano §10).                                                                                                                                                                                   | 90 dias fixo na fase 2; expansão manual pelo usuário na fase 4; automática só após medir requisições por venda válida.                                              | Fase 2                  |
| D-11 | Onde fica a conexão via QR Code (gateway interno) no fluxo.                                                                                                                                                                                                              | Link "Outras opções" na etapa WhatsApp abrindo o `InternalGatewayQRConnect` existente, sem badge "Rápida".                                                          | Fase 1                  |
| D-12 | Instrução do usuário truncada na solicitação original ("Devemos usar...").                                                                                                                                                                                               | Confirmar o que deveria ser usado (biblioteca, componente ou referência).                                                                                           | Revisão deste documento |
| D-13 | Ativação manual na tela de campanhas versus intenção gravada na jornada: a reconciliação trata `ativo = true` como intenção implícita, mas um desligamento manual de uma campanha ainda listada em `campanhasComEnvioHabilitado` volta a ligar na próxima reconciliação. | O toggle da tela de campanhas deve remover a chave da lista quando desligar uma campanha com `chavePreset` (chamar `POST campaigns/enable` com `habilitar: false`). | Fase 3                  |

---

## 13. Rastreabilidade com o plano de produto

| Seção do plano                                       | Onde este documento responde |
| ---------------------------------------------------- | ---------------------------- |
| §2 Princípios (retomada, estados reais, adiar)       | 2.1, 3.1, 4, 8.6             |
| §3.1 Sequência CRM                                   | 3.2                          |
| §3.3 Entrada de dados (escolher, autorizar, receber) | 3.4, 4.1, 8.5                |
| §3.5 Campanhas preparadas com dependências           | 3.5, 6.1, 8.4                |
| §3.6 WhatsApp oficial e dependências externas        | 3.6, 6.3, D-11               |
| §3.7 Conclusão e primeiro valor                      | 8.6, 9                       |
| §4 Importação em segundo plano                       | 2.2, 3.4, 5                  |
| §4.5 Cobertura e confiança                           | 4.1, 4.2, 3.5 (DADOS)        |
| §5 Jornada ERP                                       | 3.3, 6.4, D-1, D-8           |
| §6 Estados e retomada                                | 2.1, 3.1, 4                  |
| §7 Métricas                                          | 7.4 (eventos)                |
| §8 Frentes                                           | 11                           |
| §9 Critérios de aceite                               | 11 (aceite por fase)         |
| §10 Definições necessárias                           | 12                           |

---

## 14. Estado da implementação

### Fase 1 (05/09/2026): fundação, endpoints e casca visual

Entregue nesta fase:

- Tabela `organization_onboardings` (`services/drizzle/schema/organization-onboardings.ts`), enums `onboarding_product` e `onboarding_intent_origin`, coluna `campaigns.chave_preset`. Migrações `drizzle/0099_organization_onboardings.sql` e `drizzle/0100_campaigns_chave_preset.sql` (com backfill das campanhas semeadas pelo fluxo antigo, reconhecidas pelos títulos fixos). **Aplicar manualmente** com `scripts/apply-sql-migration.ts` antes de abrir `/onboarding`: a prontidão consulta a tabela nova.
- `lib/onboarding/`: `journeys.ts` (definições CRM e ERP, retomada, mapa do cookie legado), `readiness.ts` (prontidão derivada, seção 4), `campaign-dependencies.ts` (dependências e estado de campanha, seção 3.5), `reconcile.ts` (liga/desliga `ativo` a partir da prontidão), `progress.ts`, `intent.ts`, `copy.ts`.
- Endpoints: `GET/POST /api/organizations/onboarding` (GET novo; POST recebe `produto` e não bloqueia), `POST .../journeys`, `PUT .../progress`, `GET .../readiness`, `POST .../campaigns` (seed com `ativo: false`, upsert por `chavePreset`, `enableSendingKeys`), `POST .../campaigns/enable`, `PUT .../whatsapp-payment`. Cashback mantido.
- Cliente: `lib/queries/onboarding.ts`, `lib/mutations/onboarding.ts`, `state-hooks/use-internal-onboarding-navigation-state.tsx`, `state-hooks/use-organization-onboarding-state.tsx` (só formulário).
- Casca e etapas em `app/onboarding/_components/{shell,shared,crm}` e `JourneyPicker.tsx`, conforme seção 8. Ordem CRM: empresa, vendas, cashback, campanhas, WhatsApp, entrada. Adiar em vendas, cashback, campanhas e WhatsApp. QR Code em "Outras opções". Tela de entrada com "O que já funciona", dependências e "Próxima ação". Light e dark via tokens.
- Removidos: `OnboardingLayout`, `OnboardingSidebar`, `SelectableCard`, `ConnectionBrandmark`, os seis stages antigos e `app/onboarding/_lib/stages.ts`. O cookie `onboarding_stage` só é lido para migrar uma retomada em curso.

Fora desta fase e ainda pendentes: carga histórica e `ImportProgress` (fase 2), hooks nos webhooks Meta para status de template e erro `131042` e vínculo do telefone nas campanhas semeadas sem número (fase 3), `ActivationPanel` e adaptação do `onboarding-quality` (fase 4), jornada ERP além do seletor (fase 5), instrumentação completa (fase 6).

Verificação: `npx tsc --noEmit` limpo no projeto inteiro e `oxlint` sem avisos nos arquivos tocados. Sem teste em navegador nesta fase: depende da migração aplicada.
