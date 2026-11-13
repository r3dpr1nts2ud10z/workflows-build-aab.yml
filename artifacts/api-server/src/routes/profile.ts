import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import {
  GetMeResponse,
  UpdateZodiacBody,
  UpdateZodiacResponse,
} from "@workspace/api-zod";
import { requireAuth, authedUserId } from "../middlewares/requireAuth";
import { getOrCreateUser, serializeUser } from "../lib/users";

const router: IRouter = Router();

router.get("/me", requireAuth, async (_req, res): Promise<void> => {
  const user = await getOrCreateUser(authedUserId(res));
  res.json(GetMeResponse.parse(serializeUser(user)));
});

router.post("/me/accept-terms", requireAuth, async (_req, res): Promise<void> => {
  const userId = authedUserId(res);
  await getOrCreateUser(userId);
  const [updated] = await db
    .update(usersTable)
    .set({
      termsAcceptedAt: sql`coalesce(${usersTable.termsAcceptedAt}, now())`,
    })
    .where(eq(usersTable.id, userId))
    .returning();
  res.json(GetMeResponse.parse(serializeUser(updated)));
});

router.put("/me/zodiac", requireAuth, async (req, res): Promise<void> => {
  const parsed = UpdateZodiacBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const userId = authedUserId(res);
  await getOrCreateUser(userId);
  const [updated] = await db
    .update(usersTable)
    .set({
      birthDate: parsed.data.birthDate,
      birthTime: parsed.data.birthTime ?? null,
      sunSign: parsed.data.sunSign,
      decan: parsed.data.decan,
      moonSign: parsed.data.moonSign ?? null,
      risingSign: parsed.data.risingSign ?? null,
      descendantSign: parsed.data.descendantSign ?? null,
    })
    .where(eq(usersTable.id, userId))
    .returning();
  res.json(UpdateZodiacResponse.parse(serializeUser(updated)));
});

export default router;
