# Plan — Organization slugs for public shop URLs

> **Status (2026-08-26):** Phases 1–3 are DONE and Phase 4 code is written, with its migration
> PENDING APPLICATION by the user.
>
> - Phase 1: column added via `drizzle/0080_organization_slug.sql`, applied with
>   `scripts/apply-sql-migration.ts` (not `db:push`, due to unrelated pending drift).
> - Phase 2: backfill applied to all 19 orgs; `npm run verify:organization-slugs` reports
>   0 nulls / 0 duplicates.
> - Phase 3: route is now `app/shop/[slug]/`, resolving by slug only (404 on miss); every
>   `/shop/...` link builder uses the slug. APIs stay keyed by org id.
> - Phase 4: schema is `.notNull()` + `uniqueIndex("idx_organizations_slug")` and Zod `slug` is
>   required, but **`drizzle/0081_organization_slug_not_null.sql` has NOT been applied yet** —
>   run it before deploying, or inserts/updates will diverge from the DB.

Goal: replace `/shop/{orgId}` (UUID) with `/shop/{slug}` as the public, shareable store URL.
No org is sharing shop links yet, so there is no backwards-compatibility concern: the route
becomes slug-only, with no UUID fallback or redirect.

## Current state (mapped)

- `organizations` has no slug and no unique index besides the PK
  (`services/drizzle/schema/organizations.ts`).
- **Only two insert sites**: self-service onboarding (`app/api/organizations/route.ts:211`) and
  admin creation (`app/api/admin/organizations/route.ts:169`).
- **Org self-edit**: `PUT /api/organizations` (`app/api/organizations/route.ts:578`), UI in
  `components/Settings/SettingsOrg.tsx`. Admin edit: `PUT /api/admin/organizations` +
  `AdminControlOrganization.tsx`.
- **Shop org resolution is a single seam**: `getShopCatalogData` in `lib/shop/catalog-data.ts:8`.
- **URL builders** (small surface): `app/dashboard/catalog/store/shop-page.tsx:22`,
  `.../components/ShopShareCard.tsx:18`, `app/shop/[orgId]/_components/CheckoutSheet.tsx:43`,
  `app/shop/[orgId]/pedidos/[token]/public-order-page.tsx` (3 back-links). No WhatsApp/email
  message embeds shop URLs today. POI QRs point at `/point-of-interaction/{orgId}` — out of scope.
- **Precedent**: `communityMaterials.slug` + migration `drizzle/0023` (slugify → ROW_NUMBER dedupe
  → NOT NULL + unique index) and `getUniqueCommunityMaterialSlug` in
  `app/api/admin/community/materials/route.ts`. Generic `formatAsSlug` exists in
  `lib/formatting.ts:62`.

## Key design decisions

### Routing: slug-only

Rename `app/shop/[orgId]/` → `app/shop/[slug]/`. The page resolves the org **by slug only**
(param lowercased before matching); unknown slug → 404. No UUID lookup, no redirect.

**The internal API layer stays keyed by org id.** The server page resolves slug → org once, and
`ShopProvider` keeps carrying the real `orgId`, so `app/api/shop/[orgId]/**` routes, client
queries in `lib/queries/shop.ts`, and mutations are untouched. Because the API route
`app/api/shop/[orgId]/catalog/route.ts` also calls `getShopCatalogData`, that function keeps its
org-id parameter; slug → id resolution is a separate small helper used by the pages.

`app/shop/[slug]/pedidos/[token]/page.tsx` and `opengraph-image.tsx` resolve the slug the same
way and pass the resolved `orgId` down.

### Slug rules

- Format: `^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])?$` (3–48 chars, lowercase, digits, single
  hyphens; stored normalized lowercase).
- Small reserved list (`admin`, `api`, `app`, `shop`, `pedidos`, …) for safety.
- Uniqueness is global. During the migration window it is enforced at the app layer
  (`getUniqueOrganizationSlug` + availability check); the DB unique index lands in the final
  phase together with NOT NULL.

### Migration sequencing

1. Add `slug` as a **nullable** column; new inserts auto-generate it.
2. Run the backfill for existing orgs and **verify** zero rows with `slug IS NULL`.
3. Only then rename the route to slug-only and switch the link builders (an org without a slug
   would otherwise have a dead shop page and `/shop/null` share links).
4. Finally flip the column to `.notNull()` + unique index and make it required in the Zod schema.

## Implementation steps

### Phase 1 — schema, helpers, write paths

1. **Schema**: add `slug: text("slug")` (nullable) to `services/drizzle/schema/organizations.ts`;
   `db:push` (purely additive, safe).
2. **Zod**: add `slug` to `OrganizationSchema` in `schemas/organizations.ts` with
   `required_error` / `invalid_type_error` messages + regex refinement; optional/nullable for now.
3. **New `lib/organizations/slug.ts`**:
   - `slugifyOrganizationName(nome)` — reuse/extend `formatAsSlug`.
   - `isValidOrganizationSlug(slug)` — format + reserved list.
   - `getUniqueOrganizationSlug({ base, excludeOrgId? })` — suffix `-2`, `-3`, … on collision
     (mirror `getUniqueCommunityMaterialSlug`).
   - `getOrganizationBySlug(slug)` — the shop-page resolver (selects the columns the shop needs,
     including `id`).
4. **Write paths** (2 inserts + 2 updates):
   - Onboarding create (`app/api/organizations/route.ts:211`): auto-generate a unique slug from
     `input.organization.nome` in the service function.
   - Admin create (`app/api/admin/organizations/route.ts:169`): same auto-generation; optionally
     an editable slug field in `NewOrganization.tsx`.
   - Org self-edit (`updateOrganization`, `app/api/organizations/route.ts:578`): accept `slug` in
     the partial input; normalize, validate format/reserved, check uniqueness excluding self,
     friendly Portuguese error ("Este endereço já está em uso.").
   - Admin edit (`app/api/admin/organizations/route.ts:256` + `AdminControlOrganization`):
     include `slug` — the PUT replaces the whole object, so omitting it would null it out.
   - Stripe/deal/fiscal update sites are untouched.
5. **Availability endpoint**: `GET /api/organizations/slug-availability?slug=...`
   (authenticated, App Router pattern) returning `{ data: { available, suggestion }, message }`;
   excludes the caller's own org. Used debounced by onboarding and settings UIs.
6. **Onboarding UI** (`app/onboarding/_components/GeneralInfoStage.tsx` +
   `use-organization-onboarding-state.tsx`): slug field auto-filled from `nome` until manually
   touched, rendered as a URL preview (`{origin}/shop/{slug}`), debounced availability check.
   The server still dedupes at insert, so a race gets a suffix instead of an error.
7. **Settings UI** (`components/Settings/SettingsOrg.tsx`, identity section): slug field with the
   same validation + availability check, plus a warning that changing it breaks previously
   shared links (no slug-history table in v1).

### Phase 2 — backfill + verify

8. `scripts/backfill-organization-slugs.ts`: for each org with `slug IS NULL`, slugify `nome`,
   dedupe with suffixes (deterministic order by `dataInsercao` so reruns are stable), update.
   Idempotent; logs a summary.
9. Verify: `SELECT count(*) FROM ampmais_organizations WHERE slug IS NULL` must be 0, and check
   for duplicates (`GROUP BY slug HAVING count(*) > 1`) before proceeding.

### Phase 3 — slug-only routing + links

10. Rename `app/shop/[orgId]/` → `app/shop/[slug]/`; update `page.tsx`,
    `pedidos/[token]/page.tsx`, and `opengraph-image.tsx` to resolve via
    `getOrganizationBySlug` (404 on miss) and pass the resolved `orgId` into `ShopPage` /
    `ShopProvider` for API calls.
11. `getShopCatalogData` selects `slug` in its organization columns; `ShopProvider` exposes it;
    `CheckoutSheet.tsx` redirect and `public-order-page.tsx` back-links build `/shop/{slug}/...`.
12. Dashboard: `app/dashboard/catalog/store/shop-page.tsx` and `ShopShareCard.tsx` build
    `/shop/{slug}` — slug comes from the org query (`useOrganization`) or gets added to the
    shop-settings payload.

### Phase 4 — tighten the schema

13. Flip the column to `.notNull()` and add `uniqueIndex("organizations_slug_unique")`;
    `db:push`. It will prompt on the NOT NULL change — review the statement (never accept a
    data-loss prompt blindly; per the drizzle workflow here, `db:push` is the real path and the
    journal is stale).
14. Make `slug` required (non-optional) in `OrganizationSchema` and in the create inputs.

### Later / optional

- Slug-change history table (redirect old slugs) if churn becomes a real problem.
- Extend slugs to `/point-of-interaction` URLs and POI QR codes.

## Test checklist

- `/shop/{slug}` renders; unknown slug → 404; uppercase param resolves (lowercased).
- Order checkout redirect and "voltar para a loja" links land on the slug URL.
- Onboarding creates an org with a slug; two orgs with the same name get `-2` suffix.
- Settings slug change: format rejection, taken-slug rejection, success updates share links.
- Admin edit does not wipe the slug.
- OG image works via slug.
- After Phase 4: inserting without a slug fails at the DB; duplicate slug fails with 23505
  mapped to a friendly message.
