import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import {
  db,
  usersTable,
  activityTable,
  ledgerTable,
  type User,
} from "@workspace/db";
import {
  ListTiersResponse,
  CreateCheckoutBody,
  CreateCheckoutResponse,
  GetSubscriptionResponse,
  SyncSubscriptionResponse,
} from "@workspace/api-zod";
import { requireAuth, authedUserId } from "../middlewares/requireAuth";
import { getOrCreateUser } from "../lib/users";
import { TIERS, getTier, whopPlanIdFor, type TierId } from "../lib/tiers";
import { getWhopClient } from "../lib/whopClient";

const router: IRouter = Router();

router.get("/tiers", async (_req, res): Promise<void> => {
  res.json(
    ListTiersResponse.parse(
      TIERS.map((t) => ({
        id: t.id,
        name: t.name,
        monthlyPrice: t.monthlyPrice,
        dailyAttempts: t.dailyAttempts,
        payoutFraction: t.payoutFraction,
        payoutLabel: t.payoutLabel,
        purchasable: t.id !== "demo" && whopPlanIdFor(t.id) != null,
      })),
    ),
  );
});

router.post("/whop/checkout", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateCheckoutBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const tierId = parsed.data.tierId as TierId;
  if (tierId === "demo") {
    res.status(400).json({ error: "The Demo tier is free — no checkout needed." });
    return;
  }
  const planId = whopPlanIdFor(tierId);
  if (!planId) {
    res
      .status(503)
      .json({ error: "This tier is not yet available for purchase." });
    return;
  }
  const userId = authedUserId(res);
  await getOrCreateUser(userId);
  const client = await getWhopClient();
  const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
  const config = await client.checkoutConfigurations.create({
    plan_id: planId,
    redirect_url: domain ? `https://${domain}/tiers?upgraded=1` : null,
    metadata: { app_user_id: userId, tier_id: tierId },
  });
  await db
    .update(usersTable)
    .set({ pendingCheckoutId: config.id, pendingTier: tierId })
    .where(eq(usersTable.id, userId));
  res.json(
    CreateCheckoutResponse.parse({
      checkoutId: config.id,
      purchaseUrl: config.purchase_url,
    }),
  );
});

async function verifySubscription(user: User): Promise<{
  tier: string;
  active: boolean;
  renewsAt: string | null;
}> {
  if (!user.whopMembershipId) {
    return { tier: "demo", active: false, renewsAt: null };
  }
  const client = await getWhopClient();
  const membership = await client.memberships.retrieve(user.whopMembershipId);
  const active =
    membership.status === "active" || membership.status === "trialing";
  if (!active && user.tier !== "demo") {
    await db
      .update(usersTable)
      .set({ tier: "demo", whopRenewsAt: null })
      .where(eq(usersTable.id, user.id));
    await db.insert(activityTable).values({
      userId: user.id,
      type: "tier_changed",
      message: `Subscription lapsed — access reverted to Demo tier`,
    });
    return { tier: "demo", active: false, renewsAt: null };
  }
  return {
    tier: active ? user.tier : "demo",
    active,
    renewsAt: membership.renewal_period_end ?? null,
  };
}

router.get(
  "/whop/subscription",
  requireAuth,
  async (_req, res): Promise<void> => {
    const user = await getOrCreateUser(authedUserId(res));
    const sub = await verifySubscription(user);
    res.json(GetSubscriptionResponse.parse(sub));
  },
);

router.post("/whop/sync", requireAuth, async (_req, res): Promise<void> => {
  const userId = authedUserId(res);
  let user = await getOrCreateUser(userId);

  if (user.pendingCheckoutId && user.pendingTier) {
    const client = await getWhopClient();
    const companyId = process.env.WHOP_COMPANY_ID;
    if (!companyId) {
      res.status(503).json({ error: "Payment system is not configured yet." });
      return;
    }
    const pendingPlanId = whopPlanIdFor(user.pendingTier as TierId);
    const payments = client.payments.list({
      company_id: companyId,
      ...(pendingPlanId ? { plan_ids: [pendingPlanId] } : {}),
    });
    for await (const payment of payments) {
      const metadata = payment.metadata as Record<string, unknown> | null;
      if (metadata?.app_user_id !== userId) continue;
      const membership = payment.membership;
      if (
        membership &&
        (membership.status === "active" || membership.status === "trialing")
      ) {
        const newTier = getTier(user.pendingTier);
        const [updated] = await db
          .update(usersTable)
          .set({
            tier: newTier.id,
            whopMembershipId: membership.id,
            pendingCheckoutId: null,
            pendingTier: null,
          })
          .where(
            and(
              eq(usersTable.id, userId),
              eq(usersTable.pendingCheckoutId, user.pendingCheckoutId),
            ),
          )
          .returning();
        if (!updated) {
          // Another concurrent sync already processed this checkout.
          user = await getOrCreateUser(userId);
          break;
        }
        await db
          .insert(ledgerTable)
          .values({
            source: "subscription_revenue",
            amount: newTier.monthlyPrice,
            description: `Subscription revenue — ${newTier.name} tier ($${newTier.monthlyPrice.toFixed(2)}/mo)`,
            refId: `payment:${payment.id}`,
          })
          .onConflictDoNothing();
        await db.insert(activityTable).values({
          userId,
          type: "tier_changed",
          message: `Upgraded to ${newTier.name} tier — payouts now at ${newTier.payoutLabel}`,
        });
        user = updated;
        break;
      }
    }
  }

  const sub = await verifySubscription(user);
  res.json(SyncSubscriptionResponse.parse(sub));
});

export default router;
