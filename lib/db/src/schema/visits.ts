import {
  pgTable,
  text,
  serial,
  date,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const visitsTable = pgTable(
  "visits",
  {
    id: serial("id").primaryKey(),
    visitorId: text("visitor_id").notNull(),
    visitDate: date("visit_date", { mode: "string" }).notNull(),
    source: text("source"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("visits_visitor_date_idx").on(t.visitorId, t.visitDate)],
);

export const insertVisitSchema = createInsertSchema(visitsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertVisit = z.infer<typeof insertVisitSchema>;
export type Visit = typeof visitsTable.$inferSelect;
