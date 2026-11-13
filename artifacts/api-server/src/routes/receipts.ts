import { Router, type IRouter } from "express";
import { and, asc, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import {
  db,
  receiptsTable,
  usersTable,
  activityTable,
  ledgerTable,
} from "@workspace/db";
import {
  ListReceiptsQueryParams,
  ListReceiptsResponse,
  CreateReceiptBody,
  CreateReceiptResponse,
  GetReceiptParams,
  GetReceiptResponse,
  SettleReceiptParams,
  SettleReceiptResponse,
  SearchReceiptsQueryParams,
  SearchReceiptsResponse,
} from "@workspace/api-zod";
import { crossCheckPayout } from "@workspace/odds";
import { requireAuth, authedUserId } from "../middlewares/requireAuth";
import { submitLimiter, settleLimiter } from "../middlewares/rateLimit";
import {
  getOrCreateUser,
  attemptsUsedToday,
  attemptsLimit,
  todayUTC,
} from "../lib/users";
import { getTier, OPERATOR_FEE_RATE } from "../lib/tiers";
import {
  MAX_GROSS_SETTLEMENT,
  DAILY_SETTLEMENT_CEILING,
  REVIEW_THRESHOLD_NET,
  RESERVE_MULTIPLE,
  RESERVE_BUFFER,
} from "../lib/risk";
import { isSettlementPaused } from "../lib/settings";
import { serializeReceipt } from "../lib/receipts";

const router: IRouter = Router();

router.get("/receipts", requireAuth, async (req, res): Promise<void> => {
  const params = ListReceiptsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const conds: SQL[] = [eq(receiptsTable.userId, authedUserId(res))];
  if (params.data.status) conds.push(eq(receiptsTable.status, params.data.status));
  if (params.data.platform)
    conds.push(ilike(receiptsTable.platform, `%${params.data.platform}%`));
  const rows = await db
    .select()
    .from(receiptsTable)
    .where(and(...conds))
    .orderBy(desc(receiptsTable.submittedAt));
  res.json(ListReceiptsResponse.parse(rows.map(serializeReceipt)));
});

router.post(
  "/receipts",
  submitLimiter,
  requireAuth,
  async (req, res): Promise<void> => {
  const parsed = CreateReceiptBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const missCount = parsed.data.legs.filter((l) => l.result === "miss").length;
  if (missCount !== 1) {
    res.status(400).json({
      error:
        "A near-miss receipt must contain exactly one missed leg. This receipt has " +
        `${missCount} missed legs.`,
    });
    return;
  }
  const hitCount = parsed.data.legs.filter((l) => l.result === "hit").length;
  if (hitCount < 4) {
    res.status(400).json({
      error:
        "A near-miss receipt must contain at least 4 hit legs (voided legs don't count toward hits). " +
        `This receipt has ${hitCount} hit legs.`,
    });
    return;
  }
  // Sportsbook cross-reference: when every live leg carries odds, the claimed
  // payout must reconcile with wager x combined decimal odds (voids excluded,
  // exactly how the books recalculate voided parlays).
  const check = crossCheckPayout(
    parsed.data.wagerAmount,
    parsed.data.potentialPayout,
    parsed.data.legs,
  );
  if (check.computable && !check.ok) {
    res.status(400).json({
      error:
        "Payout cross-reference failed: the sportsbook calculator computes " +
        `$${check.expectedPayout?.toFixed(2)} (${check.combinedAmerican} combined over live legs) ` +
        `for a $${parsed.data.wagerAmount.toFixed(2)} wager, but this receipt claims ` +
        `$${parsed.data.potentialPayout.toFixed(2)}. Check the leg odds and the payout on your bet slip.`,
    });
    return;
  }
  const userId = authedUserId(res);
  const user = await getOrCreateUser(userId);
  if (!user.termsAcceptedAt) {
    res.status(403).json({
      error:
        "You must accept the N3PSQAL3 Terms & Conditions before submitting receipts.",
    });
    return;
  }
  const [receipt] = await db
    .insert(receiptsTable)
    .values({
      userId,
      platform: parsed.data.platform,
      wagerAmount: parsed.data.wagerAmount,
      potentialPayout: parsed.data.potentialPayout,
      legs: parsed.data.legs.map((l) => ({
        description: l.description,
        odds: l.odds ?? null,
        result: l.result,
      })),
      status: "verified",
      betDate: parsed.data.betDate ?? null,
    })
    .returning();
  await db.insert(activityTable).values({
    userId,
    type: "receipt_verified",
    message: `Receipt #${receipt.id} (${receipt.platform}, ${receipt.legs.length} legs) cleared verification`,
  });
  res.status(201).json(CreateReceiptResponse.parse(serializeReceipt(receipt)));
});

router.get("/receipts/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetReceiptParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [receipt] = await db
    .select()
    .from(receiptsTable)
    .where(
      and(
        eq(receiptsTable.id, params.data.id),
        eq(receiptsTable.userId, authedUserId(res)),
      ),
    );
  if (!receipt) {
    res.status(404).json({ error: "Receipt not found" });
    return;
  }
  res.json(GetReceiptResponse.parse(serializeReceipt(receipt)));
});

router.post(
  "/receipts/:id/settle",
  settleLimiter,
  requireAuth,
  async (req, res): Promise<void> => {
    const params = SettleReceiptParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const userId = authedUserId(res);
    if (await isSettlementPaused()) {
      res.status(503).json({
        error:
          "Settlements are temporarily paused by the operator for protocol integrity. Please try again shortly.",
      });
      return;
    }
    const user = await getOrCreateUser(userId);
    if (!user.termsAcceptedAt) {
      res.status(403).json({
        error:
          "You must accept the N3PSQAL3 Terms & Conditions before executing settlements.",
      });
      return;
    }
    const [receipt] = await db
      .select()
      .from(receiptsTable)
      .where(
        and(
          eq(receiptsTable.id, params.data.id),
          eq(receiptsTable.userId, userId),
        ),
      );
    if (!receipt) {
      res.status(404).json({ error: "Receipt not found" });
      return;
    }
    if (receipt.status !== "verified") {
      res.status(409).json({
        error:
          receipt.status === "settled"
            ? "This receipt has already been settled."
            : "This receipt is not in a settleable state.",
      });
      return;
    }
    const limit = attemptsLimit(user);
    const used = attemptsUsedToday(user);
    if (limit != null && used >= limit) {
      res.status(402).json({
        error: `You have used all ${limit} settlement attempts for today on the ${getTier(user.tier).name} tier. Upgrade for more attempts.`,
      });
      return;
    }
    const tier = getTier(user.tier);
    const fraction = tier.payoutFraction;
    const round2 = (n: number) => Math.round(n * 100) / 100;
    const rawGross = round2(receipt.potentialPayout * fraction);
    // Layer 1 — hard per-receipt cap on gross settlement.
    const gross = Math.min(rawGross, MAX_GROSS_SETTLEMENT);
    const capApplied = rawGross > MAX_GROSS_SETTLEMENT;
    const fee = round2(gross * OPERATOR_FEE_RATE);
    const amount = round2(gross - fee);

    class SettleError extends Error {
      constructor(
        public code: number,
        message: string,
      ) {
        super(message);
      }
    }
    try {
      const result = await db.transaction(async (tx) => {
        const today = todayUTC();

        // Serialize settlement risk checks: concurrent settle transactions
        // queue behind this advisory lock (released at commit/rollback), so
        // the breaker and reserve sums below cannot be read stale.
        await tx.execute(
          sql`SELECT pg_advisory_xact_lock(hashtext('settlement_risk_gate'))`,
        );

        // Re-check the global pause under lock so a toggle that lands after the
        // pre-transaction check can never let an auto-settlement slip through.
        if (await isSettlementPaused(tx)) {
          throw new SettleError(
            503,
            "Settlements are temporarily paused by the operator for protocol integrity. Please try again shortly.",
          );
        }

        // Layers 3 & 4 — route large or under-reserved settlements to operator review.
        let reviewReason: string | null = null;
        if (amount > REVIEW_THRESHOLD_NET) {
          reviewReason = `Net settlement $${amount.toFixed(2)} exceeds the $${REVIEW_THRESHOLD_NET.toFixed(2)} auto-clear threshold — held for operator integrity review.`;
        } else {
          // Absolute reserve gate: every auto-payout must be fully covered by
          // real treasury cash and leave the buffer intact. The protocol can
          // never auto-pay money it has not banked.
          const [reserve] = await tx
            .select({
              treasury: sql<number>`coalesce(sum(${ledgerTable.amount}), 0)::float`,
            })
            .from(ledgerTable);
          const spendable =
            (reserve?.treasury ?? 0) * RESERVE_MULTIPLE - RESERVE_BUFFER;
          if (amount > spendable) {
            reviewReason = `Net settlement $${amount.toFixed(2)} exceeds available treasury reserve ($${Math.max(0, spendable).toFixed(2)}) — held for operator integrity review.`;
          }
        }

        if (!reviewReason) {
          // Layer 2 — global daily settlement circuit breaker (UTC day, net).
          const [breaker] = await tx
            .select({
              todayTotal: sql<number>`coalesce(sum(${receiptsTable.settlementAmount}), 0)::float`,
            })
            .from(receiptsTable)
            .where(
              sql`${receiptsTable.status} = 'settled' AND to_char(${receiptsTable.settledAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD') = ${today}`,
            );
          if ((breaker?.todayTotal ?? 0) + amount > DAILY_SETTLEMENT_CEILING) {
            throw new SettleError(
              503,
              "Settlement circuit breaker engaged: the protocol's daily settlement ceiling has been reached. Try again after the UTC day rolls over.",
            );
          }
        }

        const usedTodayExpr = sql`(CASE WHEN ${usersTable.attemptsUsedOn} = ${today} THEN ${usersTable.attemptsUsedCount} ELSE 0 END)`;
        const attemptWhere =
          limit != null
            ? and(eq(usersTable.id, userId), sql`${usedTodayExpr} < ${limit}`)
            : eq(usersTable.id, userId);
        const [consumed] = await tx
          .update(usersTable)
          .set({
            balance: sql`${usersTable.balance} + ${reviewReason ? 0 : amount}`,
            attemptsUsedCount: sql`${usedTodayExpr} + 1`,
            attemptsUsedOn: today,
          })
          .where(attemptWhere)
          .returning();
        if (!consumed) {
          throw new SettleError(
            402,
            `You have used all ${limit} settlement attempts for today on the ${tier.name} tier. Upgrade for more attempts.`,
          );
        }

        if (reviewReason) {
          const [queued] = await tx
            .update(receiptsTable)
            .set({
              status: "under_review",
              statusReason: reviewReason,
              settlementFraction: fraction,
              quotedGross: gross,
              quotedNet: amount,
            })
            .where(
              and(
                eq(receiptsTable.id, receipt.id),
                eq(receiptsTable.userId, userId),
                eq(receiptsTable.status, "verified"),
              ),
            )
            .returning();
          if (!queued) {
            throw new SettleError(
              409,
              "This receipt is no longer in a settleable state.",
            );
          }
          await tx.insert(activityTable).values({
            userId,
            type: "receipt_under_review",
            message: `Receipt #${receipt.id} held for operator integrity review — quoted $${amount.toFixed(2)} net at ${tier.payoutLabel}`,
          });
          return queued;
        }

        const [updatedReceipt] = await tx
          .update(receiptsTable)
          .set({
            status: "settled",
            settlementFraction: fraction,
            settlementAmount: amount,
            quotedGross: gross,
            quotedNet: amount,
            settledAt: new Date(),
          })
          .where(
            and(
              eq(receiptsTable.id, receipt.id),
              eq(receiptsTable.userId, userId),
              eq(receiptsTable.status, "verified"),
            ),
          )
          .returning();
        if (!updatedReceipt) {
          throw new SettleError(409, "This receipt has already been settled.");
        }
        // Fail closed: the payout MUST debit treasury. If the ledger row
        // conflicts (already booked), the balance credit above would leave
        // treasury overstated — roll the whole settlement back instead.
        const bookedPayout = await tx
          .insert(ledgerTable)
          .values({
            source: "settlement_payout",
            amount: -amount,
            description: `Settlement payout on receipt #${receipt.id} — $${amount.toFixed(2)} net at ${tier.payoutLabel} (gross $${gross.toFixed(2)}${capApplied ? `, capped from $${rawGross.toFixed(2)}` : ""})`,
            refId: `receipt:${receipt.id}`,
          })
          .onConflictDoNothing()
          .returning();
        if (bookedPayout.length === 0) {
          throw new SettleError(
            409,
            "This receipt has already been settled.",
          );
        }
        await tx.insert(activityTable).values({
          userId,
          type: "receipt_settled",
          message: `Receipt #${receipt.id} settled at ${tier.payoutLabel} for $${amount.toFixed(2)} net (20% Protocol Integrity & Settlement fee applied to $${gross.toFixed(2)} gross${capApplied ? `, capped from $${rawGross.toFixed(2)}` : ""})`,
        });
        return updatedReceipt;
      });
      res.json(SettleReceiptResponse.parse(serializeReceipt(result)));
    } catch (err) {
      if (err instanceof SettleError) {
        res.status(err.code).json({ error: err.message });
        return;
      }
      throw err;
    }
  },
);

router.get("/search", requireAuth, async (req, res): Promise<void> => {
  const params = SearchReceiptsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const conds: SQL[] = [eq(receiptsTable.userId, authedUserId(res))];
  const { q, platform, status, minLegs, sort } = params.data;
  if (q) {
    const like = `%${q}%`;
    const qCond = or(
      ilike(receiptsTable.platform, like),
      sql`${receiptsTable.legs}::text ILIKE ${like}`,
    );
    if (qCond) conds.push(qCond);
  }
  if (platform) conds.push(ilike(receiptsTable.platform, `%${platform}%`));
  if (status) conds.push(eq(receiptsTable.status, status));
  if (minLegs != null)
    conds.push(sql`jsonb_array_length(${receiptsTable.legs}) >= ${minLegs}`);

  const orderBy =
    sort === "oldest"
      ? asc(receiptsTable.submittedAt)
      : sort === "payout_desc"
        ? desc(receiptsTable.potentialPayout)
        : sort === "payout_asc"
          ? asc(receiptsTable.potentialPayout)
          : sort === "wager_desc"
            ? desc(receiptsTable.wagerAmount)
            : desc(receiptsTable.submittedAt);

  const rows = await db
    .select()
    .from(receiptsTable)
    .where(and(...conds))
    .orderBy(orderBy);
  res.json(
    SearchReceiptsResponse.parse({
      receipts: rows.map(serializeReceipt),
      total: rows.length,
    }),
  );
});

export default router;
