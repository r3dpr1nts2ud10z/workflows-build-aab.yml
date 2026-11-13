import { eq } from "drizzle-orm";
import { db, usersTable, type User } from "@workspace/db";
import { clerkClient } from "@clerk/express";
import { getTier } from "./tiers";
import { logger } from "./logger";
import { isAdminEmail } from "../middlewares/requireAdmin";

export function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getOrCreateUser(userId: string): Promise<User> {
  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  if (existing) return existing;

  let email: string | null = null;
  let displayName: string | null = null;
  try {
    const cu = await clerkClient.users.getUser(userId);
    email = cu.primaryEmailAddress?.emailAddress ?? null;
    displayName =
      [cu.firstName, cu.lastName].filter(Boolean).join(" ") ||
      cu.username ||
      null;
  } catch (err) {
    logger.warn({ err, userId }, "Failed to fetch Clerk user details");
  }

  const [created] = await db
    .insert(usersTable)
    .values({ id: userId, email, displayName })
    .onConflictDoNothing()
    .returning();
  if (created) return created;

  const [row] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  return row;
}

export function attemptsUsedToday(user: User): number {
  return user.attemptsUsedOn === todayUTC() ? user.attemptsUsedCount : 0;
}

export function attemptsLimit(user: User): number | null {
  return getTier(user.tier).dailyAttempts;
}

export function zodiacOf(user: User): {
  birthDate: string;
  birthTime: string | null;
  sunSign: string;
  decan: number;
  moonSign: string | null;
  risingSign: string | null;
  descendantSign: string | null;
} | null {
  if (!user.birthDate || !user.sunSign || user.decan == null) return null;
  return {
    birthDate: user.birthDate,
    birthTime: user.birthTime,
    sunSign: user.sunSign,
    decan: user.decan,
    moonSign: user.moonSign,
    risingSign: user.risingSign,
    descendantSign: user.descendantSign,
  };
}

export function serializeUser(user: User) {
  return {
    id: user.id,
    isAdmin: isAdminEmail(user.email),
    email: user.email,
    displayName: user.displayName,
    tier: user.tier as "demo" | "bronze" | "silver" | "gold" | "diamond",
    balance: user.balance,
    attemptsUsedToday: attemptsUsedToday(user),
    attemptsLimit: attemptsLimit(user),
    zodiac: zodiacOf(user),
    termsAcceptedAt: user.termsAcceptedAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}
