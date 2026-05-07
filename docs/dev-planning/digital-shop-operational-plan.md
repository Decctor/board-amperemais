# Digital Shop Operational Plan

## Summary

This plan covers the operational foundation for digital menus and digital catalogs under `/shop/[orgId]`.

It includes database schema, Zod schemas, backend endpoints, order lifecycle, catalog filtering, cashback handling, state hooks, queries, mutations, and acceptance tests. It intentionally excludes final UI layout and interaction details; those are covered by `docs/dev-planning/digital-shop-ui-ux-plan.md`.

The operational implementation must be completed first. The UI/UX implementation can then consume the routes, types, queries, mutations, and state hook defined here.

## Execution Order

1. Add enums and `shopSettings` schema.
2. Add Zod schemas for settings, public catalog, checkout, and order creation.
3. Add public shop APIs.
4. Add staff settings and order queue APIs.
5. Add query and mutation wrappers.
6. Add `use-shop-order-state.tsx`.
7. Integrate shop draft metadata into sale confirmation and cashback validation.
8. Run backend and type checks before UI work starts.

## Decisions Locked

- Public route will be `/shop/[orgId]`.
- The first public identifier is the organization ID. Custom slugs are out of scope.
- Shop settings use a dedicated table with a flexible `configuracoes` JSONB column.
- Checkout creates a pending sale draft: `sales.status = "ORCAMENTO"` and `sales.canal = "SHOP"`.
- Payment is always in place in v1. No online payment collection is implemented.
- Browsing and cart usage are anonymous.
- Checkout is phone-first. If phone is unknown, require the customer's name and create a client.
- Delivery addresses are structured and saved through `clientLocations`.
- Cashback redemption is only consumed during staff confirmation, not during public checkout.
- Product catalog modes are `ATIVOS`, `INCLUIR`, and `EXCLUIR`.

## Database Changes

Add enums to `services/drizzle/schema/enums.ts`:

```ts
export const shopModeEnum = pgEnum("shop_mode", ["CARDAPIO", "CATALOGO"]);
export const shopProductsModeEnum = pgEnum("shop_products_mode", ["ATIVOS", "INCLUIR", "EXCLUIR"]);
export const shopHeaderCoverTypeEnum = pgEnum("shop_header_cover_type", ["IMAGEM", "VIDEO"]);
export const shopCompositionBlockTypeEnum = pgEnum("shop_composition_block_type", [
  "GRUPOS_PRODUTOS",
  "EM_DESTAQUE",
  "MAIS_PEDIDOS",
]);
```

Create `services/drizzle/schema/shop.ts` and export it from `services/drizzle/schema/index.ts`.

`shopSettings` fixed columns:

- `id`
- `organizacaoId`, unique, cascade FK to `organizations.id`
- `ativo`, default `false`
- `modo`, enum `CARDAPIO | CATALOGO`, default `CARDAPIO`
- `configuracoes`, jsonb typed as `TShopSettingsConfiguration`
- `dataInsercao`
- `dataAtualizacao`

Recommended Drizzle shape:

```ts
export const shopSettings = newTable(
  "shop_settings",
  {
    id: varchar("id", { length: 255 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizacaoId: varchar("organizacao_id", { length: 255 })
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull()
      .unique(),
    ativo: boolean("ativo").notNull().default(false),
    modo: shopModeEnum("modo").notNull().default("CARDAPIO"),
    configuracoes: jsonb("configuracoes").$type<TShopSettingsConfiguration>().notNull(),
    dataInsercao: timestamp("data_insercao").defaultNow().notNull(),
    dataAtualizacao: timestamp("data_atualizacao").$defaultFn(() => new Date()),
  },
  (table) => ({
    organizacaoIdx: index("idx_shop_settings_organizacao").on(table.organizacaoId),
    ativoIdx: index("idx_shop_settings_ativo").on(table.ativo),
  }),
);
```

`TShopSettingsConfiguration`:

```ts
export type TShopSettingsConfiguration = {
  headerCoverUrl: string | null;
  headerCoverTipo: "IMAGEM" | "VIDEO" | null;
  aceitaRetirada: boolean;
  aceitaEntrega: boolean;
  produtos: {
    modo: "ATIVOS" | "INCLUIR" | "EXCLUIR";
    produtoIds: string[];
  };
  produtosEmDestaqueIds: string[];
  blocosComposicao: Array<{
    tipo: "EM_DESTAQUE" | "MAIS_PEDIDOS" | "GRUPOS_PRODUTOS";
    ativo: boolean;
    ordem: number;
  }>;
};
```

Default configuration:

```ts
{
  headerCoverUrl: null,
  headerCoverTipo: null,
  aceitaRetirada: true,
  aceitaEntrega: false,
  produtos: {
    modo: "ATIVOS",
    produtoIds: [],
  },
  produtosEmDestaqueIds: [],
  blocosComposicao: [
    { tipo: "EM_DESTAQUE", ativo: true, ordem: 1 },
    { tipo: "MAIS_PEDIDOS", ativo: true, ordem: 2 },
    { tipo: "GRUPOS_PRODUTOS", ativo: true, ordem: 3 },
  ],
}
```

Do not create a separate order table in v1. Orders are represented by existing `sales`, `saleItems`, and `saleItemModifiers`.

## Zod Schemas

Add shop enums to `schemas/enums.ts`:

- `ShopModeEnum`
- `ShopProductsModeEnum`
- `ShopHeaderCoverTypeEnum`
- `ShopCompositionBlockTypeEnum`

Create `schemas/shop.ts`:

- `ShopCompositionBlockSchema`
- `ShopProductsConfigurationSchema`
- `ShopSettingsConfigurationSchema`
- `ShopSettingsSchema`
- `ShopCartItemModifierSchema`
- `ShopCartItemSchema`
- `ShopCustomerSchema`
- `ShopDeliverySchema`
- `CreateShopOrderInputSchema`

Validation requirements:

- `aceitaRetirada` and `aceitaEntrega`: at least one must be true.
- `produtos.produtoIds`: must be a string array, default `[]`.
- `produtos.modo = "INCLUIR"` should accept an empty `produtoIds` array at schema level but the settings API should warn or reject depending on product decision. Recommended: reject empty list for `INCLUIR`.
- `ENTREGA` requires structured address fields.
- `RETIRADA` does not require address fields.
- Every field should include `required_error` and `invalid_type_error` where applicable, following repo conventions.
- All messages must be Portuguese (Brazilian).

## Product Catalog Modes

All product modes start from tenant-safe queries scoped to `organizacaoId`.

Base eligible catalog:

- `products.organizacaoId = orgId`
- `products.ativo = true`
- `products.precoVenda` exists and is greater than `0`
- if stock tracking applies, product or variant must have `quantidade > 0`
- only active variants are returned
- only active add-on groups/options are returned

Mode behavior:

- `ATIVOS`: use the base eligible catalog.
- `INCLUIR`: use products whose IDs are in `configuracoes.produtos.produtoIds`, while still enforcing active, priced, tenant-safe, and stock-safe constraints.
- `EXCLUIR`: use the base eligible catalog minus products whose IDs are in `configuracoes.produtos.produtoIds`.

Order submission must enforce the same catalog mode server-side. A hidden or unpublished product cannot be ordered by manipulating the client payload.

## Public Shop APIs

Create endpoints under `app/api/shop/[orgId]/`.

### `GET /api/shop/[orgId]/catalog`

No auth.

Response:

- organization:
  - `id`
  - `nome`
  - `logoUrl`
  - `telefone`
  - location summary
  - `corPrimaria`
  - `corPrimariaForeground`
  - `corSecundaria`
  - `corSecundariaForeground`
- shop settings:
  - `ativo`
  - `modo`
  - `configuracoes`
- cashback summary:
  - active program ID
  - `terminologia`
  - whether discount redemption is allowed
  - limit type/value
- product groups inferred from visible products
- visible products with variants and add-ons
- composition blocks:
  - `EM_DESTAQUE`: manual products from `produtosEmDestaqueIds`
  - `MAIS_PEDIDOS`: top products by confirmed sale items for the organization, recommended default period of 90 days
  - `GRUPOS_PRODUTOS`: inferred from `products.grupo`

If shop is inactive, return a controlled response or 404. Recommended: return 404 with "Loja digital indisponivel."

### `POST /api/shop/[orgId]/clients/lookup`

No auth.

Input:

- `telefone`

Response:

- `cliente`: limited fields if found:
  - `id`
  - `nome`
  - `telefone`
- cashback balances and program metadata if found

Do not return private client data beyond checkout needs.

### `POST /api/shop/[orgId]/orders`

No auth.

Input:

- customer:
  - `telefone`
  - `nome`, required when no matching client exists
  - optional `cpfCnpj`
- delivery:
  - `modalidade`: `RETIRADA | ENTREGA`
  - address fields required only for `ENTREGA`
- cart items:
  - `produtoId`
  - optional `produtoVarianteId`
  - quantity
  - selected modifier option IDs and quantities
- `cashbackResgateSolicitado`
- `observacoes`

Processing:

1. Load organization and active shop settings.
2. Reject if shop is inactive.
3. Validate delivery mode against `configuracoes.aceitaRetirada` and `configuracoes.aceitaEntrega`.
4. Lookup client by normalized phone.
5. If not found, create a new client with `canalAquisicao = "LOJA DIGITAL"`.
6. For `ENTREGA`, create or reuse a `clientLocations` row for the client and organization.
7. Re-fetch all products, variants, add-ons, and add-on references from DB.
8. Enforce catalog mode.
9. Recalculate prices server-side. Client-side prices are display snapshots only.
10. Validate required add-on groups, max options, and option quantities.
11. Validate requested cashback:
    - active cashback program exists
    - program allows discount modality
    - available balance covers requested amount
    - fixed or percentage redemption limit is respected
12. Insert `sales` with:
    - `organizacaoId`
    - `clienteId`
    - `idExterno = SHOP-${Date.now()}`
    - `valorTotal = item subtotal - requested cashback`
    - `descontosTotal = cashbackResgateSolicitado || null`
    - `custoTotal`
    - `vendedorNome = "Loja Digital"`
    - `parceiro = ""`
    - fiscal placeholder fields matching current POS draft conventions
    - `canal = "SHOP"`
    - `processamentoOrigem = "INTERNO"`
    - `status = "ORCAMENTO"`
    - delivery fields
    - `rascunhoMetadados.shop`
13. Insert `saleItems`.
14. Insert `saleItemModifiers`.

`rascunhoMetadados.shop` should include:

```ts
{
  origem: "SHOP";
  modo: "CARDAPIO" | "CATALOGO";
  subtotalItens: number;
  cashbackResgateSolicitado: number;
  cashbackProgramaId: string | null;
  pagamento: {
    tipo: "NO_LOCAL";
    descricao: string;
  };
  entrega: {
    modalidade: "RETIRADA" | "ENTREGA";
  };
  criadoEm: string;
}
```

Return:

```ts
{
  data: {
    saleId: string;
    orderNumber: string;
  };
  message: "Pedido enviado com sucesso.";
}
```

Do not process payment, accounting, stock deduction, fiscal emission, or cashback redemption in this endpoint.

## Staff APIs

### `GET /api/shop/settings`

Authenticated org member.

Returns current settings or default settings if no row exists.

### `PUT /api/shop/settings`

Authenticated org member.

Upserts `shopSettings`.

Validation:

- At least one delivery option is enabled.
- Product IDs in `configuracoes.produtos.produtoIds` belong to the organization.
- Product IDs in `produtosEmDestaqueIds` belong to the organization.
- `INCLUIR` with empty `produtoIds` is rejected.

### `GET /api/shop/orders`

Authenticated org member.

Lists shop-created sales:

- default `status = "ORCAMENTO"`
- `sales.canal = "SHOP"`
- `sales.organizacaoId = session.membership.organizacao.id`

Support:

- pagination
- optional `status`
- optional search by client name/phone or `idExterno`

Include:

- sale ID
- `idExterno`
- status
- client
- delivery mode/location
- item count
- total
- requested cashback metadata
- insertion date

## Order Lifecycle

Public checkout creates a draft sale:

- `sales.status = "ORCAMENTO"`
- `sales.canal = "SHOP"`

Staff accepts or rejects later:

- accept: use existing dashboard checkout/confirmation flow
- reject/cancel: use existing draft cancellation flow, possibly exposed from the shop order queue

The existing sale confirmation flow remains responsible for:

- payment registration
- accounting entries
- stock deduction
- cashback redemption
- fiscal document emission

## Cashback Handling

Checkout behavior:

- Customer can request a cashback discount only after phone identification.
- Endpoint validates current balance and redemption limits.
- Requested cashback is stored in `sales.descontosTotal` and `rascunhoMetadados.shop`.
- No balance is consumed at checkout.

Confirmation behavior:

- During staff confirmation, revalidate the requested cashback.
- If balance or rules changed, return a clear Portuguese error and keep sale as `ORCAMENTO`.
- If valid, call the existing FIFO redemption flow through sale confirmation.

## State Hook

Create `state-hooks/use-shop-order-state.tsx`.

State:

- `orgId`
- `mode`
- `cart.items`
- `customer`
- `delivery`
- `cashback`
- `checkoutStep`
- `lastOrder`

Actions:

- `addItem`
- `updateItemQuantity`
- `removeItem`
- `clearCart`
- `updateCustomer`
- `updateDelivery`
- `updateCashback`
- `nextStep`
- `previousStep`
- `resetCheckout`
- `hydrateFromStorage`
- `resetState`

Persistence:

- localStorage key: `shop-cart:${orgId}`
- version: `1`
- persist only cart and lightweight checkout draft fields
- clear cart after successful order

This hook is part of the operational contract because the UI/UX layer will consume it directly.

## Queries And Mutations

Create `lib/queries/shop.ts`:

- `useShopCatalog({ orgId })`
- `useShopClientLookup({ orgId, phone })`
- `useShopSettings()`
- `useShopOrders(params)`

Each hook should expose `queryKey`.

Create `lib/mutations/shop.ts`:

- `createShopOrder`
- `updateShopSettings`

Mutations are plain async functions. Do not import React Query hooks in mutation files.

## Confirmation Flow Integration

Update the existing dashboard sale checkout flow so shop metadata is respected:

- When loading a draft sale, inspect `sale.rascunhoMetadados.shop`.
- Prefill requested cashback when present.
- Prefill delivery mode/location from the sale.
- Show metadata to staff through the later UI implementation.

Update confirmation validation:

- revalidate requested cashback before calling `applyCashbackRedemptionFIFO`
- fail cleanly if stale
- do not change sale status when validation fails

## Testing And Acceptance Criteria

Run:

- `npm run lint`
- `npm run build`

Backend scenarios:

- Settings default when no row exists.
- Settings reject both delivery modes disabled.
- Settings reject `INCLUIR` with empty `produtoIds`.
- Settings reject product IDs from another organization.
- Catalog mode `ATIVOS` returns active, priced, stock-safe products.
- Catalog mode `INCLUIR` returns only selected eligible products.
- Catalog mode `EXCLUIR` returns base eligible catalog minus selected product IDs.
- Hidden/unpublished products are rejected at order submission.
- Inactive shop rejects catalog/order access.
- Unknown phone creates a client.
- Existing phone reuses client.
- Delivery order creates or reuses client location.
- Pickup order does not require address.
- Required add-on groups are enforced server-side.
- Add-on max quantities are enforced server-side.
- Cashback above balance rejects at checkout.
- Cashback above fixed/percentage limit rejects at checkout.
- Successful checkout creates `sales.status = "ORCAMENTO"` and `sales.canal = "SHOP"`.
- Successful checkout writes sale items and item modifiers.
- Sale confirmation consumes cashback only at confirmation.
- Stale cashback balance fails confirmation without confirming sale.
- Shop orders API only lists current organization orders.

## Assumptions

- Product visibility is based on existing `products`, `productVariants`, `productAddOns`, `productAddOnOptions`, and `productAddOnReferences`.
- No new product group table is introduced in v1; `products.grupo` remains the group source.
- No online payment provider integration is included.
- Staff confirmation remains the operational source of truth for payment, stock, accounting, fiscal, and cashback side effects.
- WhatsApp authentication codes are explicitly out of scope for this implementation.
