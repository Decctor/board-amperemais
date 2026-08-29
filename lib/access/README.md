# Access module

This module owns authentication, credentials, principals, grants, and audit events for external software.

## Deployment requirement

After migrations that add or change native access clients, run:

```sh
npm run seed:access-clients
```

The seed is idempotent and upserts the definitions from `clients-catalog.ts`. The AI connection UI depends on the `AGENT_CLAUDE` and `AGENT_CHATGPT` clients being present; platform credentials additionally depend on `AGENT_CONTROL`.

Deployments should treat this seed as a required release step whenever the native catalog changes. Database migrations intentionally establish schema invariants only and do not import application code to populate catalog rows.

## Platform Control principals

`AGENT_CONTROL` supports both ordinary organization principals and privileged platform principals. Its client scope ceiling includes `platform:*`, but those scopes are never part of organization-mode defaults.

- `--org <id|slug>` creates `CONTA_SERVICO` with organization read scopes only.
- `--plataforma` creates `CONTA_PLATAFORMA` with organization and platform read scopes.
- Platform mode is rejected for clients other than `AGENT_CONTROL`.
- Client PII remains opt-in in both modes.

To repair or upgrade an existing platform principal without rotating its credential, use the guarded operator command:

```sh
npm run access:grant-platform-agent -- --principal <principal-id>
```

## MCP mutations and responsible user

Mutation-capable MCP principals must have a human responsible user. Existing credentials can be
upgraded without token rotation after applying `drizzle/0086_mcp_mutation_responsible_user.sql`:

```sh
npm run seed:access-clients
npm run access:configure-agent-mutations -- --principal <principal-id> --responsavel <user-id-or-email>
```

The command grants the exact mutation scopes and records the responsible user. For a platform
principal, that user must also be a member of each organization targeted by a mutation; reads remain
available when that condition is not met.

The command refuses principals that are not active, organization-less `CONTA_PLATAFORMA` records belonging to `AGENT_CONTROL`. It updates the native client ceiling, restores the default platform grants idempotently, and records newly granted scopes in the access audit trail.

## OAuth for MCP connectors

`lib/access/oauth.ts` implements the minimum OAuth 2.1 surface that the Claude.ai and ChatGPT connectors require: dynamic client registration (RFC 7591), authorization code + PKCE S256, and discovery metadata (RFC 9728 + RFC 8414 under `/.well-known/`). Cursor and Claude Code keep using pasted API keys — OAuth is only the self-service path.

Design: OAuth is a front door to `provisionAgentPrincipal`. The access token returned by `/api/oauth/token` is an ordinary `CHAVE_API` over a `CONTA_SERVICO` principal, so the MCP endpoint, revocation, auditing, scopes, and the responsible-user model are unchanged. Key decisions:

- **Public clients only, PKCE mandatory.** No client secrets, no refresh tokens: tokens do not expire, and revoke + reconnect is the recovery path (same philosophy as device credentials).
- **Org-per-connection.** Consent (`/oauth/authorize`) always binds to the session's active organization and requires `empresa.editar`. `CONTA_PLATAFORMA` remains a deliberately manual issuance.
- **Redirect host decides the catalog application** (`claude.ai` → `AGENT_CLAUDE`, `chatgpt.com` → `AGENT_CHATGPT`), never the self-declared `client_name`. Unknown hosts fall back to `AGENT_MCP`, whose ceiling is read-only. `agent:clients:pii` and `platform:*` are never offered through OAuth.
- **Reconnection replaces.** Re-authorizing the same registered client for the same user + organization revokes the previous principal (linked via `referenciaExterna = oauth:<client_id>`).
- **Scaling escape hatch:** the RFC 9728 document points at the authorization server; moving to an external IdP later is a metadata change, not a token-model change.

Deployment: apply `drizzle/0087_oauth_authorization.sql`, then `npm run seed:access-clients` (adds `AGENT_MCP`).

## Next improvement: atomic PostgreSQL rate limiting

The MCP endpoint currently limits tool calls by counting recent `CHAMADA_AGENTE` audit events. This controls sustained sequential traffic, but concurrent requests can read the same count before their audit events are inserted.

Replace that implementation with a PostgreSQL-backed token bucket:

- Keep one row per access principal.
- Refill at two tokens per second (120 calls per minute sustained).
- Start with a capacity of 20 tokens to allow small bursts without allowing 120 concurrent calls.
- Reserve one token through a single atomic `INSERT ... ON CONFLICT DO UPDATE ... WHERE ... RETURNING` statement before tool execution.
- Reject the request when the statement returns no row.
- Do not refund malformed or failed tool calls, because they still consume application and database resources.
- Keep `access_events` as the audit trail; do not use it as the concurrency-control primitive.
- Remove stale limiter rows through principal cascade or periodic maintenance.

PostgreSQL serializes updates to the same principal row, closing the race without Redis. Requests belonging to different principals continue independently.
