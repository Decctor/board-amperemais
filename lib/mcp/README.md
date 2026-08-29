# RecompraCRM MCP server

This module implements a stateless Streamable HTTP MCP server at `/api/mcp`. It exposes read-only tools, resources, and prompts through organization-scoped or platform-scoped access principals.

## Current authentication status

The current implementation uses RecompraCRM API keys sent as `Authorization: Bearer <token>`. Tokens are displayed once, stored only as hashes, and checked against the database on every request so revocation has immediate effect.

OAuth discovery and authorization are not implemented yet. Consequently, clients must support manually configuring a Bearer token or custom request headers. The `WWW-Authenticate` protected-resource metadata URL is reserved for the OAuth upgrade described below and must not be treated as an operational OAuth flow yet.

## Start and use the module

### 1. Configure the application

Configure the repository as usual, including its database connection and authentication environment. Also set `NEXT_PUBLIC_APP_URL` to the public application origin:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Use the production HTTPS origin in deployed environments. The MCP endpoint uses this value for its canonical endpoint URL and browser-origin validation.

### 2. Install dependencies

```sh
npm ci
```

This repository uses npm exclusively.

### 3. Apply the access migrations

Apply these migrations in order and as separate transactions:

```sh
npx tsx ./scripts/apply-sql-migration.ts drizzle/0084_agent_principal_type.sql
npx tsx ./scripts/apply-sql-migration.ts drizzle/0085_agent_access_foundation.sql
```

Migration `0084` adds the PostgreSQL enum value. Migration `0085` consumes that value, relaxes the organization column only for platform principals, and adds the MCP rate-limit lookup index.

Use the normal migration process instead when the target environment already applies numbered `drizzle/` migrations automatically.

### 4. Seed native access clients

```sh
npm run seed:access-clients
```

This idempotently creates or updates `AGENT_CLAUDE`, `AGENT_CHATGPT`, and `AGENT_CONTROL`. The connection UI has no applications to offer until this seed has run.

### 5. Start the application

```sh
npm run dev
```

The local MCP endpoint is then `http://localhost:3000/api/mcp`.

### 6. Create an organization connection

Sign in as a member with permission to edit the organization, then open:

```text
/dashboard/settings?view=ai-connections
```

Choose **Nova conexão**, select the client and read scopes, and copy the generated token immediately. Only its hash is stored, so a lost token must be rotated or replaced.

For command-line provisioning, including platform principals, use:

```sh
npm run access:issue-agent -- --client AGENT_CLAUDE --org organization-slug --nome "Claude da loja"
npm run access:issue-agent -- --client AGENT_CONTROL --plataforma --nome "Agentes do Control"
```

Platform credentials are privileged and should only be issued by trusted operators. Normal Control agents use `--org`; only an explicit `AGENT_CONTROL --plataforma` issuance receives the platform scopes.

### 7. Configure the MCP client

Use:

```text
Server URL: https://your-domain.example/api/mcp
Authorization: Bearer rcm_live_key_...
Transport: Streamable HTTP
```

For local development, tokens use the `rcm_test_...` prefix. A client that only supports automatic OAuth discovery cannot connect until the OAuth upgrade is implemented.

### 8. Verify the connection

Run the focused protocol tests:

```sh
npm run test:agent-tools
```

After connecting a client, verify that it can initialize, list only its granted tools, and execute a read. Then confirm the principal's last-access timestamp and `CHAMADA_AGENTE` audit events in the settings/access data.

The database-backed smoke test can exercise real organization data when the environment is configured:

```sh
npm run test:agent-tools:db -- --org organization-id-or-slug
```

## Operational behavior

- Organization principals are always pinned to their own organization.
- Platform principals must provide an organization ID or slug to organization-level tools.
- Client PII is masked unless the dedicated `agent:clients:pii` scope is granted.
- Tool results are read-only in the current phase.
- Credentials and grants are re-read on every request, so revocation is immediate.
- The current audit-event rate limiter is best-effort under concurrency; see `lib/access/README.md` for the planned PostgreSQL token-bucket replacement.

## Next upgrade: OAuth 2.1 authorization

Implement the planned OAuth phase before advertising turnkey ChatGPT or Claude connection:

1. Serve OAuth Protected Resource Metadata for the canonical `/api/mcp` resource.
2. Serve OAuth Authorization Server Metadata.
3. Implement authorization code flow with mandatory PKCE S256.
4. Require and validate RFC 8707 `resource` indicators against the canonical MCP URL.
5. Add a logged-in consent screen that binds the client, user, organization, redirect URI, requested scopes, and approved scopes.
6. Issue short-lived opaque access tokens and rotating refresh tokens; hash all codes and tokens at rest.
7. Revoke a complete refresh-token family when reuse is detected.
8. Support Client ID Metadata Documents with strict SSRF defenses and a conservative trust policy.
9. Add Dynamic Client Registration only as a compatibility fallback where required by target clients.
10. Resolve OAuth access tokens into the existing `TAgentActorContext`, preserving principal, grant, tenancy, revocation, and audit behavior.
11. Keep static API keys for trusted internal and manually configured clients.
12. Add discovery, consent, code-exchange, refresh-rotation, audience, redirect, PKCE, revocation, and real-client compatibility tests.

Relevant standards and planning context are recorded in `docs/dev-planning/ai-agent-mcp-plan.md`.
