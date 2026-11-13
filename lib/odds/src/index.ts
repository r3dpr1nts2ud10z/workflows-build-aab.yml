/**
 * Sportsbook parlay odds math — the exact calculator the books use.
 *
 * - American odds ("+260", "-110") convert to decimal multipliers
 * - A parlay's combined decimal odds = product of every LIVE leg's decimal
 * - Voided legs are treated as 1.00 (excluded), exactly how sportsbooks
 *   recalculate a parlay when legs void
 * - Potential payout = wager x combined decimal odds (stake included)
 */

export type OddsLeg = {
  odds?: string | null;
  result: "hit" | "miss" | "void";
};

/** Parse an odds string (American "+260"/"-110" or decimal "3.60") into a decimal multiplier. */
export function parseOddsToDecimal(raw: string | null | undefined): number | null {
  if (raw == null) return null;
  const s = raw.trim().replace(/\s+/g, "");
  if (s === "") return null;
  // American odds: +260, -110 (books quote magnitudes >= 100)
  const american = /^([+-])(\d+(?:\.\d+)?)$/.exec(s);
  if (american) {
    const value = Number(american[2]);
    if (!Number.isFinite(value) || value <= 0) return null;
    if (value >= 100) {
      return american[1] === "+" ? 1 + value / 100 : 1 + 100 / value;
    }
    // "+2.5" etc. — magnitude too small to be American; treat a positive
    // value with a decimal point as decimal odds. Bare "+50" stays invalid
    // (ambiguous — not a legal American price, unlikely a 50x multiplier).
    if (american[1] === "+" && value > 1 && american[2].includes(".")) return value;
    return null;
  }
  // Unsigned integer >= 100 (e.g. "260") — user omitted the "+"; read as American.
  if (/^\d+$/.test(s) && Number(s) >= 100) return 1 + Number(s) / 100;
  // Decimal odds: 3.60 (must be > 1 and carry a decimal point —
  // bare integers like "50" are ambiguous and rejected)
  const dec = Number(s);
  if (Number.isFinite(dec) && dec > 1 && s.includes(".")) return dec;
  return null;
}

/** Format a decimal multiplier as American odds, e.g. 27.0 -> "+2600". */
export function decimalToAmerican(decimal: number): string {
  if (!Number.isFinite(decimal) || decimal <= 1) return "—";
  if (decimal >= 2) return `+${Math.round((decimal - 1) * 100)}`;
  return `-${Math.round(100 / (decimal - 1))}`;
}

/**
 * Combined decimal odds across a parlay's LIVE legs (voids excluded).
 * Returns null when any live leg is missing parseable odds — the parlay
 * can't be verified without every live leg's price.
 */
export function combinedDecimalOdds(legs: OddsLeg[]): number | null {
  const live = legs.filter((l) => l.result !== "void");
  if (live.length === 0) return null;
  let product = 1;
  for (const leg of live) {
    const dec = parseOddsToDecimal(leg.odds);
    if (dec == null) return null;
    product *= dec;
  }
  return product;
}

export type ParlayCrossCheck = {
  /** True when every live leg carried parseable odds. */
  computable: boolean;
  /** Combined decimal odds over live legs (null when not computable). */
  combinedDecimal: number | null;
  /** Combined odds in American format (null when not computable). */
  combinedAmerican: string | null;
  /** wager x combined decimal — stake-inclusive, like the books quote it. */
  expectedPayout: number | null;
  /** |claimed - expected| / expected (null when not computable). */
  deviation: number | null;
  /** True when not computable OR deviation is within tolerance. */
  ok: boolean;
};

/** Default tolerance for book rounding on per-leg prices (2.5%). */
export const PAYOUT_TOLERANCE = 0.025;

/**
 * Cross-reference a claimed potential payout against the sportsbook math.
 * When odds are supplied for every live leg, the claim must reconcile
 * within `tolerance`; otherwise the check passes as "not computable".
 */
export function crossCheckPayout(
  wagerAmount: number,
  claimedPayout: number,
  legs: OddsLeg[],
  tolerance: number = PAYOUT_TOLERANCE,
): ParlayCrossCheck {
  const combined = combinedDecimalOdds(legs);
  if (combined == null || !(wagerAmount > 0)) {
    return {
      computable: false,
      combinedDecimal: null,
      combinedAmerican: null,
      expectedPayout: null,
      deviation: null,
      ok: true,
    };
  }
  const expected = wagerAmount * combined;
  const deviation = Math.abs(claimedPayout - expected) / expected;
  return {
    computable: true,
    combinedDecimal: combined,
    combinedAmerican: decimalToAmerican(combined),
    expectedPayout: Math.round(expected * 100) / 100,
    deviation,
    ok: deviation <= tolerance,
  };
}
