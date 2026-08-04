# Migração das integrações de fonte de dados para a tabela `integrations`

> Status: planejamento para revisão. Nenhuma linha de código escrita ainda.
> Origem: o modelo atual — config de integração inline em `organizations` — permite **uma única
> fonte de dados por organização**. Food services que têm ERP próprio **e** vendem no iFood não
> cabem nele. Este plano migra as integrações de ERP/marketplace para a tabela `integrations`
> (criada em `docs/dev-planning/meta-ads-e-fundacao-integrations.md`), onde cada conexão é uma
> linha com config `jsonb` própria.
>
> **Este plano reverte explicitamente a "Decisão fechada #1" do documento da fundação** ("a
> fundação é aditiva, não substitui o ERP inline"). O comentário em
> `services/drizzle/schema/integrations.ts:15-16` que documenta essa decisão deve ser atualizado
> na entrega.
>
> **Revisão (2026-08): múltiplas conexões do mesmo tipo já nesta entrega.** A versão anterior
> deste plano preservava o invariante "no máximo 1 conexão ativa por `(organizacaoId, tipo)`"
> como guard de transição (antigo D5) e deixava a liberação de N conexões do mesmo tipo como
> decisão comercial futura. Essa decisão foi tomada: a plataforma **suporta N conexões ativas do
> mesmo tipo por organização desde o cutover** (ex.: duas contas iFood, dois Bling). O D5 foi
> reescrito como guard de **identidade** (não de cardinalidade) e as superfícies de UI/lookup
> foram ajustadas (ver D5, §3.1, §5 itens 9/11/13).

---

## 1. Estado atual (as-is)

### 1.1 O modelo antigo — colunas em `organizations`

`services/drizzle/schema/organizations.ts:49-56`:

| Coluna | Tipo | Papel real hoje |
|---|---|---|
| `integracaoTipo` | `organizationIntegrationTypeEnum` (`ONLINE-SOFTWARE`, `CARDAPIO-WEB`, `NUVEM-SHOP`, `IFOOD`, `BLING`) | Discriminante da única integração. **Slot único**: conectar Bling sobrescreve um iFood existente. |
| `integracaoConfiguracao` | `jsonb $type<TOrganizationIntegrationConfig>` (`schemas/organizations.ts:6-54`) | Credenciais + config (tokens OAuth, merchantIds, storeId…). Viaja **crua e sem máscara na sessão** até o browser. |
| `integracaoDataUltimaSincronizacao` | `timestamp` | **Morta**: só é escrita como `null` nos callbacks de conexão; nenhum código grava data real. O "última sincronização" do Settings é permanentemente vazio. |
| `dadosViaIntegracoes` | `boolean` | **Write-only**: escrita `true` pelos 4 callbacks OAuth, nunca lida. |
| `dadosViaERP` | `boolean` | **Morta**: nunca escrita `true`, nunca lida fora de defaults de state hooks. |
| `dadosViaPDI` | `boolean` | Escrita no onboarding (`app/onboarding/onboarding-page.tsx:189`), lida só como default de formulário. |
| `origemDadosPadrao` | `RECEPTOR \| ERP` | Modo de **processamento** (receptor burro vs ERP completo — `docs/ERP-IMPLEMENTATION.md`). Conceito ortogonal à conexão. |

Invariantes implícitos do modelo antigo:

1. **Um slot por org** — last-write-wins nos callbacks OAuth.
2. **Coerência dupla** — `integracaoConfiguracao.tipo` deve igualar `integracaoTipo`; o gate é
   repetido em 5 lugares (`lib/data-collecting-v2/index.ts:261`, `lib/integrations/ifood/context.ts:43`,
   `lib/data-connectors/catalog-sync.ts:26,39`, `app/api/webhooks/ifood/route.ts:59`,
   `scripts/sync-data-collecting.ts:209`) e, quando viola, **pula a org silenciosamente**.
3. **`!integracaoTipo` = "o POI é dono das vendas"** — o gate semântico mais pesado do sistema
   (ver §3.2).

### 1.2 A tabela nova — `integrations`

`services/drizzle/schema/integrations.ts`. Já entrega tudo que o modelo antigo não tem:

- Múltiplas linhas por org, com `apelido` e `refExterno` para desambiguar conexões do mesmo tipo.
- `status` (`CONECTADO | EXPIRADO | ERRO`) + `ultimoErro` + `dataUltimaSincronizacao` **realmente
  mantidos** (`lib/integrations/meta/ads/config.ts:48-51`).
- Unique `(organizacaoId, tipo, refExterno)` contra conexão duplicada.
- Mascaramento de segredos (`lib/integrations/mask.ts`) e permissões (`canViewIntegrations` /
  `canManageIntegrations`).
- CRUD genérico (`app/api/integrations/route.ts` — GET/PATCH/DELETE), hooks
  (`lib/queries/integrations.ts`), e uma UI multi-conexão comprovada
  (`app/dashboard/channels/paid-media/marketing-page.tsx`).

O que falta para ela absorver fontes de dados:

1. Os 5 valores de ERP/marketplace no `integrationTypeEnum` (hoje só `META_ADS | META_CAPI | TRACKING`).
2. As 5 variantes correspondentes na união `TIntegrationConfig` (`schemas/integrations.ts`).
3. Um caminho de **criação** para tipos de credencial manual (hoje só o callback do Meta insere).
4. Um sucessor para os três papéis que `integracaoTipo` acumula (ver §3).

---

## 2. Mapa completo de consumidores dos campos antigos

Levantamento exaustivo (52 arquivos). Organizado por superfície; cada item precisa de um destino
no plano.

### 2.1 Pipeline de coleta (cron `data-collecting`)

| Arquivo | Uso |
|---|---|
| `app/api/cron/data-collecting/route.ts:9` | Só delega para `runDataCollectingV2()` — zero campos. |
| `lib/data-collecting-v2/index.ts:95-105` | `loadOrganizations()` carrega **todas** as orgs (sem WHERE) com `{id, integracaoTipo, integracaoConfiguracao, configuracao}`. |
| `lib/data-collecting-v2/index.ts:260-261` | Gate de seleção **em JS**: pula org sem tipo/config ou com tipo≠config.tipo (silencioso). |
| `lib/data-collecting-v2/index.ts:264-271` | Passa só o `config` jsonb para `processOrganization` — 1 config → 1 batch → 1 summary por org. |
| `lib/data-collecting-v2/index.ts:286,291,321` | `integracaoTipo` em logs/erros. |
| `lib/data-collecting-v2/index.ts:44-50` | Janela é sempre o dia corrente; **`integracaoDataUltimaSincronizacao` não é cursor** — idempotência vem de `sale-signature.ts`. |
| `lib/data-collecting-v2/types.ts:101,107,114` | `integrationType`/`source` escalares por org. |
| `lib/data-collecting-v2/validation.ts:19-68` | Snapshot de validação chaveado por `{organizationId, source}`. |
| `lib/data-connectors/types.ts:6` | `TDataConnectorKind = NonNullable<TOrganizationEntity["integracaoTipo"]>` — o tipo do conector é **derivado da coluna deprecada**. |
| `lib/data-connectors/types.ts:182-191` | Conectores recebem `{organizationId, config: TOrganizationIntegrationConfig, window}` — nunca a linha da org. |
| `lib/data-connectors/index.ts:13-55` | Dispatch por `config.tipo` (o discriminante do jsonb, não a coluna). |
| `lib/data-connectors/catalog-sync.ts:12-53` | Relê a org e ramifica CARDAPIO-WEB vs NUVEM-SHOP. |
| `app/api/cron/products-syncing/route.ts:25-49` | Único WHERE SQL real: `inArray(integracaoTipo, ["CARDAPIO-WEB","NUVEM-SHOP"])`. Obs.: **não está registrado no `vercel.json`** (trigger manual/externo hoje). |

**Escritas de refresh de token** — todas clobbering do jsonb inteiro da org, fora da transação
por-org do cron (hazard de lost-update com múltiplas integrações):

- `lib/data-connectors/bling/client.ts:141-146` (`getValidBlingConfig`)
- `lib/data-connectors/ifood/client.ts:136-141` (`getValidIfoodConfig`)
- `lib/data-connectors/ifood/sandbox.ts:143-148` (refresh sandbox, gated pelo placeholder `__IFOOD_SANDBOX_PLACEHOLDER__`)
- `lib/integrations/ifood/context.ts:61-64` (backfill de `merchantIds` descobertos)

### 2.2 POI `new-transaction` — o gate semântico

`app/api/point-of-interaction/new-transaction/route.ts`. Um único campo antigo lido:
`integracaoTipo` (linhas 245, 273, 284, 923). A linha carregadora de significado:

```ts
// :273
const transactionRequiresSaleProcessing = !program.organizacao.integracaoTipo;
```

Quando a org **não tem** integração, a transação POI cria a venda interna (`:688-801`,
`processamentoOrigem: "INTERNO"`), roda atribuição de conversão, atualiza metadados de compra do
cliente, back-linka `vendaId` em transações de cashback/cupom, e habilita os gatilhos
`QUANTIDADE-TOTAL-COMPRAS`/`VALOR-TOTAL-COMPRAS`. Quando **tem**, nada disso acontece — a venda
"virá pela integração". Não existe código de reconciliação POI↔venda importada; a divisão é por
convenção (`acumuloPermitirViaPontoIntegracao` vs `acumuloPermitirViaIntegracao` no programa de
cashback, mutuamente exclusivos só por default de UI — `NewCashbackProgram.tsx:38-39`).

### 2.3 Webhooks

| Arquivo | Uso |
|---|---|
| `app/api/webhooks/ifood/route.ts:50-71` | Resolve merchant→org com `findMany where integracaoTipo='IFOOD'` + scan linear de `config.merchantIds`. Keep-alive (`:73-82`) monta o set de merchants online — **a homologação iFood depende disso**. Em evento de pedido, dispara `runDataCollectingV2({organizationIds})`. |
| `lib/integrations/nuvemshop/webhook-notifications.ts:39-59` | Webhooks LGPD: acha org por `integracaoTipo='NUVEM-SHOP'` + match de `config.storeId`. |

### 2.4 Conexão / desconexão (escritores do slot único)

Todos escrevem o mesmo bloco de 4 campos `{integracaoTipo, integracaoConfiguracao,
integracaoDataUltimaSincronizacao: null, dadosViaIntegracoes: true}`, sobrescrevendo qualquer
conexão anterior:

- `app/api/integrations/nuvemshop/auth/callback/route.ts:73-92`
- `app/api/integrations/bling/auth/callback/route.ts:37-45`
- `app/api/integrations/ifood/auth/complete/route.ts:38-57`
- `app/api/integrations/ifood/sandbox/route.ts:16-24`
- `components/Modals/Integrations/ConfigureIntegration.tsx:80-85` — credencial manual
  (ONLINE-SOFTWARE / CARDAPIO-WEB) via `updateOrganization` genérico. Obs.:
  `UpdateOrganizationSchema` (`schemas/organizations.ts:302-328`) aceita esses campos de qualquer
  cliente autenticado — remover na limpeza.
- `components/Settings/SettingsIntegration.tsx:127-141` — desconectar = os 3 campos para `null` +
  `window.location.reload()`.

### 2.5 Sessão e UI

`lib/authentication/types.ts:40-42` + `lib/authentication/session.ts:104-106,147-149`: a sessão
embute `integracaoTipo`, `integracaoConfiguracao` (**tokens crus, sem máscara, entregues a todo
client component**) e `integracaoDataUltimaSincronizacao`. Consumidores:

| Consumidor | Lê | Para quê |
|---|---|---|
| `components/Settings/SettingsIntegration.tsx:111-193,254-258` | os 3 | Card "integração ativa" (slot único), grid de provedores, modal de config. |
| `app/dashboard/integrations/integrations-page.tsx:25,37` | `integracaoTipo` | `isConnected` por card — só um card pode aparecer conectado. |
| `app/dashboard/integrations/ifood/ifood-page.tsx:28` + `IfoodConnectionGate.tsx` | `integracaoTipo` | Gate do módulo iFood. |
| `components/Modals/CashbackPrograms/NewCashbackProgram.tsx:38-39,84` e `ControlCashbackProgram.tsx:106` | `integracaoTipo` | Defaults `acumuloPermitirViaIntegracao: !!tipo` / `acumuloPermitirViaPontoIntegracao: !tipo` + prop `userOrgHasIntegration`. |
| `components/Modals/Organizations/Blocks/Summary.tsx:75` | `integracaoTipo` | Campo "Integração ativa" no admin. |
| `app/onboarding/*` (`page.tsx:50-51`, `onboarding-page.tsx:47-48,189`, `DataSourceStage.tsx:35,62-66`, `ConclusionStage.tsx:15`) | `integracaoTipo`, `dadosViaPDI` | Retomada pós-OAuth, badge "Integração X conectada", resumo de fonte de dados (single-valued). |
| `app/api/organizations/onboarding-quality/route.ts:105` | ambos | Passo "Configurar integração" do checklist. |
| `app/api/integrations/settings/route.ts:35,41` | `integracaoTipo` | Eco no payload (a escrita real desse route é `configuracao.preferencias.integracaoERP`, que **não** migra). |
| `state-hooks/use-organization-state.tsx` e `use-organization-onboarding-state.tsx` | todos | Defaults de formulário (não ramificam). |
| `lib/integrations/ifood/context.ts:37-70` | ambos | Resolver de contexto iFood (gate 404 → UI de conexão; refresh; backfill de merchantIds). |

### 2.6 Scripts (leem credenciais direto da org)

`scripts/sync-data-collecting.ts:196-216`, `scripts/test-bling-fetch.ts:89-98,250-255` (também
**escreve** refresh), `scripts/test-ifood-import.ts:86-99`, `scripts/ifood-homologation-polling.ts:45-58`,
`utils/scripts/{sync-org-sales-history, sync-online-sale-dates, sync-cardapio-web-manual-collecting,
sync-cardapio-web-clients, compare-db-to-cardapio, sync-organization-manual-collecting,
sync-nuvemshop-manual-collecting, test-nuvemshop-fetch}.ts` — todos resolvem
`integracaoConfiguracao` (± assert de `integracaoTipo`). `test-nuvemshop-fetch.ts:101-104` loga a
config crua (vazamento de segredo em log — corrigir de carona).

---

## 3. Modelo alvo (to-be)

### 3.1 Schema

**`integrationTypeEnum`** ganha os 5 valores de fonte de dados, **mantendo a grafia hifenizada
legada**:

```ts
export const integrationTypeEnum = pgEnum("integration_type", [
	"META_ADS", "META_CAPI", "TRACKING",
	// Fontes de dados (migradas de organizationIntegrationTypeEnum):
	"ONLINE-SOFTWARE", "CARDAPIO-WEB", "NUVEM-SHOP", "IFOOD", "BLING",
]);
```

> Trade-off assumido: mistura duas grafias no mesmo enum. Em troca, o backfill copia o jsonb
> **byte a byte** (o discriminante `tipo` já bate), e zero código de conector/dispatch/schema é
> reescrito (`lib/data-connectors/index.ts` ramifica por `config.tipo === "CARDAPIO-WEB"` etc.).
> Renomear para underscore exigiria reescrever discriminantes em ~20 arquivos + UPDATE de dados —
> custo alto, ganho estético. Enum values viajam como dado; grafia legada é dado legado.

**`TIntegrationConfig`** (`schemas/integrations.ts`): mover as 5 variantes de
`OrganizationIntegrationConfigSchema` (`schemas/organizations.ts:6-54`) para a união, sem mudar
shape. `TOrganizationIntegrationConfig` passa a ser um alias deprecado até a fase de limpeza.

**Novo módulo `lib/integrations/data-sources.ts`** — o sucessor dos três papéis de
`integracaoTipo`:

```ts
export const DATA_SOURCE_INTEGRATION_TYPES = [
	"ONLINE-SOFTWARE", "CARDAPIO-WEB", "NUVEM-SHOP", "IFOOD", "BLING",
] as const;
export type TDataSourceIntegrationType = (typeof DATA_SOURCE_INTEGRATION_TYPES)[number];

// (a) "existe fonte de dados ativa?" — sucessor do gate do POI e dos defaults de cashback
export async function organizationHasActiveDataSource({ executor, organizationId }): Promise<boolean>;

// (c) "quais configs carrego para a org X?" — sucessor do loadOrganizations do cron
export async function getActiveDataSourceIntegrations({ executor, organizationId? }): Promise<TIntegrationEntity[]>;
```

O papel (b) — "de qual org é este merchant/store?" — vira consulta por `tipo` + `refExterno`
(Nuvemshop) ou por `tipo` + scan dos `merchantIds` das linhas IFOOD (iFood; ver decisão D3).

**`refExterno` por tipo** (preenchido no connect/backfill):

| Tipo | `refExterno` |
|---|---|
| `NUVEM-SHOP` | `String(storeId)` — habilita lookup indexado no webhook LGPD |
| `CARDAPIO-WEB` | `merchantId` |
| `IFOOD` | `null` (merchants ficam em `configuracao.merchantIds`; ver D3) |
| `BLING` | `null` (a config não carrega id de conta) |
| `ONLINE-SOFTWARE` | `null` |

`refExterno` não identifica a conta em todos os provedores. Por isso, "reconectar" deve ser uma
operação explícita sobre uma `integrationId` conhecida (carregada no state do OAuth quando
aplicável), e não um lookup implícito apenas por `(organizacaoId, tipo)` — com N conexões do
mesmo tipo esse lookup é ambíguo por definição. Onde o provedor expuser um identificador estável
da conta, ele também deve ser persistido para validar a reconexão. Sem essa confirmação, o fluxo
é tratado como nova conexão e não reaproveita silenciosamente uma linha histórica.

**Multiplicidade**: N conexões ativas do mesmo tipo por organização são suportadas desde o
cutover. A deduplicação é por **identidade da conta externa**, não por tipo (D5):

- Tipos com `refExterno` (`NUVEM-SHOP`, `CARDAPIO-WEB`): o unique `(organizacaoId, tipo,
  refExterno)` já impede a mesma conta duas vezes; contas diferentes coexistem.
- `IFOOD`: guard de aplicação impede **sobreposição de `merchantIds`** entre linhas IFOOD ativas
  da mesma organização (e o merchant→org do webhook já assume merchant globalmente único). Duas
  contas iFood = dois token sets disjuntos.
- `BLING` / `ONLINE-SOFTWARE`: sem identificador estável na config — sem dedup automático; a
  desambiguação para o operador é o `apelido` (a UI pede um ao criar a segunda conexão do mesmo
  tipo).

**Ciclo de vida de `integrations`**: conexões de fonte de dados passam a usar soft delete. A
desconexão grava `ativo: false` + `dataDesativacao` e preserva a linha como identidade histórica
da conta externa. O fluxo normal não exclui fisicamente uma integração que originou vendas. Uma
reconexão da mesma conta externa reativa a mesma linha; conectar outra conta do mesmo provedor
cria outra linha e mantém a anterior desativada (D9).

**`sales.integracaoId`** (nova coluna, `varchar` FK → `integrations.id`, `onDelete: "restrict"`,
nullable): gravada por `lib/data-collecting-v2/sync-sales.ts` em toda venda importada.
Observabilidade ("de qual conexão veio esta venda") e proteção contra colisão multi-fonte (D4).
As vendas históricas das organizações que hoje possuem uma integração são atribuídas à única
integração migrada da organização na Fase 1. Vendas internas/sem atribuição determinística podem
continuar `null`; nenhuma atribuição existente é sobrescrita.

**`organizations.poiConfiguracao`** (nova coluna, `jsonb $type<TOrganizationPoiConfig>`): config
própria do Ponto de Interação (§3.4, D8). Nesta entrega carrega só o flag explícito de registro
de vendas; é o destino da consolidação futura das demais capacidades do POI.

### 3.2 Sucessores semânticos

| Hoje | Passa a ser |
|---|---|
| `transactionRequiresSaleProcessing = !org.integracaoTipo` (POI `:273`) | `organizations.poiConfiguracao.vendas.registroAtivo` — **config explícita, não derivação** (§3.4, D8). O backfill grava o snapshot do comportamento atual (`true` ⇔ org sem integração). `organizationHasActiveDataSource` continua existindo para defaults de cashback e sinalização de UI, mas o POI não deriva mais nada dele. |
| Seleção de orgs do cron (JS gate `:260-261`) | `getActiveDataSourceIntegrations()` → **loop por integração**, não por org. Org com 2 fontes roda 2 batches. O gate de coerência tipo↔config.tipo morre (uma linha só tem um `tipo`). |
| WHERE do products-syncing | `inArray(integrations.tipo, ["CARDAPIO-WEB","NUVEM-SHOP"]) AND ativo` — pode rodar por linha. |
| merchant→org do webhook iFood | `findMany(integrations, where tipo='IFOOD' AND ativo)` + scan de `configuracao.merchantIds` (menos linhas que o scan de orgs atual). |
| storeId→org do webhook Nuvemshop | Lookup direto por `(tipo='NUVEM-SHOP', refExterno=String(storeId))` — indexado. |
| Refresh de token (clobber do jsonb da org) | `db.update(integrations).set({ configuracao }).where(eq(integrations.id, integrationId))` — row-scoped; o hazard de lost-update entre integrações desaparece. Falha de refresh grava `status: "EXPIRADO"` + `ultimoErro`. |
| `integracaoDataUltimaSincronizacao` (morta) | O cron passa a gravar `integrations.dataUltimaSincronizacao` + `status`/`ultimoErro` **por linha ao fim de cada run** — o "última sincronização" do Settings finalmente funciona. |
| Sessão com config crua | A sessão **perde** os 3 campos e ganha um resumo leve e sem segredos: `integracoes: Array<{ id, tipo, ativo, status }>`. Config completa (mascarada) só via `GET /api/integrations`. |
| `TDataConnectorKind` derivado da coluna | Re-ancorado em `TDataSourceIntegrationType`. |
| `TCanonicalImportBatch`/summaries com `source` escalar por org | Ganham `integrationId`; `validation.ts` chaveia snapshot por `integrationId`. |

### 3.3 Criação para tipos de credencial manual

Hoje só o callback do Meta insere em `integrations`. Adicionar **POST `/api/integrations`** (4
partes, `canManageIntegrations`): valida `configuracao` pela união discriminada, deriva
`refExterno`, aplica o guard de identidade (D5 — mesma conta externa não duplica; N contas
distintas do mesmo tipo são permitidas), `status: "CONECTADO"`. É o destino do modal
`ConfigureIntegration` (ONLINE-SOFTWARE / CARDAPIO-WEB) e do sandbox iFood.

### 3.4 O POI deixa de ser fallback implícito e vira canal configurável

O Ponto de Interação nasceu como interface do cliente final com o clube de benefícios
(tablet/QR), mas acumula papéis:

1. interação com o clube — perfil, saldo, acompanhamento (universal);
2. resgate de cashback (quase universal — exceto orgs em modo ERP, onde o resgate é embutido no
   PDV/Shop);
3. **entrada de vendas/cadastro** — só quando a org não tem integração;
4. acúmulo na transação.

O papel 3 é hoje **derivado** (`!integracaoTipo`), e as demais capacidades são governadas por
configs espalhadas em entidades diferentes (`poiConfirmacaoValorObrigatoria` na org,
`acumuloPermitirViaPontoIntegracao` / `acumuloPermitirViaIntegracao` no programa de cashback).
Duas consequências:

- o "emaranhado": cada ajuste de comportamento do POI mexe numa entidade diferente, e o fluxo de
  `new-transaction` vira uma teia de flags cruzados;
- casos legítimos são **inexprimíveis**: uma loja de roupas com ERP digital integrado, mas sem
  integração para vendas de balcão, deveria poder usar o POI como ponto de coleta local. Hoje é
  impossível — qualquer integração ativa desliga o registro de vendas do POI por derivação.

Modelo alvo: **`organizations.poiConfiguracao`**, seguindo o precedente da casa de uma coluna
jsonb por preocupação (`fiscalConfiguracao`, `pagamentoConfiguracao`):

```ts
// schemas/organizations.ts
export const OrganizationPoiConfigSchema = z.object({
	// Sucessor EXPLÍCITO de `transactionRequiresSaleProcessing = !integracaoTipo`.
	vendas: z.object({
		registroAtivo: z.boolean({ invalid_type_error: "Tipo não válido para o registro de vendas do POI." }),
	}),
	// Consolidação futura (fora desta entrega, ver §8): resgate, confirmação de valor
	// (migra de poiConfirmacaoValorObrigatoria), QR codes, perfil.
});
export type TOrganizationPoiConfig = z.infer<typeof OrganizationPoiConfigSchema>;
```

Por que **não** uma linha `tipo: "POI"` em `integrations`: o POI não é conexão com plataforma
externa — não tem OAuth, token, `status`/`refExterno` nem sincronização. Forçá-lo na tabela
compraria a simetria "POI é mais uma fonte" ao custo de esvaziar a semântica das colunas. A
simetria que importa — "quais canais alimentam vendas nesta org?" — é obtida no ponto de
leitura: **fontes de venda = integrações de dados ativas ∪ (POI se `vendas.registroAtivo`)**.

Nesta entrega entra só `vendas.registroAtivo`, com backfill = snapshot do comportamento atual
(`integracao_tipo IS NULL`). Isso é *menos* arriscado do que trocar um booleano derivado por
outro derivado: o gate vira dado explícito, decidido uma vez na migração, e
desativar/reativar/trocar uma integração **deixa de flipar silenciosamente o comportamento do
POI**. O caso da loja de roupas passa a ser um toggle. A consolidação das demais capacidades é
follow-up staged (§8) — a coluna já nasce no lugar certo para recebê-las.

---

## 4. Decisões

### Fechadas (propostas deste plano)

- **D1 — Grafia do enum**: manter valores hifenizados legados no `integrationTypeEnum` (§3.1).
- **D2 — Sem dual-write**: cutover em release única com backfill imediatamente antes do deploy
  (§5). Dual-write divergiria no primeiro refresh de token; colunas antigas ficam **congeladas**
  como rollback até a fase de limpeza.
- **D3 — iFood: uma linha por conexão, não por merchant**: `merchantIds[]` continua dentro da
  config (é um token set para N merchants). Uma linha por merchant duplicaria tokens e o refresh.
  Follow-up possível: índice GIN em `configuracao->'merchantIds'` se o scan pesar.
- **D4 — Identidade de venda continua `(organizacaoId, idExterno)`, com colisão fail-closed**: a
  Fase 1 preenche `sales.integracaoId` nas vendas históricas das organizações que hoje possuem
  uma integração — no cenário atual de produção, todas essas vendas pertencem à única integração
  da organização. Depois do cutover, encontrar uma venda pelo mesmo `idExterno` só permite update
  quando a `integracaoId` também é a mesma. Se a integração divergir (ou a venda importada
  encontrada continuar sem atribuição), o item não altera a venda existente e não executa
  cashback/campanhas/efeitos; a colisão entra no erro/summary observável do batch. Unique
  `(organizacaoId, integracaoId, idExterno)` fica para quando o multi-fonte estiver rodando e o
  risco real medido.
- **D5 — Multiconexão por tipo desde o cutover, com guard de identidade**: N linhas ativas por
  `(organizacaoId, tipo)` são permitidas. O guard de aplicação no POST/callbacks impede apenas
  **duplicar a mesma conta externa**: `refExterno` repetido (já coberto pelo unique) e, para
  IFOOD, interseção de `merchantIds` com outra linha IFOOD ativa da organização. Tipos sem
  identidade estável (BLING, ONLINE-SOFTWARE) não têm dedup automático — a UI exige `apelido` ao
  criar a segunda conexão ativa do mesmo tipo, para desambiguação humana. Todo lookup interno
  que antes assumia "a conexão do tipo X da org" passa a operar **por linha** (`integrationId`)
  ou sobre a **lista** de linhas ativas.
- **D6 — Destino dos flags**: `dadosViaERP` e `dadosViaIntegracoes` **morrem** (write-only/mortos).
  `dadosViaPDI` **fica** (onboarding ainda escreve/lê). `origemDadosPadrao` **fica** — é modo de
  processamento (RECEPTOR/ERP), não conexão; fora do escopo.
- **D7 — DDL manual**: toda migração SQL é aplicada pelo usuário via
  `scripts/apply-sql-migration.ts` (diretiva vigente — não rodar `drizzle push`/DDL direto no
  banco). `ALTER TYPE ... ADD VALUE` não roda dentro de transação — script separado do backfill.
- **D8 — Gate do POI vira config explícita**: `poiConfiguracao.vendas.registroAtivo` substitui a
  derivação `!integracaoTipo` (§3.4). Backfill preserva o comportamento atual. Consequência a
  comunicar: **desconectar a última integração não reabilita o registro de vendas do POI
  automaticamente** — o fluxo de desconexão na UI deve avisar/oferecer o toggle (ver R12).
- **D9 — Integrações de fonte de dados usam soft delete e identidade estável**: desconectar grava
  `ativo: false` + `dataDesativacao`; não usa `DELETE` e não apaga a proveniência das vendas. A FK
  de `sales.integracaoId` usa `RESTRICT`. Reativar a mesma conta externa preserva a linha e o
  `integrationId`; uma conta externa diferente recebe outra linha. A reconexão aponta
  explicitamente para a linha anterior e valida a identidade externa quando o provedor a expõe —
  nunca escolhe uma linha histórica só pelo tipo. Credenciais são revogadas no provedor quando
  houver suporte e não são motivo para apagar a identidade histórica.
- **D10 — Sobreposição da mesma venda entre fontes é exceção observável, não identidade nesta
  entrega**: o paradigma padrão assume vendas distintas entre integrações. Um follow-up poderá
  procurar **possíveis** duplicadas somente entre integrações diferentes, usando organização,
  cliente, valor e proximidade temporal, e exibi-las como alerta na área de vendas para correção
  manual. Essa assinatura nunca será unique nem causará merge automático. A modelagem de
  persistência da decisão/correção e o serviço que compensa efeitos ficam fora desta migração.

### Abertas (não bloqueiam a migração)

- Acúmulo de cashback **por integração** (hoje `acumuloPermitirViaIntegracao` é binário no
  programa: com ERP + iFood, vendas das duas fontes acumulam). Se um food service quiser cashback
  só no balcão e não no iFood, precisa de config por conexão — follow-up.
- Detecção e correção manual de possíveis vendas duplicadas entre fontes (D10), incluindo a
  persistência da decisão do operador e a compensação idempotente de cashback/demais efeitos.
- Cursor incremental por integração (`dataUltimaSincronizacao` como watermark real em vez de
  janela dia-corrente). Hoje não existe; a tabela nova torna trivial no futuro.

---

## 5. Plano de execução por fases

### Fase 0 — Fundação de schema e serviços (sem mudança de comportamento)

1. `services/drizzle/schema/enums.ts`: +5 valores em `integrationTypeEnum` (D1).
2. `schemas/integrations.ts`: mover as 5 variantes de config para `IntegrationConfigSchema`;
   atualizar `schemas/enums.ts` (`IntegrationTipoEnum`).
3. `services/drizzle/schema/integrations.ts` + `schemas/integrations.ts`: coluna nullable
   `dataDesativacao` (D9).
4. `services/drizzle/schema/sales.ts`: coluna `integracaoId`, FK com `onDelete: "restrict"` (D4/D9).
5. `services/drizzle/schema/organizations.ts` + `schemas/organizations.ts`: coluna
   `poiConfiguracao` + `OrganizationPoiConfigSchema` (§3.4).
6. `lib/integrations/data-sources.ts`: constante + helpers (§3.1).
7. `POST /api/integrations` (§3.3) + `maskConfig` cobrindo os novos tipos (garantir que
   `accessToken`/`refreshToken`/`apiKey`/`token` das novas variantes são mascarados).
8. SQL (manual, D7): `ALTER TYPE integration_type ADD VALUE ...` ×5; `ALTER TABLE
   ampmais_integrations ADD COLUMN data_desativacao ...`; `ALTER TABLE ampmais_sales ADD COLUMN
   integracao_id ...` com FK `RESTRICT`; `ALTER TABLE ampmais_organizations ADD COLUMN
   poi_configuracao jsonb`.

*Aceite*: deploy sem nenhuma mudança visível; typecheck dos arquivos tocados limpo (baseline de
~300 erros pré-existentes — verificar filtrando `tsc` pelos arquivos alterados).

### Fase 1 — Backfill (SQL manual, idempotente)

```sql
INSERT INTO ampmais_integrations
	(id, organizacao_id, tipo, ativo, apelido, ref_externo, configuracao, status, data_insercao)
SELECT
	gen_random_uuid(),
	o.id,
	o.integracao_tipo::text::integration_type,
	true,
	NULL,
	CASE o.integracao_tipo::text
		WHEN 'NUVEM-SHOP'   THEN (o.integracao_configuracao->>'storeId')
		WHEN 'CARDAPIO-WEB' THEN (o.integracao_configuracao->>'merchantId')
		ELSE NULL
	END,
	o.integracao_configuracao,
	'CONECTADO',
	now()
FROM ampmais_organizations o
WHERE o.integracao_tipo IS NOT NULL
	AND o.integracao_configuracao IS NOT NULL
	AND (o.integracao_configuracao->>'tipo') = o.integracao_tipo::text
	AND NOT EXISTS (
		SELECT 1 FROM ampmais_integrations i
		WHERE i.organizacao_id = o.id AND i.tipo::text = o.integracao_tipo::text
	);
```

Backfill da proveniência das vendas (D4). A premissa de produção é que, antes da liberação
multi-fonte, todas as vendas de uma organização que possui integração pertencem à única
integração atual. O CTE só seleciona organizações com exatamente uma fonte de dados ativa e o
`UPDATE` nunca sobrescreve uma atribuição existente:

```sql
WITH fonte_unica AS (
	SELECT
		i.organizacao_id,
		MIN(i.id) AS integracao_id
	FROM ampmais_integrations i
	WHERE i.ativo = true
		AND i.tipo::text IN (
			'ONLINE-SOFTWARE', 'CARDAPIO-WEB', 'NUVEM-SHOP', 'IFOOD', 'BLING'
		)
	GROUP BY i.organizacao_id
	HAVING COUNT(*) = 1
)
UPDATE ampmais_sales s
SET integracao_id = f.integracao_id
FROM fonte_unica f
WHERE s.organizacao_id = f.organizacao_id
	AND s.integracao_id IS NULL;
```

- Antes do `UPDATE`, executar a mesma seleção como auditoria e registrar: organizações elegíveis,
  quantidade de vendas por organização e organizações com zero ou mais de uma fonte candidata.
- Depois do `UPDATE`, comparar contagem elegível × atualizada × ainda nula. Qualquer divergência
  precisa ser explicada antes da Fase 2; não há atribuição automática em caso ambíguo.

Backfill do gate do POI (D8 — snapshot do comportamento atual):

```sql
UPDATE ampmais_organizations
SET poi_configuracao = jsonb_build_object(
	'vendas', jsonb_build_object('registroAtivo', integracao_tipo IS NULL)
)
WHERE poi_configuracao IS NULL;
```

- A condição `config->>'tipo' = integracao_tipo` replica o gate de coerência: orgs incoerentes
  **já são invisíveis para o cron hoje** — não backfillar, mas **listar num SELECT de auditoria**
  antes (`WHERE integracao_tipo IS NOT NULL AND (config nulo OU tipo divergente)`) e tratar caso
  a caso. Obs.: para o backfill do POI essas orgs recebem `registroAtivo: false` (o
  `integracao_tipo` preenchido bloqueia o POI hoje, mesmo com config quebrada) — coerente com o
  comportamento vigente.
- Rodável a qualquer momento e re-rodável (guards `NOT EXISTS` / `IS NULL`). Executar
  imediatamente antes do deploy da Fase 2 para minimizar a janela de tokens divergentes (um
  refresh de token entre backfill e deploy deixa o token novo só na org — ver risco R6).

### Fase 2 — Cutover de leitores e escritores (uma release)

Ordem interna sugerida (tudo na mesma release; itens agrupados por superfície):

**Pipeline**
1. `lib/data-collecting-v2/index.ts`: `loadOrganizations` → `getActiveDataSourceIntegrations`
   (join com org para `configuracao` da org); loop por integração; remover gate `:260-261`;
   passar `integrationId` adiante; ao fim de cada run, gravar `dataUltimaSincronizacao` +
   `status`/`ultimoErro` na linha.
2. `lib/data-collecting-v2/types.ts` + `validation.ts` + `sync-sales.ts`: `integrationId` no
   batch/summary/snapshot; gravar `sales.integracaoId`; colisão fail-closed (mesmo `idExterno` e
   outra/nenhuma `integracaoId` não altera a venda nem executa efeitos) registrada no summary
   observável do batch (D4).
3. `lib/data-connectors/types.ts`: `TDataConnectorKind` re-ancorado; `TDataConnectorFetchInput`
   ganha `integrationId`; config tipada pela união nova.
4. Refresh de token row-scoped: `bling/client.ts`, `ifood/client.ts`, `ifood/sandbox.ts`,
   `lib/integrations/ifood/context.ts` (assinaturas passam a receber `integrationId`).
5. `app/api/cron/products-syncing/route.ts` + `lib/data-connectors/catalog-sync.ts`: seleção e
   resolução via tabela nova.

**Gates e webhooks**
6. POI `new-transaction/route.ts:245,273,284,923`: `transactionRequiresSaleProcessing` passa a
   ler `poiConfiguracao.vendas.registroAtivo` (D8) — a coluna entra no `columns` da relação
   `organizacao` já carregada em `:239-250`; zero queries extras. Fallback para orgs com
   `poiConfiguracao` nula (criadas entre deploy e backfill): tratar `null` como
   "sem fonte ativa ⇒ registra" via `organizationHasActiveDataSource` — removível na Fase 4.
7. `app/api/webhooks/ifood/route.ts`: `loadConnectedIfoodOrganizations` via tabela nova.
   **Validar keep-alive/homologação depois do deploy** (R2).
8. `lib/integrations/nuvemshop/webhook-notifications.ts`: lookup por `refExterno`.
9. `lib/integrations/ifood/context.ts`: resolver **por linha** — aceita `integrationId` opcional;
   sem ele, usa a única linha IFOOD ativa da org (404 igual quando não há nenhuma). Com mais de
   uma linha ativa e sem `integrationId`, o resolver retorna a lista para a UI escolher (o módulo
   iFood do dashboard ganha seletor de conexão quando N>1). Backfill de `merchantIds` row-scoped.

**Conexão/desconexão**
10. Callbacks Bling/Nuvemshop/iFood/sandbox: upsert em `integrations`. Reconexão explícita recebe a
    `integrationId` anterior e, quando disponível, valida o identificador estável da mesma conta
    externa antes de reativar a linha (`ativo: true`, `dataDesativacao: null`, config nova,
    `status: 'CONECTADO'`, `ultimoErro: null`); conectar outra conta cria outra linha e preserva a
    anterior desativada. **Parar de escrever os 4 campos antigos.**
11. `ConfigureIntegration.tsx` → `POST /api/integrations` (conectar um provedor já conectado cria
    **outra** linha — a UI pede `apelido` quando já existe conexão ativa do mesmo tipo, D5);
    desconectar em `SettingsIntegration.tsx` → serviço de soft delete (`ativo: false`,
    `dataDesativacao: now()`) **por `integrationId`**, sem `DELETE` para fonte de dados (D9). Ao
    desconectar a **última** fonte de dados ativa, a UI
    avisa que o POI não voltará a registrar vendas sozinho e oferece ligar
    `poiConfiguracao.vendas.registroAtivo` (R12). Expor o toggle do POI na UI de settings (novo
    bloco "Ponto de Interação" ou o existente de POI, se houver) — é ele que destrava o caso "ERP
    integrado + coleta local via POI".

**Sessão e UI**
12. `lib/authentication/{types,session}.ts`: remover os 3 campos; adicionar `integracoes` resumido
    (§3.2). Corrige o vazamento de tokens para o browser.
13. Consumidores de sessão (§2.5): `integrations-page` (cada card mostra a **contagem** de
    conexões ativas do tipo e permite conectar outra conta — nenhum provedor fica "travado" por já
    ter conexão), `ifood-page`/gate (seletor quando N>1), `SettingsIntegration` (agora lista N
    conexões, inclusive várias do mesmo tipo, identificadas por `apelido`/`refExterno` — o padrão
    multi-conexão da paid-media page é o precedente), cashback modals (defaults deixam de
    derivar de `integracaoTipo`: `acumuloPermitirViaIntegracao` default = há fonte de dados
    ativa; `acumuloPermitirViaPontoIntegracao` default = `poiConfiguracao.vendas.registroAtivo` —
    e os dois podem ser verdadeiros juntos no cenário multi-canal), `Summary.tsx`, onboarding
    (server query em `page.tsx` passa a consultar `integrations`; badge/resumo listam N; o passo
    POI do onboarding passa a escrever `poiConfiguracao.vendas.registroAtivo: true` junto de
    `dadosViaPDI`), `onboarding-quality/route.ts:105`, `app/api/integrations/settings/route.ts`
    (eco de tipo). Criação de organização passa a gravar `poiConfiguracao` default
    (`registroAtivo: true` — org nova sem integração se comporta como hoje).
14. State hooks: remover defaults dos campos que morrem (manter `dadosViaPDI`).

*Aceite da Fase 2*: cron importa vendas de uma org com **duas** integrações ativas (ex.: BLING +
IFOOD em staging/sandbox) e também de uma org com **duas conexões do mesmo tipo** (ex.: duas
contas IFOOD sandbox → 2 batches, 2 `dataUltimaSincronizacao`, webhook resolve o merchant para a
linha certa); colisão exata de `idExterno` entre as fontes não altera a venda
existente nem executa seus efeitos; POI de org com integração continua sem criar venda; POI de org
sem fonte continua criando; **org com integração ativa + `registroAtivo: true` tem os dois canais
gerando vendas** (o caso loja-de-roupas); webhook iFood resolve merchant e keep-alive responde;
Settings mostra as duas conexões com "última sincronização" preenchendo; nenhum token aparece em
resposta de API nem na sessão; desativar e reativar a mesma conta preserva `integrationId` e a
proveniência das vendas históricas.

### Fase 3 — Scripts e documentação

15. Scripts (§2.6): trocar a resolução de credenciais por um helper comum
    (`getActiveDataSourceIntegrations` + filtro por tipo; scripts que assumem um tipo específico
    passam a aceitar `--integration-id` quando a org tiver mais de uma). Corrigir o log de config
    crua em `test-nuvemshop-fetch.ts`.
16. Docs: atualizar `docs/DATA-COLLECTING-INTEGRATION.md` (§ "Adding New Integrations" descreve o
    fluxo antigo e um write de last-sync que não existe mais), o comentário "Aditiva: NÃO
    substitui..." em `services/drizzle/schema/integrations.ts:15-16` e o §0.1 do doc da fundação
    (nota de que a decisão foi revertida por este plano).

### Fase 4 — Limpeza (após janela de observação; sugerido ≥2 semanas de produção estável)

17. SQL manual: `ALTER TABLE ampmais_organizations DROP COLUMN integracao_tipo,
    integracao_configuracao, integracao_data_ultima_sincronizacao, dados_via_erp,
    dados_via_integracoes;` + `DROP TYPE organization_integration_type;`.
18. Código: remover colunas do Drizzle schema, `OrganizationIntegrationConfigSchema` +
    `TOrganizationIntegrationConfig` + campos do `OrganizationSchema`/`UpdateOrganizationSchema`
    (fecha a brecha de escrita via update genérico), `OrganizationIntegrationTypeEnum` de
    `schemas/enums.ts`, resquícios nos state hooks, e o modal morto `ViewIntegration.tsx` (ação é
    `console.log`). O compilador aponta qualquer leitor esquecido — é o fail-fast desejado para
    scripts não migrados.

---

## 6. Matriz de riscos e regressões

| # | Risco | Onde | Mitigação |
|---|---|---|---|
| R1 | Backfill do gate do POI errado ⇒ POI cria venda interna para org que não deveria (dupla venda + dupla campanha + duplo cashback) — ou para de criar onde deveria | `new-transaction:273` + backfill D8 | O gate deixa de ser derivado em runtime (D8) — o risco concentra-se no snapshot do backfill, auditável com um SELECT antes/depois (`registroAtivo` deve igualar `integracao_tipo IS NULL` org a org). Teste matriz: org só com META_ADS ⇒ `registroAtivo: true` ⇒ POI cria venda; org com fonte ativa ⇒ `false` ⇒ não cria; org com fonte + `registroAtivo: true` explícito ⇒ ambos os canais criam. A sobreposição excepcional da mesma venda entre canais diferentes é o risco R13, não uma propriedade do gate do POI. |
| R2 | Homologação/keep-alive iFood quebra (merchant set vazio) | `webhooks/ifood/route.ts:73-82` | Backfill preserva `merchantIds` no jsonb; validar com `scripts/ifood-homologation-polling.ts` migrado logo após o deploy. |
| R3 | Colisão de `idExterno` entre duas fontes da mesma org (venda A sobrescreve venda B, cashback errado) | `sync-sales.ts:278-290` | D4: backfill histórico de `sales.integracaoId` antes do multi-fonte; depois do cutover, match com integração divergente/ausente é fail-closed — não altera a venda nem executa efeitos e aparece no summary observável do batch. |
| R4 | Duplo acúmulo de cashback com 2 fontes (iFood + ERP ambos acumulam via `acumuloPermitirViaIntegracao`) | `lib/data-collecting-v2/effects.ts:249,294` | Comportamento *esperado* no modelo binário atual — documentar na entrega; controle por integração é follow-up (§4 abertas). |
| R5 | Sessão muda de shape e algum consumidor não mapeado quebra em runtime | `lib/authentication/types.ts` | A remoção dos campos é erro de compilação em todo consumidor tipado — rodar `tsc` filtrado nos tocados; grep final por `integracaoTipo`/`integracaoConfiguracao` deve retornar zero fora de schema deprecado. |
| R6 | Refresh de token entre o backfill e o deploy da Fase 2 deixa token válido só na coluna antiga → primeira sync da linha nova falha com 401 | janela de cutover | Janela mínima (backfill + deploy na sequência); os conectores Bling/iFood já re-refresham com o `refreshToken` (que não rotaciona no refresh do Bling e rotaciona no iFood — para iFood, refazer backfill se houver sync entre os passos, ou aceitar 1 ciclo de erro + reconexão). Monitorar `status='EXPIRADO'` pós-deploy. |
| R7 | Orgs com tipo↔config incoerentes ficam sem integração após a migração | gate `:260-261` | Elas **já** estão quebradas silenciosamente hoje. SELECT de auditoria pré-backfill; decidir caso a caso (reconectar ou limpar). |
| R8 | OAuth em voo durante o deploy (state cookie emitido antes, callback depois) | callbacks | Callback novo grava na tabela nova — resultado correto. Sem ação. |
| R9 | Cron e webhook iFood rodando concorrentes refresham a mesma linha (lost-update do token na própria linha) | refresh row-scoped | Mesmo risco que já existe hoje no slot da org; refresh condicional (`WHERE configuracao->>'accessToken' = :tokenAntigo`) é hardening opcional. |
| R10 | `products-syncing` não está no `vercel.json` — migrar o WHERE sem perceber que o trigger é manual | `app/api/cron/products-syncing` | Apenas registrar o fato; decidir separadamente se entra no `vercel.json`. |
| R11 | Scripts não migrados rodando contra colunas congeladas (dados velhos silenciosos) na janela Fase 2→4 | `utils/scripts/*` | Janela curta + Fase 4 dropa as colunas e o compilador acusa; scripts críticos (homologação iFood) migram na Fase 2/3. |
| R12 | Org desconecta a última integração e o POI **não** volta a registrar vendas (hoje voltava automaticamente, por derivação) ⇒ vendas de balcão somem até alguém perceber | fluxo de desconexão | Mudança comportamental intencional do D8, mas precisa de rede: a UI de desconexão avisa e oferece ligar `registroAtivo` na hora (Fase 2, item 11); Settings exibe alerta permanente quando a org está sem **nenhum** canal de vendas (nem fonte ativa, nem POI registrando). |
| R13 | A mesma venda real chega por duas integrações com `idExterno` diferentes (ex.: marketplace direto + ERP que também recebeu o pedido) ⇒ dois registros e efeitos duplicados | pipeline multi-fonte | Risco residual aceito nesta entrega: o paradigma padrão assume fontes distintas e não haverá merge heurístico automático. Follow-up D10: query procura candidatos entre integrações diferentes por organização + cliente + valor + proximidade temporal; a aba de vendas alerta e oferece correção manual. Persistência da decisão e compensação idempotente dos efeitos serão desenhadas nesse follow-up. |
| R14 | Excluir/desconectar uma integração zera a proveniência das vendas e faz uma reconexão parecer outra origem | ciclo de vida de `integrations` + FK de `sales` | D9: fonte de dados usa soft delete (`ativo: false`, `dataDesativacao`), FK `RESTRICT` e não é excluída pelo fluxo normal. Reconectar a mesma conta preserva a linha; conta externa diferente cria outra. |

---

## 7. Validação

- **Unit**: helpers de `lib/integrations/data-sources.ts`; reconexão da mesma conta vs. conexão de
  outra conta; soft delete; guard D5 (mesma conta bloqueia, conta distinta do mesmo tipo cria
  segunda linha; interseção de `merchantIds` IFOOD bloqueia); colisão D4 fail-closed sem efeitos;
  mascaramento das novas variantes de config.
- **Backfill**: relatório antes/depois de `sales.integracaoId`; toda organização elegível tem uma
  única fonte candidata; nenhuma atribuição existente é sobrescrita; divergências ficam
  explicitamente listadas antes do cutover.
- **Integração (staging)**: org com BLING + IFOOD sandbox ativos → 1 run do cron gera 2 batches,
  2 `dataUltimaSincronizacao`; colisão exata entre fontes preserva a venda original e não dispara
  efeitos; desativar uma linha confirma que só a outra roda e que as vendas históricas mantêm sua
  `integracaoId`; reativar a mesma conta preserva o id da integração.
- **POI**: matriz `registroAtivo` × {sem integração, fonte ativa, fonte inativa, só META_ADS,
  `poiConfiguracao` nula (fallback)} × venda criada/não criada; caso multi-canal (fonte ativa +
  `registroAtivo: true`) com verificação de cashback/campanhas corretos em cada canal.
- **Webhook iFood**: keep-alive com N merchants de M orgs; evento de pedido dispara coleta da org
  certa.
- **Homologação iFood** com o script migrado.
- **Segurança**: resposta de `GET /api/integrations`, sessão serializada e logs sem nenhum token
  cru.
- **Typecheck**: baseline tem ~300 erros pré-existentes — validar com `tsc` filtrado pelos
  arquivos tocados; `oxlint` por arquivo.

---

## 8. Fora de escopo

- `origemDadosPadrao` / modo ERP (`docs/ERP-IMPLEMENTATION.md`) — inalterado.
- `configuracao.preferencias.integracaoERP` (`app/api/integrations/settings/route.ts`) — é
  preferência de comportamento, não conexão; fica onde está.
- Cashback por integração, cursor incremental, índice GIN de `merchantIds` — follow-ups listados
  em §4. (Múltiplas conexões do mesmo tipo **entraram** no escopo desta entrega — ver D5.)
- **Possíveis vendas duplicadas entre integrações com IDs externos diferentes** — follow-up D10:
  query por organização + cliente + valor + proximidade temporal, alerta na área de vendas e ação
  manual de correção. A assinatura é apenas indicativa; não vira unique e não faz merge
  automático. A modelagem de persistência da decisão/correção e a compensação de cashback,
  métricas e demais efeitos serão definidas nesse trabalho futuro.
- **Consolidação completa da config do POI** — migrar para `poiConfiguracao` as capacidades hoje
  espalhadas: `poiConfirmacaoValorObrigatoria`, `poiQrCode*DataUrl`, resgate habilitado/embutido
  (cenário ERP), acúmulo na transação (hoje `acumuloPermitirViaPontoIntegracao` no programa de
  cashback), perfil do cliente final. Esta entrega só cria a coluna e move o gate de vendas
  (§3.4); o restante é um plano próprio, idealmente logo após, aproveitando que o emaranhado de
  `new-transaction` estará com um flag a menos.
- Integrações de marketing (META_ADS/CAPI/audiences) — intocadas; só compartilham a tabela.
