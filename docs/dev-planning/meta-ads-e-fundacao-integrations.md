# Fundação de Integrations + Meta Ads — Plano de Implementação

> Status: planejamento para revisão. Nenhuma linha de código escrita ainda.
> Origem: trazer para o RecompraCRM o módulo de Meta Ads validado no **Syncroniza Control**,
> construindo antes uma **fundação genérica de integrations** (inspirada em `partnerIntegrations`
> do Control) que servirá de base para integrações futuras (Google Ads, TikTok, etc.).
>
> Escopo desta entrega: (1) fundação de integrations, (2) Meta Ads leitura (métricas + biblioteca),
> (3) Conversions API **server-side a partir de vendas**, (4) Audiences (Custom Audiences) a partir
> do motor de segmentação que já existe no RecompraCRM.

---

## 0. Decisões fechadas

Estas decisões já estão tomadas e o resto do documento as assume:

1. **A fundação é aditiva.** A integração de ERP/fonte de dados atual — inline em
   `organizations.integracaoTipo` + `organizations.integracaoConfiguracao` — **não é tocada** nesta
   entrega. A nova tabela `integrations` cobre integrações de **marketing/parceiros** (Meta Ads,
   CAPI, tracking, futuros). Uma eventual migração do ERP para a tabela nova é escopo separado.
2. **Uma linha por conexão.** Cada conta de anúncios da Meta = uma linha em `integrations`
   (`tipo = 'META_ADS'`). É exatamente o modelo do Control (`partner_integrations`), adaptado à
   multitenância por `organizacaoId`.
3. **`configuracao` é uma união discriminada Zod** tipada por `tipo`, armazenada em `jsonb`. Segredos
   (tokens) **nunca** voltam crus ao cliente — passam por `maskConfig` (portado do Control).
4. **CAPI = server-side a partir de vendas (primeira fonte).** Na criação da venda, emitimos
   `Purchase` ao Conversions API com PII hasheada do cliente. É o maior diferencial do RecompraCRM:
   dado de compra first-party já mora no banco. O SDK de navegador (`/api/track`) fica documentado
   como fase futura opcional, **não** entra nesta entrega.
   **Sem tabela dedicada de eventos.** O status do envio (dedup/observabilidade/retry) vive numa
   **coluna JSONB tipada `capiMetadados` no cabeçalho da venda** (`sales`), não numa tabela nova
   (ver §4.3).
5. **Audiences reusam o motor de filtros existente.** `resolveCampaignAudienceClientIds` +
   `TCampaignFilters` + RFM já resolvem "segmento → lista de clientes". A entrega apenas pluga um
   **destino Meta** (Custom Audience) sobre isso. O conceito `audiences` nasce agnóstico de
   plataforma para reusar em Google/TikTok no futuro.
6. **Tudo em App Router.** Rotas seguem o padrão de 4 partes do `CLAUDE.md` (`appApiHandler`,
   `getCurrentSessionUncached`, `createHttpError`, Zod). As `procedures` tRPC do Control são
   **reescritas** como `route.ts`; a camada de negócio (Graph client, insights, CAPI) é **portada
   quase 1:1**, trocando `TRPCError` por `createHttpError`.

---

## 1. Conceito e separação de responsabilidades

| Conceito | O que é | Onde vive |
|---|---|---|
| **Integration** | Uma conexão concreta com uma plataforma externa (uma conta de anúncios Meta, um pixel/dataset CAPI). Guarda credenciais e toggle. | `integrations` — **novo** |
| **Config da integration** | Bag tipada com os campos específicos daquele `tipo` (tokens, adAccountId, pixelId…). | `integrations.configuracao` jsonb `$type<TIntegrationConfig>` |
| **Audience (público)** | Definição de segmento agnóstica de plataforma, reusando o filtro de campanhas + RFM. | `audiences` — **novo** |
| **Audience destination** | Ligação de um público a uma integração de destino + id externo (ex.: Meta Custom Audience id) + estatísticas de sync. | `audience_destinations` — **novo** |
| **Status CAPI da venda** | Estado do envio de conversão ao Meta (dedup + observabilidade + retry). | `sales.capiMetadados` (JSONB tipada) — **nova coluna**, sem tabela |
| **Segmento/filtro** | Árvore recursiva AND/OR/NOT que resolve para clientes. | `TCampaignFilters` + `resolveCampaignAudienceClientIds` — **já existe** |

Princípio: `integrations` guarda **como** falar com a plataforma; `audiences` guarda **quem**;
`audience_destinations` guarda **para onde** o quem vai. Isso mantém público reusável entre destinos.

---

## 2. Fundação de Integrations

### 2.1 Schema — `services/drizzle/schema/integrations.ts`

`newTable` prefixa em `ampmais_`. Espelha `partner_integrations` do Control, com convenções da casa.

| Coluna (Drizzle) | Coluna (DB) | Tipo | Notas |
|---|---|---|---|
| `id` | `id` | `varchar(255)` PK | `.$defaultFn(() => crypto.randomUUID())` |
| `organizacaoId` | `organizacao_id` | `varchar(255)` → organizations | `onDelete: "cascade"`, `notNull` |
| `tipo` | `tipo` | `integrationTypeEnum` | `'META_ADS' | 'META_CAPI' | 'TRACKING'` |
| `ativo` | `ativo` | `boolean` | `default(false).notNull()` — toggle da conexão |
| `apelido` | `apelido` | `text` | rótulo p/ distinguir múltiplas contas Meta |
| `configuracao` | `configuracao` | `jsonb $type<TIntegrationConfig>` | união discriminada |
| `status` | `status` | `integrationStatusEnum` | `'CONECTADO' | 'EXPIRADO' | 'ERRO'` |
| `ultimoErro` | `ultimo_erro` | `text` | mensagem do último erro (ex.: token 190) |
| `dataUltimaSincronizacao` | `data_ultima_sincronizacao` | `timestamp` | |
| `autorId` | `autor_id` | `varchar(255)` → users | quem conectou |
| `dataInsercao` | `data_insercao` | `timestamp` | `defaultNow().notNull()` |
| `dataAtualizacao` | `data_atualizacao` | `timestamp` | `.$onUpdate(() => new Date())` |

Coluna extra p/ unicidade e busca (decisão fechada — Q5):
| `refExterno` | `ref_externo` | `varchar(255)` | id externo canônico da conexão (p/ META_ADS = `adAccountId`; futuro CAPI = dataset/pixel). Preenchido no connect. |

Índices:
- `index("idx_integrations_org_tipo").on(organizacaoId, tipo)`
- `uniqueIndex("idx_integrations_org_tipo_ref").on(organizacaoId, tipo, refExterno)` — evita conexão
  duplicada (ex.: mesma conta Meta duas vezes). Coluna dedicada em vez de índice funcional em jsonb.

Enums em `schema/enums.ts`:
```ts
export const integrationTypeEnum = pgEnum("integration_type", ["META_ADS", "META_CAPI", "TRACKING"]);
export const integrationStatusEnum = pgEnum("integration_status", ["CONECTADO", "EXPIRADO", "ERRO"]);
```
> Trade-off: enum dá type-safety mas exige migração por novo tipo (o Control usou `varchar(64)` por
> extensibilidade). Escolha alinhada às convenções do RecompraCRM (enums em `enums.ts`). Aceitável
> porque adicionar valor a enum é migração trivial.

Barrel-export em `schema/index.ts`; exportar `relations`, `TIntegrationEntity`/`TNewIntegrationEntity`.

### 2.2 Zod — `schemas/integrations.ts`

Enum em `schemas/enums.ts` (`IntegrationTipoEnum`). União discriminada por `tipo`:

```ts
export const MetaAdsIntegrationConfigSchema = z.object({
  tipo: z.literal("META_ADS"),
  accessToken: z.string({ required_error: "Token de acesso do Meta Ads não informado." }),
  tokenExpiresAt: z.string().datetime().nullable(),
  metaUserId: z.string(),
  adAccountId: z.string().regex(/^act_\d+$/, { message: "adAccountId deve ser act_<id>." }),
  adAccountNumericId: z.string(),
  adAccountName: z.string(),
  currency: z.string().optional(),
  timezoneName: z.string().optional(),
  businessId: z.string().optional(),
  businessName: z.string().optional(),
  scopes: z.array(z.string()),
  // CAPI / Custom Audiences (podem ser preenchidos depois da conexão base):
  pixelId: z.string().optional(),
  capiDatasetId: z.string().optional(),
  capiTestEventCode: z.string().optional(),
  eventosCapi: z.array(z.string()).optional(),
});

export const MetaCapiIntegrationConfigSchema = z.object({
  tipo: z.literal("META_CAPI"),
  // opcional: separar CAPI da conta de Ads; por ora mantemos os campos CAPI na META_ADS
  // e deixamos este tipo reservado. Ver seção 4.
});

export const IntegrationConfigSchema = z.discriminatedUnion("tipo", [
  MetaAdsIntegrationConfigSchema,
  // MetaCapiIntegrationConfigSchema, TrackingIntegrationConfigSchema (fase futura)
]);
export type TIntegrationConfig = z.infer<typeof IntegrationConfigSchema>;
```

> Decisão de modelagem CAPI: **os campos `pixelId`/`capiDatasetId`/`capiTestEventCode` vivem na
> própria `META_ADS`** (como no Control). Não criamos `META_CAPI` separado agora — evita join de
> config. O tipo fica reservado caso, no futuro, um pixel precise existir sem conta de Ads.

### 2.3 API — `app/api/integrations/route.ts`

Padrão 4 partes do `CLAUDE.md`. Multi-mode GET:

```ts
// GET /api/integrations                -> lista (opcional ?tipo=META_ADS)
// GET /api/integrations?id=<id>        -> byId
async function getIntegrationsRoute(request: NextRequest) {
  const session = await getCurrentSessionUncached();
  if (!session) throw new createHttpError.Unauthorized("Não autorizado.");
  const organizacaoId = session.membership?.organizacao.id;
  if (!organizacaoId) throw new createHttpError.BadRequest("Sem organização ativa.");
  const input = GetIntegrationsInputSchema.parse({ id: ..., tipo: ... });
  const result = await getIntegrations({ input, organizacaoId }); // aplica maskConfig
  return NextResponse.json(result); // { data: { byId, default }, message }
}
export const GET = appApiHandler({ GET: getIntegrationsRoute });
```

- `PATCH /api/integrations` → toggle `ativo` / atualizar `apelido` / preencher campos CAPI
  (`pixelId`, `capiTestEventCode`, `eventosCapi`).
- `DELETE /api/integrations?id=` → desconectar (remove linha; ver LGPD §7 p/ limpeza de destinos).
- Autorização: exigir membership da org; ações de escrita (conectar/desconectar/toggle/config)
  exigem a **nova chave de permissão `integracoes`** em `organization_members.permissoes`
  (`TOrganizationMemberPermissions` em `schemas/organizations.ts`) — decisão fechada (Q4). Adicionar
  a chave ao schema de permissões, aos defaults de papel e à UI de gestão de membros.
- `maskConfig(config)` portado: substitui `accessToken` por `********` na resposta.

Client-side: `lib/queries/integrations.ts` (hooks `useIntegrations`, `useIntegrationById`) e
`lib/mutations/integrations.ts` (thin Axios wrappers), tipados pelos outputs exportados da rota.

### 2.4 UI — Hub de integrações

- Página com cards por integração disponível + estado (conectado/expirado/erro), botão **Conectar**
  (dispara OAuth) e ações (toggle, desconectar). Reaproveitar layout de `/dashboard/settings?view=integration`
  ou nova rota `/dashboard/marketing`.
- Modais seguindo convenção `Modals/Internal/{Domain}/` + `ResponsiveMenu`.

---

## 3. Meta Ads — Conexão + Leitura (Fase 1)

### 3.1 OAuth (padrão da casa, não `arctic`)

Espelhar o fluxo nuvemshop/bling: cookie de `state` + `consumeOAuthRedirect`, `fetch` manual.

- `GET /app/api/integrations/meta/ads/auth/route.ts` — gera `state`, seta cookie
  `meta_ads_oauth_state` (httpOnly, 10min), redireciona para o dialog da Meta.
  Scopes: **`ads_read`, `ads_management`, `business_management` já na conexão inicial** (decisão
  fechada Q1 — o recurso entra em beta, então pedir `ads_management` de cara não é problema e
  destrava CAPI-write + Custom Audiences sem reconsent).
- `GET /app/api/integrations/meta/ads/auth/callback/route.ts`:
  1. `session = getCurrentSessionUncached()`; `organizacaoId = session.membership.organizacao.id`.
  2. Valida `state` vs cookie; troca `code` → short token → **long-lived token** (`fb_exchange_token`).
  3. `GET /debug_token` → valida, extrai `granular_scopes` (contas selecionadas na autorização).
  4. `GET /me/adaccounts?fields=id,account_id,name,account_status,currency,timezone_name,business{id,name}`.
  5. Cruza contas acessíveis × selecionadas (lógica `getSelectedMetaAdsAccounts` portada), ignora
     dupes já existentes na org, **insere uma linha `integrations` por conta** (`tipo='META_ADS'`,
     `ativo=true`, `status='CONECTADO'`).
  6. Redireciona para o hub com `?connected=meta-ads`.
- Env necessários: `NEXT_PUBLIC_META_APP_ID`, `META_APP_SECRET`, `NEXT_PUBLIC_APP_URL`.

### 3.2 Camada Meta (portada de `lib/integrations/meta/ads/*`)

Copiar para `lib/integrations/meta/ads/`:
- `client.ts` — `getMetaGraphUrl`, `metaGraphGet/Post/ByFullUrl`. **Trocar `TRPCError` por
  `createHttpError`** com o mesmo mapeamento: 401/190 → `Unauthorized` ("reconecte"), 429/4/17/613 →
  `TooManyRequests`, resto → `InternalServerError`. Manter `META_GRAPH_API_VERSION`.
- `types.ts` — `TNormalizedMetaAdsMetrics`, `TMetaAdsLibraryAd`, `TMetaAdsAdDetailResult` etc.
- `insights.ts` — normalização de insights (conta/campanha/anúncio), série diária de spend com
  preenchimento de lacunas (`fillDailySpendGaps`), detalhe de anúncio (summary + série diária),
  paginação via `paging.next`.
- `library.ts` — biblioteca de anúncios: criativos, `effective_status`, parsing de `asset_feed_spec`.
- `config.ts` **novo** (equivalente ao `capi/config.ts`): `getOrgMetaAdsConfig(db, organizacaoId, integrationId?)`
  lê da tabela `integrations` (por `organizacaoId` + `tipo='META_ADS'` + `ativo`), retorna
  `TMetaAdsIntegrationConfig`.

### 3.3 Rotas de leitura (multi-mode)

Todas exigem sessão + org + integração pertencente à org.

| Rota | Query | Retorno |
|---|---|---|
| `GET /api/integrations/meta/ads/insights` | `integrationId`, `level=account\|campaign\|ad`, `since`, `until` | métricas normalizadas |
| `GET /api/integrations/meta/ads/spend-series` | `integrationId`, `since`, `until` | série diária de investimento |
| `GET /api/integrations/meta/ads/library` | `integrationId`, `status=all\|active\|paused`, `withInsights?` | anúncios + criativos (+ métricas) |
| `GET /api/integrations/meta/ads/ad` | `integrationId`, `id` (adId), `since`, `until` | detalhe do anúncio (summary + diário) |

Hooks em `lib/queries/meta-ads.ts` (params com debounce p/ intervalo de datas); tipos do output das rotas.

### 3.4 UI Meta Ads

- **Overview**: cards (spend, ROAS, leads, purchases, CTR, CPC), gráfico de investimento no tempo.
- **Biblioteca**: grade de anúncios com criativo (imagem/thumb), status, e métricas por anúncio;
  modal de detalhe (`ControlMetaAd`) com série diária.
- Portar componentes do Control adaptando ao shadcn/`ResponsiveMenu`/`LoadingComponent`/`ErrorComponent`.
- Charts: usar a lib de dataviz padrão do projeto (ver componentes de `campaigns/stats`).

---

## 4. Conversions API — server-side a partir de vendas (Fase 2)

### 4.1 Camada CAPI (portada de `lib/integrations/meta/capi/*`)

Portar quase intacto (não dependem de tRPC):
- `hashing.ts` — SHA-256 hex via Web Crypto; `hashEmail` (trim+lowercase), `hashPhone` (só dígitos, E.164).
- `events.ts` — `buildCapiEvent` (PII hasheada `em`/`ph`, `fbc`/`fbp` quando houver, `event_id` p/
  dedup, `custom_data`), `mapEventName` (mapa p/ eventos padrão da Meta).
- `client.ts` — `sendCapiEvents` (`POST /{pixelId}/events`, **nunca lança**, retorna resultado p/ log).
- `config.ts` — helpers de leitura de `pixelId`/`accessToken`/`capiTestEventCode` da `integrations`
  (`META_ADS` ativa da org) + `isCapiEventEnabled`.

### 4.2 Gatilho: criação de venda → `Purchase`

Ponto de integração: o serviço de criação de venda (`app/api/sales/.../route.ts`). Após persistir a
venda com sucesso:

1. Carrega config `META_ADS` ativa da org com `pixelId` + `eventosCapi` incluindo `purchase`; se
   não houver, no-op.
2. Resolve identificadores do cliente da venda: `email`, `telefone`, e (opcional) `fbc`/`fbp`/`fbclid`
   se tivermos capturado atribuição (ver §4.4).
3. Monta evento:
   - `event_name: "Purchase"`, `event_id: <saleId>` (dedup estável e idempotente),
   - `event_time`: timestamp da venda,
   - `action_source`: `"physical_store"` (PDV) ou `"website"` (loja online `shop`) — derivar da
     origem da venda,
   - `custom_data`: `{ value: <valorVenda>, currency: "BRL", order_id: <saleId> }` — moeda fixa
     `BRL` (produto atende público brasileiro, decisão fechada Q3),
   - `user_data`: `em`/`ph` hasheados (+ `fn`/`ln`/`ct`/`st`/`country`/`db` opcionais a partir de
     `nome`/cidade/estado/`dataNascimento` do cliente — melhora o match rate).
4. `sendCapiEvents(...)` em background (não bloquear a resposta da venda; usar `waitUntil` se
   disponível na rota, ou fila).
5. Persistir o resultado em `sales.capiMetadados` (§4.3), sem tabela dedicada.

> `action_source: "physical_store"` exige `event_time` e dados de `user_data` fortes; para vendas de
> PDV sem web, o match é feito por email/telefone (advanced matching), que é justamente o que temos.

### 4.3 Persistência — coluna `sales.capiMetadados` (sem tabela; decisão fechada Q2)

Em vez de uma tabela `meta_conversion_events`, adicionamos **uma coluna JSONB tipada no cabeçalho da
venda** — alinhado ao padrão da casa de colunas dedicadas por preocupação (bloco `atribuicao*`,
`emissaoFiscalAutomatica`). A dedup é natural: **1 venda = 1 evento `Purchase`**, então o estado cabe
na própria linha da venda.

Schema (`services/drizzle/schema/sales.ts`, no cabeçalho `sales`):
```ts
capiMetadados: jsonb("capi_metadados").$type<TSaleCapiMetadata>(),
```
Tipo Zod (`schemas/sales.ts`):
```ts
export const SaleCapiMetadataSchema = z.object({
  status: z.enum(["PENDENTE", "ENVIADO", "FALHA"]),
  eventId: z.string(),            // = saleId (idempotência/dedup com pixel, se houver)
  eventName: z.string(),          // "Purchase"
  integrationId: z.string().optional(),
  actionSource: z.string().optional(),
  eventsReceived: z.number().optional(),
  tentativas: z.number().default(0),
  ultimoErro: z.string().optional(),
  dataEnvio: z.string().datetime().optional(),
});
export type TSaleCapiMetadata = z.infer<typeof SaleCapiMetadataSchema>;
```

- **Retry**: o cron (`/api/cron`) varre `sales` com `capiMetadados->>'status' IN ('PENDENTE','FALHA')`
  numa janela recente e reprocessa com backoff, incrementando `tentativas`. Índice parcial de apoio:
  `CREATE INDEX ... ON sales ((capi_metadados->>'status')) WHERE capi_metadados IS NOT NULL`.
- **Nunca** guardar PII crua aqui — o hash só vai no payload enviado à Meta; na coluna fica só o
  resumo de status. `value`/`currency` já existem na própria venda (`valorTotal`), não precisam
  duplicar.
- Vendas sem cliente identificado ou sem integração ativa: `capiMetadados` fica `null` (no-op).

### 4.4 Atribuição (opcional, incremental)

Para elevar o match e a otimização, capturar `fbclid` → `fbc` na entrada de tráfego (loja `shop` /
landing) e associar ao cliente/venda. MVP: enviar só email/telefone (advanced matching) — já
funciona. Evolução: guardar `fbc/fbp` num campo leve no cliente ou numa `tracking_profiles` enxuta
(portável do Control em fase futura, junto do SDK de navegador).

### 4.5 Configuração CAPI na UI

Tela de settings da integração Meta Ads: `pixelId`, `capiDatasetId`, `capiTestEventCode` (validação
no Events Manager), e quais eventos encaminhar (`eventosCapi`, começando por `purchase`). Botão
"Enviar evento de teste".

---

## 5. Audiences / Públicos — Custom Audiences (Fase 3)

O maior diferencial: transformar a riqueza de segmentação do RecompraCRM em públicos na Meta.

### 5.1 Schema

`audiences` (definição agnóstica de plataforma):

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | varchar PK | |
| `organizacaoId` | → organizations (cascade) | |
| `nome` / `descricao` | text | |
| `filtros` | `jsonb $type<TCampaignFilters>` | **mesma** árvore de filtros das campanhas |
| `segmentacoes` | jsonb/text[] | opcional, mesmas chaves de segmentação RFM |
| `autorId` | → users | |
| `dataInsercao` / `dataAtualizacao` | timestamp | |

`audience_destinations` (ligação a um destino externo):

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | varchar PK | |
| `audienceId` | → audiences (cascade) | |
| `integrationId` | → integrations (cascade) | destino (META_ADS) |
| `externalId` | text | Meta Custom Audience id |
| `status` | enum `PENDENTE\|SINCRONIZADO\|ERRO` | |
| `matchRate` | doublePrecision | retorno da Meta (approx.) |
| `qtdeEnviada` | integer | usuários no último upload |
| `snapshotClientIds` | jsonb (ou tabela filha) | membros da última sync p/ calcular delta |
| `ultimaSincronizacao` / `ultimoErro` | timestamp / text | |

### 5.2 Fluxo de sincronização

1. Resolver membros: `resolveCampaignAudienceClientIds({ executor: db, organizationId, segmentations, filters })`
   → `string[]` de clientIds. (`countCampaignAudienceClients(...)` já existe p/ **preview de contagem**
   na UI, sem materializar.)
2. Buscar PII dos clientes: `email`, `telefone`, `nome` (→ `fn`/`ln`), `localizacaoCidade`/`Estado`,
   `dataNascimento`, país.
3. Normalizar + **hash SHA-256 reusando `capi/hashing.ts`** (mesma normalização exigida pela Meta).
4. Upload em lotes: `POST /{custom_audience_id}/users` com `schema` (ex.: `["EMAIL","PHONE","FN","LN","CT","ST","COUNTRY"]`)
   + `data` (arrays hasheados), `session` p/ lotes grandes.
5. Persistir `matchRate`/`qtdeEnviada`/snapshot em `audience_destinations`.

Criação da Custom Audience: `POST /{ad_account_id}/customaudiences` (`subtype=CUSTOM`,
`customer_file_source`). Lookalike: `POST /{ad_account_id}/customaudiences` com `origin_audience_id`
apontando a Custom Audience seed.

### 5.3 Refresh incremental (cron)

- `/api/cron` re-resolve a audiência periodicamente; compara com `snapshotClientIds`:
  - entrantes → `POST /users` (add),
  - saintes → `DELETE /users` (remove).
- Alternativa mais simples no MVP: replace completo por upload (a Meta faz merge por hash). Delta é
  otimização.

### 5.4 Escopos e pré-requisitos Meta

- Custom Audiences (e CAPI de escrita) exigem **`ads_management`** — já pedido na conexão inicial
  (§3.1, decisão Q1), então não há reconsent entre fases.
- Usuário precisa ter aceitado os **Custom Audience Terms** na conta de anúncios (a API retorna erro
  claro se não; tratar com mensagem de reconexão/aceite).

### 5.5 UI Audiences

- Página de Audiences reusando o **construtor de filtros de campanha** (mesmo componente de árvore
  AND/OR/NOT), com **preview de contagem** (`countCampaignAudienceClients`) e labels RFM (`@/utils/rfm`).
- Ação "Conectar à Meta" (escolhe integração META_ADS destino) → cria Custom Audience → mostra
  match rate e histórico de sync.

---

## 6. Reuso × Reescrita (mapa de portabilidade)

| Do Control | Ação | Destino no RecompraCRM |
|---|---|---|
| `partner_integrations` (tabela + união) | **Adaptar** | `services/drizzle/schema/integrations.ts` |
| `lib/validators/integrations.ts` (união) | **Adaptar** (só Meta agora) | `schemas/integrations.ts` |
| `lib/integrations/meta/ads/{client,insights,library,types}` | **Portar 1:1** (TRPCError→createHttpError) | mesmo caminho |
| `lib/integrations/meta/capi/{hashing,events,client,config}` | **Portar 1:1** | mesmo caminho |
| OAuth `arctic` (`MetaAdsOAuth`) | **Reescrever** (cookie+`consumeOAuthRedirect`) | `app/api/integrations/meta/ads/auth/**` |
| `integration.procedure/service/input` (tRPC) | **Reescrever** como route.ts (4 partes) | `app/api/integrations/**` |
| `maskConfig` | **Portar** | `lib/integrations/mask.ts` |
| SDK `/api/track` + `tracking_profiles` | **Adiar** (fase futura, p/ loja online) | — |
| Motor de audiência | **Já existe** | `lib/campaigns/filters.ts` (`resolveCampaignAudienceClientIds`) |

---

## 7. LGPD / Privacidade (requisito, não opcional)

- Subir PII hasheada para a Meta (Custom Audiences) e enviar conversões (CAPI) exige **base legal**
  (consentimento/legítimo interesse) e registro de finalidade.
- **Propagação de exclusão**: `/api/data-deletion-requests` (já existe) precisa, ao apagar/anonimizar
  um cliente, **remover o hash das Custom Audiences** (`DELETE /{custom_audience_id}/users`) de todas
  as `audience_destinations` da org. Incluir isso no fluxo de deleção.
- Nunca persistir PII crua em `meta_conversion_events`/logs — só hash no payload da Meta.
- Documentar nos termos que dados podem ser compartilhados com a Meta para marketing.

---

## 8. Fases e entregáveis

| Fase | Entregável | Aceite |
|---|---|---|
| **0 — Fundação** | tabela `integrations` + enums + migração; `schemas/integrations.ts`; `GET/PATCH/DELETE /api/integrations` com `maskConfig`; hooks/mutations; hub UI | Conectar/desconectar/toggle uma integração fictícia; token nunca aparece cru na resposta |
| **1 — Meta Ads leitura** | OAuth Meta (auth+callback); camada `meta/ads/*` portada; rotas insights/library/spend/ad; UI overview + biblioteca | Conectar conta real, ver métricas e biblioteca com criativos e métricas por anúncio |
| **2 — CAPI server-side** | camada `meta/capi/*`; gatilho no create-sale → `Purchase`; coluna `sales.capiMetadados` + índice parcial; retry cron; settings CAPI + evento de teste | Evento aparece no Events Manager (test code) e como recebido; dedup por `saleId`; falhas reprocessam |
| **3 — Audiences** | `audiences` + `audience_destinations`; sync Custom Audience (hash reuse); refresh cron; lookalike; UI com preview de contagem; propagação de deleção LGPD | Criar público por filtro, subir p/ Meta, ver match rate; exclusão de cliente remove da audiência |

Cada fase é independentemente entregável e não quebra o que já existe.

---

## 9. Decisões resolvidas (antes abertas)

1. **Escopo OAuth** — pedir **`ads_management`** já na conexão inicial (recurso entra em beta; sem
   reconsent entre fases). Ver §3.1.
2. **Persistência CAPI** — **sem tabela**; status em `sales.capiMetadados` (JSONB tipada). Ver §4.3.
3. **Moeda/locale** — fixar **pt-BR / BRL** (`custom_data.currency = "BRL"`). Ver §4.2.
4. **Permissão** — nova chave **`integracoes`** em `organization_members.permissoes` governa
   conectar integrações e gerenciar audiences. Ver §2.3.
5. **Unicidade da integração** — coluna dedicada **`refExterno`** + unique `(organizacaoId, tipo,
   refExterno)`, em vez de índice funcional em jsonb. Ver §2.1.

### Questões que ainda valem confirmar

- **`action_source` por origem de venda**: mapear PDV físico → `physical_store`, loja online `shop`
  → `website`, importação ERP → `system_generated` (ou omitir do CAPI). Confirmar quais origens
  devem de fato gerar evento (ex.: importação histórica de ERP provavelmente **não** deve disparar
  `Purchase` retroativo).
