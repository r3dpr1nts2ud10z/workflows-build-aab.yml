import { trackVisit } from "@workspace/api-client-react";

const STORAGE_KEY = "n3psqal3_visitor_id";
const SOURCE_KEY = "n3psqal3_visit_src";

function getVisitorId(): string {
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id || id.length < 8) {
    id =
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `v-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id.slice(0, 64);
}

function getSource(): string | undefined {
  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = (params.get("src") ?? params.get("utm_source") ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "")
      .slice(0, 32);
    if (fromUrl) {
      // First-touch attribution: keep the first source we ever saw.
      if (!localStorage.getItem(SOURCE_KEY)) {
        localStorage.setItem(SOURCE_KEY, fromUrl);
      }
      return localStorage.getItem(SOURCE_KEY) ?? fromUrl;
    }
    return localStorage.getItem(SOURCE_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

let pinged = false;

export function pingVisit(): void {
  if (pinged) return;
  pinged = true;
  try {
    const source = getSource();
    trackVisit({ visitorId: getVisitorId(), ...(source ? { source } : {}) }).catch(
      () => {},
    );
  } catch {
    // tracking must never break the app
  }
}
