# R0YAL evidence module

Run `pnpm test` from the workspace root. No dependency installation is required.

## Exact arithmetic contract

- `evidence-decimal.cjs` parses nonnegative margins into BigInt millionths.
  `parseScaledMargin()` returns a scaled BigInt or `null`; it never rounds.
- `engine.cjs` compares client/server margins and thresholds using BigInts only.
  The thresholds remain one point, one whole leg, and 0.01 in PERCENTAGE units.
- Fractional legs are invalid. Decimal/scientific input must be exactly
  representable with at most six fractional places after removing trailing zeros.
- Limits: 256 raw input characters (including whitespace), exponent magnitude at
  most 100, and at most 120 digits in the scaled integer. Limits apply even to
  zero. These bounds are checked before BigInt construction or exponentiation.
- Negative values and negative zero are rejected. Zero with redundant fractional
  zeros is accepted. Malformed or out-of-range inputs return `null`, not a rounded
  substitute.

## Transport and compatibility

Use decimal **strings** for database `numeric` fields and JSON receipt margins.
Do not configure a PostgreSQL numeric parser that converts to JS Number.
Legacy finite nonnegative JS numbers no larger than `Number.MAX_SAFE_INTEGER`
remain accepted when their string representation fits the scale. They describe
the number already received, not the original source decimal: rounding or
underflow that happened upstream cannot be detected or reversed.

The evaluation response's `evidence.marginValue` and `evidence.threshold` are
now canonical decimal **strings**, not numbers. Responses are JSON-safe and
contain no BigInts. Internal `validateStrictMargin()` results include a
`scaledMargin` BigInt and should not be serialized directly.

`evidence-repository.cjs` exports the uploaded repository API. Its
`parseStrictDbMargin()` now returns BigInt millionths or `null`; repository
records expose `marginValue` as a canonical decimal string for the engine.

```js
const { evaluateNearMissEvidence } = require('./engine.cjs');
const result = evaluateNearMissEvidence({
  candidate: { isCandidate: true, eventId: 'example-event' },
  incomingReceipt: {
    eventId: 'example-event', marginValue: '0.5000000', unit: 'POINTS'
  },
  // Must be loaded from an authorized server store, never copied from the body.
  trustedServerRecord: {
    eventId: 'example-event', isVerified: true,
    marginValue: '0.5', unit: 'POINTS'
  }
});
// result.evidence: { unit: 'POINTS', marginValue: '0.5', threshold: '1' }
JSON.stringify(result);
```

## Integration boundary

This is a tested standalone module, not a mounted production endpoint.
The repository uses the supplied `event_candidates` / `verified_receipts`
schema contract and a pg-compatible injected `query()` adapter. No tables,
migrations, authentication providers, live connections, or routes are installed.
Map the queries to the actual schema before integration, enforce event/owner
uniqueness, and use trusted authentication context for `userId`. Missing records
return `null`; duplicate or corrupt records throw `CORRUPT_DATABASE_RECORD`.
Database exceptions propagate. The HTTP layer must return sanitized errors and
must not send raw database exception messages to clients.

Text inference remains unverified, handles explicit loss phrases only, and does
not interpret negation or corrections. Text inputs are capped at 16,384
characters. The engine assesses proximity only; it does not authorize payouts.