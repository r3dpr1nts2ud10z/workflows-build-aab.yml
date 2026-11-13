# N3PSQAL3

A 21st-century hybrid clearinghouse for near-miss parlay bets: users submit 5+ leg parlay receipts that missed by exactly one leg, settle them for a tier-based fraction of the potential payout, and consult R0QQ3T, the Agentic Zodiac Systems Assistant.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL`, `CLERK_PUBLISHABLE_KEY`/`CLERK_SECRET_KEY` (managed Clerk), `AI_INTEGRATIONS_OPENAI_*` (R0QQ3T), `WHOP_COMPANY_ID` + `WHOP_PLAN_BRONZE|SILVER|GOLD|DIAMOND` (paid tiers)

## Stack

### ZETA machine ticket ingestion

- `lib/zeta-ingestion/` preserves the supplied CommonJS service layout and its dependency ranges; it is mounted in the existing API, not a replacement root app. **Why:** the workspace already contains active products and an Express 5 server; replacing the root manifest or starting a competing server would break those products.
- `POST /api/v1/tickets/ingest` uses the shared DB pool, its own 10kb JSON parser before the general 256kb parser, source-bound machine authentication, and the existing general API rate limit.
- Required secret: `ZETA_CREDENTIAL_STORE` JSON mapping each private feed credential to `{ "authorizedSources": ["exact-source-id"] }`. No fallback keys. Missing configuration rejects ingestion without disabling unrelated routes.
- Table source: `lib/db/src/schema/ingested-tickets.ts`. No startup DDL. Apply development schema through the existing workflow; managed production schema changes go through Publish.
- `pnpm test:zeta` runs regression checks; `pnpm --filter @workspace/zeta-ingestion run test:postgres` is an explicit development-only integration test with generated fixture cleanup.
- See `lib/zeta-ingestion/README.md` for source credential configuration, idempotency semantics, standalone usage, and release checks. Telemetry validation does not authorize settlement or balance changes.
- Operator dashboard: `/command-center/zeta`, linked from Command Center and admin navigation. Protected `/api/admin/zeta/*` reads use the existing Clerk session plus `requireAdmin`; never send feed credentials to the browser. Counts represent persisted tickets, not retries/rejections. The dashboard has no ingestion or settlement mutations.

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + Clerk auth (proxy middleware pattern)
- DB: PostgreSQL + Drizzle ORM
- Frontend: React + Vite (`artifacts/n3psqal3`), generated Orval hooks
- Payments: Whop (`@whop/sdk`), AI: OpenAI via Replit AI integration

## Where things live

- DB schema: `lib/db/src/schema/` (users, receipts, activity)
- API contract: `lib/api-spec` (OpenAPI, source of truth) → generated hooks in `lib/api-client-react`, Zod in `lib/api-zod`
- Server routes: `artifacts/api-server/src/routes/` (profile, receipts+search, dashboard, whop, roqqet, track, admin)
- Tier economy config: `artifacts/api-server/src/lib/tiers.ts`
- Whop client: `artifacts/api-server/src/lib/whopClient.ts`; helper scripts `whop-mcp.mjs`, `whop-api.mjs` at repo root

## Architecture decisions

- Tier catalog (fractions/attempts/prices) lives in server code, not DB; Whop plan IDs come from `WHOP_PLAN_*` env vars.
- Receipts are auto-verified on submission (exactly-one-miss + 5-leg rules enforced server-side); settlement is a separate, attempt-limited action.
- Settlement is atomic: attempt consumption and receipt state change happen in one transaction with SQL-level guards (no read-then-write races).
- Whop payments are verified server-side by matching payment metadata (`app_user_id`) — redirects/client params are never trusted.
- R0QQ3T daily insight is AI-generated and cached in-memory per user per UTC day.
- users.id is the Clerk user ID (text PK); user rows are JIT-created on first authenticated request.
- 20% "Protocol Integrity & Settlement fee" (`OPERATOR_FEE_RATE` in tiers.ts): settlements credit users net of fee; fees (settlement + 20% of subscription price on upgrade) are recorded in the `operator_ledger` table.
- Admin access: `ADMIN_EMAILS` env var (comma-separated); `requireAdmin` middleware + `isAdmin` on UserProfile. Command Center page at `/command-center` (admin-only nav link).
- Unique visitors tracked via public `POST /track/visit` (localStorage visitor ID, one row per visitor per UTC day). R0QQ3T status counters are in-memory (reset on server restart).
- Traffic-source attribution: `?src=` or `utm_source=` on any landing URL is captured first-touch (localStorage), sent with the visit ping, sanitized server-side (`[a-z0-9_-]`, max 32), stored in `visits.source`; Command Center "Traffic Sources (14d)" card shows unique visitors per source (`coalesce(source,'direct')`).
- Black Swan defenses (`artifacts/api-server/src/lib/risk.ts`, env-overridable `RISK_*`): (1) $5k per-receipt gross cap; (2) $25k/UTC-day settlement circuit breaker (checked in-transaction, 503); (3) settlements > $1k net go to `under_review` for operator approval (quote stored in `quoted_gross`/`quoted_net`, attempt consumed, no balance credit); (4) reserve gate — net > $500 must be ≤ 5× fee treasury or it's queued. Admin approval bypasses the breaker; review queue at `GET /admin/review-queue`, decisions via `POST /admin/receipts/{id}/review`. All risk sums run in-transaction behind `pg_advisory_xact_lock` (race-safe).
- Terms & Conditions: public `/terms` page; acceptance recorded server-side (`users.terms_accepted_at`, `POST /me/accept-terms`, idempotent). Receipt submission returns 403 until accepted; frontend gates the submit dialog with a one-time checkbox flow.
- API hardening (`artifacts/api-server/src/middlewares/rateLimit.ts`): per-IP rate limits — 300/min general, 10/min settle, 30/5min submit, 15/min R0QQ3T chat, 60/min track/visit; 256kb JSON body limit; `trust proxy` set for correct client IPs behind the shared proxy.

- PWA installability (`artifacts/n3psqal3/public/`): `manifest.webmanifest` (standalone, scope "/"), icons generated from `logo.svg` via ImageMagick (192/512/maskable/apple-touch), `sw.js` service worker — never intercepts `/api`, cache-first only for content-hashed `/assets/` (icons deliberately uncached), HTML always network-fresh so deploys propagate immediately. Registered in `main.tsx` PROD-only. Bump `STATIC_CACHE` version in `sw.js` if caching strategy ever changes.
- CPM/ad layer ("Ad Waterworks"): `ads` + `ad_events` tables; public `GET /ads/serve?placement=` (weighted-random active house/affiliate creative; placement `any|dashboard|receipts|roqqet`) and `POST /ads/{id}/event` (impression/click, both rate-limited). `AdSlot` component renders only for Demo-tier users on dashboard/receipts/roqqet — ad-free is a paid-tier perk. Setting `AD_NETWORK_SCRIPT_URL` env switches every slot to network mode: URLs ending in `.js` are injected as script embeds; anything else (e.g. Adsterra Direct Links) renders a styled "Sponsored" banner that opens the URL in a new tab. Currently set to the user's Adsterra Direct Link (effectivecpmnetwork.com). Admin CRUD + impressions/clicks/CTR stats in Command Center; 4 house/affiliate seeds inserted on first boot if the table is empty.

## Product

- Tiers: Demo free (1/16 payout, 1 attempt/day), Bronze $5 (1/8, 3/day), Silver $10 (1/4, 5/day), Gold $50 (1/2, 10/day), Diamond $100 (1/2, unlimited)
- R0QQ3T "Starting 5" zodiac system: Sun, Decan, Moon, Rising, Descendant (Sun + Decan minimum) — powers chat and ambient personalization
- Pages: landing, dashboard, receipts, receipt detail, search, tiers, R0QQ3T, account

## User preferences

- Payments via Whop; zodiac in "both" modes (chat + ambient personalization)

## Gotchas

- Run `pnpm --filter @workspace/api-spec run codegen` after any OpenAPI spec change, then rebuild libs before typechecking artifacts
- Zod response schemas strip unknown keys — add new response fields to the OpenAPI spec first
- Whop paid-tier checkout returns 503 until the Whop connection + plan env vars are configured

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
