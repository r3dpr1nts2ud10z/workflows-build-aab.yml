import type { Receipt } from "@workspace/db";

export function serializeReceipt(r: Receipt) {
  return {
    id: r.id,
    platform: r.platform,
    wagerAmount: r.wagerAmount,
    potentialPayout: r.potentialPayout,
    legs: r.legs.map((leg) => ({
      description: leg.description,
      odds: leg.odds ?? null,
      result: leg.result,
    })),
    status: r.status as
      | "pending"
      | "verified"
      | "under_review"
      | "settled"
      | "rejected",
    statusReason: r.statusReason,
    settlementFraction: r.settlementFraction,
    settlementAmount: r.settlementAmount,
    quotedGross: r.quotedGross,
    quotedNet: r.quotedNet,
    betDate: r.betDate,
    submittedAt: r.submittedAt.toISOString(),
    settledAt: r.settledAt ? r.settledAt.toISOString() : null,
  };
}
