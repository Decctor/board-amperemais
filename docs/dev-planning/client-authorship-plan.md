# Autoria de Clientes (autorId / autorVendedorId) — Planejamento

> Status: implementado em 2026-07-30 (fases 1–3). Pendente: `npm run db:push` para criar as
> colunas `autor_id` / `autor_vendedor_id` em `ampmais_clients`.

## 1. Objetivo

Registrar, no cadastro do cliente, **quem criou o registro**: o usuário (`autorId → users`) e/ou o
vendedor (`autorVendedorId → sellers`). Hoje nenhum dos ~19 pontos de inserção em `clients` grava
autoria — o único sinal de proveniência é `canalAquisicao` (texto livre, inconsistente) e
`dataInsercao`.

## 2. Semântica decidida

| Campo | Significado |
| --- | --- |
| `autorId` | Usuário autenticado que criou o cadastro. Null quando a criação é de sistema (webhooks, cron, integrações, loja digital, scripts). |
| `autorVendedorId` | Vendedor no contexto do cadastro. Nos fluxos de atendimento (venda no dashboard, POI), é quem estava atendendo. Nas integrações, é o **primeiro vendedor conhecido** da venda canônica que originou o cliente — decisão: é a única informação disponível e melhor do que vazio. |

Conceitos vizinhos que permanecem separados:

- **Carteira** (`client_seller_references`, `rankingVinculo = 1`): derivada por cron do histórico de
  vendas; responde "de quem é o cliente hoje". Não muda.
- **Primeiro vendedor derivável** (`primeiraCompraId → sales.vendedorId`): continua derivável por
  join; `autorVendedorId` nas integrações materializa essa informação na criação, ciente de que
  backfills fora de ordem podem divergir da derivação.

## 3. Schema

```ts
// services/drizzle/schema/clients.ts
autorId: varchar("autor_id", { length: 255 }).references(() => users.id, { onDelete: "set null" }),
autorVendedorId: varchar("autor_vendedor_id", { length: 255 }).references(() => sellers.id, { onDelete: "set null" }),
```

- Ambos nullable + `set null`: variante mais recente do padrão de autoria (coupons, audiences,
  integrations, fiscal, productions, platform-partnerships) e coerente com o idioma de coluna dupla
  `operadorId → users` + `operadorVendedorId → sellers` (cashback, cupons, POS).
- Deleção de organização não é afetada: `lib/organizations/deletion.ts` deleta `clients` (L265)
  antes de `sellers` (L280); users não são deletados ali.
- Migration aditiva (duas colunas nullable) — segura para `db:push`.
- Relations: adicionar `autor` e `autorVendedor` em `clientsRelations`.
- Zod: campos entram no `ClientSchema`. `autorId` **nunca** vem do payload — sempre da sessão.
  `autorVendedorId` pode vir do payload em dois contextos (venda no dashboard e POI), sempre
  validado no servidor: vendedor existe, pertence à org e está `ativo`.
- **Backfill: nenhum.** Colunas valem apenas para registros novos; null = "sem autoria registrada
  / legado / sistema".
- **`origemCadastro` (enum de proveniência): fora do escopo** por enquanto.

## 4. Matriz de preenchimento — decisões por ponto de criação

### A. Dashboard (sessão Lucia)

| Ponto | autorId | autorVendedorId |
| --- | --- | --- |
| `POST /api/clients` — criação manual (clients-page) | `session.user.id` | fallback: `session.membership.usuarioVendedorId` |
| `POST /api/clients` — via `ClientVinculationMenu` no new-sale | `session.user.id` | **vendedor da venda** (`saleState.state.vendedorId`), fallback sessão |
| `POST /api/clients/bulk` (import CSV) | `session.user.id` | null |
| `POST /api/sales/bulk` (find-or-create de cliente) | `session.user.id` | null |

Racional do new-sale: no dia a dia os atendentes não trocam de usuário — o contexto confiável é o
vendedor selecionado na venda, não o vínculo da sessão. Implementação:

1. `POST /api/clients` passa a aceitar `autorVendedorId` opcional no input, validado no servidor
   (org + ativo); quando ausente, fallback `session.membership.usuarioVendedorId`; se nada, null.
2. `ClientVinculationMenu` ganha prop opcional `autorVendedorId?: string | null` e a inclui no
   payload de `createClient`. O new-sale passa `saleState.state.vendedorId`; os demais call sites do
   menu (ex.: fiscal-page) não passam nada → fallback sessão.
3. UX: se o vendedor ainda não foi selecionado no checkout quando o cliente é criado, vale o
   fallback da sessão — sem bloqueio, sem passo extra.

### B. POI (sem sessão Lucia)

| Ponto | autorId | autorVendedorId |
| --- | --- | --- |
| `new-client` (form de autocadastro) | null | **select "QUEM TE ATENDEU"** — ver §5 |
| `new-transaction` (criação implícita durante venda) | `operatorContext.usuario?.id` quando houver membership vinculada | vendedor do operador (`senhaOperador`) |
| `transaction-requests/public` → `approve` | usuário aprovador | vendedor aprovador |

### C–H. Caminhos de sistema — ambos null, exceto onde indicado

| Grupo | autorId | autorVendedorId |
| --- | --- | --- |
| Loja digital (`/api/shop/[orgId]/orders`) | null | null |
| Webhooks WhatsApp (5 caminhos + gateway + backfill) | null | null |
| Integrações (`sync-auxiliary-entities`) | **null** (decisão: autoria humana não existe; quem criou foi o pipeline) | **vendedor da venda canônica que originou o cliente**, quando o conector emite vendedores — hoje Online Software e Bling; iFood, Nuvemshop e Cardápio Web emitem `sellers: []` → null |
| Partner linkage (`linkPartnerToClient`) | o que o call site tiver (sessão / operador POI / nada) — threading §6.1 | idem |
| AI playground (`ensurePlaygroundClient`) | `session.user.id` | null |
| Scripts manuais (`utils/scripts/*`) | null | null |

## 5. POI — select "QUEM TE ATENDEU" (decidido: entra)

Decisão de produto: o form de autocadastro do POI **terá** o select de vendedores com imagem.
Requisitos derivados:

1. **Rota mínima pública de sellers** — novo endpoint (ex.:
   `GET /api/point-of-interaction/sellers`), resolvido via `resolvePoiActorContext` como as demais
   rotas POI (device-token com escopo próprio, ex. `poi:sellers:read`, + modo legado anônimo com
   telemetria). Retorna **apenas** `{ id, nome, avatarUrl }` de vendedores `ativo = true` da org.
   Nada de telefone, email ou `senhaOperador` no payload.
2. **Mitigações da exposição pública** (modo legado é anônimo, keyed por orgId na URL):
   payload mínimo (acima), cache curto, e rate limiting na rota — hoje nenhuma rota POI tem rate
   limit (`lib/access/rate-limit.ts` só é usado no enrollment); avaliar reaproveitá-lo aqui.
3. **UX do form**: select opcional com opção de pular ("NINGUÉM / NÃO SEI") para não travar a
   conversão no totem; grid de cards com avatar (fallback de iniciais quando `avatarUrl` null) +
   nome; kiosk e mobile.
4. **Wire**: `new-client/route.ts` aceita `autorVendedorId` opcional; validação server-side de que o
   vendedor pertence à org resolvida pelo actor context e está ativo (nunca confiar no id cru).
5. **Dado auto-declarado**: atribuição escolhida pelo cliente é menos confiável que a do operador
   (`senhaOperador`) — aceito como trade-off consciente; a carteira derivada corrige a atribuição
   comercial ao longo do tempo.

## 6. Pontos de implementação transversais

### 6.1 Threading de contexto de autoria

Pontos que criam cliente "de passagem" precisam receber autoria opcional. Definir um tipo único:

```ts
export type TClientAuthorship = { autorId?: string | null; autorVendedorId?: string | null };
```

- `linkPartnerToClient` (7 call sites: create/update de parceiro, POI new-transaction, bulk sales,
  sync-auxiliary-entities, 2 scripts) — cada call site passa o que tem.
- `resolveOrCreateClient` em `sales/bulk`.
- Inserts de cliente em `new-transaction` (POI) e no processamento de aprovação.

### 6.2 Integrações — resolução do vendedor

Em `sync-auxiliary-entities`, o cliente novo é criado a partir da venda canônica não resolvida. O
vendedor dessa venda (quando presente no batch) pode ter sido criado **no mesmo sync** — a resolução
de `autorVendedorId` deve ocorrer após o upsert de sellers (a ordem atual do pipeline já garante
sellers antes de clients; confirmar na implementação). Quando a mesma rodada traz várias vendas do
mesmo cliente novo, usar a venda mais antiga do batch (coerente com `primeiraCompraData`, que já é
calculada assim).

### 6.3 Exibição (escopo mínimo)

Relations `autor`/`autorVendedor` disponíveis para queries. Exibição na UI (perfil do cliente,
coluna em lista) fica fora desta entrega — decidir depois.

## 7. Fases

1. **Fase 1 — schema + caminhos autenticados**: colunas, relations, Zod, `db:push`;
   `/api/clients` (com `autorVendedorId` opcional validado + threading do vendedor da venda no
   `ClientVinculationMenu`/new-sale), `/api/clients/bulk`, `/api/sales/bulk`, playground,
   `linkPartnerToClient` + call sites autenticados.
2. **Fase 2 — POI**: autoria do operador em `new-transaction` e no approve; rota pública mínima de
   sellers (+ rate limit); select "QUEM TE ATENDEU" no form (kiosk + mobile); `new-client` aceita e
   valida `autorVendedorId`.
3. **Fase 3 — integrações**: `autorVendedorId` em `sync-auxiliary-entities` (Online Software e
   Bling), resolução via venda canônica mais antiga do batch.

## 8. Registro de decisões (2026-07-30)

1. Integrações usam o **primeiro vendedor** conhecido como `autorVendedorId` — única opção
   disponível, melhor que vazio. `autorId` fica **null** (sem lookup vendedor→usuário: autoria
   humana falsa, vínculo não-único e mutável).
2. New-sale usa o **vendedor da venda** com fallback para a sessão — atendentes não trocam de
   usuário no dia a dia.
3. POI: **select entra**, com rota mínima pública de sellers.
4. Imports em massa autenticados: `autorVendedorId` **null**.
5. **Sem backfill** de clientes existentes.
6. **Sem enum `origemCadastro`** por enquanto.
