function envNum(name: string, fallback: number): number {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

function envNumNonNeg(name: string, fallback: number): number {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v >= 0 ? v : fallback;
}

/** Layer 1 — hard cap on the gross settlement of any single receipt (USD). */
export const MAX_GROSS_SETTLEMENT = envNum("RISK_MAX_GROSS_SETTLEMENT", 5000);

/** Layer 2 — global circuit breaker: max total NET settlements per UTC day (USD). */
export const DAILY_SETTLEMENT_CEILING = envNum(
  "RISK_DAILY_SETTLEMENT_CEILING",
  25000,
);

/** Layer 3 — net settlements above this go to the operator review queue (USD). */
export const REVIEW_THRESHOLD_NET = envNum("RISK_REVIEW_THRESHOLD", 1000);

/**
 * Layer 4 — absolute reserve gate. A settlement auto-clears only if the treasury
 * (real spendable cash: subscription revenue in − payouts out) can cover the
 * payout AND stay at or above RESERVE_BUFFER afterward. RESERVE_MULTIPLE controls
 * leverage over the treasury — keep it at 1 for a strict "never pay what you
 * haven't banked" guarantee; anything the treasury cannot cover is routed to the
 * operator review queue instead of being paid automatically.
 */
export const RESERVE_MULTIPLE = envNum("RISK_RESERVE_MULTIPLE", 1);
export const RESERVE_BUFFER = envNumNonNeg("RISK_RESERVE_BUFFER", 0);
