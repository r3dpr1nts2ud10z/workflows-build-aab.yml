import {
  pgTable,
  text,
  serial,
  numeric,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ledgerTable = pgTable(
  "operator_ledger",
  {
    id: serial("id").primaryKey(),
    source: text("source").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2, mode: "number" })
      .notNull(),
    description: text("description"),
    refId: text("ref_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("operator_ledger_ref_id_idx").on(t.refId)],
);

export const insertLedgerSchema = createInsertSchema(ledgerTable).omit({
  id: true,
  createdAt: true,
});
export type InsertLedgerEntry = z.infer<typeof insertLedgerSchema>;
export type LedgerEntry = typeof ledgerTable.$inferSelect;
