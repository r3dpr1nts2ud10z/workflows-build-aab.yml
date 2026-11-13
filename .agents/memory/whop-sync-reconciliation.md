---
name: Whop sync reconciliation is not a pure no-op
description: Why client-side triggers of POST /whop/sync must be session-gated
---

# Whop `/whop/sync` reconciliation

The tier-grant reconciliation endpoint (`POST /whop/sync`) is safe to call redundantly
(idempotent: conditional update on `pendingCheckoutId`, `onConflictDoNothing` ledger,
activity insert only on successful grant), but it is **not a pure no-op** when a user has
no pending checkout: it still runs `verifySubscription(user)`, which calls the Whop API
(`memberships.retrieve`) whenever `whopMembershipId` is set.

**Why:** A payer can close the tab before the `/tiers?upgraded=1` redirect fires, so the
tier is never granted. The fallback fires `/whop/sync` on signed-in app load to reconcile.
But firing it on *every* load means one Whop API read per page load for every subscribed
user — needless traffic and rate-limit exposure at launch scale.

**How to apply:** Gate any client-side auto-sync trigger with `sessionStorage` (fire once
per browser session, not per load). A returning payer in a fresh session still triggers it
(sessionStorage resets), which is exactly the recovery case. Keep server idempotency logic
as-is — it correctly protects against concurrent redirect-sync + fallback-sync races.
