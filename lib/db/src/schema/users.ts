import {
  pgTable,
  text,
  integer,
  numeric,
  date,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email"),
  displayName: text("display_name"),
  tier: text("tier").notNull().default("demo"),
  balance: numeric("balance", { precision: 14, scale: 2, mode: "number" })
    .notNull()
    .default(0),
  attemptsUsedOn: date("attempts_used_on", { mode: "string" }),
  attemptsUsedCount: integer("attempts_used_count").notNull().default(0),
  whopMembershipId: text("whop_membership_id"),
  stripeAccountId: text("stripe_account_id"),
  whopRenewsAt: timestamp("whop_renews_at", { withTimezone: true }),
  pendingCheckoutId: text("pending_checkout_id"),
  pendingTier: text("pending_tier"),
  birthDate: text("birth_date"),
  birthTime: text("birth_time"),
  sunSign: text("sun_sign"),
  decan: integer("decan"),
  moonSign: text("moon_sign"),
  risingSign: text("rising_sign"),
  descendantSign: text("descendant_sign"),
  termsAcceptedAt: timestamp("terms_accepted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
