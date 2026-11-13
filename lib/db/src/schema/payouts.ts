import {
  pgTable,
  text,
  serial,
  numeric,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Cash-out ledger: every withdrawal of settled balance to a user's
 * Stripe Connect account. Fail-closed audit trail — a row exists for
 * every attempted movement of real money.
 */
export const payoutsTable = pgTable("payouts", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2, mode: "number" })
    .notNull(),
  status: text("status").notNull().default("pending"), // pending | processing | paid | failed
  stripeTransferId: text("stripe_transfer_id"),
  failureReason: text("failure_reason"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertPayoutSchema = createInsertSchema(payoutsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPayout = z.infer<typeof insertPayoutSchema>;
export type Payout = typeof payoutsTable.$inferSelect;
