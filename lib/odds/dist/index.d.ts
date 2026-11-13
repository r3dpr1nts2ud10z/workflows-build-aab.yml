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
export declare function parseOddsToDecimal(raw: string | null | undefined): number | null;
/** Format a decimal multiplier as American odds, e.g. 27.0 -> "+2600". */
export declare function decimalToAmerican(decimal: number): string;
/**
 * Combined decimal odds across a parlay's LIVE legs (voids excluded).
 * Returns null when any live leg is missing parseable odds — the parlay
 * can't be verified without every live leg's price.
 */
export declare function combinedDecimalOdds(legs: OddsLeg[]): number | null;
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
export declare const PAYOUT_TOLERANCE = 0.025;
/**
 * Cross-reference a claimed potential payout against the sportsbook math.
 * When odds are supplied for every live leg, the claim must reconcile
 * within `tolerance`; otherwise the check passes as "not computable".
 */
export declare function crossCheckPayout(wagerAmount: number, claimedPayout: number, legs: OddsLeg[], tolerance?: number): ParlayCrossCheck;
//# sourceMappingURL=index.d.ts.map