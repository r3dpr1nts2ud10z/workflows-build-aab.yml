---
name: Stripe connector quirks
description: Replit Stripe connector credential key naming and esbuild bundling pitfall for stripe-replit-sync
---

- The Replit Stripe connector's `/api/v2/connection` settings expose the key as `secret` (plus `publishable`, `account_id`) — NOT `secret_key` as in the skill template. Read `settings.secret_key ?? settings.secret`.
  **How to apply:** any stripeClient credential fetch in this workspace.
- `stripe-replit-sync` reads its SQL migration files from disk at runtime. Bundling it with esbuild makes `runMigrations` silently no-op (then `relation "stripe.accounts" does not exist` at webhook setup). Fix: add `"stripe-replit-sync"` to esbuild `external`.
  **Why:** dev worked only after a manual unbundled migration run; production would have hit the same silent failure.
- Payout withdrawals use a pending→processing→paid/failed state machine with idempotency key + transfer_group `payout:{id}` and a 10-min reconciler; never refund on ambiguous Stripe errors — only definitive 4xx.
- The Stripe MCP connection is separate from the Stripe application connector; only the connector supplies credentials to app code, and an attached connector can still be sandbox-mode.
  **Why:** disconnecting the app connector exposed an MCP row but did not restore payment access or change livemode.
  **How to apply:** never substitute `mcp:stripe` for the app connector; verify connector mode and production webhook livemode after any reconnect.
- Development connector mode does not establish production mode. Production may retain both test and live managed-webhook rows.
  **Why:** repeated workspace sandbox checks were incorrectly treated as failed live activation; a production query subsequently showed an enabled live webhook alongside the test row.
  **How to apply:** verify production evidence explicitly; never recommend disconnecting based solely on development `livemode: false`. A live webhook registration alone does not prove a completed payout.
