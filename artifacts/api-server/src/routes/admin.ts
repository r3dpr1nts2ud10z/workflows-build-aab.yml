import { Router, type IRouter } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import {
  db,
  usersTable,
  receiptsTable,
  visitsTable,
  ledgerTable,
  adsTable,
  adEventsTable,
} from "@workspace/db";
import {
  GetCommandCenterResponse,
  GetReviewQueueResponse,
  ReviewReceiptParams,
  ReviewReceiptBody,
  ReviewReceiptResponse,
  ListAdsResponse,
  CreateAdBody,
  CreateAdResponse,
  UpdateAdParams,
  UpdateAdBody,
  UpdateAdResponse,
  SetSettlementPauseBody,
  SetSettlementPauseResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { requireAdmin } from "../middlewares/requireAdmin";
import { OPERATOR_FEE_RATE, TIERS } from "../lib/tiers";
import {
  MAX_GROSS_SETTLEMENT,
  DAILY_SETTLEMENT_CEILING,
  REVIEW_THRESHOLD_NET,
  RESERVE_MULTIPLE,
  RESERVE_BUFFER,
} from "../lib/risk";
import {
  isSettlementPaused,
  setSetting,
  SETTLEMENT_PAUSED_KEY,
} from "../lib/settings";
import { roqqetStatusSnapshot } from "../lib/roqqetStatus";
import { serializeReceipt } from "../lib/receipts";
import { activityTable } from "@workspace/db";
import { todayUTC } from "../lib/users";

const router: IRouter = Router();

const WINDOW_DAYS = 14;

function lastNDates(n: number): string[] {
  const out: string[] = [];
  const now = Date.now();
  for (let i = n - 1; i >= 0; i--) {
    out.push(new Date(now - i * 86_400_000).toISOString().slice(0, 10));
  }
  return out;
}

router.get(
  "/admin/command-center",
  requireAuth,
  requireAdmin,
  async (_req, res): Promise<void> => {
    const dates = lastNDates(WINDOW_DAYS);
    const today = todayUTC();
    const yesterday = dates[dates.length - 2];

    const yieldDayExpr = sql<string>`to_char(${receiptsTable.settledAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`;
    const dayAgoIso = new Date(Date.now() - 86_400_000).toISOString();
    const [
      yieldRows,
      visitRows,
      [userStats],
      [receiptStats],
      [feeStats],
      feeRows,
      [reviewStats],
      tierRows,
      [rollingStats],
      settlementPaused,
      sourceRows,
    ] = await Promise.all([
        db
          .select({
            date: yieldDayExpr,
            value: sql<number>`coalesce(sum(${receiptsTable.settlementAmount}), 0)::float`,
          })
          .from(receiptsTable)
          .where(
            sql`${receiptsTable.status} = 'settled' AND to_char(${receiptsTable.settledAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD') >= ${dates[0]}`,
          )
          .groupBy(yieldDayExpr),
        db
          .select({
            date: visitsTable.visitDate,
            value: sql<number>`count(*)::int`,
          })
          .from(visitsTable)
          .where(sql`${visitsTable.visitDate} >= ${dates[0]}::date`)
          .groupBy(visitsTable.visitDate),
        db
          .select({
            totalUsers: sql<number>`count(*)::int`,
          })
          .from(usersTable),
        db
          .select({
            totalReceipts: sql<number>`count(*)::int`,
            settledReceipts: sql<number>`count(*) filter (where ${receiptsTable.status} = 'settled')::int`,
            submittingUsers: sql<number>`count(distinct ${receiptsTable.userId})::int`,
          })
          .from(receiptsTable),
        db
          .select({
            feeBalance: sql<number>`coalesce(sum(${ledgerTable.amount}), 0)::float`,
          })
          .from(ledgerTable),
        db
          .select()
          .from(ledgerTable)
          .orderBy(desc(ledgerTable.createdAt))
          .limit(10),
        db
          .select({
            pendingCount: sql<number>`count(*)::int`,
            pendingExposure: sql<number>`coalesce(sum(${receiptsTable.quotedNet}), 0)::float`,
          })
          .from(receiptsTable)
          .where(eq(receiptsTable.status, "under_review")),
        db
          .select({
            tier: usersTable.tier,
            count: sql<number>`count(*)::int`,
          })
          .from(usersTable)
          .groupBy(usersTable.tier),
        db
          .select({
            payouts: sql<number>`coalesce(sum(${receiptsTable.settlementAmount}), 0)::float`,
          })
          .from(receiptsTable)
          .where(
            sql`${receiptsTable.status} = 'settled' AND ${receiptsTable.settledAt} >= ${dayAgoIso}`,
          ),
        isSettlementPaused(),
        db
          .select({
            source: sql<string>`coalesce(${visitsTable.source}, 'direct')`,
            visitors: sql<number>`count(distinct ${visitsTable.visitorId})::int`,
          })
          .from(visitsTable)
          .where(sql`${visitsTable.visitDate} >= ${dates[0]}::date`)
          .groupBy(sql`coalesce(${visitsTable.source}, 'direct')`)
          .orderBy(
            sql`count(distinct ${visitsTable.visitorId}) desc`,
          ),
      ]);

    const priceByTier = new Map<string, number>(
      TIERS.map((t) => [t.id, t.monthlyPrice]),
    );
    let mrr = 0;
    let activeSubscribers = 0;
    for (const row of tierRows) {
      const price = priceByTier.get(row.tier) ?? 0;
      if (price > 0) {
        mrr += price * row.count;
        activeSubscribers += row.count;
      }
    }
    const rolling24hPayouts =
      Math.round((rollingStats?.payouts ?? 0) * 100) / 100;

    const yieldByDate = new Map(yieldRows.map((r) => [r.date, r.value]));
    const visitsByDate = new Map(visitRows.map((r) => [r.date, r.value]));
    const dailyYield = dates.map((date) => ({
      date,
      value: Math.round((yieldByDate.get(date) ?? 0) * 100) / 100,
    }));
    const visitors = dates.map((date) => ({
      date,
      value: visitsByDate.get(date) ?? 0,
    }));

    const visitsToday = visitsByDate.get(today) ?? 0;
    const visitsYesterday = visitsByDate.get(yesterday) ?? 0;
    const changePct =
      visitsYesterday > 0
        ? Math.round(
            ((visitsToday - visitsYesterday) / visitsYesterday) * 1000,
          ) / 10
        : visitsToday > 0
          ? null
          : 0;

    const totalUsers = userStats?.totalUsers ?? 0;
    const submittingUsers = receiptStats?.submittingUsers ?? 0;
    const totalReceipts = receiptStats?.totalReceipts ?? 0;
    const settledReceipts = receiptStats?.settledReceipts ?? 0;

    res.json(
      GetCommandCenterResponse.parse({
        dailyYield,
        todayYield: yieldByDate.get(today)
          ? Math.round(yieldByDate.get(today)! * 100) / 100
          : 0,
        feeRate: OPERATOR_FEE_RATE,
        feeBalance: Math.round((feeStats?.feeBalance ?? 0) * 100) / 100,
        recentFees: feeRows.map((f) => ({
          id: f.id,
          source: f.source,
          amount: f.amount,
          description: f.description,
          createdAt: f.createdAt.toISOString(),
        })),
        visitors,
        visitorVelocity: {
          today: visitsToday,
          yesterday: visitsYesterday,
          changePct,
        },
        trafficSources: sourceRows.map((r) => ({
          source: r.source,
          visitors: r.visitors,
        })),
        conversion: {
          totalUsers,
          submittingUsers,
          signupToSubmitRate:
            totalUsers > 0
              ? Math.round((submittingUsers / totalUsers) * 1000) / 10
              : null,
          totalReceipts,
          settledReceipts,
          settlementRate:
            totalReceipts > 0
              ? Math.round((settledReceipts / totalReceipts) * 1000) / 10
              : null,
        },
        roqqet: roqqetStatusSnapshot(),
        risk: (() => {
          const treasury = Math.round((feeStats?.feeBalance ?? 0) * 100) / 100;
          const todaySettledNet =
            Math.round((yieldByDate.get(today) ?? 0) * 100) / 100;
          return {
            maxGrossSettlement: MAX_GROSS_SETTLEMENT,
            dailyCeiling: DAILY_SETTLEMENT_CEILING,
            todaySettledNet,
            ceilingUtilizationPct:
              Math.round(
                (todaySettledNet / DAILY_SETTLEMENT_CEILING) * 1000,
              ) / 10,
            reviewThreshold: REVIEW_THRESHOLD_NET,
            treasuryBalance: treasury,
            reserveCapacity:
              Math.round(
                Math.max(0, treasury * RESERVE_MULTIPLE - RESERVE_BUFFER) * 100,
              ) / 100,
            reserveMultiple: RESERVE_MULTIPLE,
            reserveBuffer: RESERVE_BUFFER,
            pendingReviewCount: reviewStats?.pendingCount ?? 0,
            pendingReviewExposure:
              Math.round((reviewStats?.pendingExposure ?? 0) * 100) / 100,
          };
        })(),
        solvency: {
          treasuryBalance: Math.round((feeStats?.feeBalance ?? 0) * 100) / 100,
          rolling24hPayouts,
          mrr: Math.round(mrr * 100) / 100,
          activeSubscribers,
          settlementPaused,
        },
      }),
    );
  },
);

router.post(
  "/admin/settlement-pause",
  requireAuth,
  requireAdmin,
  async (req, res): Promise<void> => {
    const body = SetSettlementPauseBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }
    await setSetting(
      SETTLEMENT_PAUSED_KEY,
      body.data.paused ? "true" : "false",
    );
    res.json(
      SetSettlementPauseResponse.parse({ settlementPaused: body.data.paused }),
    );
  },
);

router.get(
  "/admin/review-queue",
  requireAuth,
  requireAdmin,
  async (_req, res): Promise<void> => {
    const rows = await db
      .select({
        receipt: receiptsTable,
        userEmail: usersTable.email,
        userTier: usersTable.tier,
      })
      .from(receiptsTable)
      .innerJoin(usersTable, eq(usersTable.id, receiptsTable.userId))
      .where(eq(receiptsTable.status, "under_review"))
      .orderBy(desc(receiptsTable.submittedAt));
    const items = rows.map((r) => ({
      receipt: serializeReceipt(r.receipt),
      userEmail: r.userEmail,
      userTier: r.userTier,
    }));
    const totalExposure =
      Math.round(
        items.reduce((sum, i) => sum + (i.receipt.quotedNet ?? 0), 0) * 100,
      ) / 100;
    res.json(GetReviewQueueResponse.parse({ items, totalExposure }));
  },
);

router.post(
  "/admin/receipts/:id/review",
  requireAuth,
  requireAdmin,
  async (req, res): Promise<void> => {
    const params = ReviewReceiptParams.safeParse(req.params);
    const body = ReviewReceiptBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({
        error: (params.success ? body : params).error?.message ?? "Bad request",
      });
      return;
    }
    const [receipt] = await db
      .select()
      .from(receiptsTable)
      .where(eq(receiptsTable.id, params.data.id));
    if (!receipt) {
      res.status(404).json({ error: "Receipt not found" });
      return;
    }
    if (receipt.status !== "under_review") {
      res.status(409).json({ error: "Receipt is not under review." });
      return;
    }

    if (body.data.action === "reject") {
      const [updated] = await db
        .update(receiptsTable)
        .set({
          status: "rejected",
          statusReason:
            body.data.note?.trim() ||
            "Rejected by operator integrity review.",
        })
        .where(
          and(
            eq(receiptsTable.id, receipt.id),
            eq(receiptsTable.status, "under_review"),
          ),
        )
        .returning();
      if (!updated) {
        res.status(409).json({ error: "Receipt is not under review." });
        return;
      }
      await db.insert(activityTable).values({
        userId: receipt.userId,
        type: "receipt_rejected",
        message: `Receipt #${receipt.id} did not clear operator integrity review`,
      });
      res.json(ReviewReceiptResponse.parse(serializeReceipt(updated)));
      return;
    }

    // Approve: operator override clears the settlement at the quoted terms.
    const quotedNet = receipt.quotedNet ?? 0;
    const settled = await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(receiptsTable)
        .set({
          status: "settled",
          settlementAmount: quotedNet,
          statusReason: body.data.note?.trim() || null,
          settledAt: new Date(),
        })
        .where(
          and(
            eq(receiptsTable.id, receipt.id),
            eq(receiptsTable.status, "under_review"),
          ),
        )
        .returning();
      if (!updated) return null;
      await tx
        .update(usersTable)
        .set({ balance: sql`${usersTable.balance} + ${quotedNet}` })
        .where(eq(usersTable.id, receipt.userId));
      // Fail closed: the payout MUST debit treasury. A ledger conflict means
      // this receipt was already booked — roll back rather than credit twice.
      const bookedPayout = await tx
        .insert(ledgerTable)
        .values({
          source: "settlement_payout",
          amount: -quotedNet,
          description: `Settlement payout on receipt #${receipt.id} — $${quotedNet.toFixed(2)} net (cleared via operator review)`,
          refId: `receipt:${receipt.id}`,
        })
        .onConflictDoNothing()
        .returning();
      if (bookedPayout.length === 0) return null;
      await tx.insert(activityTable).values({
        userId: receipt.userId,
        type: "receipt_settled",
        message: `Receipt #${receipt.id} cleared operator integrity review and settled for $${quotedNet.toFixed(2)} net`,
      });
      return updated;
    });
    if (!settled) {
      res.status(409).json({ error: "Receipt is not under review." });
      return;
    }
    res.json(ReviewReceiptResponse.parse(serializeReceipt(settled)));
  },
);

function serializeAd(ad: typeof adsTable.$inferSelect) {
  return {
    id: ad.id,
    name: ad.name,
    kind: ad.kind,
    headline: ad.headline,
    body: ad.body,
    ctaLabel: ad.ctaLabel,
    ctaUrl: ad.ctaUrl,
    placement: ad.placement,
    weight: ad.weight,
    active: ad.active,
  };
}

router.get(
  "/admin/ads",
  requireAuth,
  requireAdmin,
  async (_req, res): Promise<void> => {
    const rows = await db
      .select({
        ad: adsTable,
        impressions: sql<number>`coalesce(sum(case when ${adEventsTable.kind} = 'impression' then 1 else 0 end), 0)::int`,
        clicks: sql<number>`coalesce(sum(case when ${adEventsTable.kind} = 'click' then 1 else 0 end), 0)::int`,
      })
      .from(adsTable)
      .leftJoin(adEventsTable, eq(adEventsTable.adId, adsTable.id))
      .groupBy(adsTable.id)
      .orderBy(desc(adsTable.id));
    res.json(
      ListAdsResponse.parse(
        rows.map((r) => ({
          ...serializeAd(r.ad),
          impressions: r.impressions,
          clicks: r.clicks,
        })),
      ),
    );
  },
);

router.post(
  "/admin/ads",
  requireAuth,
  requireAdmin,
  async (req, res): Promise<void> => {
    const body = CreateAdBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }
    const [created] = await db
      .insert(adsTable)
      .values({
        name: body.data.name,
        kind: body.data.kind,
        headline: body.data.headline,
        body: body.data.body,
        ctaLabel: body.data.ctaLabel,
        ctaUrl: body.data.ctaUrl,
        placement: body.data.placement ?? "any",
        weight: body.data.weight ?? 1,
      })
      .returning();
    res.status(201).json(CreateAdResponse.parse(serializeAd(created!)));
  },
);

router.patch(
  "/admin/ads/:id",
  requireAuth,
  requireAdmin,
  async (req, res): Promise<void> => {
    const params = UpdateAdParams.safeParse(req.params);
    const body = UpdateAdBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({ error: "Invalid ad update" });
      return;
    }
    const changes = Object.fromEntries(
      Object.entries(body.data).filter(([, v]) => v !== undefined),
    );
    if (Object.keys(changes).length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }
    const [updated] = await db
      .update(adsTable)
      .set(changes)
      .where(eq(adsTable.id, params.data.id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Ad not found" });
      return;
    }
    res.json(UpdateAdResponse.parse(serializeAd(updated)));
  },
);

export default router;
