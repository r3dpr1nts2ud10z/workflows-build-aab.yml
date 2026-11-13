export type TierId = "demo" | "bronze" | "silver" | "gold" | "diamond";

/** Protocol Integrity & Settlement fee taken by the operator on settlements and subscriptions. */
export const OPERATOR_FEE_RATE = 0.2;

export type TierConfig = {
  id: TierId;
  name: string;
  monthlyPrice: number;
  dailyAttempts: number | null;
  payoutFraction: number;
  payoutLabel: string;
};

export const TIERS: TierConfig[] = [
  {
    id: "demo",
    name: "Demo",
    monthlyPrice: 0,
    dailyAttempts: 1,
    payoutFraction: 1 / 16,
    payoutLabel: "1/16",
  },
  {
    id: "bronze",
    name: "Bronze",
    monthlyPrice: 5,
    dailyAttempts: 3,
    payoutFraction: 1 / 8,
    payoutLabel: "1/8",
  },
  {
    id: "silver",
    name: "Silver",
    monthlyPrice: 10,
    dailyAttempts: 5,
    payoutFraction: 1 / 4,
    payoutLabel: "1/4",
  },
  {
    id: "gold",
    name: "Gold",
    monthlyPrice: 50,
    dailyAttempts: 10,
    payoutFraction: 1 / 2,
    payoutLabel: "1/2",
  },
  {
    id: "diamond",
    name: "Diamond",
    monthlyPrice: 100,
    dailyAttempts: null,
    payoutFraction: 1 / 2,
    payoutLabel: "1/2",
  },
];

export function getTier(id: string): TierConfig {
  return TIERS.find((t) => t.id === id) ?? TIERS[0];
}

export function whopPlanIdFor(tierId: TierId): string | null {
  const envName = `WHOP_PLAN_${tierId.toUpperCase()}`;
  return process.env[envName] ?? null;
}
