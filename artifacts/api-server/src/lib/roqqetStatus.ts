import { todayUTC } from "./users";

type Counters = {
  day: string;
  chats: number;
  insights: number;
  lastActivityAt: Date | null;
  lastError: string | null;
  lastErrorAt: Date | null;
};

const state: Counters = {
  day: todayUTC(),
  chats: 0,
  insights: 0,
  lastActivityAt: null,
  lastError: null,
  lastErrorAt: null,
};

function rollover(): void {
  const today = todayUTC();
  if (state.day !== today) {
    state.day = today;
    state.chats = 0;
    state.insights = 0;
  }
}

export function recordRoqqetChat(): void {
  rollover();
  state.chats += 1;
  state.lastActivityAt = new Date();
}

export function recordRoqqetInsight(): void {
  rollover();
  state.insights += 1;
  state.lastActivityAt = new Date();
}

export function recordRoqqetError(err: unknown): void {
  rollover();
  state.lastError = err instanceof Error ? err.message : String(err);
  state.lastErrorAt = new Date();
}

export function roqqetStatusSnapshot(): {
  status: "online" | "degraded" | "offline";
  configured: boolean;
  chatsToday: number;
  insightsToday: number;
  lastActivityAt: string | null;
  lastError: string | null;
} {
  rollover();
  const configured =
    !!process.env.AI_INTEGRATIONS_OPENAI_API_KEY &&
    !!process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  const recentError =
    state.lastErrorAt != null &&
    Date.now() - state.lastErrorAt.getTime() < 15 * 60 * 1000;
  const status: "online" | "degraded" | "offline" = !configured
    ? "offline"
    : recentError
      ? "degraded"
      : "online";
  return {
    status,
    configured,
    chatsToday: state.chats,
    insightsToday: state.insights,
    lastActivityAt: state.lastActivityAt?.toISOString() ?? null,
    lastError: state.lastError,
  };
}
