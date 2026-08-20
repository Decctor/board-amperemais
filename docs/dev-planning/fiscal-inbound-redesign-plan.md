# Plano: redesign do módulo de notas recebidas (fiscal inbound)

Contexto: o módulo de notas recebidas (`lib/fiscal/inbound`) foi modelado na época da Nuvem Fiscal
sobre o modelo bruto da distribuição DF-e da SEFAZ (paginação por NSU, XML entregue junto com o
documento). Desde a migração para a Spedy o inbound ficou operando como stub manual
(`ManualInboundProvider` retorna lista vazia). A Spedy lançou a API de NF-e recebidas
(`/v1/inbound-product-invoices`), que expõe um modelo diferente: recurso normalizado com ID próprio,
paginação por cursor opaco, sync assíncrono com rate limit da SEFAZ e webhooks.

O módulo está basicamente intocado em produção. Isso nos dá liberdade para corrigir o design em vez
de remendar: o contrato atual (`consultarDistribuicao({ ultNSU })`) vaza o modelo mental da SEFAZ
para dentro do core, e o schema atual não tem onde guardar o identificador do documento no provedor
— que é a chave de toda operação na Spedy (manifestar, XML, PDF).

Objetivo: redesenhar contrato, schema e loop de sincronização em torno de primitivas agnósticas de
provedor, e implementar o provedor Spedy como primeira implementação real.

---

## Princípios de design

1. **Identidade universal vs. handle do provedor.** A `chaveAcesso` (44 dígitos) é a identidade
   provider-independent de uma NF-e — é ela que deduplica e sobrevive a uma troca de provedor. O
   `provedorDocumentoId` é um handle escopado ao provedor, necessário para operar (manifestar,
   baixar assets), mas descartável. O core deduplica por chave; o handle é metadado.

2. **Checkpoint opaco.** Cada provedor pagina/incrementa do seu jeito (NSU na SEFAZ crua, cursor +
   watermark de data na Spedy). O core não interpreta o checkpoint: guarda um blob opaco (string
   JSON) que só o provedor que o escreveu sabe ler. Nada de `ultNSU`/`maxNSU`/`BigInt` no core.

3. **Ciclo de vida em dois estágios é do domínio, não do provedor.** Resumo → manifestação →
   XML completo é regra da SEFAZ, vale para qualquer provedor. O core modela isso explicitamente:
   um documento nasce como resumo (`completo = false`) e um passo separado promove a completo
   quando o XML autorizado fica disponível. O XML **não** chega junto com a detecção — é uma
   capacidade de download sob demanda.

4. **Manifestação com readback.** O estado de manifestação persistido é o que o provedor/SEFAZ
   confirmou (protocolo, data), não o que enviamos. Eventos da SEFAZ (códigos 210200–210240) são
   universais; o enum interno em PT (`CIENCIA`, `CONFIRMACAO`, ...) continua sendo a moeda do core
   e cada provedor mapeia para o seu vocabulário.

5. **Um único write-path.** Polling (cron) e webhook convergem para a mesma função de aplicação de
   snapshot (`applyInboundSnapshot`). Webhook é otimização de latência, não um caminho de escrita
   paralelo — o cron continua existindo como rede de segurança e fonte de verdade eventual.

6. **Capacidades opcionais.** Nem todo provedor sincroniza (o manual não faz nada), nem todo
   provedor tem PDF ou sync sob demanda. O contrato declara capacidades opcionais e o core degrada
   graciosamente (botões escondidos, passos pulados).

Convenção de linguagem (CLAUDE.md): nomes de métodos/tipos em inglês; campos que carregam entidade
(chaveAcesso, valorTotal, manifestacao...) em português.

---

## Resumo da API da Spedy (referência)

Todos os endpoints são escopados por empresa via `X-Api-Key` = `companyApiKey` (já armazenada em
`fiscalConfiguracao.spedy.companyApiKey`).

| Endpoint | Uso |
| --- | --- |
| `GET /v1/inbound-product-invoices` | Lista (mais recente primeiro). Filtros: `status`, `manifestationStatus`, `accessKey`, `initialDate`/`endDate`, `environmentType`. Cursor: `cursor` → `nextCursor`/`hasNext`. `limit` padrão 20, máx 200. |
| `GET /v1/inbound-product-invoices/{id}` | Detalhe: `issuer` (+endereço), `manifestation` (status/date/protocol/justification), `events[]` (cancelamento, CC-e, ...), `isComplete`, `nsu`. |
| `POST /v1/inbound-product-invoices/{id}/manifest` | Body `{ status, justification }`. Justificativa obrigatória (15–255 chars) para `unknown`/`notPerformed`. 400 se a SEFAZ recusar (nada é gravado). |
| `GET /v1/inbound-product-invoices/{id}/xml` | XML bruto. Com `isComplete: false` retorna só o resumo (não vale para escrituração). |
| `GET /v1/inbound-product-invoices/{id}/pdf` | DANFE. |
| `POST /v1/inbound-product-invoices/sync` | Sync sob demanda, assíncrono. Rate limit da SEFAZ: 429 + `Retry-After`/`retryAfterSeconds`/`nextAllowedSyncAt`. |
| `GET /v1/inbound-product-invoices/sync-status` | `lastNsu`, `lastSyncAt`, `nextAllowedSyncAt`, `lastAttemptOutcome` (enum de 9 valores), `lastAttemptMessage`. |

Mapeamento de manifestação: `CIENCIA→acknowledged`, `CONFIRMACAO→confirmed`,
`DESCONHECIMENTO→unknown`, `NAO_REALIZADA→notPerformed`. Spedy ainda tem `none` (sem manifestação)
e `rejected` (SEFAZ recusou registro).

Pré-requisitos na Spedy:

- Plano da conta precisa do recurso `inbound_invoices` (endpoints retornam 403 sem ele). **Ação
  comercial: confirmar com a Spedy antes de ativar.**
- Importação ligada por empresa: `PUT /v1/companies/{id}/settings` com
  `productInvoice.inbound = { enabled: true, startDate }`. `startDate` é o corte — só notas
  emitidas depois dela são importadas. SEFAZ retém ~90 dias de distribuição.
- Certificado digital válido na empresa (já cobrimos via `syncSpedyCompanyCertificate`).

Webhooks (conta, não empresa — um endpoint recebe eventos de todas as companies):

- `inbound_invoice.detected` — resumo chegou (`isComplete: false`).
- `inbound_invoice.completed` — XML completo disponível pós-manifestação.
- `inbound_invoice.event` — evento vinculado (cancelamento, CC-e, ...); payload `{ invoice, event }`.
- Envelope: `{ id, event, data }`, com `data` idêntico ao GET de detalhe. `id` serve para dedupe de
  reentregas. A doc não especifica assinatura/HMAC → autenticação via segredo na URL.
- Cada webhook assina exatamente um evento (criar três).

---

## Fase 1 — Contrato agnóstico (`lib/fiscal/inbound/types.ts`)

Substituir o contrato atual por:

```ts
// Snapshot normalizado de uma nota recebida, como visto pelo provedor em um instante.
export type TInboundDocumentSnapshot = {
	chaveAcesso: string;
	provedorDocumentoId?: string | null;
	completo: boolean;
	situacao?: TFiscalInboundSituacaoEnum | null; // AUTORIZADA | DENEGADA | CANCELADA
	emitenteCpfCnpj?: string | null;
	emitenteNome?: string | null;
	valorTotal?: number | null;
	dataEmissao?: Date | null;
	manifestacao?: {
		evento: TFiscalInboundManifestEventEnum | null;
		protocolo?: string | null;
		data?: Date | null;
		justificativa?: string | null;
		rejeitada?: boolean;
	} | null;
	eventos?: unknown[] | null; // eventos SEFAZ vinculados (cancelamento, CC-e...), payload cru
	resumoPayload?: Record<string, unknown> | null; // retorno cru do provedor, para auditoria
};

export type TInboundListResult = {
	documentos: TInboundDocumentSnapshot[];
	checkpoint: string | null; // blob opaco do provedor; core só persiste e devolve
	hasMore: boolean;
};

export type TInboundManifestResult = {
	registrado: boolean;
	manifestacao: NonNullable<TInboundDocumentSnapshot["manifestacao"]> | null; // readback
	mensagens?: string[];
};

export type TInboundSyncStatus = {
	lastSyncAt: Date | null;
	nextAllowedSyncAt: Date | null;
	outcome: string | null; // vocabulário do provedor, guardado como telemetria
	mensagem: string | null;
};

export interface IFiscalInboundProvider {
	// Obrigatórios
	listDocuments(input: { checkpoint: string | null }, organization: TFiscalOrganization): Promise<TInboundListResult>;
	manifest(input: TInboundManifestInput, doc: TInboundProviderRef, organization: TFiscalOrganization): Promise<TInboundManifestResult>;

	// Capacidades opcionais — core degrada graciosamente quando ausentes
	getDocument?(doc: TInboundProviderRef, organization: TFiscalOrganization): Promise<TInboundDocumentSnapshot | null>;
	downloadXml?(doc: TInboundProviderRef, organization: TFiscalOrganization): Promise<ArrayBuffer | null>;
	downloadPdf?(doc: TInboundProviderRef, organization: TFiscalOrganization): Promise<ArrayBuffer | null>;
	requestSync?(organization: TFiscalOrganization): Promise<{ accepted: boolean; retryAfterSeconds?: number | null }>;
	getSyncStatus?(organization: TFiscalOrganization): Promise<TInboundSyncStatus | null>;
}

// Referência mínima para operar um documento no provedor.
export type TInboundProviderRef = { provedorDocumentoId?: string | null; chaveAcesso: string };
```

Notas:

- `MANIFEST_EVENT_CODES` (códigos SEFAZ) permanece no core — é vocabulário do domínio.
- `resolveInboundProvider(organizacao)` passa a receber a organização e espelhar
  `resolveFiscalProvider` de `lib/fiscal/settings.ts`: `fiscalProvedor === "SPEDY"` → Spedy; senão
  manual (stub que lista vazio e recusa manifestação com mensagem clara).
- Novo enum em `schemas/enums.ts` + `services/drizzle/schema/enums.ts`:
  `FiscalInboundSituacaoEnum = ["AUTORIZADA", "DENEGADA", "CANCELADA"]` (substitui o varchar livre
  `situacao`).

## Fase 2 — Schema (`services/drizzle/schema/fiscal.ts`)

O módulo está sem dados relevantes em produção → a migração pode ser destrutiva
(drop/recreate das duas tabelas). SQL escrito em `drizzle/00XX_fiscal_inbound_redesign.sql`;
**aplicação manual pelo usuário via `scripts/apply-sql-migration.ts`** (diretiva vigente — não
aplicar DDL nem rodar `drizzle-kit push`).

### `fiscal_inbound_documents` (recriada)

Mantém: `id`, `organizacaoId`, `fornecedorId`, `chaveAcesso`, `emitenteCnpj`, `emitenteNome`,
`valorTotal`, `dataEmissao`, `compraId`, `dataInsercao`, e os índices atuais (unique
`organizacaoId + chaveAcesso` continua sendo o dedupe).

Muda/adiciona:

| Coluna | Tipo | Observação |
| --- | --- | --- |
| `provedor` | `fiscalProviderEnum` | `MANUAL`/`SPEDY` — de quem é o handle |
| `provedor_documento_id` | varchar(255), nullable | handle no provedor; unique parcial `(organizacao_id, provedor_documento_id)` |
| `situacao` | `fiscal_inbound_situacao` enum, nullable | antes varchar livre |
| `completo` | boolean, default false | mantido |
| `manifestacao_atual` | enum existente, nullable | mantido |
| `manifestacao_protocolo` | varchar(60), nullable | novo — readback SEFAZ |
| `manifestacao_data` | timestamp, nullable | novo |
| `manifestacao_justificativa` | varchar(255), nullable | novo |
| `xml_storage_path` | varchar(500), nullable | mantido |
| `pdf_storage_path` | varchar(500), nullable | novo |
| `eventos_payload` | text, nullable | novo — JSON cru de `events[]` |
| `resumo_payload` | text, nullable | mantido |
| `data_atualizacao` | timestamp, default now | novo — última aplicação de snapshot |

Remove: `nsu` (e o índice `idx_fiscal_inbound_documents_nsu`) — NSU é detalhe do provedor; se
vier, vive dentro de `resumo_payload`.

### `fiscal_inbound_cursors` → `fiscal_inbound_sync_states` (recriada)

| Coluna | Tipo | Observação |
| --- | --- | --- |
| `id`, `organizacao_id` | como hoje | unique em `organizacao_id` |
| `checkpoint` | text, nullable | blob opaco do provedor |
| `last_sync_at` | timestamp, nullable | telemetria |
| `next_allowed_sync_at` | timestamp, nullable | respeitar rate limit da SEFAZ |
| `last_outcome` | varchar(60), nullable | telemetria (vocabulário do provedor) |
| `last_message` | text, nullable | telemetria |
| `data_atualizacao` | timestamp, default now | |

Ajustes fora do schema: `lib/organizations/deletion.ts` referencia `fiscalInboundCursors` — trocar
pela nova tabela (uma linha).

## Fase 3 — Configuração fiscal (`schemas/fiscal.ts` + company sync)

1. Em `OrganizationFiscalConfigSchema`, agrupar o inbound (hoje só existe `dfeAutoCiencia` solto):

```ts
dfe: z.object({
	habilitado: z.boolean().default(false),
	// Corte de importação: só notas emitidas depois desta data entram (SEFAZ retém ~90 dias).
	dataInicio: z.string().datetime().transform((v) => new Date(v)).optional().nullable(),
	autoCiencia: z.boolean().default(true),
}).default({ habilitado: false, dataInicio: null, autoCiencia: true }),
```

Migrar direto, sem manter `dfeAutoCiencia` como legado: remover o campo do schema, atualizar
`state-hooks/use-internal-fiscal-settings-state.tsx` + UI de settings, e escrever um script
temporário one-shot (`scripts/migrate-fiscal-dfe-config.ts`) que percorre as organizações com
`fiscalConfiguracao` e move o valor de `dfeAutoCiencia` para `dfe.autoCiencia` (com
`habilitado: false` e `dataInicio: null` como defaults). O script é descartado após rodar.

2. Em `mapOrganizationToSpedySettings` (`lib/fiscal/providers/spedy/company.ts`), enviar sempre o
   bloco inbound junto do `environmentType` — a doc diz que os blocos são independentes, mas não
   garante merge *dentro* do bloco `productInvoice`, então nunca enviar o bloco sem o `inbound`:

```ts
productInvoice: {
	environmentType,
	inbound: {
		enabled: fiscal.dfe.habilitado,
		startDate: fiscal.dfe.dataInicio?.toISOString() ?? null,
	},
},
```

3. Default de `dataInicio` ao habilitar: data da ativação (a UI preenche; sem retroagir além de 90
   dias).

## Fase 4 — Provedor Spedy (`lib/fiscal/providers/spedy/inbound.ts`)

Implementa `IFiscalInboundProvider` completo usando `getSpedyCompanyClient`.

- **Checkpoint Spedy**: JSON `{ watermark: string | null, cursor: string | null }`.
  - `listDocuments`: se `cursor` presente, continua a paginação; senão lista com
    `initialDate = watermark - 24h` (overlap para cobrir atrasos de distribuição; o dedupe por
    chave absorve repetidos) e `limit = 100`. Retorna `checkpoint` com `cursor = nextCursor`
    enquanto `hasNext`, e ao terminar zera o cursor e avança `watermark` para o `issuedOn` mais
    recente visto.
  - Mapeia `InboundProductInvoiceDto` → `TInboundDocumentSnapshot` (incluindo
    `manifestation.status` → enum PT; `none` → `null`; `rejected` → `rejeitada: true`).
- **`manifest`**: `POST {id}/manifest` com status mapeado; retorna o readback da resposta
  (protocolo/data). 400 da SEFAZ vira `createHttpError.BadRequest` com a mensagem original.
- **`getDocument`**: GET detalhe → snapshot (com `eventos`).
- **`downloadXml` / `downloadPdf`**: `responseType: "arraybuffer"`, como `downloadSpedyPdf` já faz.
- **`requestSync`**: `POST /sync`; 429 → `{ accepted: false, retryAfterSeconds }` (não é erro).
- **`getSyncStatus`**: GET `/sync-status` → `TInboundSyncStatus`.
- Registrar em `resolveInboundProvider`.

## Fase 5 — Core loop (`lib/fiscal/inbound/index.ts`)

Reescrever em torno de duas primitivas:

1. **`applyInboundSnapshot({ organizationId, snapshot, provider, organization })`** — o único
   write-path (usado por poll e webhook):
   - Upsert por `(organizacaoId, chaveAcesso)` (índice único existente absorve corrida).
   - Cria/resolve fornecedor por CNPJ (lógica atual de `resolveOrCreateSupplier` mantida).
   - Atualiza campos mutáveis: `provedorDocumentoId`, `situacao`, `completo`, `manifestacao*`,
     `eventosPayload`, `dataAtualizacao`.
   - **Promoção a completo**: se `snapshot.completo` e ainda não temos `xmlStoragePath`, baixa XML
     via `provider.downloadXml` e persiste em storage (`storeFiscalAsset`, tipo `entrada`). PDF é
     lazy (baixado no primeiro acesso do usuário, cacheado em `pdfStoragePath`).

2. **`pollInboundDocuments({ organizationId })`** — chamado pelo cron:
   - Org sem `fiscalConfiguracao` ou com `dfe.habilitado !== true` → no-op.
   - Se o provedor tem `requestSync`/`getSyncStatus`: consultar status e disparar sync só quando
     `now >= nextAllowedSyncAt` (respeitar rate limit da SEFAZ; 429 não é erro, só telemetria).
   - Loop de `listDocuments` com o checkpoint persistido (máx. `MAX_PAGES` por rodada), aplicando
     cada snapshot; persistir checkpoint + telemetria em `fiscal_inbound_sync_states` a cada página
     (retomável).
   - **Passo de reconciliação**: documentos com `manifestacaoAtual` preenchida e `completo = false`
     → `getDocument` e reaplicar snapshot (pega o `isComplete` que virou true entre manifestação e
     redistribuição da SEFAZ). Limitar (ex.: 25 por rodada, mais antigos primeiro).
   - Auto-ciência: comportamento atual mantido (docs sem manifestação → `CIENCIA`), agora guardando
     o readback (protocolo/data) e respeitando `dfe.autoCiencia`.
   - `manifestacao.rejeitada` no readback → não sobrescrever `manifestacaoAtual`, logar e seguir.

3. **`manifestInboundDocument`** — passa a delegar `provider.manifest` com o `provedorDocumentoId`
   e persistir o readback (evento + protocolo + data + justificativa), não o valor otimista.

4. **`getInboundDocumentPdf`** — novo, espelho do `getInboundDocumentXml` com lazy download/cache.

Cron (`app/api/cron/fiscal-inbound/route.ts` + `vercel.json`): manter rota; com webhooks ativos o
papel dele é rede de segurança + reconciliação. Frequência atual (2h) ok.

## Fase 6 — Webhook (`app/api/webhooks/spedy/route.ts`)

- Autenticação: sem assinatura documentada pela Spedy → segredo na query
  (`?secret=SPEDY_WEBHOOK_SECRET`), comparação constant-time, 401 sem match. Nova env var.
- Resolução da organização: webhook é por conta; `data.company.federalTaxNumber` → busca org por
  `fiscalConfiguracao.cpfCnpj` (dígitos). Org não encontrada → 200 com log (não fazer a Spedy
  reentregar eternamente).
- Handler por evento:
  - `inbound_invoice.detected` / `inbound_invoice.completed`: mapear `data` (mesmo shape do GET de
    detalhe) → snapshot → `applyInboundSnapshot`.
  - `inbound_invoice.event`: `data = { invoice, event }` → reaplicar snapshot do invoice (que já
    carrega `events[]` atualizado).
- Inbox de eventos externos: arquivar o payload bruto em `external_events`
  (`services/drizzle/schema/external-events.ts`) após a autenticação e antes do processamento,
  seguindo o padrão do sync-skip-and-webhook-inbox-plan — adicionar `"SPEDY"` ao
  `ExternalEventSourceEnum` (varchar no banco, sem migração de enum PG) e carimbar
  `processamentoStatus`. Isso entrega durabilidade, observabilidade e replay.
- Dedupe de processamento: responder 200 rápido; o hash canônico do body no inbox colapsa
  reentregas idênticas, e o upsert por chave + `dataAtualizacao` torna a aplicação idempotente.
- Registro dos webhooks: por conta, com a owner key — script one-shot
  `scripts/register-spedy-webhooks.ts` que cria os três webhooks apontando para
  `https://<host>/api/webhooks/spedy?secret=...`. Não é por organização.

## Fase 7 — API routes + UI

Rotas (`app/api/fiscal/inbound/`):

- `route.ts` (GET lista): sem mudança estrutural; incluir novos campos no retorno (protocolo,
  `completo`, `situacao` tipada).
- `manifest/route.ts`: sem mudança de contrato; resposta passa a incluir o readback.
- `xml/route.ts`: sem mudança.
- `pdf/route.ts`: nova, espelho da de XML.
- `sync/route.ts`: nova (POST) — dispara `provider.requestSync` para a org (botão "Sincronizar
  agora"); responde `nextAllowedSyncAt` quando rate-limited.

UI (`app/dashboard/purchases/components/InboundDocumentsTab.tsx`):

- Badge de estágio: "RESUMO" vs "COMPLETA" (explica por que o XML ainda não está disponível).
- Exibir protocolo/data da manifestação.
- Botão DANFE (PDF) ao lado do XML, visível quando `completo`.
- Trocar `window.prompt` da justificativa por modal (`ResponsiveMenu`), com aviso de
  irreversibilidade para CONFIRMACAO/DESCONHECIMENTO/NAO_REALIZADA (Ciência é a única reversível).
- Botão "Sincronizar agora" no header da aba, com feedback de rate limit.
- Settings fiscais: toggle `dfe.habilitado` + data de início + toggle auto-ciência (substitui o
  campo solto atual).

## Fora de escopo (follow-ups)

- **Vincular nota recebida a compra** (`compraId` já existe no schema): transformar NF-e recebida em
  compra com itens (parse do XML completo) — próximo passo natural do módulo, plano próprio.
- NFS-e recebidas (Spedy ainda não suporta; anunciado como futuro, mesmo modelo).

## Ordem de execução e dependências

1. Fase 1 + 2 juntas (contrato + schema + migração SQL) — base de tudo.
2. Fase 4 (provedor Spedy) + Fase 3 (settings/gating) — podem andar em paralelo.
3. Fase 5 (core loop) — depende de 1, 2 e 4.
4. Fase 6 (webhook) e Fase 7 (rotas/UI) — dependem de 5; independentes entre si.

Checklist externo (fora do código):

- [ ] Confirmar recurso `inbound_invoices` no plano da conta Spedy.
- [ ] Definir `SPEDY_WEBHOOK_SECRET` no ambiente (Vercel).
- [ ] Rodar `scripts/register-spedy-webhooks.ts` após deploy.
- [ ] Aplicar migração SQL manualmente (`scripts/apply-sql-migration.ts`).
