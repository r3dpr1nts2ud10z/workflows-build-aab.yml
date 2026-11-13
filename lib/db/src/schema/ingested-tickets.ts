import {
  jsonb,
  pgTable,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ingestedTicketsTable = pgTable(
  "ingested_tickets",
  {
    storageKey: varchar("storage_key", { length: 255 }).primaryKey(),
    sourceId: varchar("source_id", { length: 128 }).notNull(),
    ticketId: varchar("ticket_id", { length: 128 }).notNull(),
    payloadHash: varchar("payload_hash", { length: 64 }).notNull(),
    receipt: jsonb("receipt").notNull(),
    normalizedTicket: jsonb("normalized_ticket").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [unique("unique_source_ticket").on(t.sourceId, t.ticketId)],
);

export const insertIngestedTicketSchema = createInsertSchema(
  ingestedTicketsTable,
).omit({ createdAt: true });
export type InsertIngestedTicket = z.infer<typeof insertIngestedTicketSchema>;
export type IngestedTicket = typeof ingestedTicketsTable.$inferSelect;
