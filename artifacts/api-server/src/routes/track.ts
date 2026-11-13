import { Router, type IRouter } from "express";
import { db, visitsTable } from "@workspace/db";
import { TrackVisitBody } from "@workspace/api-zod";
import { todayUTC } from "../lib/users";
import { trackLimiter } from "../middlewares/rateLimit";

const router: IRouter = Router();

router.post("/track/visit", trackLimiter, async (req, res): Promise<void> => {
  const parsed = TrackVisitBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const rawSource = parsed.data.source ?? "";
  const source =
    rawSource
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "")
      .slice(0, 32) || null;
  await db
    .insert(visitsTable)
    .values({ visitorId: parsed.data.visitorId, visitDate: todayUTC(), source })
    .onConflictDoNothing();
  res.status(204).end();
});

export default router;
