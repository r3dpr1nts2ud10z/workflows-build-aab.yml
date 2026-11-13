---
name: Orval codegen constraints
description: Duplicate generated names and date-time length constraints require corrections at the codegen source
---

Inline (anonymous) request-body schemas in `lib/api-spec/openapi.yaml` make Orval generate the same name (e.g. `TrackVisitBody`) in both `generated/api.ts` and `generated/types/`, causing a TS2308 duplicate-export error in the api-zod barrel.

**Why:** Both generated modules are re-exported from one `index.ts`; Orval derives identical names for the inline schema in each.

**How to apply:** Always define request bodies as named schemas under `components/schemas` and `$ref` them — never inline object schemas in `requestBody`. If codegen fails with TS2308, delete the stray generated type file and re-run codegen after fixing the spec.

**Related collision:** never name a component schema `<OperationId>Response` (e.g. schema `ServeAdResponse` with operationId `serveAd`) — Orval auto-generates a zod const with that exact name for the operation's response, producing the same TS2308 duplicate export. Pick a distinct schema name like `AdServePayload`.

## Date-time string bounds

When date coercion is enabled, Orval can incorrectly apply an OpenAPI string `maxLength` to a Zod Date schema as `.max(number)`. Preserve the wire-format length check before date conversion instead of deleting the bound to satisfy TypeScript.

**Why:** Date maximums expect a Date, not a character count. Removing the string bound silently changes the validation contract; editing only generated output loses the correction on the next generation.

**How to apply:** Keep reproducible corrections in codegen configuration/hooks, fail explicitly when expected generated fragments change, and check regenerated output once after generator upgrades.
