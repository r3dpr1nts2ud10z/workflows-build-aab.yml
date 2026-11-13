---
name: Whop proxy-only connector
description: This project's Whop connection exposes no raw api_key; the SDK must go through the connectors proxy.
---

# Whop proxy-only connection

The Whop connection in this project (`conn_whop`) is **proxy-only**: the raw
`api_key` is NOT retrievable via the connection-secrets endpoint
(`/api/v2/connection?include_secrets=true&connector_names=whop` returns 0 items,
and `listConnections('whop')` returns 0 too — even right after a successful
`addIntegration` / `proposeIntegration`). Do NOT keep retrying that endpoint;
emptiness is expected, not a transient failure.

What DOES work: the connectors proxy at
`https://${REPLIT_CONNECTORS_HOSTNAME}/api/v2/proxy/<whop-path>` with headers
`X-Replit-Token` (`"repl "+REPL_IDENTITY` or `"depl "+WEB_REPL_RENEWAL`) and
`Connector-Name: whop`. The proxy injects the real Whop auth itself. The root
helper `whop-api.mjs` uses exactly this path.

**How the server uses it:** `whopClient.ts` constructs `@whop/sdk` with
`baseURL` = proxy + `/api/v1`, and a custom `fetch` that strips any SDK-supplied
`Authorization`, sets the two proxy headers, and recomputes the identity token
per request (so a cached singleton client never goes stale). Routes are
unchanged — `getWhopClient()` still returns `Promise<Whop>`.

**Why:** the older raw-secret pattern (fetch api_key → `new Whop({apiKey})`)
throws at runtime here because the secret is never returned. If Whop calls start
failing with missing-credential errors, check the proxy path first, not the
secrets endpoint.

Verified live through the proxy: `plans.retrieve`, `checkoutConfigurations.create`
(returns a real `purchase_url`), and `payments.list` (async-iterable).
