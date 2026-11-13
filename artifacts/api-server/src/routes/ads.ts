import { Router, type IRouter } from "express";
import { eq, and, or, sql } from "drizzle-orm";
import { db, adsTable, adEventsTable } from "@workspace/db";
import {
  ServeAdQueryParams,
  ServeAdResponse,
  RecordAdEventParams,
  RecordAdEventBody,
} from "@workspace/api-zod";
import { trackLimiter } from "../middlewares/rateLimit";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function serializeAd(ad: typeof adsTable.$inferSelect) {
  return {
    id: ad.id,
    name: ad.name,
    kind: ad.kind,
    headline: ad.headline,
    body: ad.body,
    ctaLabel: ad.ctaLabel,
    ctaUrl: ad.ctaUrl,
    placement: ad.placement,
    weight: ad.weight,
    active: ad.active,
  };
}

router.get("/ads/serve", trackLimiter, async (req, res): Promise<void> => {
  const parsed = ServeAdQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Network scaffold: when a network script is configured, the client embeds
  // it instead of rendering a house/affiliate creative.
  const networkScriptUrl = process.env["AD_NETWORK_SCRIPT_URL"];
  if (networkScriptUrl && !networkScriptUrl.startsWith("https://")) {
    logger.warn(
      { networkScriptUrl },
      "AD_NETWORK_SCRIPT_URL must be https:// — ignoring and serving house ads",
    );
  }
  if (networkScriptUrl && networkScriptUrl.startsWith("https://")) {
    res.json(ServeAdResponse.parse({ mode: "network", networkScriptUrl }));
    return;
  }

  const { placement } = parsed.data;
  const candidates = await db
    .select()
    .from(adsTable)
    .where(
      and(
        eq(adsTable.active, true),
        or(eq(adsTable.placement, "any"), eq(adsTable.placement, placement)),
      ),
    );

  if (candidates.length === 0) {
    res.json(ServeAdResponse.parse({ mode: "none" }));
    return;
  }

  const totalWeight = candidates.reduce((s, a) => s + Math.max(a.weight, 1), 0);
  let roll = Math.random() * totalWeight;
  let chosen = candidates[candidates.length - 1]!;
  for (const ad of candidates) {
    roll -= Math.max(ad.weight, 1);
    if (roll <= 0) {
      chosen = ad;
      break;
    }
  }

  res.json(ServeAdResponse.parse({ mode: "house", ad: serializeAd(chosen) }));
});

router.post(
  "/ads/:id/event",
  trackLimiter,
  async (req, res): Promise<void> => {
    const params = RecordAdEventParams.safeParse(req.params);
    const body = RecordAdEventBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({ error: "Invalid ad event" });
      return;
    }
    const [ad] = await db
      .select({ id: adsTable.id })
      .from(adsTable)
      .where(eq(adsTable.id, params.data.id));
    if (!ad) {
      res.status(204).end();
      return;
    }
    await db.insert(adEventsTable).values({
      adId: params.data.id,
      kind: body.data.kind,
      userId: (res.locals["userId"] as string | undefined) ?? null,
    });
    res.status(204).end();
  },
);

const SEED_ADS = [
  {
    name: "House: Bronze upsell",
    kind: "house",
    headline: "Trapped in the Sahara on Demo?",
    body: "Bronze is the splash pad: 1/8 settlements, 3 attempts a day, and zero ads. $5 gets you wet.",
    ctaLabel: "Upgrade to Bronze",
    ctaUrl: "/tiers",
    placement: "any",
    weight: 3,
  },
  {
    name: "House: Gold upsell",
    kind: "house",
    headline: "The wave pool is heated.",
    body: "Gold settles at 1/2 of potential payout with 10 attempts a day. Stop sipping from a canteen.",
    ctaLabel: "Go Gold",
    ctaUrl: "/tiers",
    placement: "dashboard",
    weight: 2,
  },
  {
    name: "House: R0QQ3T Starting 5",
    kind: "house",
    headline: "Your Starting 5 is thirsty.",
    body: "Complete your zodiac profile and R0QQ3T's daily insight hits different. Hydrate your chart.",
    ctaLabel: "Open R0QQ3T",
    ctaUrl: "/roqqet",
    placement: "roqqet",
    weight: 2,
  },
  {
    name: "Affiliate slot A (placeholder)",
    kind: "affiliate",
    headline: "This oasis has a cabana with your sportsbook's name on it.",
    body: "Affiliate placement available. Point this creative at a sportsbook sign-up offer and set your tracking URL.",
    ctaLabel: "Reserve this slot",
    ctaUrl: "/tiers",
    placement: "any",
    weight: 1,
  },
] as const;

export async function seedAds(): Promise<void> {
  const [{ count }] = (await db
    .select({ count: sql<number>`count(*)::int` })
    .from(adsTable)) as [{ count: number }];
  if (count > 0) return;
  await db.insert(adsTable).values(SEED_ADS.map((a) => ({ ...a })));
  logger.info({ seeded: SEED_ADS.length }, "Seeded house/affiliate ads");
}

export default router;
