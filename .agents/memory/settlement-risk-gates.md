---
name: Settlement risk gates need in-transaction serialization
description: Race-safety pattern for financial limit checks (daily ceilings, reserve gates) in Postgres
---

Any "sum-then-decide" financial guard (daily settlement ceiling, reserve-coverage gate) is racy if the SUM is read outside the transaction or without serialization — two concurrent requests both pass the check and jointly exceed the limit.

**Why:** Architect review caught exactly this in the Black Swan defense build: the circuit breaker summed today's settlements inside the tx but without locking, and the reserve gate queried the ledger outside the tx entirely.

**How to apply:** Put ALL limit computations inside the same transaction as the state change, and serialize competing transactions with `SELECT pg_advisory_xact_lock(hashtext('<gate name>'))` as the first statement (lock auto-releases at commit/rollback). Cheaper and simpler than SERIALIZABLE + retry for low-contention gates.

## Treasury = real cash ledger invariant

The operator/fee ledger is a REAL spendable-cash ledger: `sum(ledger.amount)` = spendable treasury. Subscription revenue books positive (`subscription_revenue`), settlement payouts book negative (`settlement_payout`). Reserve multiple defaults to 1 (no leverage — never auto-pay more than banked); auto-payout net must be ≤ `treasury*RESERVE_MULTIPLE − RESERVE_BUFFER` else the receipt routes to `under_review`.

**Why:** For a blind launch the operator must never auto-pay money it hasn't banked. Architect review flagged two holes: (1) payout ledger inserts used bare `onConflictDoNothing()`, so a refId conflict would credit the user balance but skip the treasury debit — treasury overstated. (2) global settlement pause was only checked before the tx, so a toggle landing mid-flight could slip through.

**How to apply:** Payout ledger inserts must FAIL CLOSED — use `.onConflictDoNothing().returning()` and roll the whole settlement back if 0 rows booked (balance credit + treasury debit must be all-or-nothing). Keep idempotent silent-skip only for external ingestion like Whop payments. Re-check global pause INSIDE the settle tx after acquiring the advisory lock (pass the `tx` executor to `isSettlementPaused`), not just before the tx.
