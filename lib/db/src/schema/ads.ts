import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const adsTable = pgTable("ads", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  kind: text("kind").notNull().default("house"),
  headline: text("headline").notNull(),
  body: text("body").notNull(),
  ctaLabel: text("cta_label").notNull(),
  ctaUrl: text("cta_url").notNull(),
  placement: text("placement").notNull().default("any"),
  weight: integer("weight").notNull().default(1),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const adEventsTable = pgTable("ad_events", {
  id: serial("id").primaryKey(),
  adId: integer("ad_id").notNull(),
  kind: text("kind").notNull(),
  userId: text("user_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertAdSchema = createInsertSchema(adsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertAd = z.infer<typeof insertAdSchema>;
export type Ad = typeof adsTable.$inferSelect;
export type AdEvent = typeof adEventsTable.$inferSelect;
