import { eq } from "drizzle-orm";
import { db, appSettingsTable } from "@workspace/db";

export const SETTLEMENT_PAUSED_KEY = "settlement_paused";

type Executor = Pick<typeof db, "select">;

export async function getSetting(
  key: string,
  executor: Executor = db,
): Promise<string | null> {
  const [row] = await executor
    .select()
    .from(appSettingsTable)
    .where(eq(appSettingsTable.key, key))
    .limit(1);
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db
    .insert(appSettingsTable)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: appSettingsTable.key,
      set: { value, updatedAt: new Date() },
    });
}

export async function isSettlementPaused(
  executor: Executor = db,
): Promise<boolean> {
  return (await getSetting(SETTLEMENT_PAUSED_KEY, executor)) === "true";
}
