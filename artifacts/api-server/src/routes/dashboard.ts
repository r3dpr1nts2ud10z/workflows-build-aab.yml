import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, receiptsTable, activityTable } from "@workspace/db";
import {
  GetDashboardSummaryResponse,
  GetActivityResponse,
} from "@workspace/api-zod";
import { requireAuth, authedUserId } from "../middlewares/requireAuth";
import {
  getOrCreateUser,
  attemptsUsedToday,
  attemptsLimit,
} from "../lib/users";
import { getTier } from "../lib/tiers";

const router: IRouter = Router();

router.get(
  "/dashboard/summary",
  requireAuth,
  async (_req, res): Promise<void> => {
    const userId = authedUserId(res);
    const user = await getOrCreateUser(userId);
    const rows = await db
      .select()
      .from(receiptsTable)
      .where(eq(receiptsTable.userId, userId));
    const tier = getTier(user.tier);
    const pending = rows.filter((r) => r.status === "pending");
    const verified = rows.filter((r) => r.status === "verified");
    const settled = rows.filter((r) => r.status === "settled");
    const totalSettled = settled.reduce(
      (sum, r) => sum + (r.settlementAmount ?? 0),
      0,
    );
    const potentialUnclaimed = verified.reduce(
      (sum, r) => sum + r.potentialPayout * tier.payoutFraction,
      0,
    );
    res.json(
      GetDashboardSummaryResponse.parse({
        tier: user.tier,
        totalReceipts: rows.length,
        pendingCount: pending.length,
        verifiedCount: verified.length,
        settledCount: settled.length,
        totalSettled: Math.round(totalSettled * 100) / 100,
        potentialUnclaimed: Math.round(potentialUnclaimed * 100) / 100,
        attemptsUsedToday: attemptsUsedToday(user),
        attemptsLimit: attemptsLimit(user),
      }),
    );
  },
);

router.get("/activity", requireAuth, async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(activityTable)
    .where(eq(activityTable.userId, authedUserId(res)))
    .orderBy(desc(activityTable.createdAt))
    .limit(25);
  res.json(
    GetActivityResponse.parse(
      rows.map((a) => ({
        id: a.id,
        type: a.type,
        message: a.message,
        createdAt: a.createdAt.toISOString(),
      })),
    ),
  );
});

export default router;
