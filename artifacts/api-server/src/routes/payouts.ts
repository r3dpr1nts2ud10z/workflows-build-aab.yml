import { Router, type IRouter } from "express";
import Stripe from "stripe";
import { eq, sql, and, inArray, lt } from "drizzle-orm";
import { db, usersTable, payoutsTable, activityTable } from "@workspace/db";
import {
  GetPayoutStatusResponse,
  OnboardPayoutsBody,
  OnboardPayoutsResponse,
  WithdrawPayoutBody,
  WithdrawPayoutResponse,
} from "@workspace/api-zod";
import { requireAuth, authedUserId } from "../middlewares/requireAuth";
import { getOrCreateUser } from "../lib/users";
import { getUncachableStripeClient } from "../stripeClient";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const MIN_WITHDRAWAL = 5;

/**
 * Payout state machine: pending -> processing -> paid | failed.
 * - "pending":    balance debited, transfer not yet attempted
 * - "processing": transfer attempted, outcome not yet recorded
 * - "paid":       transfer confirmed at Stripe
 * - "failed":     transfer definitively not created; balance refunded
 * Every transfer carries transfer_group + idempotency key `payout:{id}` so
 * retries can never double-send and the reconciler can find strays.
 */

function transferGroup(payoutId: number): string {
  return `payout:${payoutId}`;
}

/** Refund the debit iff the payout row is still in a non-final state. Atomic. */
async function refundPayout(payoutId: number, reason: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(payoutsTable)
      .set({ status: "failed", failureReason: reason.slice(0, 500) })
      .where(
        and(
          eq(payoutsTable.id, payoutId),
          inArray(payoutsTable.status, ["pending", "processing"]),
        ),
      )
      .returning();
    if (!row) return false; // already finalized elsewhere — do NOT touch balance
    await tx
      .update(usersTable)
      .set({ balance: sql`${usersTable.balance} + ${row.amount}` })
      .where(eq(usersTable.id, row.userId));
    return true;
  });
}

/** Mark paid iff still non-final. Never touches balance. */
async function markPaid(payoutId: number, transferId: string): Promise<boolean> {
  const [row] = await db
    .update(payoutsTable)
    .set({ status: "paid", stripeTransferId: transferId })
    .where(
      and(
        eq(payoutsTable.id, payoutId),
        inArray(payoutsTable.status, ["pending", "processing"]),
      ),
    )
    .returning();
  return !!row;
}

/** A Stripe error that proves the transfer was NOT created (safe to refund). */
function isDefinitiveStripeRejection(err: unknown): boolean {
  if (!(err instanceof Stripe.errors.StripeError)) return false;
  if (err.type === "StripeConnectionError") return false; // ambiguous — may have landed
  const status = err.statusCode ?? 0;
  return status >= 400 && status < 500 && status !== 409;
}

/**
 * Reconcile stale pending/processing payouts: ask Stripe whether the
 * transfer exists (by transfer_group) and finalize deterministically.
 * Runs at startup and on an interval.
 */
export async function reconcileStalePayouts(): Promise<void> {
  const cutoff = new Date(Date.now() - 10 * 60 * 1000);
  const stale = await db
    .select()
    .from(payoutsTable)
    .where(
      and(
        inArray(payoutsTable.status, ["pending", "processing"]),
        lt(payoutsTable.createdAt, cutoff),
      ),
    );
  if (stale.length === 0) return;
  const stripe = await getUncachableStripeClient();
  for (const payout of stale) {
    try {
      const existing = await stripe.transfers.list({
        transfer_group: transferGroup(payout.id),
        limit: 1,
      });
      if (existing.data.length > 0) {
        const done = await markPaid(payout.id, existing.data[0].id);
        logger.info(
          { payoutId: payout.id, transferId: existing.data[0].id, done },
          "Reconciler: stray payout confirmed paid",
        );
      } else {
        const refunded = await refundPayout(
          payout.id,
          "Reconciler: no transfer found at Stripe after timeout window",
        );
        logger.info({ payoutId: payout.id, refunded }, "Reconciler: stray payout refunded");
      }
    } catch (err) {
      // Leave the row for the next pass — never guess with money.
      logger.error({ err, payoutId: payout.id }, "Reconciler: could not finalize payout");
    }
  }
}

/** Current payout-account status for the authed user. */
router.get("/payouts/status", requireAuth, async (req, res) => {
  const userId = authedUserId(res);
  const user = await getOrCreateUser(userId);
  if (!user.stripeAccountId) {
    res.json(
      GetPayoutStatusResponse.parse({
        connected: false,
        payoutsEnabled: false,
        requirementsDue: 0,
      }),
    );
    return;
  }
  const stripe = await getUncachableStripeClient();
  const account = await stripe.accounts.retrieve(user.stripeAccountId);
  res.json(
    GetPayoutStatusResponse.parse({
      connected: true,
      payoutsEnabled: account.payouts_enabled === true,
      requirementsDue: account.requirements?.currently_due?.length ?? 0,
    }),
  );
});

/** Only allow return URLs pointing at this app's own domains. */
function isAllowedReturnUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  const allowed = new Set(
    (process.env.REPLIT_DOMAINS ?? "")
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean),
  );
  if (process.env.REPLIT_DEV_DOMAIN) allowed.add(process.env.REPLIT_DEV_DOMAIN);
  return allowed.has(url.hostname) || url.hostname === "localhost";
}

/** Create (or resume) Stripe Connect Express onboarding. */
router.post("/payouts/onboard", requireAuth, async (req, res) => {
  const userId = authedUserId(res);
  const parsed = OnboardPayoutsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { returnUrl } = parsed.data;
  if (!isAllowedReturnUrl(returnUrl)) {
    res.status(400).json({ error: "returnUrl must point at this application" });
    return;
  }

  const user = await getOrCreateUser(userId);
  if (user.tier === "demo") {
    res.status(403).json({
      error:
        "Cash-outs are reserved for paid tiers. Upgrade to Bronze or above to unlock withdrawals.",
    });
    return;
  }
  const stripe = await getUncachableStripeClient();

  let accountId = user.stripeAccountId;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      metadata: { userId },
      capabilities: { transfers: { requested: true } },
    });
    accountId = account.id;
    await db
      .update(usersTable)
      .set({ stripeAccountId: accountId })
      .where(eq(usersTable.id, userId));
  }

  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: returnUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  });
  res.json(OnboardPayoutsResponse.parse({ url: link.url }));
});

/** Withdraw settled balance as a real Stripe transfer. Fail-closed. */
router.post("/payouts/withdraw", requireAuth, async (req, res) => {
  const userId = authedUserId(res);
  const parsed = WithdrawPayoutBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const amount = Math.round(parsed.data.amount * 100) / 100;
  if (!(amount >= MIN_WITHDRAWAL)) {
    res
      .status(400)
      .json({ error: `Minimum withdrawal is $${MIN_WITHDRAWAL.toFixed(2)}.` });
    return;
  }

  const user = await getOrCreateUser(userId);
  if (user.tier === "demo") {
    res.status(403).json({
      error:
        "Cash-outs are reserved for paid tiers. Upgrade to Bronze or above to unlock withdrawals.",
    });
    return;
  }
  if (!user.stripeAccountId) {
    res.status(400).json({
      error: "No payout account on file. Set up your payout account first.",
    });
    return;
  }

  const stripe = await getUncachableStripeClient();
  const account = await stripe.accounts.retrieve(user.stripeAccountId);
  if (account.payouts_enabled !== true) {
    res.status(400).json({
      error:
        "Your payout account isn't fully verified yet. Finish onboarding before withdrawing.",
    });
    return;
  }

  // Phase 1 (fail closed): debit the balance and book a pending payout row
  // inside a tx, serialized per-user behind an advisory lock so concurrent
  // withdrawals can't jointly overdraw the balance.
  let payoutId: number;
  let newBalance: number;
  try {
    const booked = await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtext(${"payout:" + userId}))`,
      );
      const [debited] = await tx
        .update(usersTable)
        .set({ balance: sql`${usersTable.balance} - ${amount}` })
        .where(
          sql`${usersTable.id} = ${userId} AND ${usersTable.balance} >= ${amount}`,
        )
        .returning();
      if (!debited) {
        throw new Error("INSUFFICIENT_BALANCE");
      }
      const [row] = await tx
        .insert(payoutsTable)
        .values({ userId, amount, status: "pending" })
        .returning();
      if (!row) throw new Error("PAYOUT_ROW_FAILED");
      return { payoutId: row.id, newBalance: debited.balance };
    });
    payoutId = booked.payoutId;
    newBalance = booked.newBalance;
  } catch (err) {
    if (err instanceof Error && err.message === "INSUFFICIENT_BALANCE") {
      res.status(402).json({
        error: `Insufficient settled balance. You have $${user.balance.toFixed(2)} available.`,
      });
      return;
    }
    throw err;
  }

  // Phase 2: mark processing, then attempt the transfer with a deterministic
  // idempotency key — a retried request can never create a second transfer.
  await db
    .update(payoutsTable)
    .set({ status: "processing" })
    .where(and(eq(payoutsTable.id, payoutId), eq(payoutsTable.status, "pending")));

  let transfer: Stripe.Transfer;
  try {
    transfer = await stripe.transfers.create(
      {
        amount: Math.round(amount * 100),
        currency: "usd",
        destination: user.stripeAccountId,
        transfer_group: transferGroup(payoutId),
        metadata: { userId, payoutId: String(payoutId) },
      },
      { idempotencyKey: transferGroup(payoutId) },
    );
  } catch (err) {
    const reason = err instanceof Error ? err.message : "Unknown transfer error";
    if (isDefinitiveStripeRejection(err)) {
      // Stripe proved the transfer was not created — safe to refund.
      logger.error({ err, userId, payoutId }, "Transfer rejected; refunding");
      await refundPayout(payoutId, reason);
      res.status(502).json({
        error:
          "The transfer was rejected by the payment rail — your balance has been refunded in full. " +
          `Rail message: ${reason}`,
      });
    } else {
      // Ambiguous (network/timeout/5xx): the transfer may exist. Do NOT
      // refund — leave "processing" for the reconciler to finalize.
      logger.error(
        { err, userId, payoutId },
        "Transfer outcome unknown; left for reconciliation",
      );
      res.status(502).json({
        error:
          "The payment rail didn't confirm the transfer. Your withdrawal is held in processing " +
          "and will be automatically confirmed or refunded within minutes — do not resubmit.",
      });
    }
    return;
  }

  // Transfer definitively exists. Bookkeeping failures beyond this point
  // must NEVER refund — the reconciler will converge the row to paid.
  try {
    await markPaid(payoutId, transfer.id);
    await db.insert(activityTable).values({
      userId,
      type: "cash_out",
      message: `Cash out of $${amount.toFixed(2)} sent to your payout account (transfer ${transfer.id}).`,
    });
  } catch (err) {
    logger.error(
      { err, payoutId, transferId: transfer.id },
      "Post-transfer bookkeeping failed; reconciler will converge",
    );
  }
  res.json(
    WithdrawPayoutResponse.parse({
      amount,
      balance: newBalance,
      transferId: transfer.id,
    }),
  );
});

export default router;
