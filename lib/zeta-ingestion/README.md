# ZETA AltData Ticket Ingestion

The supplied CommonJS service lives in this workspace package rather than replacing the
existing root package or API server. `server.js`, `routes/`, `adapters/`, and `utils/` retain
the requested layout. Dependency ranges for AJV, ajv-formats, Express 4 and pg are retained
inside this package; the existing host API continues to use Express 5.

## Runtime integration

The existing API server mounts **POST `/api/v1/tickets/ingest`** using its shared PostgreSQL
pool. Its dedicated **10 KB** JSON parser runs before the host's 256 KB parser, and its
error middleware handles parser failures as JSON. The existing general API limit of
300 requests/minute per IP also applies. No new listener or database pool is created by
importing this package.

This endpoint uses machine credentials, **not Clerk sessions**. Authentication is isolated
from the existing user login, payout, subscription, and settlement routes. Accepted
telemetry is not independently verified sports evidence and cannot authorize a settlement
or change an account balance.

## Credential configuration

### Operator dashboard

Sign into N3PSQAL3 with an existing Command Center operator account, then open
**Command Center → ZETA Ingestion** (`/command-center/zeta`). The dashboard uses
the existing Clerk session and `ADMIN_EMAILS` authorization; feed API keys are
neither needed nor exposed in the browser.

The dashboard reads persisted tickets through protected `/api/admin/zeta/*`
endpoints. It shows all-time ticket/source counts, tickets stored in the last
24 hours, source filters, ticket-ID search, pagination, and full receipt/leg
details. Refresh retrieves current database data; these totals count stored
tickets, not HTTP attempts, rejected submissions, or idempotent replays.

No ticket ingestion, editing, deletion, credential management, or payout action
is offered by this dashboard. A last-received timestamp is not a claim that an
external feed is online. Missing storage and request errors are shown explicitly.

### Machine credentials

Set **`ZETA_CREDENTIAL_STORE` through Replit Secrets**, never source code or chat.
The JSON structure is:

```json
{
  "<strong-random-machine-credential>": {
    "authorizedSources": ["<exact-feed-source-id>"]
  }
}
```

Those placeholders are explanatory, not working credentials. Use a distinct high-entropy
credential per feed, stored and distributed privately. Rotating a key means adding the
new map entry, switching the feed, and removing the old entry. Restart the API workflow
after changing secrets. Set the appropriate production secret before publishing.

Clients send:

- `Content-Type: application/json`
- `x-source-id`: one source explicitly authorized for this credential
- Either `x-api-key` **or** `Authorization: Bearer ...`

Missing or malformed configuration fails closed. There are no default keys, public demo
keys, unauthenticated ingestion paths, or environment changes from the tests.

## Request and response

```json
{
  "ticketId": "123e4567-e89b-42d3-a456-426614174000",
  "timestamp": "2026-09-18T12:00:00Z",
  "stake": "10",
  "totalOdds": "2",
  "potentialPayout": "20",
  "legs": [{
    "legId": "L1",
    "eventSlug": "event-1",
    "market": "player_points",
    "selection": "Over",
    "targetValue": "25.5",
    "actualValue": "25",
    "marginDelta": "-0.5",
    "status": "LOSS"
  }]
}
```

Monetary/statistical values must be decimal **strings**; arithmetic uses six-place scaled
BigInt, never floating-point conversion. Raw allowlists/type/length limits run before
cloning; identifier trimming and decimal normalization precede AJV and business rules.
Optional payout/delta are checked when supplied; missing delta is derived exactly.
The OpenAPI contract lives in `lib/api-spec/openapi.yaml`.

Success and replay both return:

```json
{
  "success": true,
  "idempotentReplay": false,
  "ticketId": "123e4567-e89b-42d3-a456-426614174000",
  "sourceId": "<authorized-source-id>",
  "computedFinancials": {
    "stakeScaled": "10000000",
    "oddsScaled": "2000000",
    "payoutScaled": "20000000"
  },
  "normalizedLegsCount": 1,
  "persistedAt": "<original-receipt-timestamp>"
}
```

`persistedAt` is the original receipt's application timestamp, created before the insert;
the receipt is acknowledged only after commit. It is not a database commit timestamp.

| HTTP | Meaning |
| --- | --- |
| 200 | Committed new ticket or identical replay |
| 400 | Raw/schema/JSON validation rejection |
| 401 | Missing/invalid credentials or unusable credential configuration |
| 403 | Credential not authorized for the requested source |
| 409 | Existing source/ticket has a different canonical payload hash |
| 413 | Body exceeds 10 KB |
| 415 | Unsupported content type, charset, or encoding |
| 422 | Exact-math/business-rule rejection |
| 429 | Host API's existing per-IP rate limit |
| 500 | Sanitized unexpected/DB failure; no success acknowledgment |

Hashing sorts object keys recursively after preprocessing; array order remains meaningful.
The hash covers the submitted, preprocessed ticket, not just derived results. Changing an
optional field from omitted to supplied can therefore conflict even when its value matches
a derived value. Timestamp and other metadata changes also conflict.

## Database and durability

The schema source of truth is `lib/db/src/schema/ingested-tickets.ts`, matching the supplied
`ingested_tickets` DDL: storage key PK, unique `(source_id, ticket_id)`, JSONB receipt and
normalized ticket, and `created_at DEFAULT now()`. No duplicate index is needed.

The adapter executes parameterized SQL in a READ COMMITTED transaction. A concurrent
duplicate waits on database uniqueness, then retrieves the original committed record.
Hash, normalized ticket and receipt are committed together. Existing records are never
overwritten by ingestion. Failure rolls back; failed rollback discards the connection
while preserving the original operation error.

Keep ingestion records immutable and retain them for the full retry/deduplication period.
Deleting records allows the same ticket to be ingested again. If a connection fails during
COMMIT, the outcome can be uncertain; retry the **same source, ticket and payload** to
retrieve the persisted result rather than generating a new ticket ID.

There is no startup DDL and no production migration script. Development schema is managed
through the existing Drizzle workflow. For Replit-managed production PostgreSQL, review and
apply the development-to-production schema diff in Publish. `CREATE TABLE IF NOT EXISTS`
alone does not repair an older table. Do not overwrite production data with fixtures.

The integrated service uses the existing project's pool and provider TLS configuration.
The optional standalone pool also respects provider connection-string TLS settings; it
does not disable certificate verification using `rejectUnauthorized: false`. External
providers must supply valid verified-TLS settings/CA configuration.

## Commands

```sh
# Normal shared API workflow (Replit manages PORT and its proxy):
pnpm --filter @workspace/api-server run dev

# Isolated processor, adapter, authentication, and HTTP regression checks:
pnpm test:zeta

# Explicit development-only PostgreSQL tests:
pnpm --filter @workspace/zeta-ingestion run test:postgres

# Optional standalone entry; do not run alongside the shared API on the same port:
pnpm --filter @workspace/zeta-ingestion start
```

The PostgreSQL test uses generated fixture source IDs and removes only those rows in
cleanup. It exercises multiple connections and a recreated pool/server; it does **not**
claim to crash or restart PostgreSQL itself. Never run fixture tests against production.

Standalone startup checks the credential map and table before listening on `PORT` (default
3000), binds `0.0.0.0`, and drains HTTP then its pool on shutdown. It requires `DATABASE_URL`
and valid `ZETA_CREDENTIAL_STORE`. The shared host instead keeps its other features running
when ZETA credentials are absent, rejecting ingestion until configured.

## Release checklist

- Configure strong per-source credentials securely for the intended environment.
- Verify the production database schema diff includes the named uniqueness constraint.
- Use provider-supported, verified TLS for external database connections.
- Review existing per-IP rate limits against feed volume before enabling a high-volume feed.
- Run unit and development database checks; never publish test credentials.
- Publish through Replit, then verify with a controlled authorized feed ticket.