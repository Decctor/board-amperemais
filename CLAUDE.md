# CLAUDE.md — Codebase Patterns & Conventions

This file documents the architectural patterns, conventions, and "tastes" of this codebase. Follow these patterns when writing new code.

Related docs, read as needed (not duplicated here):

- **`AGENTS.md`** — step-by-step checklist for building a new admin feature end-to-end, common-mistakes list, key utility/component reference tables.
- **`PRODUCT.md`** — what the product does (modules, marketing automation, cashback/loyalty, POS).
- **`DESIGN.md`** — visual design system (color, typography, elevation, component styling rules).
- **`docs/`** — point-in-time design docs and migration plans for specific modules (fiscal engine, coupons, productions, sales sessions, WhatsApp templates, AI SDK v6 migration, etc.). Check here first when working inside one of those modules.

---

## Overview

**RecompraCRM** (package name `ampere-mais`) is a multi-tenant SaaS CRM/loyalty/marketing-automation platform for local retail businesses, combining BI dashboards, RFM-based customer segmentation, automated WhatsApp campaigns, a cashback loyalty program, a tablet point-of-interaction (POS) UI, fiscal document emission, purchasing/production/stock management, and an AI agent layer. See `PRODUCT.md` for the full feature breakdown.

Every organization (`organizacaoId`) is a tenant. Almost everything reads/writes are scoped to a tenant; see "Multi-Tenancy, Auth & Permissions" below before writing any query.

---

## Tech Stack

- **Framework**: Next.js 16 (App Router), React 19, React Compiler enabled (`reactCompiler: true` in `next.config.mjs`)
- **Database**: PostgreSQL via Supabase, Drizzle ORM (`postgres-js` driver)
- **Auth**: Lucia-style session cookies (`lib/authentication/session.ts`), Google OAuth + magic link + email/password, `admin: boolean` flag on users for platform admin access, org-scoped `organizationMembers` with granular `permissoes` (see below)
- **UI**: Tailwind CSS v4, Radix UI, shadcn/ui (`components.json`, style `radix-maia`)
- **State**: Custom `useState` + `useCallback` hooks (no react-hook-form)
- **Data fetching**: React Query (`@tanstack/react-query`) + Axios
- **Validation**: Zod
- **AI**: Vercel AI SDK (`ai` v6) — `ToolLoopAgent`, AI Gateway (`gateway("openai/...")`), structured `Output.object` — used for the marketing agent, AI hints, and the WhatsApp customer-service agent (see "AI & Automation Modules")
- **Video**: Mux (`@mux/mux-node` server, `@mux/mux-player-react` client)
- **File storage**: Supabase Storage
- **Payments**: Stripe
- **Rich text**: Tiptap v3
- **Toasts**: Sonner
- **Icons**: lucide-react
- **Lint/format**: `oxlint` + `oxfmt` (not ESLint/Prettier, despite `eslint`/`eslint-config-next` still being present as dependencies) — tabs, double quotes, 150 char width (`.oxfmtrc.json`)
- **Dead-code detection**: `knip`

---

## Codebase Structure

```
app/
  (admin)/admin-dashboard/   Platform-admin-only area (see "Admin Page Conventions")
  (external)/                Public, unauthenticated pages (community, POI display, sales-campaign landing, presentation)
  (brand-marketing)/         Marketing site (blog, features, partnerships)
  (legal)/                   Legal/compliance pages (data-deletion, terms)
  dashboard/                 Main authenticated org app (commercial, operational, team, settings, ai-hints, communication)
  partner-dashboard/         Partner-facing authenticated area
  onboarding/                Org onboarding flow
  shop/[orgId]/              Public digital storefront for an organization
  auth/                      signin, signup, google, magic-link, invites, logout, switch-organization
  api/                       All API routes (see "API Route Conventions")
services/drizzle/schema/     Drizzle table definitions, one file per domain, barrel-exported via index.ts
schemas/                     Zod schemas, one file per domain, enums centralized in enums.ts
lib/queries/                 React Query hooks (client-side reads)
lib/mutations/                Axios mutation wrappers (client-side writes)
lib/authentication/          Session, OAuth, magic link, pages-session (legacy) helpers
lib/db-utils/                Transaction-scoped batch helpers (child row processing, unique-violation checks)
lib/ai/                      AI agent, AI hints, marketing agent, AI media processing (see below)
lib/<domain>/                Business logic per domain (campaigns, cashback, fiscal, purchase-processing, stock, sales, whatsapp, integrations, data-connectors, ...)
state-hooks/                 Client-side form state hooks, one per entity
components/Modals/Internal/  Create/edit modals, one folder per domain
components/<Domain>/         Feature components (Sales, Clients, PointOfInteraction, RFMAnalysis, Chats, ...)
scripts/                     One-off / operational tsx scripts (backfills, syncs, test harnesses) run via `tsx`
config/                      App-wide constants and defaults (default permissions, RFM thresholds, onboarding presets)
docs/                        Design docs and migration plans (see above)
```

Key architectural split: `app/(admin)/admin-dashboard` is for **platform** admins (the SaaS operator), while `app/dashboard` is the **org-scoped** app that regular tenant users/sellers use day to day. Don't confuse the two "admin" concepts — a user can be `admin: true` (platform admin) independently of their org `permissoes`.

---

## Multi-Tenancy, Auth & Permissions

- Auth session (`getCurrentSession` / `getCurrentSessionUncached` from `lib/authentication/session.ts`) returns `{ session, user, membership }`. `membership` is `null` until the user has joined/created an org; `membership.organizacao.id` is the **tenant id** (`organizacaoId`) and `membership.permissoes` is the per-module permission grid (see `DEFAULT_ORGANIZATION_OWNER_PERMISSIONS` in `config/index.ts` for the shape — modules like `vendas`, `compras`, `fiscal`, `resultados`, `atendimentos`, `usuarios`, `empresa`, each with boolean actions).
- **Every service function that touches org data must scope its query by `organizacaoId`** — pull it from `session.membership.organizacao.id`, never trust a client-supplied org id. Throw `createHttpError.Unauthorized`/`Forbidden` if `session` or `session.membership` is missing.
- Row ownership checks combine `eq(table.id, id)` **and** `eq(table.organizacaoId, organizationId)` in the same `where` — never check `id` alone, so tenants can't reach each other's rows via guessed ids.
- Child-row batch writes go through `handleSimpleChildRowsProcessing()` (org-scoped) or `handleAdminSimpleChildRowsProcessing()` (platform-admin, no org scoping) from `lib/db-utils/index.ts` — pick the one matching the caller's context.
- Platform-admin-only routes gate on `session.user.admin`, not on `membership`/`permissoes`.
- `app/dashboard/layout.tsx` is the canonical example of the org-app guard: redirect to `/auth/signin` if no session, `/onboarding` if no `membership` or the org hasn't finished onboarding (`dataOnboardingConclusao`).

---

## Database Schema Conventions

**Location**: `/services/drizzle/schema/` (one file per domain)

- Use `newTable` from `./common.ts` (prefixes tables with `ampmais_`)
- Primary keys: `varchar("id", { length: 255 })` with `.$defaultFn(() => crypto.randomUUID())`
- Timestamps: `timestamp("data_insercao").defaultNow().notNull()`
- Portuguese field names in snake_case for DB columns (e.g., `titulo`, `descricao`, `nivel_acesso`)
- camelCase for Drizzle field names (e.g., `nivelAcesso`, `dataInsercao`)
- Foreign keys use `onDelete: "cascade"` where appropriate
- Export `relations`, inferred types (`$inferSelect`, `$inferInsert`), and barrel-export from `schema/index.ts`
- **Enums (Drizzle `pgEnum`)** go in `schema/enums.ts`, not co-located with the table file
- Tenant-owned tables include an `organizacaoId` column referencing `organizations` — required for anything reachable from org-scoped API routes

---

## Zod Schema Conventions

**Location**: `/schemas/` (one file per domain)

- Every field should have explicit `required_error` and `invalid_type_error` messages
- **Enums (Zod `z.enum`)** go in `/schemas/enums.ts`, not co-located with entity schemas
- Export both the schema and the inferred type: `export const FooEnum = z.enum([...])` + `export type TFooEnum = z.infer<typeof FooEnum>`
- Date fields use `.string().datetime().transform(val => new Date(val))` pattern
- Include `dataInsercao` and computed fields in base schemas, then use `.omit()` in API input schemas to remove them

---

## API Route Conventions

**Location**: `/app/api/` (App Router)

### Migration standard

- New and migrated API routes must live under `/app/api/**/route.ts`; do not add new `pages/api` routes.
- Route files follow four parts in order: input schema, service function, route handler, method export.
- Input/output type names use the operation verb and resource: `TGetSalesInput`, `TCreateSaleOutput`, `TUpdateProductInput`, `TDeleteGoalOutput`.
- Service functions receive typed `input` and `session` when authenticated, do all business/database work (org-scoped per "Multi-Tenancy" above), and never read `NextRequest`, cookies, or return `NextResponse`.
- Route handlers read the session with `getCurrentSessionUncached` from `@/lib/authentication/session`, parse query/body input, delegate to the service, and return `NextResponse.json`.
- Export handlers through `appApiHandler`; do not use `apiHandler`, `NextApiRequest`, `NextApiResponse`, or `@/lib/authentication/pages-session` in App Router routes.
- Client query/mutation types must import from `@/app/api/**/route`, never from `@/pages/api/**`.

### GET query params

Parse raw query params as strings in the route handler and transform them in the Zod input schema:

```typescript
const GetFoosInputSchema = z.object({
	page: z
		.string({ invalid_type_error: "Tipo inválido para página." })
		.optional()
		.nullable()
		.transform((v) => (v ? Number(v) : 1)),
	ids: z
		.string({ invalid_type_error: "Tipo inválido para IDs." })
		.optional()
		.nullable()
		.transform((v) => (v ? v.split(",") : [])),
	activeOnly: z
		.string({ invalid_type_error: "Tipo inválido para ativo." })
		.optional()
		.nullable()
		.transform((v) => v === "true"),
	periodAfter: z
		.string({ invalid_type_error: "Tipo inválido para período." })
		.optional()
		.nullable()
		.transform((v) => (v ? new Date(v) : null)),
});
```

Client queries build URLs with `new URLSearchParams()`, omit null/undefined/empty values, join arrays with commas, and serialize dates with `.toISOString()`. Mutation files stay as plain Axios wrappers and do not import React Query hooks.

### Structure

```typescript
// 1. Input schema with explicit type export
const GetFoosInputSchema = z.object({ ... });
export type TGetFoosInput = z.infer<typeof GetFoosInputSchema>;

// 2. Business logic function (pure, no request/auth handling)
async function getFoos({ input, session }: { input: TGetFoosInput; session: TAuthUserSession }) {
  const organizationId = session.membership?.organizacao.id;
  if (!organizationId) throw new createHttpError.Unauthorized("Você precisa estar vinculado a uma organização.");
  // DB queries here, always scoped by organizacaoId
  return { data: { ... }, message: "..." };
}
export type TGetFoosOutput = Awaited<ReturnType<typeof getFoos>>;

// 3. Route handler (auth + parsing + delegation)
async function getFoosRoute(request: NextRequest) {
  const session = await getCurrentSessionUncached();
  if (!session) throw new createHttpError.Unauthorized("...");
  const input = GetFoosInputSchema.parse({ ... });
  const result = await getFoos({ input, session });
  return NextResponse.json(result);
}

// 4. Export via appApiHandler
export const GET = appApiHandler({ GET: getFoosRoute });
```

Platform-admin-only routes check `session.user.admin` instead of (or in addition to) `membership`:

```typescript
if (!session.user.admin) throw new createHttpError.Forbidden("Acesso restrito a administradores.");
```

### Multi-mode GET endpoints

Instead of separate routes, use a single GET with conditional logic:

```typescript
// Response shape: only one field is non-null at a time
return {
	data: {
		byId: singleResult, // when ?id= is provided
		default: listResult, // when listing (with pagination)
	},
	message: "...",
};
```

### Nested payloads for create/update

Parent + children are sent together in one request:

```typescript
const CreateFooInputSchema = z.object({
	foo: FooSchema.omit({ dataInsercao: true, autorId: true }),
	fooChildren: z.array(FooChildSchema.omit({ fooId: true, dataInsercao: true })),
});
```

### Child entity management (insert/update/delete)

Children include optional `id` and `deletar` fields. Use `handleSimpleChildRowsProcessing()` from `/lib/db-utils/` for batch operations in a transaction:

```typescript
await handleSimpleChildRowsProcessing({
	trx: tx,
	table: childTable,
	entities: input.children,
	fatherEntityKey: "parentId",
	fatherEntityId: parentId,
	organizacaoId, // tenancy isolation
});
```

### Response format

Always `{ data: ..., message: "..." }`. Export the return type for client consumption.

---

## Query Hook Conventions

**Location**: `/lib/queries/` (one file per domain)

- Separate fetch functions (private) from hooks (exported)
- Query keys are exposed alongside the hook: `return { ...useQuery({ queryKey, queryFn }), queryKey }`
- Use `byId` suffix for single-entity hooks: `useAdminFooById({ fooId })`
- List hooks include pagination params with debounce: `params`, `updateParams`, `debouncedParams`
- Type the fetch function response using the route's exported output type

```typescript
async function fetchFooById(id: string) {
	const { data } = await axios.get<TGetFoosOutput>(`/api/admin/foos?id=${id}`);
	const result = data.data.byId;
	if (!result) throw new Error("...");
	return result;
}

export function useAdminFooById({ fooId }: { fooId: string }) {
	return {
		...useQuery({ queryKey: ["admin-foo-by-id", fooId], queryFn: () => fetchFooById(fooId) }),
		queryKey: ["admin-foo-by-id", fooId],
	};
}
```

---

## Mutation Conventions

**Location**: `/lib/mutations/` (one file per domain)

- Thin wrappers around Axios calls
- Type inputs/outputs from the API route's exported types
- Functions are named to match the API operation: `createFoo`, `updateFoo`, `deleteFoo`
- No React Query mutation logic here — that goes in the component/modal

---

## State Hook Conventions

**Location**: `/state-hooks/` (one file per entity)

- Named `use-internal-{entity}-state.tsx`
- Define a state schema using Zod (`.omit()` computed fields, `.extend()` with `id` and `deletar`)
- Accept `initialState: Partial<T>` and provide defaults
- Expose: `state`, `updateX`, `addChild`, `removeChild`, `redefineState`, `resetState`
- All updaters wrapped in `useCallback`
- `removeChild` uses soft-delete pattern: if item has `id`, mark `deletar: true`; if new (no `id`), filter out
- Export the return type: `export type TUseInternalFooState = ReturnType<typeof useInternalFooState>`

---

## Modal Conventions

**Location**: `/components/Modals/Internal/{Domain}/`

### Naming

- **`NewFoo.tsx`** — Create modal. Uses blank initial state.
- **`ControlFoo.tsx`** — Edit modal. Fetches existing data via query hook, hydrates state with `redefineState` in `useEffect`.

### Structure

```typescript
type NewFooProps = {
  closeModal: () => void;
  callbacks?: {
    onMutate?: (variables: TInput) => void;
    onSuccess?: () => void;
    onError?: (error: Error) => void;
    onSettled?: () => void;
  };
};

export function NewFoo({ closeModal, callbacks }: NewFooProps) {
  const { state, updateFoo, ... } = useInternalFooState({ initialState: {} });

  const { mutate, isPending } = useMutation({
    mutationKey: ["create-foo"],
    mutationFn: createFoo,
    onMutate: (vars) => callbacks?.onMutate?.(vars),
    onSuccess: (data) => { callbacks?.onSuccess?.(); toast.success(data.message); closeModal(); },
    onError: (err) => { callbacks?.onError?.(err); toast.error(getErrorMessage(err)); },
    onSettled: () => callbacks?.onSettled?.(),
  });

  return (
    <ResponsiveMenu
      menuTitle="NOVO FOO"
      menuActionButtonText="CRIAR"
      menuCancelButtonText="CANCELAR"
      actionFunction={() => mutate(state)}
      actionIsLoading={isPending}
      stateIsLoading={false}
      stateError={null}
      closeMenu={closeModal}
    >
      <FooGeneralBlock foo={state.foo} updateFoo={updateFoo} />
    </ResponsiveMenu>
  );
}
```

### Form Blocks

- Located in `Blocks/` subdirectory within the modal folder
- Each block is a logical group of fields (General, Contact, Content, etc.)
- Receive state slice + updater function as props
- Use `ResponsiveMenuSection` for visual grouping inside modals

---

## Admin Page Conventions

**Location**: `/app/(admin)/admin-dashboard/`

- **Server component** (`page.tsx`): Auth check, redirect if not admin, renders client component
- **Client component** (`{name}-page.tsx`): Main page logic with hooks and state
- Admin dashboard has its own sidebar layout (`layout.tsx` + `AdminSidebar.tsx`)
- Pages render lists/cards with action buttons that open `New*` or `Control*` modals
- No inline editing — all edits happen through modals

This is the **platform-admin** area (`session.user.admin`) — distinct from the org-scoped app below.

---

## Org Dashboard Page Conventions

**Location**: `/app/dashboard/` (main authenticated app used by tenant users/sellers)

- `app/dashboard/layout.tsx` is a server component: requires a session, redirects to `/auth/signin` if missing, `/onboarding` if the user has no org membership or onboarding isn't complete, then renders `AppSidebar` + `AppHeader` around the page.
- Feature areas are grouped under `commercial/`, `operational/`, `team/`, `settings/`, `communication/`, `ai-hints/`.
- Same server-page + client-page split as admin pages; same modal-based CRUD pattern.
- Gate feature visibility/actions by `session.membership.permissoes.<module>.<action>`, not just by session presence.

---

## Public Page Conventions

**Location**: `/app/(external)/`

- No authentication required (session is optional, used for conditional rendering)
- Use `layout.tsx` for shared header/footer
- Server components can read params via `params: Promise<{ id: string }>`
- Access-level enforcement happens at the API layer, not the page layer

---

## AI & Automation Modules

**Location**: `/lib/ai/`

- **`ai-agent/`** — WhatsApp customer-service agent (tool-calling over client purchase history, product catalog, service tickets, human handoff). Wired through `app/api/integrations/ai/generate-response/route.ts` and `app/api/chats/**`. The `ai-agent/README.md` in this folder is historical/partially stale (references an older Convex-based flow) — trust the actual route/tool code over that doc.
- **`ai-agent/marketing/`** — the marketing agent: uses AI SDK `ToolLoopAgent` (analyst + executor agents) via `gateway("openai/...")` models with `Output.object` structured output and `stepCountIs(n)` step limits. Entry point exercised by `scripts/run-marketing-agent.ts` / `scripts/test-marketing-agent.ts` and `/api/cron/*` campaign processing.
- **`ai-hints/`** — generates and gates AI-driven business insights (`generate-hints.ts`, `approval.ts`), run weekly via `/api/cron/run-ai-hints`.
- **`ai-media-processing/`** — media (image/audio) processing for AI/WhatsApp flows.
- When adding a new agent/tool, follow the existing `tools.ts` + `prompts.ts` + `schemas.ts` split within the relevant subfolder rather than inlining prompts into route handlers.

---

## Background Jobs, Cron & Scripts

- **Vercel Cron** (`vercel.json`) drives recurring jobs against `/api/cron/*` routes: fiscal queue/inbound processing, data collecting, RFM analysis, weekly/biweekly/monthly reports, AI hints, cashback expiry/notifications, birthday notifications, recurrent/single-use campaign processing, client enrichment, product-client references. Look here before assuming a job runs "live" in the request path — most async/marketing side effects are cron-driven.
- **`scripts/`** — one-off or operational scripts run via `tsx` (see `package.json` scripts, e.g. `npm run backfill:shop-settings`, `npm run sync:bling-collecting`, `npm run import:ibpt`). These are not part of the request path; use them for backfills, manual reprocessing, or local debugging against real integrations.
- There is no unit/integration test framework in this repo (no jest/vitest); the `test:*` npm scripts are `tsx` harnesses that exercise real integrations/flows manually. Use the `/verify` skill or manual end-to-end checks to validate behavior instead of expecting `npm test` to exist.

---

## Component Conventions

- `components/ui/` — shadcn/ui primitives (don't modify unless necessary)
- `components/Inputs/` — Custom input components (TextInput, VideoInput, etc.)
- `components/Layouts/` — Layout utilities (LoadingComponent, ErrorComponent, HeaderApp)
- `components/Utils/` — Utilities (ResponsiveMenu, ResponsiveMenuSection)
- `components/Sidebar/` — Sidebar components (AppSidebar, AdminSidebar)

---

## Naming Conventions

- **Files**: PascalCase for components, kebab-case for hooks/utils
- **DB columns**: Portuguese, snake_case (`nivel_acesso`, `data_insercao`)
- **Drizzle fields**: Portuguese, camelCase (`nivelAcesso`, `dataInsercao`)
- **API messages**: Portuguese ("Curso criado com sucesso.", "Acesso restrito a administradores.")
- **UI labels**: Portuguese
- **Types**: Prefix with `T` (e.g., `TCommunityCourseEntity`)
- **Enums**: Suffix with `Enum` (e.g., `CommunityCourseStatusEnum`)
- **State hooks**: Prefix with `useInternal` (e.g., `useInternalCommunityCourseState`)

---

## Development Workflow

- `npm run dev` / `npm run build` / `npm run start` — standard Next.js dev/build/start
- `npm run lint` / `npm run lint:fix` — `oxlint --react-plugin --nextjs-plugin`
- `npm run format` / `npm run format:check` — `oxfmt` (tabs, double quotes, 150 char width, trailing commas — see `.oxfmtrc.json`)
- `npm run knip` — finds unused files/exports/dependencies
- `npm run db:push` / `db:generate` / `db:migrate` / `db:studio` — Drizzle Kit against `SUPABASE_DB_URL`
- No `.env.example` is checked in — required env vars are discovered from usage (`SUPABASE_DB_URL`, Stripe, Mux, Resend, WhatsApp/integration credentials, AI Gateway keys, etc.); ask before assuming a var name.
- TypeScript build errors are currently suppressed at build time (`ignoreBuildErrors: true` in `next.config.mjs`) — don't rely on `npm run build` to catch type errors; run `tsc` or check errors in-editor.

---

## Git Conventions

- Commit messages: `feat:`, `fix:`, `refactor:` prefixes
- Keep commits focused on a single concern
