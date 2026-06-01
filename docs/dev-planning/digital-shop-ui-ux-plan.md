# Digital Shop UI/UX Plan

## Summary

This plan covers the user-facing and staff-facing UI/UX for digital menus and digital catalogs.

It assumes `docs/dev-planning/digital-shop-operational-plan.md` has already been implemented. The UI/UX layer must consume the operational contracts defined there instead of redefining backend behavior.

All user-facing text must be Portuguese (Brazilian).

## Operational Preconditions

Before starting this plan, the following operational pieces should exist:

- `services/drizzle/schema/shop.ts`
- `schemas/shop.ts`
- `app/api/shop/[orgId]/catalog/route.ts`
- `app/api/shop/[orgId]/clients/lookup/route.ts`
- `app/api/shop/[orgId]/orders/route.ts`
- `app/api/shop/settings/route.ts`
- `app/api/shop/orders/route.ts`
- `lib/queries/shop.ts`
- `lib/mutations/shop.ts`
- `state-hooks/use-shop-order-state.tsx`
- shop metadata integration in sale checkout and confirmation

The UI should consume:

- `useShopCatalog`
- `useShopClientLookup`
- `useShopSettings`
- `useShopOrders`
- `createShopOrder`
- `updateShopSettings`
- `useShopOrderState`
- `shopSettings.configuracoes`
- shop orders from `sales.canal = "SHOP"`

## Public Shop Routes

Create:

- `app/shop/[orgId]/page.tsx`
- `app/shop/[orgId]/shop-page.tsx`
- `app/shop/[orgId]/loading.tsx`
- colocated components under `app/shop/[orgId]/_components/`

`page.tsx`:

- receives `params: Promise<{ orgId: string }>` following existing App Router conventions
- renders `ShopPage`
- can perform only lightweight server setup

`shop-page.tsx`:

- client component
- uses `useShopCatalog({ orgId })`
- initializes `ShopProvider`
- chooses `MenuModeView` or `CatalogModeView` from `shopSettings.modo`

## Public Shop Experience

Customer flow:

1. Customer opens `/shop/[orgId]`.
2. Customer sees organization header, cover image/video, logo, delivery capabilities, and product browsing UI.
3. Customer browses and adds items to cart without identifying.
4. Cart persists locally with key `shop-cart:${orgId}`.
5. Customer opens checkout.
6. Customer enters phone.
7. If client exists, checkout shows name and cashback balance.
8. If client does not exist, checkout requires name and keeps phone filled.
9. Customer selects `Retirada` or `Entrega`, based on enabled settings.
10. For delivery, customer fills structured address.
11. Customer optionally applies eligible cashback.
12. Customer reviews order and submits.
13. Success screen confirms the pending order and explains payment is in place.

Required Portuguese copy examples:

- Header delivery labels: `Retirada`, `Entrega`
- Cart button: `Ver carrinho`
- Checkout title: `Finalizar pedido`
- Identity prompt: `Informe seu telefone`
- Unknown client prompt: `Complete seus dados`
- Success title: `Pedido enviado`
- Payment note: `Pagamento no local`

## Cardapio Mode

`CARDAPIO` is optimized for food-service ordering.

Layout behavior:

- mobile-first, one-column flow
- compact sticky group navigation/search near the top
- sections for configured composition blocks
- product cards should prioritize:
  - image
  - product name
  - short group/context
  - price
  - quick add or configure action
- sticky floating cart button at the bottom

Sections:

- `EM_DESTAQUE`: only if enabled and products exist
- `MAIS_PEDIDOS`: only if enabled and products exist
- `GRUPOS_PRODUTOS`: inferred groups, always available when enabled

Item behavior:

- simple products can be added directly
- products with variants or add-ons open `ProductBuilderSheet`
- required add-ons are clearly marked
- quantity stepper is available before adding to cart

## Catalogo Mode

`CATALOGO` is optimized for ecommerce-like browsing.

Layout behavior:

- product grid with larger image emphasis
- category/search controls remain visible but less dominant than in menu mode
- product cards can show more catalog-like spacing
- cart behavior remains identical to `CARDAPIO`

Differences from `CARDAPIO`:

- group browsing can feel more like category filters
- featured and most-ordered blocks can render as horizontal rails
- product details can use a more visual product sheet

Do not fork operational logic. Both modes must use the same product data, cart state, item builder logic, checkout flow, and order mutation.

## Cart UX

Create `CartSheet`.

Cart requirements:

- show item rows with:
  - item name
  - variant name when present
  - selected modifiers
  - quantity controls
  - line total
- allow quantity updates
- allow item removal
- show subtotal
- show requested cashback once applied
- show final estimated total
- primary action: `Finalizar pedido`
- empty state: `Seu carrinho esta vazio.`

Cart persistence:

- cart hydrates from `useShopOrderState`
- stale product prices are not trusted; final order API recalculates
- cart clears only after successful order

## Product Builder UX

Create `ProductBuilderSheet`.

Use the existing POS builder behavior as reference:

- variant selector
- add-on groups
- radio behavior when max is 1
- checkbox/counter behavior for multi-select
- min/max validation messaging
- quantity stepper
- live total
- final action: `Adicionar ao carrinho`

Do not use a large desktop modal for mobile. Use a bottom sheet/drawer pattern.

## Checkout UX

Create `CheckoutSheet` with steps:

1. `Cliente`
2. `Entrega`
3. `Cashback`
4. `Revisao`

Step 1: customer identity

- phone input first
- lookup through `useShopClientLookup`
- if found, show customer confirmation card
- if not found, require name
- keep CPF/CNPJ optional

Step 2: delivery

- render only enabled settings:
  - `Retirada`
  - `Entrega`
- if only one mode is enabled, preselect it
- if `Entrega`, show structured address fields
- if `Retirada`, show organization address summary when available

Step 3: cashback

- available only when a client and eligible cashback program exist
- show balance and max applicable value
- allow customer to apply less than max
- show clear disclaimer that final approval happens when the store confirms the order

Step 4: review

- customer name and phone
- delivery mode/address
- item summary
- subtotal
- cashback requested
- final estimated total
- payment note: `Pagamento no local`
- submit button: `Enviar pedido`

## Cashback UX

Cashback copy should avoid implying funds are already consumed.

Recommended labels:

- `Saldo disponivel`
- `Usar cashback`
- `Desconto solicitado`
- `A loja confirmara o desconto ao aceitar o pedido.`

If balance changes between lookup and submit, show API error from backend.

## Order Success UX

After successful `createShopOrder`:

- clear cart
- show order number
- show payment-in-place note
- show pickup/delivery summary
- offer actions:
  - `Fazer novo pedido`
  - `Voltar ao cardapio` or `Voltar ao catalogo`

Do not add order tracking or WhatsApp auth in v1.

## Dashboard Shop Page

Create:

- `app/dashboard/commercial/shop/page.tsx`
- `app/dashboard/commercial/shop/shop-page.tsx`
- `app/dashboard/commercial/shop/components/ShopSettingsPanel.tsx`
- `app/dashboard/commercial/shop/components/ShopOrdersQueue.tsx`
- `app/dashboard/commercial/shop/components/ShopShareCard.tsx`

Add sidebar item under `Comercial`:

- title: `Loja Digital`
- URL: `/dashboard/commercial/shop`
- icon: `Store` or `ShoppingBag` from `lucide-react`

`page.tsx`:

- server component
- requires authenticated membership
- renders `ShopPage`

`shop-page.tsx`:

- client component
- uses `useShopSettings`
- uses `useShopOrders`
- saves settings with `updateShopSettings`

## Staff Settings UX

`ShopSettingsPanel` sections:

- status:
  - active toggle
  - public link preview
- mode:
  - segmented control: `Cardapio`, `Catalogo`
- cover:
  - URL input
  - type selector: `Imagem`, `Video`
  - preview area
- operation:
  - toggles: `Aceita retirada`, `Aceita entrega`
  - prevent saving when both are off
- products:
  - mode selector:
    - `Todos ativos`
    - `Incluir selecionados`
    - `Excluir selecionados`
  - product selector for `produtoIds`
  - helper text changes by mode
- composition:
  - enable/order blocks:
    - `Em destaque`
    - `Mais pedidos`
    - `Grupos de produtos`
- featured products:
  - product selector for `produtosEmDestaqueIds`

Use existing inputs/components where practical. Keep all labels in Portuguese.

## Staff Order Queue

`ShopOrdersQueue` requirements:

- list pending shop orders from `useShopOrders`
- show:
  - order number
  - customer name
  - phone
  - delivery mode
  - total
  - item count
  - requested cashback
  - created date/time
- primary action links to:
  - `/dashboard/commercial/sales/checkout/${saleId}`
- optional secondary action:
  - view sale detail

The queue should not implement a separate acceptance flow. Staff acceptance is the existing sale checkout/confirmation flow.

## Component Architecture

Use React composition patterns:

- avoid boolean prop proliferation
- use explicit variants:
  - `MenuModeView`
  - `CatalogModeView`
- use provider for shared shop state:
  - `ShopProvider`
- keep product card, builder, cart, and checkout reusable across both modes

Recommended public components:

- `ShopProvider`
- `ShopShell`
- `ShopHeader`
- `ShopComposition`
- `MenuModeView`
- `CatalogModeView`
- `FeaturedSection`
- `MostOrderedSection`
- `ProductGroupSection`
- `ProductCard`
- `ProductBuilderSheet`
- `CartSheet`
- `CheckoutSheet`
- `CustomerIdentityStep`
- `DeliveryStep`
- `CashbackStep`
- `OrderReviewStep`
- `OrderSuccessView`

Recommended dashboard components:

- `ShopSettingsPanel`
- `ShopProductsModeControl`
- `ShopCompositionBlocksControl`
- `ShopFeaturedProductsControl`
- `ShopOrdersQueue`
- `ShopShareCard`

## Visual Direction

Use the Paper file `RECOMPRACRM` as reference.

Known relevant artboards:

- `SHOP - STORE HUB`
- `SHOP - ITEM VARIANTS`
- `SHOP - CART`

The previous deep read/export was blocked by the local Pencil app connection. Before UI implementation, retry Paper/Pencil export if available and align the UI with those artboards.

Design constraints:

- mobile-first
- polished ordering experience, not a landing page
- organization colors mapped to CSS variables
- no decorative card-heavy marketing layout
- no visible instructional text that explains obvious UI mechanics
- use lucide icons for actions where available
- keep text readable and non-overlapping on mobile

## Responsive Behavior

Mobile:

- primary target
- sticky bottom cart action
- bottom sheets for product builder, cart, and checkout
- category navigation must remain tappable and not obscure content

Desktop:

- centered shop viewport or responsive catalog grid
- cart can remain a side panel or sheet
- dashboard settings should use practical admin layout, not a marketing-style page

## UI Acceptance Criteria

Public shop:

- `/shop/[orgId]` loads active shop catalog.
- Inactive shop shows a clear unavailable state.
- `CARDAPIO` and `CATALOGO` use different views but same cart/checkout logic.
- Product groups, featured products, and most ordered products render according to settings.
- Simple products can be added directly.
- Products with variants/add-ons open the builder.
- Required add-ons block adding until valid.
- Cart persists across reload for the same org.
- Cart does not leak across org IDs.
- Checkout requires phone.
- Unknown phone requires name.
- Delivery fields appear only for `Entrega`.
- Cashback step appears only when eligible.
- Order success clears the cart.

Dashboard:

- `/dashboard/commercial/shop` loads settings.
- Settings can be saved through `updateShopSettings`.
- Product mode control supports `ATIVOS`, `INCLUIR`, and `EXCLUIR`.
- Share card copies `/shop/${orgId}`.
- Order queue lists only shop orders for the current organization.
- Queue links each pending order to existing sale checkout.

Run after UI implementation:

- `npm run lint`
- `npm run build`
- manual browser check on public shop mobile viewport
- manual browser check on dashboard shop page

## Assumptions

- Operational APIs already enforce tenant safety, price recalculation, product visibility, and cashback limits.
- UI does not implement online payment.
- UI does not implement WhatsApp code authentication.
- Staff order acceptance remains in the existing sale checkout flow.
- All final copy is Portuguese (Brazilian), even if planning docs are written in English.
