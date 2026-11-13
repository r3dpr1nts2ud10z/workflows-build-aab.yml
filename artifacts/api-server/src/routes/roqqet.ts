import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import { db, receiptsTable } from "@workspace/db";
import {
  ChatWithRoqqetBody,
  ChatWithRoqqetResponse,
  GetDailyInsightResponse,
} from "@workspace/api-zod";
import { requireAuth, authedUserId } from "../middlewares/requireAuth";
import { aiLimiter } from "../middlewares/rateLimit";
import {
  getOrCreateUser,
  zodiacOf,
  attemptsUsedToday,
  attemptsLimit,
  todayUTC,
} from "../lib/users";
import { getTier } from "../lib/tiers";
import {
  recordRoqqetChat,
  recordRoqqetInsight,
  recordRoqqetError,
} from "../lib/roqqetStatus";
import type { User } from "@workspace/db";

const router: IRouter = Router();

const MODEL = "gpt-5.4";

function starting5Summary(user: User): string {
  const z = zodiacOf(user);
  if (!z) {
    return "The user has NOT calibrated their Starting 5 zodiac profile yet. Encourage them (briefly, without nagging) to calibrate at least their Sun sign and Decan on the R0QQ3T page.";
  }
  const parts = [
    `Sun: ${z.sunSign} (Decan ${z.decan})`,
    z.moonSign ? `Moon: ${z.moonSign}` : null,
    z.risingSign ? `Rising: ${z.risingSign}` : null,
    z.descendantSign ? `Descendant: ${z.descendantSign}` : null,
  ].filter(Boolean);
  return `The user's Starting 5 zodiac profile: ${parts.join(", ")}. Born ${z.birthDate}${z.birthTime ? ` at ${z.birthTime}` : ""}.`;
}

async function buildSystemPrompt(user: User): Promise<string> {
  const receipts = await db
    .select()
    .from(receiptsTable)
    .where(eq(receiptsTable.userId, user.id));
  const settled = receipts.filter((r) => r.status === "settled");
  const verified = receipts.filter((r) => r.status === "verified");
  const tier = getTier(user.tier);
  const limit = attemptsLimit(user);
  return [
    "You are R0QQ3T, the Agentic Zodiac Systems Assistant inside N3PSQAL3 — a 21st-century hybrid clearinghouse for near-miss parlay bets (5+ leg parlays that missed by exactly one leg).",
    "Persona: sharp, cosmic, slightly cryptic but genuinely helpful. You speak in a confident, streetwise-astrologer voice with occasional celestial metaphors. Keep responses concise (2-5 short paragraphs max). Never invent fake guarantees about gambling outcomes — you read energies and patterns, not certainties. Astrology guidance is for entertainment and reflection.",
    "You operate on the Starting 5 system: Sun, Decan, Moon, Rising, Descendant. Sun + Decan is the minimum calibration.",
    starting5Summary(user),
    `Account context: tier ${tier.name} (settles at ${tier.payoutLabel} of potential payout, ${limit == null ? "unlimited" : limit} settlement attempts/day, ${attemptsUsedToday(user)} used today). Balance: $${user.balance.toFixed(2)}. Receipts: ${receipts.length} total, ${verified.length} verified awaiting settlement, ${settled.length} settled.`,
    "You may reference their receipts, tier economics (Demo 1/16, Bronze 1/8, Silver 1/4, Gold 1/2, Diamond 1/2 unlimited), and zodiac profile when advising. If they ask about upgrading, be factual about the tier math.",
  ].join("\n\n");
}

router.post("/roqqet/chat", aiLimiter, requireAuth, async (req, res): Promise<void> => {
  const parsed = ChatWithRoqqetBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = await getOrCreateUser(authedUserId(res));
  const systemPrompt = await buildSystemPrompt(user);
  let completion;
  try {
    completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        ...parsed.data.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      ],
    });
  } catch (err) {
    recordRoqqetError(err);
    throw err;
  }
  const reply = completion.choices[0]?.message?.content;
  if (!reply) {
    recordRoqqetError(new Error("Empty chat completion"));
    res.status(502).json({ error: "R0QQ3T did not return a response." });
    return;
  }
  recordRoqqetChat();
  res.json(ChatWithRoqqetResponse.parse({ reply }));
});

const insightCache = new Map<
  string,
  { title: string; body: string; sign: string | null; date: string }
>();

router.get("/roqqet/insight", requireAuth, async (_req, res): Promise<void> => {
  const user = await getOrCreateUser(authedUserId(res));
  const date = todayUTC();
  const cacheKey = `${user.id}:${date}`;
  const cached = insightCache.get(cacheKey);
  if (cached) {
    res.json(GetDailyInsightResponse.parse(cached));
    return;
  }
  const z = zodiacOf(user);
  let completion;
  try {
    completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are R0QQ3T, the Agentic Zodiac Systems Assistant of N3PSQAL3. Write a daily insight for the user's dashboard. Format: FIRST LINE is a short punchy title (max 6 words, no quotes, no punctuation at the end), then a blank line, then a 2-3 sentence body (no greeting, no sign-off). Cosmic, confident, streetwise-astrologer tone. Theme it around near-miss energy, timing, and discipline. Entertainment only — no guarantees about gambling outcomes.",
      },
      {
        role: "user",
        content: z
          ? `Today is ${date}. My Starting 5: Sun ${z.sunSign} decan ${z.decan}${z.moonSign ? `, Moon ${z.moonSign}` : ""}${z.risingSign ? `, Rising ${z.risingSign}` : ""}${z.descendantSign ? `, Descendant ${z.descendantSign}` : ""}. Give me today's insight.`
          : `Today is ${date}. I have not calibrated my zodiac profile yet. Give me a general near-miss energy insight and a nudge to calibrate my Starting 5.`,
        },
      ],
    });
  } catch (err) {
    recordRoqqetError(err);
    throw err;
  }
  const raw = completion.choices[0]?.message?.content?.trim();
  if (!raw) {
    recordRoqqetError(new Error("Empty insight completion"));
    res.status(502).json({ error: "R0QQ3T did not return an insight." });
    return;
  }
  const newlineIdx = raw.indexOf("\n");
  const title =
    newlineIdx > 0 ? raw.slice(0, newlineIdx).trim() : "Today's Transmission";
  const body = newlineIdx > 0 ? raw.slice(newlineIdx).trim() : raw;
  if (insightCache.size > 5000) insightCache.clear();
  const payload = { title, body, sign: z?.sunSign ?? null, date };
  insightCache.set(cacheKey, payload);
  recordRoqqetInsight();
  res.json(GetDailyInsightResponse.parse(payload));
});

export default router;
