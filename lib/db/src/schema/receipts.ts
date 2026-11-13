import {
  pgTable,
  text,
  serial,
  numeric,
  jsonb,
  date,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export type ReceiptLeg = {
  description: string;
  odds?: string | null;
  result: "hit" | "miss" | "void";
};

export const receiptsTable = pgTable("receipts", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  platform: text("platform").notNull(),
  wagerAmount: numeric("wager_amount", {
    precision: 14,
    scale: 2,
    mode: "number",
  }).notNull(),
  potentialPayout: numeric("potential_payout", {
    precision: 14,
    scale: 2,
    mode: "number",
  }).notNull(),
  legs: jsonb("legs").$type<ReceiptLeg[]>().notNull(),
  status: text("status").notNull().default("pending"),
  statusReason: text("status_reason"),
  settlementFraction: numeric("settlement_fraction", {
    precision: 8,
    scale: 6,
    mode: "number",
  }),
  settlementAmount: numeric("settlement_amount", {
    precision: 14,
    scale: 2,
    mode: "number",
  }),
  quotedGross: numeric("quoted_gross", {
    precision: 14,
    scale: 2,
    mode: "number",
  }),
  quotedNet: numeric("quoted_net", {
    precision: 14,
    scale: 2,
    mode: "number",
  }),
  betDate: date("bet_date", { mode: "string" }),
  submittedAt: timestamp("submitted_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  settledAt: timestamp("settled_at", { withTimezone: true }),
});

export const insertReceiptSchema = createInsertSchema(receiptsTable).omit({
  id: true,
  submittedAt: true,
  settledAt: true,
});
export type InsertReceipt = z.infer<typeof insertReceiptSchema>;
export type Receipt = typeof receiptsTable.$inferSelect;
