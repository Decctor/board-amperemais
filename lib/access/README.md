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

The command refuses principals that are not active, organization-less `CONTA_PLATAFORMA` records belonging to `AGENT_CONTROL`. It updates the native client ceiling, restores the default platform grants idempotently, and records newly granted scopes in the access audit trail.

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
